// AIDEV-NOTE: Tipos aprimorados para tratamento de erros em bulk insert
// Permite categorização e ações contextuais para melhor UX

export type ErrorCategory = 
  | 'validation'    // Dados inválidos (CPF, email, etc.)
  | 'duplicate'     // Registros duplicados
  | 'system'        // Erros de sistema/banco
  | 'permission'    // Falta de permissão
  | 'network'       // Problemas de conectividade

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DetailedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;  // Mensagem amigável para o usuário
  field?: string;       // Campo específico que causou o erro
  rowIndex?: number;    // Linha do CSV que falhou
  originalData?: Record<string, any>; // Dados originais do registro
  suggestedAction?: string; // Ação sugerida para resolver
  canRetry?: boolean;   // Se pode tentar novamente
  canIgnore?: boolean;  // Se pode ignorar este erro
}

export interface BulkInsertResult {
  success: boolean;
  totalRecords: number;
  processedRecords: number;
  errors: DetailedError[];  // Erros detalhados ao invés de strings
  batches: number;
  duration: number;
  summary: {
    validationErrors: number;
    duplicateErrors: number;
    systemErrors: number;
    permissionErrors: number;
    networkErrors: number;
  };
}

export interface ErrorAction {
  id: string;
  label: string;
  icon: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  action: (error: DetailedError) => void;
}

// Mapeamento de categorias para configurações visuais
export const ERROR_CONFIG: Record<ErrorCategory, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
}> = {
  validation: {
    icon: 'AlertCircle',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    title: 'Erro de Validação'
  },
  duplicate: {
    icon: 'Copy',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Registro Duplicado'
  },
  system: {
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Erro do Sistema'
  },
  permission: {
    icon: 'Shield',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Erro de Permissão'
  },
  network: {
    icon: 'Wifi',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    title: 'Erro de Conexão'
  }
};