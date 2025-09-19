/**
 * TenantSessionManager - Gerenciador de Sessões Multi-Tenant
 * 
 * Inspirado na arquitetura da Omie ("orbi-pixel"), gerencia sessões de refresh tokens
 * armazenadas no localStorage com chave composta: user::email::tenant-slug
 */

import { supabase } from '@/lib/supabase';

export interface TenantSession {
  tenantId: string;
  tenantSlug: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: number; // timestamp do refresh token
  userId: string;
  userEmail: string;
  lastAccess: number; // timestamp
}

export interface TenantData {
  id: string;
  slug: string;
  name: string;
}

/**
 * Gerenciador central de sessões de tenant inspirado no "orbi-pixel" da Omie
 * 
 * Estrutura localStorage: "revalya_tenant_profiles"
 * {
 *   "user123::email@domain.com::tenant-slug": {
 *     tenantId: "uuid",
 *     tenantSlug: "slug", 
 *     refreshToken: "jwt...",
 *     accessToken: "jwt...",
 *     expiresAt: timestamp,
 *     userId: "uuid",
 *     userEmail: "email",
 *     lastAccess: timestamp
 *   }
 * }
 */
export class TenantSessionManager {
  private static readonly STORAGE_KEY = 'revalya_tenant_profiles';
  private static readonly CURRENT_SESSION_KEY = 'current_tenant_session';

  /**
   * Gera chave composta para sessão: user::email::tenant-slug
   */
  private static generateSessionKey(userId: string, userEmail: string, tenantSlug: string): string {
    return `${userId}::${userEmail}::${tenantSlug}`;
  }

  /**
   * Obtém todas as sessões de tenant do localStorage
   */
  static getAllSessions(): Record<string, TenantSession> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao ler sessões:', error);
      return {};
    }
  }

  /**
   * Salva sessão de tenant no localStorage
   */
  static saveTenantSession(session: TenantSession): void {
    try {
      const sessions = this.getAllSessions();
      const sessionKey = this.generateSessionKey(session.userId, session.userEmail, session.tenantSlug);
      
      sessions[sessionKey] = {
        ...session,
        lastAccess: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao salvar sessão:', error);
    }
  }

  /**
   * Obtém sessão específica de um tenant
   */
  static getTenantSession(userId: string, userEmail: string, tenantSlug: string): TenantSession | null {
    try {
      const sessions = this.getAllSessions();
      const sessionKey = this.generateSessionKey(userId, userEmail, tenantSlug);
      return sessions[sessionKey] || null;
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao obter sessão:', error);
      return null;
    }
  }

  /**
   * Remove sessão de tenant específico
   */
  static removeTenantSession(userId: string, userEmail: string, tenantSlug: string): void {
    try {
      const sessions = this.getAllSessions();
      const sessionKey = this.generateSessionKey(userId, userEmail, tenantSlug);
      
      delete sessions[sessionKey];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      
      // Se era a sessão atual, limpar também
      const currentSlug = sessionStorage.getItem(this.CURRENT_SESSION_KEY);
      if (currentSlug === tenantSlug) {
        this.clearCurrentSession();
      }
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao remover sessão:', error);
    }
  }

  /**
   * Obtém todas as sessões de um usuário específico
   */
  static getAllUserSessions(userId: string, userEmail: string): TenantSession[] {
    try {
      const sessions = this.getAllSessions();
      const userPrefix = `${userId}::${userEmail}::`;
      
      return Object.entries(sessions)
        .filter(([key]) => key.startsWith(userPrefix))
        .map(([, session]) => session);
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao obter sessões do usuário:', error);
      return [];
    }
  }

  /**
   * Limpa sessões expiradas automaticamente
   */
  static clearExpiredSessions(): number {
    try {
      const sessions = this.getAllSessions();
      let removedCount = 0;
      let hasChanges = false;

      Object.entries(sessions).forEach(([key, session]) => {
        if (this.isTokenExpired(session.expiresAt)) {
          delete sessions[key];
          removedCount++;
          hasChanges = true;
          console.log(`[TenantSessionManager] Sessão expirada removida: ${session.tenantSlug}`);
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        console.log(`[TenantSessionManager] ${removedCount} sessões expiradas removidas`);
      }

      return removedCount;
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  /**
   * Limpa sessões antigas (mais de 30 dias sem acesso)
   */
  static clearOldSessions(): number {
    try {
      const sessions = this.getAllSessions();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let removedCount = 0;
      let hasChanges = false;

      Object.entries(sessions).forEach(([key, session]) => {
        if (session.lastAccess < thirtyDaysAgo) {
          delete sessions[key];
          removedCount++;
          hasChanges = true;
          console.log(`[TenantSessionManager] Sessão antiga removida: ${session.tenantSlug}`);
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        console.log(`[TenantSessionManager] ${removedCount} sessões antigas removidas`);
      }

      return removedCount;
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao limpar sessões antigas:', error);
      return 0;
    }
  }

  /**
   * Executa limpeza completa (expiradas + antigas)
   */
  static performCleanup(): { expired: number; old: number } {
    const expiredCount = this.clearExpiredSessions();
    const oldCount = this.clearOldSessions();
    
    return {
      expired: expiredCount,
      old: oldCount
    };
  }

  /**
   * Inicia limpeza automática em intervalos regulares
   */
  static startAutoCleanup(): void {
    // Executar limpeza a cada 1 hora
    setInterval(() => {
      const result = this.performCleanup();
      if (result.expired > 0 || result.old > 0) {
        console.log(`[TenantSessionManager] Limpeza automática: ${result.expired} expiradas, ${result.old} antigas`);
      }
    }, 60 * 60 * 1000); // 1 hora

    // Executar limpeza inicial
    setTimeout(() => {
      this.performCleanup();
    }, 5000); // 5 segundos após inicialização
  }

  /**
   * Verifica se token está expirado
   */
  static isTokenExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }

  /**
   * Define sessão atual da aba
   */
  static setCurrentSession(tenantSlug: string): void {
    try {
      sessionStorage.setItem(this.CURRENT_SESSION_KEY, tenantSlug);
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao definir sessão atual:', error);
    }
  }

  /**
   * Obtém sessão atual da aba
   */
  static getCurrentSession(): string | null {
    try {
      return sessionStorage.getItem(this.CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao obter sessão atual:', error);
      return null;
    }
  }

  /**
   * Limpa sessão atual da aba
   */
  static clearCurrentSession(): void {
    try {
      sessionStorage.removeItem(this.CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao limpar sessão atual:', error);
    }
  }

  /**
   * Limpa todas as sessões (logout completo)
   */
  static clearAllSessions(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.clearCurrentSession();
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao limpar todas as sessões:', error);
    }
  }

  /**
   * Obtém token do usuário autenticado do Supabase
   */
  static async getUserToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('[TenantSessionManager] Erro ao obter token do usuário:', error);
      return null;
    }
  }

  /**
   * Cria nova sessão de tenant via Edge Function v3
   */
  static async createTenantSession(tenantId: string, tenantSlug: string, userId: string, userEmail: string): Promise<TenantSession | null> {
    try {
      // Obter token do usuário autenticado
      const userToken = await this.getUserToken();
      if (!userToken) {
        throw new Error('Token de usuário não encontrado');
      }

      // Chamar Edge Function v3 para criar sessão
      const { data, error } = await supabase.functions.invoke('create-tenant-session-v3', {
        body: {
          tenantId,
          tenantSlug,
          userId,
          userEmail
        },
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });

      if (error || !data) {
        console.error('[TenantSessionManager] Erro ao criar sessão:', error);
        throw new Error(error?.message || 'Falha ao criar sessão');
      }

      // Criar objeto de sessão
      const session: TenantSession = {
        tenantId,
        tenantSlug,
        refreshToken: data.refreshToken,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        userId,
        userEmail,
        lastAccess: Date.now()
      };

      // Salvar no localStorage
      this.saveTenantSession(session);

      // Definir como sessão atual da aba
      this.setCurrentSession(tenantSlug);

      return session;

    } catch (error) {
      console.error('[TenantSessionManager] Erro ao criar sessão de tenant:', error);
      return null;
    }
  }

  /**
   * Renova access token usando refresh token v3
   */
  static async refreshAccessToken(userId: string, userEmail: string, tenantSlug: string): Promise<boolean> {
    try {
      const session = this.getTenantSession(userId, userEmail, tenantSlug);
      if (!session) {
        return false;
      }

      // Verificar se refresh token não expirou
      if (this.isTokenExpired(session.expiresAt)) {
        this.removeTenantSession(userId, userEmail, tenantSlug);
        return false;
      }

      // Chamar Edge Function v3 para renovar token
      const { data, error } = await supabase.functions.invoke('refresh-tenant-token-v3', {
        body: {
          refreshToken: session.refreshToken,
          tenantSlug: tenantSlug
        }
      });

      if (error || !data) {
        console.error('[TenantSessionManager] Erro na renovação:', error);
        return false;
      }

      // Atualizar sessão com novo access token
      const updatedSession: TenantSession = {
        ...session,
        accessToken: data.accessToken,
        lastAccess: Date.now()
      };

      // Se houver rotação de refresh token, atualizar também
      if (data.refreshToken) {
        updatedSession.refreshToken = data.refreshToken;
      }

      this.saveTenantSession(updatedSession);
      return true;

    } catch (error) {
      console.error('[TenantSessionManager] Erro ao renovar access token:', error);
      return false;
    }
  }

}
