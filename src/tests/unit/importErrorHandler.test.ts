import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImportErrorHandler, ErrorType, ErrorSeverity } from '../../utils/importErrorHandler'
import type { ErrorContext, ProcessedError } from '../../utils/importErrorHandler'

describe('ImportErrorHandler', () => {
  let errorHandler: ImportErrorHandler

  beforeEach(() => {
    errorHandler = new ImportErrorHandler()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Classificação de Erros', () => {
    it('deve classificar erro de validação corretamente', () => {
      // AIDEV-NOTE: Teste de classificação de erros de validação
      const validationErrors = [
        'Invalid email format',
        'Required field missing',
        'Invalid phone number',
        'Document validation failed'
      ]

      validationErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        const errorType = errorHandler['classifyError'](error)
        expect(errorType).toBe(ErrorType.VALIDATION_ERROR)
      })
    })

    it('deve classificar erro de rede corretamente', () => {
      // AIDEV-NOTE: Teste de classificação de erros de rede
      const networkErrors = [
        'Network timeout',
        'Connection refused',
        'ECONNRESET',
        'Request timeout'
      ]

      networkErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        const errorType = errorHandler['classifyError'](error)
        expect(errorType).toBe(ErrorType.NETWORK_ERROR)
      })
    })

    it('deve classificar erro de banco de dados corretamente', () => {
      // AIDEV-NOTE: Teste de classificação de erros de banco
      const databaseErrors = [
        'duplicate key value',
        'connection to database failed',
        'query timeout',
        'foreign key constraint'
      ]

      databaseErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        const errorType = errorHandler['classifyError'](error)
        expect(errorType).toBe(ErrorType.DATABASE_ERROR)
      })
    })

    it('deve classificar erro de arquivo corretamente', () => {
      // AIDEV-NOTE: Teste de classificação de erros de arquivo
      const fileErrors = [
        'File not found',
        'Permission denied',
        'Invalid file format',
        'File corrupted'
      ]

      fileErrors.forEach(errorMessage => {
        const error = new Error(errorMessage)
        const errorType = errorHandler['classifyError'](error)
        expect(errorType).toBe(ErrorType.FILE_ERROR)
      })
    })

    it('deve classificar erro desconhecido como UNKNOWN_ERROR', () => {
      // AIDEV-NOTE: Teste de classificação de erros desconhecidos
      const unknownError = new Error('Some random error message')
      const errorType = errorHandler['classifyError'](unknownError)
      expect(errorType).toBe(ErrorType.UNKNOWN_ERROR)
    })
  })

  describe('Determinação de Severidade', () => {
    it('deve determinar severidade baixa para erros de validação', () => {
      // AIDEV-NOTE: Teste de severidade para erros de validação
      const severity = errorHandler['determineSeverity'](ErrorType.VALIDATION_ERROR)
      expect(severity).toBe(ErrorSeverity.LOW)
    })

    it('deve determinar severidade média para erros de rede', () => {
      // AIDEV-NOTE: Teste de severidade para erros de rede
      const severity = errorHandler['determineSeverity'](ErrorType.NETWORK_ERROR)
      expect(severity).toBe(ErrorSeverity.MEDIUM)
    })

    it('deve determinar severidade alta para erros críticos', () => {
      // AIDEV-NOTE: Teste de severidade para erros críticos
      const severity = errorHandler['determineSeverity'](ErrorType.SYSTEM_ERROR)
      expect(severity).toBe(ErrorSeverity.HIGH)
    })
  })

  describe('Cálculo de Delay para Retry', () => {
    it('deve calcular delay com backoff exponencial', () => {
      // AIDEV-NOTE: Teste de backoff exponencial
      const delays = []
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = errorHandler.calculateRetryDelay(ErrorType.NETWORK_ERROR, attempt)
        delays.push(delay)
      }

      // Verificar que os delays aumentam exponencialmente
      expect(delays[1]).toBeGreaterThan(delays[0])
      expect(delays[2]).toBeGreaterThan(delays[1])
      expect(delays[3]).toBeGreaterThan(delays[2])
      expect(delays[4]).toBeGreaterThan(delays[3])
    })

    it('deve aplicar jitter para evitar thundering herd', () => {
      // AIDEV-NOTE: Teste de jitter para distribuir retries
      const delays = []
      
      // Gerar múltiplos delays para o mesmo attempt
      for (let i = 0; i < 10; i++) {
        const delay = errorHandler.calculateRetryDelay(ErrorType.NETWORK_ERROR, 3)
        delays.push(delay)
      }

      // Verificar que há variação nos delays (jitter)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })

    it('deve respeitar delay máximo', () => {
      // AIDEV-NOTE: Teste de limite máximo de delay
      const delay = errorHandler.calculateRetryDelay(ErrorType.NETWORK_ERROR, 10)
      expect(delay).toBeLessThanOrEqual(30000) // 30 segundos máximo
    })

    it('deve retornar 0 para erros não retryáveis', () => {
      // AIDEV-NOTE: Teste de delay zero para erros não retryáveis
      const delay = errorHandler.calculateRetryDelay(ErrorType.VALIDATION_ERROR, 1)
      expect(delay).toBe(0)
    })
  })

  describe('Processamento de Erros', () => {
    it('deve processar erro e retornar ProcessedError', () => {
      // AIDEV-NOTE: Teste de processamento básico de erro
      const error = new Error('Test error')
      const context: ErrorContext = {
        jobId: 'test-job-123',
        tenantId: 'tenant-456',
        operation: 'validation',
        recordIndex: 5
      }

      const processedError = errorHandler.handleError(error, context)

      expect(processedError).toHaveProperty('id')
      expect(processedError.originalError).toBe(error)
      expect(processedError.context).toBe(context)
      expect(processedError.timestamp).toBeInstanceOf(Date)
      expect(processedError.retryCount).toBe(0)
      expect(typeof processedError.retryable).toBe('boolean')
    })

    it('deve gerar mensagem amigável para o usuário', () => {
      // AIDEV-NOTE: Teste de geração de mensagens amigáveis
      const error = new Error('Invalid email format')
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 3
      }

      const processedError = errorHandler.handleError(error, context)
      const userMessage = errorHandler.getUserFriendlyMessage(processedError)

      expect(userMessage).toContain('linha 3')
      expect(userMessage).toContain('validação')
      expect(userMessage.length).toBeGreaterThan(0)
    })

    it('deve armazenar erro na memória', () => {
      // AIDEV-NOTE: Teste de armazenamento de erros
      const error = new Error('Test error')
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      const processedError = errorHandler.handleError(error, context)
      const storedErrors = errorHandler.getErrorsByJob('test-job')

      expect(storedErrors).toHaveLength(1)
      expect(storedErrors[0].id).toBe(processedError.id)
    })
  })

  describe('Sistema de Retry', () => {
    it('deve incrementar contador de retry', () => {
      // AIDEV-NOTE: Teste de incremento de retry
      const error = new Error('Network timeout')
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      const processedError = errorHandler.handleError(error, context)
      expect(processedError.retryCount).toBe(0)

      errorHandler.incrementRetry(processedError.id)
      const updatedError = errorHandler.getErrorById(processedError.id)
      expect(updatedError?.retryCount).toBe(1)
    })

    it('deve verificar se erro pode ser retryado', () => {
      // AIDEV-NOTE: Teste de verificação de retry
      const networkError = new Error('Connection timeout')
      const validationError = new Error('Invalid email')
      
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      const processedNetworkError = errorHandler.handleError(networkError, context)
      const processedValidationError = errorHandler.handleError(validationError, context)

      expect(errorHandler.canRetry(processedNetworkError.id)).toBe(true)
      expect(errorHandler.canRetry(processedValidationError.id)).toBe(false)
    })

    it('deve parar retry após limite máximo', () => {
      // AIDEV-NOTE: Teste de limite máximo de retries
      const error = new Error('Network timeout')
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      const processedError = errorHandler.handleError(error, context)

      // Incrementar retry até o limite
      for (let i = 0; i < 5; i++) {
        errorHandler.incrementRetry(processedError.id)
      }

      expect(errorHandler.canRetry(processedError.id)).toBe(false)
    })

    it('deve executar operação com retry automático', async () => {
      // AIDEV-NOTE: Teste de execução com retry automático
      let attempts = 0
      const mockOperation = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network timeout')
        }
        return 'success'
      })

      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      const result = await errorHandler.executeWithRetry(mockOperation, context)

      expect(result).toBe('success')
      expect(attempts).toBe(3)
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('deve falhar após esgotar tentativas de retry', async () => {
      // AIDEV-NOTE: Teste de falha após esgotar retries
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'))

      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      await expect(errorHandler.executeWithRetry(mockOperation, context))
        .rejects.toThrow('Persistent error')

      expect(mockOperation).toHaveBeenCalledTimes(4) // 1 tentativa inicial + 3 retries
    })
  })

  describe('Estatísticas de Erros', () => {
    it('deve fornecer estatísticas por job', () => {
      // AIDEV-NOTE: Teste de estatísticas por job
      const context: ErrorContext = {
        jobId: 'test-job',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      // Adicionar diferentes tipos de erro
      errorHandler.handleError(new Error('Invalid email'), context)
      errorHandler.handleError(new Error('Network timeout'), { ...context, recordIndex: 2 })
      errorHandler.handleError(new Error('Database error'), { ...context, recordIndex: 3 })

      const stats = errorHandler.getErrorStats('test-job')

      expect(stats.totalErrors).toBe(3)
      expect(stats.errorsByType).toHaveProperty(ErrorType.VALIDATION_ERROR)
      expect(stats.errorsByType).toHaveProperty(ErrorType.NETWORK_ERROR)
      expect(stats.errorsByType).toHaveProperty(ErrorType.DATABASE_ERROR)
      expect(stats.retryableErrors).toBe(2) // Network e Database são retryáveis
      expect(stats.nonRetryableErrors).toBe(1) // Validation não é retryável
    })

    it('deve fornecer estatísticas globais', () => {
      // AIDEV-NOTE: Teste de estatísticas globais
      const context1: ErrorContext = {
        jobId: 'job-1',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      const context2: ErrorContext = {
        jobId: 'job-2',
        tenantId: 'tenant',
        operation: 'database_insert',
        recordIndex: 1
      }

      errorHandler.handleError(new Error('Error 1'), context1)
      errorHandler.handleError(new Error('Error 2'), context2)

      const globalStats = errorHandler.getGlobalStats()

      expect(globalStats.totalErrors).toBe(2)
      expect(globalStats.totalJobs).toBe(2)
      expect(Object.keys(globalStats.errorsByType).length).toBeGreaterThan(0)
    })
  })

  describe('Limpeza de Erros', () => {
    it('deve limpar erros antigos', () => {
      // AIDEV-NOTE: Teste de limpeza de erros antigos
      const context: ErrorContext = {
        jobId: 'old-job',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      const processedError = errorHandler.handleError(new Error('Old error'), context)

      // Simular erro antigo (mais de 24 horas)
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000)
      errorHandler['errors'].set(processedError.id, {
        ...processedError,
        timestamp: oldTimestamp
      })

      errorHandler.cleanupOldErrors()

      expect(errorHandler.getErrorById(processedError.id)).toBeUndefined()
    })

    it('deve manter erros recentes durante limpeza', () => {
      // AIDEV-NOTE: Teste de preservação de erros recentes
      const context: ErrorContext = {
        jobId: 'recent-job',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      const processedError = errorHandler.handleError(new Error('Recent error'), context)

      errorHandler.cleanupOldErrors()

      expect(errorHandler.getErrorById(processedError.id)).toBeDefined()
    })

    it('deve limpar erros por job específico', () => {
      // AIDEV-NOTE: Teste de limpeza por job específico
      const context1: ErrorContext = {
        jobId: 'job-1',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      const context2: ErrorContext = {
        jobId: 'job-2',
        tenantId: 'tenant',
        operation: 'validation',
        recordIndex: 1
      }

      errorHandler.handleError(new Error('Error 1'), context1)
      errorHandler.handleError(new Error('Error 2'), context2)

      errorHandler.clearErrorsForJob('job-1')

      expect(errorHandler.getErrorsByJob('job-1')).toHaveLength(0)
      expect(errorHandler.getErrorsByJob('job-2')).toHaveLength(1)
    })
  })
})