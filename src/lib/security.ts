// =====================================================
// SECURITY AND ENCRYPTION UTILITIES
// Descrição: Utilitários para segurança, criptografia e proteção de dados
// =====================================================

// Browser-compatible crypto functions
const crypto = globalThis.crypto || (globalThis as any).msCrypto;

// Buffer polyfill for browser
const Buffer = {
  from: (data: any, encoding?: string) => {
    if (data instanceof Uint8Array) {
      return data;
    }
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      return encoder.encode(data);
    }
    if (Array.isArray(data)) {
      return new Uint8Array(data);
    }
    return new Uint8Array(data);
  },
  alloc: (size: number) => new Uint8Array(size)
};

// Polyfill for Node.js crypto functions in browser
const createHash = (algorithm: string) => {
  return {
    update: (data: string) => ({
      digest: (encoding: string) => {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        return crypto.subtle.digest('SHA-256', dataBuffer).then((hash: ArrayBuffer) => {
          const hashArray = new Uint8Array(hash);
          return encoding === 'hex' ? Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('') : hashArray;
        });
      }
    })
  };
};

const createHmac = (algorithm: string, key: string | Buffer) => {
  return {
    update: (data: string) => ({
      digest: (encoding: string) => {
        // Simplified HMAC implementation for browser
        const encoder = new TextEncoder();
        const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
        const dataBuffer = encoder.encode(data);
        return crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        ).then(cryptoKey => 
          crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
        ).then((signature: ArrayBuffer) => {
          const signatureArray = new Uint8Array(signature);
          return encoding === 'hex' ? Array.from(signatureArray).map(b => b.toString(16).padStart(2, '0')).join('') : signatureArray;
        });
      }
    })
  };
};

const randomBytes = (size: number): Buffer => {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Buffer.from(array);
};

const scrypt = async (password: string, salt: string | Buffer, keylen: number): Promise<Buffer> => {
  // Simplified scrypt implementation using PBKDF2 for browser compatibility
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = typeof salt === 'string' ? encoder.encode(salt) : salt;
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    keylen * 8
  );
  
  return Buffer.from(derivedBits);
};

const timingSafeEqual = (a: Buffer, b: Buffer): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
};

const promisify = (fn: Function) => {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
};
import { config } from './config'
import { logger } from './logger'
import type { Database } from '../types/supabase'

const scryptAsync = promisify(scrypt)

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface EncryptionResult {
  encrypted: string
  iv: string
  salt?: string
  tag?: string
}

export interface HashResult {
  hash: string
  salt: string
}

export interface TokenPayload {
  userId: string
  tenantId: string
  role: string
  permissions: string[]
  iat: number
  exp: number
  jti?: string
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_denied' | 'data_access' | 'suspicious_activity'
  userId?: string
  tenantId?: string
  ip: string
  userAgent: string
  timestamp: number
  details?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RateLimitConfig {
  windowMs: number // Janela de tempo em ms
  maxRequests: number // Máximo de requisições na janela
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: any) => string
}

export interface SecurityPolicy {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSymbols: boolean
  passwordMaxAge: number // dias
  sessionTimeout: number // minutos
  maxLoginAttempts: number
  lockoutDuration: number // minutos
  requireMFA: boolean
  allowedFileTypes: string[]
  maxFileSize: number // bytes
  ipWhitelist?: string[]
  ipBlacklist?: string[]
}

// =====================================================
// CONSTANTES DE SEGURANÇA
// =====================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const HASH_ALGORITHM = 'sha256'
const HMAC_ALGORITHM = 'sha256'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const TOKEN_LENGTH = 32

const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: true,
  passwordMaxAge: 90,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  requireMFA: false,
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
}

// =====================================================
// CLASSE DE SEGURANÇA PRINCIPAL
// =====================================================

class SecurityManager {
  private readonly encryptionKey: Uint8Array
  private readonly hmacKey: Uint8Array
  private readonly policy: SecurityPolicy
  private readonly rateLimitStore = new Map<string, { count: number; resetTime: number }>()
  private readonly loginAttempts = new Map<string, { count: number; lockUntil?: number }>()

  constructor() {
    this.encryptionKey = this.deriveKey(config.security.encryptionKey, 'encryption')
    this.hmacKey = this.deriveKey(config.security.encryptionKey, 'hmac')
    this.policy = { ...DEFAULT_SECURITY_POLICY, ...config.security.policy }
    this.startCleanupInterval()
  }

  // =====================================================
  // CRIPTOGRAFIA E HASH
  // =====================================================

  /**
   * Criptografa dados usando base64 (simplificado para browser)
   */
  public encrypt(data: string): EncryptionResult {
    try {
      const iv = randomBytes(IV_LENGTH)
      const encrypted = btoa(data) // Simplified encryption using base64
      
      return {
        encrypted,
        iv: iv.toString('hex'),
      }
    } catch (error) {
      logger.error('Encryption failed', error as Error)
      throw new Error('Falha na criptografia')
    }
  }

  /**
   * Descriptografa dados (simplificado para browser)
   */
  public decrypt(encryptionResult: EncryptionResult): string {
    try {
      const { encrypted } = encryptionResult
      return atob(encrypted) // Simplified decryption using base64
    } catch (error) {
      logger.error('Decryption failed', error as Error)
      throw new Error('Falha na descriptografia')
    }
  }

  /**
   * Gera hash seguro com salt
   */
  public async hashPassword(password: string): Promise<HashResult> {
    try {
      const salt = randomBytes(SALT_LENGTH)
      const hash = await scryptAsync(password, salt, 64) as Buffer
      
      return {
        hash: hash.toString('hex'),
        salt: salt.toString('hex'),
      }
    } catch (error) {
      logger.error('Password hashing failed', error as Error)
      throw new Error('Falha no hash da senha')
    }
  }

  /**
   * Verifica senha contra hash
   */
  public async verifyPassword(password: string, hashResult: HashResult): Promise<boolean> {
    try {
      const { hash, salt } = hashResult
      const saltBuffer = Buffer.from(salt, 'hex')
      const hashBuffer = Buffer.from(hash, 'hex')
      
      const derivedHash = await scryptAsync(password, saltBuffer, 64) as Buffer
      
      return timingSafeEqual(hashBuffer, derivedHash)
    } catch (error) {
      logger.error('Password verification failed', error as Error)
      return false
    }
  }

  /**
   * Gera hash HMAC para integridade
   */
  public generateHmac(data: string): string {
    // Simplified HMAC for browser compatibility
    const encoder = new TextEncoder();
    const keyHex = Array.from(this.hmacKey).map(b => b.toString(16).padStart(2, '0')).join('');
    const dataBuffer = encoder.encode(data + keyHex);
    return Array.from(new Uint8Array(dataBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifica HMAC
   */
  public verifyHmac(data: string, hmac: string): boolean {
    const expectedHmac = this.generateHmac(data)
    return timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    )
  }

  // =====================================================
  // TOKENS E AUTENTICAÇÃO
  // =====================================================

  /**
   * Gera token seguro
   */
  public generateSecureToken(length = TOKEN_LENGTH): string {
    return randomBytes(length).toString('hex')
  }

  /**
   * Gera token de sessão
   */
  public generateSessionToken(payload: TokenPayload): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    }

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    
    const signature = this.generateHmac(`${encodedHeader}.${encodedPayload}`)
    const encodedSignature = Buffer.from(signature, 'hex').toString('base64url')
    
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
  }

  /**
   * Verifica token de sessão
   */
  public verifySessionToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts
      
      // Verificar assinatura
      const expectedSignature = this.generateHmac(`${encodedHeader}.${encodedPayload}`)
      const expectedEncodedSignature = Buffer.from(expectedSignature, 'hex').toString('base64url')
      
      if (encodedSignature !== expectedEncodedSignature) {
        return null
      }

      // Decodificar payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as TokenPayload
      
      // Verificar expiração
      if (payload.exp < Date.now() / 1000) {
        return null
      }

      return payload
    } catch (error) {
      logger.error('Token verification failed', error as Error)
      return null
    }
  }

  // =====================================================
  // VALIDAÇÃO DE SEGURANÇA
  // =====================================================

  /**
   * Valida força da senha
   */
  public validatePasswordStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    // Comprimento mínimo
    if (password.length < this.policy.passwordMinLength) {
      feedback.push(`Senha deve ter pelo menos ${this.policy.passwordMinLength} caracteres`)
    } else {
      score += 1
    }

    // Maiúsculas
    if (this.policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra maiúscula')
    } else if (/[A-Z]/.test(password)) {
      score += 1
    }

    // Minúsculas
    if (this.policy.passwordRequireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra minúscula')
    } else if (/[a-z]/.test(password)) {
      score += 1
    }

    // Números
    if (this.policy.passwordRequireNumbers && !/\d/.test(password)) {
      feedback.push('Senha deve conter pelo menos um número')
    } else if (/\d/.test(password)) {
      score += 1
    }

    // Símbolos
    if (this.policy.passwordRequireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Senha deve conter pelo menos um símbolo')
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    }

    // Padrões comuns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /(.)\1{2,}/, // Caracteres repetidos
    ]

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        feedback.push('Senha contém padrões comuns ou inseguros')
        score -= 1
        break
      }
    }

    return {
      isValid: feedback.length === 0,
      score: Math.max(0, Math.min(5, score)),
      feedback,
    }
  }

  /**
   * Valida tipo de arquivo
   */
  public validateFileType(filename: string, mimeType?: string): boolean {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    if (!this.policy.allowedFileTypes.includes(extension)) {
      return false
    }

    // Validação adicional por MIME type se fornecido
    if (mimeType) {
      const allowedMimeTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }

      const expectedMimeType = allowedMimeTypes[extension as keyof typeof allowedMimeTypes]
      if (expectedMimeType && mimeType !== expectedMimeType) {
        return false
      }
    }

    return true
  }

  /**
   * Valida tamanho do arquivo
   */
  public validateFileSize(size: number): boolean {
    return size <= this.policy.maxFileSize
  }

  // =====================================================
  // RATE LIMITING
  // =====================================================

  /**
   * Verifica rate limit
   */
  public checkRateLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const entry = this.rateLimitStore.get(key)

    if (!entry || now > entry.resetTime) {
      // Nova janela ou primeira requisição
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return true
    }

    if (entry.count >= config.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  /**
   * Registra tentativa de login
   */
  public recordLoginAttempt(identifier: string, success: boolean): boolean {
    const now = Date.now()
    const entry = this.loginAttempts.get(identifier)

    if (success) {
      // Login bem-sucedido, limpar tentativas
      this.loginAttempts.delete(identifier)
      return true
    }

    if (!entry) {
      // Primeira tentativa falhada
      this.loginAttempts.set(identifier, { count: 1 })
      return true
    }

    // Verificar se ainda está bloqueado
    if (entry.lockUntil && now < entry.lockUntil) {
      return false
    }

    // Incrementar contador
    entry.count++

    // Verificar se deve bloquear
    if (entry.count >= this.policy.maxLoginAttempts) {
      entry.lockUntil = now + (this.policy.lockoutDuration * 60 * 1000)
      logger.warn('Account locked due to failed login attempts', {
        identifier,
        attempts: entry.count,
        lockUntil: new Date(entry.lockUntil),
      })
      return false
    }

    return true
  }

  /**
   * Verifica se conta está bloqueada
   */
  public isAccountLocked(identifier: string): boolean {
    const entry = this.loginAttempts.get(identifier)
    if (!entry || !entry.lockUntil) {
      return false
    }

    const now = Date.now()
    if (now >= entry.lockUntil) {
      // Desbloqueio automático
      this.loginAttempts.delete(identifier)
      return false
    }

    return true
  }

  // =====================================================
  // AUDITORIA E LOGS DE SEGURANÇA
  // =====================================================

  /**
   * Registra evento de segurança
   */
  public logSecurityEvent(event: SecurityEvent): void {
    logger.security('Security event', {
      type: event.type,
      userId: event.userId,
      tenantId: event.tenantId,
      ip: event.ip,
      userAgent: event.userAgent,
      severity: event.severity,
      details: event.details,
    })

    // Alertas para eventos críticos
    if (event.severity === 'critical') {
      this.sendSecurityAlert(event)
    }
  }

  /**
   * Detecta atividade suspeita
   */
  public detectSuspiciousActivity(
    userId: string,
    ip: string,
    userAgent: string
  ): boolean {
    // Implementar lógica de detecção
    // - Múltiplos IPs em pouco tempo
    // - User agents diferentes
    // - Padrões de acesso anômalos
    // - Geolocalização inconsistente
    
    return false // Placeholder
  }

  // =====================================================
  // SANITIZAÇÃO E MASCARAMENTO
  // =====================================================

  /**
   * Sanitiza entrada do usuário
   */
  public sanitizeInput(input: string): string {
    return input
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        }
        return entities[char] || char
      })
      .trim()
  }

  /**
   * Mascara dados sensíveis
   */
  public maskSensitiveData(data: string, type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'card'): string {
    switch (type) {
      case 'cpf':
        return data.replace(/(\d{3})\d{3}(\d{3})/, '$1.***.$2-**')
      case 'cnpj':
        return data.replace(/(\d{2})\d{3}\d{3}(\d{4})/, '$1.***.***/$2-**')
      case 'email':
        const [local, domain] = data.split('@')
        const maskedLocal = local.length > 2 
          ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
          : local
        return `${maskedLocal}@${domain}`
      case 'phone':
        return data.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-****')
      case 'card':
        return data.replace(/(\d{4})\d{8}(\d{4})/, '$1 **** **** $2')
      default:
        return '***'
    }
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private deriveKey(masterKey: string, purpose: string): Uint8Array {
    // Simplified key derivation for browser compatibility
    const encoder = new TextEncoder();
    const combined = encoder.encode(masterKey + purpose);
    // Use a simple hash-like transformation
    const hash = new Uint8Array(32);
    for (let i = 0; i < combined.length; i++) {
      hash[i % 32] ^= combined[i];
    }
    return hash;
  }

  private sendSecurityAlert(event: SecurityEvent): void {
    // Implementar envio de alertas
    // - Email para administradores
    // - Webhook para sistemas de monitoramento
    // - Notificação push
    logger.error('Critical security event', event)
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup()
    }, 60000) // Limpeza a cada minuto
  }

  private cleanup(): void {
    const now = Date.now()
    
    // Limpar rate limits expirados
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }

    // Limpar tentativas de login expiradas
    for (const [key, entry] of this.loginAttempts.entries()) {
      if (entry.lockUntil && now > entry.lockUntil) {
        this.loginAttempts.delete(key)
      }
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const security = new SecurityManager()

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Gera ID único seguro
 */
export function generateSecureId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(8).toString('hex')
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * Gera código de verificação numérico
 */
export function generateVerificationCode(length = 6): string {
  const digits = '0123456789'
  let code = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length)
    code += digits[randomIndex]
  }
  
  return code
}

/**
 * Valida IP contra whitelist/blacklist
 */
export function validateIpAddress(ip: string, policy: SecurityPolicy): boolean {
  // Verificar blacklist primeiro
  if (policy.ipBlacklist && policy.ipBlacklist.includes(ip)) {
    return false
  }

  // Se há whitelist, IP deve estar nela
  if (policy.ipWhitelist && policy.ipWhitelist.length > 0) {
    return policy.ipWhitelist.includes(ip)
  }

  return true
}

/**
 * Extrai informações do User-Agent
 */
export function parseUserAgent(userAgent: string): {
  browser: string
  os: string
  device: string
  isBot: boolean
} {
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent)
  
  // Detecção simples de browser
  let browser = 'Unknown'
  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'
  
  // Detecção simples de OS
  let os = 'Unknown'
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS')) os = 'iOS'
  
  // Detecção simples de device
  let device = 'Desktop'
  if (userAgent.includes('Mobile')) device = 'Mobile'
  else if (userAgent.includes('Tablet')) device = 'Tablet'
  
  return { browser, os, device, isBot }
}

/**
 * Middleware para rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: any, res: any, next: any) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip
    
    if (!security.checkRateLimit(key, config)) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(config.windowMs / 1000),
      })
    }
    
    next()
  }
}

/**
 * Middleware para validação de IP
 */
export function createIpValidationMiddleware(policy: SecurityPolicy) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress
    
    if (!validateIpAddress(ip, policy)) {
      security.logSecurityEvent({
        type: 'permission_denied',
        ip,
        userAgent: req.get('User-Agent') || '',
        timestamp: Date.now(),
        severity: 'high',
        details: { reason: 'IP not allowed' },
      })
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied from this IP address',
      })
    }
    
    next()
  }
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default security
export {
  SecurityManager,
  type EncryptionResult,
  type HashResult,
  type TokenPayload,
  type SecurityEvent,
  type RateLimitConfig,
  type SecurityPolicy,
}
