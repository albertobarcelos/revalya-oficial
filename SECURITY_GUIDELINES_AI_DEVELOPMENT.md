# 🔒 DIRETRIZES DE SEGURANÇA PARA DESENVOLVIMENTO COM IA - REVALYA

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Projeto:** Revalya Financial System  
**Status:** 🔴 CRÍTICO - SEGURANÇA MULTI-TENANT

---

## 🎯 **VISÃO GERAL DE SEGURANÇA**

Este documento estabelece **diretrizes críticas de segurança** para desenvolvimento com IA no sistema Revalya, garantindo que toda implementação mantenha a **integridade absoluta** da arquitetura multi-tenant e proteja dados financeiros sensíveis.

---

## 🏗️ **ARQUITETURA DE SEGURANÇA EM 5 CAMADAS**

### **Camada 1: Zustand Store (Estado Global)**
```typescript
// Localização: src/core/state/tenantStore.ts
interface TenantSecurityState {
  currentTenant: Tenant | null;
  tenantSlug: string;
  isAuthenticated: boolean;
  securityToken: string;
  lastValidation: Date;
}

// REGRA CRÍTICA: Sempre validar estado antes de operações
const validateTenantState = (state: TenantSecurityState): boolean => {
  return !!(
    state.currentTenant &&
    state.tenantSlug &&
    state.isAuthenticated &&
    state.securityToken &&
    (Date.now() - state.lastValidation.getTime()) < 300000 // 5 min
  );
};
```

### **Camada 2: SessionStorage (Isolamento por Aba)**
```typescript
// Localização: src/core/security/sessionManager.ts
const SECURITY_KEYS = {
  TENANT_SESSION: 'revalya_tenant_session',
  SECURITY_TOKEN: 'revalya_security_token',
  VALIDATION_HASH: 'revalya_validation_hash'
} as const;

// OBRIGATÓRIO: Validação de integridade
const validateSessionIntegrity = (): boolean => {
  const session = sessionStorage.getItem(SECURITY_KEYS.TENANT_SESSION);
  const token = sessionStorage.getItem(SECURITY_KEYS.SECURITY_TOKEN);
  const hash = sessionStorage.getItem(SECURITY_KEYS.VALIDATION_HASH);
  
  return !!(session && token && hash && validateHash(session + token, hash));
};
```

### **Camada 3: React Query (Cache Isolado)**
```typescript
// Localização: src/hooks/useSecureTenantQuery.ts
export const useSecureTenantQuery = <T>(options: SecureQueryOptions<T>) => {
  const { currentTenant, tenantSlug, isAuthenticated } = useTenantStore();
  
  // VALIDAÇÃO OBRIGATÓRIA
  if (!validateTenantContext(currentTenant, tenantSlug, isAuthenticated)) {
    throw new SecurityError('Contexto de tenant inválido');
  }
  
  return useQuery({
    ...options,
    queryKey: ['secure', tenantSlug, ...options.queryKey],
    queryFn: async () => {
      // Re-validação antes da execução
      if (!validateTenantContext(currentTenant, tenantSlug, isAuthenticated)) {
        throw new SecurityError('Contexto invalidado durante execução');
      }
      return options.queryFn();
    },
    enabled: options.enabled && !!tenantSlug && isAuthenticated
  });
};
```

### **Camada 4: Supabase RLS (Row Level Security)**
```sql
-- TEMPLATE OBRIGATÓRIO para todas as tabelas
CREATE POLICY "tenant_isolation_policy" ON {table_name}
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND auth.role() = 'authenticated'
  );

-- POLÍTICA DE AUDITORIA (OBRIGATÓRIA para tabelas críticas)
CREATE POLICY "audit_policy" ON {table_name}
  FOR ALL WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );
```

### **Camada 5: Validação de Contexto (Runtime)**
```typescript
// Localização: src/core/security/contextValidator.ts
export class ContextValidator {
  static validateTenantAccess(
    tenantId: string,
    userId: string,
    operation: string
  ): SecurityValidationResult {
    // 1. Validar tenant ativo
    if (!this.isTenantActive(tenantId)) {
      throw new SecurityError('Tenant inativo ou suspenso');
    }
    
    // 2. Validar permissões do usuário
    if (!this.hasUserPermission(userId, tenantId, operation)) {
      throw new SecurityError('Permissão insuficiente');
    }
    
    // 3. Validar rate limiting
    if (!this.checkRateLimit(userId, operation)) {
      throw new SecurityError('Rate limit excedido');
    }
    
    return { valid: true, timestamp: new Date() };
  }
}
```

---

## 🚨 **REGRAS CRÍTICAS DE SEGURANÇA**

### **1. ISOLAMENTO ABSOLUTO DE TENANTS**
```typescript
// ❌ NUNCA FAZER - Query sem validação de tenant
const getAllUsers = () => supabase.from('users').select('*');

// ✅ SEMPRE FAZER - Query com isolamento de tenant
const getTenantUsers = (tenantSlug: string) => 
  supabase.rpc('get_tenant_users', { p_tenant_slug: tenantSlug });
```

### **2. VALIDAÇÃO DE CONTEXTO OBRIGATÓRIA**
```typescript
// ❌ NUNCA FAZER - Operação sem validação
const updateContract = (contractId: string, data: any) => {
  return supabase.from('contracts').update(data).eq('id', contractId);
};

// ✅ SEMPRE FAZER - Validação completa de contexto
const updateContract = (contractId: string, data: ContractData) => {
  const { currentTenant, tenantSlug, isAuthenticated } = useTenantStore();
  
  // Validação obrigatória
  if (!currentTenant || !tenantSlug || !isAuthenticated) {
    throw new SecurityError('Contexto de tenant inválido');
  }
  
  // Validação de propriedade
  ContextValidator.validateTenantAccess(
    currentTenant.id, 
    auth.user.id, 
    'contract:update'
  );
  
  return supabase.rpc('update_tenant_contract', {
    p_tenant_slug: tenantSlug,
    p_contract_id: contractId,
    p_data: data
  });
};
```

### **3. SANITIZAÇÃO DE DADOS**
```typescript
// Localização: src/utils/dataSanitizer.ts
export class DataSanitizer {
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }
  
  static validateFinancialData(data: FinancialData): ValidationResult {
    // Validações específicas para dados financeiros
    if (data.amount && (data.amount < 0 || data.amount > 999999999)) {
      throw new ValidationError('Valor financeiro inválido');
    }
    
    if (data.currency && !ALLOWED_CURRENCIES.includes(data.currency)) {
      throw new ValidationError('Moeda não suportada');
    }
    
    return { valid: true };
  }
}
```

---

## 🔐 **PROTOCOLOS DE AUTENTICAÇÃO E AUTORIZAÇÃO**

### **1. Validação de JWT Token**
```typescript
// Localização: src/core/auth/tokenValidator.ts
export class TokenValidator {
  static async validateJWT(token: string): Promise<TokenValidationResult> {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        throw new AuthError('Token inválido');
      }
      
      // Validar expiração
      const tokenData = jwt.decode(token) as any;
      if (tokenData.exp * 1000 < Date.now()) {
        throw new AuthError('Token expirado');
      }
      
      // Validar tenant no token
      const tenantId = tokenData.tenant_id;
      if (!tenantId) {
        throw new AuthError('Token sem tenant_id');
      }
      
      return { valid: true, userId: data.user.id, tenantId };
    } catch (error) {
      throw new AuthError('Falha na validação do token');
    }
  }
}
```

### **2. Controle de Permissões (RBAC)**
```typescript
// Localização: src/core/auth/permissionManager.ts
export class PermissionManager {
  static async checkPermission(
    userId: string,
    tenantId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_resource: resource,
      p_action: action
    });
    
    if (error) {
      throw new AuthError('Erro ao verificar permissões');
    }
    
    return data?.has_permission || false;
  }
  
  static async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const { data, error } = await supabase.rpc('get_user_roles', {
      p_user_id: userId,
      p_tenant_id: tenantId
    });
    
    if (error) {
      throw new AuthError('Erro ao buscar roles do usuário');
    }
    
    return data || [];
  }
}
```

---

## 🛡️ **PROTEÇÃO CONTRA VULNERABILIDADES**

### **1. SQL Injection Prevention**
```typescript
// ❌ NUNCA FAZER - Query dinâmica insegura
const searchUsers = (query: string) => {
  return supabase.from('users').select('*').ilike('name', `%${query}%`);
};

// ✅ SEMPRE FAZER - Usar RPC functions com validação
const searchUsers = (query: string, tenantSlug: string) => {
  // Sanitizar input
  const sanitizedQuery = DataSanitizer.sanitizeInput(query);
  
  return supabase.rpc('search_tenant_users', {
    p_tenant_slug: tenantSlug,
    p_search_query: sanitizedQuery
  });
};
```

### **2. XSS Prevention**
```typescript
// Localização: src/utils/xssProtection.ts
export class XSSProtection {
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }
  
  static escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

### **3. CSRF Protection**
```typescript
// Localização: src/core/security/csrfProtection.ts
export class CSRFProtection {
  static generateToken(): string {
    return crypto.randomUUID();
  }
  
  static validateToken(token: string, sessionToken: string): boolean {
    return token === sessionToken && token.length === 36;
  }
  
  static addCSRFHeader(headers: Record<string, string>): Record<string, string> {
    const csrfToken = sessionStorage.getItem('csrf_token');
    if (!csrfToken) {
      throw new SecurityError('CSRF token não encontrado');
    }
    
    return {
      ...headers,
      'X-CSRF-Token': csrfToken
    };
  }
}
```

---

## 📊 **AUDITORIA E MONITORAMENTO**

### **1. Log de Segurança**
```typescript
// Localização: src/core/security/securityLogger.ts
export class SecurityLogger {
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const logEntry = {
      event_type: event.type,
      user_id: event.userId,
      tenant_id: event.tenantId,
      resource: event.resource,
      action: event.action,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      timestamp: new Date(),
      severity: event.severity,
      details: event.details
    };
    
    await supabase.from('security_logs').insert(logEntry);
    
    // Alertas para eventos críticos
    if (event.severity === 'CRITICAL') {
      await this.sendSecurityAlert(logEntry);
    }
  }
  
  static async detectAnomalies(userId: string): Promise<AnomalyReport> {
    const { data } = await supabase.rpc('detect_user_anomalies', {
      p_user_id: userId,
      p_time_window: '1 hour'
    });
    
    return data || { anomalies: [], riskScore: 0 };
  }
}
```

### **2. Monitoramento de Performance**
```typescript
// Localização: src/core/monitoring/performanceMonitor.ts
export class PerformanceMonitor {
  static async trackQuery(
    queryName: string,
    tenantId: string,
    duration: number
  ): Promise<void> {
    if (duration > 2000) { // > 2 segundos
      await SecurityLogger.logSecurityEvent({
        type: 'PERFORMANCE_ISSUE',
        tenantId,
        resource: 'database',
        action: queryName,
        severity: 'WARNING',
        details: { duration }
      });
    }
  }
}
```

---

## 🚨 **CHECKLIST DE SEGURANÇA OBRIGATÓRIO**

### **Antes de Implementar Qualquer Funcionalidade:**
- [ ] Validação de contexto de tenant implementada
- [ ] RLS policies configuradas na tabela
- [ ] Sanitização de inputs implementada
- [ ] Validação de permissões adicionada
- [ ] Logs de auditoria configurados
- [ ] Testes de segurança criados
- [ ] Rate limiting implementado
- [ ] Proteção XSS/CSRF adicionada
- [ ] Validação de tipos TypeScript completa
- [ ] Error handling seguro implementado

### **Validações de Runtime Obrigatórias:**
- [ ] Tenant ID presente e válido
- [ ] Usuário autenticado e autorizado
- [ ] Dados sanitizados e validados
- [ ] Contexto de segurança íntegro
- [ ] Rate limits respeitados

---

## 🎯 **MÉTRICAS DE SEGURANÇA**

### **KPIs de Segurança:**
- **Zero** vazamentos de dados entre tenants
- **< 1%** de falsos positivos em validações
- **100%** de cobertura de auditoria em operações críticas
- **< 100ms** overhead de validações de segurança
- **99.9%** de disponibilidade do sistema de autenticação

### **Alertas Automáticos:**
- Tentativas de acesso cross-tenant
- Múltiplas falhas de autenticação
- Queries com performance degradada
- Anomalias de comportamento do usuário
- Violações de rate limiting

---

## 🚀 **CONCLUSÃO**

A segurança no sistema Revalya é **não-negociável**. Cada implementação deve seguir rigorosamente estas diretrizes para garantir:

1. **Isolamento Absoluto** entre tenants
2. **Proteção Completa** de dados financeiros
3. **Auditoria Transparente** de todas as operações
4. **Performance Otimizada** com segurança
5. **Conformidade Regulatória** total

**Lembre-se**: Um único erro de segurança pode comprometer todo o sistema financeiro. Desenvolva sempre com máxima responsabilidade e atenção aos detalhes de segurança.

---

*Este documento é a referência master para segurança no desenvolvimento com IA do projeto Revalya. Todas as implementações devem seguir rigorosamente estas diretrizes.*