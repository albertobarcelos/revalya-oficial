/**
 * Serviço para gerenciar a conexão com a Evolution API para WhatsApp
 */

import { supabase } from '@/lib/supabase';
import { API_TIMEOUT, WHATSAPP, MAX_RETRIES, RETRY_DELAY } from '@/config/constants';
import { logService } from './logService';
import { rateLimitService } from './rateLimitService';
import { executeWithAuth, checkAuthentication, logAccess } from '@/utils/authUtils';

// URL e chave padrão da Evolution API (pode ser alterada nas configurações)
// Usando URL sem barra no final para evitar problemas de path

/**
 * Interface que define a estrutura de uma instância do WhatsApp
 */
export interface IWhatsAppInstance {
  instanceName: string;
  status: typeof WHATSAPP.CONNECTION_STATES[keyof typeof WHATSAPP.CONNECTION_STATES];
  createdAt: Date;
}

class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;
  private readonly MODULE_NAME = 'WhatsApp';

  constructor() {
    this.apiUrl = import.meta.env.VITE_EVOLUTION_API_URL;
    this.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
    
    if (!this.apiUrl || !this.apiKey) {
      logService.error(this.MODULE_NAME, 'Credenciais da API não configuradas');
    }
  }
  
  /**
   * Retorna a URL da API Evolution configurada
   */
  getApiUrl = (): string => {
    return this.apiUrl;
  }
  
  /**
   * Retorna a chave da API Evolution configurada
   */
  getApiKey = (): string => {
    return this.apiKey;
  }
  
  /**
   * Configura as credenciais da Evolution API
   */
  setCredentials = (apiUrl: string, apiKey: string): void => {
    if (apiUrl) this.apiUrl = apiUrl;
    if (apiKey) this.apiKey = apiKey;
    logService.info(this.MODULE_NAME, 'Credenciais da API atualizadas');
  }
  
  /**
   * Método auxiliar para fazer chamadas à Evolution API
   */
  private callEvolutionApi = async (endpoint: string, method: string = 'GET', data?: any): Promise<any> => {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      // Verificar rate limit
      const canProceed = await rateLimitService.checkLimit('global', endpoint);
      if (!canProceed) {
        throw new Error('Rate limit excedido');
      }

      // Timeout maior para operações de exclusão
      let timeout = API_TIMEOUT;
      if (endpoint.includes('delete') || endpoint.includes('disconnect') || method === 'DELETE') {
        timeout = API_TIMEOUT * 2; // Dobrar o timeout para operações sensíveis
        logService.info(this.MODULE_NAME, `Usando timeout estendido (${timeout}ms) para operação de exclusão/desconexão`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      };
      
      const options: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      };
      
      logService.debug(this.MODULE_NAME, `Chamando API: ${method} ${url}`, { data });
      
      // Para depuração, vamos logar o payload quando for POST
      if ((method === 'POST' || method === 'PUT') && data) {
        logService.debug(this.MODULE_NAME, 'Payload:', JSON.stringify(data));
      }
      
      // Tentativa com retry para operações importantes
      let retries = 0;
      const maxRetries = endpoint.includes('delete') || endpoint.includes('disconnect') ? 3 : 1;
      
      while (retries <= maxRetries) {
        try {
          const response = await fetch(url, options);
          clearTimeout(timeoutId);
          
          // Se a resposta for um sucesso, mas não contém conteúdo (204)
          if (response.status === 204) {
            return { success: true };
          }
          
          // Verificar se é uma resposta JSON
          const contentType = response.headers.get("content-type");
          const isJson = contentType?.includes("application/json");
          
          if (isJson) {
            const json = await response.json();
            
            // Log completo da resposta para diagnóstico
            logService.debug(this.MODULE_NAME, `Resposta da API (${endpoint}):`, json);
            
            if (!response.ok) {
              logService.error(this.MODULE_NAME, 'Erro na resposta da API:', {
                status: response.status,
                error: response.statusText,
                response: json
              });
              
              // Verificar se é um erro de necessidade de desconexão
              if (json && json.message && typeof json.message === 'string' && 
                  json.message.includes('needs to be disconnected') && 
                  (endpoint.includes('delete') || method === 'DELETE')) {
                    
                // Tentar desconectar e tentar novamente
                if (retries < maxRetries) {
                  retries++;
                  logService.info(this.MODULE_NAME, `Instância precisa ser desconectada. Tentando desconectar e tentar novamente (tentativa ${retries})`);
                  
                  // Extrair o nome da instância
                  const instanceMatch = endpoint.match(/\/([^/]+)$/);
                  if (instanceMatch && instanceMatch[1]) {
                    const instanceName = instanceMatch[1].split('?')[0]; // Remover query params se houver
                    try {
                      // Tentar desconectar antes de nova tentativa
                      await this.callEvolutionApi(`/instance/logout/${instanceName}`, 'DELETE');
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      continue; // Tentar a operação original novamente
                    } catch (disconnectError) {
                      logService.error(this.MODULE_NAME, `Erro ao tentar desconectar instância ${instanceName}:`, disconnectError);
                    }
                  }
                }
              }
              
              throw new Error(json.error || json.message || `Erro ${response.status}`);
            }
            
            return json;
          } else {
            // Se não for JSON, obter o texto da resposta
            const text = await response.text();
            
            // AIDEV-NOTE: Verificar se a resposta é HTML (indica instância não existente)
            if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
              logService.error(this.MODULE_NAME, `API retornou HTML em vez de JSON para ${endpoint}. Isso geralmente indica que a instância não existe.`);
              throw new Error('Instância não encontrada - API retornou HTML em vez de JSON');
            }
            
            // Log da resposta de texto
            logService.debug(this.MODULE_NAME, `Resposta da API (texto) (${endpoint}):`, text);
            
            if (!response.ok) {
              logService.error(this.MODULE_NAME, 'Erro na resposta da API (texto):', {
                status: response.status,
                error: response.statusText,
                response: text
              });
              throw new Error(`Erro ${response.status}: ${text}`);
            }
            
            return text;
          }
        } catch (fetchError) {
          if (retries < maxRetries && (
              endpoint.includes('delete') || 
              endpoint.includes('disconnect') || 
              method === 'DELETE'
            )) {
            retries++;
            logService.warn(this.MODULE_NAME, `Erro na requisição. Tentando novamente (${retries}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
          throw fetchError;
        }
      }
      
      throw new Error(`Máximo de tentativas excedido para ${endpoint}`);
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao chamar ${endpoint}:`, { error });
      throw error;
    }
  }

  private retryOperation = async <T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('Máximo de tentativas excedido');
  }

  /**
   * Verifica se uma instância existe na Evolution API
   */
  instanceExists = async (instanceName: string): Promise<boolean> => {
    try {
      if (!instanceName) {
        logService.error(this.MODULE_NAME, 'Nome da instância não fornecido');
        return false;
      }

      // Tenta verificar com o estado de conexão
      try {
        const response = await this.callEvolutionApi(`/instance/connectionState/${instanceName}`);
        if (response && response.instance) {
          return true;
        }
      } catch (connectionError) {
        logService.debug(this.MODULE_NAME, `Erro ao verificar estado de conexão para ${instanceName}, tentando método alternativo`, connectionError);
      }
      
      // Se falhar, tenta buscar em todas as instâncias
      try {
        const allInstances = await this.callEvolutionApi(`/instance/fetchInstances`, 'GET');
        
        if (allInstances && Array.isArray(allInstances.data)) {
          const found = allInstances.data.some((instance: any) => 
            instance.instance === instanceName || 
            (instance.instanceName && instance.instanceName === instanceName)
          );
          
          if (found) {
            logService.debug(this.MODULE_NAME, `Instância ${instanceName} encontrada via fetchInstances`);
            return true;
          }
        }
      } catch (fetchError) {
        logService.debug(this.MODULE_NAME, `Erro ao verificar lista de instâncias para ${instanceName}`, fetchError);
      }
      
      // Como último recurso, tenta buscar informações detalhadas
      try {
        const info = await this.callEvolutionApi(`/instance/info/${instanceName}`);
        if (info && !info.error) {
          logService.debug(this.MODULE_NAME, `Instância ${instanceName} encontrada via info`);
          return true;
        }
      } catch (infoError) {
        logService.debug(this.MODULE_NAME, `Erro ao verificar info para ${instanceName}`, infoError);
      }
      
      // Se chegou até aqui, não há evidência da existência da instância
      logService.debug(this.MODULE_NAME, `Instância ${instanceName} não encontrada em nenhuma verificação`);
      return false;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao verificar existência da instância ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Cria uma nova instância do WhatsApp para um tenant específico
   */
  // AIDEV-NOTE: Método para criar uma única instância por tenant
  // Remove timestamp para garantir nome consistente e reutilizável
  createInstance = async (tenantSlug: string): Promise<IWhatsAppInstance> => {
    try {
      // Nome padronizado: uma instância única por tenant (sem timestamp)
      const instanceName = `revalya-${tenantSlug}`;
      
      logService.info(this.MODULE_NAME, `Criando instância única para o tenant: ${tenantSlug} -> ${instanceName}`);
      
      // Configuração completa conforme documentação da API
      // Usando any aqui para evitar erros de tipo já que a API aceita muitos campos opcionais
      const data: any = {
        instanceName: instanceName,
        integration: "WHATSAPP-BAILEYS", // Campo obrigatório para definir o tipo de integração
        qrcode: true, // criar QR code automaticamente após a criação
        
        // Configurações recomendadas para melhorar a experiência
        reject_call: true, // Rejeitar chamadas automaticamente
        groups_ignore: true, // Ignorar mensagens de grupos
        always_online: true, // Manter WhatsApp sempre online
        read_messages: true, // Enviar confirmações de leitura
        read_status: true, // Ver status de mensagens
        
        // Configurações de webhook para notificações em tempo real
        webhook_by_events: true,
        events: [
          "CONNECTION_UPDATE", // Notificação de mudança de status da conexão
          "QRCODE_UPDATED" // Notificar quando o QR code for atualizado
        ]
      };
      
      // Adicionar URL do webhook se estiver configurada
      const webhookBaseUrl = import.meta.env.VITE_WEBHOOK_BASE_URL;
      if (webhookBaseUrl) {
        // Adicionar webhook específico para o tenant
        data.webhook = `${webhookBaseUrl}/api/whatsapp/webhook/${tenantSlug}`;
        logService.info(this.MODULE_NAME, `Configurando webhook: ${data.webhook}`);
      }
      
      // Criar instância com configurações completas
      const response = await this.callEvolutionApi('/instance/create', 'POST', data);
      logService.info(this.MODULE_NAME, 'Instância única criada com sucesso:', response);
      
      // Retorna os dados da instância criada
      return {
        instanceName,
        status: 'disconnected', // Instância é criada desconectada inicialmente
        createdAt: new Date()
      };
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao criar instância única:', error);
      throw error;
    }
  }

  /**
   * Inicia a conexão de uma instância (necessário para gerar QR code)
   */
  connectInstance = async (instanceName: string): Promise<boolean> => {
    try {
      logService.info(this.MODULE_NAME, `Iniciando conexão da instância: ${instanceName}`);
      
      // Endpoint para iniciar a conexão
      const response = await this.callEvolutionApi(`/instance/connect/${instanceName}`, 'GET');
      
      logService.info(this.MODULE_NAME, `Resposta ao conectar instância ${instanceName}:`, response);
      return true;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao conectar instância ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Formatar QR Code para exibição no navegador
   * AIDEV-NOTE: Garante que o QR Code esteja no formato correto para tag <img>
   */
  private formatQRCodeForDisplay = (qrCode: string): string => {
    logService.info(this.MODULE_NAME, `[DEBUG] Formatando QR Code. Tamanho: ${qrCode.length}, Início: ${qrCode.substring(0, 50)}...`);
    
    // Se já está no formato data URL, retornar como está
    if (qrCode.startsWith('data:image/')) {
      logService.info(this.MODULE_NAME, '[DEBUG] QR Code já está no formato data URL');
      return qrCode;
    }
    
    // Se é um link do WhatsApp, retornar como está
    if (qrCode.startsWith('https://wa.me/') || qrCode.startsWith('http://wa.me/')) {
      logService.info(this.MODULE_NAME, '[DEBUG] QR Code é um link do WhatsApp');
      return qrCode;
    }
    
    // Se parece ser base64 puro, adicionar o prefixo data URL
    if (qrCode.length > 100 && !qrCode.includes(' ') && !qrCode.includes('\n')) {
      // Verificar se já tem o prefixo base64
      if (qrCode.includes('base64,')) {
        // Extrair apenas a parte base64
        const base64Part = qrCode.split('base64,')[1];
        const formatted = `data:image/png;base64,${base64Part}`;
        logService.info(this.MODULE_NAME, '[DEBUG] QR Code tinha prefixo base64, extraído e reformatado');
        return formatted;
      } else {
        // Assumir que é base64 puro
        const formatted = `data:image/png;base64,${qrCode}`;
        logService.info(this.MODULE_NAME, '[DEBUG] QR Code parece ser base64 puro, adicionado prefixo data URL');
        return formatted;
      }
    }
    
    // Se não conseguiu identificar o formato, retornar como está
    logService.warn(this.MODULE_NAME, `[DEBUG] Formato de QR Code não reconhecido, usando como está. Tamanho: ${qrCode.length}`);
    return qrCode;
  };

  /**
   * Gera um QR Code para uma instância
   */
  generateQRCode = async (instanceName: string): Promise<string> => {
    try {
      logService.info(this.MODULE_NAME, `Gerando QR code para instância: ${instanceName}`);
      
      // Na Evolution API, o endpoint de conexão retorna o QR code
      const response = await this.callEvolutionApi(`/instance/connect/${instanceName}`, 'GET'); 
      
      let qrCode: string | null = null;
      
      // Tentar extrair o QR code de diferentes lugares possíveis na resposta
      
      // Verificar se temos a propriedade base64 (formato antigo)
      if (response && response.base64) {
        logService.info(this.MODULE_NAME, 'QR Code encontrado na propriedade base64');
        qrCode = response.base64;
      }
      // Verificar se temos a propriedade qrcode (novo formato em algumas versões)
      else if (response && response.qrcode) {
        logService.info(this.MODULE_NAME, 'QR Code encontrado na propriedade qrcode');
        qrCode = response.qrcode;
      }
      // Verificar se temos o QR code em uma subestrutura
      else if (response && response.data && response.data.qrcode) {
        logService.info(this.MODULE_NAME, 'QR Code encontrado em data.qrcode');
        qrCode = response.data.qrcode;
      }
      // Verificar estrutura aninhada instance.qrcode
      else if (response && response.instance && response.instance.qrcode) {
        logService.info(this.MODULE_NAME, 'QR Code encontrado em instance.qrcode');
        qrCode = response.instance.qrcode;
      }
      // Outras possíveis estruturas - QR code como string direta
      else if (response && typeof response === 'string' && response.startsWith('data:image')) {
        logService.info(this.MODULE_NAME, 'QR Code encontrado como string direta');
        qrCode = response;
      }
      // Se não encontrou em nenhum lugar conhecido, tentar encontrar em qualquer propriedade que pareça um QR code
      else if (response) {
        for (const key in response) {
          const value = response[key];
          if (typeof value === 'string' && 
             (value.startsWith('data:image') || 
              value.includes('png;base64') || 
              value.startsWith('1@') || 
              value.startsWith('https://wa.me/') ||
              (value.length > 100 && !value.includes(' ')))) { // Possível base64
            logService.info(this.MODULE_NAME, `QR Code encontrado na propriedade: ${key}`);
            qrCode = value;
            break;
          }
        }
      }
      
      // Se encontrou um QR Code, formatá-lo corretamente
      if (qrCode) {
        const formattedQRCode = this.formatQRCodeForDisplay(qrCode);
        logService.info(this.MODULE_NAME, `QR Code formatado com sucesso. Tamanho original: ${qrCode.length}, Formato final: ${formattedQRCode.substring(0, 50)}...`);
        return formattedQRCode;
      }
      
      // Se chegou até aqui, não encontramos o QR code na resposta
      logService.error(this.MODULE_NAME, 'QR Code não encontrado na resposta. Estrutura:', response);
      
      // Tentar obter explicitamente por uma nova chamada
      try {
        logService.info(this.MODULE_NAME, 'Tentando obter QR Code via getQrCode endpoint...');
        const qrResponse = await this.callEvolutionApi(`/instance/qrcode/${instanceName}`, 'GET');
        
        logService.info(this.MODULE_NAME, 'Resposta do endpoint getQrCode:', qrResponse);
        
        // Verificar onde está o QR code nesta resposta
        if (qrResponse && qrResponse.qrcode) {
          logService.info(this.MODULE_NAME, 'QR Code encontrado em qrcode da nova chamada');
          return this.formatQRCodeForDisplay(qrResponse.qrcode);
        }
        
        if (qrResponse && qrResponse.base64) {
          logService.info(this.MODULE_NAME, 'QR Code encontrado em base64 da nova chamada');
          return this.formatQRCodeForDisplay(qrResponse.base64);
        }
        
        if (qrResponse && typeof qrResponse === 'string') {
          logService.info(this.MODULE_NAME, 'QR Code retornado como string da nova chamada');
          return this.formatQRCodeForDisplay(qrResponse);
        }
      } catch (qrError) {
        logService.error(this.MODULE_NAME, 'Erro ao tentar alternativa para QR Code:', qrError);
      }
      
      throw new Error('QR Code não disponível na resposta da API');
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao gerar QR Code:', error);
      throw error;
    }
  }

  /**
   * Verifica o status de conexão de uma instância - melhorado para detectar mais estados
   */
  checkInstanceStatus = async (instanceName: string): Promise<string> => {
    try {
      if (!instanceName) {
        logService.error(this.MODULE_NAME, 'Nome da instância não fornecido');
        return 'disconnected';
      }
      
      logService.info(this.MODULE_NAME, `Verificando status da instância: ${instanceName}`);
      
      // Obter status da instância
      const response = await this.callEvolutionApi(`/instance/connectionState/${instanceName}`);
      
      logService.debug(this.MODULE_NAME, 'Status detalhado:', response);
      
      // Obter estado da resposta da API
      let state = 'disconnected';
      
      if (response && response.instance) {
        // Diferentes versões da API podem retornar estruturas diferentes
        if (typeof response.instance === 'object') {
          // Tentar acessar o estado no formato state ou status
          state = response.instance.state || response.instance.status || 'disconnected';
          
          // Verificar se está conectado com o flag connected
          if (response.instance.connected === true || 
              (typeof response.instance.connected === 'string' && 
               response.instance.connected.toLowerCase() === 'true')) {
            state = 'connected';
          }
        } else if (typeof response.instance === 'string') {
          // Algumas versões retornam o estado diretamente como string
          state = response.instance;
        }
      }
      
      // Se não obtivemos um estado válido pelo endpoint principal, tentar outras fontes
      if (state === 'disconnected' || !state) {
        try {
          // Tentar obter informações detalhadas
          const instanceInfo = await this.getInstanceInfo(instanceName);
          
          if (instanceInfo && instanceInfo.instance) {
            // Usar o estado da informação detalhada se disponível
            if (instanceInfo.instance.state && instanceInfo.instance.state !== 'disconnected') {
              state = instanceInfo.instance.state;
              logService.info(this.MODULE_NAME, `Status atualizado via getInstanceInfo: ${state}`);
            } 
            // A API pode retornar também como status em vez de state
            else if (instanceInfo.instance.status && instanceInfo.instance.status !== 'disconnected') {
              state = instanceInfo.instance.status;
              logService.info(this.MODULE_NAME, `Status atualizado via getInstanceInfo: ${state}`);
            }
            
            // Verificar se está conectado com o "connected" na estrutura
            if (instanceInfo.instance.connected === true || 
                (typeof instanceInfo.instance.connected === 'string' && 
                 instanceInfo.instance.connected.toLowerCase() === 'true')) {
              state = 'connected';
              logService.info(this.MODULE_NAME, `Instância marcada como conectada: ${state}`);
            }
          }
        } catch (infoError) {
          // Ignorar erros ao tentar obter mais informações
          logService.debug(this.MODULE_NAME, 'Erro ao tentar obter mais informações de status:', infoError);
        }
      }
      
      // Normalizar estado para formato padronizado
      // Estados observados na API: 'connected', 'connecating', 'disconnected', 'ready', 'paired', 'timeout'
      if (['connected', 'ready', 'open'].includes(state.toLowerCase())) {
        return 'connected';
      } else if (['connecting', 'pairing', 'paired', 'syncing'].includes(state.toLowerCase())) {
        return 'connecting';
      } else {
        return state.toLowerCase();
      }
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao verificar status da instância:', error);
      return 'disconnected';
    }
  }

  /**
   * Desconecta uma instância (sem deletar)
   */
  disconnectInstance = async (instanceName: string): Promise<boolean> => {
    try {
      logService.info(this.MODULE_NAME, `Desconectando instância: ${instanceName}`);
      
      // Endpoint para desconectar a instância sem deletá-la
      // Utilizando o método DELETE com o endpoint correto conforme documentação
      const response = await this.callEvolutionApi(`/instance/logout/${instanceName}`, 'DELETE');
      
      logService.info(this.MODULE_NAME, `Resposta ao desconectar instância ${instanceName}:`, response);
      return true;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao desconectar instância ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Deleta uma instância
   */
  deleteInstance = async (instanceName: string): Promise<boolean> => {
    try {
      logService.info(this.MODULE_NAME, `Deletando instância: ${instanceName}`);
      
      // Tentar desconectar antes de deletar para garantir uma deleção limpa
      try {
        await this.disconnectInstance(instanceName);
        // Aguardar um tempo para garantir que a desconexão seja processada
        await new Promise(resolve => setTimeout(resolve, 1500));
        logService.info(this.MODULE_NAME, `Instância ${instanceName} desconectada antes da exclusão`);
      } catch (disconnectError) {
        logService.warn(this.MODULE_NAME, `Erro ao desconectar antes de deletar, continuando com a exclusão: ${instanceName}`, disconnectError);
        // Continuar tentando deletar mesmo com erro na desconexão
      }
      
      // Tentar várias abordagens para garantir exclusão completa
      
      // 1. Primeiro endpoint: /instance/delete
      try {
        logService.info(this.MODULE_NAME, `Tentando endpoint DELETE /instance/delete/${instanceName}`);
        const response = await this.callEvolutionApi(`/instance/delete/${instanceName}`, 'DELETE');
        logService.info(this.MODULE_NAME, `Resposta ao deletar instância ${instanceName}:`, response);
        // Se chegou até aqui, a exclusão foi bem-sucedida
        return true;
      } catch (error) {
        logService.warn(this.MODULE_NAME, `Erro no primeiro método de exclusão para ${instanceName}, tentando método alternativo:`, error);
        
        // Verificar se o erro indica que a instância precisa ser desconectada
        const errorMsg = error instanceof Error ? error.message : '';
        if (errorMsg.includes('needs to be disconnected') || errorMsg.includes('disconnected')) {
          // Tentar desconectar novamente com mais tempo de espera
          try {
            logService.info(this.MODULE_NAME, `Segunda tentativa de desconexão para ${instanceName}`);
            await this.callEvolutionApi(`/instance/logout/${instanceName}`, 'DELETE');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Tentar excluir novamente após segunda desconexão
            logService.info(this.MODULE_NAME, `Nova tentativa de exclusão após segunda desconexão`);
            await this.callEvolutionApi(`/instance/delete/${instanceName}`, 'DELETE');
            return true;
          } catch (secondError) {
            logService.warn(this.MODULE_NAME, `Erro na segunda tentativa de exclusão:`, secondError);
          }
        }
      }
      
      // 2. Endpoint alternativo - tentar com outro parâmetro
      try {
        logService.info(this.MODULE_NAME, `Tentando método alternativo: logout com DELETE`);
        // Forçar logout primeiro
        await this.callEvolutionApi(`/instance/logout/${instanceName}`, 'DELETE');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Tentar excluir após logout forçado
        await this.callEvolutionApi(`/instance/delete/${instanceName}`, 'DELETE');
        return true;
      } catch (error) {
        logService.warn(this.MODULE_NAME, `Erro no método alternativo de exclusão para ${instanceName}:`, error);
      }
      
      // 3. Tentar método via PUT/POST
      try {
        logService.info(this.MODULE_NAME, `Tentando método via PUT para exclusão`);
        await this.callEvolutionApi(`/instance/delete`, 'PUT', { instanceName });
        return true;
      } catch (putError) {
        logService.warn(this.MODULE_NAME, `Erro no método PUT para exclusão:`, putError);
        
        // Última tentativa via POST
        try {
          logService.info(this.MODULE_NAME, `Tentativa final via POST para exclusão`);
          await this.callEvolutionApi(`/instance/delete`, 'POST', { instanceName });
          return true;
        } catch (postError) {
          logService.warn(this.MODULE_NAME, `Erro no método POST para exclusão:`, postError);
        }
      }
      
      // Verificar se a instância realmente foi excluída
      try {
        const exists = await this.instanceExists(instanceName);
        if (exists) {
          logService.warn(this.MODULE_NAME, `A instância ${instanceName} ainda existe após tentativas de exclusão`);
        } else {
          logService.info(this.MODULE_NAME, `Confirmado: instância ${instanceName} foi excluída com sucesso`);
          return true;
        }
      } catch (checkError) {
        logService.warn(this.MODULE_NAME, `Não foi possível verificar se a instância ${instanceName} foi excluída:`, checkError);
      }
      
      // Consideramos sucesso mesmo se não conseguirmos verificar a exclusão
      return true;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao deletar instância ${instanceName}:`, error);
      // Consideramos como sucesso mesmo em caso de erro para permitir limpeza do estado
      return true;
    }
  }

  /**
   * Verifica se uma instância existe para o tenant
   */
  findInstanceForTenant = async (tenantSlug: string): Promise<IWhatsAppInstance | null> => {
    try {
      logService.info(this.MODULE_NAME, `Buscando instâncias existentes para o tenant: ${tenantSlug}`);
      
      // AIDEV-NOTE: Usar a nova lógica flexível de busca implementada em findInstancesBySlugPrefix
      const instances = await this.findInstancesBySlugPrefix(tenantSlug);
      
      if (instances && instances.length > 0) {
        // AIDEV-NOTE: Priorizar instâncias conectadas, mas validar se não têm erros críticos
        const connectedInstance = instances.find(instance => 
          instance.status === WHATSAPP.CONNECTION_STATES.CONNECTED || 
          instance.status === 'open'
        );
        
        if (connectedInstance) {
          // Verificar se a instância conectada realmente está funcional
          const instanceInfo = await this.getInstanceInfo(connectedInstance.instanceName);
          
          // Se tem disconnectionReasonCode crítico, não usar esta instância
          if (instanceInfo?.disconnectionReasonCode === 401 && 
              instanceInfo?.disconnectionObject?.type === 'device_removed') {
            logService.warn(this.MODULE_NAME, 
              `Instância conectada ${connectedInstance.instanceName} tem erro device_removed, forçando criação de nova instância`
            );
            return null; // Forçar criação de nova instância
          }
          
          logService.info(this.MODULE_NAME, `Instância conectada válida encontrada: ${connectedInstance.instanceName}`);
          return connectedInstance;
        }
        
        // Se não há instância conectada válida, retornar null para forçar criação
        logService.info(this.MODULE_NAME, `Nenhuma instância conectada válida encontrada para ${tenantSlug}, será necessário criar nova`);
        return null;
      }
      
      logService.info(this.MODULE_NAME, `Nenhuma instância encontrada para o tenant ${tenantSlug}`);
      return null;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao buscar instâncias para o tenant ${tenantSlug}:`, error);
      return null;
    }
  }

  /**
   * Obtém informações detalhadas de uma instância do WhatsApp
   */
  getInstanceInfo = async (instanceName: string): Promise<any> => {
    try {
      if (!instanceName) {
        throw new Error('Nome da instância não fornecido');
      }

      logService.info(this.MODULE_NAME, `Obtendo informações da instância: ${instanceName}`);
      
      try {
        // Usar o endpoint de estado de conexão
        const response = await this.callEvolutionApi(`/instance/connectionState/${instanceName}`, 'GET');
        
        if (response) {
          logService.debug(this.MODULE_NAME, 'Informações da instância:', response);
          return response;
        }
      } catch (baseError) {
        logService.warn(this.MODULE_NAME, `Erro ao obter informações básicas, tentando outros endpoints: ${baseError}`);
      }
      
      // Se o primeiro endpoint falhar, tentar com o caminho alternativo
      try {
        const alternativeResponse = await this.callEvolutionApi(`/instance/fetchInstances`, 'GET');
        
        if (alternativeResponse && alternativeResponse.data && Array.isArray(alternativeResponse.data)) {
          const instanceData = alternativeResponse.data.find((i: any) => 
            i.instance === instanceName || i.instanceName === instanceName
          );
          
          if (instanceData) {
            logService.debug(this.MODULE_NAME, 'Informações da instância via fetchInstances:', instanceData);
            return { instance: instanceData };
          }
        }
      } catch (altError) {
        logService.warn(this.MODULE_NAME, `Erro ao obter informações alternativas: ${altError}`);
      }
      
      throw new Error('Não foi possível obter informações da instância por nenhum método');
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao obter informações da instância:', error);
      throw error;
    }
  }

  /**
   * Tenta recuperar uma instância existente para um tenant
   * @param tenantSlug Slug do tenant
   * @param maxRetries Número máximo de tentativas
   * @returns Instância recuperada ou null
   */
  recoverInstance = async (tenantSlug: string, maxRetries: number = 3): Promise<IWhatsAppInstance | null> => {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // 1. Tentar encontrar instância existente
        const existingInstance = await this.findInstanceForTenant(tenantSlug);
        if (existingInstance) {
          logService.info(this.MODULE_NAME, `Instância recuperada para ${tenantSlug}:`, existingInstance);
          return existingInstance;
        }
        
        // 2. Verificar se a instância está apenas desconectada
        const instances = await this.callEvolutionApi('/instance/fetchInstances', 'GET');
        if (instances && Array.isArray(instances.data)) {
          const tenantInstance = instances.data.find((instance: any) => 
            instance.instance && instance.instance.includes(`revalya-${tenantSlug}`)
          );
          
          if (tenantInstance) {
            // Tentar reconectar a instância
            await this.connectInstance(tenantInstance.instance);
            return {
              instanceName: tenantInstance.instance,
              status: 'connecting',
              createdAt: new Date()
            };
          }
        }
        
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s entre tentativas
        }
      } catch (error) {
        logService.error(this.MODULE_NAME, `Tentativa ${retries + 1} falhou:`, error);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    return null;
  }

  /**
   * Verifica e atualiza o status de conexão de uma instância
   */
  verifyAndUpdateStatus = async (instanceName: string): Promise<string> => {
    try {
      if (!instanceName) {
        logService.error(this.MODULE_NAME, 'Nome da instância não fornecido');
        return 'error';
      }

      // 1. Verificar se a instância existe
      const exists = await this.instanceExists(instanceName);
      if (!exists) {
        logService.info(this.MODULE_NAME, `Instância ${instanceName} não encontrada`);
        return 'deleted';
      }

      // 2. Obter status atual
      const status = await this.checkInstanceStatus(instanceName);
      logService.info(this.MODULE_NAME, `Status atual da instância ${instanceName}:`, status);

      // 3. Se estiver desconectado, tentar reconectar
      if (status === 'disconnected') {
        logService.info(this.MODULE_NAME, `Tentando reconectar instância ${instanceName}`);
        await this.connectInstance(instanceName);
        return 'connecting';
      }

      return status;
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao verificar status:', error);
      return 'error';
    }
  }

  /**
   * Obtém o tenant pelo slug
   */
  private getTenantBySlug = async (tenantSlug: string) => {
    try {
      logService.info(this.MODULE_NAME, `Buscando tenant pelo slug: ${tenantSlug}`);
      
      if (!tenantSlug) {
        logService.error(this.MODULE_NAME, 'Slug do tenant não fornecido');
        return null;
      }

      // AIDEV-NOTE: Verificar autenticação antes de consultar o Supabase
      const authCheck = await checkAuthentication();
      if (!authCheck.isAuthenticated) {
        logService.error(this.MODULE_NAME, `Usuário não autenticado: ${authCheck.error}`);
        throw new Error(`Usuário não autenticado: ${authCheck.error}`);
      }

      // AIDEV-NOTE: Executar consulta com proteção de autenticação
      return await executeWithAuth(async () => {
        // AIDEV-NOTE: Primeiro tenta buscar pelo slug exato
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantSlug)
          .single();
        
        if (error) {
          logService.warn(this.MODULE_NAME, `Tenant não encontrado pelo slug exato ${tenantSlug}, erro:`, error);
          
          // AIDEV-NOTE: Se não encontrar pelo slug exato, tenta buscar o primeiro tenant que corresponda
          const { data: tenants, error: likeError } = await supabase
            .from('tenants')
            .select('*')
            .ilike('slug', `%${tenantSlug}%`)
            .limit(1);

          if (likeError || !tenants || tenants.length === 0) {
            logService.error(this.MODULE_NAME, `Nenhum tenant encontrado para o slug ${tenantSlug}`);
            return null;
          }

          const foundTenant = tenants[0];
          
          // AIDEV-NOTE: Configurar contexto de tenant após encontrar
          await supabase.rpc('set_tenant_context_simple', { 
            p_tenant_id: foundTenant.id 
          });

          // AIDEV-NOTE: Log de auditoria para acesso ao tenant
          await logAccess('read', 'tenant_access', foundTenant.id, {
            slug: foundTenant.slug,
            search_method: 'partial_match'
          });

          logService.info(this.MODULE_NAME, `Tenant encontrado por correspondência parcial: ${foundTenant.slug} (ID: ${foundTenant.id})`);
          return foundTenant;
        }
        
        // AIDEV-NOTE: Configurar contexto de tenant após encontrar
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: data.id 
        });

        // AIDEV-NOTE: Log de auditoria para acesso ao tenant
        await logAccess('read', 'tenant_access', data.id, {
          slug: data.slug,
          search_method: 'exact_match'
        });
        
        logService.info(this.MODULE_NAME, `Tenant encontrado: ${data.slug} (ID: ${data.id})`);
        return data;
      }, 3, `getTenantBySlug_${tenantSlug}`);
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao buscar tenant ${tenantSlug}:`, error);
      return null;
    }
  }

  /**
   * Verifica se uma instância existe no Evolution API
   */
  private checkInstanceExists = async (instanceName: string): Promise<boolean> => {
    return this.instanceExists(instanceName);
  }

  /**
   * Atualiza a configuração da instância no Supabase
   */
  private updateInstanceConfig = async (tenantSlug: string, instanceName: string, isActive: boolean) => {
    return this.saveInstanceConfig(tenantSlug, instanceName, isActive);
  }
  
  /**
   * Gerencia uma instância do WhatsApp (criar, conectar, desconectar)
   */
  // AIDEV-NOTE: Método principal para gerenciar instâncias WhatsApp por tenant
  // Garante uma única instância por tenant com nome padronizado
  manageInstance = async (
    tenantSlug: string,
    action: 'create' | 'connect' | 'disconnect'
  ): Promise<{ success: boolean; qrCode?: string; error?: string }> => {
    try {
      // Verificar se o tenant existe
      if (!tenantSlug) {
        logService.error(this.MODULE_NAME, 'Tenant slug não fornecido para gerenciar instância');
        return { success: false, error: 'Tenant não encontrado' };
      }

      const tenant = await this.getTenantBySlug(tenantSlug);
      if (!tenant || !tenant.id) {
        logService.error(this.MODULE_NAME, `Tenant não encontrado para o slug: ${tenantSlug}`);
        return { success: false, error: 'Tenant não encontrado na base de dados' };
      }

      logService.info(this.MODULE_NAME, `Gerenciando instância para tenant ${tenant.id} (${tenantSlug}), ação: ${action}`);

      // Nome padronizado da instância: uma única instância por tenant
      const instanceName = `revalya-${tenantSlug}`;
      const savedInstanceName = await this.getSavedInstanceName(tenantSlug);

      logService.info(this.MODULE_NAME, `Ação solicitada: ${action} para tenant: ${tenantSlug}`);
      logService.info(this.MODULE_NAME, `Nome da instância padrão: ${instanceName}`);
      logService.info(this.MODULE_NAME, `Nome da instância salva anteriormente: ${savedInstanceName || 'nenhuma'}`);

      // Para ação de CRIAR instância
      if (action === 'create') {
        // Verificar se a instância padrão já existe na API
        const instanceExists = await this.instanceExists(instanceName);
        
        if (instanceExists) {
          logService.info(this.MODULE_NAME, `Instância única já existe para ${tenantSlug}: ${instanceName}`);
          
          // Salvar configuração no Supabase se não estiver salva
          if (!savedInstanceName || savedInstanceName !== instanceName) {
            await this.saveInstanceConfig(tenantSlug, instanceName, true);
          }
          
          return { success: true };
        }
        
        // Criar nova instância com nome padronizado
        logService.info(this.MODULE_NAME, `Criando nova instância única para ${tenantSlug}: ${instanceName}`);
        const instance = await this.createInstance(tenantSlug);
        
        // Salvar configuração no Supabase
        await this.saveInstanceConfig(tenantSlug, instance.instanceName, true);
        
        logService.info(this.MODULE_NAME, `Nova instância única criada: ${instance.instanceName}`);
        return { success: true };
      } 
      else if (action === 'connect') {
        // Verificar se a instância padrão existe
        const instanceExists = await this.instanceExists(instanceName);
        
        if (!instanceExists) {
          logService.warn(this.MODULE_NAME, `Instância ${instanceName} não encontrada na API. Criando nova instância.`);
          
          // AIDEV-NOTE: Criar nova instância diretamente sem recursão
          try {
            logService.info(this.MODULE_NAME, `Criando instância ${instanceName} para ${tenantSlug}`);
            const instance = await this.createInstance(tenantSlug);
            
            // Salvar configuração no Supabase
            await this.saveInstanceConfig(tenantSlug, instance.instanceName, true);
            
            logService.info(this.MODULE_NAME, `Instância criada: ${instance.instanceName}`);
            
            // AIDEV-NOTE: Aguardar mais tempo para a API processar a criação (5 segundos)
            logService.info(this.MODULE_NAME, `Aguardando 5 segundos para a API processar a criação da instância...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // AIDEV-NOTE: Verificar múltiplas vezes se a instância foi criada
            let attempts = 0;
            const maxAttempts = 5;
            let newInstanceExists = false;
            
            while (attempts < maxAttempts && !newInstanceExists) {
              attempts++;
              logService.info(this.MODULE_NAME, `Verificando existência da instância (tentativa ${attempts}/${maxAttempts})`);
              
              newInstanceExists = await this.instanceExists(instanceName);
              
              if (!newInstanceExists && attempts < maxAttempts) {
                logService.warn(this.MODULE_NAME, `Instância ainda não existe, aguardando mais 2 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            if (!newInstanceExists) {
              logService.error(this.MODULE_NAME, `Falha ao criar instância ${instanceName} após ${maxAttempts} tentativas`);
              return { success: false, error: 'Falha ao criar instância - instância não foi encontrada após criação' };
            }
            
            logService.info(this.MODULE_NAME, `Instância ${instanceName} criada e verificada com sucesso. Continuando processo de conexão.`);
            
          } catch (createError) {
            logService.error(this.MODULE_NAME, `Erro ao criar instância ${instanceName}:`, createError);
            return { success: false, error: `Erro ao criar instância: ${createError instanceof Error ? createError.message : 'Erro desconhecido'}` };
          }
        }
        
        // Verificar status atual da instância antes de tentar conectar
        const currentStatus = await this.checkInstanceStatus(instanceName);
        logService.info(this.MODULE_NAME, `Status atual da instância ${instanceName}: ${currentStatus}`);
        
        // Se já estiver conectada, não gerar QR Code
        if (currentStatus === 'open' || currentStatus === 'connected') {
          logService.info(this.MODULE_NAME, `Instância ${instanceName} já está conectada (${currentStatus})`);
          // AIDEV-NOTE: Removido saveInstanceConfig - agora é responsabilidade do useWhatsAppToggle
          return { success: true, qrCode: null, error: 'WhatsApp já está conectado' };
        }
        
        logService.info(this.MODULE_NAME, `Tentando conectar à instância: ${instanceName}`);
        
        // Conectar EXPLICITAMENTE antes de gerar QR code
        const connected = await this.connectInstance(instanceName);
        if (!connected) {
          logService.error(this.MODULE_NAME, `Falha ao conectar à instância ${instanceName}`);
          return { success: false, error: 'Falha ao conectar à instância' };
        }
        
        // Fazer uma pequena pausa para permitir que a API processe a conexão
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Gerar QR Code após a conexão - agora com melhor tratamento de formatos
        try {
          logService.info(this.MODULE_NAME, `Solicitando QR Code para ${instanceName}`);
          
          // Primeira tentativa com o método generateQRCode que busca em diferentes locais
          let qrCode = await this.generateQRCode(instanceName);
          
          if (qrCode) {
            logService.debug(this.MODULE_NAME, `QR Code gerado com sucesso para ${instanceName}`);
            
            // AIDEV-NOTE: Verificar se o QR Code é muito grande e validar formato
            if (qrCode.length > 5000) {
              logService.warn(this.MODULE_NAME, `QR Code muito grande (${qrCode.length} caracteres). Verificando formato...`);
              
              // Se for um link do WhatsApp, extrair a parte relevante
              if (qrCode.includes('wa.me/')) {
                const match = qrCode.match(/wa\.me\/([^\/\s]+)/);
                if (match && match[1]) {
                  qrCode = `https://wa.me/${match[1]}`;
                  logService.info(this.MODULE_NAME, `QR Code simplificado para link: ${qrCode}`);
                }
              } else if (qrCode.startsWith('data:image/')) {
                // Para data URLs, verificar se está bem formado
                logService.info(this.MODULE_NAME, `QR Code é uma data URL válida. Mantendo formato original.`);
              } else {
                // Se não é um formato reconhecido e é muito grande, pode haver problema
                logService.error(this.MODULE_NAME, `QR Code em formato não reconhecido e muito grande. Tamanho: ${qrCode.length}`);
              }
            } else if (qrCode.length > 2000) {
              logService.info(this.MODULE_NAME, `QR Code de tamanho médio (${qrCode.length} caracteres). Formato adequado para renderização.`);
            }
            
            // AIDEV-NOTE: Removido monitorConnectionAndSave - agora é responsabilidade do useWhatsAppToggle
            
            return { success: true, qrCode };
          } else {
            // Se o método normal não retornou um QR code, tentar endpoint alternativo
            logService.warn(this.MODULE_NAME, `QR Code não retornado para ${instanceName}. Tentando endpoint alternativo.`);
            
            // Tentar endpoint QR code direto
            const qrResult = await this.callEvolutionApi(`/instance/qrcode/${instanceName}`, 'GET');
            
            if (qrResult) {
              // Tentar extrair o QR code de várias propriedades possíveis
              if (qrResult.qrcode) {
                return { success: true, qrCode: qrResult.qrcode };
              } else if (qrResult.base64) {
                return { success: true, qrCode: qrResult.base64 };
              } else if (typeof qrResult === 'string') {
                return { success: true, qrCode: qrResult };
              }
            }
            
            // Se ainda não temos QR code, verificar info da instância
            const instanceInfo = await this.getInstanceInfo(instanceName);
            if (instanceInfo && instanceInfo.instance && instanceInfo.instance.qrcode) {
              return { success: true, qrCode: instanceInfo.instance.qrcode };
            }
            
            logService.error(this.MODULE_NAME, 'QR Code não encontrado em nenhuma propriedade conhecida');
            return { success: false, error: 'QR Code não disponível' };
          }
        } catch (qrError) {
          logService.error(this.MODULE_NAME, `Erro ao gerar QR Code para ${instanceName}:`, qrError);
          
          // Tentar obter info da instância como última tentativa
          try {
            const instanceInfo = await this.getInstanceInfo(instanceName);
            if (instanceInfo && instanceInfo.instance && instanceInfo.instance.qrcode) {
              return { success: true, qrCode: instanceInfo.instance.qrcode };
            }
          } catch (infoError) {
            logService.error(this.MODULE_NAME, 'Erro ao obter informações da instância:', infoError);
          }
          
          return { success: false, error: 'Erro ao gerar QR Code' };
        }
      } 
      else if (action === 'disconnect') {
        // AIDEV-NOTE: Buscar instâncias existentes para o tenant antes de tentar desconectar
        const existingInstances = await this.findInstancesBySlugPrefix(tenantSlug);
        
        // Verificar se há uma instância salva ou existente
        const instancesToDisconnect = existingInstances.length > 0 
          ? existingInstances 
          : (savedInstanceName ? [{ instanceName: savedInstanceName, status: 'unknown', createdAt: new Date() }] : []);

        if (instancesToDisconnect.length === 0) {
          logService.warn(this.MODULE_NAME, `Nenhuma instância encontrada para desconectar para o tenant: ${tenantSlug}`);
          
          // AIDEV-NOTE: Removido saveInstanceConfig - agora é responsabilidade do useWhatsAppToggle
          return { success: true };
        }
        
        // Desconectar todas as instâncias
        for (const instance of instancesToDisconnect) {
          logService.info(this.MODULE_NAME, `Desconectando e excluindo instância: ${instance.instanceName}`);
          
          // Tentar forçar a exclusão diretamente (pode funcionar mesmo se não conseguir desconectar)
          let deleted = false;
          
          try {
            // Verificar se a instância existe antes de tentar desconectar/excluir
            const exists = await this.instanceExists(instance.instanceName);
            if (!exists) {
              logService.info(this.MODULE_NAME, `Instância ${instance.instanceName} já não existe mais. Nada a fazer.`);
              continue; // Pular para a próxima instância
            }
            
            // Tentar excluir diretamente - este método já inclui várias tentativas
            deleted = await this.deleteInstance(instance.instanceName);
            
            if (deleted) {
              logService.info(this.MODULE_NAME, `Instância ${instance.instanceName} foi excluída com sucesso através do método deleteInstance`);
            } else {
              logService.warn(this.MODULE_NAME, `Potencial problema na exclusão da instância ${instance.instanceName}`);
            }
          } catch (error) {
            logService.error(this.MODULE_NAME, `Erro ao tentar excluir a instância ${instance.instanceName}:`, error);
          }
          
          // Verificação final para garantir que a instância foi removida
          try {
            // Verificar se a instância ainda existe
            const stillExists = await this.instanceExists(instance.instanceName);
            
            if (stillExists) {
              logService.warn(this.MODULE_NAME, `ALERTA: A instância ${instance.instanceName} ainda existe após as tentativas de exclusão`);
              
              // Tentativa final desesperada - excluir via API REST direto
              // Esta é uma abordagem mais drástica, tentando vários métodos HTTP diferentes
              try {
                // Última tentativa com todos os métodos possíveis
                const methods = ['DELETE', 'GET', 'PUT', 'POST'];
                
                for (const method of methods) {
                  try {
                    logService.info(this.MODULE_NAME, `Tentativa desesperada com método ${method}`);
                    await this.callEvolutionApi(`/instance/delete/${instance.instanceName}`, method);
                    
                    // Verificar se funcionou
                    const finalCheck = await this.instanceExists(instance.instanceName);
                    if (!finalCheck) {
                      logService.info(this.MODULE_NAME, `Sucesso! Método ${method} conseguiu excluir a instância ${instance.instanceName}`);
                      break;
                    }
                  } catch (methodError) {
                    logService.warn(this.MODULE_NAME, `Método ${method} falhou:`, methodError);
                  }
                }
              } catch (finalError) {
                logService.error(this.MODULE_NAME, `Todas as tentativas de exclusão falharam para ${instance.instanceName}:`, finalError);
                
                // Última tentativa: desconectar (logout) e depois tentar excluir
                try {
                  logService.info(this.MODULE_NAME, `Tentativa final: logout forçado e depois delete`);
                  await this.callEvolutionApi(`/instance/logout/${instance.instanceName}`, 'DELETE');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  await this.callEvolutionApi(`/instance/delete/${instance.instanceName}`, 'DELETE');
                } catch (lastError) {
                  logService.error(this.MODULE_NAME, `Erro na tentativa final:`, lastError);
                }
              }
            } else {
              logService.info(this.MODULE_NAME, `Verificado: instância ${instance.instanceName} não existe mais`);
            }
          } catch (checkError) {
            logService.warn(this.MODULE_NAME, `Erro ao verificar existência final da instância ${instance.instanceName}:`, checkError);
          }
        }
        
        // AIDEV-NOTE: Removido saveInstanceConfig - agora é responsabilidade do useWhatsAppToggle
        logService.info(this.MODULE_NAME, `Instâncias desconectadas para ${tenantSlug}`);
        return { success: true };
      }
      
      logService.warn(this.MODULE_NAME, `Ação não reconhecida: ${action}`);
      return { success: false, error: 'Ação não reconhecida' };
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao gerenciar instância para ${tenantSlug}:`, error);
      
      // AIDEV-NOTE: Log detalhado do erro para debug
      console.error('[WhatsApp Service] Erro detalhado no manageInstance:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorStack: error instanceof Error ? error.stack : undefined,
        tenantSlug,
        action,
        apiUrl: this.apiUrl,
        hasApiKey: !!this.apiKey,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao gerenciar instância' 
      };
    }
  }

  /**
   * Busca todas as instâncias que correspondem a um determinado prefixo de slug
   */
  findInstancesBySlugPrefix = async (slugPrefix: string): Promise<IWhatsAppInstance[]> => {
    try {
      if (!slugPrefix) {
        logService.error(this.MODULE_NAME, 'Prefixo do slug não fornecido');
        return [];
      }

      logService.info(this.MODULE_NAME, `Buscando instâncias para o tenant com prefixo: ${slugPrefix}`);

      // Buscar todas as instâncias disponíveis
      const response = await this.callEvolutionApi('/instance/fetchInstances', 'GET');
      
      logService.debug(this.MODULE_NAME, `Resposta da API (/instance/fetchInstances):`, response);

      // AIDEV-NOTE: Corrigir lógica de busca - a resposta pode vir em diferentes formatos
      let instances: any[] = [];
      
      if (response && typeof response === 'object') {
        // Se a resposta é um objeto com índices numéricos (como nos logs)
        if (Object.keys(response).some(key => !isNaN(Number(key)))) {
          instances = Object.values(response);
        }
        // Se a resposta tem uma propriedade data
        else if (response.data && Array.isArray(response.data)) {
          instances = response.data;
        }
        // Se a resposta é diretamente um array
        else if (Array.isArray(response)) {
          instances = response;
        }
      }

      logService.debug(this.MODULE_NAME, `Instâncias encontradas:`, instances);

      if (!instances || instances.length === 0) {
        logService.info(this.MODULE_NAME, 'Nenhuma instância encontrada ou formato de resposta inválido');
        return [];
      }

      // AIDEV-NOTE: Busca mais flexível - aceitar instâncias que contenham o slug ou tenham padrões conhecidos
      const matchingInstances = instances
        .filter((instance: any) => {
          if (!instance || !instance.name) return false;
          
          const instanceName = instance.name.toLowerCase();
          const slug = slugPrefix.toLowerCase();
          
          // Padrões de busca mais flexíveis:
          // 1. Nome exato do slug
          // 2. Nome contém o slug
          // 3. Padrão revalya-slug-*
          // 4. Para nexsyn, aceitar instâncias como "suporte", "atendimento", etc.
          const nameMatches = (
            instanceName === slug ||
            instanceName.includes(slug) ||
            instanceName.includes(`revalya-${slug}`) ||
            (slug === 'nexsyn' && ['suporte', 'atendimento', 'nexsyn'].includes(instanceName))
          );

          // AIDEV-NOTE: Validar se a instância não tem erro crítico de desconexão
          if (nameMatches && instance.disconnectionReasonCode) {
            const reasonCode = instance.disconnectionReasonCode;
            const disconnectionType = instance.disconnectionObject?.type;
            
            // Erro 401 com device_removed indica que o dispositivo foi removido do WhatsApp
            // Esta instância não pode ser reutilizada e deve ser ignorada
            if (reasonCode === 401 && disconnectionType === 'device_removed') {
              logService.warn(this.MODULE_NAME, 
                `Instância ${instance.name} ignorada: dispositivo removido do WhatsApp (401 device_removed)`
              );
              return false;
            }
            
            // Outros códigos de erro críticos que impedem reutilização
            if (reasonCode === 401 || reasonCode === 403) {
              logService.warn(this.MODULE_NAME, 
                `Instância ${instance.name} ignorada: erro de autenticação (${reasonCode})`
              );
              return false;
            }
          }

          return nameMatches;
        })
        .map((instance: any) => ({
          instanceName: instance.name,
          status: this.mapConnectionStatus(instance.connectionStatus),
          createdAt: new Date()
        }));

      if (matchingInstances.length > 0) {
        logService.info(this.MODULE_NAME, `Encontradas ${matchingInstances.length} instâncias para o tenant ${slugPrefix}:`);
        matchingInstances.forEach((instance: IWhatsAppInstance) => {
          logService.debug(this.MODULE_NAME, `- ${instance.instanceName} (${instance.status})`);
        });
      } else {
        logService.info(this.MODULE_NAME, `Nenhuma instância encontrada para o tenant ${slugPrefix}`);
      }

      return matchingInstances;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao buscar instâncias para o prefixo ${slugPrefix}:`, error);
      return [];
    }
  }

  // AIDEV-NOTE: Método auxiliar para mapear status de conexão da Evolution API para nossos estados
  private mapConnectionStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'connected';
      case 'close':
      case 'closed':
        return 'disconnected';
      case 'connecting':
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  private getSavedInstanceName = async (tenantSlug: string): Promise<string | null> => {
    try {
      const tenant = await this.getTenantBySlug(tenantSlug);
      if (!tenant || !tenant.id) return null;

      // AIDEV-NOTE: Implementação segura seguindo padrões multi-tenant obrigatórios
      return await executeWithAuth(async () => {
        // 1. VALIDAÇÃO DE TENANT OBRIGATÓRIA
        if (!tenant.id) {
          throw new Error('Tenant ID não definido - violação de segurança');
        }

        // 2. CONFIGURAÇÃO DE CONTEXTO OBRIGATÓRIA
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: tenant.id 
        });

        // 3. QUERY SEGURA COM FILTROS OBRIGATÓRIOS
        const { data: integration, error } = await supabase
          .from('tenant_integrations')
          .select('config')
          .eq('tenant_id', tenant.id)
          .eq('integration_type', 'whatsapp')
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          logService.error(this.MODULE_NAME, `Erro na query tenant_integrations: ${error.message}`);
          throw new Error(`Erro ao consultar integração WhatsApp: ${error.message}`);
        }

        // 4. VALIDAÇÃO DE DADOS RETORNADOS - Permite null quando não há integração
        if (integration && integration.config && typeof integration.config === 'object') {
          const instanceName = integration.config.instance_name;
          
          // 5. LOG DE AUDITORIA OBRIGATÓRIO
          await logAccess(
            'read',
            'whatsapp_integration_config',
            tenant.id,
            { 
              tenantSlug,
              instanceName: instanceName || 'not_found',
              operation: 'getSavedInstanceName'
            }
          );

          return instanceName || null;
        }

        return null;
      }, 2, `getSavedInstanceName_${tenantSlug}`);
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao obter nome da instância salva para ${tenantSlug}:`, error);
      return null;
    }
  }

  private saveInstanceConfig = async (tenantSlug: string, instanceName: string, isActive: boolean) => {
    try {
      // AIDEV-NOTE: Validação de entrada obrigatória
      if (!tenantSlug || !instanceName) {
        const error = 'TenantSlug e instanceName são obrigatórios';
        logService.error(this.MODULE_NAME, error);
        throw new Error(error);
      }

      logService.info(this.MODULE_NAME, `Iniciando saveInstanceConfig para ${tenantSlug}, instância: ${instanceName}, ativo: ${isActive}`);

      // AIDEV-NOTE: CORREÇÃO CRÍTICA - Verificar autenticação e acesso ao tenant ANTES de qualquer operação
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        const error = 'Usuário não autenticado';
        logService.error(this.MODULE_NAME, error);
        throw new Error(error);
      }

      const tenant = await this.getTenantBySlug(tenantSlug);
      if (!tenant || !tenant.id) {
        const error = `Tenant não encontrado para o slug: ${tenantSlug}`;
        logService.error(this.MODULE_NAME, error);
        throw new Error(error);
      }

      // AIDEV-NOTE: CORREÇÃO CRÍTICA - Verificar se o usuário tem acesso ao tenant
      const { data: tenantAccess, error: accessError } = await supabase
        .from('tenant_users')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .single();

      if (accessError || !tenantAccess) {
        const error = `Usuário ${user.email} não tem acesso ao tenant ${tenantSlug}`;
        logService.error(this.MODULE_NAME, error);
        throw new Error(error);
      }

      logService.info(this.MODULE_NAME, `Acesso verificado - Usuário: ${user.email}, Tenant: ${tenantSlug}, Role: ${tenantAccess.role}`);

      // AIDEV-NOTE: Usar executeWithAuth para proteger operação de update no Supabase
      // AIDEV-NOTE: Configurar contexto de tenant obrigatório antes da operação
      await executeWithAuth(async () => {
        // AIDEV-NOTE: CORREÇÃO CRÍTICA - Configuração de contexto com user_id obrigatório
        const { data: contextResult, error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: tenant.id,
          p_user_id: user.id
        });

        if (contextError || !contextResult?.success) {
          const errorMsg = `Erro ao configurar contexto de tenant: ${contextError?.message || 'Contexto não configurado'}`;
          logService.error(this.MODULE_NAME, errorMsg);
          throw new Error(errorMsg);
        }

        logService.info(this.MODULE_NAME, `Contexto de tenant configurado com sucesso: ${tenant.id} para usuário ${user.id}`);

        // AIDEV-NOTE: Verificar se já existe um registro para fazer update ou insert
        const { data: existingIntegration, error: selectError } = await supabase
          .from('tenant_integrations')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('integration_type', 'whatsapp')
          .maybeSingle(); // Usar maybeSingle para evitar erro se não encontrar

        if (selectError) {
          logService.error(this.MODULE_NAME, `Erro ao verificar integração existente:`, selectError);
          throw selectError;
        }

        const configData = {
          instance_name: instanceName,
          api_key: this.apiKey,
          api_url: this.apiUrl,
          environment: 'production'
        };

        logService.info(this.MODULE_NAME, `Config data preparada:`, configData);

        let result;
        
        if (existingIntegration) {
          logService.info(this.MODULE_NAME, `Atualizando integração existente ID: ${existingIntegration.id}`);
          // AIDEV-NOTE: Atualizar registro existente
          result = await supabase
            .from('tenant_integrations')
            .update({
              config: configData,
              is_active: isActive,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant.id)
            .eq('integration_type', 'whatsapp')
            .select();
        } else {
          logService.info(this.MODULE_NAME, `Criando nova integração para tenant: ${tenant.id}`);
          // AIDEV-NOTE: CORREÇÃO CRÍTICA - Criar novo registro com created_by obrigatório
          const insertData = {
            tenant_id: tenant.id,
            integration_type: 'whatsapp' as const,
            config: configData,
            is_active: isActive,
            environment: 'production' as const,
            created_by: user.id, // AIDEV-NOTE: Campo obrigatório para auditoria
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          logService.info(this.MODULE_NAME, `Dados para inserção:`, insertData);

          // AIDEV-NOTE: CORREÇÃO CRÍTICA - Usar .single() para garantir retorno único
          result = await supabase
            .from('tenant_integrations')
            .insert(insertData)
            .select()
            .single();
        }

        if (result.error) {
          logService.error(this.MODULE_NAME, `Erro ao salvar configuração da instância:`, result.error);
          throw result.error;
        }

        logService.info(this.MODULE_NAME, `Resultado da operação:`, result.data);

        // AIDEV-NOTE: Log de auditoria obrigatório para operações críticas
        await logAccess(
          existingIntegration ? 'update' : 'create',
          'whatsapp_instance_config',
          tenant.id,
          {
            instance_name: instanceName,
            is_active: isActive,
            tenant_slug: tenantSlug,
            user_id: user.id,
            user_email: user.email
          }
        );

        logService.info(this.MODULE_NAME, `Configuração da instância ${instanceName} ${existingIntegration ? 'atualizada' : 'criada'} para o tenant ${tenantSlug}`);
      }, 3, `saveInstanceConfig_${tenantSlug}_${instanceName}`);
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao salvar configuração da instância ${instanceName} para ${tenantSlug}:`, error);
      throw error;
    }
  }

  /**
   * Monitora o status de uma instância e salva a configuração quando conectada
   * AIDEV-NOTE: Método para garantir persistência após conexão bem-sucedida
   */
  private monitorConnectionAndSave = async (tenantSlug: string, instanceName: string): Promise<void> => {
    try {
      logService.info(this.MODULE_NAME, `Iniciando monitoramento de conexão para ${instanceName}`);
      
      // Monitorar por até 30 segundos
      const maxAttempts = 30;
      let attempts = 0;
      
      const checkInterval = setInterval(async () => {
        attempts++;
        
        try {
          const status = await this.checkInstanceStatus(instanceName);
          logService.info(this.MODULE_NAME, `Status da instância ${instanceName} (tentativa ${attempts}): ${status}`);
          
          if (status === 'open' || status === 'connected') {
            logService.info(this.MODULE_NAME, `Instância ${instanceName} conectada! Salvando configuração...`);
            
            // Salvar configuração no banco
            await this.saveInstanceConfig(tenantSlug, instanceName, true);
            
            clearInterval(checkInterval);
            logService.info(this.MODULE_NAME, `Configuração salva com sucesso para ${instanceName}`);
            return;
          }
          
          if (attempts >= maxAttempts) {
            logService.warn(this.MODULE_NAME, `Timeout no monitoramento de conexão para ${instanceName}`);
            clearInterval(checkInterval);
          }
        } catch (error) {
          logService.error(this.MODULE_NAME, `Erro ao verificar status da instância ${instanceName}:`, error);
          
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
          }
        }
      }, 1000); // Verificar a cada segundo
      
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro no monitoramento de conexão para ${instanceName}:`, error);
    }
  }

  /**
   * Recupera o nome completo da instância para um tenant, consultando-o no Supabase
   */
  getFullInstanceName = async (tenantSlug: string): Promise<string> => {
    try {
      if (!tenantSlug) {
        logService.error(this.MODULE_NAME, 'TenantSlug não fornecido para getFullInstanceName');
        return '';
      }
      
      // Buscar no Supabase o nome da instância salva
      const savedName = await this.getSavedInstanceName(tenantSlug);
      if (savedName) {
        logService.info(this.MODULE_NAME, `Nome de instância recuperado do banco de dados: ${savedName}`);
        return savedName;
      }
      
      // Verificar se existe alguma instância ativa
      const existingInstance = await this.findInstanceForTenant(tenantSlug);
      if (existingInstance) {
        logService.info(this.MODULE_NAME, `Instância encontrada para o tenant: ${existingInstance.instanceName}`);
        return existingInstance.instanceName;
      }
      
      // Fallback: procurar instâncias pelo prefixo
      const instances = await this.findInstancesBySlugPrefix(tenantSlug);
      if (instances && instances.length > 0) {
        logService.info(this.MODULE_NAME, `Instância encontrada pelo prefixo: ${instances[0].instanceName}`);
        return instances[0].instanceName;
      }
      
      logService.warn(this.MODULE_NAME, `Nenhuma instância encontrada para o tenant ${tenantSlug}`);
      return '';
    } catch (error) {
      logService.error(this.MODULE_NAME, 'Erro ao recuperar nome de instância:', error);
      return '';
    }
  }

  /**
   * Reinicia uma instância do WhatsApp
   * Útil para reconectar quando o WhatsApp é desconectado
   */
  restartInstance = async (instanceName: string): Promise<boolean> => {
    try {
      logService.info(this.MODULE_NAME, `Reiniciando instância: ${instanceName}`);
      
      // Endpoint para reiniciar a instância conforme documentação
      const response = await this.callEvolutionApi(`/instance/restart/${instanceName}`, 'PUT');
      
      logService.info(this.MODULE_NAME, `Resposta ao reiniciar instância ${instanceName}:`, response);
      return true;
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao reiniciar instância ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Verifica o status atual de uma instância WhatsApp
   * AIDEV-NOTE: Método para verificação de status em tempo real
   */
  getInstanceStatus = async (tenantSlug: string, instanceName: string): Promise<{ status: string; isConnected: boolean }> => {
    try {
      logService.info(this.MODULE_NAME, `Verificando status da instância: ${instanceName} para tenant: ${tenantSlug}`);
      
      // AIDEV-NOTE: Chamar endpoint de status da Evolution API
      const response = await this.callEvolutionApi(`/instance/connectionState/${instanceName}`, 'GET');
      
      const status = response?.instance?.state || 'disconnected';
      const isConnected = status === 'open' || status === 'connected';
      
      logService.info(this.MODULE_NAME, `Status da instância ${instanceName}: ${status} (conectado: ${isConnected})`);
      
      return {
        status,
        isConnected
      };
    } catch (error) {
      logService.error(this.MODULE_NAME, `Erro ao verificar status da instância ${instanceName}:`, error);
      return {
        status: 'disconnected',
        isConnected: false
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
