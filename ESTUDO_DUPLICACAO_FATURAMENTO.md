# 📊 Estudo de Duplicação: Faturamento por Contrato vs. Faturamento Avulso

## ✅ STATUS: IMPLEMENTADO

> **Data de implementação:** Dezembro/2024
> **Abordagem escolhida:** Opção 0 (Simplificada) - Usar `contract_billing_periods` como base

### Resumo da Implementação

| Mudança | Status |
|---------|--------|
| Adicionar colunas em `contract_billing_periods` | ✅ Concluído |
| Tornar `contract_id` opcional | ✅ Concluído |
| Adicionar flag `is_standalone` | ✅ Concluído |
| Ajustar trigger de validação | ✅ Concluído |
| Migrar dados de `standalone_billing_periods` | ✅ 12 registros migrados |
| Renomear `standalone_billing_items` → `billing_period_items` | ✅ Concluído |
| Atualizar função RPC `get_billing_kanban` | ✅ Sem UNION ALL |
| Criar VIEW de compatibilidade `standalone_billing_periods` | ✅ Concluído |
| Atualizar código React | ✅ Concluído |

### Estado Final

```
contract_billing_periods (total): 1098 registros
├── Contratos (is_standalone=false): 1086 registros
└── Avulsos (is_standalone=true): 12 registros

billing_period_items: 18 registros (renomeado de standalone_billing_items)
```

---

## 🎯 Objetivo (Original)

Analisar a estrutura atual de faturamento e identificar duplicações entre:
- **Faturamento por Contrato** (`contract_billing_periods`)
- **Faturamento Avulso** (`standalone_billing_periods`)

Verificar se é possível unificar em uma única tabela com uma coluna `is_standalone` (boolean).

---

## 📐 Diagrama: Estrutura Atual vs. Proposta

### Estrutura ATUAL (Duplicada)

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│ contract_billing_periods     │         │ standalone_billing_periods  │
├─────────────────────────────┤         ├─────────────────────────────┤
│ id (uuid)                    │         │ id (uuid)                    │
│ tenant_id (FK)               │         │ tenant_id (FK)               │
│ contract_id (FK) [OBRIG]     │         │ customer_id (FK) [OBRIG]     │
│ period_start [OBRIG]         │         │ contract_id (FK) [OPCIONAL] │
│ period_end [OBRIG]           │         │ bill_date [OBRIG]            │
│ bill_date [OBRIG]            │         │ due_date [OBRIG]             │
│ status (enum)                │         │ status (enum)                │
│ amount_planned               │         │ amount_planned [OBRIG]        │
│ amount_billed                │         │ amount_billed                │
│ order_number                 │         │ order_number                 │
│ ... (campos comuns)          │         │ payment_method               │
└─────────────────────────────┘         │ payment_gateway_id           │
         │                               │ description                   │
         │                               │ ... (campos comuns)           │
         │                               └─────────────────────────────┘
         │                                         │
         │                                         │
         ▼                                         ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│ contract_billing_items      │         │ standalone_billing_items     │
├─────────────────────────────┤         ├─────────────────────────────┤
│ billing_id (FK)             │         │ standalone_billing_period_id │
│ contract_service_id (FK)    │         │ product_id (FK)              │
│ quantity, unit_price        │         │ service_id (FK)              │
│ discount_percentage         │         │ quantity, unit_price         │
│ tax_code, tax_rate         │         │ storage_location_id           │
│ ...                         │         │ stock_movement_id             │
└─────────────────────────────┘         │ ...                          │
                                        └─────────────────────────────┘
```

**Problemas:**
- ❌ Duas tabelas fazendo a mesma coisa
- ❌ Queries precisam de UNION ALL
- ❌ Código duplicado
- ❌ Enums diferentes (`LATE` vs `OVERDUE`)

---

### Estrutura PROPOSTA (Unificada)

```
┌─────────────────────────────────────────────────────────────┐
│ billing_periods (UNIFICADA)                                  │
├─────────────────────────────────────────────────────────────┤
│ id (uuid)                                                    │
│ tenant_id (FK)                                               │
│ is_standalone (boolean) [FLAG PRINCIPAL]                     │
│                                                              │
│ -- Relacionamentos condicionais                              │
│ contract_id (FK) [OBRIG se is_standalone=false]             │
│ customer_id (FK) [OBRIG se is_standalone=true]              │
│                                                              │
│ -- Datas condicionais                                        │
│ period_start (date) [OBRIG se is_standalone=false]          │
│ period_end (date) [OBRIG se is_standalone=false]             │
│ bill_date (date) [OBRIG]                                     │
│ due_date (date) [OBRIG se is_standalone=true]                │
│                                                              │
│ -- Campos comuns                                             │
│ status (enum unificado)                                      │
│ amount_planned, amount_billed                                 │
│ order_number                                                 │
│ payment_method, payment_gateway_id                           │
│ description                                                  │
│ ... (todos os campos comuns)                                 │
└─────────────────────────────────────────────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ billing_items (UNIFICADA)                                    │
├─────────────────────────────────────────────────────────────┤
│ billing_period_id (FK)                                       │
│ is_standalone (boolean)                                       │
│                                                              │
│ -- Origem condicional                                        │
│ contract_service_id (FK) [se is_standalone=false]           │
│ product_id (FK) [se is_standalone=true]                      │
│ service_id (FK) [se is_standalone=true]                      │
│                                                              │
│ -- Campos comuns                                             │
│ quantity, unit_price, total_price                            │
│ description                                                  │
│                                                              │
│ -- Campos específicos (opcionais)                            │
│ discount_percentage, discount_amount                         │
│ tax_code, tax_rate, tax_amount                              │
│ storage_location_id, stock_movement_id                        │
└─────────────────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Uma única tabela
- ✅ Queries simples (WHERE is_standalone = true/false)
- ✅ Código unificado
- ✅ Enum único de status

---

## 📋 Estrutura Atual das Tabelas

### 1. `contract_billing_periods` (Faturamento por Contrato)

**Campos:**
- `id` (uuid, PK)
- `tenant_id` (uuid, FK → tenants, **OBRIGATÓRIO**)
- `contract_id` (uuid, FK → contracts, **OBRIGATÓRIO**)
- `period_start` (date, **OBRIGATÓRIO**)
- `period_end` (date, **OBRIGATÓRIO**)
- `bill_date` (date, **OBRIGATÓRIO**)
- `status` (enum: billing_period_status, **OBRIGATÓRIO**, default: 'PENDING')
- `billed_at` (timestamp, opcional)
- `amount_planned` (numeric, opcional)
- `amount_billed` (numeric, opcional)
- `order_number` (text, opcional) - Número da Ordem de Serviço
- `manual_mark` (boolean, default: false)
- `manual_reason` (text, opcional)
- `actor_id` (uuid, opcional)
- `from_status` (enum, opcional)
- `transition_reason` (text, opcional)
- `created_at` (timestamp, **OBRIGATÓRIO**)
- `updated_at` (timestamp, **OBRIGATÓRIO**)

**Relacionamentos:**
- `contract_id` → `contracts.id` (obrigatório)
- `tenant_id` → `tenants.id` (obrigatório)

**Triggers:**
- `trg_enforce_active_contract_on_period` - Valida contrato ativo
- `trigger_auto_update_billing_status` - Atualiza status automaticamente
- `trigger_generate_order_number_contract_period` - Gera número da ordem
- `trigger_cbp_updated_at` - Atualiza `updated_at`

---

### 2. `standalone_billing_periods` (Faturamento Avulso)

**Campos:**
- `id` (uuid, PK)
- `tenant_id` (uuid, FK → tenants, **OBRIGATÓRIO**)
- `customer_id` (uuid, FK → customers, **OBRIGATÓRIO**)
- `contract_id` (uuid, FK → contracts, **OPCIONAL** - pode ser NULL)
- `bill_date` (date, **OBRIGATÓRIO**)
- `due_date` (date, **OBRIGATÓRIO**)
- `status` (enum: standalone_billing_status, **OBRIGATÓRIO**, default: 'PENDING')
- `amount_planned` (numeric, **OBRIGATÓRIO**, default: 0)
- `amount_billed` (numeric, opcional)
- `billed_at` (timestamp, opcional)
- `payment_method` (text, opcional)
- `payment_gateway_id` (uuid, opcional)
- `description` (text, opcional)
- `order_number` (text, opcional) - Número da Ordem de Serviço
- `manual_mark` (boolean, opcional, default: false)
- `manual_reason` (text, opcional)
- `actor_id` (uuid, opcional)
- `from_status` (enum, opcional)
- `transition_reason` (text, opcional)
- `created_at` (timestamp, **OBRIGATÓRIO**)
- `updated_at` (timestamp, **OBRIGATÓRIO**)

**Relacionamentos:**
- `customer_id` → `customers.id` (obrigatório)
- `contract_id` → `contracts.id` (opcional - pode ser NULL)
- `tenant_id` → `tenants.id` (obrigatório)

**Triggers:**
- `trigger_generate_order_number_standalone_period` - Gera número da ordem
- `trigger_update_standalone_billing_periods_updated_at` - Atualiza `updated_at`

---

## 🔍 Análise Comparativa

### ✅ Campos Comuns (Idênticos)

| Campo | contract_billing_periods | standalone_billing_periods | Observação |
|-------|--------------------------|----------------------------|------------|
| `id` | uuid, PK | uuid, PK | ✅ Idêntico |
| `tenant_id` | uuid, FK, obrigatório | uuid, FK, obrigatório | ✅ Idêntico |
| `status` | enum, obrigatório | enum, obrigatório | ⚠️ Enums diferentes |
| `bill_date` | date, obrigatório | date, obrigatório | ✅ Idêntico |
| `amount_planned` | numeric, opcional | numeric, obrigatório | ⚠️ Diferente (obrigatoriedade) |
| `amount_billed` | numeric, opcional | numeric, opcional | ✅ Idêntico |
| `billed_at` | timestamp, opcional | timestamp, opcional | ✅ Idêntico |
| `order_number` | text, opcional | text, opcional | ✅ Idêntico |
| `manual_mark` | boolean, default false | boolean, default false | ✅ Idêntico |
| `manual_reason` | text, opcional | text, opcional | ✅ Idêntico |
| `actor_id` | uuid, opcional | uuid, opcional | ✅ Idêntico |
| `from_status` | enum, opcional | enum, opcional | ⚠️ Enums diferentes |
| `transition_reason` | text, opcional | text, opcional | ✅ Idêntico |
| `created_at` | timestamp, obrigatório | timestamp, obrigatório | ✅ Idêntico |
| `updated_at` | timestamp, obrigatório | timestamp, obrigatório | ✅ Idêntico |

### ⚠️ Campos Específicos de `contract_billing_periods`

| Campo | Tipo | Observação |
|-------|------|------------|
| `contract_id` | uuid, FK, **OBRIGATÓRIO** | Sempre tem contrato |
| `period_start` | date, **OBRIGATÓRIO** | Início do período de faturamento |
| `period_end` | date, **OBRIGATÓRIO** | Fim do período de faturamento |

### ⚠️ Campos Específicos de `standalone_billing_periods`

| Campo | Tipo | Observação |
|-------|------|------------|
| `customer_id` | uuid, FK, **OBRIGATÓRIO** | Cliente direto (sem contrato obrigatório) |
| `contract_id` | uuid, FK, **OPCIONAL** | Pode ter contrato ou não |
| `due_date` | date, **OBRIGATÓRIO** | Data de vencimento |
| `payment_method` | text, opcional | Método de pagamento |
| `payment_gateway_id` | uuid, opcional | Gateway de pagamento |
| `description` | text, opcional | Descrição do faturamento |

---

## 🔄 Análise de Itens (Items)

### `contract_billing_items`
- Relaciona com `contract_billings` (tabela de faturamentos faturados)
- Relaciona com `contract_services` (serviços do contrato)
- Campos: `billing_id`, `contract_service_id`, `description`, `quantity`, `unit_price`, `discount_percentage`, `discount_amount`, `total_amount`, `tax_code`, `tax_rate`, `tax_amount`

### `standalone_billing_items`
- Relaciona com `standalone_billing_periods`
- Relaciona com `products` e `services` (diretamente)
- Campos: `standalone_billing_period_id`, `product_id`, `service_id`, `quantity`, `unit_price`, `total_price`, `description`, `storage_location_id`, `stock_movement_id`

**Diferenças:**
- `contract_billing_items` → usa `contract_service_id` (serviço já vinculado ao contrato)
- `standalone_billing_items` → usa `product_id` e `service_id` diretamente (sem contrato)
- `standalone_billing_items` → tem campos de estoque (`storage_location_id`, `stock_movement_id`)

---

## 💡 Proposta de Unificação

### Estrutura Unificada Proposta

```sql
CREATE TABLE unified_billing_periods (
  -- Campos comuns
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  
  -- Flag de identificação
  is_standalone boolean NOT NULL DEFAULT false,
  
  -- Relacionamentos (um ou outro será obrigatório baseado em is_standalone)
  contract_id uuid REFERENCES contracts(id), -- Obrigatório se is_standalone = false
  customer_id uuid REFERENCES customers(id), -- Obrigatório se is_standalone = true
  
  -- Datas
  period_start date, -- Obrigatório se is_standalone = false
  period_end date,   -- Obrigatório se is_standalone = false
  bill_date date NOT NULL,
  due_date date,     -- Obrigatório se is_standalone = true
  
  -- Status e valores
  status billing_period_status NOT NULL DEFAULT 'PENDING',
  amount_planned numeric NOT NULL DEFAULT 0,
  amount_billed numeric,
  billed_at timestamp with time zone,
  
  -- Número da ordem
  order_number text,
  
  -- Pagamento (específico de standalone, mas pode ser usado em contratos também)
  payment_method text,
  payment_gateway_id uuid,
  
  -- Descrição (específico de standalone, mas útil para contratos também)
  description text,
  
  -- Auditoria e controle
  manual_mark boolean NOT NULL DEFAULT false,
  manual_reason text,
  actor_id uuid,
  from_status billing_period_status,
  transition_reason text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT chk_contract_or_customer CHECK (
    (is_standalone = false AND contract_id IS NOT NULL) OR
    (is_standalone = true AND customer_id IS NOT NULL)
  ),
  CONSTRAINT chk_period_dates CHECK (
    (is_standalone = false AND period_start IS NOT NULL AND period_end IS NOT NULL) OR
    (is_standalone = true)
  ),
  CONSTRAINT chk_due_date CHECK (
    (is_standalone = true AND due_date IS NOT NULL) OR
    (is_standalone = false)
  )
);
```

### Vantagens da Unificação

1. ✅ **Elimina duplicação de código**
   - Uma única tabela para buscar
   - Uma única lógica de queries
   - Uma única lógica de triggers

2. ✅ **Simplifica queries**
   - Não precisa de `UNION` ou queries separadas
   - Filtro simples: `WHERE is_standalone = true/false`

3. ✅ **Facilita manutenção**
   - Mudanças em campos comuns afetam ambos os tipos
   - Menos código duplicado

4. ✅ **Melhora performance**
   - Índices únicos
   - Menos joins desnecessários

### Desafios da Unificação

1. ⚠️ **Migração de dados**
   - Migrar dados de `contract_billing_periods` → `unified_billing_periods`
   - Migrar dados de `standalone_billing_periods` → `unified_billing_periods`
   - Atualizar todas as referências no código

2. ⚠️ **Constraints condicionais**
   - Validações diferentes baseadas em `is_standalone`
   - Pode precisar de triggers para validação

3. ⚠️ **Campos opcionais**
   - `period_start/period_end` só fazem sentido para contratos
   - `due_date` só faz sentido para standalone (mas pode ser útil para contratos também)

4. ⚠️ **Itens (Items)**
   - `contract_billing_items` vs `standalone_billing_items` também precisariam unificação
   - Estruturas diferentes (contract_service_id vs product_id/service_id)

---

## 📊 Análise de Itens (Items) - Duplicação

### `contract_billing_items`
- **Relacionamento:** `billing_id` → `contract_billings.id` (tabela de faturamentos faturados)
- **Origem:** Serviços do contrato (`contract_service_id`)
- **Campos comuns:** `id`, `quantity`, `unit_price`, `description`, `created_at`
- **Campos específicos:** 
  - `billing_id` (FK para contract_billings)
  - `contract_service_id` (FK para contract_services)
  - `discount_percentage`, `discount_amount`
  - `tax_code`, `tax_rate`, `tax_amount`
  - `total_amount`

### `standalone_billing_items`
- **Relacionamento:** `standalone_billing_period_id` → `standalone_billing_periods.id`
- **Origem:** Produtos/Serviços diretos (`product_id`, `service_id`)
- **Campos comuns:** `id`, `quantity`, `unit_price`, `description`, `created_at`, `updated_at`
- **Campos específicos:**
  - `standalone_billing_period_id` (FK para standalone_billing_periods)
  - `product_id` (FK para products)
  - `service_id` (FK para services)
  - `storage_location_id` (FK para storage_locations)
  - `stock_movement_id` (FK para stock_movements)
  - `total_price`
  - `observation`

### Comparação de Campos

| Campo | contract_billing_items | standalone_billing_items | Observação |
|-------|------------------------|--------------------------|------------|
| `id` | uuid, PK | uuid, PK | ✅ Idêntico |
| `quantity` | numeric, obrigatório | numeric, obrigatório (default: 1) | ✅ Idêntico |
| `unit_price` | numeric, obrigatório | numeric, obrigatório (default: 0) | ✅ Idêntico |
| `description` | text, obrigatório | text, opcional | ⚠️ Diferente |
| `created_at` | timestamp, obrigatório | timestamp, obrigatório | ✅ Idêntico |
| `updated_at` | - | timestamp, obrigatório | ⚠️ Só standalone tem |
| `total_amount` / `total_price` | numeric, opcional | numeric, opcional | ✅ Similar (nomes diferentes) |
| Desconto | `discount_percentage`, `discount_amount` | - | ⚠️ Só contract tem |
| Impostos | `tax_code`, `tax_rate`, `tax_amount` | - | ⚠️ Só contract tem |
| Estoque | - | `storage_location_id`, `stock_movement_id` | ⚠️ Só standalone tem |
| Origem | `contract_service_id` | `product_id`, `service_id` | ⚠️ Estruturas diferentes |

**Problema:** Estruturas muito diferentes para fazer a mesma coisa (itens de faturamento), mas com necessidades diferentes:
- **Contract items:** Focam em impostos e descontos (mais complexo financeiramente)
- **Standalone items:** Focam em estoque e produtos diretos (mais simples, mas com controle de estoque)

---

## 🎯 Recomendações

### ⭐ Opção 0: Abordagem Simplificada (MAIS RECOMENDADA)

**Usar `contract_billing_periods` como base e apenas adicionar colunas faltantes**

Esta é a abordagem **mais simples e menos invasiva**:

#### Passos da Migração:

1. **Adicionar colunas faltantes em `contract_billing_periods`:**
   ```sql
   ALTER TABLE contract_billing_periods
     ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id),
     ADD COLUMN IF NOT EXISTS due_date date,
     ADD COLUMN IF NOT EXISTS payment_method text,
     ADD COLUMN IF NOT EXISTS payment_gateway_id uuid,
     ADD COLUMN IF NOT EXISTS description text;
   ```

2. **Tornar `contract_id` opcional:**
   ```sql
   ALTER TABLE contract_billing_periods
     ALTER COLUMN contract_id DROP NOT NULL;
   ```

3. **Adicionar constraint condicional:**
   ```sql
   ALTER TABLE contract_billing_periods
     ADD CONSTRAINT chk_contract_or_customer CHECK (
       (contract_id IS NOT NULL) OR (customer_id IS NOT NULL)
     );
   ```

4. **Ajustar trigger de validação de contrato:**
   ```sql
   CREATE OR REPLACE FUNCTION enforce_active_contract_on_period()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     -- AIDEV-NOTE: Só validar contrato se contract_id estiver presente
     IF NEW.contract_id IS NOT NULL THEN
       IF NOT EXISTS (
         SELECT 1
         FROM public.contracts c
         WHERE c.id = NEW.contract_id
           AND c.tenant_id = NEW.tenant_id
           AND c.status = 'ACTIVE'
       ) THEN
         RAISE EXCEPTION 'Contrato % não está ACTIVE. Período de faturamento não pode ser criado.', NEW.contract_id
           USING ERRCODE = 'check_violation';
       END IF;
     END IF;
     
     -- AIDEV-NOTE: Se não tem contract_id, validar customer_id
     IF NEW.contract_id IS NULL AND NEW.customer_id IS NULL THEN
       RAISE EXCEPTION 'Período de faturamento deve ter contract_id OU customer_id'
         USING ERRCODE = 'check_violation';
     END IF;

     RETURN NEW;
   END;
   $$;
   ```

5. **Migrar dados de `standalone_billing_periods`:**
   ```sql
   INSERT INTO contract_billing_periods (
     id, tenant_id, customer_id, contract_id,
     period_start, period_end, bill_date, due_date,
     status, amount_planned, amount_billed, billed_at,
     order_number, payment_method, payment_gateway_id,
     description, manual_mark, manual_reason,
     actor_id, from_status, transition_reason,
     created_at, updated_at
   )
   SELECT 
     id, tenant_id, customer_id, contract_id,
     bill_date AS period_start,  -- AIDEV-NOTE: Usar bill_date como period_start
     due_date AS period_end,      -- AIDEV-NOTE: Usar due_date como period_end
     bill_date, due_date,
     status::text::billing_period_status,  -- AIDEV-NOTE: Converter enum
     amount_planned, amount_billed, billed_at,
     order_number, payment_method, payment_gateway_id,
     description, manual_mark, manual_reason,
     actor_id, from_status::text::billing_period_status, transition_reason,
     created_at, updated_at
   FROM standalone_billing_periods;
   ```

6. **Atualizar queries que assumem `contract_id` obrigatório:**
   - Trocar `INNER JOIN contracts` por `LEFT JOIN contracts`
   - Adicionar lógica: `COALESCE(contracts.customer_id, contract_billing_periods.customer_id)`

7. **Deprecar `standalone_billing_periods`:**
   - Manter tabela por um tempo (comentada/documentada como deprecated)
   - Remover depois de validar que tudo funciona

#### Vantagens desta Abordagem:

✅ **Muito menos invasiva:**
   - Não precisa criar nova tabela
   - Não precisa migrar 1.086 registros existentes
   - Só precisa migrar 12 registros de standalone

✅ **Menos código para atualizar:**
   - Queries existentes continuam funcionando (só precisam de LEFT JOIN)
   - Funções RPC podem ser simplificadas (remover UNION ALL)
   - Componentes React precisam de ajustes mínimos

✅ **Migração mais rápida:**
   - Só adicionar colunas e constraint
   - Migrar 12 registros é trivial
   - Testes mais simples

✅ **Menos risco:**
   - Dados existentes não são movidos
   - Rollback mais fácil (só remover colunas)
   - Compatibilidade mantida

#### Desafios:

⚠️ **Queries que fazem JOIN com contracts:**
   - Precisam ser ajustadas para `LEFT JOIN`
   - Adicionar lógica para pegar `customer_id` do contrato ou direto

⚠️ **Validações que assumem `contract_id` obrigatório:**
   - Trigger `enforce_active_contract_on_period` precisa ser ajustado
   - Validações no código precisam ser atualizadas

⚠️ **Enums de status diferentes:**
   - Precisa converter `standalone_billing_status` para `billing_period_status`
   - Unificar `'OVERDUE'` e `'LATE'` (escolher um padrão)

#### Impacto Estimado:

- **Banco de dados:** ~5-10 queries SQL para ajustar
- **Funções RPC:** ~2-3 funções (principalmente `get_billing_kanban`)
- **Código React:** ~5-10 arquivos (hooks e componentes)
- **Tempo estimado:** 2-4 horas vs. 1-2 dias da abordagem completa

---

### Opção 1: Unificação Completa (Abordagem Original)

**Tabela Unificada:** `billing_periods`
- Adicionar coluna `is_standalone boolean NOT NULL`
- `contract_id` → tornar opcional (NULL quando `is_standalone = true`)
- `customer_id` → tornar obrigatório (pode vir do contrato ou direto)
- `period_start/period_end` → tornar opcional (NULL quando `is_standalone = true`)
- `due_date` → tornar opcional (pode ser calculado ou definido)

**Tabela de Itens Unificada:** `billing_items`
- Adicionar coluna `is_standalone boolean NOT NULL`
- `contract_service_id` → tornar opcional (NULL quando `is_standalone = true`)
- `product_id` e `service_id` → tornar opcionais (NULL quando `is_standalone = false`)
- Campos de estoque → tornar opcionais (só para standalone)

**Vantagens:**
- ✅ Elimina toda duplicação
- ✅ Simplifica código drasticamente
- ✅ Facilita queries e relatórios
- ✅ Melhora performance

**Desvantagens:**
- ⚠️ Migração complexa
- ⚠️ Precisa atualizar todo o código
- ⚠️ Precisa atualizar views e funções RPC

### Opção 2: Manter Separado mas Simplificar

**Melhorias sem unificar:**
- Criar VIEW unificada `billing_periods_unified` que faz UNION
- Criar funções RPC que trabalham com ambas as tabelas
- Padronizar campos comuns

**Vantagens:**
- ✅ Menos risco
- ✅ Migração gradual
- ✅ Mantém compatibilidade

**Desvantagens:**
- ❌ Ainda tem duplicação
- ❌ Queries mais complexas
- ❌ Mais código para manter

---

## 📊 Estatísticas Atuais

**Dados no Banco:**
- `contract_billing_periods`: **1.086 registros**
- `standalone_billing_periods`: **12 registros**
- `contract_billing_items`: **249 registros**
- `standalone_billing_items`: **18 registros**

**Observação:** Há muito mais faturamentos por contrato do que avulsos, mas a estrutura duplicada afeta ambos.

**Impacto da Migração:**
- Total de períodos a migrar: **1.098 registros**
- Total de itens a migrar: **267 registros**
- Migração é viável, mas requer cuidado

---

## 🔍 Evidências de Duplicação no Código

### Função RPC `get_billing_kanban`

A função já faz `UNION ALL` entre as duas tabelas, confirmando a duplicação:

```sql
-- Primeira query: contract_billing_periods
SELECT ... FROM contract_billing_periods cbp
INNER JOIN contracts cont ON cbp.contract_id = cont.id
INNER JOIN customers cust ON cont.customer_id = cust.id
WHERE ...

UNION ALL

-- Segunda query: standalone_billing_periods (QUASE IDÊNTICA)
SELECT ... FROM standalone_billing_periods sbp
INNER JOIN customers cust ON sbp.customer_id = cust.id
WHERE ...
```

**Problemas identificados:**
1. ⚠️ Queries quase idênticas (duplicação de lógica)
2. ⚠️ Enums diferentes: `contract_billing_periods` usa `'LATE'`, `standalone_billing_periods` usa `'OVERDUE'`
3. ⚠️ Lógica de categorização duplicada
4. ⚠️ JOINs diferentes (contracts vs direto com customers)

### VIEW `billing_kanban`

A VIEW atual **só inclui** `contract_billing_periods`, não inclui `standalone_billing_periods`:
- Isso força o uso da função RPC `get_billing_kanban` que faz UNION
- Mais uma camada de complexidade desnecessária

---

## 📝 Próximos Passos Sugeridos

1. **Análise de Impacto:**
   - Listar todas as queries que usam essas tabelas
   - Listar todas as funções RPC que dependem delas
   - Listar todos os componentes React que usam essas tabelas

2. **Plano de Migração:**
   - Criar tabela unificada
   - Migrar dados (1.086 + 12 = 1.098 períodos)
   - Atualizar código gradualmente
   - Manter compatibilidade durante transição

3. **Testes:**
   - Testar queries unificadas
   - Testar triggers e validações
   - Testar performance

---

## 🔍 Conclusão

**Há sim duplicação significativa** entre as duas estruturas. A unificação é tecnicamente viável e recomendada, mas requer planejamento cuidadoso devido ao impacto em todo o sistema.

**Principais pontos:**
- ✅ ~80% dos campos são idênticos
- ✅ Lógica de negócio é muito similar
- ⚠️ Diferenças principais: relacionamentos (contract_id obrigatório vs customer_id obrigatório) e campos específicos (period_start/end vs due_date)
- ⚠️ Itens também têm estrutura duplicada mas com diferenças maiores
- ⚠️ **Função RPC já faz UNION ALL** - evidência clara de duplicação
- ⚠️ **Enums diferentes** (`LATE` vs `OVERDUE`) causam inconsistências

**Recomendação:** Unificar, mas com migração gradual e bem planejada.

**Benefícios esperados:**
- ✅ Eliminar UNION ALL na função RPC
- ✅ Simplificar queries (uma tabela em vez de duas)
- ✅ Reduzir código duplicado
- ✅ Melhorar performance (menos joins)
- ✅ Facilitar manutenção futura
- ✅ Unificar enums de status (eliminar `LATE` vs `OVERDUE`)

---

## 📋 Resumo Executivo

### Duplicação Confirmada ✅

**Evidências:**
1. ✅ ~80% dos campos são idênticos entre `contract_billing_periods` e `standalone_billing_periods`
2. ✅ Função RPC `get_billing_kanban` já faz `UNION ALL` (evidência clara de duplicação)
3. ✅ Lógica de negócio quase idêntica
4. ✅ Triggers similares (geração de `order_number`, atualização de `updated_at`)
5. ✅ Itens também têm estrutura duplicada (mas com diferenças maiores)

### Principais Diferenças

1. **Relacionamentos:**
   - Contract: `contract_id` obrigatório → pega `customer_id` do contrato
   - Standalone: `customer_id` obrigatório, `contract_id` opcional

2. **Datas:**
   - Contract: `period_start` e `period_end` obrigatórios
   - Standalone: `due_date` obrigatório (sem período)

3. **Campos específicos:**
   - Standalone tem: `payment_method`, `payment_gateway_id`, `description`
   - Contract tem: `period_start`, `period_end`

4. **Enums de Status:**
   - Contract usa: `'LATE'`
   - Standalone usa: `'OVERDUE'`
   - **Inconsistência que causa bugs!**

### Viabilidade de Unificação

**✅ TECNICAMENTE VIÁVEL**

A unificação é possível e recomendada porque:
- Estruturas são muito similares
- Diferenças podem ser tratadas com constraints condicionais
- Benefícios superam os custos de migração

**⚠️ REQUER PLANEJAMENTO**

A migração precisa ser cuidadosa porque:
- 1.098 períodos + 267 itens a migrar
- Múltiplas funções RPC dependem das tabelas
- Código React precisa ser atualizado
- Views e triggers precisam ser ajustados

### Próxima Ação Recomendada

**⭐ RECOMENDAÇÃO: Usar Opção 0 (Abordagem Simplificada)**

1. **Criar branch de desenvolvimento** para testar
2. **Adicionar colunas** em `contract_billing_periods`:
   - `customer_id`, `due_date`, `payment_method`, `payment_gateway_id`, `description`
3. **Tornar `contract_id` opcional** e adicionar constraint
4. **Ajustar trigger** `enforce_active_contract_on_period`
5. **Migrar 12 registros** de `standalone_billing_periods`
6. **Atualizar queries** (trocar INNER JOIN por LEFT JOIN onde necessário)
7. **Simplificar função RPC** `get_billing_kanban` (remover UNION ALL)
8. **Testar** e validar
9. **Deprecar** `standalone_billing_periods` após validação

**Tempo estimado:** 2-4 horas (vs. 1-2 dias da abordagem completa)

---

## 📊 Comparação: Abordagem Simplificada vs. Completa

| Aspecto | ⭐ Opção 0 (Simplificada) | Opção 1 (Completa) |
|---------|---------------------------|---------------------|
| **Criar nova tabela** | ❌ Não precisa | ✅ Sim (`billing_periods`) |
| **Migrar dados existentes** | ❌ Não (só 12 standalone) | ✅ Sim (1.098 períodos) |
| **Adicionar colunas** | ✅ Sim (5 colunas) | ✅ Sim (mesmas colunas) |
| **Tornar contract_id opcional** | ✅ Sim | ✅ Sim |
| **Ajustar queries** | ⚠️ ~5-10 queries | ⚠️ ~20-30 queries |
| **Ajustar funções RPC** | ⚠️ ~2-3 funções | ⚠️ ~5-10 funções |
| **Ajustar código React** | ⚠️ ~5-10 arquivos | ⚠️ ~15-20 arquivos |
| **Risco de rollback** | ✅ Baixo (só remover colunas) | ⚠️ Médio (dados migrados) |
| **Tempo estimado** | ✅ 2-4 horas | ⚠️ 1-2 dias |
| **Complexidade** | ✅ Baixa | ⚠️ Alta |
| **Impacto em produção** | ✅ Mínimo | ⚠️ Significativo |

### Conclusão da Comparação

**A Opção 0 (Simplificada) é claramente superior porque:**
- ✅ Não mexe nos 1.086 registros existentes
- ✅ Só precisa migrar 12 registros
- ✅ Menos código para atualizar
- ✅ Menos risco
- ✅ Muito mais rápida
- ✅ Rollback mais fácil

**A única desvantagem da Opção 0:**
- O nome da tabela continua sendo `contract_billing_periods` mesmo quando não tem contrato
  - Mas isso é apenas cosmético e não afeta funcionalidade
  - Pode ser resolvido com uma VIEW ou alias se necessário
