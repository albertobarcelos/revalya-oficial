# 📋 Kanban de Faturamento - Documentação Técnica

## 🎯 Visão Geral

O **Kanban de Faturamento** é uma interface visual para gerenciar o ciclo de vida dos contratos e cobranças, permitindo arrastar e soltar contratos entre diferentes estágios do processo de faturamento.

### 🏗️ Arquitetura

```
FaturamentoKanban.tsx
├── useBillingKanban.ts      # Hook principal para dados do kanban
├── useKanbanFilters.ts      # Hook para filtros e busca
├── KanbanFilters.tsx        # Componente de filtros
├── KanbanColumn.tsx         # Coluna individual do kanban
└── billing_kanban (view)    # View do Supabase com dados agregados
```

## 🔧 Funcionalidades Implementadas

### 1. **Sistema de Filtros Avançados**

#### 📱 Interface Responsiva
- **Mobile-first**: Layout adaptativo para dispositivos móveis
- **Busca textual**: Por cliente, contrato ou valor
- **Filtros expansíveis**: Interface colapsável para economizar espaço
- **Indicadores visuais**: Badges mostrando filtros ativos

#### 🔍 Tipos de Filtros
```typescript
interface KanbanFilters {
  search: string;      // Busca textual
  status: string;      // Status do contrato
  minValue: string;    // Valor mínimo
  maxValue: string;    // Valor máximo
  dateRange: string;   // Período de vencimento
  client: string;      // Cliente específico
}
```

#### 🎯 Critérios de Filtragem
- **Por Cliente**: Nome do cliente (busca parcial)
- **Por Contrato**: Número do contrato
- **Por Valor**: Faixa de valores (mín/máx)
- **Por Status**: Faturar hoje, Pendente, Faturados, Renovar
- **Por Período**: Hoje, Esta semana, Este mês, Próximo mês, Vencidos

### 2. **Drag & Drop entre Colunas**

#### 🎨 Colunas do Kanban
```typescript
const kanbanColumns = [
  {
    id: 'faturar-hoje',
    title: 'Faturar Hoje',
    icon: Clock,
    variant: 'destructive'
  },
  {
    id: 'pendente',
    title: 'Faturamento Pendente', 
    icon: AlertCircle,
    variant: 'secondary'
  },
  {
    id: 'faturados',
    title: 'Faturados',
    icon: CheckCircle,
    variant: 'default'
  },
  {
    id: 'renovar',
    title: 'Renovar',
    icon: RotateCcw,
    variant: 'outline'
  }
];
```

#### ⚡ Lógica de Movimentação
```typescript
// AIDEV-NOTE: Função principal para mover contratos entre colunas
const handleDragEnd = async (event: DragEndEvent) => {
  // 1. Validação de acesso e contexto de tenant
  // 2. Atualização otimista da UI
  // 3. Criação de cobrança se necessário
  // 4. Atualização do status do contrato
  // 5. Sincronização com o backend
};
```

### 3. **Integração com billing_kanban View**

#### 📊 Estrutura de Dados
```sql
-- View que agrega dados de contratos e cobranças
CREATE VIEW billing_kanban AS
SELECT 
  c.id,
  c.contract_number,
  c.client_name,
  c.value,
  c.due_date,
  c.status,
  c.kanban_column,
  ch.id as billing_id,
  ch.status as charge_status
FROM contracts c
LEFT JOIN charges ch ON c.id = ch.contract_id
WHERE c.tenant_id = current_setting('app.current_tenant_id')::uuid;
```

#### 🔄 Sincronização de Dados
- **Tempo real**: Atualização automática via React Query
- **Cache inteligente**: Invalidação seletiva de queries
- **Contexto de tenant**: Segurança multi-tenant obrigatória

## 🛡️ Segurança Multi-Tenant

### 🔐 5 Camadas de Segurança

1. **Validação de Acesso**: `useTenantAccessGuard()`
2. **Consultas Seguras**: `useSecureTenantQuery()`
3. **Query Keys**: Sempre incluem `tenant_id`
4. **Validação Dupla**: Client-side + RLS
5. **Auditoria**: Logs obrigatórios em operações críticas

### 🎯 Implementação de Segurança
```typescript
// AIDEV-NOTE: Padrão obrigatório para hooks seguros
export function useBillingKanban() {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  const query = useSecureTenantQuery({
    queryKey: ['billing_kanban', currentTenant?.id],
    queryFn: async () => {
      // Configuração de contexto obrigatória
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id 
      });
      
      // Query com RLS automático
      const { data, error } = await supabase
        .from('billing_kanban')
        .select('*');
        
      if (error) throw error;
      return data;
    }
  });
  
  return { ...query, hasAccess };
}
```

## 🎨 Design System

### 🎯 Componentes UI Utilizados
- **Shadcn/UI**: Base components (Button, Input, Select, Card, Badge)
- **Framer Motion**: Animações suaves e transições
- **Radix UI**: Componentes acessíveis
- **Tailwind CSS**: Estilização responsiva

### 🌈 Padrões Visuais
```typescript
// Padrão de cores específicas do Kanban
const kanbanColors = {
  faturarHoje: 'border-red-200 bg-red-50',
  pendente: 'border-yellow-200 bg-yellow-50', 
  faturados: 'border-green-200 bg-green-50',
  renovar: 'border-blue-200 bg-blue-50'
};

// Animações padrão
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};
```

## 📱 Responsividade

### 🎯 Breakpoints Implementados
- **Mobile**: `< 640px` - Layout em coluna única
- **Tablet**: `640px - 1024px` - Grid 2 colunas
- **Desktop**: `> 1024px` - Grid 4 colunas

### 🔧 Melhorias Responsivas
```typescript
// Barra de filtros responsiva
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
  // Busca em largura total no mobile
  <div className="flex-1 relative">
    <Input placeholder="Buscar..." />
  </div>
  
  // Botões agrupados no mobile
  <div className="flex items-center gap-2 sm:gap-3">
    <Button className="flex-1 sm:flex-none">
      <span className="hidden sm:inline">Filtros</span>
      <span className="sm:hidden">Filtrar</span>
    </Button>
  </div>
</div>
```

## 🚀 Performance

### ⚡ Otimizações Implementadas
- **React Query**: Cache inteligente e sincronização
- **useCallback**: Prevenção de re-renders desnecessários
- **useMemo**: Memoização de cálculos pesados
- **Lazy Loading**: Carregamento sob demanda
- **Debounce**: Busca textual otimizada

### 📊 Métricas de Performance
```typescript
// Hook otimizado para filtros
const filteredData = useMemo(() => {
  if (!hasActiveFilters) return kanbanData;
  
  return applyFilters(kanbanData, filters);
}, [kanbanData, filters, hasActiveFilters]);
```

## 🧪 Testes e Validação

### ✅ Cenários Testados
1. **Filtros**: Busca textual, filtros por valor, status e período
2. **Drag & Drop**: Movimentação entre todas as colunas
3. **Responsividade**: Mobile, tablet e desktop
4. **Segurança**: Validação de tenant em todas as operações
5. **Performance**: Carregamento e filtragem de grandes volumes

### 🔍 Validações de Segurança
- ✅ Contexto de tenant configurado
- ✅ RLS policies ativas
- ✅ Validação de acesso em hooks
- ✅ Query keys incluem tenant_id
- ✅ Logs de auditoria implementados

## 📋 Próximos Passos

### 🎯 Melhorias Futuras
1. **Filtros Salvos**: Permitir salvar combinações de filtros
2. **Exportação**: Export de dados filtrados para Excel/PDF
3. **Notificações**: Alertas para contratos próximos ao vencimento
4. **Bulk Actions**: Ações em lote para múltiplos contratos
5. **Analytics**: Dashboard com métricas de faturamento

### 🔧 Otimizações Técnicas
1. **Virtual Scrolling**: Para grandes volumes de dados
2. **Service Worker**: Cache offline
3. **WebSockets**: Atualizações em tempo real
4. **Micro-frontends**: Modularização do componente

## 📚 Referências Técnicas

### 🔗 Dependências Principais
```json
{
  "@tanstack/react-query": "^5.17.9",
  "@supabase/supabase-js": "^2.39.0",
  "framer-motion": "^11.0.3",
  "@radix-ui/react-select": "^2.0.0",
  "tailwindcss": "^3.4.1"
}
```

### 📖 Documentação Relacionada
- [Multi-tenant Security](../MULT%20TENANT%20-%20SEGURANÇA/)
- [Componentes UI](../../src/components/ui/)
- [Hooks de Segurança](../../src/hooks/templates/)

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Responsável**: Lya AI Assistant
