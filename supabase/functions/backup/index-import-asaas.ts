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

// AIDEV-NOTE: Cliente Supabase com service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

  console.log(`🔑 Usando API URL: ${api_url}`);

  let offset = 0;
  let totalProcessed = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`📄 Buscando página ${Math.floor(offset / limit) + 1} (offset: ${offset})`);

    // 2. Buscar pagamentos do ASAAS
    const asaasUrl = `${api_url}/v3/payments?dateCreated[ge]=${start_date}&dateCreated[le]=${end_date}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(asaasUrl, {
      method: 'GET',
      headers: {
        'access_token': api_key,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na API ASAAS: ${response.status} - ${await response.text()}`);
    }

    const asaasData = await response.json();
    const payments = asaasData.data || [];
    
    console.log(`📊 Encontrados ${payments.length} pagamentos nesta página`);

    if (payments.length === 0) {
      hasMore = false;
      break;
    }

    // 3. Processar cada pagamento
    for (const payment of payments) {
      try {
        // Verificar se já existe no staging
        const { data: existing } = await supabase
          .from('conciliation_staging')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('id_externo', payment.id)
          .eq('origem', 'ASAAS')
          .single();

        if (existing) {
          console.log(`⏭️ Pagamento ${payment.id} já existe no staging`);
          continue;
        }

        // 4. Buscar dados do cliente se necessário
        let customerData = null;
        if (payment.customer) {
          customerData = await fetchAsaasCustomer(payment.customer, api_key, api_url);
        }

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
            // AIDEV-NOTE: Campos customer_* completos baseados na API ASAAS
            customer_name: customerData?.name || '',
            customer_email: customerData?.email || '',
            customer_document: customerData?.cpfCnpj || '',
            customer_phone: customerData?.phone || '',
            customer_mobile_phone: customerData?.mobilePhone || '',
            customer_company: customerData?.company || customerData?.name || '', // AIDEV-NOTE: Para PJ, company pode ser igual ao name
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Erro ao inserir pagamento ${payment.id}:`, insertError);
          continue;
        }

        console.log(`✅ Pagamento ${payment.id} inserido com sucesso`);
        totalProcessed++;

      } catch (error) {
        console.error(`❌ Erro ao processar pagamento ${payment.id}:`, error);
        continue;
      }
    }

    // 7. Verificar se há mais páginas
    offset += limit;
    hasMore = payments.length === limit;
  }

  console.log(`🎉 Importação concluída! Total processado: ${totalProcessed}`);
  return { success: true, processed: totalProcessed };
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