export type Database = {
  public: {
    Tables: {
      message_history: {
        Row: {
          id: string;
          charge_id: string;
          template_id: string;
          sent_at: string;
          status: 'success' | 'error';
          error_message?: string;
          message_content: string;
          customer_name: string;
          customer_phone: string;
        };
        Insert: {
          id?: string;
          charge_id: string;
          template_id: string;
          sent_at: string;
          status: 'success' | 'error';
          error_message?: string;
          message_content: string;
          customer_name: string;
          customer_phone: string;
        };
        Update: {
          id?: string;
          charge_id?: string;
          template_id?: string;
          sent_at?: string;
          status?: 'success' | 'error';
          error_message?: string;
          message_content?: string;
          customer_name?: string;
          customer_phone?: string;
        };
      };
      // Tabelas do sistema financeiro
      financial_calculations: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          calculation_type: string;
          input_data: any;
          result_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          calculation_type: string;
          input_data: any;
          result_data: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          calculation_type?: string;
          input_data?: any;
          result_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      digital_contracts: {
        Row: {
          id: string;
          tenant_id: string;
          contract_number: string;
          title: string;
          description?: string;
          contract_type: string;
          status: string;
          start_date: string;
          end_date?: string;
          value: number;
          currency: string;
          payment_terms: any;
          parties: any;
          clauses: any;
          metadata: any;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contract_number: string;
          title: string;
          description?: string;
          contract_type: string;
          status: string;
          start_date: string;
          end_date?: string;
          value: number;
          currency: string;
          payment_terms: any;
          parties: any;
          clauses: any;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          contract_number?: string;
          title?: string;
          description?: string;
          contract_type?: string;
          status?: string;
          start_date?: string;
          end_date?: string;
          value?: number;
          currency?: string;
          payment_terms?: any;
          parties?: any;
          clauses?: any;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      financial_reports: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          report_type: string;
          parameters: any;
          data: any;
          format: string;
          status: string;
          file_url?: string;
          scheduled: boolean;
          schedule_config?: any;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          report_type: string;
          parameters: any;
          data?: any;
          format: string;
          status: string;
          file_url?: string;
          scheduled?: boolean;
          schedule_config?: any;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          report_type?: string;
          parameters?: any;
          data?: any;
          format?: string;
          status?: string;
          file_url?: string;
          scheduled?: boolean;
          schedule_config?: any;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      financial_notifications: {
        Row: {
          id: string;
          tenant_id: string;
          user_id?: string;
          type: string;
          title: string;
          message: string;
          priority: string;
          channels: string[];
          status: string;
          scheduled_for?: string;
          sent_at?: string;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string;
          type: string;
          title: string;
          message: string;
          priority: string;
          channels: string[];
          status: string;
          scheduled_for?: string;
          sent_at?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          priority?: string;
          channels?: string[];
          status?: string;
          scheduled_for?: string;
          sent_at?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id?: string;
          action: string;
          resource_type: string;
          resource_id?: string;
          old_values?: any;
          new_values?: any;
          ip_address?: string;
          user_agent?: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string;
          action: string;
          resource_type: string;
          resource_id?: string;
          old_values?: any;
          new_values?: any;
          ip_address?: string;
          user_agent?: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          old_values?: any;
          new_values?: any;
          ip_address?: string;
          user_agent?: string;
          metadata?: any;
          created_at?: string;
        };
      };
    };
  };
};

// Configurações do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validação das variáveis de ambiente
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL é obrigatória');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY é obrigatória');
}

// NOTA: As instâncias do cliente Supabase foram movidas para src/lib/supabase.ts
// para evitar múltiplas instâncias. Use sempre:
// import { supabase, supabaseAdmin } from '@/lib/supabase';

// Validação das variáveis de ambiente (mantida para compatibilidade)
export const validateSupabaseConfig = () => {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL é obrigatória');
  }
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY é obrigatória');
  }
  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

// Exportar as variáveis para uso em outros lugares se necessário
export { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };

// Configurações de autenticação
export const authConfig = {
  // Provedores OAuth habilitados
  providers: {
    google: {
      enabled: true,
      scopes: 'openid email profile'
    },
    github: {
      enabled: true,
      scopes: 'user:email'
    },
    microsoft: {
      enabled: false,
      scopes: 'openid email profile'
    },
    facebook: {
      enabled: false,
      scopes: 'email'
    }
  },
  
  // Configurações de sessão
  session: {
    expiryMargin: 60, // segundos antes da expiração para renovar
    refreshThreshold: 300, // segundos antes da expiração para mostrar aviso
    maxRetries: 3 // tentativas de renovação
  },
  
  // URLs de redirecionamento
  redirectUrls: {
    signIn: '/dashboard',
    signOut: '/login',
    emailConfirmation: '/auth/confirm',
    passwordReset: '/auth/reset-password'
  },
  
  // Configurações de segurança
  security: {
    requireEmailConfirmation: true,
    enableMFA: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    maxLoginAttempts: 5,
    lockoutDuration: 900 // 15 minutos em segundos
  }
};

// Configurações de RLS (Row Level Security)
export const rlsConfig = {
  // Políticas padrão
  defaultPolicies: {
    enableSelect: true,
    enableInsert: true,
    enableUpdate: true,
    enableDelete: false // Por padrão, delete é restrito
  },
  
  // Roles e permissões
  roles: {
    admin: {
      permissions: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      tables: ['*']
    },
    manager: {
      permissions: ['SELECT', 'INSERT', 'UPDATE'],
      tables: ['digital_contracts', 'financial_calculations', 'financial_reports', 'financial_notifications']
    },
    user: {
      permissions: ['SELECT', 'INSERT'],
      tables: ['financial_calculations', 'financial_notifications']
    },
    readonly: {
      permissions: ['SELECT'],
      tables: ['financial_reports', 'audit_logs']
    }
  },
  
  // Configurações de tenant
  multiTenant: {
    enabled: true,
    columnName: 'tenant_id',
    enforceIsolation: true
  }
};

// Configurações de storage
export const storageConfig = {
  buckets: {
    documents: {
      name: 'documents',
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 100
    },
    reports: {
      name: 'reports',
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 1000
    },
    avatars: {
      name: 'profile-avatars',
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ],
      maxFileSize: 2 * 1024 * 1024, // 2MB
      maxFiles: 1
    }
  },
  
  // Configurações de upload
  upload: {
    chunkSize: 1024 * 1024, // 1MB chunks
    retryAttempts: 3,
    retryDelay: 1000, // 1 segundo
    enableProgressTracking: true
  }
};

// Configurações de realtime
export const realtimeConfig = {
  channels: {
    financial_notifications: {
      enabled: true,
      events: ['INSERT', 'UPDATE', 'DELETE'],
      filters: 'user_id=eq.{user_id}'
    },
    audit_logs: {
      enabled: true,
      events: ['INSERT'],
      filters: 'tenant_id=eq.{tenant_id}'
    },
    digital_contracts: {
      enabled: true,
      events: ['INSERT', 'UPDATE'],
      filters: 'tenant_id=eq.{tenant_id}'
    },
    financial_calculations: {
      enabled: false, // Desabilitado por padrão para evitar spam
      events: ['INSERT'],
      filters: 'user_id=eq.{user_id}'
    }
  },
  
  // Configurações de conexão
  connection: {
    heartbeatIntervalMs: 30000, // 30 segundos
    reconnectAfterMs: 1000, // 1 segundo
    maxReconnectAttempts: 10,
    enableLogging: import.meta.env.DEV
  }
};

// Configurações de cache
export const cacheConfig = {
  // TTL padrão em segundos
  defaultTTL: 300, // 5 minutos
  
  // TTL específico por tipo de dados
  ttl: {
    userProfile: 900, // 15 minutos
    contracts: 600, // 10 minutos
    reports: 1800, // 30 minutos
    notifications: 60, // 1 minuto
    auditLogs: 3600, // 1 hora
    calculations: 300 // 5 minutos
  },
  
  // Configurações de invalidação
  invalidation: {
    enabled: true,
    patterns: {
      userUpdate: ['userProfile:*'],
      contractUpdate: ['contracts:*', 'reports:*'],
      tenantUpdate: ['*']
    }
  }
};

// Configurações de logging e monitoramento
export const monitoringConfig = {
  // Logging
  logging: {
    enabled: true,
    level: import.meta.env.DEV ? 'debug' : 'info',
    includeStackTrace: import.meta.env.DEV,
    maxLogSize: 1000, // máximo de logs em memória
    categories: {
      auth: true,
      database: true,
      storage: true,
      realtime: true,
      api: true,
      errors: true
    }
  },
  
  // Métricas
  metrics: {
    enabled: true,
    collectInterval: 60000, // 1 minuto
    retentionPeriod: 86400000, // 24 horas
    categories: {
      performance: true,
      usage: true,
      errors: true,
      security: true
    }
  },
  
  // Alertas
  alerts: {
    enabled: true,
    thresholds: {
      errorRate: 0.05, // 5%
      responseTime: 5000, // 5 segundos
      memoryUsage: 0.8, // 80%
      diskUsage: 0.9 // 90%
    }
  }
};

// Configurações de desenvolvimento
export const devConfig = {
  // Dados de teste
  seedData: {
    enabled: import.meta.env.DEV,
    autoSeed: false,
    resetOnStart: false
  },
  
  // Debug
  debug: {
    enabled: import.meta.env.DEV,
    logQueries: true,
    logAuth: true,
    logRealtime: false,
    showPerformanceMetrics: true
  },
  
  // Mock data
  mock: {
    enabled: false,
    delay: 500, // ms
    errorRate: 0.1 // 10%
  }
};

// Função para validar configuração
export const validateConfig = () => {
  const errors: string[] = [];
  
  // Validar URLs
  try {
    new URL(supabaseUrl);
  } catch {
    errors.push('VITE_SUPABASE_URL deve ser uma URL válida');
  }
  
  // Validar chaves
  if (supabaseAnonKey.length < 32) {
    errors.push('VITE_SUPABASE_ANON_KEY parece ser inválida');
  }
  
  // Validar configurações de segurança
  if (authConfig.security.passwordMinLength < 6) {
    errors.push('Comprimento mínimo da senha deve ser pelo menos 6');
  }
  
  if (authConfig.security.maxLoginAttempts < 1) {
    errors.push('Máximo de tentativas de login deve ser pelo menos 1');
  }
  
  // Validar configurações de storage
  Object.values(storageConfig.buckets).forEach(bucket => {
    if (bucket.maxFileSize > 100 * 1024 * 1024) { // 100MB
      errors.push(`Tamanho máximo do arquivo para bucket ${bucket.name} é muito grande`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Erros de configuração:\n${errors.join('\n')}`);
  }
  
  return true;
};

// Função para obter configuração do ambiente
export const getEnvironmentConfig = () => {
  return {
    environment: import.meta.env.MODE || 'development',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
    supabaseUrl,
    features: {
      realtime: true,
      storage: true,
      auth: true,
      rls: true,
      functions: true
    }
  };
};

// Exportar configuração completa
export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey
  },
  auth: authConfig,
  rls: rlsConfig,
  storage: storageConfig,
  realtime: realtimeConfig,
  cache: cacheConfig,
  monitoring: monitoringConfig,
  dev: devConfig
};

// Função para verificar a conexão com o Supabase
export async function checkSupabaseConnection() {
  try {
    // Importar dinamicamente para evitar dependência circular
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.from('message_history').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabela não encontrada (ok para teste)
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o Supabase:', error);
    return false;
  }
}

// Função para inicializar configurações
export const initializeSupabase = async () => {
  try {
    // Validar configuração
    validateConfig();
    
    // Verificar conexão
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) {
      throw new Error('Não foi possível conectar ao Supabase');
    }
    
    // Log de inicialização
    if (monitoringConfig.logging.enabled) {
      console.log('✅ Supabase inicializado com sucesso', getEnvironmentConfig());
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    throw error;
  }
};

export default config;
