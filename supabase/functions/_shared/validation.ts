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

  try {
    // Validate HTTP method
    if (!allowedMethods.includes(req.method)) {
      return {
        isValid: false,
        error: `Method ${req.method} not allowed`,
        status: 405,
      };
    }

    // Validate required headers
    for (const header of requiredHeaders) {
      if (!req.headers.get(header)) {
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
        return {
          isValid: false,
          error: `Request body too large. Maximum size: ${maxBodySize} bytes`,
          status: 413,
        };
      }
    }

    // Skip auth validation if not required
    if (!requireAuth) {
      return { isValid: true };
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Missing or invalid authorization header',
        status: 401,
      };
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization: authHeader,
        },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        isValid: false,
        error: 'Invalid or expired token',
        status: 401,
      };
    }

    // Get tenant ID
    let tenantId: string | undefined;
    if (requireTenant) {
      tenantId = req.headers.get('x-tenant-id') || undefined;
      if (!tenantId) {
        return {
          isValid: false,
          error: 'Missing tenant ID header (x-tenant-id)',
          status: 400,
        };
      }
    }

    // Validate user roles if specified
    if (allowedRoles.length > 0) {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return {
          isValid: false,
          error: 'Error validating user permissions',
          status: 500,
        };
      }

      const userRoleNames = userRoles?.map(r => r.role) || [];
      const hasValidRole = allowedRoles.some(role => userRoleNames.includes(role));
      
      if (!hasValidRole) {
        return {
          isValid: false,
          error: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
          status: 403,
        };
      }
    }

    return {
      isValid: true,
      user,
      tenantId,
    };
  } catch (error) {
    console.error('Validation error:', error);
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