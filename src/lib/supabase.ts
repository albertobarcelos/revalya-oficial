// =====================================================
// SUPABASE CLIENT CONFIGURATION
// Descrição: Configuração centralizada do cliente Supabase
// =====================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// =====================================================
// CONFIGURAÇÕES DO AMBIENTE
// =====================================================

// AIDEV-NOTE: Detecção automática de ambiente
// O sistema detecta automaticamente se está em produção ou desenvolvimento
// baseado na URL do Supabase configurada nas variáveis de ambiente

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Detectar ambiente baseado na URL
const isProduction = supabaseUrl.includes('wyehpiutzvwplllumgdk')
const isDevelopment = supabaseUrl.includes('sqkkktsstkcupldqtsgi') || supabaseUrl.includes('salhcvfmblogfnuqdhve')
const currentEnv = isProduction ? 'production' : isDevelopment ? 'development' : 'unknown'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
  )
}

// AIDEV-NOTE: Validação de ambiente em desenvolvimento
// Em desenvolvimento, avisar se as chaves não foram configuradas
// Suporta tanto o novo formato (sb_publishable_/sb_secret_) quanto o formato antigo (JWT)
if (isDevelopment && (supabaseAnonKey.includes('SUBSTITUA') || supabaseServiceKey?.includes('SUBSTITUA'))) {
  console.warn(
    '⚠️ AMBIENTE DE DESENVOLVIMENTO: Chaves do Supabase precisam ser configuradas!',
    'Acesse: https://supabase.com/dashboard/project/sqkkktsstkcupldqtsgi/settings/api'
  )
}

// AIDEV-NOTE: Validação de formato de chaves
// Verifica se as chaves estão no formato correto (novo ou antigo)
if (isDevelopment && import.meta.env.DEV) {
  const hasNewFormat = supabaseAnonKey.startsWith('sb_publishable_') || supabaseServiceKey?.startsWith('sb_secret_')
  const hasOldFormat = supabaseAnonKey.startsWith('eyJ') || supabaseServiceKey?.startsWith('eyJ')
  
  if (hasNewFormat) {
    console.log('✅ Usando novo formato de chaves API do Supabase (sb_publishable_/sb_secret_)')
  } else if (hasOldFormat) {
    console.log('ℹ️ Usando formato antigo de chaves API do Supabase (JWT)')
  }
}

// Log do ambiente atual (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log(`🔧 Ambiente detectado: ${currentEnv}`)
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
}

// =====================================================
// CLIENTE SUPABASE PRINCIPAL (FRONTEND)
// =====================================================

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // CRÍTICO: Configurar tempo de sessão para 24 horas (padrão Supabase)
    // Isso deve resolver o problema de expiração prematura em 60 segundos
    // AIDEV-NOTE: Storage key dinâmico baseado no ambiente
    storageKey: isProduction 
      ? 'sb-wyehpiutzvwplllumgdk-auth-token' 
      : 'sb-sqkkktsstkcupldqtsgi-auth-token',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'revalya-financial-system',
      // AIDEV-NOTE: NÃO definir Content-Type global - quebra uploads de arquivos
      // O SDK do Supabase gerencia automaticamente o Content-Type por requisição
    },
  },
})

// =====================================================
// CLIENTE SUPABASE ADMIN (BACKEND/EDGE FUNCTIONS)
// =====================================================

export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'revalya-admin-client',
        },
      },
    })
  : null

// =====================================================
// CONFIGURAÇÕES DE STORAGE
// =====================================================

export const STORAGE_BUCKETS = {
  AVATARS: 'profile-avatars',
  DOCUMENTS: 'documents',
  CONTRACTS: 'contracts',
  REPORTS: 'reports',
  SIGNATURES: 'signatures',
  LOGOS: 'logos',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

// =====================================================
// CONFIGURAÇÕES DE REALTIME
// =====================================================

export const REALTIME_CHANNELS = {
  NOTIFICATIONS: 'financial_notifications',
  CONTRACTS: 'digital_contracts',
  REPORTS: 'financial_reports',
  CALCULATIONS: 'financial_calculations',
  AUDIT_LOGS: 'audit_logs',
} as const

export type RealtimeChannel = typeof REALTIME_CHANNELS[keyof typeof REALTIME_CHANNELS]

// =====================================================
// CONFIGURAÇÕES DE SEGURANÇA
// =====================================================

export const SECURITY_CONFIG = {
  // Tempo limite para sessões (em segundos)
  SESSION_TIMEOUT: 24 * 60 * 60, // 24 horas
  
  // Tempo limite para tokens de compartilhamento (em segundos)
  SHARE_TOKEN_TIMEOUT: 7 * 24 * 60 * 60, // 7 dias
  
  // Tamanho máximo de arquivo para upload (em bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Tipos de arquivo permitidos
  ALLOWED_FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    TEXT: ['text/plain', 'text/csv'],
  },
  
  // Configurações de rate limiting
  RATE_LIMITS: {
    NOTIFICATIONS_PER_MINUTE: 10,
    REPORTS_PER_HOUR: 50,
    CALCULATIONS_PER_MINUTE: 30,
    FILE_UPLOADS_PER_HOUR: 100,
  },
} as const

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Verifica se o cliente Supabase está configurado corretamente
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

/**
 * Verifica se o cliente admin está disponível
 */
export function isAdminClientAvailable(): boolean {
  return Boolean(supabaseAdmin)
}

/**
 * Obtém a URL pública de um arquivo no storage
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Obtém uma URL utilizável para imagens do Storage.
 * Tenta primeiro gerar uma URL assinada (funciona para buckets privados e públicos),
 * e faz fallback para a URL pública caso a assinatura falhe.
 *
 * Comentário de nível de função: utilitário que padroniza acesso a imagens em buckets privados/públicos.
 */
export async function getImageUrl(bucket: StorageBucket, path: string, expiresInSeconds: number = 3600): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds)

    if (error || !data?.signedUrl) {
      // Fallback para URL pública
      const publicUrl = getPublicUrl(bucket, path)
      return publicUrl
    }
    return data.signedUrl
  } catch {
    // Fallback final em caso de exceções inesperadas
    const publicUrl = getPublicUrl(bucket, path)
    return publicUrl
  }
}

/**
 * Gera um nome de arquivo único com timestamp
 */
export function generateUniqueFileName(originalName: string, userId?: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  const baseName = originalName.replace(/\.[^/.]+$/, '')
  
  const prefix = userId ? `${userId}_` : ''
  return `${prefix}${baseName}_${timestamp}_${randomString}.${extension}`
}

/**
 * Valida o tipo de arquivo
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * Valida o tamanho do arquivo
 */
export function validateFileSize(file: File, maxSize: number = SECURITY_CONFIG.MAX_FILE_SIZE): boolean {
  return file.size <= maxSize
}

/**
 * Formata o tamanho do arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Gera um token de compartilhamento seguro
 */
export function generateShareToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback para ambiente Node.js
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Máscara para dados sensíveis em logs
 */
export function maskSensitiveData(data: any, fields: string[] = ['email', 'phone', 'cpf', 'cnpj']): any {
  if (!data || typeof data !== 'object') return data
  
  const masked = { ...data }
  
  fields.forEach(field => {
    if (masked[field]) {
      const value = String(masked[field])
      if (value.length > 4) {
        masked[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2)
      } else {
        masked[field] = '*'.repeat(value.length)
      }
    }
  })
  
  return masked
}

/**
 * Configuração de políticas de segurança para headers HTTP
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

// =====================================================
// TIPOS PARA CONFIGURAÇÃO
// =====================================================

export interface SupabaseConfig {
  url: string
  anonKey: string
  serviceKey?: string
}

export interface FileUploadOptions {
  bucket: StorageBucket
  path?: string
  upsert?: boolean
  cacheControl?: string
  contentType?: string
}

export interface RealtimeSubscriptionOptions {
  channel: RealtimeChannel
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table?: string
  filter?: string
}

// =====================================================
// EXPORTAÇÕES PADRÃO
// =====================================================

export default supabase
export { createClient } from '@supabase/supabase-js'
export type { SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js'
export type { Database } from '../types/database.types'
