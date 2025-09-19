/**
 * Cliente HTTP com suporte a autenticação por tenant usando Bearer token
 * Implementa o padrão de sessionStorage por aba para isolamento completo
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Interface para o token armazenado
interface TenantToken {
  tenant_id: string;
  tenant_slug: string;
  token: any; 
  timestamp: number;
}

// Configuração do cliente
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Gerenciador de token por aba
const tokenManager = {
  // Obter token da sessão atual (específica desta aba)
  getToken(): TenantToken | null {
    try {
      const tokenData = sessionStorage.getItem('tenant_token');
      if (!tokenData) return null;
      
      return JSON.parse(tokenData);
    } catch (error) {
      console.error('Erro ao recuperar token do tenant:', error);
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
      console.log('[ApiClient] Token expirado. Idade do token:', Math.round(tokenAgeMs / (60 * 1000)), 'minutos');
    }
    
    return tokenAgeMs > maxAgeMs;
  },
  
  // Obter cabeçalho de autorização
  getAuthHeader(): Record<string, string> | undefined {
    const token = this.getToken();
    if (!token || this.isTokenExpired()) return undefined;
    
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
  }
};

// Classe principal do cliente API
class ApiClient {
  private client: AxiosInstance;
  
  constructor(config: ApiClientConfig = {}) {
    // Criar instância do Axios com configuração básica
    this.client = axios.create({
      baseURL: config.baseURL || '/api',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });
    
    // Interceptor de requisição para adicionar o token
    this.client.interceptors.request.use(
      (config) => {
        // Adicionar cabeçalho de autorização se disponível
        const authHeader = tokenManager.getAuthHeader();
        if (authHeader) {
          config.headers = {
            ...config.headers,
            ...authHeader
          };
        }
        
        // Adicionar tenant_id como query param para edge functions
        const tenant = tokenManager.getCurrentTenant();
        if (tenant && config.url) {
          const url = new URL(
            config.url.startsWith('http') 
              ? config.url 
              : `${config.baseURL || ''}${config.url}`
          );
          
          if (!url.searchParams.has('tenant_id')) {
            url.searchParams.append('tenant_id', tenant.id);
          }
          
          // Atualizar a URL com o parâmetro adicionado
          if (config.url.startsWith('http')) {
            config.url = url.toString();
          } else {
            config.url = `${url.pathname}${url.search}${url.hash}`;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Interceptor de resposta para tratar erros comuns
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Tratar erro 401 (não autorizado)
        if (error.response?.status === 401) {
          console.error('Sessão expirada ou inválida');
          // Redirecionar para a seleção de portal para obter novo token
          window.location.href = '/meus-aplicativos';
          return Promise.reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Métodos de requisição
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }
  
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
  
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }
  
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
  
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
  
  // Métodos auxiliares
  getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }
  
  getToken(): TenantToken | null {
    return tokenManager.getToken();
  }
  
  getCurrentTenant(): { id: string; slug: string } | null {
    return tokenManager.getCurrentTenant();
  }
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !tokenManager.isTokenExpired();
  }
}

// Exportar uma instância singleton
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

// Exportar a classe para casos de uso específicos
export { ApiClient, tokenManager };
