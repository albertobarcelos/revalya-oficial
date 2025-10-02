// AIDEV-NOTE: Hook modular para gerenciar conexão WhatsApp com suporte multi-tenant
// Responsabilidade única: lógica de conexão, QR Code e status do WhatsApp

import { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { whatsappService } from '@/services/whatsappService';
import { logService } from '@/services/logService';
import { useToast } from '@/components/ui/use-toast';
import { MODULE_NAME, TOAST_MESSAGES } from '../constants';

interface UseWhatsAppConnectionProps {
  tenantSlug: string;
  tenantId: string;
  isAuthorized: boolean;
  tenantData: any;
  integrations: any[];
  updateCanalState?: (canal: 'whatsapp', isActive: boolean) => void;
}

export function useWhatsAppConnection(props?: UseWhatsAppConnectionProps) {
  const { toast } = useToast();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [statusPollingEnabled, setStatusPollingEnabled] = useState(false);

  // AIDEV-NOTE: Verificar status inicial do WhatsApp quando o componente é montado
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!props?.tenantSlug || !props?.isAuthorized) return;

      try {
        // Buscar configuração existente do tenant
        const existingConfig = props.integrations?.find(
          (integration: any) => integration.integration_type === 'whatsapp'
        );

        if (!existingConfig || !existingConfig.is_active) {
          setConnectionStatus('disconnected');
          return;
        }

        // Configurar credenciais do serviço
        const apiUrl = existingConfig?.api_url || import.meta.env.VITE_EVOLUTION_API_URL || '';
        const apiKey = existingConfig?.api_key || import.meta.env.VITE_EVOLUTION_API_KEY || '';
        
        whatsappService.setCredentials(apiUrl, apiKey);

        // Verificar se existe uma instância conectada
        const instanceName = await whatsappService.getFullInstanceName(props.tenantSlug);
        if (instanceName) {
          const status = await whatsappService.checkInstanceStatus(instanceName);
          logService.info(MODULE_NAME, `Status inicial verificado: ${status}`);
          
          // Mapear status para nossos estados internos
          if (status === 'connected') {
            setConnectionStatus('connected');
            // AIDEV-NOTE: Atualizar estado do canal quando conectado inicialmente
            if (props.updateCanalState) {
              props.updateCanalState('whatsapp', true);
            }
          } else if (status === 'connecting') {
            setConnectionStatus('connecting');
          } else {
            setConnectionStatus('disconnected');
          }
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        logService.error(MODULE_NAME, 'Erro ao verificar status inicial do WhatsApp:', error);
        setConnectionStatus('disconnected');
      }
    };

    checkInitialStatus();
  }, [props?.tenantSlug, props?.isAuthorized, props?.integrations]);

  const enableStatusPolling = (enable = true) => {
    logService.info(MODULE_NAME, `${enable ? 'Ativando' : 'Desativando'} verificação automática de status`);
    setStatusPollingEnabled(enable);
  };

  // AIDEV-NOTE: Função para conectar WhatsApp com suporte multi-tenant
  const handleConnectWhatsApp = async () => {
    // AIDEV-NOTE: Verificar se temos os dados necessários para multi-tenant
    if (!props) {
      logService.error(MODULE_NAME, "Dados do tenant não fornecidos para conexão WhatsApp");
      toast({
        title: "Erro",
        description: "Dados do tenant não disponíveis. Recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    const { tenantSlug, isAuthorized, tenantData, integrations } = props;

    // AIDEV-NOTE: Validação de acesso multi-tenant
    if (!isAuthorized) {
      logService.warn(MODULE_NAME, "Tentativa de acesso não autorizado ao WhatsApp");
      toast({
        title: "Acesso Negado",
        description: TOAST_MESSAGES.ACCESS_DENIED,
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Abrir diálogo e iniciar processo de conexão
    setQrDialogOpen(true);
    setIsLoading(true);
    enableStatusPolling(true);

    try {
      // AIDEV-NOTE: Buscar configuração existente do tenant
      const existingConfig = integrations?.find(
        (integration: any) => integration.integration_type === 'whatsapp'
      );

      // AIDEV-NOTE: Configurar credenciais do serviço com dados do tenant
      const apiUrl = existingConfig?.api_url || import.meta.env.VITE_EVOLUTION_API_URL || '';
      const apiKey = existingConfig?.api_key || import.meta.env.VITE_EVOLUTION_API_KEY || '';
      
      whatsappService.setCredentials(apiUrl, apiKey);

      // AIDEV-NOTE: Gerar QR Code com contexto multi-tenant
      const result = await whatsappService.manageInstance(tenantSlug, 'connect');
      
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        setConnectionStatus('connecting');
        
        logService.info(MODULE_NAME, `QR Code gerado com sucesso para tenant: ${tenantSlug}`);
        
        toast({
          title: "QR Code Gerado",
          description: TOAST_MESSAGES.QR_GENERATED,
        });
      } else if (result.success && !result.qrCode && result.error === 'WhatsApp já está conectado') {
        // Instância já conectada - não mostrar erro, apenas informar
        setConnectionStatus('connected');
        setQrDialogOpen(false);
        
        toast({
          title: "WhatsApp Conectado",
          description: "Seu WhatsApp já está conectado e funcionando!",
        });
      } else {
        throw new Error(result.error || 'Falha ao gerar QR Code');
      }
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao gerar QR Code:", error);
      
      // AIDEV-NOTE: Log detalhado do erro para debug
      console.error('[WhatsApp Connection] Erro detalhado:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorStack: error instanceof Error ? error.stack : undefined,
        tenantSlug: props?.tenantSlug,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar o QR Code. Tente desativar e ativar novamente.",
        variant: "destructive",
      });
      
      // Fechar o diálogo em caso de erro
      setQrDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConnection = () => {
    setQrDialogOpen(false);
    setQrCode(null);
    setConnectionStatus('disconnected');
    setIsLoading(false);
    enableStatusPolling(false);
  };

  return {
    qrDialogOpen,
    qrCode,
    connectionStatus,
    isLoading,
    statusPollingEnabled,
    setQrDialogOpen,
    setQrCode,
    setConnectionStatus,
    setIsLoading,
    enableStatusPolling,
    handleConnectWhatsApp,
    resetConnection
  };
}