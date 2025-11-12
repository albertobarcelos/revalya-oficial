<!-- # 📚 Contexto do Projeto Revalya - Para Notepads do Cursor

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Projeto:** Revalya Financial System

---

## 🎯 **Visão Geral do Projeto**

O **Revalya** é um sistema financeiro completo e multi-tenant que oferece gestão integrada de contratos, faturamento, reconciliação bancária, análise de investimentos e integração com gateways de pagamento.

### Stack Tecnológico Principal

- **Frontend**: React 18.3.1 + TypeScript 5.5.3 + Vite 5.4.1
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI Framework**: Shadcn/UI + Tailwind CSS 3.4.11 + Radix UI
- **Animações**: Framer Motion 11.15.0
- **State Management**: TanStack Query 5.87.1 + Zustand 5.0.8
- **Forms**: React Hook Form 7.53.0 + Zod 3.23.8
- **Auth**: Supabase Auth com Row Level Security (RLS)

---

## 🏗️ **Arquitetura Multi-Tenant**

### 5 Camadas de Segurança

1. **Zustand Store** - Estado global isolado por tenant
2. **SessionStorage** - Isolamento por aba do navegador
3. **React Query** - Cache isolado por tenant
4. **Supabase RLS** - Row Level Security no PostgreSQL
5. **Validação de Contexto** - Runtime validation

### Padrão de Isolamento

```typescript
// Template obrigatório para todos os componentes
const { hasAccess, currentTenant } = useTenantAccessGuard();

if (!hasAccess) {
  return <AccessDenied />;
}

// Query segura
const query = useSecureTenantQuery({
  queryKey: ['resource', currentTenant?.id, filters],
  queryFn: async () => {
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: currentTenant.id
    });
    return fetchData();
  },
  enabled: hasAccess && !!currentTenant?.id
});
```

---

## 📁 **Estrutura de Pastas**

```
src/
├── components/          # Componentes React
│   ├── ui/             # Shadcn/UI base
│   ├── layout/         # Layout components
│   ├── contracts/      # Contratos digitais
│   ├── charges/        # Cobranças
│   ├── billing/        # Faturamento
│   ├── reconciliation/ # Conciliação bancária
│   └── ...
├── hooks/              # React Hooks
│   ├── templates/      # Templates de segurança
│   │   ├── useTenantAccessGuard.ts
│   │   ├── useSecureTenantQuery.ts
│   │   └── useSecureTenantMutation.ts
│   └── ...
├── services/           # Serviços de negócio
├── types/              # TypeScript types
├── utils/              # Funções utilitárias
├── lib/                # Bibliotecas e configurações
├── pages/              # Páginas da aplicação
└── core/               # Core do sistema
    ├── auth/           # Autenticação
    ├── security/       # Segurança
    ├── tenant/         # Multi-tenant
    └── state/          # Estado global
```

---

## 🔐 **Padrões de Segurança**

### Hook de Acesso Obrigatório

```typescript
// src/hooks/templates/useTenantAccessGuard.ts
export function useTenantAccessGuard() {
  const { currentTenant, tenantSlug, isAuthenticated } = useTenantStore();
  
  const hasAccess = useMemo(() => {
    return !!(
      currentTenant &&
      tenantSlug &&
      isAuthenticated &&
      validateTenantContext(currentTenant)
    );
  }, [currentTenant, tenantSlug, isAuthenticated]);
  
  return { hasAccess, currentTenant, tenantSlug };
}
```

### Query Segura

```typescript
// src/hooks/templates/useSecureTenantQuery.ts
export function useSecureTenantQuery<T>(options: SecureQueryOptions<T>) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  return useQuery({
    ...options,
    queryKey: ['secure', currentTenant?.id, ...options.queryKey],
    queryFn: async () => {
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id
      });
      return options.queryFn();
    },
    enabled: hasAccess && !!currentTenant?.id && options.enabled
  });
}
```

### Mutation Segura

```typescript
// src/hooks/templates/useSecureTenantMutation.ts
export function useSecureTenantMutation<T, V>(options: SecureMutationOptions<T, V>) {
  const { currentTenant } = useTenantAccessGuard();
  
  return useMutation({
    ...options,
    mutationFn: async (variables: V) => {
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id
      });
      return options.mutationFn(variables);
    }
  });
}
```

---

## 🎨 **Padrões de Design**

### Componente Padrão

```typescript
// Template para novos componentes
interface ComponentProps {
  // Props tipadas
}

export function Component({ ...props }: ComponentProps) {
  // 1. Hooks de segurança
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  // 2. Estados e queries
  const [state, setState] = useState();
  const query = useSecureTenantQuery({...});
  
  // 3. Callbacks
  const handleAction = useCallback(() => {
    // Lógica
  }, [dependencies]);
  
  // 4. Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // 5. Early returns
  if (!hasAccess) return <AccessDenied />;
  
  // 6. Render com animações
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Conteúdo */}
    </motion.div>
  );
}
```

### Paleta de Cores (Tailwind)

```typescript
// Cores semânticas
primary: "hsl(var(--primary))"
secondary: "hsl(var(--secondary))"
success: "hsl(var(--success))"
danger: "hsl(var(--danger))"
warning: "hsl(var(--warning))"

// Cores específicas Revalya
revalya: {
  primary: "hsl(var(--revalya-primary))"
  secondary: "hsl(var(--revalya-secondary))"
  accent: "hsl(var(--revalya-accent))"
}
```

---

## 📝 **Convenções de Código**

### Nomenclatura

- **JavaScript/TypeScript**: `camelCase` para variáveis/funções, `PascalCase` para componentes
- **Python**: `snake_case` para variáveis/funções, `PascalCase` para classes
- **Constantes**: `UPPER_SNAKE_CASE`

### Comentários

- **Idioma**: Português-BR
- **AIDEV-NOTE**: Obrigatório em operações críticas de segurança
- **Formato**: Comentários descritivos explicando o "porquê"

### Query Keys

```typescript
// Formato padrão
['resource', tenant_id, ...params]

// Exemplos
['charges', tenantId, { status: 'pending' }]
['contracts', tenantId, contractId]
['customers', tenantId, { search: 'term' }]
```

---

## 🔧 **Funcionalidades Principais**

### 1. Dashboard Financeiro
- Métricas em tempo real (MRR, MRC, Net Monthly Value)
- Gráficos de receita
- Análise de inadimplência
- Projeção de fluxo de caixa

### 2. Gestão de Contratos
- Contratos digitais
- Múltiplos tipos (Serviço, Produto, Licença)
- Ciclos de faturamento configuráveis
- Renovação automática

### 3. Faturamento
- Kanban visual
- Geração automática de cobranças
- Filtros avançados
- Integração com gateways

### 4. Reconciliação Bancária
- Integração ASAAS
- Webhooks em tempo real
- Sistema de staging
- Matching automático

### 5. Integrações
- **ASAAS**: Gateway de pagamento brasileiro
- **WhatsApp Business**: Notificações
- **Evolution API**: WhatsApp avançado
- **N8N**: Automação de workflows

---

## 🗄️ **Banco de Dados**

### Tabelas Principais

Todas as tabelas multi-tenant possuem:
- `tenant_id UUID` - Identificador do tenant
- `created_at TIMESTAMPTZ` - Data de criação
- `updated_at TIMESTAMPTZ` - Data de atualização

### RLS Policies

```sql
-- Template obrigatório
CREATE POLICY "tenant_isolation" ON {table_name}
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND auth.role() = 'authenticated'
  );
```

### Funções PostgreSQL Críticas

```sql
-- Configuração de contexto
CREATE OR REPLACE FUNCTION set_tenant_context_simple(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN;

-- Limpeza de sessões
CREATE OR REPLACE FUNCTION cleanup_expired_tenant_sessions()
RETURNS INTEGER;
```

---

## 🚨 **Pontos Críticos**

### NUNCA Alterar Sem Permissão

- `supabase/migrations/` - Migrations de banco
- `src/hooks/templates/` - Templates de segurança
- `tailwind.config.js` - Configurações de tema
- Arquivos `.env` - Variáveis de ambiente

### SEMPRE Validar

- Contexto de tenant ativo
- Permissões de acesso
- Tipos TypeScript
- RLS policies ativas

### PERGUNTAR Antes de

- Mudanças em schemas de banco
- Alterações em configs de segurança
- Refatorações que afetem múltiplos módulos
- Implementações que impactem performance

---

## 📚 **Documentação de Referência**

- `Contexto.md` - Especificidades técnicas completas
- `PRD_REVALYA_SISTEMA_COMPLETO.md` - Documentação do produto
- `SECURITY_GUIDELINES_AI_DEVELOPMENT.md` - Diretrizes de segurança
- `.cursor/BUGBOT.md` - Diretrizes de revisão de código

---

## 🛠️ **Scripts Principais**

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build

# Qualidade
npm run lint             # Executa ESLint
npm run lint:fix         # Corrige problemas do ESLint
npm run type-check       # Verifica tipos TypeScript
npm run test             # Executa testes
npm run test:coverage    # Testes com cobertura

# Banco de Dados
npm run db:generate      # Gera tipos do Supabase
npm run db:reset         # Reseta banco local
npm run db:migrate       # Aplica migrations
```

---

## 🎯 **Objetivos do Projeto**

1. **Automação Financeira**: Reduzir 95% do trabalho manual
2. **Escalabilidade**: Suportar crescimento exponencial
3. **Compliance**: 100% de conformidade regulatória
4. **Integração**: Conectar com principais gateways
5. **Visibilidade**: Insights financeiros em tempo real

---

**Última atualização:** Janeiro 2025  
**Mantenedor:** Equipe Revalya
 -->
