// AIDEV-NOTE: Hook para gerenciar ativação/desativação do WhatsApp
// Responsabilidade única: lógica de toggle do canal WhatsApp
// REESTRUTURAÇÃO: tenant_integrations primeiro, depois Evolution API

import { useState } from 'react';
import { whatsappService } from '@/services/whatsappService';
import { logService } from '@/services/logService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { executeWithAuth, logAccess } from '@/utils/authUtils';
import { MODULE_NAME, TOAST_MESSAGES } from '../constants';
import { TenantIntegration } from '../types';

interface UseWhatsAppToggleProps {
  tenantId: string;
  tenantSlug: string;
  hasAccess: boolean;
  currentTenant: any;
  integrations: TenantIntegration[];
  onToggle?: (canal: string, enabled: boolean) => void;
  updateCanalState: (canal: 'whatsapp', isActive: boolean) => void;
  updateLoadingState: (canal: 'whatsapp', isLoading: boolean) => void;
  setConnectionStatus: (status: any) => void;
  enableStatusPolling: (enable: boolean) => void;
  resetConnection: () => void;
}

export function useWhatsAppToggle({
  tenantId,
  tenantSlug,
  hasAccess,
  currentTenant,
  integrations,
  onToggle,
  updateCanalState,
  updateLoadingState,
  setConnectionStatus,
  enableStatusPolling,
  resetConnection
}: UseWhatsAppToggleProps) {
  const { toast } = useToast();

  // AIDEV-NOTE: Função para reverter registro em caso de erro na Evolution API
  const rollbackTenantIntegration = async (integrationId: string, wasExisting: boolean) => {
    try {
      await executeWithAuth(async () => {
        const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenantId
        });
        
        if (contextError) {
          logService.error(MODULE_NAME, `Erro ao configurar contexto para rollback: ${contextError.message}`);
          return;
        }

        if (wasExisting) {
          // Se era existente, reverter para is_enabled: false
          const { error } = await supabase
            .from('tenant_integrations')
            .update({
              tenant_id: tenantId,
              is_enabled: false,
              connection_status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('id', integrationId)
            .eq('tenant_id', tenantId);
            
          if (error) {
            logService.error(MODULE_NAME, `Erro no rollback (update): ${error.message}`);
          }
        } else {
          // Se era novo, deletar o registro
          const { error } = await supabase
            .from('tenant_integrations')
            .delete()
            .eq('id', integrationId)
            .eq('tenant_id', tenantId);
            
          if (error) {
            logService.error(MODULE_NAME, `Erro no rollback (delete): ${error.message}`);
          }
        }

        // Log de auditoria do rollback
        await logAccess(
          'rollback',
          'whatsapp_integrations',
          tenantId,
          { 
            action: 'rollback_whatsapp_activation',
            tenant_slug: tenantSlug,
            integration_id: integrationId,
            was_existing: wasExisting
          }
        );
      });
    } catch (rollbackError) {
      logService.error(MODULE_NAME, `Erro crítico no rollback: ${rollbackError}`);
    }
  };

  const handleWhatsAppToggle = async (novoEstado: boolean) => {
    // AIDEV-NOTE: Validação de acesso obrigatória
    if (!hasAccess || !currentTenant) {
      toast({
        title: TOAST_MESSAGES.ACCESS_DENIED.title,
        description: "Você não tem permissão para alterar configurações do WhatsApp.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (novoEstado) {
        // AIDEV-NOTE: Ativação do WhatsApp - NOVO FLUXO REESTRUTURADO
        // 1. Primeiro: criar/atualizar tenant_integrations com status 'pending'
        // 2. Depois: chamar Evolution API
        // 3. Atualizar status final ou fazer rollback
        updateLoadingState('whatsapp', true);
        
        // Desativar verificação automática durante o processo de ativação
        enableStatusPolling(false);
        
        let integrationId: string | null = null;
        let wasExisting = false;
        
        // 1. Verificar se já existe na tabela tenant_integrations uma linha para este tenant
        logService.info(MODULE_NAME, `Verificando configuração existente para tenant ${tenantId}`);
        
        // AIDEV-NOTE: Buscar configuração usando dados da query segura
        const existingConfig = integrations?.find(
          integration => integration.integration_type === 'whatsapp'
        );
        
        // 2. Atualizar ou criar configuração no banco com segurança multi-tenant
        await executeWithAuth(async () => {
          // AIDEV-NOTE: Configurar contexto de tenant obrigatório para RLS
          const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
            p_tenant_id: tenantId
          });
          
          if (contextError) {
            throw new Error(`Erro ao configurar contexto de tenant: ${contextError.message}`);
          }

          if (existingConfig) {
            // Se já existir, apenas ativar com status 'pending'
            wasExisting = true;
            integrationId = existingConfig.id;
            logService.info(MODULE_NAME, `Configuração encontrada, ativando WhatsApp`);
            
            const updateData = {
              tenant_id: tenantId, // AIDEV-NOTE: Explícito para RLS
              is_enabled: true,
              connection_status: 'pending', // Status inicial: pending
              updated_at: new Date().toISOString()
            };

            const { error } = await supabase
              .from('tenant_integrations')
              .update(updateData)
              .eq('id', existingConfig.id)
              .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação dupla de tenant_id
              
            if (error) {
              throw new Error(`Erro ao atualizar configuração WhatsApp: ${error.message}`);
            }
          } else {
            // Se não existir, criar nova linha com status 'pending'
            wasExisting = false;
            logService.info(MODULE_NAME, `Configuração não encontrada, criando nova entrada`);
            
            const insertData = {
              tenant_id: tenantId, // AIDEV-NOTE: Explícito para RLS
              integration_type: 'whatsapp',
              is_active: true,
              environment: 'production', // Status inicial: pending
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              config: {
                api_key: whatsappService.getApiKey(),
                api_url: whatsappService.getApiUrl(),
                environment: 'production',
                instance_name: tenantSlug
              }
            };

            const { data, error } = await supabase
              .from('tenant_integrations')
              .insert(insertData)
              .select('id')
              .single();
              
            if (error) {
              throw new Error(`Erro ao criar configuração WhatsApp: ${error.message}`);
            }
            
            integrationId = data?.id || null;
          }

          // AIDEV-NOTE: Log de auditoria obrigatório
          await logAccess(
            existingConfig ? 'update' : 'create',
            'whatsapp_integrations',
            tenantId,
            { 
              action: 'whatsapp_activation_pending',
              tenant_slug: tenantSlug,
              status: 'pending',
              integration_id: integrationId
            }
          );
        });
        
        // 3. Criar instância no Evolution API (sem conectar)
        logService.info(MODULE_NAME, `Criando instância no Evolution API para tenant ${tenantSlug}`);
        const instanceResult = await whatsappService.manageInstance(tenantSlug, 'create');
        
        if (!instanceResult.success) {
          // ROLLBACK: Reverter registro em caso de erro na Evolution API
          if (integrationId) {
            await rollbackTenantIntegration(integrationId, wasExisting);
          }
          throw new Error(instanceResult.error || 'Falha ao criar instância WhatsApp');
        }
        
        // 4. Atualizar status final para 'disconnected' após sucesso na Evolution API
        if (integrationId) {
          await executeWithAuth(async () => {
            const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
              p_tenant_id: tenantId
            });
            
            if (contextError) {
              logService.error(MODULE_NAME, `Erro ao configurar contexto para atualização final: ${contextError.message}`);
              return;
            }

            const { error } = await supabase
              .from('tenant_integrations')
              .update({
                tenant_id: tenantId,
                connection_status: 'disconnected', // Status final após sucesso
                updated_at: new Date().toISOString()
              })
              .eq('id', integrationId)
              .eq('tenant_id', tenantId);

            if (error) {
              logService.error(MODULE_NAME, `Erro ao atualizar status final: ${error.message}`);
            }
          });
        }
        
        // Atualizar o estado local
        updateCanalState('whatsapp', true);
        setConnectionStatus('disconnected');
        
        // Notificar usuário
        toast({
          title: TOAST_MESSAGES.WHATSAPP_ENABLED.title,
          description: TOAST_MESSAGES.WHATSAPP_ENABLED.description,
          variant: "default"
        });
        
        // Callback opcional
        onToggle?.(true);
      } else {
        // Desativando WhatsApp
        updateCanalState('whatsapp', false);
        setConnectionStatus('disconnected');
        resetConnection();
        
        // Desativar verificação automática ao desativar o WhatsApp
        enableStatusPolling(false);
        
        // AIDEV-NOTE: Atualizar no Supabase - desativar WhatsApp usando dados da query segura
        const existingConfig = integrations?.find(
          integration => integration.integration_type === 'whatsapp'
        );
        
        if (existingConfig) {
          await executeWithAuth(async () => {
            // AIDEV-NOTE: Configurar contexto de tenant obrigatório para RLS
            const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
              p_tenant_id: tenantId
            });
            
            if (contextError) {
              throw new Error(`Erro ao configurar contexto de tenant: ${contextError.message}`);
            }

            const updateData = {
              tenant_id: tenantId, // AIDEV-NOTE: Explícito para RLS
              is_enabled: false,
              updated_at: new Date().toISOString()
            };

            const { error } = await supabase
              .from('tenant_integrations')
              .update(updateData)
              .eq('id', existingConfig.id)
              .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação dupla de tenant_id
              
            if (error) {
              throw new Error(`Erro ao desativar configuração WhatsApp: ${error.message}`);
            }

            // AIDEV-NOTE: Log de auditoria obrigatório
            await logAccess(
              'update',
              'whatsapp_integrations',
              tenantId,
              { 
                action: 'disable_whatsapp',
                tenant_slug: tenantSlug,
                is_enabled: false
              }
            );
          });
            
          // Tentar excluir a instância diretamente se tivermos o nome
          if (existingConfig.instance_name) {
            const instanceName = existingConfig.instance_name;
            logService.info(MODULE_NAME, `Excluindo diretamente a instância: ${instanceName}`);
            try {
              // Primeiro desconectar (para evitar que fique apenas desconectada)
              await whatsappService.disconnectInstance(instanceName);
              // Depois excluir explicitamente
              await whatsappService.deleteInstance(instanceName);
            } catch (instanceError) {
              logService.error(MODULE_NAME, `Erro ao excluir diretamente a instância: ${instanceName}`, instanceError);
              // Continuar mesmo com erro
            }
          }
        }
        
        // Desconectar/excluir no Evolution API via manageInstance
        await whatsappService.manageInstance(tenantSlug, 'disconnect');
        
        // Notificar o usuário
        toast({
          title: TOAST_MESSAGES.WHATSAPP_DEACTIVATED.title,
          description: TOAST_MESSAGES.WHATSAPP_DEACTIVATED.description,
        });
        
        // Callback para o pai
        if (onToggle) {
          onToggle('whatsapp', false);
        }
      }
    } catch (error) {
      logService.error(MODULE_NAME, `Erro na ativação WhatsApp: ${error}`);
      
      // Reverter estado local em caso de erro
      updateCanalState('whatsapp', false);
      setConnectionStatus('disconnected');
      
      // Resetar status de loading em caso de erro
      updateLoadingState('whatsapp', false);
      
      // Feedback de erro para o usuário
      toast({
        title: TOAST_MESSAGES.WHATSAPP_ERROR.title,
        description: TOAST_MESSAGES.WHATSAPP_ERROR.description,
        variant: "destructive"
      });
    } finally {
      updateLoadingState('whatsapp', false);
      enableStatusPolling(true);
    }
  };

  return {
    handleWhatsAppToggle
  };
}