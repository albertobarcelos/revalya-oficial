// =====================================================
// HOOK SEGURO PARA NOTIFICAÇÕES
// Implementa todas as 5 camadas de segurança multi-tenant
// =====================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

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
  read?: boolean;
  title?: string;
  message?: string;
}

// AIDEV-NOTE: Parâmetros para filtros seguros
interface SecureNotificationFilters {
  type?: string;
  read?: boolean;
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
    read,
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
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['notifications', currentTenant?.id, {
      type,
      read,
      limit,
      offset
    }],
    async (supabase, tenantId) => {
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
      
      if (read !== undefined) {
        query = query.eq('read', read);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[SECURITY] Erro ao acessar notificações:', error.message);
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

      return validatedData as SecureNotification[];
    },
    {
    }
  );

  // 🔄 MUTAÇÃO SEGURA PARA MARCAR COMO LIDA
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Acesso negado');
    }

    console.log(`[AUDIT] Marcando notificação como lida: ${notificationId} para tenant ${currentTenant.id}`);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('tenant_id', currentTenant.id); // 🛡️ FILTRO DUPLO DE SEGURANÇA

    if (error) {
      console.error('[SECURITY] Erro ao marcar notificação como lida:', error.message);
      throw error;
    }

    // Invalidar cache para atualizar a lista
    queryClient.invalidateQueries({
      queryKey: ['notifications', currentTenant.id]
    });

    console.log(`[AUDIT] Notificação marcada como lida com sucesso: ${notificationId}`);
  }, [hasAccess, currentTenant, queryClient]);

  // MUTAÇÃO SEGURA PARA MARCAR TODAS COMO LIDAS
  const markAllAsRead = useCallback(async () => {
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Acesso negado');
    }

    console.log(`[AUDIT] Marcando todas as notificações como lidas para tenant ${currentTenant.id}`);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('tenant_id', currentTenant.id) // FILTRO OBRIGATÓRIO
      .eq('read', false);

    if (error) {
      console.error('[SECURITY] Erro ao marcar todas as notificações como lidas:', error.message);
      throw error;
    }

    // Invalidar cache para atualizar a lista
    queryClient.invalidateQueries({
      queryKey: ['notifications', currentTenant.id]
    });

    console.log(`[AUDIT] Todas as notificações marcadas como lidas com sucesso`);
  }, [hasAccess, currentTenant, queryClient]);

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
    unreadCount: (notificationsData as SecureNotification[])?.filter(n => !n.read).length || 0,
    totalCount: (notificationsData as SecureNotification[])?.length || 0
  };
}

// AIDEV-NOTE: Hook utilitário para estatísticas de notificações
export function useNotificationStats() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  return useSecureTenantQuery(
    ['notification-stats', currentTenant?.id],
    async (supabase, tenantId) => {
      console.log(`[AUDIT] Carregando estatísticas de notificações para tenant ${tenantId}`);

      const { data, error } = await supabase
        .from('notifications')
        .select('type, read, created_at')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.read).length,
        byType: data.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recent: data.filter(n => {
          const created = new Date(n.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        }).length
      };

      return stats;
    },
    {
      enabled: hasAccess && !!currentTenant?.id,
      staleTime: 60000, // 1 minuto
    }
  );
}