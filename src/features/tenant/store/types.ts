/**
 * Definições de tipos para o gerenciamento simplificado de tenants
 */

// Representa um tenant no sistema
export interface SimpleTenant {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  logo?: string;
  theme?: TenantTheme;
  user_role?: string; // Papel do usuário no tenant (TENANT_ADMIN, TENANT_USER, etc)
}

// Resposta da RPC get_tenant_by_slug
export interface TenantBySlugResponse {
  tenant_id: string;
  tenant_name: string;
  tenant_active: boolean;
  tenant_slug: string;
  user_role?: string;
  tenant_logo?: string;
  tenant_theme?: string;
}

// Resposta da RPC get_user_tenants
export interface UserTenantResponse {
  id: string;               // ID do tenant
  name: string;             // Nome do tenant
  slug: string;             // Slug do tenant
  active: boolean;          // Se o tenant está ativo
  logo?: string;            // URL do logotipo do tenant
  theme?: TenantTheme;      // Tema personalizado do tenant
  user_role?: string;       // Papel do usuário no tenant (TENANT_ADMIN, TENANT_USER, etc)
}

// Temas disponíveis para os tenants
export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

// Resultado de operações com tenants
export interface TenantResult {
  success: boolean;
  tenant?: SimpleTenant;
  error?: string;
}

// Eventos de tenant que podem ser emitidos
export enum TenantEvent {
  TENANT_CHANGED = 'tenant_changed',
  TENANT_ERROR = 'tenant_error',
  TENANT_LOADED = 'tenant_loaded',
  TENANT_RECOVERED = 'tenant_recovered', // Quando um tenant é recuperado do armazenamento local
  TENANT_INITIALIZED = 'tenant_initialized', // Quando o sistema foi inicializado com sucesso
  TENANT_INACTIVE = 'tenant_inactive', // Quando se tentou acessar um tenant inativo
}

// Informações de contexto do tenant atual
export interface TenantContext {
  tenant: SimpleTenant | null;
  isLoading: boolean;
  error: string | null;
}
