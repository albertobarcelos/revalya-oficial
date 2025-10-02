// AIDEV-NOTE: Hook para gerenciar ativação/desativação do WhatsApp
// Responsabilidade única: lógica de toggle do canal WhatsApp

import { whatsappService } from '@/services/whatsappService';
import { logService } from '@/services/logService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
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
        // Ativando Whatsapp - QRCode - mas sem conectar imediatamente
        updateLoadingState('whatsapp', true);
        
        // Desativar verificação automática durante o processo de ativação
        enableStatusPolling(false);
        
        // 1. Verificar se já existe na tabela tenant_integrations uma linha para este tenant
        logService.info(MODULE_NAME, `Verificando configuração existente para tenant ${tenantId}`);
        
        // AIDEV-NOTE: Buscar configuração usando dados da query segura
        const existingConfig = integrations?.find(
          integration => integration.integration_type === 'whatsapp'
        );
        
        // 2. Se existir, atualizar status para ativo
        if (existingConfig) {
          logService.info(MODULE_NAME, `Configuração encontrada, atualizando status para ativo`);
          await supabase
            .from('tenant_integrations')
            .update({
              is_enabled: true,
              connection_status: 'disconnected', // Status inicial: desconectado
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConfig.id)
            .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação dupla de tenant_id
        } else {
          // Se não existir, criar nova linha
          logService.info(MODULE_NAME, `Configuração não encontrada, criando nova entrada`);
          await supabase
            .from('tenant_integrations')
            .insert({
              tenant_id: tenantId,
              integration_type: 'whatsapp',
              is_enabled: true,
              connection_status: 'disconnected', // Status inicial: desconectado
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              api_url: whatsappService.getApiUrl(),
              api_key: whatsappService.getApiKey()
            });
        }
        
        // 3. Criar instância no Evolution API (sem conectar)
        logService.info(MODULE_NAME, `Criando instância no Evolution API para tenant ${tenantSlug}`);
        const instanceResult = await whatsappService.manageInstance(tenantSlug, 'create');
        
        if (!instanceResult.success) {
          throw new Error(instanceResult.error || 'Falha ao criar instância WhatsApp');
        }
        
        // Atualizar o estado local
        updateCanalState('whatsapp', true);
        setConnectionStatus('disconnected');
        
        // Manter verificação automática desativada após ativar
        enableStatusPolling(false);
        
        // Notificar usuário
        toast({
          title: TOAST_MESSAGES.WHATSAPP_ACTIVATED.title,
          description: TOAST_MESSAGES.WHATSAPP_ACTIVATED.description,
        });
        
        // Callback para o pai
        if (onToggle) {
          onToggle('whatsapp', true);
        }
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
          await supabase
            .from('tenant_integrations')
            .update({
              is_enabled: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConfig.id)
            .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação dupla de tenant_id
            
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
      console.error("Erro ao alterar status do WhatsApp:", error);
      
      // Resetar status de loading em caso de erro
      updateLoadingState('whatsapp', false);
      
      // Feedback de erro para o usuário
      toast({
        title: TOAST_MESSAGES.ERROR_GENERIC.title,
        description: error instanceof Error ? error.message : TOAST_MESSAGES.ERROR_GENERIC.description,
        variant: "destructive",
      });
    }
  };

  return {
    handleWhatsAppToggle
  };
}