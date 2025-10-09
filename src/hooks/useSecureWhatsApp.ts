// =====================================================
// HOOKS SEGUROS PARA WHATSAPP
// Descrição: Hooks específicos para operações WhatsApp
//           seguindo o guia de segurança multi-tenant
// =====================================================

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantAccessGuard } from '@/hooks/templates/useTenantAccessGuard';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { executeWithAuth, logAccess } from '@/utils/authUtils';
import { toast } from 'sonner';

// AIDEV-NOTE: Interfaces para tipagem segura das operações WhatsApp
interface WhatsAppIntegration {
  id: string;
  tenant_id: string;
  instance_name: string;
  api_key: string;
  api_url: string;
  environment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WhatsAppInstanceConfig {
  instanceName: string;
  apiKey: string;
  apiUrl: string;
  environment: string;
  isActive: boolean;
}

interface WhatsAppOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  qrCode?: string;
}

/**
 * Hook para validação de acesso específica do WhatsApp
 * AIDEV-NOTE: Primeira camada de segurança - validação de acesso
 */
export function useWhatsAppTenantGuard() {
  const { hasAccess, currentTenant, isLoading } = useTenantAccessGuard();
  
  const canManageWhatsApp = useMemo(() => {
    return hasAccess && currentTenant?.id;
  }, [hasAccess, currentTenant]);

  return {
    canManageWhatsApp,
    currentTenant,
    isLoading,
    hasAccess
  };
}

/**
 * Hook para consultas seguras de integrações WhatsApp
 * AIDEV-NOTE: Implementa as 5 camadas de segurança para consultas
 */
export function useSecureWhatsAppQuery() {
  const { canManageWhatsApp, currentTenant } = useWhatsAppTenantGuard();

  return useSecureTenantQuery({
    queryKey: ['whatsapp_integrations', currentTenant?.id],
    queryFn: async (): Promise<WhatsAppIntegration[]> => {
      if (!canManageWhatsApp || !currentTenant?.id) {
        throw new Error('Acesso negado para consultar integrações WhatsApp');
      }

      return await executeWithAuth(async () => {
        // AIDEV-NOTE: Configuração de contexto obrigatória
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: currentTenant.id 
        });

        const { data, error } = await supabase
          .from('tenant_integrations')
          .select('*')
          .eq('integration_type', 'whatsapp')
          .eq('tenant_id', currentTenant.id);

        if (error) {
          console.error('[useSecureWhatsAppQuery] Erro ao consultar integrações:', error);
          throw new Error(`Erro ao consultar integrações WhatsApp: ${error.message}`);
        }

        // AIDEV-NOTE: Log de auditoria obrigatório
        await logAccess(
          'read',
          'whatsapp_integrations',
          currentTenant.id,
          { count: data?.length || 0 }
        );

        return data || [];
      });
    },
    enabled: canManageWhatsApp && !!currentTenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para verificar status real da instância WhatsApp
 * AIDEV-NOTE: Verifica status na Evolution API para sincronizar com frontend
 */
export function useWhatsAppInstanceStatus(instanceName?: string) {
  const { canManageWhatsApp, currentTenant } = useWhatsAppTenantGuard();

  return useQuery({
    queryKey: ['whatsapp_instance_status', currentTenant?.id, instanceName],
    queryFn: async (): Promise<{ status: string; isConnected: boolean }> => {
      if (!canManageWhatsApp || !currentTenant?.id || !instanceName) {
        return { status: 'disconnected', isConnected: false };
      }

      try {
        // AIDEV-NOTE: Chamar serviço WhatsApp para verificar status real
        const response = await fetch('/api/whatsapp/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantSlug: currentTenant.slug,
            instanceName
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao verificar status: ${response.statusText}`);
        }

        const data = await response.json();
        const isConnected = data.status === 'open' || data.status === 'connected';

        // AIDEV-NOTE: Se a instância estiver conectada, atualizar configuração no banco
        if (isConnected) {
          // Atualizar status no banco de dados
          await executeWithAuth(async () => {
            await supabase.rpc('set_tenant_context_simple', { 
              p_tenant_id: currentTenant.id 
            });

            await supabase
              .from('tenant_integrations')
              .update({ 
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('tenant_id', currentTenant.id)
              .eq('integration_type', 'whatsapp');
          });
        }

        return {
          status: data.status || 'disconnected',
          isConnected
        };
      } catch (error) {
        console.error('[useWhatsAppInstanceStatus] Erro ao verificar status:', error);
        return { status: 'disconnected', isConnected: false };
      }
    },
    enabled: canManageWhatsApp && !!currentTenant?.id && !!instanceName,
    refetchInterval: 10000, // Verificar a cada 10 segundos
    staleTime: 5000, // Considerar dados obsoletos após 5 segundos
    retry: 2
  });
}

/**
 * Hook para operações de criação/atualização seguras
 * AIDEV-NOTE: Mutation segura com validações e logs de auditoria
 */
export function useSecureWhatsAppMutation() {
  const { canManageWhatsApp, currentTenant } = useWhatsAppTenantGuard();
  const queryClient = useQueryClient();

  const saveInstanceMutation = useMutation({
    mutationFn: async (config: WhatsAppInstanceConfig): Promise<WhatsAppOperationResult> => {
      if (!canManageWhatsApp || !currentTenant?.id) {
        throw new Error('Acesso negado para salvar configuração WhatsApp');
      }

      return await executeWithAuth(async () => {
        // AIDEV-NOTE: Configuração de contexto obrigatória
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: currentTenant.id 
        });

        // Verificar se já existe uma integração WhatsApp para este tenant
        const { data: existing, error: checkError } = await supabase
          .from('tenant_integrations')
          .select('id')
          .eq('tenant_id', currentTenant.id)
          .eq('integration_type', 'whatsapp')
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Erro ao verificar integração existente: ${checkError.message}`);
        }

        let result;
        if (existing) {
          // Atualizar registro existente
          const { data, error } = await supabase
            .from('tenant_integrations')
            .update({
              instance_name: config.instanceName,
              api_key: config.apiKey,
              api_url: config.apiUrl,
              environment: config.environment,
              is_active: config.isActive,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .eq('tenant_id', currentTenant.id)
            .select()
            .single();

          if (error) {
            throw new Error(`Erro ao atualizar configuração WhatsApp: ${error.message}`);
          }
          result = data;
        } else {
          // Criar novo registro com dados explícitos para RLS
          const insertData = {
            tenant_id: currentTenant.id, // AIDEV-NOTE: Explícito para RLS
            integration_type: 'whatsapp',
            instance_name: config.instanceName,
            api_key: config.apiKey,
            api_url: config.apiUrl,
            environment: config.environment,
            is_active: config.isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('tenant_integrations')
            .insert(insertData)
            .select()
            .single();

          if (error) {
            throw new Error(`Erro ao criar configuração WhatsApp: ${error.message}`);
          }
          result = data;
        }

        // AIDEV-NOTE: Log de auditoria obrigatório
        await logAccess(
          existing ? 'update' : 'create',
          'whatsapp_integrations',
          currentTenant.id,
          { 
            instance_name: config.instanceName,
            environment: config.environment,
            is_active: config.isActive
          }
        );

        return {
          success: true,
          data: result
        };
      });
    },
    onSuccess: () => {
      // Invalidar cache para atualizar dados
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp_integrations', currentTenant?.id] 
      });
      
      toast.success('Configuração WhatsApp salva com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useSecureWhatsAppMutation] Erro ao salvar:', error);
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    }
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string): Promise<WhatsAppOperationResult> => {
      if (!canManageWhatsApp || !currentTenant?.id) {
        throw new Error('Acesso negado para deletar configuração WhatsApp');
      }

      return await executeWithAuth(async () => {
        // AIDEV-NOTE: Configuração de contexto obrigatória
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: currentTenant.id 
        });

        const { error } = await supabase
          .from('tenant_integrations')
          .delete()
          .eq('id', instanceId)
          .eq('tenant_id', currentTenant.id)
          .eq('integration_type', 'whatsapp');

        if (error) {
          throw new Error(`Erro ao deletar configuração WhatsApp: ${error.message}`);
        }

        // AIDEV-NOTE: Log de auditoria obrigatório
        await logAccess(
          'delete',
          'whatsapp_integrations',
          currentTenant.id,
          { instance_id: instanceId }
        );

        return {
          success: true
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp_integrations', currentTenant?.id] 
      });
      
      toast.success('Configuração WhatsApp removida com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useSecureWhatsAppMutation] Erro ao deletar:', error);
      toast.error(`Erro ao remover configuração: ${error.message}`);
    }
  });

  return {
    saveInstance: saveInstanceMutation.mutateAsync,
    deleteInstance: deleteInstanceMutation.mutateAsync,
    isSaving: saveInstanceMutation.isPending,
    isDeleting: deleteInstanceMutation.isPending,
    canManageWhatsApp
  };
}

/**
 * Hook principal para gerenciamento seguro do WhatsApp
 * AIDEV-NOTE: Combina todas as operações em um hook principal
 */
export function useSecureWhatsApp() {
  const { canManageWhatsApp, currentTenant, isLoading } = useWhatsAppTenantGuard();
  const { data: integrations, isLoading: isLoadingIntegrations, refetch } = useSecureWhatsAppQuery();
  const { saveInstance, deleteInstance, isSaving, isDeleting } = useSecureWhatsAppMutation();

  // AIDEV-NOTE: Função para verificar se há integração ativa
  const hasActiveIntegration = useMemo(() => {
    return integrations?.some(integration => integration.is_active) || false;
  }, [integrations]);

  // AIDEV-NOTE: Função para obter configuração ativa
  const getActiveIntegration = useCallback(() => {
    return integrations?.find(integration => integration.is_active) || null;
  }, [integrations]);

  return {
    // Estado
    canManageWhatsApp,
    currentTenant,
    isLoading: isLoading || isLoadingIntegrations,
    hasActiveIntegration,
    integrations: integrations || [],
    
    // Operações
    saveInstance,
    deleteInstance,
    getActiveIntegration,
    refetch,
    
    // Status das operações
    isSaving,
    isDeleting
  };
}