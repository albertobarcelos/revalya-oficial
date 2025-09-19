// =====================================================
// VALIDATION UTILITIES
// Descrição: Utilitários para validação de dados, schemas e documentos brasileiros
// =====================================================

import { z } from 'zod'
import { isValid, parseISO, isBefore, isAfter } from 'date-fns'

// =====================================================
// VALIDAÇÕES DE DOCUMENTOS BRASILEIROS
// =====================================================

/**
 * Valida CPF (Cadastro de Pessoa Física)
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Calcula primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = sum % 11
  let digit1 = remainder < 2 ? 0 : 11 - remainder
  
  // Verifica primeiro dígito
  if (parseInt(cleanCPF.charAt(9)) !== digit1) return false
  
  // Calcula segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = sum % 11
  let digit2 = remainder < 2 ? 0 : 11 - remainder
  
  // Verifica segundo dígito
  return parseInt(cleanCPF.charAt(10)) === digit2
}

/**
 * Valida CNPJ (Cadastro Nacional de Pessoa Jurídica)
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i]
  }
  let remainder = sum % 11
  let digit1 = remainder < 2 ? 0 : 11 - remainder
  
  // Verifica primeiro dígito
  if (parseInt(cleanCNPJ.charAt(12)) !== digit1) return false
  
  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i]
  }
  remainder = sum % 11
  let digit2 = remainder < 2 ? 0 : 11 - remainder
  
  // Verifica segundo dígito
  return parseInt(cleanCNPJ.charAt(13)) === digit2
}

/**
 * Valida CEP (Código de Endereçamento Postal)
 */
export function validateCEP(cep: string): boolean {
  if (!cep) return false
  
  const cleanCEP = cep.replace(/\D/g, '')
  return /^\d{8}$/.test(cleanCEP)
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false
  
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Aceita formatos: (11) 99999-9999, (11) 9999-9999, 11999999999, 1199999999
  return /^\d{10,11}$/.test(cleanPhone)
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  if (!email) return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.toLowerCase())
}

// =====================================================
// FORMATADORES DE DOCUMENTOS
// =====================================================

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '')
  if (cleanCPF.length !== 11) return cpf
  
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ para exibição
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  if (cleanCNPJ.length !== 14) return cnpj
  
  return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata CEP para exibição
 */
export function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '')
  if (cleanCEP.length !== 8) return cep
  
  return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

// =====================================================
// SCHEMAS ZOD PERSONALIZADOS
// =====================================================

/**
 * Schema para CPF
 */
export const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .refine(validateCPF, 'CPF inválido')

/**
 * Schema para CNPJ
 */
export const cnpjSchema = z
  .string()
  .min(1, 'CNPJ é obrigatório')
  .refine(validateCNPJ, 'CNPJ inválido')

/**
 * Schema para email
 */
export const emailSchema = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Email inválido')
  .max(255, 'Email muito longo')

/**
 * Schema para telefone
 */
export const phoneSchema = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .refine(validatePhone, 'Telefone inválido')

/**
 * Schema para CEP
 */
export const cepSchema = z
  .string()
  .min(1, 'CEP é obrigatório')
  .refine(validateCEP, 'CEP inválido')

/**
 * Schema para senha forte
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Senha deve conter pelo menos uma letra maiúscula'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Senha deve conter pelo menos uma letra minúscula'
  )
  .refine(
    (password) => /\d/.test(password),
    'Senha deve conter pelo menos um número'
  )
  .refine(
    (password) => /[^\w\s]/.test(password),
    'Senha deve conter pelo menos um caractere especial'
  )

/**
 * Schema para data
 */
export const dateSchema = z
  .string()
  .refine((date) => {
    const parsedDate = parseISO(date)
    return isValid(parsedDate)
  }, 'Data inválida')

/**
 * Schema para data futura
 */
export const futureDateSchema = z
  .string()
  .refine((date) => {
    const parsedDate = parseISO(date)
    return isValid(parsedDate) && isAfter(parsedDate, new Date())
  }, 'Data deve ser futura')

/**
 * Schema para data passada
 */
export const pastDateSchema = z
  .string()
  .refine((date) => {
    const parsedDate = parseISO(date)
    return isValid(parsedDate) && isBefore(parsedDate, new Date())
  }, 'Data deve ser passada')

/**
 * Schema para valor monetário
 */
export const monetarySchema = z
  .number()
  .min(0.01, 'Valor deve ser maior que zero')
  .max(999999999999.99, 'Valor muito alto')
  .refine(
    (value) => Number.isFinite(value),
    'Valor deve ser um número válido'
  )

/**
 * Schema para porcentagem
 */
export const percentageSchema = z
  .number()
  .min(0, 'Porcentagem não pode ser negativa')
  .max(1000, 'Porcentagem muito alta')
  .refine(
    (value) => Number.isFinite(value),
    'Porcentagem deve ser um número válido'
  )

// =====================================================
// SCHEMAS PARA ENTIDADES FINANCEIRAS
// =====================================================

/**
 * Schema para perfil de usuário
 */
export const userProfileSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  email: emailSchema,
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo'),
  phone: phoneSchema.optional(),
  cpf: cpfSchema.optional(),
  avatar_url: z.string().url('URL inválida').optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'FINANCIAL_MANAGER', 'CONTRACT_MANAGER', 'FINANCIAL_ANALYST', 'AUDITOR', 'USER']),
  tenant_id: z.string().uuid('Tenant ID inválido'),
  is_active: z.boolean().default(true),
  created_at: dateSchema.optional(),
  updated_at: dateSchema.optional(),
})

/**
 * Schema para tenant
 */
export const tenantSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo'),
  cnpj: cnpjSchema.optional(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.string().max(500, 'Endereço muito longo').optional(),
  city: z.string().max(100, 'Cidade muito longa').optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  cep: cepSchema.optional(),
  logo_url: z.string().url('URL inválida').optional(),
  subscription_plan: z.enum(['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
  is_active: z.boolean().default(true),
  created_at: dateSchema.optional(),
  updated_at: dateSchema.optional(),
})

/**
 * Schema para cálculo financeiro
 */
export const financialCalculationSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  user_id: z.string().uuid('User ID inválido'),
  tenant_id: z.string().uuid('Tenant ID inválido'),
  calculation_type: z.enum([
    'SIMPLE_INTEREST',
    'COMPOUND_INTEREST',
    'LOAN_PAYMENT',
    'NPV',
    'IRR',
    'PAYBACK',
    'AMORTIZATION',
    'DEPRECIATION'
  ]),
  parameters: z.record(z.any()),
  result: z.record(z.any()),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  created_at: dateSchema.optional(),
})

/**
 * Schema para contrato digital
 */
export const digitalContractSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  tenant_id: z.string().uuid('Tenant ID inválido'),
  created_by: z.string().uuid('Created by inválido'),
  contract_type: z.enum(['SERVICE', 'PURCHASE', 'SALE', 'PARTNERSHIP', 'EMPLOYMENT', 'RENTAL', 'OTHER']),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(255, 'Título muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional(),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  status: z.enum(['DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'CANCELLED', 'EXPIRED']).default('DRAFT'),
  total_value: monetarySchema.optional(),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres').default('BRL'),
  start_date: dateSchema.optional(),
  end_date: futureDateSchema.optional(),
  auto_renew: z.boolean().default(false),
  renewal_period_months: z.number().int().min(1).max(120).optional(),
  created_at: dateSchema.optional(),
  updated_at: dateSchema.optional(),
})

/**
 * Schema para assinatura de contrato
 */
export const contractSignatureSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  contract_id: z.string().uuid('Contract ID inválido'),
  signer_email: emailSchema,
  signer_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo'),
  signer_role: z.enum(['CONTRACTOR', 'CLIENT', 'WITNESS', 'GUARANTOR', 'OTHER']),
  signature_type: z.enum(['DIGITAL', 'ELECTRONIC', 'HANDWRITTEN']).default('DIGITAL'),
  signature_data: z.string().optional(),
  ip_address: z.string().ip('IP inválido').optional(),
  user_agent: z.string().max(500, 'User agent muito longo').optional(),
  signed_at: dateSchema.optional(),
  is_required: z.boolean().default(true),
  order: z.number().int().min(1).default(1),
})

/**
 * Schema para relatório financeiro
 */
export const financialReportSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  tenant_id: z.string().uuid('Tenant ID inválido'),
  created_by: z.string().uuid('Created by inválido'),
  report_type: z.enum([
    'CASH_FLOW',
    'INCOME_STATEMENT',
    'BALANCE_SHEET',
    'BUDGET_ANALYSIS',
    'CONTRACT_SUMMARY',
    'PAYMENT_ANALYSIS',
    'CUSTOM'
  ]),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(255, 'Título muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional(),
  filters: z.record(z.any()).optional(),
  data: z.record(z.any()).optional(),
  status: z.enum(['GENERATING', 'COMPLETED', 'FAILED', 'SCHEDULED']).default('GENERATING'),
  file_url: z.string().url('URL inválida').optional(),
  scheduled_for: futureDateSchema.optional(),
  created_at: dateSchema.optional(),
  updated_at: dateSchema.optional(),
})

/**
 * Schema para notificação financeira
 */
export const financialNotificationSchema = z.object({
  id: z.string().uuid('ID inválido').optional(),
  tenant_id: z.string().uuid('Tenant ID inválido'),
  user_id: z.string().uuid('User ID inválido').optional(),
  notification_type: z.enum([
    'CONTRACT_EXPIRING',
    'PAYMENT_DUE',
    'PAYMENT_OVERDUE',
    'CONTRACT_SIGNED',
    'REPORT_READY',
    'CALCULATION_COMPLETED',
    'SYSTEM_ALERT',
    'CUSTOM'
  ]),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(255, 'Título muito longo'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres').max(1000, 'Mensagem muito longa'),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])).min(1, 'Pelo menos um canal é obrigatório'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduled_for: futureDateSchema.optional(),
  sent_at: dateSchema.optional(),
  read_at: dateSchema.optional(),
  metadata: z.record(z.any()).optional(),
  created_at: dateSchema.optional(),
})

// =====================================================
// VALIDADORES CUSTOMIZADOS
// =====================================================

/**
 * Valida se uma data está dentro de um intervalo
 */
export function validateDateRange(
  date: string,
  minDate?: string,
  maxDate?: string
): boolean {
  const parsedDate = parseISO(date)
  if (!isValid(parsedDate)) return false
  
  if (minDate) {
    const parsedMinDate = parseISO(minDate)
    if (isValid(parsedMinDate) && isBefore(parsedDate, parsedMinDate)) {
      return false
    }
  }
  
  if (maxDate) {
    const parsedMaxDate = parseISO(maxDate)
    if (isValid(parsedMaxDate) && isAfter(parsedDate, parsedMaxDate)) {
      return false
    }
  }
  
  return true
}

/**
 * Valida se um valor está dentro de um intervalo
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (!Number.isFinite(value)) return false
  
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  
  return true
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Comprimento
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Senha deve ter pelo menos 8 caracteres')
  }
  
  if (password.length >= 12) {
    score += 1
  }
  
  // Caracteres
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Adicione letras minúsculas')
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Adicione letras maiúsculas')
  }
  
  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Adicione números')
  }
  
  if (/[^\w\s]/.test(password)) {
    score += 1
  } else {
    feedback.push('Adicione caracteres especiais')
  }
  
  // Padrões comuns
  if (!/(..).*\1/.test(password)) {
    score += 1
  } else {
    feedback.push('Evite repetições de caracteres')
  }
  
  return {
    isValid: score >= 4,
    score: Math.min(score, 5),
    feedback,
  }
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>"'&]/g, '') // Remove caracteres HTML perigosos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
}

/**
 * Valida se um arquivo é seguro baseado na extensão
 */
export function validateFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? allowedExtensions.includes(extension) : false
}

/**
 * Valida MIME type de arquivo
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType.toLowerCase())
}

// =====================================================
// UTILITÁRIOS DE ERRO
// =====================================================

/**
 * Formata erros de validação do Zod
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })
  
  return formattedErrors
}

/**
 * Cria mensagem de erro amigável
 */
export function createFriendlyErrorMessage(errors: Record<string, string>): string {
  const errorMessages = Object.values(errors)
  
  if (errorMessages.length === 1) {
    return errorMessages[0]
  }
  
  return `Foram encontrados ${errorMessages.length} erros: ${errorMessages.join(', ')}`
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default {
  // Validações de documentos
  validateCPF,
  validateCNPJ,
  validateCEP,
  validatePhone,
  validateEmail,
  
  // Formatadores
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone,
  
  // Schemas
  cpfSchema,
  cnpjSchema,
  emailSchema,
  phoneSchema,
  cepSchema,
  passwordSchema,
  dateSchema,
  futureDateSchema,
  pastDateSchema,
  monetarySchema,
  percentageSchema,
  
  // Schemas de entidades
  userProfileSchema,
  tenantSchema,
  financialCalculationSchema,
  digitalContractSchema,
  contractSignatureSchema,
  financialReportSchema,
  financialNotificationSchema,
  
  // Validadores customizados
  validateDateRange,
  validateNumberRange,
  validatePasswordStrength,
  sanitizeString,
  validateFileExtension,
  validateMimeType,
  
  // Utilitários de erro
  formatZodErrors,
  createFriendlyErrorMessage,
}
