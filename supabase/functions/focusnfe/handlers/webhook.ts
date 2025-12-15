// =====================================================
// FOCUSNFE HANDLER - WEBHOOK
// Descrição: Handler para receber webhooks do FocusNFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  FocusNFeWebhookPayload,
  FOCUSNFE_STATUS
} from "../types.ts";

// AIDEV-NOTE: Headers CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id, x-focusnfe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
// HANDLER PRINCIPAL DO WEBHOOK
// =====================================================

export async function handleWebhook(
  supabase: SupabaseClient,
  tenantId: string,
  payload: FocusNFeWebhookPayload
): Promise<Response> {
  console.log(`[FocusNFe Webhook] Recebido evento para tenant: ${tenantId}`);
  console.log(`[FocusNFe Webhook] Evento: ${payload.evento}, Referência: ${payload.referencia}`);
  
  // AIDEV-NOTE: Validar tenant_id
  if (!tenantId) {
    console.error("[FocusNFe Webhook] tenant_id não fornecido");
    return jsonResponse({
      success: false,
      error: "tenant_id é obrigatório na URL"
    }, 400);
  }
  
  // AIDEV-NOTE: Validar formato UUID do tenant
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    console.error("[FocusNFe Webhook] tenant_id inválido:", tenantId);
    return jsonResponse({
      success: false,
      error: "tenant_id inválido"
    }, 400);
  }
  
  // AIDEV-NOTE: Validar payload
  if (!payload.referencia) {
    console.error("[FocusNFe Webhook] referencia não fornecida");
    return jsonResponse({
      success: false,
      error: "referencia é obrigatória"
    }, 400);
  }
  
  try {
    // AIDEV-NOTE: Verificar se é um evento duplicado (idempotência)
    const eventId = `${tenantId}-${payload.referencia}-${payload.evento}-${payload.data}`;
    
    const { data: existingEvent } = await supabase
      .from('integration_processed_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();
    
    if (existingEvent) {
      console.log(`[FocusNFe Webhook] Evento duplicado ignorado: ${eventId}`);
      return jsonResponse({
        success: true,
        message: "Evento já processado"
      });
    }
    
    // AIDEV-NOTE: Processar evento baseado no tipo
    await processarEvento(supabase, tenantId, payload);
    
    // AIDEV-NOTE: Registrar evento processado
    await registrarEventoProcessado(supabase, tenantId, eventId, payload);
    
    console.log(`[FocusNFe Webhook] Evento processado com sucesso: ${payload.evento}`);
    
    return jsonResponse({
      success: true,
      message: "Webhook processado com sucesso"
    });
    
  } catch (error) {
    console.error("[FocusNFe Webhook] Erro ao processar:", error);
    
    // AIDEV-NOTE: Registrar erro no audit_log
    await registrarErroWebhook(supabase, tenantId, payload, error);
    
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Erro ao processar webhook"
    }, 500);
  }
}

// =====================================================
// PROCESSAMENTO DE EVENTOS
// =====================================================

/**
 * AIDEV-NOTE: Processa evento do webhook baseado no tipo
 */
async function processarEvento(
  supabase: SupabaseClient,
  tenantId: string,
  payload: FocusNFeWebhookPayload
): Promise<void> {
  const evento = payload.evento.toLowerCase();
  
  // AIDEV-NOTE: Determinar tipo de documento (nfe ou nfse)
  const isNFe = evento.includes('nfe') || payload.chave_nfe;
  const isNFSe = evento.includes('nfse') || evento.includes('nfsen');
  
  console.log(`[FocusNFe Webhook] Tipo documento: ${isNFe ? 'NFe' : isNFSe ? 'NFSe' : 'Desconhecido'}`);
  
  // AIDEV-NOTE: Buscar finance_entry pela referência
  const { data: entry } = await supabase
    .from('finance_entries')
    .select('id, invoice_data, invoice_status')
    .eq('tenant_id', tenantId)
    .eq('invoice_data->>referencia', payload.referencia)
    .single();
  
  if (!entry) {
    console.warn(`[FocusNFe Webhook] Finance entry não encontrada para referência: ${payload.referencia}`);
    // AIDEV-NOTE: Não falhar, apenas logar - pode ser uma nota antiga ou de outro sistema
    return;
  }
  
  // AIDEV-NOTE: Mapear status do FocusNFe para status interno
  const statusInterno = mapearStatus(payload.status);
  
  // AIDEV-NOTE: Preparar dados atualizados
  const invoiceDataAtualizado = {
    ...entry.invoice_data,
    status: payload.status,
    evento: payload.evento,
    data_evento: payload.data,
    atualizado_em: new Date().toISOString()
  };
  
  // AIDEV-NOTE: Adicionar dados específicos baseado no evento
  if (evento.includes('autorizado') || evento.includes('emitido')) {
    if (isNFe) {
      invoiceDataAtualizado.chave_nfe = payload.chave_nfe;
      invoiceDataAtualizado.numero = payload.numero;
      invoiceDataAtualizado.serie = payload.serie;
    }
    invoiceDataAtualizado.caminho_xml = payload.caminho_xml_nota_fiscal;
    invoiceDataAtualizado.caminho_pdf = payload.caminho_danfe;
    invoiceDataAtualizado.data_autorizacao = payload.data;
  }
  
  if (evento.includes('cancelado')) {
    invoiceDataAtualizado.cancelado_em = payload.data;
  }
  
  if (evento.includes('erro') && payload.mensagem_sefaz) {
    invoiceDataAtualizado.mensagem_erro = payload.mensagem_sefaz;
  }
  
  // AIDEV-NOTE: Atualizar finance_entry
  const { error: updateError } = await supabase
    .from('finance_entries')
    .update({
      invoice_status: statusInterno,
      invoice_data: invoiceDataAtualizado
    })
    .eq('id', entry.id);
  
  if (updateError) {
    console.error("[FocusNFe Webhook] Erro ao atualizar finance_entry:", updateError);
    throw new Error(`Erro ao atualizar: ${updateError.message}`);
  }
  
  // AIDEV-NOTE: Criar notificação se for evento importante
  await criarNotificacaoEvento(supabase, tenantId, entry.id, payload, statusInterno);
  
  console.log(`[FocusNFe Webhook] Finance entry ${entry.id} atualizada para status: ${statusInterno}`);
}

/**
 * AIDEV-NOTE: Mapeia status do FocusNFe para status interno
 */
function mapearStatus(statusFocus: string): string {
  const statusLower = statusFocus?.toLowerCase() || '';
  
  // AIDEV-NOTE: Usar mapeamento de constantes
  if (statusLower === 'autorizado' || statusLower === 'emitido') {
    return 'issued';
  }
  if (statusLower === 'cancelado') {
    return 'cancelled';
  }
  if (statusLower === 'processando' || statusLower === 'aguardando') {
    return 'processing';
  }
  if (statusLower === 'erro_autorizacao' || statusLower === 'erro' || statusLower === 'rejeitado') {
    return 'error';
  }
  if (statusLower === 'denegado') {
    return 'denied';
  }
  
  return 'processing';
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * AIDEV-NOTE: Registra evento processado para idempotência
 */
async function registrarEventoProcessado(
  supabase: SupabaseClient,
  tenantId: string,
  eventId: string,
  payload: FocusNFeWebhookPayload
): Promise<void> {
  try {
    // AIDEV-NOTE: Buscar integration_id do FocusNFe
    const { data: integration } = await supabase
      .from('payment_gateways')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('provider', 'focusnfe')
      .single();
    
    await supabase.from('integration_processed_events').insert({
      tenant_id: tenantId,
      integration_id: integration?.id,
      event_type: payload.evento,
      event_id: eventId,
      status: 'processed',
      payload: payload,
      processed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("[FocusNFe Webhook] Erro ao registrar evento processado:", error);
    // AIDEV-NOTE: Não falhar por erro de registro
  }
}

/**
 * AIDEV-NOTE: Registra erro de processamento do webhook
 */
async function registrarErroWebhook(
  supabase: SupabaseClient,
  tenantId: string,
  payload: FocusNFeWebhookPayload,
  error: unknown
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      action: 'focusnfe_webhook_error',
      entity_type: 'webhook',
      metadata: {
        evento: payload.evento,
        referencia: payload.referencia,
        erro: error instanceof Error ? error.message : String(error),
        payload: payload
      }
    });
  } catch (logError) {
    console.error("[FocusNFe Webhook] Erro ao registrar erro no audit_log:", logError);
  }
}

/**
 * AIDEV-NOTE: Cria notificação para eventos importantes
 */
async function criarNotificacaoEvento(
  supabase: SupabaseClient,
  tenantId: string,
  financeEntryId: string,
  payload: FocusNFeWebhookPayload,
  statusInterno: string
): Promise<void> {
  try {
    // AIDEV-NOTE: Determinar tipo e mensagem da notificação
    let tipo = 'info';
    let subject = '';
    let content = '';
    
    const evento = payload.evento.toLowerCase();
    
    if (evento.includes('autorizado') || evento.includes('emitido')) {
      tipo = 'success';
      subject = `✅ Nota Fiscal ${payload.referencia} autorizada`;
      content = `A nota fiscal ${payload.referencia} foi autorizada com sucesso pela SEFAZ.`;
      
      if (payload.chave_nfe) {
        content += `\n\nChave de Acesso: ${payload.chave_nfe}`;
      }
      if (payload.numero) {
        content += `\nNúmero: ${payload.numero}`;
      }
    } else if (evento.includes('cancelado')) {
      tipo = 'warning';
      subject = `⚠️ Nota Fiscal ${payload.referencia} cancelada`;
      content = `A nota fiscal ${payload.referencia} foi cancelada.`;
    } else if (evento.includes('erro') || evento.includes('rejeitado')) {
      tipo = 'error';
      subject = `❌ Erro na Nota Fiscal ${payload.referencia}`;
      content = `Ocorreu um erro na autorização da nota fiscal ${payload.referencia}.`;
      
      if (payload.mensagem_sefaz) {
        content += `\n\nMensagem: ${payload.mensagem_sefaz}`;
      }
    } else {
      // AIDEV-NOTE: Não criar notificação para outros eventos
      return;
    }
    
    // AIDEV-NOTE: Inserir notificação
    await supabase.from('notifications').insert({
      tenant_id: tenantId,
      type: `invoice_${statusInterno}`,
      recipient_email: 'system@revalya.com',
      subject,
      content,
      metadata: {
        finance_entry_id: financeEntryId,
        referencia: payload.referencia,
        evento: payload.evento,
        status: payload.status,
        chave_nfe: payload.chave_nfe
      }
    });
    
    console.log(`[FocusNFe Webhook] Notificação criada: ${subject}`);
    
  } catch (error) {
    console.error("[FocusNFe Webhook] Erro ao criar notificação:", error);
    // AIDEV-NOTE: Não falhar por erro de notificação
  }
}
