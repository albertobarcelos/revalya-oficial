/**
 * Sistema de persistência que armazena o estado do tenant e da autenticação em múltiplos níveis
 * com sincronização entre abas do navegador.
 * 
 * Prioridade de armazenamento: localStorage > sessionStorage > memory
 * 
 * @module PersistenceManager
 */

import { logDebug, logError, logWarn } from '@/lib/logger';

export class PersistenceManager {
  // Chaves para armazenamento de dados
  static storageKeys = {
    tenant: 'app_tenant_context',
    auth: 'app_auth_context',
    lastActivity: 'app_last_activity',
    connectionStatus: 'app_connection_status'
  };

  /**
   * Salva estado com timestamp para TTL e sincroniza entre abas
   * @param key Chave para armazenamento
   * @param data Dados a serem armazenados
   */
  static saveState(key: string, data: any): void {
    try {
      // Salvar com timestamp para TTL
      const payload = {
        data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(payload));
      sessionStorage.setItem(key, JSON.stringify(payload));
      
      // Disparar evento para sincronizar outras abas
      this.broadcastStateChange(key, payload);
      
      logDebug(`[PersistenceManager] Estado salvo: ${key}`);
    } catch (error) {
      logError('[PersistenceManager] Erro ao salvar estado:', error);
    }
  }

  /**
   * Obtém estado do storage com verificação de TTL
   * @param key Chave para busca
   * @param ttlMs Tempo de vida em milissegundos (default: 1 hora)
   * @returns Dados armazenados ou null se expirado/inexistente
   */
  static getState<T>(key: string, ttlMs = 3600000): T | null {
    try {
      // Tentar localStorage primeiro
      const localData = localStorage.getItem(key);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          
          // Verificar se tem a estrutura esperada
          if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'data' in parsed) {
            // Verificar TTL
            if (Date.now() - parsed.timestamp < ttlMs) {
              return parsed.data as T;
            }
          } else if (key === 'tenantId' || key === 'tenantSlug' || key === 'portalType') {
            // Retrocompatibilidade: dados antigos sem wrapper
            // Chaves específicas que podem ter sido salvas diretamente
            return localData as unknown as T;
          }
        } catch (parseError) {
          logWarn('[PersistenceManager] Erro ao fazer parse de dados do localStorage:', parseError);
          // Não retorna, continua para tentar o sessionStorage
        }
      }
      
      // Fallback para sessionStorage
      const sessionData = sessionStorage.getItem(key);
      
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          
          // Verificar se tem a estrutura esperada
          if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'data' in parsed) {
            // Verificar TTL
            if (Date.now() - parsed.timestamp < ttlMs) {
              return parsed.data as T;
            }
          }
        } catch (parseError) {
          logWarn('[PersistenceManager] Erro ao fazer parse de dados do sessionStorage:', parseError);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      logError('[PersistenceManager] Erro ao recuperar estado:', error);
      return null;
    }
  }

  /**
   * Envia mensagem para outras abas via BroadcastChannel
   * 
   * MODIFICADO: NÃO sincroniza alterações de tenant entre abas para permitir
   * que usuários abram diferentes tenants em abas diferentes simultaneamente.
   * 
   * @param key Chave dos dados alterados
   * @param payload Dados alterados
   */
  static broadcastStateChange(key: string, payload: any): void {
    try {
      // IMPORTANTE: NÃO sincronizar mudanças de tenant entre abas!
      // Isso permite que o usuário tenha tenants diferentes em diferentes abas
      if (key === this.storageKeys.tenant || 
          key === 'tenantId' ||
          key === 'tenantSlug' ||
          key === 'portalType') {
        logDebug('[PersistenceManager] Ignorando sincronização de tenant entre abas');
        return; // Não sincronizar tenant entre abas
      }
      
      // Só sincronizar mudanças de estado que não são de tenant (ex: auth.session)
      // Verificar se BroadcastChannel é suportado
      if (typeof BroadcastChannel !== 'undefined') {
        // Usar BroadcastChannel nativo do navegador para comunicação entre abas
        const channel = new BroadcastChannel('app_state_sync');
        channel.postMessage({
          key,
          payload,
          timestamp: Date.now()
        });
        
        // Não fechar o canal imediatamente para permitir que a mensagem seja entregue
        setTimeout(() => {
          try {
            channel.close();
          } catch (closeError) {
            // Ignorar erros ao fechar o canal
          }
        }, 100);
      } else {
        // Fallback para localStorage como mecanismo de comunicação
        const syncKey = `sync_${Date.now()}_${Math.random()}`;
        localStorage.setItem(syncKey, JSON.stringify({
          key,
          payload,
          timestamp: Date.now()
        }));
        
        // Remover após um curto período para evitar poluir o storage
        setTimeout(() => {
          try {
            localStorage.removeItem(syncKey);
          } catch (removeError) {
            // Ignorar erros ao remover
          }
        }, 1000);
      }
    } catch (error) {
      logError('[PersistenceManager] Erro ao sincronizar abas:', error);
    }
  }

  /**
   * Configura escuta para mudanças de estado de outras abas
   * @param callback Função a ser chamada quando houver mudança
   * @returns Função para remover o listener
   */
  static listenForStateChanges(callback: (key: string, data: any) => void): () => void {
    let channel: BroadcastChannel | null = null;
    
    try {
      channel = new BroadcastChannel('app_state_sync');
      
      const handleMessage = (event: MessageEvent) => {
        const { key, payload } = event.data;
        logDebug(`[PersistenceManager] Recebida atualização de outra aba: ${key}`);
        callback(key, payload.data);
      };
      
      channel.addEventListener('message', handleMessage);
      
      // Retornar função para remover listener
      return () => {
        if (channel) {
          channel.removeEventListener('message', handleMessage);
          channel.close();
        }
      };
    } catch (error) {
      logError('[PersistenceManager] Erro ao configurar listener entre abas:', error);
      // Retornar função vazia em caso de erro
      return () => {};
    }
  }

  /**
   * Atualiza timestamp da última atividade do usuário
   */
  static updateLastActivity(): void {
    localStorage.setItem(this.storageKeys.lastActivity, Date.now().toString());
  }

  /**
   * Obtém timestamp da última atividade do usuário
   * @returns Timestamp da última atividade ou 0 se não encontrado
   */
  static getLastActivity(): number {
    const lastActivity = localStorage.getItem(this.storageKeys.lastActivity);
    return lastActivity ? parseInt(lastActivity, 10) : 0;
  }
  
  /**
   * Remove todos os dados de estado
   */
  static clearAllState(): void {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      logDebug('[PersistenceManager] Todos os estados foram limpos');
    } catch (error) {
      logError('[PersistenceManager] Erro ao limpar estados:', error);
    }
  }
}
