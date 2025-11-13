// AIDEV-NOTE: Edge Function para importação completa de todas as cobranças do ASAAS
// Importa todas as charges de 100 em 100, sem necessidade de especificar período

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AIDEV-NOTE: Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// AIDEV-NOTE: Cliente Supabase com service role key (para operações administrativas)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// AIDEV-NOTE: Interfaces para tipagem
interface ImportAllChargesRequest {
  tenant_id: string;
  batch_size?: number; // Tamanho do lote (padrão: 100)
  max_batches?: number; // Máximo de lotes a processar (opcional, para limitar execução)
  start_offset?: number; // AIDEV-NOTE: Offset inicial para continuar de onde parou (padrão: 0)
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
// CRÍTICO: Se tiver asaasCustomerId mas não tiver customerData, SEMPRE buscar na API antes de criar
async function findOrCreateCustomer(
  tenantId: string,
  asaasCustomerId: string | null,
  customerData: any,
  apiKey?: string,
  apiUrl?: string
): Promise<string | null> {
  if (!asaasCustomerId && !customerData) {
    console.warn("⚠️ Não é possível criar customer sem asaasCustomerId ou customerData");
    return null;
  }

  // AIDEV-NOTE: CRÍTICO - Se tiver asaasCustomerId mas não tiver customerData, BUSCAR na API
  // NUNCA criar como "Cliente não identificado" se tiver asaasCustomerId válido
  if (asaasCustomerId && !customerData && apiKey && apiUrl) {
    console.log(`🔍 Buscando dados do customer ${asaasCustomerId} na API ASAAS (obrigatório antes de criar)`);
    try {
      customerData = await fetchAsaasCustomer(asaasCustomerId, apiKey, apiUrl);
      if (customerData) {
        console.log(`✅ Dados do customer obtidos da API: ${customerData.name || 'N/A'}`);
      } else {
        console.error(`❌ ERRO CRÍTICO: Não foi possível obter dados do customer ${asaasCustomerId} da API ASAAS`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ERRO ao buscar customer ${asaasCustomerId} na API:`, error);
      return null;
    }
  } else if (asaasCustomerId && !customerData) {
    console.error(`❌ ERRO CRÍTICO: Tem asaasCustomerId (${asaasCustomerId}) mas não tem customerData nem credenciais da API`);
    return null;
  }

  // AIDEV-NOTE: Primeiro tentar buscar por customer_asaas_id
  if (asaasCustomerId) {
    const { data: existingCustomer } = await supabase
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
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("cpf_cnpj", customerData.cpfCnpj)
      .maybeSingle();

    if (existingCustomer) {
      // AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
      if (asaasCustomerId) {
        await supabase
          .from("customers")
          .update({ customer_asaas_id: asaasCustomerId })
          .eq("id", existingCustomer.id);
      }
      console.log(`✅ Customer encontrado por documento: ${existingCustomer.id}`);
      return existingCustomer.id;
    }
  }

  // AIDEV-NOTE: Criar novo customer
  // CRÍTICO: NUNCA criar como "Cliente não identificado" se tiver asaasCustomerId
  if (asaasCustomerId && !customerData) {
    console.error(`❌ ERRO CRÍTICO: Tentando criar customer com asaasCustomerId (${asaasCustomerId}) mas sem customerData`);
    return null;
  }

  // AIDEV-NOTE: Só criar como "Cliente não identificado" se realmente não tiver como obter dados
  const customerName = customerData?.name || (asaasCustomerId ? null : "Cliente não identificado");
  
  if (!customerName && asaasCustomerId) {
    console.error(`❌ ERRO CRÍTICO: Não é possível criar customer sem nome quando há asaasCustomerId (${asaasCustomerId})`);
    return null;
  }

  const { data: newCustomer, error: createError } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      customer_asaas_id: asaasCustomerId,
      name: customerName,
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

  console.log(`✅ Customer criado: ${newCustomer.id} (nome: ${customerName})`);
  return newCustomer.id;
}

// AIDEV-NOTE: Função auxiliar para buscar contrato por externalReference
async function findContractByExternalReference(
  tenantId: string,
  externalReference: string | null
): Promise<string | null> {
  if (!externalReference) {
    return null;
  }

  const { data: contract } = await supabase
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
async function findContractByCustomerId(
  tenantId: string,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) {
    return null;
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", ["ACTIVE", "DRAFT"])
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contract) {
    console.log(`✅ Contrato encontrado por customer_id: ${contract.id} (status: ${contract.status})`);
    return contract.id;
  }

  return null;
}

// AIDEV-NOTE: Função para buscar dados do cliente ASAAS
async function fetchAsaasCustomer(customerId: string, apiKey: string, apiUrl: string) {
  try {
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

// AIDEV-NOTE: Função principal de importação completa
async function importAllChargesFromAsaas(request: ImportAllChargesRequest) {
  const { tenant_id, batch_size = 100, max_batches, start_offset = 0 } = request;
  
  console.log(`🚀 Iniciando importação completa de todas as charges ASAAS para tenant ${tenant_id}`);
  console.log(`📦 Tamanho do lote: ${batch_size}`);
  if (start_offset > 0) {
    console.log(`📍 Continuando do offset: ${start_offset}`);
  }
  if (max_batches) {
    console.log(`⏱️ Limite de lotes: ${max_batches}`);
  }

  // 1. Buscar configuração ASAAS do tenant
  const { data: integration, error: integrationError } = await supabase
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

  let offset = start_offset;
  let batchNumber = 0;
  let totalProcessed = 0;
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let hasMore = true;

  // AIDEV-NOTE: Timeout máximo de 2 minutos para evitar que a função trave
  const MAX_EXECUTION_TIME_MS = 2 * 60 * 1000; // 2 minutos
  const startTime = Date.now();

  // AIDEV-NOTE: Processar todas as charges em lotes de 100
  while (hasMore) {
    // Verificar timeout
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_EXECUTION_TIME_MS) {
      console.log(`⏱️ Timeout de ${MAX_EXECUTION_TIME_MS}ms atingido. Parando importação.`);
      console.log(`📊 Progresso até agora: ${totalProcessed} processadas, ${totalImported} importadas`);
      break;
    }

    // Verificar limite de lotes se especificado
    if (max_batches && batchNumber >= max_batches) {
      console.log(`⏸️ Limite de ${max_batches} lotes atingido. Parando importação.`);
      break;
    }

    batchNumber++;
    console.log(`📄 Processando lote ${batchNumber} (offset: ${offset}, limit: ${batch_size})`);

    // 2. Buscar pagamentos do ASAAS (sem filtro de data - todas as charges)
    const asaasUrl = `${apiBaseUrl}/payments?limit=${batch_size}&offset=${offset}`;
    
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
    
    console.log(`📊 Encontrados ${payments.length} pagamentos no lote ${batchNumber}`);

    if (payments.length === 0) {
      hasMore = false;
      console.log(`✅ Não há mais charges para importar. Total processado: ${totalProcessed}`);
      break;
    }

    // 3. Processar cada pagamento do lote
    for (const payment of payments) {
      try {
        // AIDEV-NOTE: Buscar charge existente pelo asaas_id
        const { data: existingCharge } = await supabase
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
          totalSkipped++;
          totalProcessed++;
          continue;
        }

        if (existingCharge && hasChanges) {
          console.log(`🔄 Charge ${payment.id} com alterações - atualizando`);
        }

        // 4. Buscar dados do cliente se necessário
        let customerData: any = null;
        if (payment.customer) {
          customerData = await fetchAsaasCustomer(payment.customer, api_key, api_url);
        }

        // AIDEV-NOTE: Buscar dados adicionais de PIX e código de barras
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
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar código de barras para pagamento ${payment.id}:`, error);
          }
        }

        // AIDEV-NOTE: Obter QR Code PIX
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
              payment.pixQrCode = pixData.payload || pixData.encodedImage || pixData.qrCode || pixData.content || null;
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar PIX copia e cola para pagamento ${payment.id}:`, error);
          }
        }

        // 5. Buscar ou criar customer
        const customerId = await findOrCreateCustomer(
          tenant_id,
          payment.customer,
          customerData,
          api_key,
          api_url
        );

        if (!customerId) {
          console.warn(`⚠️ Não foi possível obter/criar customer para charge ${payment.id} - pulando`);
          totalErrors++;
          totalProcessed++;
          continue;
        }

        // 6. Buscar contrato
        let contractId: string | null = null;
        if (payment.externalReference) {
          contractId = await findContractByExternalReference(
            tenant_id,
            payment.externalReference
          );
        }
        
        if (!contractId && customerId) {
          contractId = await findContractByCustomerId(
            tenant_id,
            customerId
          );
        }

        // 7. Preparar dados da charge
        // AIDEV-NOTE: Mapeamento completo de todas as colunas da tabela charges
        const chargeData: any = {
          tenant_id,
          asaas_id: payment.id,
          customer_id: customerId,
          contract_id: contractId,
          origem: 'ASAAS', // AIDEV-NOTE: Origem sempre ASAAS para importação
          valor: payment.value,
          status: mappedStatus,
          tipo: mapPaymentMethodToTipo(payment.billingType),
          data_vencimento: payment.dueDate,
          data_pagamento: payment.paymentDate || null,
          descricao: payment.description || null,
          barcode: payment.barCode || null,
          pix_key: payment.pixQrCode || null,
          external_customer_id: payment.customer || null,
          external_invoice_number: payment.invoiceNumber || payment.externalReference || null,
          invoice_url: payment.invoiceUrl || null,
          pdf_url: payment.bankSlipUrl || null,
          transaction_receipt_url: payment.transactionReceiptUrl || null,
          net_value: payment.netValue || null,
          payment_value: payment.paymentDate && payment.netValue ? payment.netValue : (payment.value || null),
          metadata: {
            billing_type: payment.billingType,
            installment_count: payment.installmentCount || null,
            installment_value: payment.installmentValue || null,
            original_payment_data: payment // AIDEV-NOTE: Guardar dados originais para referência
          }
        };

        // AIDEV-NOTE: Adicionar campos de juros, multa e desconto se disponíveis
        if (payment.interest?.value !== undefined && payment.interest.value !== null) {
          chargeData.interest_rate = payment.interest.value;
        }
        
        if (payment.fine?.value !== undefined && payment.fine.value !== null) {
          chargeData.fine_rate = payment.fine.value;
        }
        
        if (payment.discount?.value !== undefined && payment.discount.value !== null) {
          chargeData.discount_value = payment.discount.value;
        }

        // AIDEV-NOTE: Mapear campos de parcelas se disponíveis
        if (payment.installmentCount && payment.installmentCount > 1) {
          chargeData.is_installment = true;
          chargeData.total_installments = payment.installmentCount;
          chargeData.installment_number = payment.installmentNumber || 1;
          chargeData.installment_value = payment.installmentValue || payment.value;
        }

        // AIDEV-NOTE: Mapear customer_name se disponível
        if (customerData?.name) {
          chargeData.customer_name = customerData.name;
        }

        // 8. Inserir ou atualizar charge
        if (existingCharge) {
          const { error: updateError } = await supabase
            .from('charges')
            .update(chargeData)
            .eq('id', existingCharge.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar charge ${payment.id}:`, updateError);
            totalErrors++;
          } else {
            console.log(`✅ Charge ${payment.id} atualizada`);
            totalUpdated++;
          }
        } else {
          const { error: insertError } = await supabase
            .from('charges')
            .insert(chargeData);

          if (insertError) {
            console.error(`❌ Erro ao inserir charge ${payment.id}:`, insertError);
            totalErrors++;
          } else {
            console.log(`✅ Charge ${payment.id} importada`);
            totalImported++;
          }
        }

        totalProcessed++;

      } catch (error) {
        console.error(`❌ Erro ao processar charge ${payment.id}:`, error);
        totalErrors++;
        totalProcessed++;
      }
    }

    // AIDEV-NOTE: Atualizar offset para próxima página
    offset += batch_size;

    // AIDEV-NOTE: Se retornou menos que o batch_size, não há mais dados
    if (payments.length < batch_size) {
      hasMore = false;
      console.log(`✅ Último lote processado. Total processado: ${totalProcessed}`);
    }

    console.log(`📊 Progresso do lote ${batchNumber}: ${totalProcessed} processadas, ${totalImported} importadas, ${totalUpdated} atualizadas, ${totalSkipped} puladas, ${totalErrors} erros`);
  }

  // AIDEV-NOTE: Verificar se ainda há mais charges para processar
  // Se hasMore ainda é true e não foi interrompido por timeout ou limite, ainda há mais
  const hasMoreCharges = hasMore;
  const estimatedRemaining = hasMoreCharges ? `Aproximadamente ${Math.ceil((4220 - offset) / batch_size)} lotes restantes` : 'Todas as charges foram processadas';

  return {
    success: true,
    tenant_id,
    total_processed: totalProcessed,
    total_imported: totalImported,
    total_updated: totalUpdated,
    total_skipped: totalSkipped,
    total_errors: totalErrors,
    batches_processed: batchNumber,
    current_offset: offset,
    has_more: hasMoreCharges,
    estimated_remaining: hasMoreCharges ? estimatedRemaining : null,
    message: hasMoreCharges 
      ? `Importação parcial: ${totalImported} novas charges importadas, ${totalUpdated} atualizadas. Execute novamente para continuar.`
      : `Importação completa finalizada. ${totalImported} novas charges importadas, ${totalUpdated} atualizadas.`
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

    // Validar e parsear dados da requisição
    const requestData = await req.json();
    
    if (!requestData.tenant_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Parâmetro obrigatório: tenant_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // AIDEV-NOTE: Executar importação completa usando service role key
    const result = await importAllChargesFromAsaas(requestData);
    
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

