/**
 * Sistema de gerenciamento de tokens por aba
 * Implementa isolamento completo usando sessionStorage
 */

// Interface para o token armazenado
export interface TenantToken {
  tenant_id: string;
  tenant_slug: string;
  token: any; 
  timestamp: number;
}

// Chaves para armazenamento
const STORAGE_KEYS = {
  TENANT_TOKEN: 'tenant_token',
  TENANT_DATA: 'tenant_data',
  SESSION_ID: 'session_id'
};

// Gerar um ID de sessão único para esta aba
const generateSessionId = (): string => {
  const existingId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
  
  if (existingId) {
    return existingId;
  }
  
  // Criar um ID único baseado em timestamp e número aleatório
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  
  return sessionId;
};

// ID da sessão atual (específico desta aba)
const SESSION_ID = generateSessionId();

/**
 * Gerenciador de tokens para sistema multi-tenant com isolamento por aba
 */
export const tokenManager = {
  // Armazenar token na sessão atual
  storeToken(tenantId: string, tenantSlug: string, token: any): boolean {
    try {
      const tokenData: TenantToken = {
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        token,
        timestamp: Date.now()
      };
      
      // Salvar no sessionStorage (escopo por aba)
      sessionStorage.setItem(STORAGE_KEYS.TENANT_TOKEN, JSON.stringify(tokenData));
      
      console.log(`[TokenManager] Token armazenado para tenant ${tenantSlug} na sessão ${SESSION_ID}`);
      
      return true;
    } catch (error) {
      console.error('[TokenManager] Erro ao salvar token:', error);
      return false;
    }
  },
  
  // Obter token da sessão atual
  getToken(): TenantToken | null {
    try {
      const tokenData = sessionStorage.getItem(STORAGE_KEYS.TENANT_TOKEN);
      if (!tokenData) return null;
      
      return JSON.parse(tokenData);
    } catch (error) {
      console.error('[TokenManager] Erro ao recuperar token:', error);
      return null;
    }
  },
  
  // Verificar se o token está expirado (8 horas)
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    // Verificar se o token tem mais de 8 horas
    const tokenAgeMs = Date.now() - token.timestamp;
    const maxAgeMs = 8 * 60 * 60 * 1000; // 8 horas
    
    // Log para auxiliar no diagnóstico do problema de expiração
    if (tokenAgeMs > maxAgeMs) {
      console.log('[TokenManager] Token expirado. Idade do token:', Math.round(tokenAgeMs / (60 * 1000)), 'minutos');
    }
    
    return tokenAgeMs > maxAgeMs;
  },
  
  // Obter cabeçalho de autorização
  getAuthHeader(): Record<string, string> | undefined {
    const token = this.getToken();
    if (!token || this.isTokenExpired()) return undefined;
    
    // Usar o token diretamente como Bearer
    return { Authorization: `Bearer ${token.token}` };
  },
  
  // Obter tenant atual
  getCurrentTenant(): { id: string; slug: string } | null {
    const token = this.getToken();
    if (!token) return null;
    
    return { 
      id: token.tenant_id,
      slug: token.tenant_slug
    };
  },
  
  // Armazenar dados adicionais do tenant
  storeTenantData(data: Record<string, any>): boolean {
    try {
      sessionStorage.setItem(STORAGE_KEYS.TENANT_DATA, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[TokenManager] Erro ao salvar dados do tenant:', error);
      return false;
    }
  },
  
  // Obter dados adicionais do tenant
  getTenantData<T = Record<string, any>>(): T | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.TENANT_DATA);
      if (!data) return null;
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[TokenManager] Erro ao recuperar dados do tenant:', error);
      return null;
    }
  },
  
  // Limpar token e dados
  clearSession(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.TENANT_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TENANT_DATA);
      
      console.log(`[TokenManager] Sessão ${SESSION_ID} limpa`);
    } catch (error) {
      console.error('[TokenManager] Erro ao limpar sessão:', error);
    }
  },
  
  // Verificar se a sessão está ativa
  isSessionActive(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  },
  
  // Obter ID da sessão (para depuração)
  getSessionId(): string {
    return SESSION_ID;
  }
};
