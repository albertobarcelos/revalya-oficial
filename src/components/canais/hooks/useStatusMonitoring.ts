// AIDEV-NOTE: Hook para monitoramento de status do WhatsApp
// Responsabilidade única: verificação periódica de status de conexão

import { useEffect } from 'react';
import { whatsappService } from '@/services/whatsappService';
import { logService } from '@/services/logService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { executeWithAuth, logAccess } from '@/utils/authUtils';
import { MODULE_NAME, TIMEOUTS } from '../constants';
import { ConnectionStatus, TenantIntegration } from '../types';

interface UseStatusMonitoringProps {
  canaisAtivos: { whatsapp: boolean };
  statusPollingEnabled: boolean;
  qrDialogOpen: boolean;
  connectionStatus: ConnectionStatus;
  tenantSlug: string;
  tenantId: string;
  integrations: TenantIntegration[];
  setConnectionStatus: (status: ConnectionStatus) => void;
  setQrCode: (qrCode: string | null) => void;
  setQrDialogOpen: (open: boolean) => void;
  updateCanalState: (canal: 'whatsapp', isActive: boolean) => void;
  enableStatusPolling: (enable: boolean) => void;
}

export function useStatusMonitoring({
  canaisAtivos,
  statusPollingEnabled,
  qrDialogOpen,
  connectionStatus,
  tenantSlug,
  tenantId,
  integrations,
  setConnectionStatus,
  setQrCode,
  setQrDialogOpen,
  updateCanalState,
  enableStatusPolling
}: UseStatusMonitoringProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Só executar se o WhatsApp estiver ativo E a verificação automática estiver habilitada
    // OU se o dialog de QR estiver aberto
    if (((!canaisAtivos.whatsapp || !statusPollingEnabled) && !qrDialogOpen) || !tenantSlug || !tenantId) return;
    
    let checkCount = 0;
    let lastStatus: string = connectionStatus;
    
    logService.info(MODULE_NAME, `Iniciando monitoramento de status do WhatsApp. Status atual: ${connectionStatus}`);
    
    // Função de verificação de status para ambos os casos (monitoramento contínuo e QR)
    const checkStatus = async () => {
      try {
        // Obter nome da instância
        const currentInstance = await whatsappService.getFullInstanceName(tenantSlug);
        if (!currentInstance) {
          logService.warn(MODULE_NAME, 'Nome da instância não encontrado, não é possível verificar status');
          return;
        }
        
        // Verificar status da instância
        const status = await whatsappService.checkInstanceStatus(currentInstance);
        logService.info(MODULE_NAME, `Status verificado: ${status} (verificação #${checkCount + 1})`);
        
        // Se o status mudou, atualizar
        if (status !== lastStatus) {
          logService.info(MODULE_NAME, `Status mudou de ${lastStatus} para ${status}`);
          lastStatus = status;
          
          // Mapear status do Evolution para nossos status internos
          let mappedStatus: ConnectionStatus = status as ConnectionStatus;
          
          // Se o status for "connecting", mas não temos QR code aberto,
          // isso significa que o sistema está pronto para gerar QR, mas ainda não conectou
          if (status === 'connecting' && !qrDialogOpen) {
            mappedStatus = 'disconnected';
          }
          
          setConnectionStatus(mappedStatus);
          
          // Se conectou com sucesso
          if (status === 'connected') {
            logService.info(MODULE_NAME, 'WhatsApp conectado com sucesso!');
            
            // Atualizar no banco de dados com segurança multi-tenant
            const whatsappConfig = integrations?.find(
              integration => integration.integration_type === 'whatsapp'
            );
            
            if (whatsappConfig) {
              await executeWithAuth(async () => {
                // AIDEV-NOTE: Configurar contexto de tenant obrigatório para RLS
                const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
                  p_tenant_id: tenantId
                });
                
                if (contextError) {
                  logService.error(MODULE_NAME, `Erro ao configurar contexto de tenant: ${contextError.message}`);
                  return;
                }

                const updateData = {
                  tenant_id: tenantId, // AIDEV-NOTE: Explícito para RLS
                  connection_status: 'connected',
                  is_active: true,
                  updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                  .from('tenant_integrations')
                  .update(updateData)
                  .eq('id', whatsappConfig.id)
                  .eq('tenant_id', tenantId);
                  
                if (error) {
                  logService.error(MODULE_NAME, `Erro ao atualizar status de conexão: ${error.message}`);
                  return;
                }

                // AIDEV-NOTE: Log de auditoria obrigatório
                await logAccess(
                  'update',
                  'whatsapp_integrations',
                  tenantId,
                  { 
                    action: 'whatsapp_connected',
                    connection_status: 'connected',
                    is_active: true
                  }
                );
              });
            }
            
            // AIDEV-NOTE: Atualizar estado local do canal para refletir na UI
            updateCanalState('whatsapp', true);
            
            // Fechar dialog de QR se estiver aberto
            if (qrDialogOpen) {
              setQrDialogOpen(false);
              setQrCode(null);
            }
            
            // Notificar usuário
            toast({
              title: "WhatsApp conectado!",
              description: "Sua integração foi configurada com sucesso.",
            });
            
            // Parar verificação automática após conectar
            enableStatusPolling(false);
            return; // Sair do loop
          }
          
          // Se desconectou
          if (status === 'disconnected' && lastStatus === 'connected') {
            logService.warn(MODULE_NAME, 'WhatsApp foi desconectado');
            
            // Atualizar no banco de dados com segurança multi-tenant
            const whatsappConfig = integrations?.find(
              integration => integration.integration_type === 'whatsapp'
            );
            
            if (whatsappConfig) {
              await executeWithAuth(async () => {
                // AIDEV-NOTE: Configurar contexto de tenant obrigatório para RLS
                const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
                  p_tenant_id: tenantId
                });
                
                if (contextError) {
                  logService.error(MODULE_NAME, `Erro ao configurar contexto de tenant: ${contextError.message}`);
                  return;
                }

                const updateData = {
                  tenant_id: tenantId, // AIDEV-NOTE: Explícito para RLS
                  connection_status: 'disconnected',
                  is_active: false,
                  updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                  .from('tenant_integrations')
                  .update(updateData)
                  .eq('id', whatsappConfig.id)
                  .eq('tenant_id', tenantId);
                  
                if (error) {
                  logService.error(MODULE_NAME, `Erro ao atualizar status de desconexão: ${error.message}`);
                  return;
                }

                // AIDEV-NOTE: Log de auditoria obrigatório
                await logAccess(
                  'update',
                  'whatsapp_integrations',
                  tenantId,
                  { 
                    action: 'whatsapp_disconnected',
                    connection_status: 'disconnected',
                    is_active: false
                  }
                );
              });
            }
            
            // AIDEV-NOTE: Atualizar estado local do canal para refletir na UI
            updateCanalState('whatsapp', false);
            
            toast({
              title: "WhatsApp desconectado",
              description: "Sua conexão foi perdida. Reconecte quando necessário.",
              variant: "destructive",
            });
          }
        }
        
        checkCount++;
        
        // Limite de verificações para evitar loop infinito
        if (checkCount >= TIMEOUTS.MAX_STATUS_CHECKS) {
          logService.warn(MODULE_NAME, `Limite de verificações atingido (${TIMEOUTS.MAX_STATUS_CHECKS}), parando monitoramento`);
          enableStatusPolling(false);
          
          if (qrDialogOpen && status !== 'connected') {
            toast({
              title: "Timeout na conexão",
              description: "O QR Code expirou. Tente gerar um novo.",
              variant: "destructive",
            });
            setQrDialogOpen(false);
            setQrCode(null);
          }
        }
        
      } catch (error) {
        logService.error(MODULE_NAME, 'Erro ao verificar status:', error);
        
        // Em caso de erro, assumir que está desconectado
        if (lastStatus !== 'disconnected') {
          setConnectionStatus('disconnected');
          lastStatus = 'disconnected';
        }
      }
    };
    
    // Verificação inicial
    checkStatus();
    
    // Configurar intervalo de verificação
    const interval = setInterval(checkStatus, TIMEOUTS.STATUS_CHECK_INTERVAL);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      logService.info(MODULE_NAME, 'Monitoramento de status interrompido');
    };
  }, [canaisAtivos.whatsapp, statusPollingEnabled, qrDialogOpen, tenantSlug, tenantId, connectionStatus]);

  return null; // Este hook não retorna JSX, apenas gerencia efeitos
}