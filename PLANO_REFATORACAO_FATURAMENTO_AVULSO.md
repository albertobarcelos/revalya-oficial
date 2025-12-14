# 📋 Plano de Refatoração - CreateStandaloneBillingDialog.tsx

## 🎯 Objetivo
Refatorar o componente `CreateStandaloneBillingDialog.tsx` (1204 linhas) em uma estrutura modular, mantendo 100% da funcionalidade, design e lógica atual.

---

## 📊 Análise do Estado Atual

### Problemas Identificados:
1. **Componente monolítico**: 1204 linhas em um único arquivo
2. **Múltiplas responsabilidades**: Gerenciamento de estado, validação, renderização, lógica de negócio
3. **Lógica complexa de pagamento**: Condicionais aninhadas para diferentes métodos
4. **Duplicação de código**: Validações e formatações repetidas
5. **Dificuldade de teste**: Componente grande dificulta testes unitários
6. **Manutenibilidade**: Mudanças requerem navegar por muitas linhas

### Funcionalidades que DEVEM ser preservadas:
- ✅ Wizard de 4 steps (Cliente → Itens → Pagamento → Revisão)
- ✅ Seleção de cliente com busca e criação
- ✅ Adição de produtos e serviços
- ✅ Serviços personalizados (digitar manualmente)
- ✅ Descrição de produtos/serviços
- ✅ Local de estoque para produtos
- ✅ Associação de pagamento por item
- ✅ Validações completas
- ✅ Formatação de moeda brasileira
- ✅ Animações com Framer Motion
- ✅ Modal de escolha de item (Produto/Serviço)
- ✅ Cálculo de totais
- ✅ Todos os tipos de pagamento e suas regras

---

## 🏗️ Estrutura Proposta

### 1. **Hooks Customizados** (`src/hooks/billing/useStandaloneBillingForm/`)

#### `useStandaloneBillingForm.ts`
- Gerenciamento centralizado de estado do formulário
- Estados: currentStep, customer, items, payment, errors
- Funções: reset, validate, navigation

#### `useBillingItems.ts`
- Gerenciamento de itens (adicionar, remover, atualizar)
- Lógica de produtos vs serviços vs custom
- Cálculo de totais

#### `useBillingValidation.ts`
- Todas as validações por step
- Mensagens de erro padronizadas
- Validação de itens customizados

#### `useCurrencyFormatting.ts`
- parseCurrencyInput
- formatCurrencyInput
- formatCurrency (já existe em utils, mas pode ser centralizado)

#### `usePaymentAssociation.ts`
- Lógica de associação de pagamento por item
- Regras de exibição de campos condicionais
- Validação de campos de pagamento

### 2. **Componentes de Steps** (`src/components/billing/standalone/steps/`)

#### `CustomerStep.tsx`
- Renderização do step de cliente
- Integração com ClientSearch e ClientCreation
- Exibição de cliente selecionado

#### `ItemsStep.tsx`
- Renderização do step de itens
- Lista de itens
- Botão "Adicionar Item"
- Total geral

#### `PaymentStep.tsx`
- Renderização do step de pagamento
- Data de faturamento
- Lista de itens com associação de pagamento

#### `ReviewStep.tsx`
- Renderização do step de revisão
- Resumo completo
- Informações de cliente, itens e pagamento

### 3. **Componentes de Item** (`src/components/billing/standalone/items/`)

#### `BillingItemCard.tsx`
- Card individual de item
- Header com número e botão de remover
- Renderização condicional baseada no tipo

#### `ProductItemFields.tsx`
- Campos específicos de produto
- ProductSearchInput
- Local de estoque
- Descrição

#### `ServiceItemFields.tsx`
- Campos específicos de serviço
- ServiceSearchInput
- Modo custom (digitar manualmente)
- Descrição

#### `CustomServiceFields.tsx`
- Campos de serviço personalizado
- Nome e descrição customizados

#### `ItemPriceFields.tsx`
- Campos de quantidade, preço unitário e total
- Formatação de moeda
- Cálculo automático

### 4. **Componentes de Pagamento** (`src/components/billing/standalone/payment/`)

#### `PaymentAssociationCard.tsx`
- Card de associação de pagamento por item
- Botão "Associar Pagamento"
- Expansão/colapso

#### `PaymentMethodFields.tsx`
- Seleção de meio de pagamento
- Campos condicionais baseados no método
- Tipo de cartão (se aplicável)

#### `BillingTypeFields.tsx`
- Tipo de faturamento
- Frequência de cobrança
- Número de parcelas
- Regras condicionais complexas

#### `DueDateField.tsx`
- Data de vencimento
- Validação de data mínima

### 5. **Componentes Compartilhados** (`src/components/billing/standalone/shared/`)

#### `StepIndicator.tsx`
- Indicador de progresso dos steps
- Ícones e estados (ativo, completo, pendente)
- Linhas conectoras

#### `AddItemChooserModal.tsx`
- Modal de escolha entre Produto e Serviço
- Botões grandes quase quadrados

#### `BillingItemDescription.tsx`
- Campo de descrição reutilizável
- Lógica de exibição baseada no tipo de item

### 6. **Tipos e Interfaces** (`src/types/billing/standalone.ts`)

```typescript
export interface BillingItem { ... }
export type Step = 'customer' | 'items' | 'payment' | 'review';
export interface StepConfig { ... }
export interface PaymentAssociation { ... }
```

### 7. **Utilitários** (`src/utils/billing/standalone/`)

#### `billingItemHelpers.ts`
- Funções auxiliares para manipulação de itens
- Conversão entre formatos
- Validações específicas

#### `paymentRules.ts`
- Regras de negócio de pagamento
- Lógica condicional de exibição de campos
- Validações de pagamento

---

## 📝 Plano de Execução (Fases)

### **FASE 1: Preparação e Estrutura Base** ⏱️ ~2h
1. Criar estrutura de diretórios
2. Extrair tipos e interfaces para arquivo separado
3. Criar hooks base (estrutura vazia)
4. Documentar dependências entre componentes

### **FASE 2: Extração de Hooks** ⏱️ ~3h
1. `useCurrencyFormatting.ts` - Funções de formatação
2. `useBillingItems.ts` - Gerenciamento de itens
3. `useBillingValidation.ts` - Validações
4. `useStandaloneBillingForm.ts` - Estado principal
5. `usePaymentAssociation.ts` - Lógica de pagamento

**Teste**: Verificar que hooks funcionam isoladamente

### **FASE 3: Componentes de Steps** ⏱️ ~4h
1. `CustomerStep.tsx` - Extrair step de cliente
2. `ItemsStep.tsx` - Extrair step de itens
3. `PaymentStep.tsx` - Extrair step de pagamento
4. `ReviewStep.tsx` - Extrair step de revisão
5. `StepIndicator.tsx` - Extrair indicador

**Teste**: Verificar renderização de cada step isoladamente

### **FASE 4: Componentes de Item** ⏱️ ~3h
1. `BillingItemCard.tsx` - Estrutura base do card
2. `ProductItemFields.tsx` - Campos de produto
3. `ServiceItemFields.tsx` - Campos de serviço
4. `CustomServiceFields.tsx` - Campos custom
5. `ItemPriceFields.tsx` - Campos de preço
6. `BillingItemDescription.tsx` - Campo de descrição

**Teste**: Verificar renderização de cada tipo de item

### **FASE 5: Componentes de Pagamento** ⏱️ ~3h
1. `PaymentAssociationCard.tsx` - Card de associação
2. `PaymentMethodFields.tsx` - Campos de método
3. `BillingTypeFields.tsx` - Campos de tipo
4. `DueDateField.tsx` - Campo de vencimento

**Teste**: Verificar todas as combinações de pagamento

### **FASE 6: Componentes Compartilhados** ⏱️ ~1h
1. `AddItemChooserModal.tsx` - Modal de escolha
2. Utilitários e helpers

**Teste**: Verificar modais e componentes auxiliares

### **FASE 7: Integração e Refatoração Final** ⏱️ ~2h
1. Refatorar `CreateStandaloneBillingDialog.tsx` para usar novos componentes
2. Conectar todos os hooks
3. Garantir que animações funcionam
4. Verificar que todas as funcionalidades estão preservadas

### **FASE 8: Testes e Validação** ⏱️ ~2h
1. Testar todos os fluxos:
   - Criação completa de faturamento
   - Serviço personalizado
   - Produto com estoque
   - Todos os métodos de pagamento
   - Validações
2. Verificar design visual
3. Testar responsividade
4. Validar acessibilidade

---

## 📁 Estrutura de Arquivos Final

```
src/
├── components/
│   └── billing/
│       ├── standalone/
│       │   ├── steps/
│       │   │   ├── CustomerStep.tsx
│       │   │   ├── ItemsStep.tsx
│       │   │   ├── PaymentStep.tsx
│       │   │   ├── ReviewStep.tsx
│       │   │   └── StepIndicator.tsx
│       │   ├── items/
│       │   │   ├── BillingItemCard.tsx
│       │   │   ├── ProductItemFields.tsx
│       │   │   ├── ServiceItemFields.tsx
│       │   │   ├── CustomServiceFields.tsx
│       │   │   ├── ItemPriceFields.tsx
│       │   │   └── BillingItemDescription.tsx
│       │   ├── payment/
│       │   │   ├── PaymentAssociationCard.tsx
│       │   │   ├── PaymentMethodFields.tsx
│       │   │   ├── BillingTypeFields.tsx
│       │   │   └── DueDateField.tsx
│       │   └── shared/
│       │       └── AddItemChooserModal.tsx
│       └── CreateStandaloneBillingDialog.tsx (refatorado, ~200 linhas)
├── hooks/
│   └── billing/
│       └── useStandaloneBillingForm/
│           ├── useStandaloneBillingForm.ts
│           ├── useBillingItems.ts
│           ├── useBillingValidation.ts
│           ├── useCurrencyFormatting.ts
│           └── usePaymentAssociation.ts
├── types/
│   └── billing/
│       └── standalone.ts
└── utils/
    └── billing/
        └── standalone/
            ├── billingItemHelpers.ts
            └── paymentRules.ts
```

---

## 🔄 Fluxo de Dados Proposto

```
CreateStandaloneBillingDialog (Orquestrador)
    ↓
useStandaloneBillingForm (Estado Principal)
    ├── useBillingItems (Gerenciamento de Itens)
    ├── useBillingValidation (Validações)
    ├── useCurrencyFormatting (Formatação)
    └── usePaymentAssociation (Lógica de Pagamento)
    ↓
Steps Components
    ├── CustomerStep
    ├── ItemsStep → BillingItemCard → [ProductItemFields | ServiceItemFields]
    ├── PaymentStep → PaymentAssociationCard → [PaymentMethodFields, BillingTypeFields]
    └── ReviewStep
```

---

## ✅ Checklist de Validação

### Funcionalidades
- [ ] Seleção de cliente funciona
- [ ] Criação de cliente funciona
- [ ] Adição de produto funciona
- [ ] Adição de serviço funciona
- [ ] Serviço personalizado funciona
- [ ] Descrição de produtos/serviços funciona
- [ ] Local de estoque funciona
- [ ] Associação de pagamento por item funciona
- [ ] Todos os métodos de pagamento funcionam
- [ ] Validações funcionam
- [ ] Cálculo de totais funciona
- [ ] Submissão funciona

### Design
- [ ] Animações preservadas
- [ ] Layout responsivo mantido
- [ ] Cores e estilos mantidos
- [ ] Modais com tamanhos corretos
- [ ] Indicador de steps funciona

### Performance
- [ ] Sem re-renders desnecessários
- [ ] Memoização aplicada onde necessário
- [ ] Hooks otimizados

---

## 🚨 Riscos e Mitigações

### Risco 1: Quebrar funcionalidade existente
**Mitigação**: 
- Refatoração incremental
- Testes após cada fase
- Manter arquivo original até validação completa

### Risco 2: Perder lógica de negócio complexa
**Mitigação**:
- Documentar todas as regras de negócio
- Extrair lógica para funções puras testáveis
- Revisar cada extração cuidadosamente

### Risco 3: Problemas de performance
**Mitigação**:
- Usar React.memo onde necessário
- Otimizar hooks com useMemo/useCallback
- Profiling antes e depois

---

## 📈 Benefícios Esperados

1. **Manutenibilidade**: Código organizado e fácil de encontrar
2. **Testabilidade**: Componentes pequenos e testáveis
3. **Reutilização**: Componentes podem ser reutilizados
4. **Legibilidade**: Cada arquivo tem responsabilidade clara
5. **Colaboração**: Múltiplos devs podem trabalhar simultaneamente
6. **Performance**: Melhor otimização de re-renders

---

## 🎯 Próximos Passos

1. Revisar e aprovar este plano
2. Criar branch de refatoração
3. Executar fases sequencialmente
4. Testar após cada fase
5. Code review antes de merge
6. Documentar componentes criados

---

**Estimativa Total**: ~20 horas de desenvolvimento + testes
