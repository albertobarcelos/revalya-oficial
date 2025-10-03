# 📋 Especificidades Técnicas do Projeto Revalya

## 🏗️ Arquitetura Geral

### Stack Tecnológico Principal
- **Frontend**: React 18.2.0 + TypeScript 5.3.3 + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI Framework**: Shadcn/UI + Tailwind CSS 3.4.1
- **Animações**: Framer Motion 11.0.3
- **State Management**: TanStack Query 5.17.9 + Context API
- **Forms**: React Hook Form 7.48.2 + Zod 3.22.4
- **Auth**: Supabase Auth com Row Level Security (RLS)

### Arquitetura Multi-Tenant
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
├─────────────────────────────────────────────────────────┤
│  useTenantAccessGuard() → Validação de Acesso          │
│  useSecureTenantQuery() → Queries Seguras              │
│  TenantSessionManager   → Gerenciamento de Sessões     │
├─────────────────────────────────────────────────────────┤
│                 SUPABASE (Backend)                      │
├─────────────────────────────────────────────────────────┤
│  Row Level Security (RLS) → Isolamento de Dados        │
│  Edge Functions         → Lógica de Negócio            │
│  PostgreSQL Functions   → Contexto de Tenant           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Sistema de Segurança Multi-Tenant

### 5 Camadas de Segurança Implementadas

#### 1. Validação de Acesso (Frontend)
```typescript
// Hook obrigatório em todos os componentes
const { hasAccess, currentTenant, accessError } = useTenantAccessGuard();
```

#### 2. Consultas Seguras
```typescript
// Template para queries seguras
const query = useSecureTenantQuery({
  queryKey: ['resource', currentTenant?.id],
  queryFn: async () => {
    // Configuração automática de contexto
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: currentTenant.id
    });
    return fetchData();
  }
});
```

#### 3. Query Keys Padronizadas
- Formato: `['resource', tenant_id, ...params]`
- Invalidação automática por tenant
- Cache isolado por tenant

#### 4. Validação Dupla
- **Client-side**: Validação de acesso via hooks
- **Server-side**: RLS policies no PostgreSQL

#### 5. Auditoria Completa
- Tabela `tenant_sessions_audit` para logs de sessão
- AIDEV-NOTE obrigatórios em operações críticas
- Logs estruturados para debugging

---

## 📁 Estrutura de Pastas Detalhada

### Componentes (`src/components/`)
```
components/
├── ui/                    # Shadcn/UI base (Button, Card, Input, etc.)
├── layout/               # Layout components (Header, Sidebar, PageLayout)
├── shared/               # Componentes reutilizáveis
├── prime/                # Componentes PrimeReact customizados
├── admin/                # Funcionalidades administrativas
├── agente-ia/           # Integração com IA
├── asaas/               # Integração ASAAS
├── auth/                # Autenticação e autorização
├── billing/             # Faturamento
├── charges/             # Cobranças
├── clients/             # Gestão de clientes
├── contracts/           # Contratos digitais
│   ├── parts/           # Sub-componentes de contratos
│   ├── schema/          # Schemas Zod para validação
│   └── form/            # Formulários específicos
├── dashboard/           # Dashboard e métricas
├── financial/           # Módulo financeiro
├── invites/             # Sistema de convites
├── reconciliation/      # Conciliação bancária
├── reports/             # Relatórios
├── settings/            # Configurações
├── tenant/              # Gestão de tenants
├── users/               # Gestão de usuários
└── whatsapp/            # Integração WhatsApp
```

### Hooks (`src/hooks/`)
```
hooks/
├── templates/           # Templates seguros para multi-tenant
│   ├── useTenantAccessGuard.ts
│   ├── useSecureTenantQuery.ts
│   └── useSecureTenantMutation.ts
├── useServices.ts       # Gestão de serviços
├── useCustomers.ts      # Gestão de clientes
├── useContracts.ts      # Contratos digitais
├── useDigitalContracts.ts
├── usePagination.ts     # Paginação reutilizável
└── [feature].ts         # Hooks por feature
```

### Tipos (`src/types/`)
```
types/
├── models/              # Modelos de dados
│   ├── contract.ts
│   ├── financial.ts
│   └── [entity].ts
├── import.ts            # Tipos para importação
├── settings.ts          # Configurações
└── components.ts        # Tipos para componentes
```

---

## 🎨 Sistema de Design

### Paleta de Cores (tailwind.config.js)
```javascript
colors: {
  // Cores semânticas
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  success: "hsl(var(--success))",
  danger: "hsl(var(--danger))",
  warning: "hsl(var(--warning))",
  
  // Cores específicas Revalya
  revalya: {
    primary: "hsl(var(--revalya-primary))",
    secondary: "hsl(var(--revalya-secondary))",
    accent: "hsl(var(--revalya-accent))"
  },
  
  // Cores adicionais
  roxo: { /* definições específicas */ },
  profundo: "hsl(var(--profundo))",
  moeda: "hsl(var(--moeda))",
  neve: "hsl(var(--neve))",
  claro: "hsl(var(--claro))"
}
```

### Breakpoints Responsivos
```javascript
screens: {
  'sm': '640px',
  'md': '768px', 
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px'
}
```

### Animações Padrão
```javascript
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to: { height: "var(--radix-accordion-content-height)" }
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to: { height: "0" }
  }
}
```

---

## 🔧 Configurações Específicas

### Package.json - Scripts Principais
```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "db:generate": "supabase gen types typescript --local > src/types/supabase.ts",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Dependências Críticas
```json
{
  "dependencies": {
    // Core React
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    
    // UI Framework
    "@radix-ui/react-*": "^1.0.0", // Múltiplos componentes
    "tailwindcss": "^3.4.1",
    "framer-motion": "^11.0.3",
    
    // Forms & Validation
    "react-hook-form": "^7.48.2",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4",
    
    // Data Management
    "@tanstack/react-query": "^5.17.9",
    "@supabase/supabase-js": "^2.38.5",
    
    // Utilities
    "date-fns": "^2.30.0",
    "lucide-react": "^0.294.0",
    "sonner": "^1.3.1",
    "class-variance-authority": "^0.7.0"
  }
}
```

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas Principais Multi-Tenant
```sql
-- Todas as tabelas possuem tenant_id para isolamento
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplo de tabela com RLS
CREATE TABLE services (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  default_price DECIMAL(10,2),
  -- ... outros campos
);

-- RLS Policy exemplo
CREATE POLICY "tenant_isolation" ON services
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Funções PostgreSQL Críticas
```sql
-- Configuração de contexto de tenant
CREATE OR REPLACE FUNCTION set_tenant_context_simple(
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN;

-- Limpeza automática de sessões
CREATE OR REPLACE FUNCTION cleanup_expired_tenant_sessions()
RETURNS INTEGER;
```

---

## 🚀 Funcionalidades Específicas

### Sistema de Auto-Login Multi-Tenant
- URLs limpas: `/{tenant-slug}/dashboard`
- Refresh tokens de 30 dias
- Access tokens de 1 hora
- Isolamento por aba do navegador
- Limpeza automática de sessões

### Integração ASAAS
- Webhook processing com Edge Functions
- Conciliação automática de pagamentos
- Import de clientes via API
- Mapeamento inteligente de campos

### Contratos Digitais
- Assinatura eletrônica
- Workflow de aprovação
- Anexos e documentos
- Auditoria completa

### Sistema de Importação
- CSV/Excel para clientes
- Mapeamento flexível de campos
- Validação em tempo real
- Preview antes da importação

---

## 📊 Padrões de Desenvolvimento

### Estrutura de Componente Padrão
```typescript
// AIDEV-NOTE: Template padrão para componentes
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

### Hook Seguro Padrão
```typescript
export function useSecureFeature(filters: Filters = {}) {
  const queryClient = useQueryClient();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  // Query segura
  const query = useSecureTenantQuery({
    queryKey: ['feature', currentTenant?.id, filters],
    queryFn: async () => {
      // AIDEV-NOTE: Configuração obrigatória de contexto
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id
      });
      
      const { data, error } = await supabase
        .from('table')
        .select('*');
        
      if (error) throw error;
      return data;
    },
    enabled: hasAccess && !!currentTenant?.id
  });
  
  // Mutations seguras
  const createMutation = useSecureTenantMutation({
    mutationFn: async (data) => {
      // Lógica de criação
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feature', currentTenant?.id]);
    }
  });
  
  return {
    ...query,
    hasAccess,
    createMutation
  };
}
```

---

## 🔍 Debugging e Monitoramento

### Logs Estruturados
```typescript
// AIDEV-NOTE: Padrão de logs para debugging
console.log('🔍 Debug - sourceData[0]:', sourceData[0]);
console.log('🔧 [INIT] Inicializando contexto do tenant:', tenantId);
console.warn('⚠️ [INIT] Aviso ao configurar contexto:', error);
```

### Métricas de Performance
- Bundle size monitoring
- React Query devtools
- Supabase performance insights
- User session analytics

### Auditoria de Segurança
- Logs de acesso por tenant
- Tentativas de acesso negadas
- Operações críticas auditadas
- Sessões ativas monitoradas

---

## 🚨 Pontos Críticos de Atenção

### NUNCA Alterar Sem Permissão
- `supabase/migrations/` - Migrations de banco
- `src/hooks/templates/` - Templates de segurança
- `tailwind.config.js` - Configurações de tema
- `.env` files - Variáveis de ambiente

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

*Este documento serve como referência técnica completa para o desenvolvimento no projeto Revalya, garantindo consistência e qualidade em todas as implementações.*