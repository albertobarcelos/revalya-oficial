/**
 * Sistema de gerenciamento de estado com persistência
 * 
 * Este sistema permite:
 * - Gerenciamento centralizado de estado com tipagem forte
 * - Persistência automática em múltiplos níveis (memória, localStorage, sessionStorage)
 * - Sistema de observadores para reagir a mudanças
 * - Expiração automática de dados (TTL)
 * 
 * @module StateManager
 */

import { logDebug, logError } from '@/lib/logger';

/**
 * Opções para configurar o StateManager
 */
export interface StateManagerOptions<T> {
  /** Chave para persistência em armazenamento local */
  persistenceKey?: string;
  
  /** Tempo de vida do dado em milissegundos (padrão: 1 hora) */
  ttl?: number;
  
  /** Se deve usar sessionStorage em vez de localStorage */
  useSessionStorage?: boolean;
  
  /** Se deve sincronizar mudanças entre abas */
  syncBetweenTabs?: boolean;
  
  /** Função para serializar o estado (padrão: JSON.stringify) */
  serializer?: (state: T) => string;
  
  /** Função para deserializar o estado (padrão: JSON.parse) */
  deserializer?: (serialized: string) => T;
  
  /** Estratégia de mesclagem para atualizações parciais */
  mergeStrategy?: 'shallow' | 'deep' | ((currentState: T, newState: Partial<T>) => T);
}

/**
 * Evento de mudança de estado
 */
interface StateChangeEvent<T> {
  previousState: T;
  currentState: T;
  changedKeys: Array<keyof T>;
}

/**
 * Embalagem para armazenamento com TTL
 */
interface StorageWrapper<T> {
  data: T;
  timestamp: number;
  version: number;
}

/**
 * Gerenciador de estado com suporte a persistência e sincronização
 */
export class StateManager<T extends object> {
  private state: T;
  private initialState: T;
  private options: Required<StateManagerOptions<T>>;
  private listeners = new Set<(event: StateChangeEvent<T>) => void>();
  private stateVersion = 0;
  private channel: BroadcastChannel | null = null;

  /**
   * Cria uma nova instância do gerenciador de estado
   * 
   * @param initialState Estado inicial
   * @param options Opções de configuração
   */
  constructor(initialState: T, options?: StateManagerOptions<T>) {
    this.initialState = structuredClone(initialState);
    this.state = structuredClone(initialState);
    
    // Definir opções padrão
    this.options = {
      persistenceKey: undefined,
      ttl: 3600000, // 1 hora
      useSessionStorage: false,
      syncBetweenTabs: false,
      serializer: JSON.stringify,
      deserializer: JSON.parse,
      mergeStrategy: 'shallow',
      ...options
    };
    
    // Tentar carregar estado persistido
    if (this.options.persistenceKey) {
      this.loadPersistedState();
    }
    
    // Configurar sincronização entre abas se necessário
    if (this.options.syncBetweenTabs && this.options.persistenceKey) {
      this.setupTabSync();
    }
  }

  /**
   * Obtém o estado atual
   */
  getState(): T {
    return structuredClone(this.state);
  }

  /**
   * Atualiza o estado parcialmente
   * 
   * @param newState Atualização parcial do estado
   */
  setState(newState: Partial<T>): void {
    const previousState = structuredClone(this.state);
    
    // Aplicar estratégia de mesclagem
    if (this.options.mergeStrategy === 'shallow') {
      this.state = { ...this.state, ...newState };
    } else if (this.options.mergeStrategy === 'deep') {
      this.state = this.deepMerge(this.state, newState);
    } else if (typeof this.options.mergeStrategy === 'function') {
      this.state = this.options.mergeStrategy(this.state, newState);
    }
    
    // Determinar quais chaves mudaram
    const changedKeys = Object.keys(newState).filter(
      key => JSON.stringify(previousState[key as keyof T]) !== JSON.stringify(this.state[key as keyof T])
    ) as Array<keyof T>;
    
    // Incrementar versão do estado
    this.stateVersion++;
    
    // Notificar observadores
    if (changedKeys.length > 0) {
      const event = {
        previousState,
        currentState: structuredClone(this.state),
        changedKeys
      };
      
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logError('[StateManager] Erro em listener:', error);
        }
      });
      
      // Persistir estado se configurado
      if (this.options.persistenceKey) {
        this.persistState();
      }
      
      // Sincronizar entre abas se configurado
      if (this.options.syncBetweenTabs && this.channel) {
        try {
          this.channel.postMessage({
            version: this.stateVersion,
            state: this.state,
            timestamp: Date.now()
          });
        } catch (error) {
          logError('[StateManager] Erro ao sincronizar entre abas:', error);
        }
      }
    }
  }

  /**
   * Substitui o estado completamente
   * 
   * @param newState Novo estado completo
   */
  replaceState(newState: T): void {
    const previousState = structuredClone(this.state);
    this.state = structuredClone(newState);
    this.stateVersion++;
    
    const changedKeys = Object.keys(this.state).filter(
      key => JSON.stringify(previousState[key as keyof T]) !== JSON.stringify(this.state[key as keyof T])
    ) as Array<keyof T>;
    
    if (changedKeys.length > 0) {
      const event = {
        previousState,
        currentState: structuredClone(this.state),
        changedKeys
      };
      
      this.listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logError('[StateManager] Erro em listener:', error);
        }
      });
      
      if (this.options.persistenceKey) {
        this.persistState();
      }
      
      if (this.options.syncBetweenTabs && this.channel) {
        try {
          this.channel.postMessage({
            version: this.stateVersion,
            state: this.state,
            timestamp: Date.now()
          });
        } catch (error) {
          logError('[StateManager] Erro ao sincronizar entre abas:', error);
        }
      }
    }
  }

  /**
   * Reseta o estado para o valor inicial
   */
  resetState(): void {
    this.replaceState(structuredClone(this.initialState));
  }

  /**
   * Adiciona um observador para mudanças de estado
   * 
   * @param listener Função a ser chamada quando o estado mudar
   * @returns Função para remover o observador
   */
  subscribe(listener: (event: StateChangeEvent<T>) => void): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove um observador
   * 
   * @param listener Observador a ser removido
   */
  unsubscribe(listener: (event: StateChangeEvent<T>) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Limpa todos os observadores
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Verifica se o estado foi modificado em relação ao inicial
   */
  isDirty(): boolean {
    return JSON.stringify(this.state) !== JSON.stringify(this.initialState);
  }

  /**
   * Destrói a instância e limpa recursos
   */
  destroy(): void {
    this.listeners.clear();
    
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  // Métodos privados

  /**
   * Salva o estado no armazenamento local
   */
  private persistState(): void {
    if (!this.options.persistenceKey) return;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const wrapper: StorageWrapper<T> = {
        data: structuredClone(this.state),
        timestamp: Date.now(),
        version: this.stateVersion
      };
      
      const serialized = this.options.serializer(wrapper as unknown as T);
      storage.setItem(this.options.persistenceKey, serialized);
    } catch (error) {
      logError('[StateManager] Erro ao persistir estado:', error);
    }
  }

  /**
   * Carrega o estado do armazenamento local
   */
  private loadPersistedState(): void {
    if (!this.options.persistenceKey) return;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const serialized = storage.getItem(this.options.persistenceKey);
      
      if (serialized) {
        const wrapper = this.options.deserializer(serialized) as StorageWrapper<T>;
        
        // Verificar validade do timestamp
        if (Date.now() - wrapper.timestamp < this.options.ttl) {
          this.state = wrapper.data;
          this.stateVersion = wrapper.version;
          logDebug(`[StateManager] Estado carregado de ${this.options.useSessionStorage ? 'sessionStorage' : 'localStorage'}`);
        } else {
          // Dados expirados, remover do armazenamento
          storage.removeItem(this.options.persistenceKey);
          logDebug('[StateManager] Dados persistidos expirados, usando estado inicial');
        }
      } else {
        logDebug('[StateManager] Nenhum estado persistido encontrado, usando estado inicial');
      }
    } catch (error) {
      logError('[StateManager] Erro ao carregar estado persistido:', error);
    }
  }

  /**
   * Configura a sincronização entre abas
   */
  private setupTabSync(): void {
    if (!this.options.persistenceKey || !this.options.syncBetweenTabs) return;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(`state_sync_${this.options.persistenceKey}`);
        
        this.channel.addEventListener('message', (event) => {
          const { version, state, timestamp } = event.data;
          
          // Só atualiza se a versão recebida for mais recente
          if (version > this.stateVersion) {
            logDebug('[StateManager] Recebido estado mais recente de outra aba');
            this.state = state;
            this.stateVersion = version;
            
            const event: StateChangeEvent<T> = {
              previousState: this.state,
              currentState: state,
              changedKeys: Object.keys(state) as Array<keyof T>
            };
            
            this.listeners.forEach(listener => {
              try {
                listener(event);
              } catch (error) {
                logError('[StateManager] Erro em listener durante sincronização:', error);
              }
            });
          }
        });
      } else {
        logWarn('[StateManager] BroadcastChannel não suportado, sincronização entre abas desativada');
      }
    } catch (error) {
      logError('[StateManager] Erro ao configurar sincronização entre abas:', error);
    }
  }

  /**
   * Executa uma mesclagem profunda de objetos
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Verifica se um valor é um objeto
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

/**
 * Cria um hook React para usar com o StateManager
 */
export function createStateHook<T extends object>(stateManager: StateManager<T>) {
  return function useStateManager(): [T, (update: Partial<T>) => void, StateManager<T>] {
    const [state, setState] = useState<T>(stateManager.getState());
    
    useEffect(() => {
      // Sincronizar estado inicial
      setState(stateManager.getState());
      
      // Inscrever para atualizações
      const unsubscribe = stateManager.subscribe((event) => {
        setState(event.currentState);
      });
      
      // Cleanup
      return () => {
        unsubscribe();
      };
    }, []);
    
    const updateState = useCallback((update: Partial<T>) => {
      stateManager.setState(update);
    }, []);
    
    return [state, updateState, stateManager];
  };
}

// Adicionar imports necessários
import { useState, useEffect, useCallback } from 'react';
import { logWarn } from '@/lib/logger';
