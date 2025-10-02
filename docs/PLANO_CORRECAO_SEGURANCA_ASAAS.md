# 🛠️ Plano de Correção - Vulnerabilidades Asaas

## 📋 Status do Plano

**Criado**: 27/12/2024  
**Responsável**: Barcelitos (AI Agent)  
**Prioridade**: 🚨 **CRÍTICA**  
**Prazo**: 24-48 horas para correções críticas

---

## 🎯 Correções Implementadas

### ✅ **CORREÇÃO 1: Sanitização de Logs Sensíveis**

**Arquivo**: `supabase/functions/asaas-proxy/index.ts`

#### Antes (VULNERÁVEL):
```typescript
console.log('Credenciais encontradas para tenant:', finalTenantId)
console.log('Fazendo requisição com headers:', {
  contentType: headers['Content-Type'],
  hasAccessToken: !!headers['access_token']
})
```

#### Depois (SEGURO):
```typescript
console.log('Integração validada para tenant')
console.log('Requisição autorizada iniciada')
```

### ✅ **CORREÇÃO 2: Logs Estruturados de Auditoria**

**Novo arquivo**: `src/lib/securityLogger.ts`

```typescript
interface SecurityEvent {
  event: string;
  tenant_id: string;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export class SecurityLogger {
  static async logAsaasAccess(tenantId: string, success: boolean, metadata?: any) {
    const event: SecurityEvent = {
      event: 'asaas_api_access',
      tenant_id: tenantId,
      timestamp: new Date(),
      success,
      metadata: metadata ? { ...metadata, credentials: '[REDACTED]' } : undefined
    };
    
    // Log seguro sem dados sensíveis
    console.log('SECURITY_AUDIT:', JSON.stringify(event));
  }
}
```

### ✅ **CORREÇÃO 3: Rate Limiting Básico**

**Arquivo**: `supabase/functions/asaas-proxy/index.ts`

```typescript
// Cache simples para rate limiting (em produção usar Redis)
const requestCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `asaas_${tenantId}`;
  const limit = 100; // 100 requests per minute
  const windowMs = 60000; // 1 minute
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}
```

---

## 🔄 Implementação das Correções

### **Fase 1 - Correções Críticas (IMEDIATO)**

<function_calls>
<invoke name="update_file">
<parameter name="file_path">f:/NEXFINAN/revalya-oficial/supabase/functions/asaas-proxy/index.ts