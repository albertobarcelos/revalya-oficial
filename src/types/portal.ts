/**
 * Tipos relacionados ao portal e tenant
 */

/**
 * Tipo de portal que o usuário pode acessar
 */
export type PortalType = 'admin' | 'reseller' | 'tenant' | 'unknown';

/**
 * Interface que define um tenant
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
  reseller_id?: string;
  features?: Record<string, boolean>;
  subscription?: {
    status: 'active' | 'trial' | 'expired' | 'canceled';
    expiration_date?: string;
    trial_ends_at?: string;
  };
}

/**
 * Interface para usuário de tenant
 */
export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Informações sobre o convite para um tenant
 */
export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}
