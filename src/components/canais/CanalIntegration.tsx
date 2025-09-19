import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsappService";
import { supabase } from '@/lib/supabase';
import { logService } from "@/services/logService";
import { QRCodeSVG } from "qrcode.react";
import { AlertIcon } from "@/components/ui/alert-icon";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Phone, MessageSquare, Mail, MessageCircle } from "lucide-react";

const MODULE_NAME = 'CanalIntegration';

interface CanalIntegrationProps {
  tenantId: string;
  tenantSlug: string;
  onToggle?: (canal: string, enabled: boolean) => void;
}

// Adicionar mais estados possíveis de conexão
type ConnectionStatus = 'disconnected' | 'connected' | 'loading' | 'scanning' | 'connecting' | 'syncing' | 'paired' | 'timeout' | 'conflict';

export function CanalIntegration({ tenantId, tenantSlug, onToggle }: CanalIntegrationProps) {
  const { toast } = useToast();
  
  // Estado para os canais
  const [canaisAtivos, setCanaisAtivos] = useState<Record<string, boolean>>({
    whatsapp: false,
    sms: false,
    email: false,
    twilio: false,
  });
  
  // Estados específicos para WhatsApp
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCanais, setLoadingCanais] = useState<Record<string, boolean>>({
    whatsapp: false,
    sms: false,
    email: false,
    twilio: false,
  });
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  // Limitar a verificação automática de status para não interferir no fluxo de ativação
  // Adicionando esta variável para controlar quando o polling deve ocorrer
  const [statusPollingEnabled, setStatusPollingEnabled] = useState(false);
  
  // Função para controlar manualmente quando iniciar/parar o polling de status
  const enableStatusPolling = (enable = true) => {
    logService.info(MODULE_NAME, `${enable ? 'Ativando' : 'Desativando'} verificação automática de status`);
    setStatusPollingEnabled(enable);
  };
  
  // Função para carregar o estado dos canais
  const carregarEstadoCanais = async () => {
    if (!tenantId) {
      logService.warn(MODULE_NAME, 'TenantId não fornecido, não é possível carregar estado dos canais');
      return;
    }
    
    try {
      logService.info(MODULE_NAME, `Carregando estado inicial dos canais para tenant ${tenantId}`);
      
      // Desativar verificação automática durante o carregamento inicial
      enableStatusPolling(false);
      
      // Verificar WhatsApp
      const { data: whatsappConfig, error } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'whatsapp')
        .single();
        
      if (error) {
        logService.info(MODULE_NAME, `Nenhuma configuração WhatsApp encontrada para tenant ${tenantId}`);
      }
        
      if (whatsappConfig && whatsappConfig.is_enabled) {
        logService.info(MODULE_NAME, `WhatsApp ativo para tenant ${tenantId}, instância: ${whatsappConfig.instance_name}`);
        setCanaisAtivos(prev => ({ ...prev, whatsapp: true }));
        
        // Configurar as credenciais do serviço de WhatsApp se disponíveis
        if (whatsappConfig.api_url && whatsappConfig.api_key) {
          logService.info(MODULE_NAME, 'Configurando credenciais WhatsApp salvas no banco de dados');
          whatsappService.setCredentials(whatsappConfig.api_url, whatsappConfig.api_key);
        }
        
        // Verificar status da conexão
        if (whatsappConfig.instance_name) {
          try {
            logService.info(MODULE_NAME, `Verificando status da conexão para instância: ${whatsappConfig.instance_name}`);
            const status = await whatsappService.checkInstanceStatus(whatsappConfig.instance_name);
            logService.info(MODULE_NAME, `Status da conexão: ${status}`);
            
            // Se o status for "connecting", mas não temos QR code aberto,
            // isso significa que o sistema está pronto para gerar QR, mas ainda não conectou
            if (status === 'connecting') {
              logService.info(MODULE_NAME, 'Status "connecting" do Evolution tratado como "disconnected" na interface');
              setConnectionStatus('disconnected');
            } else {
              setConnectionStatus(status as ConnectionStatus);
            }
          } catch (error) {
            logService.error(MODULE_NAME, 'Erro ao verificar status do WhatsApp:', error);
            setConnectionStatus('disconnected');
          }
        }
      } else {
        logService.info(MODULE_NAME, `WhatsApp não está ativo para tenant ${tenantId}`);
        setCanaisAtivos(prev => ({ ...prev, whatsapp: false }));
        setConnectionStatus('disconnected');
      }
      
      // Futuramente, verificar outros canais aqui
      
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao carregar estado dos canais:', error);
    }
  };
  
  // Carregar estado inicial dos canais
  useEffect(() => {
    carregarEstadoCanais();
  }, [tenantId]);
  
  const handleCardClick = async (canal: keyof typeof canaisAtivos) => {
    // Apenas o card do WhatsApp tem ação especial
    if (canal === 'whatsapp' && canaisAtivos.whatsapp) {
      // Em vez de abrir o QR diretamente, verificar o status da conexão
      if (connectionStatus === 'disconnected') {
        // Se estiver desconectado, mostrar o botão de conectar, sem abrir modal
        return;
      } else if (connectionStatus === 'connected') {
        // Se já estiver conectado, podemos mostrar informações da conexão
        toast({
          title: "WhatsApp conectado",
          description: "Seu WhatsApp já está conectado e pronto para uso.",
        });
      } else if (['connecting', 'scanning', 'syncing', 'paired'].includes(connectionStatus)) {
        // Em outros estados (connecting, scanning, etc.), abrimos o modal para mostrar o progresso
        setQrDialogOpen(true);
      }
    }
  };

  const handleToggle = async (canal: keyof typeof canaisAtivos) => {
    // Não permitir ativar canais "em breve"
    if (canal !== 'whatsapp') {
      toast({
        title: "Funcionalidade em breve",
        description: `O canal ${canal.toUpperCase()} estará disponível em breve.`,
        variant: "default",
      });
      return;
    }
    
    // Se já estiver carregando este canal específico, não permitir múltiplos cliques
    if (loadingCanais[canal]) {
      return;
    }
    
    // Toggle do estado
    const novoEstado = !canaisAtivos[canal];
    
    // Configurar um timeout de segurança para resetar o estado de loading
    // em caso de qualquer erro que não seja capturado
    const safetyTimeout = setTimeout(() => {
      setLoadingCanais(prev => ({ ...prev, [canal]: false }));
    }, 15000); // 15 segundos como timeout máximo
    
    if (canal === 'whatsapp') {
      // Feedback visual imediato para o usuário
      setLoadingCanais(prev => ({ ...prev, [canal]: true }));
      
      toast({
        title: novoEstado ? "Ativando WhatsApp..." : "Desativando WhatsApp...",
        description: "Por favor, aguarde enquanto processamos sua solicitação.",
      });
      
      await handleWhatsAppToggle(novoEstado);
      
      // Remover estado de loading do canal específico
      setLoadingCanais(prev => ({ ...prev, [canal]: false }));
      // Limpar o timeout de segurança
      clearTimeout(safetyTimeout);
    } else {
      // Para outros canais, apenas atualizar o estado local
      setLoadingCanais(prev => ({ ...prev, [canal]: true }));
      setCanaisAtivos(prev => ({ ...prev, [canal]: novoEstado }));
      
      if (onToggle) {
        onToggle(canal, novoEstado);
      }
      
      // Simular delay para mostrar loading (remover na implementação real)
      setTimeout(() => {
        setLoadingCanais(prev => ({ ...prev, [canal]: false }));
        // Limpar o timeout de segurança
        clearTimeout(safetyTimeout);
      }, 1000);
    }
  };
  
  // Nova função para iniciar a conexão via QR Code
  const handleConnectWhatsApp = async () => {
    try {
      // Abrir o diálogo antes de iniciar o carregamento
      setQrDialogOpen(true);
      
      // Iniciar o carregamento
      setIsLoading(true);
      setQrCode(null);
      
      // Ativar verificação automática durante o processo de conexão
      enableStatusPolling(true);
      
      logService.info(MODULE_NAME, `Gerando QR Code para o tenant: ${tenantSlug}`);
      
      // Buscar configuração do Supabase
      const { data: existingConfig } = await supabase
        .from('tenant_integrations')
        .select('instance_name, api_url, api_key')
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'whatsapp')
        .single();
      
      // Configurar as credenciais do serviço se disponíveis
      if (existingConfig && existingConfig.api_url && existingConfig.api_key) {
        logService.info(MODULE_NAME, 'Configurando credenciais WhatsApp antes de gerar QR Code');
        whatsappService.setCredentials(existingConfig.api_url, existingConfig.api_key);
      }
      
      // Usar a ação 'connect' do manageInstance para gerar o QR code
      logService.info(MODULE_NAME, `Gerando QR Code para o tenant: ${tenantSlug}`);
      const result = await whatsappService.manageInstance(tenantSlug, 'connect');
      
      if (!result.success || !result.qrCode) {
        logService.error(MODULE_NAME, 'Erro ao gerar QR Code:', result.error);
        throw new Error(result.error || 'Não foi possível gerar o QR Code');
      }
      
      // Log para debug do formato do QR code
      const qrCodePreview = result.qrCode.substring(0, Math.min(result.qrCode.length, 100));
      logService.info(MODULE_NAME, `QR Code recebido (primeiros 100 caracteres): ${qrCodePreview}...`);
      logService.info(MODULE_NAME, `Tamanho do QR Code: ${result.qrCode.length} caracteres`);
      
      // Verificar o formato do QR Code recebido
      if (result.qrCode.startsWith('data:image')) {
        logService.info(MODULE_NAME, 'QR Code recebido no formato data:image/png;base64');
      } else if (result.qrCode.includes('wa.me/')) {
        logService.info(MODULE_NAME, 'QR Code recebido no formato wa.me link');
      } else {
        logService.info(MODULE_NAME, 'QR Code recebido em formato de texto');
      }
      
      // Se o QR Code for muito grande e em formato base64, não truncá-lo
      if (result.qrCode.length > 2000 && result.qrCode.startsWith('data:image')) {
        logService.warn(MODULE_NAME, `QR Code muito grande (${result.qrCode.length} caracteres), mas será mostrado na íntegra`);
        // Não truncar o QR code
      }
      
      setQrCode(result.qrCode);
      
      // Mudar o status para mostrar que estamos aguardando escaneamento do QR
      // (mas ainda não foi escaneado)
      setConnectionStatus('connecting');
      
      logService.info(MODULE_NAME, 'QR Code gerado com sucesso, aguardando escaneamento');
      
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao gerar QR Code:", error);
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
  
  const handleWhatsAppToggle = async (novoEstado: boolean) => {
    try {
      if (novoEstado) {
        // Ativando WhatsApp - mas sem conectar imediatamente
        setLoadingCanais(prev => ({ ...prev, whatsapp: true }));
        
        // Desativar verificação automática durante o processo de ativação
        enableStatusPolling(false);
        
        // 1. Verificar se já existe na tabela tenant_integrations uma linha para este tenant
        logService.info(MODULE_NAME, `Verificando configuração existente para tenant ${tenantId}`);
        const { data: existingConfig, error } = await supabase
          .from('tenant_integrations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'whatsapp')
          .single();
        
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
            .eq('id', existingConfig.id);
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
        setCanaisAtivos(prev => ({ ...prev, whatsapp: true }));
        setConnectionStatus('disconnected');
        
        // Manter verificação automática desativada após ativar
        // para que o usuário possa ver e clicar no botão "Conectar WhatsApp"
        enableStatusPolling(false);
        
        // Notificar usuário
        toast({
          title: "WhatsApp ativado",
          description: "Clique em \"Conectar WhatsApp\" para escanear o QR Code e finalizar a configuração.",
        });
        
        // Callback para o pai
        if (onToggle) {
          onToggle('whatsapp', true);
        }
      } else {
        // Desativando WhatsApp
        setCanaisAtivos(prev => ({ ...prev, whatsapp: false }));
        setConnectionStatus('disconnected');
        setQrCode(null);
        
        // Desativar verificação automática ao desativar o WhatsApp
        enableStatusPolling(false);
        
        // Atualizar no Supabase - desativar WhatsApp
        const { data: existingConfig } = await supabase
          .from('tenant_integrations')
          .select('id, instance_name')
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'whatsapp')
          .single();
        
        if (existingConfig) {
          await supabase
            .from('tenant_integrations')
            .update({
              is_enabled: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConfig.id);
            
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
          title: "WhatsApp desativado",
          description: "Sua integração com WhatsApp foi desativada com sucesso.",
        });
        
        // Callback para o pai
        if (onToggle) {
          onToggle('whatsapp', false);
        }
      }
    } catch (error) {
      console.error("Erro ao alterar status do WhatsApp:", error);
      
      // Resetar status de loading em caso de erro
      setLoadingCanais(prev => ({ ...prev, whatsapp: false }));
      
      // Feedback de erro para o usuário
      toast({
        title: "Erro ao processar solicitação",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      
      // Atualizar o estado com base no banco de dados
      await carregarEstadoCanais();
    }
  };
  
  // Verificação periódica de status e monitoramento de conexão
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
        
        // Verificação normal do status
        const currentStatus = await whatsappService.checkInstanceStatus(currentInstance);
        
        // Se o status retornar "connecting" e não temos QR code exibido/escaneado,
        // precisamos tratar de forma especial
        if (currentStatus === 'connecting' && !qrCode && !qrDialogOpen) {
          // Nesse caso, o sistema está pronto para gerar o QR code, mas ainda não conectou
          // Não atualizamos o status para permitir que o botão "Conectar WhatsApp" apareça
          logService.info(MODULE_NAME, 'Status "connecting" ignorado pois o QR code ainda não foi gerado');
          return;
        }
        
        // Se o diálogo QR estiver aberto, fazer verificação mais detalhada
        if (qrDialogOpen) {
          checkCount++;
          
          // A cada 3 verificações, fazer uma verificação profunda usando getInstanceInfo
          if (checkCount % 3 === 0) {
            try {
              logService.info(MODULE_NAME, `Realizando verificação profunda do status (${checkCount})`);
              const instanceDetails = await whatsappService.getInstanceInfo(currentInstance);
              
              if (instanceDetails && instanceDetails.instance) {
                const state = instanceDetails.instance.state || 
                              instanceDetails.instance.status || 
                              (instanceDetails.instance.connected ? 'connected' : 'disconnected');
                                
                logService.info(MODULE_NAME, `Estado detalhado da instância: ${state}`);
                
                // Atualizar QR Code se relevante
                if (instanceDetails.instance.qrcode && instanceDetails.instance.qrcode !== qrCode) {
                  setQrCode(instanceDetails.instance.qrcode);
                  logService.info(MODULE_NAME, 'QR Code atualizado da verificação profunda');
                }
                
                // Se o estado mudou significativamente, usar essa informação diretamente
                if (state !== connectionStatus && ['connected', 'paired', 'syncing'].includes(state)) {
                  logService.info(MODULE_NAME, `Atualizando estado diretamente da verificação profunda: ${state}`);
                  setConnectionStatus(state as ConnectionStatus);
                }
              }
            } catch (error) {
              logService.error(MODULE_NAME, 'Erro na verificação profunda:', error);
            }
          }
        }
        
        // Verificar se houve alteração de status
        if (currentStatus !== lastStatus) {
          logService.info(MODULE_NAME, `Mudança de status detectada: ${lastStatus} -> ${currentStatus}`);
          
          // Verificar se o QR Code foi escaneado
          if ((lastStatus === 'disconnected' || !lastStatus) && 
              ['connecting', 'paired', 'syncing'].includes(currentStatus)) {
            logService.info(MODULE_NAME, 'QR Code foi escaneado! Atualizando para status de escaneamento');
            setConnectionStatus('scanning');
            toast({
              title: 'QR Code escaneado',
              description: 'Conectando ao WhatsApp...',
              variant: 'default'
            });
          }
          // Verificar se a conexão foi estabelecida
          else if (['scanning', 'connecting', 'paired', 'syncing'].includes(lastStatus) && 
                    (currentStatus === 'connected' || currentStatus === 'open')) {
            logService.info(MODULE_NAME, 'Conexão estabelecida com sucesso!');
            setConnectionStatus('connected');
            
            // Atualizar no banco de dados
            const { data: existingConfig } = await supabase
              .from('tenant_integrations')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('integration_type', 'whatsapp')
              .single();
            
            if (existingConfig) {
              logService.info(MODULE_NAME, 'Atualizando status de instância no banco de dados para connected');
              await supabase
                .from('tenant_integrations')
                .update({ 
                  connection_status: 'connected',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingConfig.id);
            }
            
            // Fechar dialog e limpar QR code
            setQrCode('');
            setQrDialogOpen(false);
            
            toast({
              title: 'Conectado com sucesso',
              description: 'Seu WhatsApp está conectado e pronto para uso!',
              variant: 'default'
            });
          }
          // Se desconectou
          else if (currentStatus === 'disconnected' && (lastStatus === 'connected' || lastStatus === 'paired')) {
            logService.warn(MODULE_NAME, 'WhatsApp foi desconectado!');
            setConnectionStatus('disconnected');
            
            // Atualizar o estado no banco de dados
            const { data: existingConfig } = await supabase
              .from('tenant_integrations')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('integration_type', 'whatsapp')
              .single();
            
            if (existingConfig) {
              logService.info(MODULE_NAME, 'Atualizando status de instância no banco de dados para disconnected');
              await supabase
                .from('tenant_integrations')
                .update({ 
                  connection_status: 'disconnected',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingConfig.id);
            }
            
            toast({
              title: "WhatsApp Desconectado",
              description: "Sua conexão com WhatsApp foi perdida. Reconecte para continuar enviando mensagens.",
              variant: "destructive",
              action: (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleConnectWhatsApp();
                  }}
                  className="bg-white"
                >
                  Reconectar
                </Button>
              )
            });
          }
          // Verificar outros estados de erro
          else if (currentStatus === 'timeout') {
            setConnectionStatus('timeout');
            toast({
              title: 'Tempo esgotado',
              description: 'O tempo para escanear o QR Code expirou. Tente novamente.',
              variant: 'destructive'
            });
          }
          else if (currentStatus === 'conflict') {
            setConnectionStatus('conflict');
            toast({
              title: 'Conflito detectado',
              description: 'Esta conta WhatsApp já está sendo usada em outro dispositivo.',
              variant: 'destructive'
            });
          }
          else {
            // Atualizar o status do componente apenas se não for um caso especial já tratado
            setConnectionStatus(currentStatus as ConnectionStatus);
          }
          
          lastStatus = currentStatus;
        }
        
        // Se estiver conectado, limpar o QR Code e fechar o diálogo
        if (currentStatus === 'connected' && qrDialogOpen) {
          setQrCode('');
          setQrDialogOpen(false);
        }
        
      } catch (error) {
        logService.error(MODULE_NAME, "Erro na verificação de status:", error);
      }
    };

    // Definir o intervalo de verificação
    // Se o QR estiver aberto, verificar com maior frequência
    const intervalTime = qrDialogOpen ? 1000 : 30000;
    
    // Verificação inicial
    checkStatus();
    
    // Configurar verificação periódica
    const statusInterval = setInterval(checkStatus, intervalTime);
    
    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [canaisAtivos.whatsapp, qrDialogOpen, tenantId, tenantSlug, connectionStatus, qrCode, statusPollingEnabled]);

  // Função para atualizar o QR Code
  const handleRefreshQRCode = async () => {
    await handleConnectWhatsApp();
  };

  // Função para reconectar quando o WhatsApp está desconectado
  const handleReconnect = async () => {
    try {
      setIsLoading(true);
      
      // Buscar o nome da instância
      const instanceName = await whatsappService.getFullInstanceName(tenantSlug);
      if (!instanceName) {
        throw new Error("Instância não encontrada");
      }
      
      logService.info(MODULE_NAME, `Tentando reconectar a instância: ${instanceName}`);
      
      // Tentar reiniciar a instância usando o endpoint restart
      const restarted = await whatsappService.restartInstance(instanceName);
      if (!restarted) {
        throw new Error("Falha ao reiniciar a instância");
      }
      
      // Gerar novo QR code
      await handleConnectWhatsApp();
      
      toast({
        title: "Reconexão iniciada",
        description: "Escaneie o QR Code para reconectar seu WhatsApp",
      });
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao reconectar:", error);
      toast({
        title: "Erro ao reconectar",
        description: error instanceof Error ? error.message : "Não foi possível iniciar a reconexão",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Encontrando e modificando a função renderQrCodeSafely para garantir que QR codes em base64 sejam mostrados corretamente
  const renderQrCodeSafely = () => {
    if (!qrCode) {
      return <p className="text-center text-muted-foreground">QR Code não disponível</p>;
    }

    try {
      // Log para debug
      logService.info(MODULE_NAME, `Renderizando QR Code: formato detectado`);
      
      // Verificar se é uma URL de imagem base64
      if (qrCode.startsWith('data:image')) {
        logService.info(MODULE_NAME, 'Renderizando QR Code como imagem base64');
        // Usando o QR code completo, sem truncamento
        return (
          <div className="mx-auto">
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              className="w-64 h-64 mx-auto"
              onError={(e) => {
                logService.error(MODULE_NAME, 'Erro ao carregar imagem QR Code');
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/placeholder-qr.png';
              }}
            />
            <p className="text-center mt-2 text-sm text-muted-foreground">
              Escaneie este QR Code com seu WhatsApp
            </p>
          </div>
        );
      }
      
      // Verificar se é um link do WhatsApp
      if (qrCode.includes('wa.me/')) {
        logService.info(MODULE_NAME, 'Renderizando QR Code como link wa.me');
        return (
          <div className="mx-auto text-center">
            <QRCodeSVG 
              value={qrCode}
              size={250}
              level="H"
              className="mx-auto"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Escaneie este QR Code com seu WhatsApp
            </p>
            <Button className="mt-3" onClick={() => window.open(qrCode, '_blank')}>
              Abrir Link
            </Button>
          </div>
        );
      }
      
      // Para short code formatado como "2@XXXXX"
      if (qrCode.includes('@')) {
        logService.info(MODULE_NAME, 'Renderizando código de pareamento manual');
        return (
          <div className="mx-auto text-center">
            <div className="p-4 border rounded-md mb-4 bg-muted">
              <h3 className="font-medium">Código de Pareamento</h3>
              <p className="text-xl font-mono mt-2">{qrCode}</p>
            </div>
            <ol className="text-left text-sm space-y-2">
              <li>1. Abra o WhatsApp no seu telefone</li>
              <li>2. Toque em Menu ou Configurações</li>
              <li>3. Selecione Dispositivos Conectados</li>
              <li>4. Toque em Conectar um Dispositivo</li>
              <li>5. Digite o código acima quando solicitado</li>
            </ol>
          </div>
        );
      }
      
      // Para QR Code em texto puro (formato padrão)
      logService.info(MODULE_NAME, 'Renderizando QR Code como SVG');
      return (
        <div className="mx-auto">
          <QRCodeSVG 
            value={qrCode}
            size={250}
            level="H"
            className="mx-auto"
          />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            Escaneie este QR Code com seu WhatsApp
          </p>
        </div>
      );
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao renderizar QR Code:', error);
      return (
        <div className="text-center text-red-500">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Erro ao gerar QR Code. Por favor, tente novamente.</p>
        </div>
      );
    }
  };

  // Melhoria na renderização do conteúdo do modal de QR Code
  const renderQrCodeModalContent = () => {
    // Não renderizar nada se o diálogo não estiver aberto
    if (!qrDialogOpen) return null;
    
    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground text-center">
            Preparando WhatsApp...<br/>
            Gerando QR Code para conexão...
          </p>
        </div>
      );
    }
    
    // QR Code state - quando o QR code está disponível e aguardando escaneamento
    // Mesmo se o estado for 'connecting', devemos mostrar o QR code se ele existir
    if (qrCode) {
      // Caso especial: QR code dummy (redirecionamento para WhatsApp Web)
      if (qrCode === "https://wa.me/qr/dummy") {
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-blue-100 p-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-lg font-medium mt-2">Redirecionando para WhatsApp Web</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              O QR Code gerado é muito complexo para ser exibido aqui.<br/>
              Você será redirecionado para o WhatsApp Web para completar a conexão.
            </p>
            
            <div className="w-full max-w-xs mt-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm w-full max-w-md">
              <p className="font-medium text-blue-800 mb-2">Após o redirecionamento:</p>
              <ol className="list-decimal pl-4 text-blue-700 space-y-1">
                <li>Clique em "Conectar Dispositivo" no WhatsApp Web</li>
                <li>Escaneie o QR Code com seu telefone</li>
                <li>Volte para esta tela após confirmar a conexão</li>
              </ol>
            </div>
            
            <Button 
              onClick={() => {
                window.open("https://web.whatsapp.com", "_blank");
                setQrDialogOpen(false);
              }}
              className="mt-4"
            >
              Ir para WhatsApp Web agora
            </Button>
          </div>
        );
      }

      // Se o estado indicar que o código já está sendo escaneado ou já foi escaneado,
      // mostrar o estado de escaneamento/sincronização
      if (['scanning', 'paired', 'syncing'].includes(connectionStatus)) {
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-blue-100 p-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-lg font-medium mt-2">Conectando seu WhatsApp</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Seu celular está sincronizando com o WhatsApp.<br/>
              Por favor, aguarde enquanto estabelecemos a conexão...
            </p>
            
            <div className="w-full max-w-xs mt-2">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-primary/10 rounded-lg text-sm w-full max-w-md">
              <p className="font-medium text-primary mb-2">Importante:</p>
              <ul className="list-disc pl-4 text-primary/80 space-y-1">
                <li>Mantenha seu celular ligado e conectado à internet</li>
                <li>Não feche o aplicativo WhatsApp no seu celular</li>
                <li>A primeira conexão pode levar alguns instantes</li>
                <li>O celular deve permanecer conectado para enviar mensagens</li>
              </ul>
            </div>
          </div>
        );
      }
      
      // Se o estado ainda for 'connecting' ou 'disconnected', mas temos o QR code,
      // mostrar o QR code para escaneamento
      try {
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm border">
              {renderQrCodeSafely()}
            </div>
            
            <div className="mt-2 space-y-4 w-full max-w-md">
              <div className="rounded-lg bg-primary/10 p-4 text-sm text-primary">
                <p className="font-medium mb-2">Como conectar:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Menu ou Configurações</li>
                  <li>Selecione Aparelhos Conectados</li>
                  <li>Selecione Conectar um aparelho</li>
                  <li>Aponte a câmera para este QR Code</li>
                </ol>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <Button 
                  onClick={() => setQrDialogOpen(false)} 
                  variant="outline" 
                  size="sm"
                >
                  Cancelar
                </Button>
                
                <Button 
                  onClick={handleRefreshQRCode} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Atualizar QR
                </Button>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        // Erro ao renderizar o QR code (geralmente o erro "Data too long")
        logService.error(MODULE_NAME, 'Erro ao renderizar QR Code:', error);
        
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-warning/10 p-4">
              <AlertIcon className="w-12 h-12 text-warning" />
            </div>
            <p className="text-lg font-medium mt-2">Erro ao exibir QR Code</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Ocorreu um erro ao tentar exibir o QR Code. O código gerado pode ser muito complexo.
            </p>
            
            <div className="p-4 bg-warning/10 rounded-lg text-sm w-full max-w-md mt-2">
              <p className="font-medium text-warning mb-2">Recomendações:</p>
              <ul className="list-disc pl-4 text-warning/80 space-y-1">
                <li>Tente desativar e ativar novamente o WhatsApp</li>
                <li>Use o WhatsApp Web diretamente</li>
                <li>Entre em contato com o suporte se o problema persistir</li>
              </ul>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
              <Button 
                onClick={() => {
                  window.open("https://web.whatsapp.com", "_blank");
                  setQrDialogOpen(false);
                }}
              >
                Abrir WhatsApp Web
              </Button>
            </div>
          </div>
        );
      }
    }
    
    // Connected state
    if (connectionStatus === 'connected') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="rounded-full bg-success/10 p-4">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <p className="text-lg font-medium mt-2">WhatsApp Conectado!</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Seu WhatsApp está conectado e pronto para uso.<br/>
            Agora você pode enviar e receber mensagens!
          </p>
          
          <div className="p-4 bg-success/10 rounded-lg text-sm w-full max-w-md mt-2">
            <p className="font-medium text-success mb-2">Informações:</p>
            <ul className="list-disc pl-4 text-success/80 space-y-1">
              <li>Seu WhatsApp permanecerá conectado mesmo após fechar este diálogo</li>
              <li>Você não precisa manter o navegador aberto para receber mensagens</li>
              <li>Para desconectar, desative o toggle na página de canais</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => setQrDialogOpen(false)} 
            className="mt-4"
          >
            Fechar
          </Button>
        </div>
      );
    }
    
    // Timeout state
    if (connectionStatus === 'timeout') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="rounded-full bg-warning/10 p-4">
            <AlertIcon className="w-12 h-12 text-warning" />
          </div>
          <p className="text-lg font-medium mt-2">Tempo Esgotado</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            O QR Code expirou. Isso acontece quando o código não é escaneado dentro do prazo.
          </p>
          
          <div className="p-4 bg-warning/10 rounded-lg text-sm w-full max-w-md mt-2">
            <p className="font-medium text-warning mb-2">O que fazer:</p>
            <ul className="list-disc pl-4 text-warning/80 space-y-1">
              <li>Gere um novo QR Code clicando no botão abaixo</li>
              <li>Escaneie o código rapidamente para evitar que expire novamente</li>
              <li>Verifique se seu WhatsApp está atualizado</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRefreshQRCode}>
              Gerar Novo QR Code
            </Button>
          </div>
        </div>
      );
    } 
    
    // Conflict state
    if (connectionStatus === 'conflict') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="rounded-full bg-danger/10 p-4">
            <AlertIcon className="w-12 h-12 text-danger" />
          </div>
          <p className="text-lg font-medium mt-2">Conflito Detectado</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Esta conta WhatsApp já está sendo usada em outro dispositivo ou navegador.
          </p>
          
          <div className="p-4 bg-danger/10 rounded-lg text-sm w-full max-w-md mt-2">
            <p className="font-medium text-danger mb-2">O que fazer:</p>
            <ul className="list-disc pl-4 text-danger/80 space-y-1">
              <li>Desconecte o WhatsApp dos outros dispositivos ou navegadores</li>
              <li>No seu celular, abra WhatsApp, Configurações e Aparelhos Conectados</li>
              <li>Remova os dispositivos que não estão em uso</li>
              <li>Ou utilize outro número de WhatsApp para esta integração</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRefreshQRCode}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }
    
    // Default/fallback state
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        <p className="text-sm text-muted-foreground">
          Gerando QR Code para conexão...
        </p>
      </div>
    );
  };

  // Corrigir a interpretação dos estados retornados pelo Evolution API
  useEffect(() => {
    // Se o WhatsApp estiver ativo, mas o status for "connecting" sem ter aberto o diálogo,
    // isso significa que o Evolution está pronto para gerar o QR, não que já está conectando
    if (canaisAtivos.whatsapp && connectionStatus === 'connecting' && !qrDialogOpen) {
      // Neste caso, devemos tratar como "disconnected" para que o botão "Conectar WhatsApp" apareça
      setConnectionStatus('disconnected');
      logService.info(MODULE_NAME, 'Ajustando estado "connecting" do Evolution para "disconnected" no UI');
    }
  }, [canaisAtivos.whatsapp, connectionStatus, qrDialogOpen]);

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Canais</h2>
          <p className="text-muted-foreground">Configure os canais que você deseja interagir com seu cliente.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card do WhatsApp */}
          <div 
            className={`border rounded-lg p-6 flex flex-col items-center relative cursor-pointer transition-all duration-200
                       ${canaisAtivos.whatsapp 
                          ? connectionStatus === 'connected' 
                            ? 'border-green-500 shadow-md' 
                            : 'border-blue-500 shadow-md'
                          : 'border-gray-200'}
                       ${!canaisAtivos.whatsapp ? 'opacity-70' : 'hover:shadow-lg transition-shadow'}`}
            onClick={() => handleCardClick('whatsapp')}
          >
            {/* Status Badge */}
            {canaisAtivos.whatsapp && connectionStatus && (
              <Badge 
                className={`absolute top-3 right-3 ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : connectionStatus === 'connecting' || connectionStatus === 'scanning' || connectionStatus === 'syncing' || connectionStatus === 'paired'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {connectionStatus === 'connected' 
                  ? 'Conectado' 
                  : connectionStatus === 'connecting' 
                    ? 'Conectando...' 
                    : connectionStatus === 'scanning'
                      ? 'Escaneando...'
                    : connectionStatus === 'syncing' || connectionStatus === 'paired'
                      ? 'Sincronizando...'
                    : 'Desconectado'}
              </Badge>
            )}
            
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Phone className="h-6 w-6 text-green-700" />
            </div>
            
            <h3 className="font-semibold mb-1">WhatsApp</h3>
            
            <div className="mt-4 flex items-center gap-2">
              <Switch 
                checked={canaisAtivos.whatsapp} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle('whatsapp');
                }}
                disabled={loadingCanais.whatsapp}
              />
              {loadingCanais.whatsapp ? (
                <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                  <Spinner size="sm" /> Processando...
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {canaisAtivos.whatsapp ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </div>
            
            {/* Botão de Conectar - mostrado apenas quando ativo e desconectado */}
            {canaisAtivos.whatsapp && ['disconnected', 'timeout', 'conflict'].includes(connectionStatus) && (
              <>
                <div className="mt-3 text-xs text-center text-muted-foreground">
                  <span className="text-amber-600 font-medium">WhatsApp ativado, mas não conectado</span>
                </div>
                <Button 
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectWhatsApp();
                  }}
                  className="mt-2 bg-green-600 hover:bg-green-700 flex items-center gap-2 animate-pulse"
                >
                  <QRCodeSVG value="temp" size={16} /> Conectar WhatsApp
                </Button>
              </>
            )}
          </div>

          {/* Card do SMS */}
          <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
            <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
            
            <div className="rounded-full bg-blue-100 p-3 mb-4">
              <MessageSquare className="h-6 w-6 text-blue-700" />
            </div>
            
            <h3 className="font-semibold mb-1">SMS</h3>
            
            <div className="mt-4 flex items-center gap-2">
              <Switch 
                checked={canaisAtivos.sms} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle('sms');
                }}
                disabled={loadingCanais.sms}
              />
              {loadingCanais.sms ? (
                <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                  <Spinner size="sm" /> Processando...
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {canaisAtivos.sms ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </div>
          </div>

          {/* Card do Email */}
          <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
            <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
            
            <div className="rounded-full bg-amber-100 p-3 mb-4">
              <Mail className="h-6 w-6 text-amber-700" />
            </div>
            
            <h3 className="font-semibold mb-1">Email</h3>
            
            <div className="mt-4 flex items-center gap-2">
              <Switch 
                checked={canaisAtivos.email} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle('email');
                }}
                disabled={loadingCanais.email}
              />
              {loadingCanais.email ? (
                <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                  <Spinner size="sm" /> Processando...
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {canaisAtivos.email ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </div>
          </div>

          {/* Card do Twilio */}
          <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
            <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
            
            <div className="rounded-full bg-purple-100 p-3 mb-4">
              <MessageCircle className="h-6 w-6 text-purple-700" />
            </div>
            
            <h3 className="font-semibold mb-1">Twilio</h3>
            
            <div className="mt-4 flex items-center gap-2">
              <Switch 
                checked={canaisAtivos.twilio} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle('twilio');
                }}
                disabled={loadingCanais.twilio}
              />
              {loadingCanais.twilio ? (
                <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                  <Spinner size="sm" /> Processando...
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {canaisAtivos.twilio ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para o QR Code do WhatsApp */}
      <Dialog 
        open={qrDialogOpen} 
        onOpenChange={(open: boolean) => setQrDialogOpen(open)}
      >
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {connectionStatus === 'connected' 
                ? 'WhatsApp Conectado' 
                : connectionStatus === 'connecting' 
                  ? 'Conectando WhatsApp' 
                  : connectionStatus === 'scanning'
                    ? 'Escaneando QR Code'
                  : connectionStatus === 'syncing' || connectionStatus === 'paired'
                    ? 'Sincronizando WhatsApp'
                  : connectionStatus === 'timeout'
                    ? 'Tempo Esgotado'
                  : connectionStatus === 'conflict'
                    ? 'Conflito Detectado'
                  : 'Conectar WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              {connectionStatus === 'connected' 
                ? 'Seu WhatsApp está conectado e pronto para uso.' 
                : connectionStatus === 'scanning' || connectionStatus === 'syncing' || connectionStatus === 'paired'
                  ? 'Seu celular está conectando. Aguarde um momento...'
                  : connectionStatus === 'timeout'
                    ? 'O tempo para escanear o QR Code expirou.'
                  : connectionStatus === 'conflict'
                    ? 'Esta conta WhatsApp está sendo usada em outro dispositivo.'
                  : 'Escaneie o QR Code com seu celular para conectar o WhatsApp.'}
            </DialogDescription>
          </DialogHeader>
          
          {renderQrCodeModalContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}
