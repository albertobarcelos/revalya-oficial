// =====================================================
// MONITORING AND PERFORMANCE METRICS
// Descrição: Sistema de monitoramento, métricas e observabilidade
// =====================================================

import { config } from './config'
import { logger } from './logger'
import { cache } from './cache'
import type { Database } from '../types/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Metric {
  name: string
  value: number
  unit: 'count' | 'gauge' | 'histogram' | 'timer' | 'bytes' | 'percentage'
  timestamp: number
  tags?: Record<string, string>
  labels?: Record<string, string>
}

export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

export interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  timestamp: number
  duration: number
  metadata?: Record<string, any>
}

export interface SystemMetrics {
  cpu: {
    usage: number
    load: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  network: {
    bytesIn: number
    bytesOut: number
  }
  timestamp: number
}

export interface ApplicationMetrics {
  requests: {
    total: number
    success: number
    errors: number
    rate: number
  }
  response: {
    averageTime: number
    p50: number
    p95: number
    p99: number
  }
  database: {
    connections: number
    queries: number
    slowQueries: number
    averageQueryTime: number
  }
  cache: {
    hits: number
    misses: number
    hitRate: number
    size: number
  }
  timestamp: number
}

export interface Alert {
  id: string
  name: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: number
  resolved: boolean
  resolvedAt?: number
  metadata?: Record<string, any>
}

export interface AlertRule {
  name: string
  condition: string
  threshold: number
  severity: 'info' | 'warning' | 'error' | 'critical'
  enabled: boolean
  cooldown: number // segundos
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'sms'
  config: Record<string, any>
}

// =====================================================
// CLASSE PRINCIPAL DE MONITORAMENTO
// =====================================================

class MonitoringManager {
  private metrics = new Map<string, Metric[]>()
  private performanceMetrics: PerformanceMetric[] = []
  private healthChecks = new Map<string, HealthCheck>()
  private alerts = new Map<string, Alert>()
  private alertRules: AlertRule[] = []
  private timers = new Map<string, number>()
  private counters = new Map<string, number>()
  private gauges = new Map<string, number>()
  private histograms = new Map<string, number[]>()

  constructor() {
    this.startMetricsCollection()
    this.startHealthChecks()
    this.startAlertEvaluation()
    this.setupDefaultAlertRules()
  }

  // =====================================================
  // COLETA DE MÉTRICAS
  // =====================================================

  /**
   * Registra uma métrica
   */
  public recordMetric(
    name: string,
    value: number,
    unit: Metric['unit'] = 'count',
    tags?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    }

    const existing = this.metrics.get(name) || []
    existing.push(metric)
    
    // Manter apenas os últimos 1000 pontos por métrica
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000)
    }
    
    this.metrics.set(name, existing)

    logger.debug('Metric recorded', {
      name,
      value,
      unit,
      tags,
    })
  }

  /**
   * Incrementa um contador
   */
  public incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    const current = this.counters.get(name) || 0
    const newValue = current + value
    this.counters.set(name, newValue)
    this.recordMetric(name, newValue, 'count', tags)
  }

  /**
   * Define um gauge
   */
  public setGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.gauges.set(name, value)
    this.recordMetric(name, value, 'gauge', tags)
  }

  /**
   * Adiciona valor ao histograma
   */
  public recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const existing = this.histograms.get(name) || []
    existing.push(value)
    
    // Manter apenas os últimos 1000 valores
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000)
    }
    
    this.histograms.set(name, existing)
    this.recordMetric(name, value, 'histogram', tags)
  }

  /**
   * Inicia um timer
   */
  public startTimer(name: string): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`
    this.timers.set(timerId, Date.now())
    return timerId
  }

  /**
   * Para um timer e registra a duração
   */
  public stopTimer(timerId: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(timerId)
    if (!startTime) {
      logger.warn('Timer not found', { timerId })
      return 0
    }

    const duration = Date.now() - startTime
    this.timers.delete(timerId)
    
    const name = timerId.split('_')[0]
    this.recordMetric(`${name}_duration`, duration, 'timer', tags)
    
    return duration
  }

  /**
   * Registra métrica de performance
   */
  public recordPerformance(
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
      metadata,
    }

    this.performanceMetrics.push(metric)
    
    // Manter apenas as últimas 10000 métricas
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - 10000)
    }

    // Registrar métricas agregadas
    this.incrementCounter(`${operation}_total`)
    if (success) {
      this.incrementCounter(`${operation}_success`)
    } else {
      this.incrementCounter(`${operation}_errors`)
    }
    this.recordHistogram(`${operation}_duration`, duration)

    logger.debug('Performance metric recorded', {
      operation,
      duration,
      success,
      error,
    })
  }

  // =====================================================
  // HEALTH CHECKS
  // =====================================================

  /**
   * Registra um health check
   */
  public registerHealthCheck(
    name: string,
    checkFn: () => Promise<{ status: HealthCheck['status']; message?: string; metadata?: Record<string, any> }>
  ): void {
    // Executar o health check periodicamente
    setInterval(async () => {
      const startTime = Date.now()
      
      try {
        const result = await checkFn()
        const duration = Date.now() - startTime
        
        const healthCheck: HealthCheck = {
          name,
          status: result.status,
          message: result.message,
          timestamp: Date.now(),
          duration,
          metadata: result.metadata,
        }
        
        this.healthChecks.set(name, healthCheck)
        
        // Registrar métricas
        this.setGauge(`health_check_${name}`, result.status === 'healthy' ? 1 : 0)
        this.recordHistogram(`health_check_${name}_duration`, duration)
        
        logger.debug('Health check completed', {
          name,
          status: result.status,
          duration,
        })
      } catch (error) {
        const duration = Date.now() - startTime
        
        const healthCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          message: (error as Error).message,
          timestamp: Date.now(),
          duration,
        }
        
        this.healthChecks.set(name, healthCheck)
        this.setGauge(`health_check_${name}`, 0)
        
        logger.error('Health check failed', error as Error, { name })
      }
    }, 30000) // A cada 30 segundos
  }

  /**
   * Obtém status de todos os health checks
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: HealthCheck[]
    timestamp: number
  } {
    const checks = Array.from(this.healthChecks.values())
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    for (const check of checks) {
      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy'
        break
      } else if (check.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded'
      }
    }
    
    return {
      status: overallStatus,
      checks,
      timestamp: Date.now(),
    }
  }

  // =====================================================
  // SISTEMA DE ALERTAS
  // =====================================================

  /**
   * Adiciona regra de alerta
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule)
    logger.info('Alert rule added', { name: rule.name })
  }

  /**
   * Remove regra de alerta
   */
  public removeAlertRule(name: string): void {
    this.alertRules = this.alertRules.filter(rule => rule.name !== name)
    logger.info('Alert rule removed', { name })
  }

  /**
   * Dispara um alerta
   */
  public triggerAlert(
    name: string,
    severity: Alert['severity'],
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alertId = `${name}_${Date.now()}`
    
    const alert: Alert = {
      id: alertId,
      name,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata,
    }
    
    this.alerts.set(alertId, alert)
    
    // Executar ações do alerta
    const rule = this.alertRules.find(r => r.name === name)
    if (rule && rule.enabled) {
      this.executeAlertActions(alert, rule.actions)
    }
    
    logger.warn('Alert triggered', {
      name,
      severity,
      message,
      alertId,
    })
  }

  /**
   * Resolve um alerta
   */
  public resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      
      logger.info('Alert resolved', {
        alertId,
        name: alert.name,
        duration: alert.resolvedAt - alert.timestamp,
      })
    }
  }

  /**
   * Obtém alertas ativos
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  // =====================================================
  // MÉTRICAS DO SISTEMA
  // =====================================================

  /**
   * Coleta métricas do sistema
   */
  public async collectSystemMetrics(): Promise<SystemMetrics> {
    // Implementação básica - em produção usar bibliotecas específicas
    const metrics: SystemMetrics = {
      cpu: {
        usage: Math.random() * 100, // Placeholder
        load: [Math.random(), Math.random(), Math.random()],
      },
      memory: {
        used: Math.random() * 8000000000, // Placeholder
        total: 8000000000,
        percentage: Math.random() * 100,
      },
      disk: {
        used: Math.random() * 500000000000, // Placeholder
        total: 500000000000,
        percentage: Math.random() * 100,
      },
      network: {
        bytesIn: Math.random() * 1000000,
        bytesOut: Math.random() * 1000000,
      },
      timestamp: Date.now(),
    }

    // Registrar como métricas
    this.setGauge('system_cpu_usage', metrics.cpu.usage)
    this.setGauge('system_memory_usage', metrics.memory.percentage)
    this.setGauge('system_disk_usage', metrics.disk.percentage)
    this.incrementCounter('system_network_bytes_in', metrics.network.bytesIn)
    this.incrementCounter('system_network_bytes_out', metrics.network.bytesOut)

    return metrics
  }

  /**
   * Coleta métricas da aplicação
   */
  public getApplicationMetrics(): ApplicationMetrics {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Filtrar métricas da última hora
    const recentPerformance = this.performanceMetrics.filter(
      metric => metric.timestamp > oneHourAgo
    )
    
    const totalRequests = recentPerformance.length
    const successfulRequests = recentPerformance.filter(m => m.success).length
    const errorRequests = totalRequests - successfulRequests
    
    const durations = recentPerformance.map(m => m.duration).sort((a, b) => a - b)
    const averageTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0
    
    const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0
    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0
    const p99 = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0
    
    const cacheStats = cache.getStats()
    
    return {
      requests: {
        total: totalRequests,
        success: successfulRequests,
        errors: errorRequests,
        rate: totalRequests / 3600, // por segundo na última hora
      },
      response: {
        averageTime,
        p50,
        p95,
        p99,
      },
      database: {
        connections: 0, // Placeholder
        queries: 0, // Placeholder
        slowQueries: 0, // Placeholder
        averageQueryTime: 0, // Placeholder
      },
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        size: cacheStats.memoryUsage,
      },
      timestamp: now,
    }
  }

  // =====================================================
  // EXPORTAÇÃO DE MÉTRICAS
  // =====================================================

  /**
   * Exporta métricas no formato Prometheus
   */
  public exportPrometheusMetrics(): string {
    let output = ''
    
    // Contadores
    for (const [name, value] of this.counters.entries()) {
      output += `# TYPE ${name} counter\n`
      output += `${name} ${value}\n`
    }
    
    // Gauges
    for (const [name, value] of this.gauges.entries()) {
      output += `# TYPE ${name} gauge\n`
      output += `${name} ${value}\n`
    }
    
    // Histogramas
    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue
      
      const sorted = [...values].sort((a, b) => a - b)
      const sum = sorted.reduce((acc, val) => acc + val, 0)
      const count = sorted.length
      
      output += `# TYPE ${name} histogram\n`
      output += `${name}_sum ${sum}\n`
      output += `${name}_count ${count}\n`
      
      // Buckets
      const buckets = [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
      for (const bucket of buckets) {
        const count = sorted.filter(v => v <= bucket).length
        output += `${name}_bucket{le="${bucket}"} ${count}\n`
      }
      output += `${name}_bucket{le="+Inf"} ${count}\n`
    }
    
    return output
  }

  /**
   * Exporta métricas no formato JSON
   */
  public exportJsonMetrics(): {
    counters: Record<string, number>
    gauges: Record<string, number>
    histograms: Record<string, number[]>
    performance: PerformanceMetric[]
    health: HealthCheck[]
    alerts: Alert[]
    timestamp: number
  } {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
      performance: this.performanceMetrics.slice(-100), // Últimas 100
      health: Array.from(this.healthChecks.values()),
      alerts: Array.from(this.alerts.values()),
      timestamp: Date.now(),
    }
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private startMetricsCollection(): void {
    // Coletar métricas do sistema a cada minuto
    setInterval(async () => {
      await this.collectSystemMetrics()
    }, 60000)
    
    // Coletar métricas da aplicação a cada 30 segundos
    setInterval(() => {
      const appMetrics = this.getApplicationMetrics()
      this.setGauge('app_requests_total', appMetrics.requests.total)
      this.setGauge('app_requests_rate', appMetrics.requests.rate)
      this.setGauge('app_response_time_avg', appMetrics.response.averageTime)
      this.setGauge('app_cache_hit_rate', appMetrics.cache.hitRate)
    }, 30000)
  }

  private startHealthChecks(): void {
    // Registrar health checks padrão
    this.registerHealthCheck('database', async () => {
      // Implementar verificação do banco de dados
      return { status: 'healthy', message: 'Database is responsive' }
    })
    
    this.registerHealthCheck('cache', async () => {
      // Implementar verificação do cache
      return { status: 'healthy', message: 'Cache is operational' }
    })
    
    this.registerHealthCheck('external_apis', async () => {
      // Implementar verificação de APIs externas
      return { status: 'healthy', message: 'External APIs are accessible' }
    })
  }

  private startAlertEvaluation(): void {
    // Avaliar regras de alerta a cada minuto
    setInterval(() => {
      this.evaluateAlertRules()
    }, 60000)
  }

  private setupDefaultAlertRules(): void {
    // Regras de alerta padrão
    this.addAlertRule({
      name: 'high_error_rate',
      condition: 'error_rate > 5',
      threshold: 5,
      severity: 'warning',
      enabled: true,
      cooldown: 300,
      actions: [
        {
          type: 'email',
          config: {
            to: config.monitoring.alertEmail,
            subject: 'High Error Rate Alert',
          },
        },
      ],
    })
    
    this.addAlertRule({
      name: 'high_response_time',
      condition: 'avg_response_time > 5000',
      threshold: 5000,
      severity: 'warning',
      enabled: true,
      cooldown: 300,
      actions: [
        {
          type: 'email',
          config: {
            to: config.monitoring.alertEmail,
            subject: 'High Response Time Alert',
          },
        },
      ],
    })
  }

  private evaluateAlertRules(): void {
    const appMetrics = this.getApplicationMetrics()
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue
      
      let shouldAlert = false
      
      // Avaliar condições simples
      switch (rule.name) {
        case 'high_error_rate':
          const errorRate = (appMetrics.requests.errors / appMetrics.requests.total) * 100
          shouldAlert = errorRate > rule.threshold
          break
        case 'high_response_time':
          shouldAlert = appMetrics.response.averageTime > rule.threshold
          break
      }
      
      if (shouldAlert) {
        // Verificar cooldown
        const existingAlert = Array.from(this.alerts.values())
          .find(alert => alert.name === rule.name && !alert.resolved)
        
        if (!existingAlert) {
          this.triggerAlert(
            rule.name,
            rule.severity,
            `Alert condition met: ${rule.condition}`,
            { threshold: rule.threshold }
          )
        }
      }
    }
  }

  private async executeAlertActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailAlert(alert, action.config)
            break
          case 'webhook':
            await this.sendWebhookAlert(alert, action.config)
            break
          case 'slack':
            await this.sendSlackAlert(alert, action.config)
            break
        }
      } catch (error) {
        logger.error('Failed to execute alert action', error as Error, {
          alertId: alert.id,
          actionType: action.type,
        })
      }
    }
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Implementar envio de email
    logger.info('Email alert sent', { alertId: alert.id })
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    // Implementar webhook
    logger.info('Webhook alert sent', { alertId: alert.id })
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    // Implementar Slack
    logger.info('Slack alert sent', { alertId: alert.id })
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const monitoring = new MonitoringManager()

// =====================================================
// DECORATORS E UTILITÁRIOS
// =====================================================

/**
 * Decorator para monitoramento automático de métodos
 */
export function Monitor(
  operation?: string,
  tags?: Record<string, string>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const operationName = operation || `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      let success = true
      let error: string | undefined

      try {
        const result = await method.apply(this, args)
        return result
      } catch (err) {
        success = false
        error = (err as Error).message
        throw err
      } finally {
        const duration = Date.now() - startTime
        monitoring.recordPerformance(operationName, duration, success, error, {
          args: args.length,
          tags,
        })
      }
    }

    return descriptor
  }
}

/**
 * Middleware para monitoramento de requisições HTTP
 */
export function createMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const originalSend = res.send

    res.send = function (data: any) {
      const duration = Date.now() - startTime
      const success = res.statusCode < 400
      
      monitoring.recordPerformance(
        `http_${req.method}_${req.route?.path || req.path}`,
        duration,
        success,
        success ? undefined : `HTTP ${res.statusCode}`,
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        }
      )
      
      monitoring.incrementCounter('http_requests_total', 1, {
        method: req.method,
        status: res.statusCode.toString(),
      })
      
      return originalSend.call(this, data)
    }

    next()
  }
}

/**
 * Função para criar métricas customizadas
 */
export function createCustomMetric(
  name: string,
  description: string,
  type: Metric['unit'] = 'count'
) {
  return {
    increment: (value = 1, tags?: Record<string, string>) => {
      monitoring.incrementCounter(name, value, tags)
    },
    set: (value: number, tags?: Record<string, string>) => {
      monitoring.setGauge(name, value, tags)
    },
    record: (value: number, tags?: Record<string, string>) => {
      monitoring.recordHistogram(name, value, tags)
    },
    time: () => {
      const timerId = monitoring.startTimer(name)
      return () => monitoring.stopTimer(timerId)
    },
  }
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default monitoring
export {
  MonitoringManager,
  type Metric,
  type PerformanceMetric,
  type HealthCheck,
  type SystemMetrics,
  type ApplicationMetrics,
  type Alert,
  type AlertRule,
  type AlertAction,
}
