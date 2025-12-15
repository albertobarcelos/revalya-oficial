// =====================================================
// SETUP ASAAS WEBHOOK COMPONENT
// Descrição: Componente para configurar webhook do ASAAS
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// =====================================================

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Link as LinkIcon, Bell } from 'lucide-react'
import { setupTenantWebhook, removeTenantWebhook, checkWebhookStatus } from '@/services/asaas/webhookService'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

// AIDEV-NOTE: Interface para status do webhook
interface WebhookStatus {
  loading: boolean
  success?: boolean
  message?: string
  error?: string
}

// AIDEV-NOTE: Props do componente
interface SetupAsaasWebhookProps {
  tenantId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

// AIDEV-NOTE: Mapeamento de eventos para nomes amigáveis em português
const EVENT_NAMES: Record<string, string> = {
  PAYMENT_CREATED: 'Pagamento Criado',
  PAYMENT_RECEIVED: 'Pagamento Recebido',
  PAYMENT_CONFIRMED: 'Pagamento Confirmado',
  PAYMENT_OVERDUE: 'Pagamento Vencido',
  PAYMENT_REFUNDED: 'Pagamento Estornado',
  PAYMENT_DELETED: 'Pagamento Deletado',
  PAYMENT_RESTORED: 'Pagamento Restaurado',
  PAYMENT_UPDATED: 'Pagamento Atualizado',
  PAYMENT_ANTICIPATED: 'Pagamento Antecipado'
}

// AIDEV-NOTE: Lista de eventos configurados automaticamente
const CONFIGURED_EVENTS = [
  'PAYMENT_CREATED',
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_UPDATED',
  'PAYMENT_ANTICIPATED'
]

// AIDEV-NOTE: Componente de configuração do webhook
export function SetupAsaasWebhook({ tenantId, onSuccess, onError }: SetupAsaasWebhookProps) {
  const [status, setStatus] = useState<WebhookStatus>({ loading: false })
  const [webhookConfig, setWebhookConfig] = useState<{ isConfigured: boolean; url?: string }>({
    isConfigured: false
  })

  // AIDEV-NOTE: Função para carregar status do webhook
  const loadWebhookStatus = async () => {
    try {
      const result = await checkWebhookStatus(tenantId)
      setWebhookConfig({
        isConfigured: result.isConfigured,
        url: result.url
      })
    } catch (error) {
      console.error('Erro ao carregar status do webhook:', error)
    }
  }

  // AIDEV-NOTE: Carrega status inicial
  useEffect(() => {
    loadWebhookStatus()
  }, [tenantId])

  // AIDEV-NOTE: Função para configurar webhook
  const handleSetupWebhook = async () => {
    setStatus({ loading: true })

    try {
      const result = await setupTenantWebhook(tenantId)

      if (result.success) {
        setStatus({
          loading: false,
          success: true,
          message: result.message
        })
        await loadWebhookStatus()
        onSuccess?.()
      } else {
        setStatus({
          loading: false,
          success: false,
          error: result.error
        })
        onError?.(result.error || 'Erro ao configurar webhook')
      }
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: 'Erro ao configurar webhook'
      })
      onError?.('Erro ao configurar webhook')
    }
  }

  // AIDEV-NOTE: Função para remover webhook
  const handleRemoveWebhook = async () => {
    setStatus({ loading: true })

    try {
      const result = await removeTenantWebhook(tenantId)

      if (result.success) {
        setStatus({
          loading: false,
          success: true,
          message: result.message
        })
        await loadWebhookStatus()
        onSuccess?.()
      } else {
        setStatus({
          loading: false,
          success: false,
          error: result.error
        })
        onError?.(result.error || 'Erro ao remover webhook')
      }
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: 'Erro ao remover webhook'
      })
      onError?.('Erro ao remover webhook')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Configuração do Webhook ASAAS</CardTitle>
          <CardDescription>
            Configure o webhook para receber notificações de pagamentos em tempo real
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{status.error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {status.success && status.message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Sucesso</AlertTitle>
                <AlertDescription className="text-green-600">
                  {status.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {webhookConfig.isConfigured && webhookConfig.url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Webhook Configurado com Sucesso</AlertTitle>
                <AlertDescription className="space-y-3 mt-2">
                  <div className="text-sm text-blue-700">
                    Seu webhook está ativo e recebendo notificações em tempo real do Asaas.
                  </div>

                  <div className="pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">
                        Eventos Monitorados:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CONFIGURED_EVENTS.map((event) => (
                        <Badge
                          key={event}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"
                        >
                          {EVENT_NAMES[event] || event}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Você receberá notificações automáticas quando qualquer um desses eventos ocorrer no Asaas.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          {webhookConfig.isConfigured ? (
            <Button
              variant="outline"
              onClick={handleRemoveWebhook}
              disabled={status.loading}
              className="w-full"
            >
              {status.loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remover Webhook
            </Button>
          ) : (
            <Button
              onClick={handleSetupWebhook}
              disabled={status.loading}
              className="w-full"
            >
              {status.loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Configurar Webhook
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}