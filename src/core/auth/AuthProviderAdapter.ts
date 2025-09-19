/**
 * Adaptador de Provedor de Autenticação
 * 
 * Esta camada isola a lógica específica do provedor de autenticação (Supabase)
 * do resto da aplicação. Isso permite trocar de provedor no futuro sem
 * afetar as camadas superiores.
 * 
 * @module AuthProviderAdapter
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase'; // AIDEV-NOTE: Importa a instância singleton
import { logError, logWarn, logDebug } from '@/lib/logger';

/**
 * Resultado de uma operação de autenticação
 */
export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
  details?: any;
}

/**
 * Dados do usuário autenticado
 */
export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  role?: string;
}

/**
 * Dados da sessão de autenticação
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
}

/**
 * Opções para o adaptador
 */
export interface AuthAdapterOptions {
  /** URL do serviço Supabase */
  supabaseUrl?: string;
  
  /** Chave anônima do Supabase */
  supabaseKey?: string;
  
  /** Cliente Supabase pré-configurado (opcional) */
  supabaseClient?: SupabaseClient;
  
  /** Se deve persistir a sessão entre recargas da página (padrão: true) */
  persistSession?: boolean;
}

/**
 * Adaptador para o Supabase como provedor de autenticação
 */
export class AuthProviderAdapter {
  private client: SupabaseClient;
  private options: AuthAdapterOptions;
  
  /**
   * Cria um novo adaptador para o Supabase
   * 
   * @param options Opções de configuração
   */
  constructor(options?: AuthAdapterOptions) {
    this.options = {
      persistSession: true,
      ...options
    };
    
    // AIDEV-NOTE: Refatorado para usar sempre a instância singleton do Supabase.
    // Isso evita a criação de múltiplos clientes e o conflito de sessões.
    this.client = this.options.supabaseClient || supabase;
  }
  
  /**
   * Login com email e senha
   * 
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Resultado da operação
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      if (!data || !data.session) {
        return {
          success: false,
          error: 'Sessão inválida retornada pelo provedor de autenticação'
        };
      }
      
      // Transformar para formato padronizado
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at
      };
      
      const user: User | null = data.user ? {
        id: data.user.id,
        email: data.user.email || undefined,
        name: data.user.user_metadata?.name,
        avatar: data.user.user_metadata?.avatar_url,
        role: data.user.role
      } : null;
      
      return {
        success: true,
        user,
        session
      };
    } catch (error: any) {
      logError('[AuthProviderAdapter] Erro ao fazer login:', error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao fazer login',
        details: error
      };
    }
  }

  /**
   * Login com método alternativo (bypass para contornar erros do Supabase)
   * 
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Resultado da operação
   */
  async loginWithBypass(email: string, password: string): Promise<AuthResult> {
    try {
      // Chamar API REST diretamente
      const response = await fetch(`${this.options.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.options.supabaseKey || '',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Erro no login',
          details: data
        };
      }

      // Se autenticação teve sucesso, definir a sessão manualmente
      if (data.access_token) {
        // Atualizar o cliente Supabase com a nova sessão
        await this.client.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        
        // Retornar dados padronizados
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name,
            avatar: data.user.user_metadata?.avatar_url,
            role: data.user.role
          },
          session: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in
          }
        };
      }
      
      return {
        success: false,
        error: 'Erro ao processar autenticação',
        details: data
      };
    } catch (error: any) {
      logError('[AuthProviderAdapter] Erro no loginWithBypass:', error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao processar login',
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
      // Notificar outras abas se solicitado
      if (notifyOtherTabs) {
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('auth_events');
            channel.postMessage({ type: 'logout', timestamp: Date.now() });
            setTimeout(() => channel.close(), 100);
          }
        } catch (error) {
          logWarn('[AuthProviderAdapter] Erro ao notificar outras abas sobre logout:', error);
        }
      }
      
      // Limpar o armazenamento local
      this.clearAuthStorage();
      
      // Fazer logout oficial
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        logWarn('[AuthProviderAdapter] Erro ao fazer logout via API:', error);
        return {
          success: true, // Considerar sucesso mesmo com erro, já que limpamos manualmente
          error: error.message,
          details: error
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      logError('[AuthProviderAdapter] Erro ao processar logout:', error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao fazer logout',
        details: error
      };
    }
  }
  
  /**
   * Recupera a sessão atual
   * 
   * @returns Resultado da operação
   */
  async getSession(): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.getSession();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      if (!data || !data.session) {
        return {
          success: false,
          error: 'Nenhuma sessão ativa'
        };
      }
      
      // Transformar para formato padronizado
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at
      };
      
      const user: User | null = data.session.user ? {
        id: data.session.user.id,
        email: data.session.user.email || undefined,
        name: data.session.user.user_metadata?.name,
        avatar: data.session.user.user_metadata?.avatar_url,
        role: data.session.user.role
      } : null;
      
      return {
        success: true,
        user,
        session
      };
    } catch (error: any) {
      logError('[AuthProviderAdapter] Erro ao recuperar sessão:', error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao recuperar sessão',
        details: error
      };
    }
  }
  
  /**
   * Atualiza o token de acesso usando o token de atualização
   * 
   * @returns Resultado da operação
   */
  async refreshToken(): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.refreshSession();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
      
      if (!data || !data.session) {
        return {
          success: false,
          error: 'Falha ao atualizar sessão'
        };
      }
      
      // Transformar para formato padronizado
      const session: Session = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
        expires_at: data.session.expires_at
      };
      
      return {
        success: true,
        session
      };
    } catch (error: any) {
      logError('[AuthProviderAdapter] Erro ao atualizar token:', error);
      
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao atualizar token',
        details: error
      };
    }
  }
  
  /**
   * Obtém o cliente Supabase
   * 
   * @returns Cliente Supabase
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Define o cliente Supabase
   * 
   * @param client Cliente Supabase a ser usado
   */
  setSupabaseClient(client: SupabaseClient): void {
    if (!client) {
      logWarn('[AuthProviderAdapter] Tentativa de definir cliente Supabase nulo');
      return;
    }

    logDebug('[AuthProviderAdapter] Atualizando cliente Supabase');
    this.client = client;
  }
  
  /**
   * Limpa dados de autenticação do armazenamento local
   */
  private clearAuthStorage(): void {
    try {
      // Limpar tokens oficiais do Supabase
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      // Limpar tokens legados
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authExpires');
      localStorage.removeItem('userData');
      
      // Limpar variáveis relacionadas a sessão
      sessionStorage.removeItem('current_session');
      sessionStorage.removeItem('last_activity');
    } catch (error) {
      logError('[AuthProviderAdapter] Erro ao limpar armazenamento local:', error);
    }
  }
}

/**
 * Instância global do adaptador de autenticação
 */
export const authAdapter = new AuthProviderAdapter();
