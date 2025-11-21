# 📋 Mapeamento do Modal de Edição de Contratos

## 🎯 Visão Geral

O modal de edição de contratos é um sistema complexo e modular que permite criar, editar e visualizar contratos. Ele é composto por múltiplos componentes, hooks e funções que trabalham em conjunto para garantir segurança multi-tenant e uma experiência de usuário fluida.

---

## 📁 Estrutura de Arquivos

### **Página Principal**
- **`src/pages/Contracts.tsx`** - Componente principal que gerencia o estado do modal e a navegação

### **Componentes do Formulário**
- **`src/components/contracts/NewContractForm.tsx`** - Wrapper de compatibilidade que mapeia props antigas para nova configuração
- **`src/components/contracts/ContractForm.tsx`** - Componente base reutilizável do formulário
- **`src/components/contracts/form/ContractFormProvider.tsx`** - Provider que gerencia estado e lógica do formulário
- **`src/components/contracts/form/ContractFormActions.tsx`** - Componente que gerencia ações de salvar/criar/atualizar

### **Hooks Principais**
- **`src/hooks/useContractEdit.ts`** - Hook para carregar dados de contrato para edição
- **`src/hooks/useContracts.ts`** - Hook principal para operações CRUD de contratos
- **`src/hooks/useContractCosts.ts`** - Hook para buscar custos reais de contratos

### **Componentes de Partes do Formulário**
- **`src/components/contracts/parts/ContractBasicInfo.tsx`** - Informações básicas do contrato
- **`src/components/contracts/parts/ContractServices.tsx`** - Gestão de serviços do contrato
- **`src/components/contracts/parts/ContractProducts.tsx`** - Gestão de produtos do contrato
- **`src/components/contracts/parts/ContractDiscounts.tsx`** - Gestão de descontos
- **`src/components/contracts/parts/ContractTaxes.tsx`** - Gestão de impostos
- **`src/components/contracts/parts/ContractSidebar.tsx`** - Sidebar com resumo e totais
- **`src/components/contracts/parts/ContractFormHeader.tsx`** - Cabeçalho do formulário

---

## 🔄 Fluxo de Dados

### **1. Abertura do Modal**

```typescript
// src/pages/Contracts.tsx

// Estados principais
const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
const [formMode, setFormMode] = useState<FormMode>("create" | "edit" | "view");
const [isDetailsLoading, setIsDetailsLoading] = useState(false);

// Handlers de abertura
handleCreateContract()  // Abre modal em modo "create"
handleEditContract(contractId)  // Abre modal em modo "edit"
handleViewContract(contractId)  // Abre modal em modo "view"
```

### **2. Carregamento de Dados (Modo Edição)**

```typescript
// src/components/contracts/form/ContractFormProvider.tsx

// Hook que carrega dados do contrato
const { data: contractData, isLoading: isLoadingContract, loadContract } = useContractEdit();

// Efeito que dispara o carregamento
useEffect(() => {
  if (contractId && isEditMode && loadedContractRef.current !== contractId) {
    loadContract(contractId, form);
  }
}, [contractId, isEditMode]);
```

### **3. Processamento de Dados**

```typescript
// src/hooks/useContractEdit.ts

// Função principal de carregamento
loadContract(contractId: string, form: UseFormReturn<ContractFormValues>)

// Busca paralela de dados:
// 1. Contrato com dados do cliente
// 2. Serviços do contrato (vw_contract_services_detailed)
// 3. Produtos do contrato (contract_products)

// Formatação de dados:
// - Mapeamento reverso de valores (banco → frontend)
// - Formatação de datas (parseISO)
// - População do formulário (form.reset())
```

---

## 🛠️ Funções Principais

### **1. Função de Salvar/Criar/Atualizar**

**Localização:** `src/components/contracts/form/ContractFormActions.tsx`

**Função Principal:** `handleSubmit(data: ContractFormValues)`

**Fluxo:**
1. **Aplicar alterações pendentes**
   ```typescript
   applyPendingChanges();
   const updatedData = form.getValues();
   ```

2. **Configurar contexto de tenant**
   ```typescript
   await supabase.rpc('set_tenant_context_simple', {
     p_tenant_id: currentTenant.id
   });
   ```

3. **Validar configuração financeira**
   - Valida serviços: `payment_method`, `billing_type`, `recurrence_frequency`, `card_type`
   - Valida produtos: mesmos campos

4. **Preparar dados do contrato**
   ```typescript
   const contractData = await prepareContractData(data, currentTenant.id, contractId);
   ```
   - Formata datas (`formatDateForDatabase`)
   - Gera número do contrato se necessário
   - Preserva status atual durante edição

5. **Criar ou Atualizar Contrato**
   ```typescript
   if (contractId) {
     // Atualizar usando hook seguro
     await updateContract.mutateAsync({ id: contractId, ...contractData });
   } else {
     // Criar usando hook seguro
     const newContract = await createContract.mutateAsync(contractData);
     savedContractId = newContract.id;
   }
   ```

6. **Processar Serviços**
   - Classificar em: `UPDATE`, `INSERT`, `DELETE`
   - Verificar duplicações
   - Mapear valores (português → banco)
   - Validar `card_type` (só se `payment_method === 'Cartão'`)

7. **Processar Produtos**
   - Limpar produtos existentes (em edição)
   - Criar produto genérico se necessário
   - Validar pertencimento ao tenant
   - Inserir produtos

8. **Finalização**
   - Exibir toast de sucesso
   - Executar refresh em background
   - Chamar `onSuccess(savedContractId)`

---

### **2. Função de Preparar Dados do Contrato**

**Localização:** `src/components/contracts/form/ContractFormActions.tsx`

**Função:** `prepareContractData(data, tenantId, contractId?)`

**Responsabilidades:**
- Validar campos obrigatórios
- Gerar número do contrato se necessário
- Preservar status atual durante edição
- Formatar datas para PostgreSQL
- Mapear valores do formulário para banco

**Validações:**
- `customer_id` obrigatório
- `initial_date` obrigatória
- `final_date` obrigatória
- `billing_type` obrigatório
- `billing_day` obrigatório

---

### **3. Função de Carregar Contrato para Edição**

**Localização:** `src/hooks/useContractEdit.ts`

**Função:** `loadContract(contractId: string, form: UseFormReturn)`

**Fluxo:**
1. **Validação de acesso**
   ```typescript
   if (!hasAccess || !currentTenant?.id) {
     throw new Error('Acesso negado');
   }
   ```

2. **Busca paralela de dados**
   ```typescript
   const [contractResult, servicesResult, productsResult] = await Promise.all([
     // Contrato com cliente
     supabase.from('contracts').select('*, customers!inner(...)'),
     // Serviços da view detalhada
     supabase.from('vw_contract_services_detailed').select('...'),
     // Produtos
     supabase.from('contract_products').select('*, product:products(...)')
   ]);
   ```

3. **Formatação de serviços**
   - Mapeamento reverso de `payment_method`, `billing_type`, `recurrence_frequency`
   - Preservar dados de vencimento (`due_type`, `due_value`, `due_next_month`)
   - Incluir `cost_price` da view

4. **Formatação de produtos**
   - Mesmo processo de serviços
   - Incluir dados de impostos (`nbs_code`, `iss_rate`, etc.)

5. **População do formulário**
   ```typescript
   form.reset({
     customer_id: contract.customer_id,
     contract_number: contract.contract_number,
     initial_date: parseISO(contract.initial_date),
     // ... outros campos
     services: formattedServices,
     products: formattedProducts
   });
   ```

---

### **4. Função de Calcular Totais**

**Localização:** `src/components/contracts/form/ContractFormProvider.tsx`

**Função:** `calculateTotals(services, products, contractDiscount, cost_price?)`

**Cálculos:**
1. **Subtotal de Serviços**
   ```typescript
   services.reduce((sum, service) => {
     const quantity = service.quantity || 1;
     const unitPrice = service.unit_price || service.default_price || 0;
     return sum + (quantity * unitPrice);
   }, 0);
   ```

2. **Subtotal de Produtos**
   - Mesmo cálculo para produtos

3. **Descontos**
   - Desconto por item (serviços + produtos)
   - Desconto do contrato
   - Total de descontos

4. **Impostos**
   - Calculado sobre valor após desconto
   - Taxa por item

5. **Custos**
   - Se `cost_price` disponível: usar valor real da view
   - Senão: calcular por `cost_percentage`

6. **Total Final**
   ```typescript
   total = subtotal - totalDiscount + tax;
   ```

**Atualização Automática:**
- Monitora mudanças em `services`, `products`, `total_discount`
- Recalcula automaticamente via `useEffect`
- Atualiza `total_amount` e `total_tax` no formulário

---

## 🔐 Segurança Multi-Tenant

### **Validações Críticas**

1. **Validação de Acesso**
   ```typescript
   const { hasAccess, currentTenant } = useTenantAccessGuard();
   if (!hasAccess || !currentTenant?.id) {
     throw new Error('Acesso negado');
   }
   ```

2. **Configuração de Contexto**
   ```typescript
   await supabase.rpc('set_tenant_context_simple', {
     p_tenant_id: currentTenant.id
   });
   ```

3. **Validação de Tenant em Operações**
   - Todas as queries incluem `.eq('tenant_id', currentTenant.id)`
   - Validação dupla após criação/atualização
   - Verificação de pertencimento antes de inserir produtos

4. **Hooks Seguros**
   - `useSecureTenantMutation` para todas as mutações
   - `useSecureTenantQuery` para todas as queries
   - Invalidação de cache por tenant

---

## 📊 Estados e Contexto

### **ContractFormProvider Context**

```typescript
interface ContractFormContextType {
  form: UseFormReturn<ContractFormValues>;
  mode: "create" | "edit" | "view";
  formChanged: boolean;
  setFormChanged: (changed: boolean) => void;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalValues: TotalValues;
  setTotalValues: (values: TotalValues) => void;
  isViewMode: boolean;
  isEditMode: boolean;
  isLoadingContract: boolean;
  contractData: ContractData | null;
  pendingServiceChanges: PendingServiceChanges;
  setPendingServiceChanges: (changes: PendingServiceChanges) => void;
  applyPendingChanges: () => void;
}
```

### **Estados da Página**

```typescript
// src/pages/Contracts.tsx
const [viewState, setViewState] = useState<"list" | "form">("list");
const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
const [formMode, setFormMode] = useState<"create" | "edit" | "view">("create");
const [isLoading, setIsLoading] = useState(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [isDetailsLoading, setIsDetailsLoading] = useState(false);
```

---

## 🎨 Componentes Visuais

### **Estrutura do Modal**

```
Dialog (CustomDialogContent)
└── NewContractForm
    └── ContractForm
        └── ContractFormProvider
            └── ContractFormContentInternal
                ├── ContractFormHeader (cabeçalho)
                ├── Sidebar (navegação + ações)
                │   ├── ContractFormActions (botão salvar)
                │   ├── Navegação de abas
                │   └── Ações do contrato (Ativar/Suspender/Cancelar)
                └── Área principal
                    ├── ContractBasicInfo
                    ├── Conteúdo da aba ativa
                    │   ├── ContractServices
                    │   ├── ContractProducts
                    │   ├── ContractDiscounts
                    │   ├── ContractTaxes
                    │   ├── Observações
                    │   └── RecebimentosHistorico
                    └── ContractSidebar (resumo e totais)
```

---

## 🔄 Mapeamento de Valores

### **Payment Method**
```typescript
// Frontend → Banco
'Cartão' → 'Cartão'
'PIX' → 'PIX'
'Transferência Bancária' → 'Transferência'
'Boleto Bancário' → 'Boleto'

// Banco → Frontend (reverso)
'Cartão' → 'Cartão'
'PIX' → 'PIX'
'Transferência' → 'Transferência Bancária'
'Boleto' → 'Boleto Bancário'
```

### **Billing Type**
```typescript
// Frontend → Banco
'Único' → 'Único'
'Mensal' → 'Mensal'
'Trimestral' → 'Trimestral'
'Semestral' → 'Semestral'
'Anual' → 'Anual'
```

### **Recurrence Frequency**
```typescript
// Frontend → Banco
'Mensal' → 'Mensal'
'Trimestral' → 'Trimestral'
'Semestral' → 'Semestral'
'Anual' → 'Anual'
'Único' → 'Único'
```

---

## ⚠️ Validações Importantes

### **Antes de Salvar**

1. **Campos Obrigatórios do Contrato**
   - `customer_id`
   - `initial_date`
   - `final_date`
   - `billing_type`
   - `billing_day`

2. **Configuração Financeira de Serviços**
   - `payment_method` obrigatório
   - `billing_type` obrigatório
   - `recurrence_frequency` obrigatório se `billing_type` for recorrente
   - `card_type` obrigatório se `payment_method === 'Cartão'`

3. **Configuração Financeira de Produtos**
   - Mesmas validações dos serviços

### **Validações de Segurança**

1. **Tenant ID**
   - Sempre incluído em todas as operações
   - Validado antes de salvar
   - Verificado após criação/atualização

2. **Contexto de Tenant**
   - Configurado antes de qualquer operação
   - Usa `set_tenant_context_simple` RPC

3. **RLS (Row Level Security)**
   - Todas as queries respeitam RLS
   - Validação dupla após operações críticas

---

## 🐛 Pontos de Atenção

### **1. Carregamento de Dados**
- Evitar recarregamentos desnecessários usando `loadedContractRef`
- Usar `isLoadingRef` para prevenir múltiplos carregamentos simultâneos

### **2. Processamento de Serviços**
- Lógica complexa de UPDATE/INSERT/DELETE
- Verificação de duplicações antes de inserir
- Mapeamento de serviços existentes com novos dados

### **3. Formatação de Datas**
- Usar `formatDateForDatabase` para evitar problemas de timezone
- Ajustar para meio-dia UTC antes de formatar

### **4. Cálculo de Totais**
- Recalcula automaticamente quando serviços/produtos mudam
- Usa custos reais da view quando disponível
- Calcula por `cost_percentage` para contratos novos

### **5. Alterações Pendentes**
- Sistema de `pendingServiceChanges` para aplicar mudanças antes de salvar
- Função `applyPendingChanges()` chamada antes do submit

---

## 📝 Notas de Desenvolvimento

### **AIDEV-NOTE Tags Importantes**

1. **Segurança Multi-Tenant**
   - Todas as operações devem validar `tenant_id`
   - Sempre configurar contexto antes de operações

2. **Otimizações**
   - Evitar recarregamentos desnecessários
   - Usar refs para rastrear estado de carregamento
   - Cache inteligente por tenant

3. **Validações**
   - Validar configuração financeira antes de salvar
   - Verificar duplicações antes de inserir
   - Validar pertencimento ao tenant

4. **Mapeamento de Valores**
   - Funções de mapeamento para frontend ↔ banco
   - Preservar dados de vencimento do banco
   - Validar `card_type` conforme constraint

---

## 🎯 Próximos Passos para Modificações

Para modificar o modal de edição, você pode:

1. **Adicionar novos campos**
   - Adicionar no schema (`ContractFormSchema`)
   - Adicionar no formulário (`ContractBasicInfo` ou componente específico)
   - Incluir em `prepareContractData` se necessário

2. **Modificar validações**
   - Ajustar `contractFormSchema`
   - Adicionar validações em `handleSubmit`
   - Incluir validações de segurança se necessário

3. **Adicionar novas abas**
   - Adicionar em `ContractFormConfig`
   - Criar componente da aba
   - Adicionar em `renderTabContent`

4. **Modificar lógica de salvamento**
   - Ajustar `handleSubmit` em `ContractFormActions`
   - Modificar `prepareContractData` se necessário
   - Ajustar processamento de serviços/produtos

---

## 📚 Referências

- **Schema:** `src/components/contracts/schema/ContractFormSchema.ts`
- **Types:** `src/types/models/contract.ts`
- **Hooks:** `src/hooks/useContracts.ts`, `src/hooks/useContractEdit.ts`
- **Config:** `src/components/contracts/types/ContractFormConfig.ts`

---

**Última atualização:** 2024
**Versão:** 1.0

