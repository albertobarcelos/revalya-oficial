/**
 * Serviço de Autenticação
 * 
 * Esta camada oferece uma API unificada para autenticação,
 * independentemente do provedor utilizado, e gerencia o estado da sessão.
 * 
 * @module AuthService
 */

import { AuthProviderAdapter, AuthResult, User, Session, authAdapter } from './AuthProviderAdapter';
import { StateManager } from '../state/StateManager';
import { logDebug, logError } from '@/lib/logger';

/**
 * Estado de autenticação gerenciado pelo serviço
 */
export interface AuthState {
  /** Se o usuário está autenticado */
  isAuthenticated: boolean;
  
  /** Se o estado está sendo carregado */
  isLoading: boolean;
  
  /** Dados do usuário autenticado */
  user: User | null;
  
  /** Dados da sessão atual */
  session: Session | null;
  
  /** Último erro ocorrido */
  error: string | null;
}

/**
 * Eventos de autenticação
 */
export enum AuthEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_EXPIRED = 'session_expired',
  ERROR = 'error'
}

/**
 * Configuração para o serviço de autenticação
 */
export interface AuthServiceOptions {
  /** Adaptador de provedor de autenticação */
  adapter?: AuthProviderAdapter;
  
  /** Se deve verificar expiração do token periodicamente */
  checkTokenExpiration?: boolean;
  
  /** Intervalo para verificar expiração do token em milissegundos */
  tokenCheckInterval?: number;
  
  /** Tempo antes da expiração para atualizar o token automaticamente (em segundos) */
  refreshTokenBeforeExpiry?: number;
}

/**
 * Serviço de autenticação com API independente do provedor
 */
export class AuthService {
  private adapter: AuthProviderAdapter;
  private options: Required<AuthServiceOptions>;
  private stateManager: StateManager<AuthState>;
  private tokenCheckIntervalId: number | null = null;
  private listeners = new Map<AuthEventType, Set<(data: any) => void>>();
  
  /**
   * Cria uma nova instância do serviço de autenticação
   * 
   * @param options Opções de configuração
   */
  constructor(options?: AuthServiceOptions) {
    this.options = {
      adapter: authAdapter,
      checkTokenExpiration: true,
      tokenCheckInterval: 60000, // 1 minuto
      refreshTokenBeforeExpiry: 300, // 5 minutos
      ...options
    };
    
    this.adapter = this.options.adapter;
    
    // Criar gerenciador de estado
    this.stateManager = new StateManager<AuthState>(
      {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        session: null,
        error: null
      },
      {
        persistenceKey: 'auth_state',
        ttl: 3600000, // 1 hora
        syncBetweenTabs: false, // Desativado para permitir múltiplos logins em abas diferentes
        useSessionStorage: true
      }
    );
    
    // Inicializar serviço
    this.initialize();
  }
  
  /**
   * Inicializa o serviço e verifica sessão existente
   */
  private async initialize(): Promise<void> {
    try {
      this.updateState({
        isLoading: true,
        error: null
      });
      
      // Verificar se existe sessão ativa
      const result = await this.adapter.getSession();
      
      if (result.success && result.session && result.user) {
        this.updateState({
          isAuthenticated: true,
          user: result.user,
          session: result.session,
          isLoading: false
        });
        
        // Iniciar verificação de token se configurado
        if (this.options.checkTokenExpiration) {
          this.startTokenExpirationCheck();
        }
      } else {
        this.updateState({
          isAuthenticated: false,
          user: null,
          session: null,
          isLoading: false
        });
      }
    } catch (error: any) {
      logError('[AuthService] Erro ao inicializar serviço:', error);
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        session: null,
        isLoading: false,
        error: error.message || 'Erro ao inicializar serviço de autenticação'
      });
    }
    
    // Configurar ouvintes para eventos entre abas
    this.setupBroadcastListeners();
  }
  
  /**
   * Login com email e senha
   * 
   * @param email Email do usuário
   * @param password Senha do usuário
   * @param useBypass Se deve usar método alternativo de login
   * @returns Resultado da operação
   */
  async login(email: string, password: string, useBypass: boolean = false): Promise<AuthResult> {
    this.updateState({
      isLoading: true,
      error: null
    });
    
    try {
      // Usar método padrão ou bypass conforme solicitado
      const result = useBypass 
        ? await this.adapter.loginWithBypass(email, password)
        : await this.adapter.login(email, password);
      
      if (result.success && result.session && result.user) {
        this.updateState({
          isAuthenticated: true,
          user: result.user,
          session: result.session,
          isLoading: false
        });
        
        // Emitir evento de login
        this.emitEvent(AuthEventType.LOGIN, {
          user: result.user,
          timestamp: Date.now()
        });
        
        // Iniciar verificação de token se configurado
        if (this.options.checkTokenExpiration) {
          this.startTokenExpirationCheck();
        }
      } else {
        this.updateState({
          isAuthenticated: false,
          error: result.error || 'Falha no login',
          isLoading: false
        });
        
        // Emitir evento de erro
        if (result.error) {
          this.emitEvent(AuthEventType.ERROR, {
            message: result.error,
            timestamp: Date.now()
          });
        }
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido no login';
      
      this.updateState({
        isAuthenticated: false,
        error: errorMessage,
        isLoading: false
      });
      
      // Emitir evento de erro
      this.emitEvent(AuthEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Logout do usuário
   * 
   * @param notifyOtherTabs Se deve notificar outras abas abertas
   * @returns Resultado da operação
   */
  async logout(notifyOtherTabs: boolean = true): Promise<AuthResult> {
    try {
      this.updateState({
        isLoading: true
      });
      
      // Parar verificação de token
      this.stopTokenExpirationCheck();
      
      const result = await this.adapter.logout(notifyOtherTabs);
      
      this.updateState({
        isAuthenticated: false,
        user: null,
        session: null,
        isLoading: false
      });
      
      // Emitir evento de logout
      this.emitEvent(AuthEventType.LOGOUT, {
        timestamp: Date.now()
      });
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido no logout';
      
      this.updateState({
        error: errorMessage,
        isLoading: false
      });
      
      // Emitir evento de erro
      this.emitEvent(AuthEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Atualiza o token de acesso
   * 
   * @returns Resultado da operação
   */
  async refreshToken(): Promise<AuthResult> {
    try {
      const result = await this.adapter.refreshToken();
      
      if (result.success && result.session) {
        const currentState = this.getState();
        
        this.updateState({
          session: result.session
        });
        
        // Emitir evento de atualização de sessão
        this.emitEvent(AuthEventType.SESSION_REFRESHED, {
          timestamp: Date.now()
        });
      } else if (result.error) {
        // Se não conseguiu atualizar, pode ser que a sessão expirou
        this.updateState({
          error: result.error
        });
        
        // Emitir evento de erro
        this.emitEvent(AuthEventType.ERROR, {
          message: result.error,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido ao atualizar token';
      
      this.updateState({
        error: errorMessage
      });
      
      // Emitir evento de erro
      this.emitEvent(AuthEventType.ERROR, {
        message: errorMessage,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }
  
  /**
   * Obtém o estado atual da autenticação
   * 
   * @returns Estado atual
   */
  getState(): AuthState {
    return this.stateManager.getState();
  }
  
  /**
   * Registra um ouvinte para eventos de autenticação
   * 
   * @param eventType Tipo de evento
   * @param callback Função a ser chamada quando o evento ocorrer
   * @returns Função para remover o ouvinte
   */
  on(eventType: AuthEventType, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  /**
   * Remove um ouvinte de eventos
   * 
   * @param eventType Tipo de evento
   * @param callback Função a ser removida
   */
  off(eventType: AuthEventType, callback: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Destrói a instância e limpa recursos
   */
  destroy(): void {
    this.stopTokenExpirationCheck();
    this.listeners.clear();
  }
  
  /**
   * Obtém o adaptador de provedor de autenticação
   */
  getAdapter(): AuthProviderAdapter {
    return this.adapter;
  }
  
  // Métodos privados
  
  /**
   * Atualiza o estado da autenticação
   * 
   * @param update Atualização parcial do estado
   */
  private updateState(update: Partial<AuthState>): void {
    this.stateManager.setState(update);
  }
  
  /**
   * Inicia verificação periódica de expiração do token
   */
  private startTokenExpirationCheck(): void {
    // Parar verificação anterior se existir
    this.stopTokenExpirationCheck();
    
    // Iniciar nova verificação
    this.tokenCheckIntervalId = window.setInterval(
      () => this.checkTokenExpiration(),
      this.options.tokenCheckInterval
    );
  }
  
  /**
   * Para verificação periódica de expiração do token
   */
  private stopTokenExpirationCheck(): void {
    if (this.tokenCheckIntervalId !== null) {
      clearInterval(this.tokenCheckIntervalId);
      this.tokenCheckIntervalId = null;
    }
  }
  
  /**
   * Verifica se o token está próximo de expirar e atualiza se necessário
   */
  private async checkTokenExpiration(): Promise<void> {
    const state = this.getState();
    
    if (!state.isAuthenticated || !state.session) {
      return;
    }
    
    const session = state.session;
    const now = Math.floor(Date.now() / 1000);
    
    // Calcular tempo até expiração
    const expiresAt = session.expires_at || (now + session.expires_in);
    const timeUntilExpiry = expiresAt - now;
    
    // Verificar se está próximo de expirar
    if (timeUntilExpiry <= this.options.refreshTokenBeforeExpiry) {
      logDebug('[AuthService] Token próximo de expirar, atualizando...');
      
      try {
        await this.refreshToken();
      } catch (error) {
        logError('[AuthService] Erro ao atualizar token:', error);
      }
    } else if (timeUntilExpiry <= 0) {
      // Token já expirou
      logDebug('[AuthService] Token expirado, fazendo logout...');
      
      // Emitir evento de sessão expirada
      this.emitEvent(AuthEventType.SESSION_EXPIRED, {
        timestamp: Date.now()
      });
      
      // Fazer logout
      await this.logout();
    }
  }
  
  /**
   * Configura ouvintes para eventos de autenticação entre abas
   */
  private setupBroadcastListeners(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('auth_events');
        
        channel.addEventListener('message', (event) => {
          const { type, timestamp } = event.data;
          
          if (type === 'logout') {
            logDebug('[AuthService] Recebido evento de logout de outra aba');
            
            // Atualizar estado sem chamar logout para evitar loop
            this.updateState({
              isAuthenticated: false,
              user: null,
              session: null
            });
            
            // Parar verificação de token
            this.stopTokenExpirationCheck();
            
            // Emitir evento local
            this.emitEvent(AuthEventType.LOGOUT, { timestamp });
          }
        });
      } catch (error) {
        logError('[AuthService] Erro ao configurar ouvintes de broadcast:', error);
      }
    }
  }
  
  /**
   * Emite um evento para todos os ouvintes registrados
   * 
   * @param eventType Tipo de evento
   * @param data Dados do evento
   */
  private emitEvent(eventType: AuthEventType, data: any): void {
    const listeners = this.listeners.get(eventType);
    
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          logError(`[AuthService] Erro em ouvinte de evento ${eventType}:`, error);
        }
      }
    }
  }
}

/**
 * Instância global do serviço de autenticação
 */
export const authService = new AuthService();
