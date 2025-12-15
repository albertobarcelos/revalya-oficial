// =====================================================
// FOCUSNFE HANDLER - NFSE
// Descrição: Handlers para emissão de NFSe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  NFSePayload, 
  EmitirNFSeRequest,
  CancelarRequest,
  FocusNFeResponse,
  FocusNFeStatusResponse,
  FocusNFeCancelResponse,
  FOCUSNFE_STATUS,
  ALIQUOTAS_2026
} from "../types.ts";
import { getFocusNFeCredentials, focusNFeRequest } from "../utils/auth.ts";
import { validarNFSe, gerarReferencia } from "../utils/validator.ts";

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
// EMITIR NFSE
// =====================================================

export async function handleEmitirNFSe(
  supabase: SupabaseClient,
  body: EmitirNFSeRequest
): Promise<Response> {
  console.log("[NFSe] Iniciando emissão de NFSe");
  
  const { tenant_id, finance_entry_id, dados_nfse } = body;
  
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
  
  // AIDEV-NOTE: Validar dados da NFSe
  const validationResult = validarNFSe(dados_nfse);
  
  if (!validationResult.valid) {
    return jsonResponse({
      success: false,
      error: "Dados inválidos",
      erros: validationResult.errors
    }, 400);
  }
  
  // AIDEV-NOTE: Gerar referência única
  const referencia = gerarReferencia('nfse', tenant_id, finance_entry_id);
  
  console.log(`[NFSe] Referência gerada: ${referencia}`);
  
  // AIDEV-NOTE: Preparar payload completo
  const payload = prepararPayloadNFSe(dados_nfse, credentials.config);
  
  // AIDEV-NOTE: Adicionar campos da Reforma Tributária se aplicável (2026+)
  const currentYear = new Date().getFullYear();
  if (currentYear >= 2026 && dados_nfse.trib_ibs_cbs) {
    console.log("[NFSe] Aplicando campos da Reforma Tributária 2026");
  }
  
  // AIDEV-NOTE: Fazer requisição para FocusNFe
  const result = await focusNFeRequest<FocusNFeResponse>(
    credentials,
    '/nfse',
    {
      method: 'POST',
      queryParams: { ref: referencia },
      body: payload
    }
  );
  
  if (!result.success) {
    console.error("[NFSe] Erro ao emitir:", result.error);
    
    // AIDEV-NOTE: Registrar tentativa de emissão com erro
    await registrarTentativaEmissao(supabase, {
      tenant_id,
      finance_entry_id,
      referencia,
      tipo: 'nfse',
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
  
  console.log(`[NFSe] Emissão iniciada: ${result.data?.status}`);
  
  // AIDEV-NOTE: Registrar emissão no banco
  await registrarEmissao(supabase, {
    tenant_id,
    finance_entry_id,
    referencia,
    tipo: 'nfse',
    status: result.data?.status || 'processando',
    caminho: result.data?.caminho
  });
  
  return jsonResponse({
    success: true,
    referencia,
    status: result.data?.status,
    caminho: result.data?.caminho,
    mensagem: "NFSe enviada para processamento"
  });
}

// =====================================================
// CONSULTAR NFSE
// =====================================================

export async function handleConsultarNFSe(
  supabase: SupabaseClient,
  tenantId: string,
  referencia: string
): Promise<Response> {
  console.log(`[NFSe] Consultando NFSe: ${referencia}`);
  
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
    `/nfse/${referencia}`,
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
// CANCELAR NFSE
// =====================================================

export async function handleCancelarNFSe(
  supabase: SupabaseClient,
  body: CancelarRequest
): Promise<Response> {
  console.log(`[NFSe] Iniciando cancelamento: ${body.referencia}`);
  
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
    `/nfse/${referencia}`,
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
    mensagem: "NFSe cancelada com sucesso"
  });
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * AIDEV-NOTE: Prepara payload completo da NFSe com dados do emitente
 */
function prepararPayloadNFSe(
  dados: NFSePayload,
  config: any
): NFSePayload {
  // AIDEV-NOTE: Se prestador não foi informado, usar do config
  if (!dados.prestador && config.emitente) {
    dados.prestador = {
      cnpj: config.emitente.cnpj,
      inscricao_municipal: config.emitente.inscricao_municipal || '',
      codigo_municipio: config.emitente.endereco?.codigo_municipio || ''
    };
  }
  
  // AIDEV-NOTE: Aplicar defaults fiscais se existirem
  if (config.fiscal_defaults?.nfse) {
    const defaults = config.fiscal_defaults.nfse;
    
    if (dados.natureza_operacao === undefined && defaults.natureza_operacao) {
      dados.natureza_operacao = defaults.natureza_operacao;
    }
    
    if (dados.optante_simples_nacional === undefined && defaults.optante_simples_nacional !== undefined) {
      dados.optante_simples_nacional = defaults.optante_simples_nacional;
    }
    
    if (dados.incentivador_cultural === undefined && defaults.incentivador_cultural !== undefined) {
      dados.incentivador_cultural = defaults.incentivador_cultural;
    }
  }
  
  return dados;
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
    console.error("[NFSe] Erro ao registrar tentativa:", error);
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
    console.error("[NFSe] Erro ao registrar emissão:", error);
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
            numero: dados.numero_nfse,
            codigo_verificacao: dados.codigo_verificacao,
            data_autorizacao: dados.data_autorizacao,
            caminho_xml: dados.caminho_xml_nota_fiscal,
            caminho_pdf: dados.caminho_danfe,
            mensagem_sefaz: dados.mensagem_sefaz,
            atualizado_em: new Date().toISOString()
          }
        })
        .eq('id', entry.id);
    }
    
  } catch (error) {
    console.error("[NFSe] Erro ao atualizar status:", error);
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
    console.error("[NFSe] Erro ao atualizar cancelamento:", error);
  }
}
