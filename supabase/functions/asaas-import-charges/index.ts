// =====================================================
// EDGE FUNCTION: ASAAS Import Charges
// Descrição: Importação ativa de cobranças do ASAAS com filtro de datas
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// AIDEV-NOTE: Headers CORS inline para evitar problemas de import
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-signature, x-tenant-id, x-request-id, x-timestamp, asaas-access-token, x-asaas-access-token, x-webhook-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// AIDEV-NOTE: Interface para parâmetros de importação
interface ImportChargesRequest {
  tenant_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  limit?: number;
}

// AIDEV-NOTE: Interface para resposta da API ASAAS
interface AsaasPayment {
  id: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  customer: string;
  description: string;
  billingType: string;
  externalReference?: string;
  dateCreated: string;
}

// AIDEV-NOTE: Mapeamento de status ASAAS para status interno
function mapAsaasStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "PENDING": "pending",
    "RECEIVED": "received",
    "PAID": "received",
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
async function fetchAsaasCustomer(customerId: string, apiKey: string, apiUrl: string) {
  try {
    const response = await fetch(`${apiUrl}/v3/customers/${customerId}`, {
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

// AIDEV-NOTE: Função principal de importação
async function importChargesFromAsaas(request: ImportChargesRequest) {
  const { tenant_id, start_date, end_date, limit = 100 } = request;
  
  console.log(`🚀 Iniciando importação ASAAS para tenant ${tenant_id}`);
  console.log(`📅 Período: ${start_date} até ${end_date}`);

  // 1. Buscar configuração ASAAS do tenant
  const { data: integration, error: integrationError } = await supabase
    .from('tenant_integrations')
    .select('config')
    .eq('tenant_id', tenant_id)
    .eq('integration_type', 'asaas') // AIDEV-NOTE: Minúsculo conforme constraint tenant_integrations
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    throw new Error('Integração ASAAS não configurada para este tenant');
  }

  const { api_key, api_url } = integration.config;
  if (!api_key || !api_url) {
    throw new Error('Configuração ASAAS incompleta (api_key ou api_url ausente)');
  }

  // 2. Buscar pagamentos do ASAAS com paginação
  let offset = 0;
  const batchSize = Math.min(limit, 100);
  let totalImported = 0;
  let totalSkipped = 0;
  let hasMore = true;

  const importedIds: string[] = [];
  const skippedIds: string[] = [];
  const errors: string[] = [];

  while (hasMore && totalImported < limit) {
    try {
      console.log(`📡 Buscando lote ${Math.floor(offset / batchSize) + 1} (offset: ${offset})`);
      
      // Construir URL com filtros de data
      const url = new URL(`${api_url}/v3/payments`);
      url.searchParams.set('offset', offset.toString());
      url.searchParams.set('limit', batchSize.toString());
      url.searchParams.set('dateCreated[ge]', start_date);
      url.searchParams.set('dateCreated[le]', end_date);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'access_token': api_key,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro API ASAAS: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const payments: AsaasPayment[] = data.data || [];
      
      console.log(`📦 Recebidos ${payments.length} pagamentos do ASAAS`);

      if (payments.length === 0) {
        hasMore = false;
        break;
      }

      // 3. Processar cada pagamento
      for (const payment of payments) {
        try {
          // Verificar se já existe na staging
          const { data: existing } = await supabase
            .from('conciliation_staging')
            .select('id')
            .eq('id_externo', payment.id)
            .eq('tenant_id', tenant_id)
            .single();

          if (existing) {
            console.log(`⏭️ Pagamento ${payment.id} já existe, pulando...`);
            skippedIds.push(payment.id);
            totalSkipped++;
            continue;
          }

          // 4. Buscar dados do cliente se necessário
          let customerData = null;
          if (payment.customer) {
            customerData = await fetchAsaasCustomer(payment.customer, api_key, api_url);
          }

          // 5. Preparar dados para inserção
          const stagingData = {
            tenant_id,
            id_externo: payment.id,
            source: 'ASAAS',
            valor: payment.value,
            status: mapAsaasStatus(payment.status),
            data_vencimento: payment.dueDate,
            data_pagamento: payment.paymentDate || null,
            customer_name: customerData?.name || null,
            customer_email: customerData?.email || null,
            customer_document: customerData?.cpfCnpj || null,
            customer_phone: customerData?.phone || null,
            asaas_customer_id: payment.customer || null,
            description: payment.description || null,
            payment_method: payment.billingType || null,
            external_reference: payment.externalReference || null,
            raw_data: payment,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // 6. Inserir no staging
          const { error: insertError } = await supabase
            .from('conciliation_staging')
            .insert({
              tenant_id: tenant_id,
              origem: 'ASAAS', // AIDEV-NOTE: Maiúsculo conforme constraint conciliation_staging_origem_check
              id_externo: payment.id,
              valor_cobranca: payment.value,
              valor_pago: payment.paymentDate ? payment.value : 0,
              status_externo: mapAsaasStatus(payment.status), // AIDEV-NOTE: Usar status mapeado para o constraint
              status_conciliacao: 'PENDENTE', // AIDEV-NOTE: Sempre PENDENTE para novos registros do ASAAS
              data_vencimento: payment.dueDate,
              data_pagamento: payment.paymentDate,
              asaas_customer_id: payment.customer,
              external_reference: payment.externalReference || '',
              customer_name: customerData?.name || '',
              customer_email: customerData?.email || '',
              customer_document: customerData?.cpfCnpj || '',
              observacao: payment.description || '',
              raw_data: payment,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`❌ Erro ao inserir pagamento ${payment.id}:`, insertError);
            errors.push(`${payment.id}: ${insertError.message}`);
          } else {
            console.log(`✅ Pagamento ${payment.id} importado com sucesso`);
            importedIds.push(payment.id);
            totalImported++;
          }

        } catch (paymentError) {
          console.error(`❌ Erro ao processar pagamento ${payment.id}:`, paymentError);
          errors.push(`${payment.id}: ${paymentError.message}`);
        }
      }

      // 7. Preparar próxima iteração
      offset += batchSize;
      hasMore = data.hasMore && payments.length === batchSize;

    } catch (batchError) {
      console.error(`❌ Erro no lote (offset ${offset}):`, batchError);
      errors.push(`Lote offset ${offset}: ${batchError.message}`);
      break;
    }
  }

  return {
    success: true,
    summary: {
      total_imported: totalImported,
      total_skipped: totalSkipped,
      total_errors: errors.length,
      imported_ids: importedIds,
      skipped_ids: skippedIds,
      errors
    }
  };
}

// AIDEV-NOTE: Handler principal da Edge Function
Deno.serve(async (req: Request) => {
  // Tratar OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Validar e extrair dados da requisição
    const requestData: ImportChargesRequest = await req.json();
    
    // Validações básicas
    if (!requestData.tenant_id) {
      throw new Error('tenant_id é obrigatório');
    }
    
    if (!requestData.start_date || !requestData.end_date) {
      throw new Error('start_date e end_date são obrigatórios');
    }

    // Validar formato de data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestData.start_date) || !dateRegex.test(requestData.end_date)) {
      throw new Error('Formato de data inválido. Use YYYY-MM-DD');
    }

    // Validar que start_date <= end_date
    if (requestData.start_date > requestData.end_date) {
      throw new Error('start_date deve ser menor ou igual a end_date');
    }

    // Executar importação
    const result = await importChargesFromAsaas(requestData);

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
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});