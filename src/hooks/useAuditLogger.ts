import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/hooks/useSupabase'

// AIDEV-NOTE: Hook para logging de auditoria seguro
// Registra ações importantes do usuário para compliance e segurança

interface AuditLogData {
  action: string
  resource?: string
  user_role?: string
  timestamp?: string
  error?: string
  severity?: 'low' | 'medium' | 'high'
  [key: string]: any
}

export function useAuditLogger() {
  const { user } = useSupabase()

  const logAction = useCallback(async (
    actionType: 'DATA_ACCESS' | 'ERROR' | 'SECURITY_VIOLATION' | 'DATA_VALIDATION_SUCCESS' | 'USER_ACTION',
    data: AuditLogData
  ) => {
    try {
      // AIDEV-NOTE: Log local para desenvolvimento
      console.log(`[AUDIT] ${actionType}:`, {
        user_id: user?.id,
        user_email: user?.email,
        timestamp: new Date().toISOString(),
        ...data
      })

      // AIDEV-NOTE: Em produção, aqui seria enviado para sistema de auditoria
      // Por enquanto, apenas registramos no console para não quebrar a aplicação
      
      // TODO: Implementar envio para tabela de auditoria quando necessário
      // await supabase.from('audit_logs').insert({
      //   user_id: user?.id,
      //   action_type: actionType,
      //   action_data: data,
      //   created_at: new Date().toISOString()
      // })

    } catch (error) {
      console.error('[AUDIT] Erro ao registrar log de auditoria:', error)
      // AIDEV-NOTE: Não propagar erro para não quebrar a aplicação
    }
  }, [user])

  return {
    logAction
  }
}