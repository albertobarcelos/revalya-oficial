# Documentação: Configurações Financeiras e Contas a Pagar

## Visão Geral
- Módulos cobertos: Configurações Financeiras (Categorias, Tipos de Documentos, Tipos de Lançamento, Contas Bancárias) e Contas a Pagar.
- Arquitetura: React 18 + TypeScript + Vite, UI Shadcn/Radix, TanStack Query, Supabase (Postgres + RLS).
- Multi-tenant: todas as operações validam `tenant_id`; contexto de tenant é configurado antes de DML usando RPC `set_tenant_context_simple`.

## Configurações Financeiras
- Página: `src/pages/FinanceSettings.tsx`.
- Abas principais:
  - Categoria de Despesas
  - Tipo de Documentos
  - Tipo de Lançamento
  - Contas Bancárias

### Padrão de UI
- Cabeçalhos em `Card` com `CardHeader` e ação de criar via `Dialog`.
- Listas com estados de loading/empty usando ícones (`Loader2`, `Banknote`, `FileText`, `Settings`, `Landmark`).
- `TabsList` com `className="justify-start"` para largura auto (padrão Estoque).

### Contas Bancárias — Wizard
- Etapas e campos:
  - Etapa 1 — Banco: campo `Banco`.
  - Etapa 2 — Agência: campos `Agência` e `Conta`.
  - Etapa 3 — Preferências: campo `Tipo` (Corrente/Poupança/Salário/Outra).
  - Etapa 4 — Revisão: resumo dos dados.
- Validação por etapa:
  - Banco: exige `Banco`.
  - Agência: exige `Agência` e `Conta`.
  - Preferências: exige `Tipo`.
- Referências de código:
  - Validação por etapa: `src/pages/FinanceSettings.tsx:119–129`.
  - Etapa Banco: `src/pages/FinanceSettings.tsx:606–614`.
  - Etapa Agência: `src/pages/FinanceSettings.tsx:638–646`.
  - Etapa Preferências: `src/pages/FinanceSettings.tsx:648–660`.
  - Revisão: `src/pages/FinanceSettings.tsx:663–681`.

### Integrações e Serviços
- `financial_launchs` (Tipos de Lançamento): serviço `src/services/financialLaunchsService.ts`.
- `financial_settings` (Categorias/Documentos/Tipos): ver migração `supabase/migrations/20251114_create_financial_settings_table.sql`.
- Hooks seguros: `useSecureTenantQuery` (inclui `tenant_id` na queryKey e valida drifts).
- Guard de acesso: `useTenantAccessGuard()`.

## Banco de Dados

### Tabela: `financial_settings`
- Enum `financial_setting_type`: `EXPENSE_CATEGORY`, `DOCUMENT_TYPE`, `ENTRY_TYPE`.
- Colunas principais:
  - `id uuid` (PK)
  - `tenant_id uuid` (FK → `tenants`)
  - `type financial_setting_type`
  - `name text`
  - `code text` (opcional)
  - `is_active boolean`
  - `sort_order integer`
  - `metadata jsonb`
  - `created_by uuid`, `created_at`, `updated_at`
- RLS: todas operações condicionadas ao `current_setting('app.tenant_id')`.
- Migração: `supabase/migrations/20251114_create_financial_settings_table.sql`.

### Tabela: `financial_launchs`
- Armazena Tipos de Lançamento (configuração de operação: débito/crédito, geração de movimento bancário etc.).
- Serviço: `src/services/financialLaunchsService.ts`.

### Tabela: `financial_payables`
- Armazena contas a pagar com paginação e filtros.
- Colunas principais: `id`, `tenant_id`, `entry_number`, `description`, `gross_amount`, `net_amount`, `due_date`, `issue_date`, `status`, `payment_date`, `paid_amount`, `payment_method`, `category_id`, `document_id`, `supplier_id`, `supplier_name`, `repeat`, `metadata`, `created_at`, `updated_at`.
- Serviço: `src/services/financialPayablesService.ts`.
- RPC sequencial:
  - `next_des_payable_number(p_tenant_id)` — gera número atômico.
  - `peek_des_payable_number(p_tenant_id)` — pré-visualização sem reserva.

### Tabela: `finance_entries` (visão geral)
- Usada para relatórios e dashboards (resumo, fluxo de caixa, etc.).
- Serviço: `src/services/financeEntriesService.ts`.

## Contas a Pagar
- Página: `src/pages/ContasAPagar.tsx`.
- Segurança:
  - Guard de acesso: `useTenantAccessGuard()`.
  - Query segura: `useSecureTenantQuery` com validação de `tenant_id` contra retorno.
  - Realtime: canal `financial-payables-{tenant}` assinando mudanças em `public.financial_payables` com invalidation automático do cache.
- Filtros disponíveis:
  - `status`/`statuses`, `dateFrom/dateTo`, `issueFrom/issueTo`, `paymentFrom/paymentTo`, `minAmount/maxAmount`, `category`, `documentId`, `supplier`, `search`.
- Fluxo de criação (modal `CreatePayableModal`):
  - Preenche dados (valor, vencimento, emissão, número, categoria, documento, fornecedor, descrição, repetição, confirmado pago).
  - Salva via `createPayable()`.
  - Atualiza lista e paginação.
- Ações:
  - Marcar como pago (`markAsPaid`).
  - Edição completa (modal `EditPayableModal`).
  - Exclusão (`deletePayable`).
  - Exportação CSV.

## Segurança Multi-Tenant
- RLS ativo em tabelas (`financial_settings`, `financial_payables`, etc.).
- Contexto de tenant obrigatório antes de DML via RPC (`set_tenant_context_simple`).
- Query keys incluem `tenant_id` para isolamento de cache e invalidations.
- Eventos realtime filtrados por `tenant_id`.

## Padrões de Desenvolvimento
- Dev server: porta `8080` (`npm run dev -- --port 8080`).
- UI/UX: Shadcn/Radix + Tailwind, animações com Framer Motion.
- Performance: TanStack Query 5, invalidation granular, paginação.
- Qualidade: `npm run type-check`, `npm run lint`, `npm run build`.

## Referências Rápidas
- Configurações Financeiras: `src/pages/FinanceSettings.tsx`.
- Contas a Pagar: `src/pages/ContasAPagar.tsx`.
- Serviços:
  - `src/services/financialPayablesService.ts`
  - `src/services/financialLaunchsService.ts`
  - `src/services/financeEntriesService.ts`
- Migrations:
  - `supabase/migrations/20251114_create_financial_settings_table.sql`

## Observações
- Campos/validações podem ser expandidos conforme regras de negócio.
- Para qualquer alteração em schema, executar via migrações/CLI e revisar políticas RLS.

