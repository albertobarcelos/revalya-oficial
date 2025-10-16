# Componentes da ReconciliationTable

Documentação técnica dos componentes extraídos da `ReconciliationTable.tsx` para melhorar a modularização e manutenibilidade do código.

## 📋 Visão Geral

A refatoração da `ReconciliationTable` seguiu os princípios de **Clean Code** e **responsabilidade única**, resultando em 5 componentes especializados que trabalham em conjunto para formar a interface de conciliação.

## 🔧 Componentes Extraídos

### 1. TableHeader

**Arquivo**: `src/components/reconciliation/parts/TableHeader.tsx`

**Responsabilidade**: Renderização do cabeçalho da tabela com configurações dinâmicas.

```typescript
interface TableHeaderProps {
  columns: Array<{
    key: string;
    label: string;
    tooltip?: string;
    className?: string;
  }>;
}
```

**Funcionalidades**:
- Colunas configuráveis via props
- Tooltips informativos
- Classes CSS customizáveis
- Responsividade automática

**Uso**:
```typescript
<TableHeader 
  columns={[
    { key: 'date', label: 'Data', tooltip: 'Data do movimento' },
    { key: 'value', label: 'Valor', className: 'text-right' }
  ]} 
/>
```

---

### 2. StatusBadge

**Arquivo**: `src/components/reconciliation/parts/StatusBadge.tsx`

**Responsabilidade**: Exibição visual dos status de conciliação com cores e ícones específicos.

```typescript
interface StatusBadgeProps {
  status: ReconciliationStatus;
  className?: string;
}
```

**Status Suportados**:
- `PENDING` - Pendente (amarelo, ícone Clock)
- `RECONCILED` - Conciliado (verde, ícone CheckCircle)
- `FAILED` - Falhou (vermelho, ícone AlertTriangle)

**Funcionalidades**:
- Cores automáticas baseadas no status
- Ícones específicos para cada estado
- Animações suaves com Framer Motion
- Acessibilidade com aria-labels

**Uso**:
```typescript
<StatusBadge status={ReconciliationStatus.PENDING} />
```

---

### 3. ValueCell

**Arquivo**: `src/components/reconciliation/parts/ValueCell.tsx`

**Responsabilidade**: Formatação e exibição de valores monetários com padrões brasileiros.

```typescript
interface ValueCellProps {
  value: number;
  className?: string;
}
```

**Funcionalidades**:
- Formatação automática em BRL (R$)
- Cores condicionais (verde para positivo, vermelho para negativo)
- Alinhamento à direita por padrão
- Tratamento de valores nulos/undefined

**Uso**:
```typescript
<ValueCell value={1500.50} />
// Resultado: R$ 1.500,50 (em verde)

<ValueCell value={-200.00} />
// Resultado: -R$ 200,00 (em vermelho)
```

---

### 4. TableRow

**Arquivo**: `src/components/reconciliation/parts/TableRow.tsx`

**Responsabilidade**: Renderização completa de uma linha da tabela com todos os dados do movimento.

```typescript
interface TableRowExtendedProps {
  movement: ImportedMovement;
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => void;
  onViewAsaasDetails?: (movement: ImportedMovement) => void;
  isSelected?: boolean;
  onSelectionChange?: (movementId: string, selected: boolean) => void;
}
```

**Funcionalidades**:
- Renderização de todos os campos do movimento
- Integração com sistema de seleção
- Botões de ação contextuais
- Responsividade para mobile
- Animações de hover e interação

**Campos Renderizados**:
- Checkbox de seleção
- Data do movimento
- Descrição
- Valor formatado
- Status badge
- Botões de ação

---

### 5. ActionButtons

**Arquivo**: `src/components/reconciliation/parts/ActionButtons.tsx`

**Responsabilidade**: Menu dropdown com ações disponíveis baseadas no status do movimento.

```typescript
interface ActionButtonsProps {
  movement: ImportedMovement;
  onAction: (action: ReconciliationAction, movement: ImportedMovement) => void;
  onViewAsaasDetails?: (movement: ImportedMovement) => void;
}
```

**Ações Disponíveis**:
- `LINK_TO_CONTRACT` - Vincular a contrato
- `CREATE_STANDALONE` - Criar cobrança avulsa
- `COMPLEMENT_EXISTING` - Complementar existente
- `REGISTER_CUSTOMER` - Cadastrar cliente
- `DELETE_IMPORTED` - Excluir importado

**Funcionalidades**:
- Ações dinâmicas baseadas no `reconciliationStatus`
- Estados desabilitados condicionais
- Integração com detalhes ASAAS
- Ícones específicos para cada ação
- Tooltips informativos

**Lógica de Exibição**:
```typescript
// Exemplo: Ações disponíveis para status PENDING
if (movement.reconciliationStatus === ReconciliationStatus.PENDING) {
  // Todas as ações disponíveis
} else if (movement.reconciliationStatus === ReconciliationStatus.RECONCILED) {
  // Apenas ações de visualização
}
```

## 🛡️ Segurança Multi-Tenant

Todos os componentes respeitam as regras de segurança multi-tenant do projeto:

### Contexto de Tenant
```typescript
// AIDEV-NOTE: Todos os componentes verificam o tenant ativo
const { hasAccess, currentTenant } = useTenantAccessGuard();

if (!hasAccess) return <AccessDenied />;
```

### RLS (Row-Level Security)
- Políticas de segurança preservadas
- Validação automática de acesso aos dados
- Isolamento completo entre tenants

### Auditoria
- Logs de ações mantidos
- Rastreabilidade de operações
- Conformidade com padrões de segurança

## 📊 Performance

### Otimizações Implementadas

1. **Memoização**:
```typescript
const MemoizedStatusBadge = React.memo(StatusBadge);
const MemoizedValueCell = React.memo(ValueCell);
```

2. **Lazy Loading**:
```typescript
const ActionButtons = React.lazy(() => import('./ActionButtons'));
```

3. **Bundle Splitting**:
- Componentes separados permitem code splitting natural
- Carregamento sob demanda de funcionalidades específicas

## 🎨 Padrões de UI/UX

### Design System
- **Shadcn/UI**: Componentes base consistentes
- **Tailwind CSS**: Utilitários de estilo padronizados
- **Framer Motion**: Animações suaves e profissionais

### Responsividade
```typescript
// Exemplo de classes responsivas
className="hidden md:table-cell lg:w-32 xl:w-40"
```

### Acessibilidade
- ARIA labels em todos os componentes interativos
- Navegação por teclado suportada
- Contraste adequado para leitores de tela

## 🧪 Testes

### Estrutura de Testes Recomendada

```typescript
// TableHeader.test.tsx
describe('TableHeader', () => {
  it('should render columns correctly', () => {
    // Test implementation
  });
  
  it('should show tooltips on hover', () => {
    // Test implementation
  });
});

// StatusBadge.test.tsx
describe('StatusBadge', () => {
  it('should display correct color for each status', () => {
    // Test implementation
  });
});
```

### Testes de Integração
- Verificar interação entre componentes
- Validar fluxo completo de ações
- Testar responsividade em diferentes viewports

## 🔄 Reutilização

### Outros Contextos de Uso

1. **ClientsTable**: Reutilizar StatusBadge e ValueCell
2. **ContractsTable**: Adaptar TableHeader e ActionButtons
3. **ReportsTable**: Usar ValueCell para formatação monetária

### Configuração Flexível
```typescript
// Exemplo de reutilização do ActionButtons
<ActionButtons
  movement={clientData}
  onAction={handleClientAction}
  actions={['EDIT', 'DELETE', 'VIEW_DETAILS']}
/>
```

## 📈 Métricas de Melhoria

### Antes da Refatoração
- **Linhas de código**: 576 linhas em um arquivo
- **Complexidade ciclomática**: Alta
- **Manutenibilidade**: Baixa
- **Testabilidade**: Difícil

### Após a Refatoração
- **Linhas de código**: ~400 linhas no componente principal + 5 componentes especializados
- **Complexidade ciclomática**: Baixa (cada componente < 20 linhas por função)
- **Manutenibilidade**: Alta
- **Testabilidade**: Excelente (componentes isolados)

## 🎯 Próximos Passos

1. **Testes Unitários**: Implementar testes para cada componente
2. **Storybook**: Documentar componentes visualmente
3. **Performance Monitoring**: Medir impacto das otimizações
4. **Padrão de Refatoração**: Aplicar em outras tabelas do sistema

## 📚 Referências

- [Clean Code Principles](https://clean-code-developer.com/)
- [React Component Patterns](https://reactpatterns.com/)
- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs)