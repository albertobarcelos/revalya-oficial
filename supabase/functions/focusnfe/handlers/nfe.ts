// =====================================================
// FOCUSNFE HANDLER - NFE
// Descrição: Handlers para emissão de NFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  NFePayload, 
  EmitirNFeRequest,
  CancelarRequest,
  FocusNFeResponse,
  FocusNFeStatusResponse,
  FocusNFeCancelResponse,
  FOCUSNFE_STATUS,
  ALIQUOTAS_2026
} from "../types.ts";
import { getFocusNFeCredentials, focusNFeRequest } from "../utils/auth.ts";
import { validarNFe, gerarReferencia } from "../utils/validator.ts";

// AIDEV-NOTE: Headers CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS"
};

/**
 * AIDEV-NOTE: Criar resposta JSON padronizada
 */
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// =====================================================
// EMITIR NFE
// =====================================================

export async function handleEmitirNFe(
  supabase: SupabaseClient,
  body: EmitirNFeRequest
): Promise<Response> {
  console.log("[NFe] Iniciando emissão de NFe");
  
  const { tenant_id, finance_entry_id, dados_nfe } = body;
  
  // AIDEV-NOTE: Validar tenant_id
  if (!tenant_id) {
    return jsonResponse({
      success: false,
      error: "tenant_id é obrigatório"
    }, 400);
  }
  
  // AIDEV-NOTE: Buscar credenciais do FocusNFe
  const credentials = await getFocusNFeCredentials(supabase, tenant_id);
  
  if (!credentials) {
    return jsonResponse({
      success: false,
      error: "Configuração do FocusNFe não encontrada para este tenant"
    }, 404);
  }
  
  // AIDEV-NOTE: Validar dados da NFe
  const validationResult = validarNFe(dados_nfe);
  
  if (!validationResult.valid) {
    return jsonResponse({
      success: false,
      error: "Dados inválidos",
      erros: validationResult.errors
    }, 400);
  }
  
  // AIDEV-NOTE: Gerar referência única
  const referencia = gerarReferencia('nfe', tenant_id, finance_entry_id);
  
  console.log(`[NFe] Referência gerada: ${referencia}`);
  
  // AIDEV-NOTE: Preparar payload completo
  const payload = prepararPayloadNFe(dados_nfe, credentials.config);
  
  // AIDEV-NOTE: Aplicar campos da Reforma Tributária se aplicável (2026+)
  const currentYear = new Date().getFullYear();
  if (currentYear >= 2026) {
    console.log("[NFe] Aplicando campos da Reforma Tributária 2026");
    aplicarCamposReformaTributaria(payload);
  }
  
  // AIDEV-NOTE: Fazer requisição para FocusNFe
  const result = await focusNFeRequest<FocusNFeResponse>(
    credentials,
    '/nfe',
    {
      method: 'POST',
      queryParams: { ref: referencia },
      body: payload
    }
  );
  
  if (!result.success) {
    console.error("[NFe] Erro ao emitir:", result.error);
    
    // AIDEV-NOTE: Registrar tentativa de emissão com erro
    await registrarTentativaEmissao(supabase, {
      tenant_id,
      finance_entry_id,
      referencia,
      tipo: 'nfe',
      status: 'erro',
      erro: result.error,
      detalhes: result.data
    });
    
    return jsonResponse({
      success: false,
      error: result.error,
      detalhes: result.data
    }, result.status || 400);
  }
  
  console.log(`[NFe] Emissão iniciada: ${result.data?.status}`);
  
  // AIDEV-NOTE: Registrar emissão no banco
  await registrarEmissao(supabase, {
    tenant_id,
    finance_entry_id,
    referencia,
    tipo: 'nfe',
    status: result.data?.status || 'processando',
    caminho: result.data?.caminho
  });
  
  return jsonResponse({
    success: true,
    referencia,
    status: result.data?.status,
    caminho: result.data?.caminho,
    mensagem: "NFe enviada para processamento"
  });
}

// =====================================================
// CONSULTAR NFE
// =====================================================

export async function handleConsultarNFe(
  supabase: SupabaseClient,
  tenantId: string,
  referencia: string
): Promise<Response> {
  console.log(`[NFe] Consultando NFe: ${referencia}`);
  
  // AIDEV-NOTE: Validar parâmetros
  if (!tenantId || !referencia) {
    return jsonResponse({
      success: false,
      error: "tenant_id e referencia são obrigatórios"
    }, 400);
  }
  
  // AIDEV-NOTE: Buscar credenciais
  const credentials = await getFocusNFeCredentials(supabase, tenantId);
  
  if (!credentials) {
    return jsonResponse({
      success: false,
      error: "Configuração do FocusNFe não encontrada"
    }, 404);
  }
  
  // AIDEV-NOTE: Consultar status na API
  const result = await focusNFeRequest<FocusNFeStatusResponse>(
    credentials,
    `/nfe/${referencia}`,
    { method: 'GET' }
  );
  
  if (!result.success) {
    return jsonResponse({
      success: false,
      error: result.error
    }, result.status || 400);
  }
  
  // AIDEV-NOTE: Se status mudou, atualizar no banco
  if (result.data?.status) {
    await atualizarStatusEmissao(supabase, tenantId, referencia, result.data);
  }
  
  return jsonResponse({
    success: true,
    ...result.data
  });
}

// =====================================================
// CANCELAR NFE
// =====================================================

export async function handleCancelarNFe(
  supabase: SupabaseClient,
  body: CancelarRequest
): Promise<Response> {
  console.log(`[NFe] Iniciando cancelamento: ${body.referencia}`);
  
  const { tenant_id, referencia, justificativa } = body;
  
  // AIDEV-NOTE: Validar parâmetros
  if (!tenant_id || !referencia || !justificativa) {
    return jsonResponse({
      success: false,
      error: "tenant_id, referencia e justificativa são obrigatórios"
    }, 400);
  }
  
  // AIDEV-NOTE: Validar justificativa (mínimo 15 caracteres)
  if (justificativa.length < 15) {
    return jsonResponse({
      success: false,
      error: "Justificativa deve ter no mínimo 15 caracteres"
    }, 400);
  }
  
  // AIDEV-NOTE: Buscar credenciais
  const credentials = await getFocusNFeCredentials(supabase, tenant_id);
  
  if (!credentials) {
    return jsonResponse({
      success: false,
      error: "Configuração do FocusNFe não encontrada"
    }, 404);
  }
  
  // AIDEV-NOTE: Enviar cancelamento
  const result = await focusNFeRequest<FocusNFeCancelResponse>(
    credentials,
    `/nfe/${referencia}`,
    {
      method: 'DELETE',
      body: { justificativa }
    }
  );
  
  if (!result.success) {
    return jsonResponse({
      success: false,
      error: result.error
    }, result.status || 400);
  }
  
  // AIDEV-NOTE: Atualizar status no banco
  await atualizarStatusCancelamento(supabase, tenant_id, referencia, result.data);
  
  return jsonResponse({
    success: true,
    status: result.data?.status,
    mensagem: "NFe cancelada com sucesso"
  });
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * AIDEV-NOTE: Prepara payload completo da NFe com dados do emitente
 */
function prepararPayloadNFe(
  dados: NFePayload,
  config: any
): NFePayload {
  // AIDEV-NOTE: Se cnpj_emitente não foi informado, usar do config
  if (!dados.cnpj_emitente && config.emitente?.cnpj) {
    dados.cnpj_emitente = config.emitente.cnpj;
  }
  
  // AIDEV-NOTE: Aplicar defaults fiscais se existirem
  if (config.fiscal_defaults?.nfe) {
    const defaults = config.fiscal_defaults.nfe;
    
    if (!dados.natureza_operacao && defaults.natureza_operacao) {
      dados.natureza_operacao = defaults.natureza_operacao;
    }
    
    if (dados.tipo_documento === undefined && defaults.tipo_documento) {
      dados.tipo_documento = defaults.tipo_documento;
    }
    
    if (dados.finalidade_emissao === undefined && defaults.finalidade_emissao) {
      dados.finalidade_emissao = defaults.finalidade_emissao as any;
    }
    
    if (dados.consumidor_final === undefined && defaults.consumidor_final) {
      dados.consumidor_final = defaults.consumidor_final;
    }
    
    if (dados.modalidade_frete === undefined && defaults.modalidade_frete) {
      dados.modalidade_frete = defaults.modalidade_frete as any;
    }
  }
  
  return dados;
}

/**
 * AIDEV-NOTE: Aplica campos da Reforma Tributária 2026 aos itens
 */
function aplicarCamposReformaTributaria(payload: NFePayload): void {
  // AIDEV-NOTE: Calcular totais de IBS e CBS
  let totalIBSUF = 0;
  let totalIBSMun = 0;
  let totalCBS = 0;
  
  // AIDEV-NOTE: Aplicar em cada item
  payload.itens?.forEach(item => {
    // AIDEV-NOTE: Se não tem tributação IBS/CBS definida, calcular
    if (!item.trib_ibs_cbs) {
      const baseCalculo = item.valor_bruto - (item.valor_desconto || 0);
      
      item.trib_ibs_cbs = {
        cst_ibs_cbs: '00', // Tributação normal
        aliquota_ibs_uf: ALIQUOTAS_2026.IBS_UF * 100,
        aliquota_ibs_mun: ALIQUOTAS_2026.IBS_MUN * 100,
        aliquota_cbs: ALIQUOTAS_2026.CBS * 100,
        base_calculo_ibs_cbs: baseCalculo,
        valor_ibs_uf: baseCalculo * ALIQUOTAS_2026.IBS_UF,
        valor_ibs_mun: baseCalculo * ALIQUOTAS_2026.IBS_MUN,
        valor_cbs: baseCalculo * ALIQUOTAS_2026.CBS
      };
    }
    
    // AIDEV-NOTE: Acumular totais
    if (item.trib_ibs_cbs) {
      totalIBSUF += item.trib_ibs_cbs.valor_ibs_uf || 0;
      totalIBSMun += item.trib_ibs_cbs.valor_ibs_mun || 0;
      totalCBS += item.trib_ibs_cbs.valor_cbs || 0;
    }
  });
  
  // AIDEV-NOTE: Adicionar totais no cabeçalho
  if (!payload.ibs_cbs) {
    payload.ibs_cbs = {
      ind_total_ibs_cbs: '1',
      valor_ibs: totalIBSUF + totalIBSMun,
      valor_cbs: totalCBS
    };
  }
}

/**
 * AIDEV-NOTE: Registra tentativa de emissão no banco
 */
async function registrarTentativaEmissao(
  supabase: SupabaseClient,
  dados: {
    tenant_id: string;
    finance_entry_id?: string;
    referencia: string;
    tipo: string;
    status: string;
    erro?: string;
    detalhes?: unknown;
  }
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      tenant_id: dados.tenant_id,
      action: `focusnfe_${dados.tipo}_error`,
      entity_type: 'finance_entries',
      entity_id: dados.finance_entry_id,
      metadata: {
        referencia: dados.referencia,
        status: dados.status,
        erro: dados.erro,
        detalhes: dados.detalhes
      }
    });
  } catch (error) {
    console.error("[NFe] Erro ao registrar tentativa:", error);
  }
}

/**
 * AIDEV-NOTE: Registra emissão bem-sucedida no banco
 */
async function registrarEmissao(
  supabase: SupabaseClient,
  dados: {
    tenant_id: string;
    finance_entry_id?: string;
    referencia: string;
    tipo: string;
    status: string;
    caminho?: string;
  }
): Promise<void> {
  try {
    // AIDEV-NOTE: Atualizar finance_entry se existir
    if (dados.finance_entry_id) {
      await supabase
        .from('finance_entries')
        .update({
          invoice_status: 'processing',
          invoice_data: {
            provider: 'focusnfe',
            tipo: dados.tipo,
            referencia: dados.referencia,
            status: dados.status,
            caminho: dados.caminho,
            emitido_em: new Date().toISOString()
          }
        })
        .eq('id', dados.finance_entry_id)
        .eq('tenant_id', dados.tenant_id);
    }
    
    // AIDEV-NOTE: Registrar no audit_log
    await supabase.from('audit_logs').insert({
      tenant_id: dados.tenant_id,
      action: `focusnfe_${dados.tipo}_emitido`,
      entity_type: 'finance_entries',
      entity_id: dados.finance_entry_id,
      metadata: {
        referencia: dados.referencia,
        status: dados.status,
        caminho: dados.caminho
      }
    });
    
  } catch (error) {
    console.error("[NFe] Erro ao registrar emissão:", error);
  }
}

/**
 * AIDEV-NOTE: Atualiza status de emissão no banco
 */
async function atualizarStatusEmissao(
  supabase: SupabaseClient,
  tenantId: string,
  referencia: string,
  dados: FocusNFeStatusResponse
): Promise<void> {
  try {
    // AIDEV-NOTE: Mapear status do FocusNFe para status interno
    const statusInterno = FOCUSNFE_STATUS[dados.status] || 'processing';
    
    // AIDEV-NOTE: Buscar finance_entry pela referência
    const { data: entry } = await supabase
      .from('finance_entries')
      .select('id, invoice_data')
      .eq('tenant_id', tenantId)
      .eq('invoice_data->>referencia', referencia)
      .single();
    
    if (entry) {
      // AIDEV-NOTE: Atualizar com dados completos
      await supabase
        .from('finance_entries')
        .update({
          invoice_status: statusInterno,
          invoice_data: {
            ...entry.invoice_data,
            status: dados.status,
            numero: dados.numero,
            serie: dados.serie,
            chave_nfe: dados.chave_nfe,
            data_autorizacao: dados.data_autorizacao,
            caminho_xml: dados.caminho_xml_nota_fiscal,
            caminho_danfe: dados.caminho_danfe,
            mensagem_sefaz: dados.mensagem_sefaz,
            atualizado_em: new Date().toISOString()
          }
        })
        .eq('id', entry.id);
    }
    
  } catch (error) {
    console.error("[NFe] Erro ao atualizar status:", error);
  }
}

/**
 * AIDEV-NOTE: Atualiza status de cancelamento no banco
 */
async function atualizarStatusCancelamento(
  supabase: SupabaseClient,
  tenantId: string,
  referencia: string,
  dados?: FocusNFeCancelResponse
): Promise<void> {
  try {
    // AIDEV-NOTE: Buscar finance_entry pela referência
    const { data: entry } = await supabase
      .from('finance_entries')
      .select('id, invoice_data')
      .eq('tenant_id', tenantId)
      .eq('invoice_data->>referencia', referencia)
      .single();
    
    if (entry) {
      await supabase
        .from('finance_entries')
        .update({
          invoice_status: 'cancelled',
          invoice_data: {
            ...entry.invoice_data,
            status: 'cancelado',
            caminho_xml_cancelamento: dados?.caminho_xml_cancelamento,
            cancelado_em: new Date().toISOString()
          }
        })
        .eq('id', entry.id);
    }
    
  } catch (error) {
    console.error("[NFe] Erro ao atualizar cancelamento:", error);
  }
}
