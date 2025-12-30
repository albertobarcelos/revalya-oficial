/**
 * Edge Function: Receipt PDF Generator
 * 
 * AIDEV-NOTE: Gera dados estruturados para recibo PDF (estilo Omie)
 * A geração do PDF em si pode ser feita no frontend usando react-pdf ou jspdf
 * 
 * Endpoint:
 * - POST /receipt-pdf - Gerar dados do recibo
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// AIDEV-NOTE: CORS headers definidos localmente para evitar problemas de import durante deploy
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-signature, x-tenant-id, x-request-id, x-timestamp, asaas-access-token, x-asaas-access-token, x-webhook-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req) => {
  // AIDEV-NOTE: CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // AIDEV-NOTE: Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // AIDEV-NOTE: Extrair dados da requisição
    const { billing_period_id, tenant_id } = await req.json();

    if (!billing_period_id) {
      return new Response(
        JSON.stringify({ error: 'billing_period_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // AIDEV-NOTE: Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AIDEV-NOTE: Buscar dados do período de faturamento
    const { data: billingPeriod, error: billingError } = await supabase
      .from('contract_billing_periods')
      .select(`
        id,
        bill_date,
        amount_planned,
        amount_billed,
        customer_id,
        contract_id,
        customer:customers(
          id,
          name,
          company,
          cpf_cnpj,
          email,
          phone,
          address,
          city,
          state,
          postal_code
        ),
        contract:contracts(
          id,
          contract_number,
          description
        )
      `)
      .eq('id', billing_period_id)
      .single();

    if (billingError || !billingPeriod) {
      throw new Error(`Erro ao buscar período de faturamento: ${billingError?.message || 'Não encontrado'}`);
    }

    // AIDEV-NOTE: Buscar itens do período
    const { data: items, error: itemsError } = await supabase
      .from('billing_period_items')
      .select(`
        id,
        description,
        quantity,
        unit_price,
        total_amount,
        product:products(name),
        service:services(name)
      `)
      .eq('billing_period_id', billing_period_id);

    if (itemsError) {
      throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
    }

    // AIDEV-NOTE: Buscar dados da empresa (tenant)
    const tenantId = tenant_id || billingPeriod.customer?.id ? 
      (await supabase
        .from('tenants')
        .select('id, name, company_data')
        .eq('id', tenant_id || (billingPeriod as any).tenant_id)
        .single()).data : null;

    const companyData = tenantId?.company_data as any || {};

    // AIDEV-NOTE: Formatar dados do recibo
    const receiptData = {
      receipt_number: `REC-${billing_period_id.slice(0, 8).toUpperCase()}`,
      issue_date: new Date(billingPeriod.bill_date || new Date()).toLocaleDateString('pt-BR'),
      company: {
        name: tenantId?.name || companyData.name || 'Empresa',
        document: companyData.cpf_cnpj || '',
        address: companyData.address || '',
        city: companyData.city || '',
        state: companyData.state || '',
        postal_code: companyData.postal_code || '',
        phone: companyData.phone || '',
        email: companyData.email || ''
      },
      customer: {
        name: (billingPeriod.customer as any)?.name || 'Cliente',
        company: (billingPeriod.customer as any)?.company || '',
        document: (billingPeriod.customer as any)?.cpf_cnpj || '',
        address: (billingPeriod.customer as any)?.address || '',
        city: (billingPeriod.customer as any)?.city || '',
        state: (billingPeriod.customer as any)?.state || '',
        postal_code: (billingPeriod.customer as any)?.postal_code || '',
        phone: (billingPeriod.customer as any)?.phone || '',
        email: (billingPeriod.customer as any)?.email || ''
      },
      contract: {
        number: (billingPeriod.contract as any)?.contract_number || '',
        description: (billingPeriod.contract as any)?.description || ''
      },
      items: (items || []).map((item: any) => ({
        description: item.description || item.product?.name || item.service?.name || 'Item',
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        total: parseFloat(item.total_amount) || (parseFloat(item.quantity) * parseFloat(item.unit_price))
      })),
      total_amount: parseFloat(billingPeriod.amount_billed || billingPeriod.amount_planned) || 0
    };

    // AIDEV-NOTE: Salvar URL do recibo no período (será atualizado quando o PDF for gerado no frontend)
    // Por enquanto, retornamos os dados estruturados

    return new Response(
      JSON.stringify({
        success: true,
        receipt_data: receiptData,
        billing_period_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[ReceiptPDF] Erro:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

