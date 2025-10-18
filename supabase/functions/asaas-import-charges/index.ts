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

// AIDEV-NOTE: Mapeamento de status ASAAS para o sistema
function mapAsaasStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    "PENDING": "pending",
    "RECEIVED": "received",
    "CONFIRMED": "confirmed",
    "OVERDUE": "overdue",
    "REFUNDED": "refunded",
    "RECEIVED_IN_CASH": "received",
    "REFUND_REQUESTED": "refunded",
    "REFUND_IN_PROGRESS": "refunded",
    "CHARGEBACK_REQUESTED": "refunded",
    "CHARGEBACK_DISPUTE": "refunded",
    "AWAITING_CHARGEBACK_REVERSAL": "pending",
    "DUNNING_REQUESTED": "overdue",
    "DUNNING_RECEIVED": "overdue",
    "AWAITING_RISK_ANALYSIS": "pending",
    "CREATED": "created",
    "DELETED": "deleted",
    "CHECKOUT_VIEWED": "checkout_viewed",
    "ANTICIPATED": "anticipaded" // Mantém o typo do constraint do banco
  };
  return statusMap[status] || "pending";
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

    // 2. Buscar pagamentos do ASAAS
    const asaasUrl = `${apiBaseUrl}/payments?dateCreated[ge]=${start_date}&dateCreated[le]=${end_date}&limit=${limit}&offset=${offset}`;
    
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
        // AIDEV-NOTE: Buscar registro existente com campos relevantes para comparação
        const { data: existing } = await supabaseUser
          .from('conciliation_staging')
          .select(`
            id, valor_pago, status_externo, data_pagamento, 
            valor_liquido, valor_juros, valor_multa, valor_desconto,
            updated_at
          `)
          .eq('tenant_id', tenant_id)
          .eq('id_externo', payment.id)
          .eq('origem', 'ASAAS')
          .single();

        // AIDEV-NOTE: Mapear status antes da comparação
        const mappedStatus = mapAsaasStatus(payment.status);
        const currentValorPago = payment.paymentDate ? payment.value : 0;

        // AIDEV-NOTE: Se existe, verificar se há mudanças significativas
        if (existing) {
          const hasChanges = (
            existing.valor_pago !== currentValorPago ||
            existing.status_externo !== mappedStatus ||
            existing.data_pagamento !== payment.paymentDate ||
            existing.valor_liquido !== (payment.netValue || null) ||
            existing.valor_juros !== (payment.interestValue || null) ||
            existing.valor_multa !== (payment.fine?.value || null) ||
            existing.valor_desconto !== (payment.discount?.value || null)
          );

          if (!hasChanges) {
            console.log(`⏭️ Pagamento ${payment.id} sem alterações - pulando`);
            totalSkipped++;
            totalProcessed++;
            continue;
          }

          console.log(`🔄 Pagamento ${payment.id} com alterações - atualizando`);
          console.log(`   Status: ${existing.status_externo} -> ${mappedStatus}`);
          console.log(`   Valor Pago: ${existing.valor_pago} -> ${currentValorPago}`);
        }

        // 4. Buscar dados do cliente se necessário
        let customerData = null;
        if (payment.customer) {
          customerData = await fetchAsaasCustomer(payment.customer, api_key, api_url);
        }

        console.log(`🔄 Mapeando status: ${payment.status} -> ${mappedStatus}`);

        // AIDEV-NOTE: Preparar dados para UPSERT (incluindo campos de auditoria)
        const recordData = {
          tenant_id: tenant_id,
          origem: 'ASAAS',
          id_externo: payment.id,
          valor_cobranca: payment.value,
          valor_pago: currentValorPago,
          valor_liquido: payment.netValue || null,
          valor_juros: payment.interestValue || null,
          valor_multa: payment.fine?.value || null,
          valor_desconto: payment.discount?.value || null,
          status_externo: mappedStatus,
          status_conciliacao: 'PENDENTE',
          data_vencimento: payment.dueDate,
          data_pagamento: payment.paymentDate,
          asaas_customer_id: payment.customer,
          external_reference: payment.externalReference || '',
          customer_name: customerData?.name || '',
          customer_email: customerData?.email || '',
          customer_document: customerData?.cpfCnpj || '',
          customer_phone: customerData?.phone || '',
          customer_mobile_phone: customerData?.mobilePhone || '',
          customer_company: customerData?.company || customerData?.name || '',
          customer_address: customerData?.address || '',
          customer_address_number: customerData?.addressNumber || '',
          customer_complement: customerData?.complement || '',
          customer_postal_code: customerData?.postalCode || '',
          customer_province: customerData?.province || '',
          customer_city: customerData?.city || '',
          customer_cityName: customerData?.cityName || '',
          customer_state: customerData?.state || '',
          customer_country: customerData?.country || 'Brasil',
          observacao: payment.description || '',
          raw_data: payment,
          // AIDEV-NOTE: Adicionando campos de auditoria diretamente
          created_by: userId,
          updated_by: userId
          // created_at e updated_at serão gerenciados pelo banco
        };

        // AIDEV-NOTE: Executar UPSERT usando supabaseUser (com RLS e triggers)
        const { error: upsertError } = await supabaseUser
          .from('conciliation_staging')
          .upsert(recordData, {
            onConflict: 'tenant_id,origem,id_externo',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`❌ Erro ao fazer UPSERT do pagamento ${payment.id}:`, upsertError);
          totalErrors++;
          totalProcessed++;
          continue;
        }

        // AIDEV-NOTE: Atualizar contadores baseado na operação
        if (existing) {
          console.log(`✅ Pagamento ${payment.id} atualizado com sucesso`);
          totalUpdated++;
        } else {
          console.log(`✅ Pagamento ${payment.id} inserido com sucesso`);
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
      imported_ids: [], // AIDEV-NOTE: Placeholder para compatibilidade
      updated_ids: [],  // AIDEV-NOTE: Placeholder para compatibilidade
      skipped_ids: [],  // AIDEV-NOTE: Placeholder para compatibilidade
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