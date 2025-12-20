// =====================================================
// HOOK SEGURO PARA NOTIFICAÇÕES
// Implementa todas as 5 camadas de segurança multi-tenant
// =====================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantQuery, useSecureTenantMutation } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';
import * as Sentry from "@sentry/react";

// AIDEV-NOTE: Interface para notificação segura com tenant_id obrigatório
export interface SecureNotification {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  content: string;
  metadata?: any;
  sent_at?: string;
  error?: string;
  created_at: string;
  updated_at?: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
  // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
  title?: string;
  message?: string;
}

// AIDEV-NOTE: Parâmetros para filtros seguros
interface SecureNotificationFilters {
  type?: string;
  // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
  limit?: number;
  offset?: number;
}

/**
 * 🔐 Hook Seguro para Gerenciamento de Notificações
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */
export function useSecureNotifications(filters: SecureNotificationFilters = {}) {
  const queryClient = useQueryClient();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  const {
    type,
    // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
    limit = 20,
    offset = 0
  } = filters;

  // 🔍 QUERY SEGURA PARA LISTAR NOTIFICAÇÕES
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA (tenant_id será adicionado automaticamente pelo useSecureTenantQuery)
    ['notifications', {
      type,
      // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
      limit,
      offset
    }],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Validação crítica - garantir que tenantId é válido e é um UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!tenantId || !uuidRegex.test(tenantId)) {
        const errorMsg = `Tenant ID inválido para buscar notificações: "${tenantId}"`;
        console.error('[SECURITY]', errorMsg);
        Sentry.captureException(new Error(errorMsg), {
          tags: { context: 'useSecureNotifications', tenantId }
        });
        throw new Error(errorMsg);
      }

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .order('created_at', { ascending: false });

      // Aplicar filtros opcionais
      if (type) {
        query = query.eq('type', type);
      }
      
      // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[SECURITY] Erro ao acessar notificações:', error.message);
        Sentry.captureException(error, {
          tags: { context: 'useSecureNotifications', tenantId },
          extra: { query: 'list_notifications', filters }
        });
        throw error;
      }

      // 🔍 VALIDAÇÃO DUPLA DOS DADOS RETORNADOS
      const validatedData = data?.filter(notification => {
        const isValid = notification.tenant_id === tenantId;
        if (!isValid) {
          console.error('[SECURITY] Tentativa de vazamento de dados detectada:', {
            notificationId: notification.id,
            expectedTenantId: tenantId,
            actualTenantId: notification.tenant_id
          });
        }
        return isValid;
      }) || [];

      console.log(`[AUDIT] Notificações carregadas: ${validatedData.length} registros para tenant ${tenantId}`);
      console.log(`[DEBUG] Primeiras 3 notificações:`, validatedData.slice(0, 3).map(n => ({ id: n.id, type: n.type, subject: n.subject })));

      return validatedData as SecureNotification[];
    },
    {
      // AIDEV-NOTE: enabled é gerenciado automaticamente pelo useSecureTenantQuery
      // baseado em isValidTenant (tenant definido, ativo e com ID válido)
      staleTime: 30000, // 30 segundos
    }
  );

  // AIDEV-NOTE: Funções de marcar como lida removidas - tabela notifications não tem campo 'read'
  // Se necessário implementar status de leitura, criar uma tabela separada ou adicionar campo na tabela
  const markAsRead = useCallback(async (notificationId: string) => {
    console.warn('[AUDIT] Função markAsRead chamada mas não implementada - tabela notifications não tem campo read');
    // AIDEV-NOTE: Implementação futura - pode usar metadata para armazenar status de leitura
  }, []);

  const markAllAsRead = useCallback(async () => {
    console.warn('[AUDIT] Função markAllAsRead chamada mas não implementada - tabela notifications não tem campo read');
    // AIDEV-NOTE: Implementação futura - pode usar metadata para armazenar status de leitura
  }, []);

  // MUTAÇÃO SEGURA PARA DELETAR NOTIFICAÇÃO
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Acesso negado');
    }

    console.log(`[AUDIT] Deletando notificação: ${notificationId} para tenant ${currentTenant.id}`);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('tenant_id', currentTenant.id); // FILTRO DUPLO DE SEGURANÇA

    if (error) {
      console.error('[SECURITY] Erro ao deletar notificação:', error.message);
      throw error;
    }

    // Invalidar cache para atualizar a lista
    queryClient.invalidateQueries({
      queryKey: ['notifications', currentTenant.id]
    });

    console.log(`[AUDIT] Notificação deletada com sucesso: ${notificationId}`);
  }, [hasAccess, currentTenant, queryClient]);

  return {
    // Estados
    notifications: notificationsData || [],
    loading: isLoading,
    error,
    hasAccess,
    
    // Ações
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
    
    // Estatísticas
    // AIDEV-NOTE: unreadCount removido - tabela notifications não tem campo 'read'
    unreadCount: 0, // AIDEV-NOTE: Sempre 0 pois não há campo read
    totalCount: (notificationsData as SecureNotification[])?.length || 0
  };
}

// AIDEV-NOTE: Hook utilitário para estatísticas de notificações
export function useNotificationStats() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  return useSecureTenantQuery(
    ['notification-stats', currentTenant?.id],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Validação crítica - garantir que tenantId é válido e é um UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!tenantId || !uuidRegex.test(tenantId)) {
        const errorMsg = `Tenant ID inválido para buscar estatísticas: "${tenantId}"`;
        console.error('[SECURITY]', errorMsg);
        Sentry.captureException(new Error(errorMsg), {
          tags: { context: 'useNotificationStats', tenantId }
        });
        throw new Error(errorMsg);
      }

      console.log(`[AUDIT] Carregando estatísticas de notificações para tenant ${tenantId}`);

      const { data, error } = await supabase
        .from('notifications')
        .select('type, created_at')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[SECURITY] Erro ao acessar estatísticas de notificações:', error.message);
        Sentry.captureException(error, {
          tags: { context: 'useNotificationStats', tenantId },
          extra: { query: 'notification_stats' }
        });
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        // AIDEV-NOTE: unread removido - tabela notifications não tem campo 'read'
        unread: 0, // AIDEV-NOTE: Sempre 0 pois não há campo read
        byType: data?.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
        recent: data?.filter(n => {
          const created = new Date(n.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        }).length || 0
      };

      return stats;
    },
    {
      enabled: hasAccess && !!currentTenant?.id && currentTenant.id.trim() !== '',
      staleTime: 60000, // 1 minuto
    }
  );
}