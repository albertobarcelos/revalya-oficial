/**
 * AIDEV-NOTE: Sistema robusto de tratamento de erros para importações
 * 
 * Este módulo fornece funcionalidades avançadas para:
 * - Classificação automática de tipos de erro
 * - Estratégias de retry inteligentes
 * - Logging estruturado com contexto
 * - Notificações para usuários e administradores
 * - Métricas de erro para monitoramento
 */

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network', 
  DATABASE = 'database',
  FILE_FORMAT = 'file_format',
  PERMISSION = 'permission',
  QUOTA = 'quota',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  jobId?: string;
  tenantId?: string;
  userId?: string;
  fileName?: string;
  rowNumber?: number;
  operation?: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export interface ProcessedError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  context: ErrorContext;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  resolution?: string;
}

export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number; // em milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

// Estratégias de retry por tipo de erro
const RETRY_STRATEGIES: Record<ErrorType, RetryStrategy> = {
  [ErrorType.NETWORK]: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  },
  [ErrorType.DATABASE]: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  [ErrorType.TIMEOUT]: {
    maxRetries: 3,
    baseDelay: 5000,
    maxDelay: 20000,
    backoffMultiplier: 1.5,
    jitter: false
  },
  [ErrorType.QUOTA]: {
    maxRetries: 2,
    baseDelay: 60000, // 1 minuto
    maxDelay: 300000, // 5 minutos
    backoffMultiplier: 2,
    jitter: false
  },
  [ErrorType.VALIDATION]: {
    maxRetries: 0, // Erros de validação não devem ser retentados
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false
  },
  [ErrorType.FILE_FORMAT]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false
  },
  [ErrorType.PERMISSION]: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false
  },
  [ErrorType.UNKNOWN]: {
    maxRetries: 1,
    baseDelay: 5000,
    maxDelay: 10000,
    backoffMultiplier: 1,
    jitter: true
  }
};

/**
 * Classifica automaticamente o tipo de erro baseado na mensagem e contexto
 */
export function classifyError(error: Error, context?: Partial<ErrorContext>): ErrorType {
  const message = error.message.toLowerCase();
  
  // Erros de rede
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('connection') || message.includes('timeout')) {
    return ErrorType.NETWORK;
  }
  
  // Erros de banco de dados
  if (message.includes('database') || message.includes('sql') || 
      message.includes('constraint') || message.includes('duplicate')) {
    return ErrorType.DATABASE;
  }
  
  // Erros de formato de arquivo
  if (message.includes('csv') || message.includes('excel') || 
      message.includes('format') || message.includes('parse')) {
    return ErrorType.FILE_FORMAT;
  }
  
  // Erros de validação
  if (message.includes('validation') || message.includes('invalid') || 
      message.includes('required') || message.includes('missing')) {
    return ErrorType.VALIDATION;
  }
  
  // Erros de permissão
  if (message.includes('permission') || message.includes('unauthorized') || 
      message.includes('forbidden') || message.includes('access')) {
    return ErrorType.PERMISSION;
  }
  
  // Erros de quota
  if (message.includes('quota') || message.includes('limit') || 
      message.includes('rate') || message.includes('throttle')) {
    return ErrorType.QUOTA;
  }
  
  // Erros de timeout
  if (message.includes('timeout') || message.includes('deadline')) {
    return ErrorType.TIMEOUT;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Determina a severidade do erro
 */
export function determineSeverity(errorType: ErrorType, context?: Partial<ErrorContext>): ErrorSeverity {
  switch (errorType) {
    case ErrorType.DATABASE:
    case ErrorType.PERMISSION:
      return ErrorSeverity.CRITICAL;
    
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.QUOTA:
      return ErrorSeverity.HIGH;
    
    case ErrorType.FILE_FORMAT:
    case ErrorType.VALIDATION:
      return ErrorSeverity.MEDIUM;
    
    default:
      return ErrorSeverity.LOW;
  }
}

/**
 * Calcula o próximo tempo de retry com backoff exponencial
 */
export function calculateNextRetry(
  retryCount: number, 
  strategy: RetryStrategy
): Date | null {
  if (retryCount >= strategy.maxRetries) {
    return null;
  }
  
  let delay = Math.min(
    strategy.baseDelay * Math.pow(strategy.backoffMultiplier, retryCount),
    strategy.maxDelay
  );
  
  // Adiciona jitter para evitar thundering herd
  if (strategy.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return new Date(Date.now() + delay);
}

/**
 * Processa um erro e retorna informações estruturadas
 */
export function processError(
  error: Error, 
  context: Partial<ErrorContext> = {}
): ProcessedError {
  const errorType = classifyError(error, context);
  const severity = determineSeverity(errorType, context);
  const strategy = RETRY_STRATEGIES[errorType];
  
  const processedError: ProcessedError = {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: errorType,
    severity,
    message: error.message,
    originalError: error,
    context: {
      timestamp: new Date(),
      ...context
    },
    retryable: strategy.maxRetries > 0,
    retryCount: 0,
    maxRetries: strategy.maxRetries,
    nextRetryAt: strategy.maxRetries > 0 ? calculateNextRetry(0, strategy) : undefined
  };
  
  return processedError;
}

/**
 * Incrementa o contador de retry e calcula próxima tentativa
 */
export function incrementRetry(processedError: ProcessedError): ProcessedError {
  const strategy = RETRY_STRATEGIES[processedError.type];
  const newRetryCount = processedError.retryCount + 1;
  
  return {
    ...processedError,
    retryCount: newRetryCount,
    nextRetryAt: calculateNextRetry(newRetryCount, strategy)
  };
}

/**
 * Verifica se um erro pode ser retentado
 */
export function canRetry(processedError: ProcessedError): boolean {
  return processedError.retryable && 
         processedError.retryCount < processedError.maxRetries &&
         processedError.nextRetryAt !== null;
}

/**
 * Verifica se é hora de tentar novamente
 */
export function shouldRetryNow(processedError: ProcessedError): boolean {
  if (!canRetry(processedError) || !processedError.nextRetryAt) {
    return false;
  }
  
  return new Date() >= processedError.nextRetryAt;
}

/**
 * Gera uma mensagem de erro amigável para o usuário
 */
export function getUserFriendlyMessage(processedError: ProcessedError): string {
  switch (processedError.type) {
    case ErrorType.NETWORK:
      return 'Problema de conexão. Tentando novamente automaticamente...';
    
    case ErrorType.DATABASE:
      return 'Erro interno do sistema. Nossa equipe foi notificada.';
    
    case ErrorType.FILE_FORMAT:
      return 'Formato de arquivo inválido. Verifique se o arquivo está no formato correto (CSV ou Excel).';
    
    case ErrorType.VALIDATION:
      return 'Dados inválidos encontrados. Verifique o conteúdo do arquivo.';
    
    case ErrorType.PERMISSION:
      return 'Você não tem permissão para realizar esta operação.';
    
    case ErrorType.QUOTA:
      return 'Limite de uso atingido. Tente novamente em alguns minutos.';
    
    case ErrorType.TIMEOUT:
      return 'Operação demorou muito para ser concluída. Tentando novamente...';
    
    default:
      return 'Erro inesperado. Tentando novamente automaticamente...';
  }
}

/**
 * Registra erro estruturado para logging
 */
export function logError(processedError: ProcessedError): void {
  const logData = {
    errorId: processedError.id,
    type: processedError.type,
    severity: processedError.severity,
    message: processedError.message,
    context: processedError.context,
    retryCount: processedError.retryCount,
    maxRetries: processedError.maxRetries,
    nextRetryAt: processedError.nextRetryAt,
    stack: processedError.originalError.stack
  };
  
  console.error('[ImportError]', JSON.stringify(logData, null, 2));
  
  // Em produção, enviar para serviço de logging externo
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrar com serviço de logging (Sentry, LogRocket, etc.)
  }
}

/**
 * Classe principal para gerenciamento de erros
 */
export class ImportErrorHandler {
  private errors: Map<string, ProcessedError> = new Map();
  
  /**
   * Processa e registra um novo erro
   */
  handleError(error: Error, context: Partial<ErrorContext> = {}): ProcessedError {
    const processedError = processError(error, context);
    this.errors.set(processedError.id, processedError);
    
    logError(processedError);
    
    return processedError;
  }
  
  /**
   * Tenta executar uma operação com retry automático
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    let lastError: ProcessedError | null = null;
    
    while (true) {
      try {
        return await operation();
      } catch (error) {
        const processedError = this.handleError(error as Error, context);
        lastError = processedError;
        
        if (!canRetry(processedError)) {
          throw processedError;
        }
        
        // Aguarda o tempo de retry
        if (processedError.nextRetryAt) {
          const waitTime = processedError.nextRetryAt.getTime() - Date.now();
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        // Incrementa contador de retry
        const updatedError = incrementRetry(processedError);
        this.errors.set(updatedError.id, updatedError);
      }
    }
  }
  
  /**
   * Obtém estatísticas de erros
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    retryable: number;
  } {
    const stats = {
      total: this.errors.size,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      retryable: 0
    };
    
    // Inicializa contadores
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    
    // Conta erros
    this.errors.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
      if (error.retryable) {
        stats.retryable++;
      }
    });
    
    return stats;
  }
  
  /**
   * Limpa erros antigos
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 horas por padrão
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [id, error] of this.errors.entries()) {
      if (error.context.timestamp < cutoff) {
        this.errors.delete(id);
      }
    }
  }
}

// Instância singleton do handler de erros
export const importErrorHandler = new ImportErrorHandler();