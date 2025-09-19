// =====================================================
// LOGGING AND AUDIT UTILITIES
// Descrição: Sistema de logging e auditoria para rastreabilidade e segurança
// =====================================================

import { supabase } from './supabase'
import { config } from './config'
import { maskSensitiveData } from './supabase'
import type { Database } from '../types/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'
export type AuditAction = Database['public']['Enums']['audit_action']
export type ResourceType = Database['public']['Enums']['resource_type']

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  userId?: string
  tenantId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
  error?: Error
  stack?: string
  userAgent?: string
  ipAddress?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
}

export interface AuditLogEntry {
  userId?: string
  tenantId: string
  action: AuditAction
  resourceType: ResourceType
  resourceId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'password_change' | 'permission_denied' | 'suspicious_activity'
  userId?: string
  tenantId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp?: Date
}

export interface PerformanceMetric {
  operation: string
  duration: number
  success: boolean
  userId?: string
  tenantId?: string
  metadata?: Record<string, any>
  timestamp?: Date
}

// =====================================================
// CLASSE PRINCIPAL DO LOGGER
// =====================================================

class Logger {
  private static instance: Logger
  private logBuffer: LogEntry[] = []
  private auditBuffer: AuditLogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly bufferSize = 100
  private readonly flushIntervalMs = 5000 // 5 segundos

  private constructor() {
    this.startBufferFlush()
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  // =====================================================
  // MÉTODOS DE LOGGING
  // =====================================================

  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, { error, metadata })
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, { metadata })
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, { metadata })
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    if (config.dev.debugEnabled) {
      this.log('debug', message, { metadata })
    }
  }

  private log(
    level: LogLevel,
    message: string,
    options: {
      error?: Error
      metadata?: Record<string, any>
      userId?: string
      tenantId?: string
      sessionId?: string
      requestId?: string
      userAgent?: string
      ipAddress?: string
      endpoint?: string
      method?: string
      statusCode?: number
      duration?: number
    } = {}
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      ...options,
      stack: options.error?.stack,
    }

    // Mascarar dados sensíveis
    if (logEntry.metadata) {
      logEntry.metadata = maskSensitiveData(logEntry.metadata)
    }

    // Log no console se habilitado
    if (config.logging.console) {
      this.logToConsole(logEntry)
    }

    // Adicionar ao buffer para persistência
    if (config.logging.database) {
      this.logBuffer.push(logEntry)
      this.checkBufferFlush()
    }

    // Enviar para serviços externos se configurado
    this.sendToExternalServices(logEntry)
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`
    
    const logData = {
      message: entry.message,
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.tenantId && { tenantId: entry.tenantId }),
      ...(entry.error && { error: entry.error.message }),
    }

    switch (entry.level) {
      case 'error':
        console.error(prefix, logData)
        if (entry.stack) console.error(entry.stack)
        break
      case 'warn':
        console.warn(prefix, logData)
        break
      case 'info':
        console.info(prefix, logData)
        break
      case 'debug':
        console.debug(prefix, logData)
        break
    }
  }

  // =====================================================
  // AUDITORIA
  // =====================================================

  public async audit(entry: AuditLogEntry): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }

    // Mascarar dados sensíveis
    if (auditEntry.oldValues) {
      auditEntry.oldValues = maskSensitiveData(auditEntry.oldValues)
    }
    if (auditEntry.newValues) {
      auditEntry.newValues = maskSensitiveData(auditEntry.newValues)
    }
    if (auditEntry.metadata) {
      auditEntry.metadata = maskSensitiveData(auditEntry.metadata)
    }

    this.auditBuffer.push(auditEntry)
    this.checkBufferFlush()

    // Log da ação de auditoria
    this.info(`Audit: ${entry.action} on ${entry.resourceType}`, {
      resourceId: entry.resourceId,
      userId: entry.userId,
      tenantId: entry.tenantId,
    })
  }

  // =====================================================
  // EVENTOS DE SEGURANÇA
  // =====================================================

  public async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const securityEntry: SecurityEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    }

    // Log com nível baseado na severidade
    const logLevel: LogLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warn'
    
    this.log(logLevel, `Security Event: ${event.type}`, {
      metadata: {
        type: event.type,
        severity: event.severity,
        details: event.details,
      },
      userId: event.userId,
      tenantId: event.tenantId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    })

    // Auditoria para eventos críticos
    if (event.severity === 'critical' || event.severity === 'high') {
      await this.audit({
        userId: event.userId,
        tenantId: event.tenantId || 'system',
        // @ts-ignore - SECURITY_EVENT deveria estar na lista de tipos válidos
        action: 'SECURITY_EVENT' as AuditAction,
        resourceType: 'USER',
        resourceId: event.userId,
        metadata: {
          securityEventType: event.type,
          severity: event.severity,
          details: event.details,
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      })
    }
  }

  // =====================================================
  // MÉTRICAS DE PERFORMANCE
  // =====================================================

  public async logPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    const performanceEntry: PerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || new Date(),
    }

    // Log apenas se a operação for lenta
    if (metric.duration > config.monitoring.slowQueryThreshold) {
      this.warn(`Slow operation detected: ${metric.operation}`, {
        duration: metric.duration,
        success: metric.success,
        userId: metric.userId,
        tenantId: metric.tenantId,
        metadata: metric.metadata,
      })
    }

    // Enviar métricas para sistema de monitoramento
    if (config.monitoring.performanceMonitoring) {
      this.sendPerformanceMetric(performanceEntry)
    }
  }

  // =====================================================
  // GESTÃO DE BUFFER E PERSISTÊNCIA
  // =====================================================

  private startBufferFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffers()
    }, this.flushIntervalMs)
  }

  private checkBufferFlush(): void {
    if (this.logBuffer.length >= this.bufferSize || this.auditBuffer.length >= this.bufferSize) {
      this.flushBuffers()
    }
  }

  private async flushBuffers(): Promise<void> {
    if (this.logBuffer.length > 0) {
      await this.flushLogBuffer()
    }
    if (this.auditBuffer.length > 0) {
      await this.flushAuditBuffer()
    }
  }

  private async flushLogBuffer(): Promise<void> {
    const logsToFlush = [...this.logBuffer]
    this.logBuffer = []

    try {
      // Aqui você pode implementar a persistência dos logs
      // Por exemplo, salvar em uma tabela de logs no Supabase
      if (config.logging.database) {
        // Implementar salvamento no banco
        // await this.saveLogsToDatabase(logsToFlush)
      }
    } catch (error) {
      console.error('Erro ao salvar logs:', error)
      // Recolocar logs no buffer em caso de erro
      this.logBuffer.unshift(...logsToFlush)
    }
  }

  private async flushAuditBuffer(): Promise<void> {
    const auditsToFlush = [...this.auditBuffer]
    this.auditBuffer = []

    try {
      for (const auditEntry of auditsToFlush) {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: auditEntry.userId,
            tenant_id: auditEntry.tenantId,
            action: auditEntry.action,
            resource_type: auditEntry.resourceType,
            resource_id: auditEntry.resourceId,
            old_values: auditEntry.oldValues,
            new_values: auditEntry.newValues,
            metadata: auditEntry.metadata,
            ip_address: auditEntry.ipAddress,
            user_agent: auditEntry.userAgent,
            created_at: auditEntry.timestamp?.toISOString(),
          })
      }
    } catch (error) {
      console.error('Erro ao salvar logs de auditoria:', error)
      // Recolocar auditorias no buffer em caso de erro
      this.auditBuffer.unshift(...auditsToFlush)
    }
  }

  // =====================================================
  // INTEGRAÇÃO COM SERVIÇOS EXTERNOS
  // =====================================================

  private sendToExternalServices(entry: LogEntry): void {
    // Sentry para erros
    if (entry.level === 'error' && config.logging.sentryDsn) {
      this.sendToSentry(entry)
    }

    // Logflare para logs estruturados
    if (config.logging.logflareApiKey && config.logging.logflareSourceToken) {
      this.sendToLogflare(entry)
    }
  }

  private sendToSentry(entry: LogEntry): void {
    // Implementar integração com Sentry
    // Sentry.captureException(entry.error || new Error(entry.message), {
    //   tags: {
    //     level: entry.level,
    //     userId: entry.userId,
    //     tenantId: entry.tenantId,
    //   },
    //   extra: entry.metadata,
    // })
  }

  private sendToLogflare(entry: LogEntry): void {
    // Implementar integração com Logflare
    // fetch('https://api.logflare.app/logs', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-API-KEY': config.logging.logflareApiKey!,
    //   },
    //   body: JSON.stringify({
    //     source_token: config.logging.logflareSourceToken,
    //     log_entry: entry,
    //   }),
    // })
  }

  private sendPerformanceMetric(metric: PerformanceMetric): void {
    // Implementar envio de métricas para sistema de monitoramento
    // Por exemplo, Prometheus, DataDog, etc.
  }

  // =====================================================
  // LIMPEZA E DESTRUIÇÃO
  // =====================================================

  public async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    await this.flushBuffers()
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const logger = Logger.getInstance()

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Decorator para logging automático de métodos
 */
export function LogMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now()
    const className = target.constructor.name
    const methodName = `${className}.${propertyName}`

    logger.debug(`Iniciando ${methodName}`, { args: args.length })

    try {
      const result = await method.apply(this, args)
      const duration = Date.now() - startTime
      
      logger.debug(`Concluído ${methodName}`, { duration })
      
      await logger.logPerformanceMetric({
        operation: methodName,
        duration,
        success: true,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error(`Erro em ${methodName}`, error as Error, { duration })
      
      await logger.logPerformanceMetric({
        operation: methodName,
        duration,
        success: false,
        metadata: { error: (error as Error).message },
      })

      throw error
    }
  }

  return descriptor
}

/**
 * Middleware para logging de requisições HTTP
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(2, 15)
    
    // Adicionar requestId ao contexto
    req.requestId = requestId
    
    logger.info('Requisição iniciada', {
      requestId,
      method: req.method,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
    })

    // Override do res.end para capturar a resposta
    const originalEnd = res.end
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime
      
      logger.info('Requisição concluída', {
        requestId,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        duration,
      })

      logger.logPerformanceMetric({
        operation: `${req.method} ${req.path}`,
        duration,
        success: res.statusCode < 400,
        metadata: {
          statusCode: res.statusCode,
          method: req.method,
          endpoint: req.path,
        },
      })

      originalEnd.apply(this, args)
    }

    next()
  }
}

/**
 * Função para logging de operações de banco de dados
 */
export async function logDatabaseOperation<T>(
  operation: string,
  query: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await query()
    const duration = Date.now() - startTime
    
    logger.debug(`DB Operation: ${operation}`, { duration, ...metadata })
    
    await logger.logPerformanceMetric({
      operation: `DB: ${operation}`,
      duration,
      success: true,
      metadata,
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error(`DB Operation Failed: ${operation}`, error as Error, {
      duration,
      ...metadata,
    })
    
    await logger.logPerformanceMetric({
      operation: `DB: ${operation}`,
      duration,
      success: false,
      metadata: {
        ...metadata,
        error: (error as Error).message,
      },
    })
    
    throw error
  }
}

/**
 * Função para criar contexto de logging com informações do usuário
 */
export function createLogContext(userId?: string, tenantId?: string, sessionId?: string) {
  return {
    error: (message: string, error?: Error, metadata?: Record<string, any>) => {
      logger.error(message, error, { ...metadata, userId, tenantId, sessionId })
    },
    warn: (message: string, metadata?: Record<string, any>) => {
      logger.warn(message, { ...metadata, userId, tenantId, sessionId })
    },
    info: (message: string, metadata?: Record<string, any>) => {
      logger.info(message, { ...metadata, userId, tenantId, sessionId })
    },
    debug: (message: string, metadata?: Record<string, any>) => {
      logger.debug(message, { ...metadata, userId, tenantId, sessionId })
    },
    audit: (entry: Omit<AuditLogEntry, 'userId' | 'tenantId'>) => {
      return logger.audit({ ...entry, userId, tenantId: tenantId || 'system' })
    },
  }
}

// =====================================================
// FUNÇÕES DE CONVENIÊNCIA (COMPATIBILIDADE)
// =====================================================

export const logInfo = (message: string, contextOrMetadata?: string | Record<string, any>, data?: unknown) => {
  // Se o segundo parâmetro é um objeto, é diretamente um objeto de metadados
  if (typeof contextOrMetadata === 'object') {
    logger.info(message, contextOrMetadata)
  } else {
    logger.info(message, { context: contextOrMetadata, data })
  }
}

export const logError = (message: string, errorOrContext?: string | Error | Record<string, any>, data?: unknown) => {
  // Se errorOrContext é um erro, passamos ele como erro
  if (errorOrContext instanceof Error) {
    logger.error(message, errorOrContext, { data })
  } 
  // Se errorOrContext é um objeto, é um objeto de metadados
  else if (typeof errorOrContext === 'object' && errorOrContext !== null) {
    logger.error(message, undefined, errorOrContext)
  } 
  // Caso contrário, é uma string de contexto
  else {
    const error = data instanceof Error ? data : undefined
    const metadata = data instanceof Error ? { context: errorOrContext } : { context: errorOrContext, data }
    logger.error(message, error, metadata)
  }
}

export const logWarn = (message: string, contextOrMetadata?: string | Record<string, any>, data?: unknown) => {
  // Se o segundo parâmetro é um objeto, é diretamente um objeto de metadados
  if (typeof contextOrMetadata === 'object') {
    logger.warn(message, contextOrMetadata)
  } else {
    logger.warn(message, { context: contextOrMetadata, data })
  }
}

export const logDebug = (message: string, contextOrMetadata?: string | Record<string, any>, data?: unknown) => {
  // Se o segundo parâmetro é um objeto, é diretamente um objeto de metadados
  if (typeof contextOrMetadata === 'object') {
    logger.debug(message, contextOrMetadata)
  } else {
    logger.debug(message, { context: contextOrMetadata, data })
  }
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default logger
export {
  Logger,
}

// Cleanup na saída do processo
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await logger.destroy()
  })
  
  process.on('SIGINT', async () => {
    await logger.destroy()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await logger.destroy()
    process.exit(0)
  })
}
