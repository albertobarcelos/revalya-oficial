/**
 * Edge Function: Fiscal Engine
 * 
 * AIDEV-NOTE: Motor fiscal centralizado que aplica regras não negociáveis
 * para emissão de NF-e (produto) e NFS-e (serviço) via FocusNFe
 * 
 * Endpoints:
 * - POST /fiscal-engine/nfe/can-emit - Verifica se pode emitir NF-e
 * - POST /fiscal-engine/nfe/emit - Emite NF-e
 * - POST /fiscal-engine/nfse/can-emit - Verifica se pode emitir NFS-e
 * - POST /fiscal-engine/nfse/emit - Emite NFS-e
 * 
 * Regras:
 * - NF-e: Uma única vez por billing_period_id, valor TOTAL dos produtos
 * - NFS-e: Proporcional ao pagamento, respeitando saldo não emitido
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/**
 * AIDEV-NOTE: Verificar se pode emitir NF-e para um billing_period_id
 */
async function canEmitProductInvoice(
  supabase: any,
  tenantId: string,
  billingPeriodId: string
): Promise<{ canEmit: boolean; reason?: string; valor?: number }> {
  try {
    // 1. Verificar se período existe e está BILLED
    const { data: period, error: periodError } = await supabase
      .from('contract_billing_periods')
      .select('id, status, customer_id, contract_id, tenant_id')
      .eq('id', billingPeriodId)
      .eq('tenant_id', tenantId)
      .single();

    if (periodError || !period) {
      return { canEmit: false, reason: 'Período de faturamento não encontrado' };
    }

    if (period.status !== 'BILLED') {
      return { canEmit: false, reason: `Período não está faturado. Status atual: ${period.status}` };
    }

    // 2. Verificar se já existe NF-e para este período
    const { data: existingInvoice, error: invoiceError } = await supabase
      .from('fiscal_invoices')
      .select('id, status')
      .eq('billing_period_id', billingPeriodId)
      .eq('tipo', 'NFE')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingInvoice) {
      return { canEmit: false, reason: `NF-e já emitida (status: ${existingInvoice.status})` };
    }

    // 3. Buscar itens de produto não emitidos
    const { data: productItems, error: itemsError } = await supabase
      .from('billing_period_items')
      .select('id, product_id, quantity, unit_price, product_nfe_emitted')
      .eq('billing_period_id', billingPeriodId)
      .eq('tenant_id', tenantId)
      .not('product_id', 'is', null)
      .eq('product_nfe_emitted', false);

    if (itemsError) {
      return { canEmit: false, reason: `Erro ao buscar itens: ${itemsError.message}` };
    }

    if (!productItems || productItems.length === 0) {
      return { canEmit: false, reason: 'Não há produtos para emitir NF-e' };
    }

    // 4. Calcular valor total
    const valor = productItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);

    if (valor <= 0) {
      return { canEmit: false, reason: 'Valor total dos produtos é zero ou negativo' };
    }

    return { canEmit: true, valor };
  } catch (error) {
    console.error('[canEmitProductInvoice] Erro:', error);
    return { canEmit: false, reason: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * AIDEV-NOTE: Emitir NF-e para um billing_period_id
 */
async function emitProductInvoice(
  supabase: any,
  tenantId: string,
  billingPeriodId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    // 1. Validar se pode emitir
    const validation = await canEmitProductInvoice(supabase, tenantId, billingPeriodId);
    if (!validation.canEmit) {
      return { success: false, error: validation.reason };
    }

    // 2. Buscar dados do período e cliente
    const { data: period, error: periodError } = await supabase
      .from('contract_billing_periods')
      .select(`
        *,
        customer:customers(*),
        contract:contracts(*)
      `)
      .eq('id', billingPeriodId)
      .eq('tenant_id', tenantId)
      .single();

    if (periodError || !period) {
      return { success: false, error: 'Erro ao buscar período' };
    }

    // 3. Buscar itens de produto
    const { data: productItems, error: itemsError } = await supabase
      .from('billing_period_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('billing_period_id', billingPeriodId)
      .eq('tenant_id', tenantId)
      .not('product_id', 'is', null)
      .eq('product_nfe_emitted', false);

    if (itemsError || !productItems || productItems.length === 0) {
      return { success: false, error: 'Erro ao buscar itens de produto' };
    }

    // 4. Buscar dados da empresa (emitente)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('company_data')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant?.company_data) {
      return { success: false, error: 'Dados da empresa não configurados. Configure em Configurações > Dados da Empresa' };
    }

    const companyData = tenant.company_data as any;

    // 5. Criar registro fiscal_invoices (status PROCESSANDO)
    const referencia = `NFE_${billingPeriodId.substring(0, 8)}_${Date.now()}`;
    
    const { data: fiscalInvoice, error: invoiceError } = await supabase
      .from('fiscal_invoices')
      .insert({
        tenant_id: tenantId,
        tipo: 'NFE',
        origem: 'PRODUTO',
        customer_id: period.customer_id,
        contract_id: period.contract_id,
        billing_period_id: billingPeriodId,
        valor: validation.valor!,
        status: 'PROCESSANDO',
        focus_ref: referencia,
        metadata: {
          billing_period_id: billingPeriodId,
          items_count: productItems.length
        }
      })
      .select('id')
      .single();

    if (invoiceError || !fiscalInvoice) {
      return { success: false, error: `Erro ao criar registro fiscal: ${invoiceError?.message}` };
    }

    // 6. Preparar payload para FocusNFe
    const produtos = productItems.map((item: any) => {
      const product = item.product || {};
      return {
        codigo: product.id || item.id,
        descricao: product.name || item.description || 'Produto',
        ncm: product.ncm || '',
        cfop: '5102', // Venda de produção do estabelecimento (padrão, pode ser configurável)
        unidade: product.unit_of_measure || 'UN',
        quantidade: parseFloat(item.quantity) || 1,
        valor_unitario: parseFloat(item.unit_price) || 0,
        icms_origem: parseInt(product.origem || '0') as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        icms_situacao_tributaria: product.cst_icms || '00',
        pis_situacao_tributaria: product.cst_pis || '07',
        cofins_situacao_tributaria: product.cst_cofins || '07'
      };
    });

    const dadosNFe = {
      natureza_operacao: 'Venda de mercadoria',
      data_emissao: new Date().toISOString(),
      tipo_documento: '1' as const,
      finalidade_emissao: '1' as const,
      consumidor_final: '0' as const,
      indicador_presenca: '1' as const,
      cnpj_emitente: companyData.cnpj?.replace(/\D/g, '') || '',
      cpf_destinatario: period.customer?.cpf_cnpj?.toString().length === 11 
        ? period.customer.cpf_cnpj.toString() 
        : undefined,
      cnpj_destinatario: period.customer?.cpf_cnpj?.toString().length === 14 
        ? period.customer.cpf_cnpj.toString() 
        : undefined,
      nome_destinatario: period.customer?.name || '',
      indicador_inscricao_estadual_destinatario: '9' as const,
      endereco_destinatario: {
        logradouro: period.customer?.address || '',
        numero: period.customer?.address_number || 'S/N',
        complemento: period.customer?.complement,
        bairro: period.customer?.neighborhood || '',
        municipio: period.customer?.city || '',
        uf: period.customer?.state || '',
        cep: period.customer?.postal_code?.replace(/\D/g, '') || ''
      },
      telefone_destinatario: period.customer?.phone,
      email_destinatario: period.customer?.email,
      produtos,
      valor_total: validation.valor!,
      modalidade_frete: '9' as const,
      formas_pagamento: [{
        forma_pagamento: '90',
        valor_pagamento: validation.valor!
      }]
    };

    // 7. Chamar FocusNFe via Edge Function interna
    const focusNFeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/focusnfe/nfe/emit`;
    const focusNFeResponse = await fetch(focusNFeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        referencia,
        dados_nfe: dadosNFe,
        environment: 'producao'
      })
    });

    const focusNFeResult = await focusNFeResponse.json();

    if (!focusNFeResult.success) {
      // Atualizar status para ERRO
      await supabase
        .from('fiscal_invoices')
        .update({
          status: 'ERRO',
          error_message: focusNFeResult.error || 'Erro ao emitir via FocusNFe',
          updated_at: new Date().toISOString()
        })
        .eq('id', fiscalInvoice.id);

      return { success: false, error: focusNFeResult.error || 'Erro ao emitir via FocusNFe' };
    }

    // 8. Atualizar fiscal_invoices com dados da nota
    await supabase
      .from('fiscal_invoices')
      .update({
        status: 'EMITIDA',
        focus_status: focusNFeResult.status,
        chave: focusNFeResult.chave_nfe,
        numero: focusNFeResult.numero,
        xml_url: focusNFeResult.caminho_xml_nota_fiscal,
        pdf_url: focusNFeResult.caminho_danfe,
        danfe_url: focusNFeResult.caminho_danfe,
        metadata: {
          ...fiscalInvoice.metadata,
          focus_response: focusNFeResult
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', fiscalInvoice.id);

    // 9. Marcar itens como emitidos
    const itemIds = productItems.map((item: any) => item.id);
    await supabase
      .from('billing_period_items')
      .update({
        product_nfe_emitted: true,
        product_nfe_emitted_at: new Date().toISOString(),
        product_nfe_invoice_id: fiscalInvoice.id
      })
      .in('id', itemIds)
      .eq('tenant_id', tenantId);

    return { success: true, invoiceId: fiscalInvoice.id };
  } catch (error) {
    console.error('[emitProductInvoice] Erro:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * AIDEV-NOTE: Verificar se pode emitir NFS-e para um charge_id
 */
async function canEmitServiceInvoice(
  supabase: any,
  tenantId: string,
  chargeId: string
): Promise<{ canEmit: boolean; reason?: string; valorMaximo?: number }> {
  try {
    // 1. Verificar se charge existe e está paga
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select('id, status, valor, billing_periods, customer_id')
      .eq('id', chargeId)
      .eq('tenant_id', tenantId)
      .single();

    if (chargeError || !charge) {
      return { canEmit: false, reason: 'Cobrança não encontrada' };
    }

    // AIDEV-NOTE: Status RECEIVED* indica pagamento confirmado
    if (!charge.status || !charge.status.startsWith('RECEIVED')) {
      return { canEmit: false, reason: `Pagamento não confirmado. Status atual: ${charge.status}` };
    }

    if (!charge.billing_periods) {
      return { canEmit: false, reason: 'Cobrança não está vinculada a um período de faturamento' };
    }

    // 2. Buscar itens de serviço do período
    const { data: serviceItems, error: itemsError } = await supabase
      .from('billing_period_items')
      .select('id, service_id, quantity, unit_price, service_nfse_emitted_amount')
      .eq('billing_period_id', charge.billing_periods)
      .eq('tenant_id', tenantId)
      .not('service_id', 'is', null);

    if (itemsError) {
      return { canEmit: false, reason: `Erro ao buscar itens: ${itemsError.message}` };
    }

    if (!serviceItems || serviceItems.length === 0) {
      return { canEmit: false, reason: 'Não há serviços para emitir NFS-e' };
    }

    // 3. Calcular saldo não emitido
    const valorTotalServicos = serviceItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);

    const valorEmitido = serviceItems.reduce((sum, item) => {
      return sum + (parseFloat(item.service_nfse_emitted_amount) || 0);
    }, 0);

    const saldoNaoEmitido = valorTotalServicos - valorEmitido;

    if (saldoNaoEmitido <= 0) {
      return { canEmit: false, reason: 'Todo o valor de serviços já foi emitido' };
    }

    // 4. Valor máximo = MIN(valorPago, saldoNaoEmitido)
    const valorPago = parseFloat(charge.valor) || 0;
    const valorMaximo = Math.min(valorPago, saldoNaoEmitido);

    if (valorMaximo <= 0) {
      return { canEmit: false, reason: 'Valor máximo permitido é zero ou negativo' };
    }

    return { canEmit: true, valorMaximo };
  } catch (error) {
    console.error('[canEmitServiceInvoice] Erro:', error);
    return { canEmit: false, reason: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * AIDEV-NOTE: Emitir NFS-e para um charge_id
 */
async function emitServiceInvoice(
  supabase: any,
  tenantId: string,
  chargeId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    // 1. Validar se pode emitir
    const validation = await canEmitServiceInvoice(supabase, tenantId, chargeId);
    if (!validation.canEmit) {
      return { success: false, error: validation.reason };
    }

    // 2. Buscar dados da charge e período
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .select(`
        *,
        customer:customers(*),
        billing_period:contract_billing_periods(
          *,
          contract:contracts(*)
        )
      `)
      .eq('id', chargeId)
      .eq('tenant_id', tenantId)
      .single();

    if (chargeError || !charge || !charge.billing_period) {
      return { success: false, error: 'Erro ao buscar dados da cobrança' };
    }

    // 3. Buscar itens de serviço
    const { data: serviceItems, error: itemsError } = await supabase
      .from('billing_period_items')
      .select(`
        *,
        service:services(*)
      `)
      .eq('billing_period_id', charge.billing_periods)
      .eq('tenant_id', tenantId)
      .not('service_id', 'is', null);

    if (itemsError || !serviceItems || serviceItems.length === 0) {
      return { success: false, error: 'Erro ao buscar itens de serviço' };
    }

    // 4. Buscar dados da empresa
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('company_data')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant?.company_data) {
      return { success: false, error: 'Dados da empresa não configurados' };
    }

    const companyData = tenant.company_data as any;

    // 5. Criar registro fiscal_invoices
    const referencia = `NFSE_${chargeId.substring(0, 8)}_${Date.now()}`;
    
    const { data: fiscalInvoice, error: invoiceError } = await supabase
      .from('fiscal_invoices')
      .insert({
        tenant_id: tenantId,
        tipo: 'NFSE',
        origem: 'SERVICO',
        customer_id: charge.customer_id,
        contract_id: charge.billing_period.contract_id,
        billing_period_id: charge.billing_periods,
        charge_id: chargeId,
        valor: validation.valorMaximo!,
        status: 'PROCESSANDO',
        focus_ref: referencia,
        metadata: {
          charge_id: chargeId,
          items_count: serviceItems.length
        }
      })
      .select('id')
      .single();

    if (invoiceError || !fiscalInvoice) {
      return { success: false, error: `Erro ao criar registro fiscal: ${invoiceError?.message}` };
    }

    // 6. Preparar payload para FocusNFe
    const discriminacao = serviceItems
      .map((item: any) => {
        const service = item.service || {};
        return `${service.name || item.description || 'Serviço'} - Qtd: ${item.quantity} - Valor Unit: R$ ${parseFloat(item.unit_price).toFixed(2)}`;
      })
      .join(' | ');

    const dadosNFSe = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: '1',
      optante_simples_nacional: companyData.fiscal?.regime_tributario === 'simples_nacional',
      incentivador_cultural: false,
      status: '1',
      prestador: {
        cnpj: companyData.cnpj?.replace(/\D/g, '') || '',
        inscricao_municipal: companyData.inscricao_municipal || '',
        codigo_municipio: companyData.endereco?.codigo_municipio_ibge || ''
      },
      tomador: {
        cpf: charge.customer?.cpf_cnpj?.toString().length === 11 
          ? charge.customer.cpf_cnpj.toString() 
          : undefined,
        cnpj: charge.customer?.cpf_cnpj?.toString().length === 14 
          ? charge.customer.cpf_cnpj.toString() 
          : undefined,
        razao_social: charge.customer?.name || '',
        email: charge.customer?.email,
        telefone: charge.customer?.phone,
        endereco: {
          logradouro: charge.customer?.address || '',
          numero: charge.customer?.address_number || 'S/N',
          complemento: charge.customer?.complement,
          bairro: charge.customer?.neighborhood || '',
          codigo_municipio: charge.customer?.city ? '' : '', // TODO: Buscar código IBGE
          uf: charge.customer?.state || '',
          cep: charge.customer?.postal_code?.replace(/\D/g, '') || ''
        }
      },
      servico: {
        aliquota: 0.05, // Padrão 5%, pode ser calculado
        discriminacao,
        iss_retido: false,
        item_lista_servico: serviceItems[0]?.service?.codigo_servico_lc116 || '14.01',
        valor_servicos: validation.valorMaximo!,
        codigo_municipio: companyData.endereco?.codigo_municipio_ibge || ''
      }
    };

    // 7. Chamar FocusNFe
    const focusNFeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/focusnfe/nfse/emit`;
    const focusNFeResponse = await fetch(focusNFeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        referencia,
        dados_nfse: dadosNFSe,
        environment: 'producao'
      })
    });

    const focusNFeResult = await focusNFeResponse.json();

    if (!focusNFeResult.success) {
      await supabase
        .from('fiscal_invoices')
        .update({
          status: 'ERRO',
          error_message: focusNFeResult.error || 'Erro ao emitir via FocusNFe',
          updated_at: new Date().toISOString()
        })
        .eq('id', fiscalInvoice.id);

      return { success: false, error: focusNFeResult.error || 'Erro ao emitir via FocusNFe' };
    }

    // 8. Atualizar fiscal_invoices
    await supabase
      .from('fiscal_invoices')
      .update({
        status: 'EMITIDA',
        focus_status: focusNFeResult.status,
        numero: focusNFeResult.numero,
        xml_url: focusNFeResult.caminho_xml_nota_fiscal,
        pdf_url: focusNFeResult.caminho_pdf,
        metadata: {
          ...fiscalInvoice.metadata,
          focus_response: focusNFeResult
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', fiscalInvoice.id);

    // 9. Incrementar service_nfse_emitted_amount nos itens (proporcional)
    // AIDEV-NOTE: Distribuir o valor emitido proporcionalmente entre os itens
    const valorTotal = serviceItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);

    for (const item of serviceItems) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const itemTotal = qty * price;
      const proporcao = itemTotal / valorTotal;
      const valorEmitidoItem = validation.valorMaximo! * proporcao;
      const valorAtualEmitido = parseFloat(item.service_nfse_emitted_amount) || 0;

      await supabase
        .from('billing_period_items')
        .update({
          service_nfse_emitted_amount: valorAtualEmitido + valorEmitidoItem
        })
        .eq('id', item.id)
        .eq('tenant_id', tenantId);
    }

    return { success: true, invoiceId: fiscalInvoice.id };
  } catch (error) {
    console.error('[emitServiceInvoice] Erro:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * AIDEV-NOTE: Handler principal - Router
 */
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/fiscal-engine', '') || '/';
    const method = req.method;

    // Extrair tenant_id
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId && method === 'POST') {
      try {
        const body = await req.clone().json();
        tenantId = body.tenant_id;
      } catch {
        // Ignorar
      }
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID é obrigatório (header x-tenant-id ou body tenant_id)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Inicializar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Router
    let response: Response;

    if (path === '/nfe/can-emit' && method === 'POST') {
      const body = await req.json();
      const { billing_period_id } = body;
      
      if (!billing_period_id) {
        response = new Response(
          JSON.stringify({ error: 'billing_period_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const result = await canEmitProductInvoice(supabase, tenantId, billing_period_id);
        response = new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (path === '/nfe/emit' && method === 'POST') {
      const body = await req.json();
      const { billing_period_id } = body;
      
      if (!billing_period_id) {
        response = new Response(
          JSON.stringify({ error: 'billing_period_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const result = await emitProductInvoice(supabase, tenantId, billing_period_id);
        response = new Response(
          JSON.stringify(result),
          { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (path === '/nfse/can-emit' && method === 'POST') {
      const body = await req.json();
      const { charge_id } = body;
      
      if (!charge_id) {
        response = new Response(
          JSON.stringify({ error: 'charge_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const result = await canEmitServiceInvoice(supabase, tenantId, charge_id);
        response = new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else if (path === '/nfse/emit' && method === 'POST') {
      const body = await req.json();
      const { charge_id } = body;
      
      if (!charge_id) {
        response = new Response(
          JSON.stringify({ error: 'charge_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const result = await emitServiceInvoice(supabase, tenantId, charge_id);
        response = new Response(
          JSON.stringify(result),
          { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    else {
      response = new Response(
        JSON.stringify({ error: 'Rota não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return response;
  } catch (error) {
    console.error('[fiscal-engine] Erro geral:', error);
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

