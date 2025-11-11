// AIDEV-NOTE: Edge Function para importação de cobranças do ASAAS
// Versão restaurada do commit 8c2d2f3 com melhorias nos campos customer_*

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AIDEV-NOTE: Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// AIDEV-NOTE: Cliente Supabase com service role key (apenas para leituras sensíveis)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// AIDEV-NOTE: Função para criar cliente Supabase com contexto de usuário
function createUserSupabaseClient(authHeader: string | null) {
  if (!authHeader) {
    throw new Error('Authorization header é obrigatório para operações de escrita');
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
}

// AIDEV-NOTE: Interfaces para tipagem
interface ImportChargesRequest {
  tenant_id: string;
  start_date: string;
  end_date: string;
  limit?: number;
}

interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  externalReference?: string;
  billingType: string;
}

// AIDEV-NOTE: Mapeamento de status ASAAS para status de charges (MAIÚSCULAS)
function mapAsaasStatusToChargeStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    "PENDING": "PENDING",
    "RECEIVED": "RECEIVED",
    "CONFIRMED": "CONFIRMED",
    "OVERDUE": "OVERDUE",
    "REFUNDED": "REFUNDED",
    "RECEIVED_IN_CASH": "RECEIVED",
    "AWAITING_RISK_ANALYSIS": "PENDING",
    "CREATED": "PENDING",
    "DELETED": "PENDING",
    "CHECKOUT_VIEWED": "PENDING",
    "ANTICIPATED": "RECEIVED"
  };
  return statusMap[status] || "PENDING";
}

// AIDEV-NOTE: Mapeamento de payment method para tipo
function mapPaymentMethodToTipo(billingType: string | null | undefined): string {
  if (!billingType) return "BOLETO";
  
  const typeMap: Record<string, string> = {
    "PIX": "PIX",
    "BOLETO": "BOLETO",
    "BANK_SLIP": "BOLETO",
    "CREDIT_CARD": "CREDIT_CARD",
    "CASH": "CASH",
    "TRANSFER": "PIX"
  };
  
  return typeMap[billingType.toUpperCase()] || "BOLETO";
}

// AIDEV-NOTE: Função auxiliar para buscar ou criar customer
async function findOrCreateCustomer(
  supabaseUser: any,
  tenantId: string,
  asaasCustomerId: string | null,
  customerData: any
): Promise<string | null> {
  if (!asaasCustomerId && !customerData) {
    console.warn("⚠️ Não é possível criar customer sem asaasCustomerId ou customerData");
    return null;
  }

  // AIDEV-NOTE: Primeiro tentar buscar por customer_asaas_id
  if (asaasCustomerId) {
    const { data: existingCustomer } = await supabaseUser
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_asaas_id", asaasCustomerId)
      .maybeSingle();

    if (existingCustomer) {
      console.log(`✅ Customer encontrado por asaas_id: ${existingCustomer.id}`);
      return existingCustomer.id;
    }
  }

  // AIDEV-NOTE: Tentar buscar por documento se disponível
  if (customerData?.cpfCnpj) {
    const { data: existingCustomer } = await supabaseUser
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("cpf_cnpj", customerData.cpfCnpj)
      .maybeSingle();

    if (existingCustomer) {
      // AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
      if (asaasCustomerId) {
        await supabaseUser
          .from("customers")
          .update({ customer_asaas_id: asaasCustomerId })
          .eq("id", existingCustomer.id);
      }
      console.log(`✅ Customer encontrado por documento: ${existingCustomer.id}`);
      return existingCustomer.id;
    }
  }

  // AIDEV-NOTE: Criar novo customer
  const { data: newCustomer, error: createError } = await supabaseUser
    .from("customers")
    .insert({
      tenant_id: tenantId,
      customer_asaas_id: asaasCustomerId,
      name: customerData?.name || "Cliente não identificado",
      email: customerData?.email || null,
      phone: customerData?.phone || customerData?.mobilePhone || null,
      cpf_cnpj: customerData?.cpfCnpj || null,
    })
    .select("id")
    .single();

  if (createError || !newCustomer) {
    console.error("❌ Erro ao criar customer:", createError);
    return null;
  }

  console.log(`✅ Customer criado: ${newCustomer.id}`);
  return newCustomer.id;
}

// AIDEV-NOTE: Função auxiliar para buscar contrato por externalReference
async function findContractByExternalReference(
  supabaseUser: any,
  tenantId: string,
  externalReference: string | null
): Promise<string | null> {
  if (!externalReference) {
    return null;
  }

  // AIDEV-NOTE: Tentar buscar contrato pelo número ou ID na externalReference
  const { data: contract } = await supabaseUser
    .from("contracts")
    .select("id")
    .eq("tenant_id", tenantId)
    .or(`contract_number.eq.${externalReference},id.eq.${externalReference}`)
    .maybeSingle();

  if (contract) {
    console.log(`✅ Contrato encontrado por externalReference: ${contract.id}`);
    return contract.id;
  }

  return null;
}

// AIDEV-NOTE: Função auxiliar para buscar contrato por customer_id
// Prioriza contratos ATIVOS e mais recentes
async function findContractByCustomerId(
  supabaseUser: any,
  tenantId: string,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) {
    return null;
  }

  // AIDEV-NOTE: Buscar contratos do customer, priorizando ATIVOS e mais recentes
  const { data: contract } = await supabaseUser
    .from("contracts")
    .select("id, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", ["ACTIVE", "DRAFT"]) // AIDEV-NOTE: Buscar apenas contratos ativos ou em rascunho
    .order("status", { ascending: true }) // AIDEV-NOTE: ACTIVE vem antes de DRAFT
    .order("created_at", { ascending: false }) // AIDEV-NOTE: Mais recente primeiro
    .limit(1)
    .maybeSingle();

  if (contract) {
    console.log(`✅ Contrato encontrado por customer_id: ${contract.id} (status: ${contract.status})`);
    return contract.id;
  }

  return null;
}

// AIDEV-NOTE: Função para buscar dados do cliente ASAAS
// AIDEV-NOTE: Buscar dados do cliente no ASAAS
async function fetchAsaasCustomer(customerId: string, apiKey: string, apiUrl: string) {
  try {
    // AIDEV-NOTE: Garantir formato correto da URL para customers
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const apiBaseUrl = baseUrl.includes('/v3') ? baseUrl : `${baseUrl}/v3`;
    
    const response = await fetch(`${apiBaseUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Erro ao buscar cliente ${customerId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar cliente ${customerId}:`, error);
    return null;
  }
}

// AIDEV-NOTE: Função principal de importação com contexto de usuário
async function importChargesFromAsaas(request: ImportChargesRequest, supabaseUser: any, userId: string) {
  const { tenant_id, start_date, end_date, limit = 100 } = request;
  
  console.log(`🚀 Iniciando importação ASAAS para tenant ${tenant_id}`);
  console.log(`📅 Período: ${start_date} até ${end_date}`);
  console.log(`👤 User ID para auditoria: ${userId}`);

  // 1. Buscar configuração ASAAS do tenant (usando supabaseAdmin para dados sensíveis)
  const { data: integration, error: integrationError } = await supabaseAdmin
    .from('tenant_integrations')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('integration_type', 'asaas')
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    throw new Error(`Integração ASAAS não encontrada para tenant ${tenant_id}`);
  }

  const { api_key, api_url } = integration.config;
  if (!api_key || !api_url) {
    throw new Error('Configuração ASAAS incompleta (api_key ou api_url ausente)');
  }

  // AIDEV-NOTE: Garantir que a URL base termine sem barra e adicionar /v3 se necessário
  const baseUrl = api_url.endsWith('/') ? api_url.slice(0, -1) : api_url;
  const apiBaseUrl = baseUrl.includes('/v3') ? baseUrl : `${baseUrl}/v3`;
  
  console.log(`🔑 Usando API URL: ${apiBaseUrl}`);

  let offset = 0;
  let totalProcessed = 0;
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let hasMore = true;

  while (hasMore && totalProcessed < limit) {
    console.log(`📄 Buscando página ${Math.floor(offset / limit) + 1} (offset: ${offset})`);

    // 2. Buscar pagamentos do ASAAS (filtro por data de vencimento)
    const asaasUrl = `${apiBaseUrl}/payments?dueDate[ge]=${start_date}&dueDate[le]=${end_date}&limit=${limit}&offset=${offset}`;
    
    console.log(`🔍 URL da requisição: ${asaasUrl}`);
    
    const response = await fetch(asaasUrl, {
      method: 'GET',
      headers: {
        'access_token': api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API ASAAS: ${response.status} - ${errorText}`);
      throw new Error(`Erro na API ASAAS: ${response.status} - ${errorText}`);
    }

    const asaasData = await response.json();
    const payments = asaasData.data || [];
    
    console.log(`📊 Encontrados ${payments.length} pagamentos nesta página`);
    console.log(`📋 Resposta completa da API:`, JSON.stringify(asaasData, null, 2));

    if (payments.length === 0) {
      hasMore = false;
      break;
    }

    // 3. Processar cada pagamento
    for (const payment of payments) {
      // AIDEV-NOTE: Verificar limite total de processamento
      if (totalProcessed >= limit) {
        hasMore = false;
        break;
      }

      try {
        // AIDEV-NOTE: Buscar charge existente pelo asaas_id
        const { data: existingCharge } = await supabaseUser
          .from('charges')
          .select('id, status, valor, data_pagamento, updated_at')
          .eq('tenant_id', tenant_id)
          .eq('asaas_id', payment.id)
          .maybeSingle();

        // AIDEV-NOTE: Mapear status para charges (MAIÚSCULAS)
        const mappedStatus = mapAsaasStatusToChargeStatus(payment.status);

        // AIDEV-NOTE: Verificar se houve mudanças nos campos relevantes
        const hasChanges = existingCharge && (
          existingCharge.status !== mappedStatus ||
          existingCharge.valor !== payment.value ||
          existingCharge.data_pagamento !== payment.paymentDate
        );

        // AIDEV-NOTE: Se o charge existe mas não há mudanças, pular
        if (existingCharge && !hasChanges) {
          console.log(`⏭️ Charge ${payment.id} sem alterações - pulando`);
          totalSkipped++;
          totalProcessed++;
          continue;
        }

        if (existingCharge && hasChanges) {
          console.log(`🔄 Charge ${payment.id} com alterações - atualizando`);
          console.log(`   Status: ${existingCharge.status} -> ${mappedStatus}`);
          console.log(`   Valor: ${existingCharge.valor} -> ${payment.value}`);
        }

        // 4. Buscar dados do cliente se necessário
        let customerData = null;
        if (payment.customer) {
          customerData = await fetchAsaasCustomer(payment.customer, api_key, api_url);
        }

        // AIDEV-NOTE: Buscar dados adicionais de PIX e código de barras
        // Garantir formato correto da URL base
        const baseUrl = api_url.endsWith('/') ? api_url.slice(0, -1) : api_url;
        const apiBaseUrl = baseUrl.includes('/v3') ? baseUrl : `${baseUrl}/v3`;

        // Obter linha digitável do boleto para pagamentos do tipo BOLETO
        if (payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED') {
          try {
            const barcodeResponse = await fetch(`${apiBaseUrl}/payments/${payment.id}/identificationField`, {
              method: 'GET',
              headers: {
                'access_token': api_key,
                'Content-Type': 'application/json'
              }
            });
            
            if (barcodeResponse.ok) {
              const barcodeData = await barcodeResponse.json();
              payment.barCode = barcodeData.identificationField;
              console.log(`✅ Obtido código de barras para pagamento ${payment.id}`);
            } else {
              console.log(`⚠️ Não foi possível obter código de barras para pagamento ${payment.id}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar código de barras para pagamento ${payment.id}:`, error);
          }
        }
        // AIDEV-NOTE: Obter QR Code PIX e payload copia e cola para pagamentos do tipo BOLETO, PIX ou UNDEFINED
        console.log(`🔍 Verificando tipo de pagamento para ${payment.id}: billingType="${payment.billingType}", status="${payment.status}"`);
        
        if (payment.billingType === 'PIX' || payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED') {
          try {
            const pixResponse = await fetch(`${apiBaseUrl}/payments/${payment.id}/pixQrCode`, {
              method: 'GET',
              headers: {
                'access_token': api_key,
                'Content-Type': 'application/json'
              }
            });
            
            if (pixResponse.ok) {
              const pixData = await pixResponse.json();
              
              // Log completo para debug da estrutura exata da resposta
              console.log(`📋 Resposta PIX completa para pagamento ${payment.id}:`, JSON.stringify(pixData));
              
              // Verificar estrutura exata do objeto
              if (pixData && typeof pixData === 'object') {
                // Verificar todos os campos disponíveis
                console.log(`🔑 Campos disponíveis na resposta PIX:`, Object.keys(pixData));
                
                // Tentar diferentes campos possíveis para garantir que capturamos o valor correto
                payment.pixQrCode = pixData.payload || pixData.encodedImage || pixData.qrCode || pixData.content || null;
                
                console.log(`✅ Obtido PIX copia e cola para pagamento ${payment.id}: ${payment.pixQrCode ? payment.pixQrCode.substring(0, 30) + '...' : 'null'}`);
              }
            } else {
              console.log(`⚠️ Não foi possível obter PIX copia e cola para pagamento ${payment.id}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar PIX copia e cola para pagamento ${payment.id}:`, error);
          }
        } else {
          console.log(`ℹ️ Pagamento ${payment.id} não é do tipo PIX/BOLETO/UNDEFINED (tipo: ${payment.billingType}), pulando busca de dados PIX`);
        }

        console.log(`🔄 Mapeando status: ${payment.status} -> ${mappedStatus}`);

        // AIDEV-NOTE: Buscar ou criar customer
        const customerUuid = await findOrCreateCustomer(
          supabaseUser,
          tenant_id,
          payment.customer,
          customerData
        );

        if (!customerUuid) {
          console.error(`❌ Não foi possível criar ou encontrar customer para pagamento ${payment.id}`);
          totalErrors++;
          totalProcessed++;
          continue;
        }

        // AIDEV-NOTE: Tentar vincular contrato
        // Prioridade: 1) externalReference, 2) customer_id
        let contractId = await findContractByExternalReference(
          supabaseUser,
          tenant_id,
          payment.externalReference
        );
        
        // AIDEV-NOTE: Se não encontrou por externalReference, buscar por customer_id
        if (!contractId && customerUuid) {
          contractId = await findContractByCustomerId(
            supabaseUser,
            tenant_id,
            customerUuid
          );
        }

        // AIDEV-NOTE: Mapear tipo de pagamento
        const mappedTipo = mapPaymentMethodToTipo(payment.billingType);

        // AIDEV-NOTE: Garantir data_vencimento válida
        const dueDate = payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        // AIDEV-NOTE: Garantir valor válido
        const valor = payment.value || 0;

        // AIDEV-NOTE: Preparar dados para UPSERT de charge com todos os campos mapeados
        const chargeData: any = {
          tenant_id: tenant_id,
          customer_id: customerUuid,
          contract_id: contractId,
          asaas_id: payment.id,
          valor: valor,
          status: mappedStatus,
          tipo: mappedTipo,
          data_vencimento: dueDate,
          descricao: payment.description || `Cobrança ASAAS ${payment.id}`,
          origem: 'ASAAS', // AIDEV-NOTE: Origem sempre ASAAS para importações
        };

        // AIDEV-NOTE: Adicionar data_pagamento se disponível
        if (payment.paymentDate) {
          chargeData.data_pagamento = new Date(payment.paymentDate).toISOString().split('T')[0];
        }

        // AIDEV-NOTE: Mapear campos financeiros
        if (payment.netValue !== undefined && payment.netValue !== null) {
          chargeData.net_value = payment.netValue;
        }
        
        if (payment.interest?.value !== undefined && payment.interest.value !== null) {
          chargeData.interest_rate = payment.interest.value;
        }
        
        if (payment.fine?.value !== undefined && payment.fine.value !== null) {
          chargeData.fine_rate = payment.fine.value;
        }
        
        if (payment.discount?.value !== undefined && payment.discount.value !== null) {
          chargeData.discount_value = payment.discount.value;
        }

        // AIDEV-NOTE: Mapear payment_value (valor pago)
        if (payment.paymentDate && payment.netValue !== undefined) {
          chargeData.payment_value = payment.netValue;
        } else if (payment.value !== undefined) {
          chargeData.payment_value = payment.value;
        }

        // AIDEV-NOTE: Mapear campos de URLs e documentos
        if (payment.invoiceUrl) {
          chargeData.invoice_url = payment.invoiceUrl;
        }
        
        if (payment.bankSlipUrl) {
          chargeData.pdf_url = payment.bankSlipUrl;
        }
        
        if (payment.transactionReceiptUrl) {
          chargeData.transaction_receipt_url = payment.transactionReceiptUrl;
        }
        
        if (payment.invoiceNumber) {
          chargeData.external_invoice_number = payment.invoiceNumber;
        }

        // AIDEV-NOTE: Mapear external_customer_id
        if (payment.customer) {
          chargeData.external_customer_id = payment.customer;
        }

        // AIDEV-NOTE: Adicionar barcode e pix_key se obtidos via API
        if (payment.barCode) {
          chargeData.barcode = payment.barCode;
        }
        
        if (payment.pixQrCode) {
          chargeData.pix_key = payment.pixQrCode;
        }

        // AIDEV-NOTE: Executar UPSERT usando supabaseUser (com RLS e triggers)
        const { data: charge, error: chargeError } = await supabaseUser
          .from('charges')
          .upsert(chargeData, {
            onConflict: 'tenant_id,asaas_id',
            ignoreDuplicates: false
          })
          .select('id, created_at, updated_at');

        if (chargeError) {
          console.error(`❌ Erro ao fazer UPSERT do charge ${payment.id}:`, chargeError);
          totalErrors++;
          totalProcessed++;
          continue;
        }

        // AIDEV-NOTE: Determinar se foi INSERT ou UPDATE
        if (existingCharge) {
          console.log(`✅ Charge ${payment.id} atualizado com sucesso (houve mudanças)`);
          totalUpdated++;
        } else {
          console.log(`✅ Charge ${payment.id} criado com sucesso (novo registro)`);
          totalImported++;
        }
        
        totalProcessed++;

      } catch (error) {
        console.error(`❌ Erro ao processar pagamento ${payment.id}:`, error);
        totalErrors++;
        totalProcessed++;
        continue;
      }
    }

    // 7. Verificar se há mais páginas
    offset += limit;
    hasMore = payments.length === limit && totalProcessed < limit;
  }

  console.log(`🎉 Importação concluída!`);
  console.log(`📊 Estatísticas finais:`);
  console.log(`   Total processado: ${totalProcessed}`);
  console.log(`   Novos importados: ${totalImported}`);
  console.log(`   Atualizados: ${totalUpdated}`);
  console.log(`   Pulados (sem alteração): ${totalSkipped}`);
  console.log(`   Erros: ${totalErrors}`);
  
  // AIDEV-NOTE: Retornar resposta com estrutura correta que o frontend espera
  return {
    success: true,
    message: `Importação concluída. ${totalImported} novos, ${totalUpdated} atualizados, ${totalSkipped} pulados, ${totalErrors} erros.`,
    summary: {
      total_processed: totalProcessed,
      total_imported: totalImported,
      total_updated: totalUpdated,
      total_skipped: totalSkipped,
      total_errors: totalErrors,
      imported_ids: new Array(totalImported).fill(null), // Preenchendo arrays para compatibilidade com frontend
      updated_ids: new Array(totalUpdated).fill(null),   // Preenchendo arrays para compatibilidade com frontend
      skipped_ids: new Array(totalSkipped).fill(null),   // Preenchendo arrays para compatibilidade com frontend
      errors: []        // AIDEV-NOTE: Placeholder para compatibilidade
    }
  };
}

// AIDEV-NOTE: Handler principal da Edge Function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // AIDEV-NOTE: Extrair e validar Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Authorization header é obrigatório para esta operação' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // AIDEV-NOTE: Criar cliente Supabase com contexto de usuário
    const supabaseUser = createUserSupabaseClient(authHeader);

    // AIDEV-NOTE: Validar usuário autenticado
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('❌ Erro ao validar usuário:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Token de autorização inválido ou expirado' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`👤 Usuário autenticado: ${user.email} (ID: ${user.id})`);

    // Validar e parsear dados da requisição
    const requestData = await req.json();
    
    if (!requestData.tenant_id || !requestData.start_date || !requestData.end_date) {
      return new Response(
        JSON.stringify({ 
          error: 'Parâmetros obrigatórios: tenant_id, start_date, end_date' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // AIDEV-NOTE: Executar importação com cliente autenticado
    const result = await importChargesFromAsaas(requestData, supabaseUser, user.id);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
