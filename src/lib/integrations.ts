// =====================================================
// EXTERNAL INTEGRATIONS AND WEBHOOKS
// Descrição: Utilitários para integração com APIs externas e gerenciamento de webhooks
// =====================================================

import { config } from './config'
import { logger } from './logger'
import { security } from './security'
import { cache } from './cache'
import type { Database } from '../types/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode: number
  headers?: Record<string, string>
  requestId?: string
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  retryDelay?: number
  cache?: boolean
  cacheTtl?: number
}

export interface WebhookEvent {
  id: string
  type: string
  source: string
  timestamp: number
  data: any
  signature?: string
  verified: boolean
}

export interface WebhookConfig {
  url: string
  secret: string
  events: string[]
  retries: number
  timeout: number
  headers?: Record<string, string>
}

export interface PaymentProvider {
  name: string
  apiKey: string
  apiSecret?: string
  environment: 'sandbox' | 'production'
  webhookSecret?: string
}

export interface BankingIntegration {
  provider: string
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
  scopes: string[]
}

export interface NotificationProvider {
  type: 'email' | 'sms' | 'push' | 'whatsapp'
  provider: string
  apiKey: string
  config: Record<string, any>
}

// =====================================================
// CLASSE PRINCIPAL DE INTEGRAÇÕES
// =====================================================

class IntegrationManager {
  private readonly httpClient: typeof fetch
  private readonly webhookQueue = new Map<string, WebhookEvent[]>()
  private readonly retryQueue = new Map<string, { config: ApiRequestConfig; attempts: number }>()

  constructor() {
    this.httpClient = fetch
    this.startWebhookProcessor()
    this.startRetryProcessor()
  }

  // =====================================================
  // HTTP CLIENT GENÉRICO
  // =====================================================

  /**
   * Executa requisição HTTP com retry e cache
   */
  public async makeRequest<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const requestId = security.generateSecureToken(16)
    const startTime = Date.now()

    try {
      // Verificar cache se habilitado
      if (config.cache && config.method === 'GET') {
        const cacheKey = this.generateCacheKey(config)
        const cached = await cache.get<ApiResponse<T>>(cacheKey)
        if (cached) {
          logger.debug('API request served from cache', { url: config.url, requestId })
          return cached
        }
      }

      const response = await this.executeRequest(config, requestId)
      const duration = Date.now() - startTime

      // Armazenar em cache se configurado
      if (config.cache && config.method === 'GET' && response.success) {
        const cacheKey = this.generateCacheKey(config)
        await cache.set(cacheKey, response, {
          ttl: config.cacheTtl || 300, // 5 minutos por padrão
          tags: ['api', 'external'],
        })
      }

      logger.info('API request completed', {
        url: config.url,
        method: config.method,
        statusCode: response.statusCode,
        duration,
        requestId,
      })

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error('API request failed', error as Error, {
        url: config.url,
        method: config.method,
        duration,
        requestId,
      })

      // Adicionar à fila de retry se configurado
      if (config.retries && config.retries > 0) {
        this.addToRetryQueue(config, requestId)
      }

      return {
        success: false,
        error: (error as Error).message,
        statusCode: 500,
        requestId,
      }
    }
  }

  /**
   * Executa a requisição HTTP
   */
  private async executeRequest<T = any>(
    config: ApiRequestConfig,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeout = config.timeout || 30000

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': `Revalya-Integration/1.0`,
        'X-Request-ID': requestId,
        ...config.headers,
      }

      const fetchConfig: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal,
      }

      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        fetchConfig.body = typeof config.body === 'string' 
          ? config.body 
          : JSON.stringify(config.body)
      }

      const response = await this.httpClient(config.url, fetchConfig)
      clearTimeout(timeoutId)

      let data: T | undefined
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text() as any
      }

      return {
        success: response.ok,
        data,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        requestId,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // =====================================================
  // INTEGRAÇÕES DE PAGAMENTO
  // =====================================================

  /**
   * Integração com Stripe
   */
  public async stripeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    const stripeConfig = config.integrations.payment.stripe
    
    return await this.makeRequest<T>({
      method,
      url: `https://api.stripe.com/v1/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${stripeConfig.secretKey}`,
        'Stripe-Version': '2023-10-16',
      },
      body: data,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  /**
   * Integração com PagSeguro
   */
  public async pagSeguroRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    const pagSeguroConfig = config.integrations.payment.pagSeguro
    
    return await this.makeRequest<T>({
      method,
      url: `${pagSeguroConfig.apiUrl}/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${pagSeguroConfig.token}`,
        'Content-Type': 'application/json',
      },
      body: data,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  /**
   * Integração com Mercado Pago
   */
  public async mercadoPagoRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    const mercadoPagoConfig = config.integrations.payment.mercadoPago
    
    return await this.makeRequest<T>({
      method,
      url: `https://api.mercadopago.com/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${mercadoPagoConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  // =====================================================
  // INTEGRAÇÕES BANCÁRIAS
  // =====================================================

  /**
   * Integração com Open Banking
   */
  public async openBankingRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    accessToken?: string
  ): Promise<ApiResponse<T>> {
    const openBankingConfig = config.integrations.banking.openBanking
    
    return await this.makeRequest<T>({
      method,
      url: `${openBankingConfig.apiUrl}/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken || openBankingConfig.accessToken}`,
        'Content-Type': 'application/json',
        'x-fapi-financial-id': openBankingConfig.financialId,
      },
      body: data,
      timeout: 30000,
      retries: 2,
      retryDelay: 2000,
    })
  }

  /**
   * Integração com Pix
   */
  public async pixRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    const pixConfig = config.integrations.banking.pix
    
    return await this.makeRequest<T>({
      method,
      url: `${pixConfig.apiUrl}/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${pixConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  // =====================================================
  // INTEGRAÇÕES DE NOTIFICAÇÃO
  // =====================================================

  /**
   * Envio de email via SendGrid
   */
  public async sendEmail(
    to: string | string[],
    subject: string,
    content: string,
    isHtml = true
  ): Promise<ApiResponse> {
    const sendGridConfig = config.integrations.notifications.sendGrid
    
    const emailData = {
      personalizations: [{
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
      }],
      from: {
        email: sendGridConfig.fromEmail,
        name: sendGridConfig.fromName,
      },
      content: [{
        type: isHtml ? 'text/html' : 'text/plain',
        value: content,
      }],
    }

    return await this.makeRequest({
      method: 'POST',
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: {
        'Authorization': `Bearer ${sendGridConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: emailData,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  /**
   * Envio de SMS via Twilio
   */
  public async sendSms(
    to: string,
    message: string
  ): Promise<ApiResponse> {
    const twilioConfig = config.integrations.notifications.twilio
    
    const smsData = {
      To: to,
      From: twilioConfig.phoneNumber,
      Body: message,
    }

    const auth = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64')

    return await this.makeRequest({
      method: 'POST',
      url: `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(smsData).toString(),
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  /**
   * Envio de WhatsApp via Twilio
   */
  public async sendWhatsApp(
    to: string,
    message: string
  ): Promise<ApiResponse> {
    const twilioConfig = config.integrations.notifications.twilio
    
    const whatsappData = {
      To: `whatsapp:${to}`,
      From: `whatsapp:${twilioConfig.whatsappNumber}`,
      Body: message,
    }

    const auth = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64')

    return await this.makeRequest({
      method: 'POST',
      url: `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(whatsappData).toString(),
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    })
  }

  // =====================================================
  // GERENCIAMENTO DE WEBHOOKS
  // =====================================================

  /**
   * Processa webhook recebido
   */
  public async processWebhook(
    source: string,
    headers: Record<string, string>,
    body: any,
    signature?: string
  ): Promise<WebhookEvent | null> {
    try {
      // Verificar assinatura se fornecida
      let verified = true
      if (signature) {
        verified = this.verifyWebhookSignature(source, body, signature)
      }

      const event: WebhookEvent = {
        id: security.generateSecureToken(16),
        type: this.extractEventType(source, body),
        source,
        timestamp: Date.now(),
        data: body,
        signature,
        verified,
      }

      if (!verified) {
        logger.warn('Webhook signature verification failed', {
          source,
          eventId: event.id,
        })
        return null
      }

      // Adicionar à fila de processamento
      this.addToWebhookQueue(event)

      logger.info('Webhook received and queued', {
        source,
        type: event.type,
        eventId: event.id,
        verified,
      })

      return event
    } catch (error) {
      logger.error('Webhook processing failed', error as Error, { source })
      return null
    }
  }

  /**
   * Envia webhook para URL externa
   */
  public async sendWebhook(
    config: WebhookConfig,
    eventType: string,
    data: any
  ): Promise<ApiResponse> {
    const payload = {
      id: security.generateSecureToken(16),
      type: eventType,
      timestamp: Date.now(),
      data,
    }

    const signature = security.generateHmac(JSON.stringify(payload))

    return await this.makeRequest({
      method: 'POST',
      url: config.url,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        ...config.headers,
      },
      body: payload,
      timeout: config.timeout,
      retries: config.retries,
      retryDelay: 2000,
    })
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private generateCacheKey(config: ApiRequestConfig): string {
    const key = `${config.method}:${config.url}`
    if (config.body) {
      const bodyHash = security.generateHmac(JSON.stringify(config.body))
      return `${key}:${bodyHash}`
    }
    return key
  }

  private addToRetryQueue(config: ApiRequestConfig, requestId: string): void {
    this.retryQueue.set(requestId, {
      config,
      attempts: 0,
    })
  }

  private addToWebhookQueue(event: WebhookEvent): void {
    const queue = this.webhookQueue.get(event.source) || []
    queue.push(event)
    this.webhookQueue.set(event.source, queue)
  }

  private verifyWebhookSignature(
    source: string,
    body: any,
    signature: string
  ): boolean {
    try {
      const secret = this.getWebhookSecret(source)
      if (!secret) return false

      const expectedSignature = security.generateHmac(JSON.stringify(body))
      return security.verifyHmac(JSON.stringify(body), signature)
    } catch (error) {
      logger.error('Webhook signature verification error', error as Error)
      return false
    }
  }

  private getWebhookSecret(source: string): string | null {
    const secrets: Record<string, string> = {
      stripe: config.integrations.payment.stripe.webhookSecret,
      pagseguro: config.integrations.payment.pagSeguro.webhookSecret,
      mercadopago: config.integrations.payment.mercadoPago.webhookSecret,
    }

    return secrets[source] || null
  }

  private extractEventType(source: string, body: any): string {
    // Extrair tipo de evento baseado na fonte
    switch (source) {
      case 'stripe':
        return body.type || 'unknown'
      case 'pagseguro':
        return body.notificationType || 'unknown'
      case 'mercadopago':
        return body.action || 'unknown'
      default:
        return body.event_type || body.type || 'unknown'
    }
  }

  private startWebhookProcessor(): void {
    setInterval(() => {
      this.processWebhookQueue()
    }, 5000) // Processar a cada 5 segundos
  }

  private startRetryProcessor(): void {
    setInterval(() => {
      this.processRetryQueue()
    }, 10000) // Processar retries a cada 10 segundos
  }

  private async processWebhookQueue(): Promise<void> {
    for (const [source, events] of this.webhookQueue.entries()) {
      if (events.length === 0) continue

      const event = events.shift()!
      
      try {
        await this.handleWebhookEvent(event)
        logger.debug('Webhook event processed', {
          source,
          type: event.type,
          eventId: event.id,
        })
      } catch (error) {
        logger.error('Webhook event processing failed', error as Error, {
          source,
          type: event.type,
          eventId: event.id,
        })
        
        // Recolocar na fila para retry (máximo 3 tentativas)
        if (!event.data._retryCount || event.data._retryCount < 3) {
          event.data._retryCount = (event.data._retryCount || 0) + 1
          events.push(event)
        }
      }
    }
  }

  private async processRetryQueue(): Promise<void> {
    for (const [requestId, item] of this.retryQueue.entries()) {
      if (item.attempts >= (item.config.retries || 3)) {
        this.retryQueue.delete(requestId)
        continue
      }

      item.attempts++
      
      try {
        const response = await this.executeRequest(item.config, requestId)
        if (response.success) {
          this.retryQueue.delete(requestId)
          logger.info('Request retry succeeded', {
            url: item.config.url,
            attempts: item.attempts,
            requestId,
          })
        }
      } catch (error) {
        logger.warn('Request retry failed', {
          url: item.config.url,
          attempts: item.attempts,
          requestId,
          error: (error as Error).message,
        })
      }

      // Delay antes do próximo retry
      await new Promise(resolve => 
        setTimeout(resolve, item.config.retryDelay || 1000)
      )
    }
  }

  private async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    // Implementar handlers específicos por fonte e tipo de evento
    switch (event.source) {
      case 'stripe':
        await this.handleStripeWebhook(event)
        break
      case 'pagseguro':
        await this.handlePagSeguroWebhook(event)
        break
      case 'mercadopago':
        await this.handleMercadoPagoWebhook(event)
        break
      default:
        logger.warn('Unknown webhook source', { source: event.source })
    }
  }

  private async handleStripeWebhook(event: WebhookEvent): Promise<void> {
    // Implementar lógica específica do Stripe
    logger.info('Processing Stripe webhook', {
      type: event.type,
      eventId: event.id,
    })
  }

  private async handlePagSeguroWebhook(event: WebhookEvent): Promise<void> {
    // Implementar lógica específica do PagSeguro
    logger.info('Processing PagSeguro webhook', {
      type: event.type,
      eventId: event.id,
    })
  }

  private async handleMercadoPagoWebhook(event: WebhookEvent): Promise<void> {
    // Implementar lógica específica do Mercado Pago
    logger.info('Processing Mercado Pago webhook', {
      type: event.type,
      eventId: event.id,
    })
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const integrations = new IntegrationManager()

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Valida configuração de webhook
 */
export function validateWebhookConfig(config: WebhookConfig): boolean {
  try {
    new URL(config.url)
    return (
      config.secret.length >= 16 &&
      config.events.length > 0 &&
      config.retries >= 0 &&
      config.timeout > 0
    )
  } catch {
    return false
  }
}

/**
 * Cria configuração padrão de webhook
 */
export function createWebhookConfig(
  url: string,
  secret: string,
  events: string[]
): WebhookConfig {
  return {
    url,
    secret,
    events,
    retries: 3,
    timeout: 30000,
    headers: {
      'User-Agent': 'Revalya-Webhook/1.0',
    },
  }
}

/**
 * Middleware para processar webhooks
 */
export function createWebhookMiddleware(source: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const signature = req.headers['x-webhook-signature'] || 
                       req.headers['stripe-signature'] ||
                       req.headers['x-pagseguro-signature']
      
      const event = await integrations.processWebhook(
        source,
        req.headers,
        req.body,
        signature
      )

      if (!event) {
        return res.status(400).json({
          error: 'Invalid webhook',
          message: 'Webhook verification failed',
        })
      }

      req.webhookEvent = event
      next()
    } catch (error) {
      logger.error('Webhook middleware error', error as Error)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process webhook',
      })
    }
  }
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default integrations
export {
  IntegrationManager,
  type ApiResponse,
  type ApiRequestConfig,
  type WebhookEvent,
  type WebhookConfig,
  type PaymentProvider,
  type BankingIntegration,
  type NotificationProvider,
}
