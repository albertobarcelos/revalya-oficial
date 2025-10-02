import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { WHATSAPP } from "@/config/constants";
import { whatsappService, IWhatsAppInstance } from "@/services/whatsappService";
import { supabase } from '@/lib/supabase';
import { logService } from "@/services/logService";
import { QRCodeSVG } from "qrcode.react";
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

const MODULE_NAME = 'WhatsAppIntegration';

interface WhatsAppIntegrationProps {
  tenantId: string;
  tenantSlug: string;
}

export function WhatsAppIntegration({ tenantId, tenantSlug }: WhatsAppIntegrationProps) {
  const { toast } = useToast();
  
  // AIDEV-NOTE: Hook de segurança multi-tenant para validar acesso
  const { currentTenant, hasAccess } = useTenantAccessGuard(tenantId);
  
  // AIDEV-NOTE: Verificação de acesso antes de qualquer operação
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Acesso negado. Você não tem permissão para acessar esta integração.
          </div>
        </CardContent>
      </Card>
    );
  }
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Função utilitária para limpar completamente o estado do WhatsApp
  const cleanupWhatsAppState = async () => {
    // Limpar todos os estados relacionados ao WhatsApp
    setWhatsappEnabled(false);
    setQrCode(null);
    setConnectionStatus('disconnected');
    
    // AIDEV-NOTE: Limpar no Supabase com validação dupla de tenant_id
    if (currentTenant?.id) {
      try {
        await supabase
          .from('tenant_integrations')
          .update({ 
            is_enabled: false,
            instance_name: null,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', currentTenant.id)
          .eq('integration_type', 'whatsapp');
      } catch (error) {
        logService.error(MODULE_NAME, 'Erro ao limpar estado no Supabase:', error);
      }
    }
  };

  // Função para verificar status do WhatsApp com melhor tratamento de erros e detecção de status
  const checkWhatsAppStatus = useCallback(async () => {
    if (!tenantId) {
      logService.info(MODULE_NAME, 'Nenhum tenant definido, pulando verificação do WhatsApp');
      return;
    }

    try {
      // Carregar configurações do Supabase
      const { data: instanceConfig, error: configError } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'whatsapp')
        .single();

      if (configError || !instanceConfig || !instanceConfig.instance_name) {
        logService.info(MODULE_NAME, 'Nenhuma instância configurada para este tenant');
        setConnectionStatus('disconnected');
        return;
      }

      const instanceName = instanceConfig.instance_name;
      
      // Se estamos esperando escaneamento do QR code, não alteramos o status durante a verificação
      if (connectionStatus === 'connecting' && qrCode) {
        try {
          // Verificar apenas o status de conexão para saber se o QR foi escaneado
          const connectionState = await whatsappService.checkInstanceStatus(instanceName);
          
          // Se o QR foi escaneado e estamos conectados, atualizar o status
          if (connectionState === 'connected') {
            logService.info(MODULE_NAME, 'QR Code escaneado com sucesso. WhatsApp conectado!');
            setConnectionStatus('connected');
            setQrCode(null); // Limpar QR code após conexão bem-sucedida
            
            toast({
              title: "WhatsApp conectado",
              description: "Seu WhatsApp foi conectado com sucesso!",
            });
          }
        } catch (error) {
          // Ignorar erros durante o escaneamento do QR para não interromper o fluxo
          logService.debug(MODULE_NAME, 'Erro ao verificar status durante escaneamento de QR:', error);
        }
        
        return; // Não continuar a verificação para não alterar o estado durante escaneamento
      }

      // Verificar e atualizar status
      try {
        // Obter informações detalhadas, incluindo status real de conexão
        const instanceInfo = await whatsappService.getInstanceInfo(instanceName);
        
        // Verificar o status específico do connectionState
        const connectionState = await whatsappService.checkInstanceStatus(instanceName);
        logService.info(MODULE_NAME, `Status de conexão atual: ${connectionState}`);
        
        // Atualizar UI baseado no status
        switch (connectionState) {
          case 'connected':
            if (connectionStatus !== 'connected') {
              setConnectionStatus('connected');
              toast({
                title: "WhatsApp conectado",
                description: "Seu WhatsApp foi conectado com sucesso!",
              });
            }
            break;
            
          case 'disconnected':
            // Apenas notificar se estava conectado anteriormente
            if (connectionStatus === 'connected') {
              setConnectionStatus('disconnected');
              toast({
                title: "WhatsApp desconectado",
                description: "Seu WhatsApp foi desconectado. Reconecte para continuar usando.",
                variant: "destructive",
              });
            } else if (connectionStatus !== 'disconnected' && connectionStatus !== 'connecting') {
              // Atualizar silenciosamente se não estava em espera por QR
              setConnectionStatus('disconnected');
            }
            break;
            
          case 'deleted':
            // Limpar o estado
            await cleanupWhatsAppState();
            
            toast({
              title: 'Instância não encontrada',
              description: 'A instância do WhatsApp foi removida ou não existe mais',
              variant: 'destructive'
            });
            break;
            
          default:
            if (connectionState === 'connected') {
              setConnectionStatus('connected');
            } else if (connectionStatus !== 'connecting') {
              // Não alterar se estiver em modo de espera por QR
              setConnectionStatus('disconnected');
            }
        }
      } catch (statusError) {
        // Se a instância não existe mais ou houve erro crítico
        logService.error(MODULE_NAME, 'Erro ao verificar status da instância:', statusError);
        
        // Apenas limpar estado se não estivermos aguardando escaneamento de QR
        if (connectionStatus !== 'connecting') {
          await cleanupWhatsAppState();
        }
      }
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao verificar status do WhatsApp:", error);
      
      // Não alterar se estiver esperando escaneamento de QR
      if (connectionStatus !== 'connecting') {
        setConnectionStatus('disconnected');
      }
    }
  }, [tenantId, toast, connectionStatus, qrCode, cleanupWhatsAppState]);

  // Verificar status periodicamente
  useEffect(() => {
    if (!whatsappEnabled) {
      return;
    }
    
    // Verificar status da instância periodicamente
    const checkStatus = async () => {
      await checkWhatsAppStatus();
    };
    
    // Verificar imediatamente
    checkStatus();
    
    // Configurar verificação periódica - a cada 3 segundos para ser mais responsivo
    const interval = setInterval(checkStatus, 3000);
    
    return () => clearInterval(interval);
  }, [whatsappEnabled, checkWhatsAppStatus]);

  // Carregar configuração inicial
  useEffect(() => {
    const loadWhatsAppConfig = async () => {
      if (!tenantId) return;
      
      try {
        setConnectionStatus('loading');
        
        // Buscar configuração no Supabase
        const { data, error } = await supabase
          .from('tenant_integrations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'whatsapp')
          .single();
        
        if (error) {
          logService.error(MODULE_NAME, 'Erro ao carregar configurações do WhatsApp:', error);
          setConnectionStatus('disconnected');
          return;
        }
        
        if (data) {
          // Configuração encontrada
          setWhatsappEnabled(data.is_enabled || false);
          
          if (data.is_enabled && data.instance_name) {
            // Verificar status da instância
            try {
              const status = await whatsappService.checkInstanceStatus(data.instance_name);
              setConnectionStatus(status === 'connected' ? 'connected' : 'disconnected');
            } catch (statusError) {
              logService.error(MODULE_NAME, 'Erro ao verificar status inicial:', statusError);
              setConnectionStatus('disconnected');
            }
          } else {
            setConnectionStatus('disconnected');
          }
        } else {
          // Não há configuração, estado desconectado
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        logService.error(MODULE_NAME, 'Erro ao inicializar WhatsApp:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    loadWhatsAppConfig();
  }, [tenantId]);

  const handleWhatsappToggle = async (enabled: boolean) => {
    if (!tenantSlug) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o tenant atual",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (enabled) {
        logService.info(MODULE_NAME, 'Iniciando ativação do WhatsApp');
        // 1. Gerenciar instância (criar ou recuperar)
        const result = await whatsappService.manageInstance(tenantSlug, 'create');
        
        if (!result.success) {
          throw new Error(result.error || 'Não foi possível criar ou recuperar a instância');
        }
        
        // 2. Atualizar estado local
        setConnectionStatus('connecting');
        setWhatsappEnabled(true);
        
        // 3. Se houver QR code, exibir
        if (result.qrCode) {
          logService.info(MODULE_NAME, 'QR Code gerado com sucesso, exibindo para o usuário');
          setQrCode(result.qrCode);
          
          toast({
            title: "Whatsapp - QRCode Conectando",
            description: "Escaneie o QR Code para conectar seu Whatsapp - QRCode",
          });
        } else {
          logService.warn(MODULE_NAME, 'Não foi gerado QR Code na criação da instância');
          toast({
            title: "Whatsapp - QRCode Conectando",
            description: "Iniciando processo de conexão do Whatsapp - QRCode...",
          });
        }
      } else {
        // Desativar Whatsapp - QRCode
        logService.info(MODULE_NAME, 'Iniciando desativação do Whatsapp - QRCode');
        
        // Verificar se temos o nome da instância salvo no banco
        // Buscar configuração do Supabase
        const { data: existingConfig, error } = await supabase
          .from('tenant_integrations')
          .select('instance_name')
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'whatsapp')
          .single();
        
        // Tentar excluir a instância diretamente primeiro se tivermos o nome
        if (existingConfig && existingConfig.instance_name) {
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
        
        // Em seguida, usar o manageInstance para garantir
        const result = await whatsappService.manageInstance(tenantSlug, 'disconnect');
        
        if (!result.success) {
          throw new Error(result.error || 'Não foi possível desativar o WhatsApp');
        }
        
        // Limpar estados locais
        setQrCode(null);
        setConnectionStatus('disconnected');
        setWhatsappEnabled(false);
        
        // Limpar dados no Supabase
        await cleanupWhatsAppState();
        
        toast({
          title: "WhatsApp Desativado",
          description: "A integração com WhatsApp foi desativada",
        });
      }
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao configurar WhatsApp:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao configurar o WhatsApp",
        variant: "destructive",
      });
      
      // Limpar estados em caso de erro
      setWhatsappEnabled(false);
      setConnectionStatus('disconnected');
      setQrCode(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para renovar o QR Code
  const handleRefreshQRCode = async () => {
    if (!tenantId || !tenantSlug) return;
    
    try {
      setIsLoading(true);
      
      // Buscar configuração do Supabase
      const { data: existingConfig, error } = await supabase
        .from('tenant_integrations')
        .select('instance_name')
        .eq('tenant_id', tenantId)
        .eq('integration_type', 'whatsapp')
        .single();
      
      if (error || !existingConfig || !existingConfig.instance_name) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar a instância do WhatsApp",
          variant: "destructive",
        });
        return;
      }
      
      const instanceName = existingConfig.instance_name;
      
      logService.info(MODULE_NAME, `Gerando novo QR Code para a instância: ${instanceName}`);
      
      // Tentar reconectar primeiro para garantir que a instância esteja no estado correto
      try {
        await whatsappService.connectInstance(instanceName);
      } catch (connectError) {
        logService.warn(MODULE_NAME, 'Erro ao conectar instância antes de gerar QR Code:', connectError);
        // Continuar mesmo com erro, pois o generateQRCode pode funcionar
      }
      
      // O método generateQRCode já inicia a conexão internamente
      const qrCodeData = await whatsappService.generateQRCode(instanceName);
      
      if (!qrCodeData) {
        throw new Error('Não foi possível gerar o QR Code');
      }
      
      setQrCode(qrCodeData);
      setConnectionStatus('connecting');
      
      toast({
        title: "QR Code Renovado",
        description: "Escaneie o novo QR Code para conectar",
      });
    } catch (error) {
      logService.error(MODULE_NAME, "Erro ao renovar QR Code:", error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o QR Code. Tente desativar e ativar novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para obter texto do status de conexão
  const getConnectionStatusText = () => {
    switch(connectionStatus) {
      case WHATSAPP.CONNECTION_STATES.CONNECTED:
        return 'Conectado';
      case WHATSAPP.CONNECTION_STATES.CONNECTING:
        return 'Aguardando escaneamento do QR Code';
      case WHATSAPP.CONNECTION_STATES.DISCONNECTED:
      default:
        return 'Desconectado';
    }
  };

  // Função para renderizar o QR Code
  const renderQrCode = () => {
    if (!qrCode) {
      return <p className="text-center text-muted-foreground">QR Code não disponível</p>;
    }

    try {
      logService.info(MODULE_NAME, `Renderizando QR Code: formato detectado`);
      
      // Verificar se é uma URL de imagem base64
      if (qrCode.startsWith('data:image')) {
        logService.info(MODULE_NAME, 'Renderizando QR Code como imagem base64');
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
        <div className="text-center text-danger">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
          <p>Erro ao gerar QR Code. Por favor, tente novamente.</p>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-success"
          >
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
            <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z" />
            <path d="M12 17a5 5 0 0 0 5-5v-1a5 5 0 0 0-10 0v1a5 5 0 0 0 5 5Z" />
          </svg>
          Whatsapp - QRCode
        </CardTitle>
        <CardDescription>
          Conecte seu WhatsApp via QRCode para envio automático de mensagens de cobrança.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-0.5">
            <Label>Ativar WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Permite enviar mensagens de cobrança pelo WhatsApp automaticamente
            </p>
          </div>
          <Switch 
            id="whatsapp-integration"
            checked={whatsappEnabled}
            onCheckedChange={handleWhatsappToggle}
            disabled={isLoading}
            aria-label="Ativar WhatsApp"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {connectionStatus === 'connecting' 
                ? "Aguardando conexão do WhatsApp..." 
                : "Processando solicitação..."}
            </p>
          </div>
        ) : (
          whatsappEnabled && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Conexão WhatsApp</CardTitle>
                <CardDescription>
                  Estado atual: {getConnectionStatusText()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {connectionStatus === 'connecting' && qrCode && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center mb-4">
                      <p>Escaneie o QR Code abaixo com seu WhatsApp</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Abra o WhatsApp no seu telefone, toque em Menu ou Configurações e selecione WhatsApp Web
                      </p>
                    </div>
                    
                    {renderQrCode()}
                    
                    <Button
                      onClick={handleRefreshQRCode}
                      variant="outline"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          <span>Atualizar QR Code</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
                
                {connectionStatus === 'connected' && (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-16 w-16 text-success mb-4" />
                    <p className="text-center">
                      WhatsApp conectado com sucesso!
                    </p>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Mantenha seu telefone conectado à internet para receber mensagens.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        )}
      </CardContent>
    </Card>
  );
}
