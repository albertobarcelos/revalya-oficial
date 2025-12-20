# 📋 Explicação da Lógica do Botão "Ver Detalhes"

## 🎯 Visão Geral

O botão "Ver Detalhes" no Kanban de Faturamento abre um modal que exibe os detalhes de uma ordem de faturamento. A lógica atual tenta determinar se o período é de um **contrato** ou **faturamento avulso (standalone)** através de tentativas sequenciais, o que causa problemas intermitentes.

---

## 🔄 Fluxo Atual (PASSO A PASSO)

### **1. Clique no Botão** (`KanbanCard.tsx`)
```
Usuário clica em "Ver Detalhes"
  ↓
handleViewDetails() é chamado
  ↓
Valida periodId (UUID válido)
  ↓
Chama onViewDetails(periodId)
```

### **2. Abertura do Modal** (`useKanbanModals.ts`)
```
openDetailsModal(periodId)
  ↓
Validações de segurança (tenant, acesso)
  ↓
Atualiza estado: selectedPeriodId = periodId
  ↓
Abre modal: isContractModalOpen = true
```

### **3. Renderização do Componente** (`FaturamentoKanban.tsx`)
```
Modal renderiza <BillingOrderDetails periodId={selectedPeriodId} />
```

### **4. Busca de Dados** (`BillingOrderDetails.tsx`)

**PROBLEMA PRINCIPAL:** O componente executa **2 hooks em paralelo** sem saber qual vai retornar dados:

```typescript
// Hook 1: Tenta buscar em contract_billing_periods
const { data: order, error, isLoading } = useBillingOrder({ periodId });

// Hook 2: Tenta buscar em standalone_billing_periods  
const standaloneQuery = useStandalonePeriod(periodId);
```

### **5. Lógica de Decisão** (`BillingOrderDetails.tsx`)

```typescript
// Determina se é standalone baseado nos resultados
const isStandalone = order === null && !error && !!standaloneQuery.data;
```

**PROBLEMAS:**
- ⚠️ **Condição de corrida**: `order` pode retornar `null` rapidamente (erro 400), mas `standaloneQuery` ainda está carregando
- ⚠️ **Duas queries desnecessárias**: Sempre busca em ambas as tabelas, mesmo sabendo que é standalone
- ⚠️ **Erro HTTP 400**: Quando é standalone, `contract_billing_periods` retorna 400, causando confusão

---

## 🔍 Lógica Interna do `useBillingOrder`

### **Fluxo de Busca:**

```
1. Tenta buscar em contract_billing_periods
   ├─ ✅ Encontrou → Continua (busca contrato, cliente, etc.)
   ├─ ❌ Erro 400 → Tenta standalone_billing_periods
   ├─ ❌ Erro PGRST116 (não encontrado) → Tenta standalone_billing_periods
   └─ ❌ Outro erro → Lança exceção

2. Se não encontrou em contract_billing_periods:
   ├─ Tenta buscar em standalone_billing_periods
   ├─ ✅ Encontrou → Retorna null (sinaliza que é standalone)
   └─ ❌ Não encontrou → Lança erro PERIOD_NOT_FOUND
```

**PROBLEMA:** O hook sempre tenta `contract_billing_periods` primeiro, mesmo quando já sabemos que é standalone (via `contract.is_standalone` do Kanban).

---

## 🎨 Renderização Final

### **Cenários Possíveis:**

1. **Loading**: Mostra `ContractFormSkeleton`
2. **Erro**: Mostra tela de erro com botão "Tentar novamente"
3. **Standalone**: Usa `ContractForm` com `initialData` (sem `contractId`)
4. **Contrato**: Usa `ContractForm` com `contractId` (carrega dados do contrato)

---

## ⚠️ Problemas Identificados

### **1. Duplicação de Queries**
- O Kanban já sabe se é standalone (`contract.is_standalone`)
- Mas o componente ignora essa informação e busca em ambas as tabelas

### **2. Condição de Corrida**
- `useBillingOrder` pode retornar `null` rapidamente
- `useStandalonePeriod` ainda está carregando
- Componente pode mostrar erro prematuramente

### **3. Erro HTTP 400**
- Quando é standalone, `contract_billing_periods` retorna 400
- Isso causa logs de erro desnecessários e pode confundir

### **4. ContractForm sem contractId**
- Para standalone, não há `contractId`
- `ContractForm` pode não funcionar corretamente sem `contractId`
- Itens (serviços/produtos) não são exibidos para standalone

---

## 💡 Proposta de Reformulação

### **Abordagem Recomendada:**

1. **Passar informação do tipo** do Kanban para o componente:
   ```typescript
   <BillingOrderDetails 
     periodId={selectedPeriodId}
     isStandalone={contract.is_standalone} // ← Informação já disponível!
     onClose={closeDetailsModal}
   />
   ```

2. **Buscar apenas na tabela correta**:
   ```typescript
   // Se sabemos que é standalone, buscar direto em standalone
   // Se sabemos que é contrato, buscar direto em contract_billing_periods
   ```

3. **Simplificar lógica de decisão**:
   ```typescript
   // Não precisa de 2 hooks em paralelo
   // Não precisa de fallback complexo
   // Não precisa aguardar ambas as queries
   ```

4. **Adaptar ContractForm para standalone**:
   - Criar uma versão adaptada que exiba itens do standalone
   - Ou criar componente específico para standalone que reutilize partes do ContractForm

---

## 📊 Diagrama de Fluxo Atual vs. Proposto

### **ATUAL (Problemático):**
```
Kanban → Modal → BillingOrderDetails
                    ├─ useBillingOrder (tenta contract_billing_periods)
                    └─ useStandalonePeriod (tenta standalone_billing_periods)
                    ↓
              Aguarda ambos terminarem
              ↓
        Decide qual usar baseado nos resultados
        ↓
    Pode mostrar erro prematuramente
```

### **PROPOSTO (Otimizado):**
```
Kanban (já sabe is_standalone) → Modal → BillingOrderDetails(isStandalone)
                                                    ↓
                                    Se standalone: busca apenas standalone
                                    Se contrato: busca apenas contract
                                                    ↓
                                            Renderiza diretamente
```

---

## 🎯 Resumo Executivo

**Problema Principal:** 
- O sistema tenta descobrir o tipo de período através de tentativas, quando já tem essa informação disponível no Kanban.

**Solução:**
- Passar `is_standalone` do Kanban para o componente
- Buscar apenas na tabela correta
- Eliminar lógica de fallback complexa
- Adaptar ContractForm para funcionar com standalone ou criar componente específico

**Benefícios:**
- ✅ Mais rápido (1 query em vez de 2)
- ✅ Mais confiável (sem condições de corrida)
- ✅ Mais simples (lógica direta)
- ✅ Sem erros HTTP 400 desnecessários
