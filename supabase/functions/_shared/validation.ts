// =====================================================
// SHARED: Request Validation
// Descrição: Funções de validação para Edge Functions
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ValidationOptions {
  allowedMethods?: string[];
  requireAuth?: boolean;
  requireTenant?: boolean;
  allowedRoles?: string[];
  maxBodySize?: number;
  requiredHeaders?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  status?: number;
  user?: any;
  tenantId?: string;
}

export async function validateRequest(
  req: Request,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const {
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    requireAuth = true,
    requireTenant = true,
    allowedRoles = [],
    maxBodySize = 1024 * 1024, // 1MB default
    requiredHeaders = [],
  } = options;

  // AIDEV-NOTE: Implementação de validação segura multi-tenant para Edge Functions
  // Segue padrões estabelecidos no guia de implementação multi-tenant seguro
  
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  try {
    // 🔍 [AUDIT LOG] Log obrigatório de início de validação
    console.log(`🛡️ [AUDIT-${requestId}] ${timestamp} - Iniciando validação de request`, {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin'),
      requireAuth,
      requireTenant
    });

    // Validate HTTP method
    if (!allowedMethods.includes(req.method)) {
      console.warn(`❌ [AUDIT-${requestId}] Método não permitido: ${req.method}`);
      return {
        isValid: false,
        error: `Method ${req.method} not allowed`,
        status: 405,
      };
    }

    // Validate required headers
    for (const header of requiredHeaders) {
      if (!req.headers.get(header)) {
        console.warn(`❌ [AUDIT-${requestId}] Header obrigatório ausente: ${header}`);
        return {
          isValid: false,
          error: `Missing required header: ${header}`,
          status: 400,
        };
      }
    }

    // Validate body size for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxBodySize) {
        console.warn(`❌ [AUDIT-${requestId}] Body muito grande: ${contentLength} bytes`);
        return {
          isValid: false,
          error: `Request body too large. Maximum size: ${maxBodySize} bytes`,
          status: 413,
        };
      }
    }

    // Skip auth validation if not required
    if (!requireAuth) {
      console.log(`✅ [AUDIT-${requestId}] Validação concluída - Auth não requerida`);
      return { isValid: true };
    }

    // CAMADA 1: Validação do Authorization Header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`❌ [AUDIT-${requestId}] Authorization header inválido ou ausente`);
      return {
        isValid: false,
        error: 'Missing or invalid authorization header',
        status: 401,
      };
    }

    // CAMADA 2: Validação de Tenant ID (se requerido)
    let tenantId: string | undefined;
    if (requireTenant) {
      tenantId = req.headers.get('x-tenant-id') || undefined;
      if (!tenantId) {
        console.error(`❌ [AUDIT-${requestId}] Tenant ID ausente no header x-tenant-id`);
        return {
          isValid: false,
          error: 'Missing tenant ID header (x-tenant-id)',
          status: 400,
        };
      }
      
      // Validação de formato UUID do tenant
      if (!validateUUID(tenantId)) {
        console.error(`❌ [AUDIT-${requestId}] Tenant ID com formato inválido: ${tenantId}`);
        return {
          isValid: false,
          error: 'Invalid tenant ID format',
          status: 400,
        };
      }
    }

    // CAMADA 3: Inicialização do Supabase Client com SERVICE_ROLE_KEY
    // AIDEV-NOTE: Usando SERVICE_ROLE_KEY para Edge Functions conforme padrão seguro
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`❌ [AUDIT-${requestId}] Variáveis de ambiente ausentes`);
      return {
        isValid: false,
        error: 'Server configuration error',
        status: 500,
      };
    }

    // Cliente administrativo para validação de JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // CAMADA 4: Validação do JWT Token
    // AIDEV-NOTE: Usar supabaseAdmin.auth.getUser(token) para validar o JWT
    // O SERVICE_ROLE_KEY permite validar qualquer token de usuário passando-o como parâmetro
    console.log(`🔐 [AUDIT-${requestId}] Validando JWT token...`);
    
    // AIDEV-NOTE: Extrair o token do header Authorization
    const token = authHeader.replace('Bearer ', '');
    
    // AIDEV-NOTE: Validar o token usando o cliente admin com o token como parâmetro
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`❌ [AUDIT-${requestId}] Falha na autenticação JWT:`, {
        error: authError?.message || 'No user returned',
        status: authError?.status || 401,
      });
      return {
        isValid: false,
        error: 'Invalid or expired token',
        status: 401,
      };
    }

    console.log(`✅ [AUDIT-${requestId}] JWT válido para usuário: ${user.id}`);

    // CAMADA 5: Validação de Acesso ao Tenant (se requerido)
    if (requireTenant && tenantId) {
      console.log(`🔍 [AUDIT-${requestId}] Validando acesso ao tenant: ${tenantId}`);
      
      // AIDEV-NOTE: Verificar se o usuário tem acesso ao tenant especificado
      // A tabela correta é tenant_users (não user_tenants)
      // A coluna de status é 'active' (não 'is_active')
      const { data: userTenantAccess, error: tenantError } = await supabaseAdmin
        .from('tenant_users')
        .select('tenant_id, role, active')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single();

      if (tenantError || !userTenantAccess) {
        console.error(`❌ [AUDIT-${requestId}] Usuário sem acesso ao tenant:`, {
          userId: user.id,
          tenantId,
          error: tenantError?.message
        });
        return {
          isValid: false,
          error: 'Access denied to specified tenant',
          status: 403,
        };
      }

      console.log(`✅ [AUDIT-${requestId}] Acesso ao tenant validado:`, {
        userId: user.id,
        tenantId,
        role: userTenantAccess.role
      });
    }

    // CAMADA 6: Validação de Roles (se especificado)
    if (allowedRoles.length > 0) {
      console.log(`🔍 [AUDIT-${requestId}] Validando roles permitidas...`);
      
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (rolesError) {
        console.error(`❌ [AUDIT-${requestId}] Erro ao buscar roles do usuário:`, rolesError);
        return {
          isValid: false,
          error: 'Error validating user permissions',
          status: 500,
        };
      }

      const userRoleNames = userRoles?.map(r => r.role) || [];
      const hasValidRole = allowedRoles.some(role => userRoleNames.includes(role));
      
      if (!hasValidRole) {
        console.error(`❌ [AUDIT-${requestId}] Permissões insuficientes:`, {
          userId: user.id,
          tenantId,
          userRoles: userRoleNames,
          requiredRoles: allowedRoles
        });
        return {
          isValid: false,
          error: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
          status: 403,
        };
      }

      console.log(`✅ [AUDIT-${requestId}] Roles validadas com sucesso:`, {
        userId: user.id,
        tenantId,
        userRoles: userRoleNames,
        matchedRoles: allowedRoles.filter(role => userRoleNames.includes(role))
      });
    }

    // SUCESSO: Todas as validações passaram
    console.log(`🎉 [AUDIT-${requestId}] Validação concluída com sucesso:`, {
      userId: user.id,
      userEmail: user.email,
      tenantId,
      timestamp: new Date().toISOString(),
      validationLayers: {
        httpMethod: '✅',
        headers: '✅',
        bodySize: '✅',
        authorization: '✅',
        tenantAccess: requireTenant ? '✅' : 'N/A',
        roleValidation: allowedRoles.length > 0 ? '✅' : 'N/A'
      }
    });

    return {
      isValid: true,
      user,
      tenantId,
    };
  } catch (error) {
    console.error(`💥 [AUDIT-${requestId}] Erro interno na validação:`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return {
      isValid: false,
      error: 'Internal validation error',
      status: 500,
    };
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Brazilian phone number validation
  const phoneRegex = /^\+?55?\s?\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check if has 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Check if has 14 digits
  if (cleanCNPJ.length !== 14) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validate first check digit
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Validate second check digit
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  // Check if start date is before end date
  return start <= end;
}

export function validateAmount(amount: number | string): boolean {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && numAmount >= 0 && isFinite(numAmount);
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 1000); // Limit length
}

export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up expired rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute