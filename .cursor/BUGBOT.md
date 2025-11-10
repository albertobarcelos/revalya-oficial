# 🐛 Diretrizes de Revisão de Código - Revalya

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Projeto:** Revalya Financial System  
**Foco:** Segurança Multi-Tenant e Qualidade de Código

---

## 🔴 **CRÍTICO - Segurança Multi-Tenant**

### Validações Obrigatórias

#### 1. **Hook de Segurança em Componentes**
```typescript
// ✅ CORRETO
const { hasAccess, currentTenant } = useTenantAccessGuard();

// ❌ ERRADO - Sem validação de acesso
const data = useQuery(...);
```

**Regra:** TODOS os componentes que acessam dados devem usar `useTenantAccessGuard()`.

#### 2. **Query Keys Padronizadas**
```typescript
// ✅ CORRETO
queryKey: ['charges', currentTenant?.id, filters]

// ❌ ERRADO - Sem tenant_id
queryKey: ['charges', filters]
```

**Regra:** Query keys DEVEM incluir `tenant_id` como segundo parâmetro.

#### 3. **Validação de Tenant em Queries**
```typescript
// ✅ CORRETO
const query = useSecureTenantQuery({
  queryKey: ['resource', currentTenant?.id],
  queryFn: async () => {
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: currentTenant.id
    });
    return fetchData();
  },
  enabled: hasAccess && !!currentTenant?.id
});

// ❌ ERRADO - Sem contexto de tenant
const query = useQuery({
  queryFn: async () => fetchData()
});
```

**Regra:** TODAS as queries devem usar `useSecureTenantQuery` ou configurar contexto manualmente.

#### 4. **Validação de Tenant em Mutations**
```typescript
// ✅ CORRETO
const mutation = useSecureTenantMutation({
  mutationFn: async (data) => {
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: currentTenant.id
    });
    return createResource({ ...data, tenant_id: currentTenant.id });
  }
});

// ❌ ERRADO - Sem tenant_id
const mutation = useMutation({
  mutationFn: async (data) => createResource(data)
});
```

**Regra:** TODAS as mutations devem incluir `tenant_id` e configurar contexto.

#### 5. **RLS Policies Ativas**
```sql
-- ✅ CORRETO - Policy com validação de tenant
CREATE POLICY "tenant_isolation" ON services
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ❌ ERRADO - Sem validação de tenant
CREATE POLICY "public_access" ON services
  FOR ALL USING (true);
```

**Regra:** TODAS as tabelas multi-tenant DEVEM ter RLS policies que validam `tenant_id`.

---

## 🟡 **ALTA PRIORIDADE - Padrões de Código**

### Convenções de Nomenclatura

#### JavaScript/TypeScript
- ✅ **camelCase** para variáveis e funções: `getUserData`, `currentTenant`
- ✅ **PascalCase** para componentes: `ChargeDetails`, `ContractForm`
- ✅ **UPPER_SNAKE_CASE** para constantes: `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`

#### Python (se aplicável)
- ✅ **snake_case** para variáveis e funções: `get_user_data`, `current_tenant`
- ✅ **PascalCase** para classes: `TenantManager`, `SecurityValidator`

### Comentários e Documentação

#### AIDEV-NOTE Obrigatório
```typescript
// ✅ CORRETO
// AIDEV-NOTE: Configuração obrigatória de contexto de tenant
// Garante isolamento de dados entre tenants
await supabase.rpc('set_tenant_context_simple', {
  p_tenant_id: currentTenant.id
});

// ❌ ERRADO - Sem documentação
await supabase.rpc('set_tenant_context_simple', {
  p_tenant_id: currentTenant.id
});
```

**Regra:** Operações críticas de segurança DEVEM ter `AIDEV-NOTE` explicando o motivo.

#### Comentários em Português
```typescript
// ✅ CORRETO
// Valida se o usuário tem acesso ao tenant atual
if (!hasAccess) return <AccessDenied />;

// ❌ ERRADO - Comentário em inglês
// Validates if user has access to current tenant
```

**Regra:** Comentários DEVEM estar em português-BR.

---

## 🟢 **MÉDIA PRIORIDADE - Qualidade de Código**

### Tratamento de Erros

```typescript
// ✅ CORRETO
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('🔴 [ERROR] Operação falhou:', error);
  toast.error('Erro ao executar operação');
  throw error;
}

// ❌ ERRADO - Erro silencioso
try {
  const result = await operation();
  return result;
} catch (error) {
  // Erro ignorado
}
```

**Regra:** TODOS os erros devem ser logados e tratados adequadamente.

### Validação de Tipos

```typescript
// ✅ CORRETO - TypeScript strict
interface ChargeData {
  id: string;
  tenant_id: string;
  amount: number;
}

function processCharge(data: ChargeData): void {
  // Type-safe
}

// ❌ ERRADO - Uso de any
function processCharge(data: any): void {
  // Sem type safety
}
```

**Regra:** EVITAR uso de `any`. Usar tipos específicos ou `unknown` quando necessário.

### Performance

```typescript
// ✅ CORRETO - useCallback para funções estáveis
const handleSubmit = useCallback((data: FormData) => {
  mutation.mutate(data);
}, [mutation]);

// ❌ ERRADO - Função recriada a cada render
const handleSubmit = (data: FormData) => {
  mutation.mutate(data);
};
```

**Regra:** Usar `useCallback` e `useMemo` para otimizar re-renders.

---

## 📋 **Checklist de Revisão**

### Antes de Aprovar um PR

- [ ] ✅ Todos os componentes usam `useTenantAccessGuard()`
- [ ] ✅ Todas as queries incluem `tenant_id` na query key
- [ ] ✅ Todas as mutations incluem `tenant_id` nos dados
- [ ] ✅ Contexto de tenant configurado antes de queries/mutations
- [ ] ✅ RLS policies validadas para novas tabelas
- [ ] ✅ Comentários em português-BR
- [ ] ✅ AIDEV-NOTE em operações críticas
- [ ] ✅ Sem uso de `any` sem justificativa
- [ ] ✅ Erros tratados e logados
- [ ] ✅ Performance otimizada (useCallback, useMemo quando necessário)
- [ ] ✅ TypeScript sem erros (`npm run type-check`)
- [ ] ✅ Linter sem erros (`npm run lint`)

---

## 🚨 **Problemas Críticos que DEVEM ser Bloqueados**

1. **Vazamento de Dados entre Tenants**
   - Query sem validação de `tenant_id`
   - Mutation sem `tenant_id`
   - RLS policy ausente ou incorreta

2. **Falhas de Segurança**
   - Autenticação bypassada
   - Validação de acesso ausente
   - Dados sensíveis expostos

3. **Quebra de Funcionalidade**
   - TypeScript errors
   - Runtime errors não tratados
   - Dependências quebradas

---

## 📚 **Referências**

- `SECURITY_GUIDELINES_AI_DEVELOPMENT.md` - Diretrizes completas de segurança
- `Contexto.md` - Especificidades técnicas do projeto
- `PRD_REVALYA_SISTEMA_COMPLETO.md` - Documentação completa do sistema

---

**Última atualização:** Janeiro 2025  
**Mantenedor:** Equipe Revalya

