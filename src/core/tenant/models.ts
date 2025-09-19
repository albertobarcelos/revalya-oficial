/**
 * Modelos e tipos para o sistema multi-tenant
 * 
 * Este arquivo define os tipos de dados principais para o sistema
 * de gerenciamento de tenants.
 * 
 * @module TenantModels
 */

/**
 * Representa um tenant (cliente ou organização)
 */
export interface Tenant {
  /** ID único do tenant */
  id: string;
  
  /** Nome do tenant */
  name: string;
  
  /** Slug para URLs */
  slug: string;
  
  /** Se o tenant está ativo */
  active: boolean;
  
  /** URL do logo */
  logo?: string;
  
  /** Data de criação */
  created_at?: string;
  
  /** Data de atualização */
  updated_at?: string;
  
  /** Configurações específicas do tenant */
  settings?: TenantSettings;
  
  /** Metadados adicionais */
  metadata?: Record<string, any>;
}

/**
 * Versão simplificada de tenant para uso em contextos mais leves
 */
export interface SimpleTenant {
  /** ID único do tenant */
  id: string;
  
  /** Nome do tenant */
  name: string;
  
  /** Slug para URLs */
  slug: string;
  
  /** Se o tenant está ativo */
  active: boolean;
  
  /** URL do logo (opcional) */
  logo?: string;
}

/**
 * Configurações específicas de um tenant
 */
export interface TenantSettings {
  /** Cores principais */
  theme?: {
    /** Cor primária */
    primaryColor?: string;
    
    /** Cor secundária */
    secondaryColor?: string;
    
    /** Cor de fundo */
    backgroundColor?: string;
    
    /** Cor de texto */
    textColor?: string;
  };
  
  /** Configurações de funcionalidades */
  features?: {
    /** Se o módulo financeiro está habilitado */
    financialModule?: boolean;
    
    /** Se o módulo de relatórios está habilitado */
    reportsModule?: boolean;
    
    /** Se o módulo de documentos está habilitado */
    documentsModule?: boolean;
    
    /** Se o módulo de comunicações está habilitado */
    communicationsModule?: boolean;
  };
  
  /** Configurações de API */
  api?: {
    /** Se as chamadas de API estão habilitadas */
    enabled?: boolean;
    
    /** Limite de requisições por minuto */
    rateLimit?: number;
  };
  
  /** Outras configurações */
  [key: string]: any;
}

/**
 * Papel do usuário em um tenant
 */
export enum TenantUserRole {
  /** Administrador do tenant */
  ADMIN = 'ADMIN',
  
  /** Usuário regular */
  USER = 'USER',
  
  /** Usuário somente leitura */
  VIEWER = 'VIEWER',
  
  /** Usuário com acesso especial à finanças */
  FINANCE = 'FINANCE'
}

/**
 * Relação entre usuário e tenant
 */
export interface TenantUser {
  /** ID do tenant */
  tenant_id: string;
  
  /** ID do usuário */
  user_id: string;
  
  /** Papel do usuário neste tenant */
  role: TenantUserRole | string;
  
  /** Data de criação */
  created_at?: string;
  
  /** Data de atualização */
  updated_at?: string;
}

/**
 * Convite para um tenant
 */
export interface TenantInvite {
  /** ID único do convite */
  id: string;
  
  /** ID do tenant */
  tenant_id: string;
  
  /** Email do usuário convidado */
  email: string;
  
  /** Papel que o usuário terá quando aceitar */
  role: TenantUserRole | string;
  
  /** ID do usuário que fez o convite */
  invited_by?: string;
  
  /** Status do convite */
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  
  /** Data de criação */
  created_at: string;
  
  /** Data de expiração */
  expires_at?: string;
  
  /** Data em que foi aceito/rejeitado */
  responded_at?: string;
  
  /** Nome do tenant (para exibição) */
  tenant_name?: string;
}

/**
 * Configuração do contexto de tenant
 */
export interface TenantContext {
  /** Tenant atual */
  tenant: SimpleTenant | null;
  
  /** Papel do usuário no tenant atual */
  userRole: TenantUserRole | string | null;
  
  /** Se o contexto está carregando */
  isLoading: boolean;
  
  /** Erro no contexto, se houver */
  error: string | null;
}

/**
 * Resultado de operação relacionada a tenants
 */
export interface TenantResult<T = any> {
  /** Se a operação foi bem-sucedida */
  success: boolean;
  
  /** Dados retornados, se sucesso */
  data?: T;
  
  /** Mensagem de erro, se falha */
  error?: string;
  
  /** Detalhes adicionais */
  details?: any;
}
