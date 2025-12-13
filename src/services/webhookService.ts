// =====================================================
// WEBHOOK SERVICE
// Descrição: Serviço utilitário para validação de webhooks
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

import { validateHmacToken } from '@/lib/security'
import { logService } from './logService'

// AIDEV-NOTE: Este arquivo contém funções utilitárias para webhooks
// AIDEV-NOTE: As funções principais de configuração de webhook Asaas foram movidas para:
// AIDEV-NOTE: src/services/asaas/webhookService.ts
// AIDEV-NOTE: 
// AIDEV-NOTE: Funções removidas (não utilizadas):
// AIDEV-NOTE: - setupTenantWebhook (use setupTenantWebhook de asaas/webhookService.ts)
// AIDEV-NOTE: - removeTenantWebhook (use removeTenantWebhook de asaas/webhookService.ts)
// AIDEV-NOTE: - configureAsaasWebhook (substituída por implementação via proxy)
// AIDEV-NOTE: - removeAsaasWebhook (substituída por implementação via proxy)

// AIDEV-NOTE: Função para validar assinatura do webhook
export async function validateWebhookSignature(
  payload: string,
  signature: string,
  webhookToken: string
): Promise<boolean> {
  try {
    return await validateHmacToken(payload, signature, webhookToken)
  } catch (error) {
    logService.error('Erro ao validar assinatura do webhook:', error)
    return false
  }
}

// AIDEV-NOTE: Função para processar webhook de pagamento
// AIDEV-NOTE: Delega para gatewayService que tem implementação completa
export async function processPaymentWebhook(
  provider: string,
  payload: any,
  signature?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // AIDEV-NOTE: Importação dinâmica para evitar dependência circular
    const { gatewayService } = await import('./gatewayService')
    
    // AIDEV-NOTE: Validar assinatura se fornecida
    if (signature && payload) {
      // AIDEV-NOTE: Buscar token do webhook do banco (implementação simplificada)
      // AIDEV-NOTE: Em produção, buscar token baseado no provider e tenant
      const isValid = await validateWebhookSignature(
        typeof payload === 'string' ? payload : JSON.stringify(payload),
        signature,
        '' // Token seria buscado do banco
      )
      
      if (!isValid) {
        return {
          success: false,
          error: 'Assinatura do webhook inválida'
        }
      }
    }
    
    // AIDEV-NOTE: Processar webhook via gatewayService
    const result = await gatewayService.processWebhook(provider, payload)
    
    return {
      success: true
    }
  } catch (error) {
    logService.error('Erro ao processar webhook de pagamento:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// AIDEV-NOTE: Exportar objeto webhookService para compatibilidade com código legado
export const webhookService = {
  validateWebhookSignature,
  processPaymentWebhook
}
