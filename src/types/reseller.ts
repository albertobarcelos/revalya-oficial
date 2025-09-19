// Tipos relacionados a revendedores

/**
 * Interface que define um relacionamento entre revendedor e usuário
 */
export interface ResellerUser {
  id: string;
  user_id: string;
  reseller_id: string;
  role: 'RESELLER_ADMIN' | 'RESELLER_USER';
  created_at: string;
  updated_at?: string;
  
  // Relações expandidas (quando incluídas nas consultas)
  user?: {
    email: string;
    last_sign_in_at?: string;
  };
  reseller?: {
    name: string;
    corporate_id: string;
  };
}

/**
 * Interface que define um log de auditoria para alterações em revendedores_usuários
 */
export interface AuditResellerUser {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  old_data?: any;
  new_data?: any;
  performed_by: string;
  performed_at: string;
}

/**
 * Metadados para ações customizadas
 */
export interface CustomActionMetadata {
  action_type: string;
  metadata: Record<string, any>;
  performed_at: string;
}
