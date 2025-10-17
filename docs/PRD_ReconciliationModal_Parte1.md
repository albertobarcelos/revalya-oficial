# PRD - ReconciliationModal.tsx - Parte 1
## Estrutura Base, Props, Hooks e Estado Inicial

### 📋 Visão Geral
O `ReconciliationModal` é um componente complexo responsável pela interface de conciliação de movimentações financeiras. Esta primeira parte do PRD documenta a estrutura base, propriedades, hooks utilizados e gerenciamento de estado inicial.

**🔄 ATUALIZAÇÃO - Janeiro 2025**: Componente foi completamente refatorado com extração de hooks customizados para melhor modularização e manutenibilidade.

---

## 🏗️ Estrutura Base do Componente (Refatorada)

### Interface Principal
```typescript
interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicators?: ReconciliationIndicators;
}
```

### Hooks Customizados Utilizados
- **`useReconciliationData`** - Gerenciamento de dados e carregamento
- **`useReconciliationFilters`** - Lógica de filtros e paginação  
- **`useReconciliationSecurity`** - Validações de segurança multi-tenant
- **`useReconciliationActions`** - Ações de conciliação e modal de ações

### Dependências Principais
- **UI Framework**: Shadcn/UI + Radix UI
- **Animações**: Framer Motion
- **Estado**: React Hooks (useState, useEffect, useCallback) + Hooks Customizados
- **Backend**: Supabase + Multi-tenant RLS
- **Notificações**: Sonner (toast)
- **Validação**: Zod schemas

---

## 🎯 Props e Interfaces

### Props do Componente
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | ✅ | Controla a visibilidade do modal |
| `onClose` | `() => void` | ✅ | Callback para fechar o modal |
| `indicators` | `ReconciliationIndicators` | ❌ | Indicadores de status para o header |

### Interfaces de Dados
```typescript
// AIDEV-NOTE: Interface principal para movimentações importadas
interface ImportedMovement {
  id: string;
  amount: number;
  source: string;
  reconciliationStatus: ReconciliationStatus;
  paymentStatus: PaymentStatus;
  customerName?: string;
  customerDocument?: string;
  externalReference?: string;
  paymentDate?: string;
  contractId?: string;
  asaasPaymentId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  // ... outros campos mapeados
}

// AIDEV-NOTE: Enums para status de conciliação e pagamento
enum ReconciliationStatus {
  RECONCILED = 'RECONCILED',
  DIVERGENT = 'DIVERGENT', 
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

enum PaymentStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
  PENDING = 'PENDING'
}
```

---

## 🪝 Hooks Utilizados

### Hooks de Segurança Multi-Tenant
```typescript
// AIDEV-NOTE: Hook obrigatório para validação de acesso por tenant
const { hasAccess, currentTenant } = useTenantAccessGuard();

// AIDEV-NOTE: Hook para logging de ações com contexto de tenant
const { logAction } = useActionLogger();

// AIDEV-NOTE: Hook para notificações toast
const { toast } = useToast();
```

### Hooks de Estado Local
```typescript
// Estados principais do componente
const [isLoading, setIsLoading] = useState(false);
const [movements, setMovements] = useState<ImportedMovement[]>([]);
const [filteredMovements, setFilteredMovements] = useState<ImportedMovement[]>([]);
const [isCollapsed, setIsCollapsed] = useState(false);

// Estados para modal de ações
const [actionModal, setActionModal] = useState<{
  isOpen: boolean;
  action: ReconciliationAction | null;
  movement: ImportedMovement | null;
}>({
  isOpen: false,
  action: null,
  movement: null
});

// Estados para filtros
const [filters, setFilters] = useState<ReconciliationFilters>(() => {
  const currentMonth = getCurrentMonthRange();
  return {
    dateRange: currentMonth,
    status: 'all',
    source: 'all',
    hasContract: 'all',
    search: ''
  };
});

// Estados para paginação
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
```

---

## 🔄 Gerenciamento de Estado Inicial

### Inicialização de Filtros
```typescript
// AIDEV-NOTE: Função utilitária para obter range do mês atual
const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    from: start,
    to: end
  };
};
```

### useEffect para Carregamento Inicial
```typescript
// AIDEV-NOTE: Effect para carregar dados quando o modal abre
useEffect(() => {
  if (isOpen && hasAccess) {
    loadReconciliationData();
    logAction('reconciliation_modal_opened', { 
      tenant: currentTenant?.name 
    });
  }
}, [isOpen, hasAccess, currentTenant]);

// AIDEV-NOTE: Effect para aplicar filtros quando dados ou filtros mudam
useEffect(() => {
  applyFilters();
}, [movements, filters]);

// AIDEV-NOTE: Effect para resetar paginação quando filtros mudam
useEffect(() => {
  setCurrentPage(1);
}, [filteredMovements]);
```

---

## 🛡️ Validações de Segurança

### Validação de Acesso Multi-Tenant
```typescript
// AIDEV-NOTE: Validação obrigatória de acesso por tenant
if (!hasAccess) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="text-center p-6">
          <p>Acesso negado. Você não tem permissão para acessar esta funcionalidade.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Configuração de Contexto Supabase
```typescript
// AIDEV-NOTE: Configuração obrigatória de contexto antes de operações
await supabase.rpc('set_tenant_context_simple', { 
  p_tenant_id: currentTenant?.id 
});
```

---

## 📊 Métricas e Logging

### Logging de Ações
```typescript
// AIDEV-NOTE: Logging obrigatório para auditoria
const logAction = (action: string, metadata: any) => {
  console.log(`🔍 [ReconciliationModal] ${action}:`, metadata);
  // Implementação do logging para auditoria
};
```

### Análise de Dados
```typescript
// AIDEV-NOTE: Análise detalhada dos dados carregados para debugging
const analyzeLoadedData = (data: any[]) => {
  console.group('📊 Análise de dados carregados');
  console.log('📈 Total de registros:', data?.length || 0);
  
  // Análise por status de conciliação
  const reconciliationStats = data?.reduce((acc, item) => {
    const status = item.status_conciliacao || 'N/A';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  console.log('🎯 Distribuição por status de conciliação:', reconciliationStats);
  console.groupEnd();
};
```

---

## 🎨 Padrões de UI/UX

### Animações com Framer Motion
```typescript
// AIDEV-NOTE: Padrões de animação para entrada do modal
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

// AIDEV-NOTE: Animações para botões de ação
const buttonHover = {
  scale: 1.05,
  transition: { duration: 0.2 }
};
```

### Responsividade
- **Mobile First**: Layout adaptativo com breakpoints Tailwind
- **Collapse Panel**: Painel lateral colapsável para telas menores
- **Touch Friendly**: Botões e controles otimizados para touch

---

## 🔧 Configurações e Constantes

### Configurações de Paginação
```typescript
const PAGINATION_CONFIG = {
  defaultPageSize: 50,
  pageSizeOptions: [25, 50, 100, 200],
  maxItemsPerPage: 200
};
```

### Configurações de Filtros
```typescript
const FILTER_CONFIG = {
  searchDebounceMs: 300,
  defaultDateRange: getCurrentMonthRange(),
  statusOptions: ['all', 'RECONCILED', 'DIVERGENT', 'CANCELLED', 'PENDING'],
  sourceOptions: ['all', 'ASAAS', 'MANUAL', 'IMPORT']
};
```

---

## ✅ Checklist de Implementação - Parte 1

- [x] **Props Interface**: Definida com tipos corretos
- [x] **Hooks de Segurança**: useTenantAccessGuard implementado
- [x] **Estado Local**: Todos os estados necessários definidos
- [x] **Inicialização**: useEffect para carregamento inicial
- [x] **Validações**: Verificação de acesso multi-tenant
- [x] **Logging**: Sistema de auditoria implementado
- [x] **Animações**: Padrões Framer Motion definidos
- [x] **Responsividade**: Layout adaptativo configurado

---

## 🚀 Próximos Passos

**Parte 2**: Funções de filtros e mapeamento de dados
- Análise detalhada da função `applyFilters`
- Mapeamento de dados do Supabase para interfaces
- Transformações de status e enums
- Lógica de busca e filtros avançados

---

*Este documento faz parte da série de PRDs para refatoração do ReconciliationModal.tsx, mantendo a funcionalidade existente enquanto melhora a manutenibilidade do código.*