# Extrato Bancário: Histórico, RPC e Ajustes de Saldo

## Visão Geral

- Objetivo: consolidar movimentações financeiras por conta bancária com segurança multi-tenant, extrato com saldo acumulado e ajuste automático de `current_balance`.
- Componentes principais:
  - Tabela `public.bank_operation_history`
  - Triggers em `public.financial_payables` para registrar débitos no histórico
  - RPC `public.get_bank_statement(...)` com cálculo de saldo acumulado
  - Triggers de ajuste automático de saldo em `public.bank_operation_history`
  - Página `src/pages/BankStatement.tsx` consumindo a RPC com validações de segurança

## Tabela bank_operation_history

- Campos: `id`, `tenant_id`, `bank_acount_id`, `operation_type` (`DEBIT`/`CREDIT`), `amount`, `operation_date`, `description`, `document_reference`, `category`, `created_by`, timestamps.
- RLS: filtragem por `tenant_id` (políticas alinhadas ao padrão multi-tenant).
- Índices: otimizados para buscas por `tenant_id`, `bank_acount_id`, `operation_date`.

## Triggers em financial_payables → histórico bancário

- `financial_payables_insert_to_history` → função `log_financial_payable_insert_to_history()`
  - Registra `DEBIT` em `bank_operation_history` ao criar uma conta a pagar.
- `financial_payables_payment_to_history` → função `log_financial_payable_payment_to_history()`
  - Registra `DEBIT` ao confirmar pagamento (quando aplicável).
- Remoção de trigger duplicado de saldo:
  - `trg_financial_payables_update_bank_balance` foi removido para evitar ajuste em duplicidade (era um `AFTER INSERT` subtraindo direto do `current_balance`).

## RPC get_bank_statement

- Assinatura:
  - `get_bank_statement(p_tenant_id uuid, p_bank_acount_id uuid NULL, p_start date NULL, p_end date NULL, p_operation_type bank_operation_type NULL)`
- Retorno: `id, bank_acount_id, operation_type, amount, operation_date, description, category, document_reference, running_balance`.
- Lógica:
  - Calcula saldo inicial com operações anteriores a `p_start`.
  - Soma progressiva: `CREDIT` (+) e `DEBIT` (-).
  - Ordenação: mais recente primeiro.
- Correções aplicadas:
  - Ambiguidade de colunas corrigida (`id`, `bank_acount_id`, `running_balance`) renomeando colunas internas (`row_*`, `acc_running_balance`).

## Ajuste automático de saldo (bank_operation_history)

- Funções:
  - `adjust_balance_on_history_insert()` → soma/subtrai ao inserir `CREDIT/DEBIT`.
  - `adjust_balance_on_history_update()` → trata mudança de valor, tipo ou conta (remove efeito antigo e aplica novo, ou aplica diferença na mesma conta).
  - `adjust_balance_on_history_delete()` → reverte efeito ao remover o registro.
- Triggers:
  - `bank_history_adjust_on_insert`, `bank_history_adjust_on_update`, `bank_history_adjust_on_delete`.
- Segurança: `SECURITY DEFINER` com `WHERE id = ... AND tenant_id = ...` para escopo multi-tenant.

## Frontend: BankStatement.tsx

- `src/pages/BankStatement.tsx`
  - Guarda de acesso: `useTenantAccessGuard()`.
  - Queries seguras: `useSecureTenantQuery` com chaves contendo `tenant_id`.
  - RPC `get_bank_statement` com parâmetros válidos e contexto do tenant:
    - Validação de UUID para `p_bank_acount_id`.
    - `p_operation_type` apenas `DEBIT`/`CREDIT` ou `null`.
    - `set_tenant_context_simple` antes da chamada.
  - Validação pós-query: filtra itens que não pertençam ao tenant.
  - UI: remoção de “Transferências”, ícones para Crédito/Débito, exportações CSV/PDF.

## Problemas encontrados e correções

- 400 (Bad Request) no RPC:
  - Causa: ambiguidade de colunas na função e/ou `p_operation_type` inválido.
  - Ações: correção de ambiguidade (`row_*`, `acc_running_balance`) e envio apenas de tipos válidos.
- Duplicidade de ajuste de saldo (-10000 para valor 5000):
  - Causa: trigger direto em `financial_payables` + ajuste via histórico.
  - Ação: remoção do trigger `trg_financial_payables_update_bank_balance`.
- Erro `setSupplier is not defined` no modal de contas a pagar:
  - Causa: chamada residual no `reset()` sem state correspondente.
  - Ação: remoção da chamada para garantir reset correto.

## Segurança Multi-Tenant (Guia)

- Padrões seguidos:
  - `useTenantAccessGuard` para acesso e auditoria.
  - `useSecureTenantQuery` com keys contendo `tenant_id`.
  - Validação dupla de dados (antes e depois).
  - RPC com `p_tenant_id` e contexto de tenant configurado.

## Validação e Testes

- Banco:
  - Triggers em `bank_operation_history` ativos.
  - Remoção confirmada do trigger direto em `financial_payables`.
  - Execução da função `get_bank_statement` retornando corretamente.
- Frontend:
  - `npm run type-check` OK.
  - Comportamento do extrato sem erro 400.

## ID do Projeto Supabase

- `wyehpiutzvwplllumgdk`

## Observações

- O histórico é a fonte de verdade para o ajuste de saldo. Qualquer nova feature (ex.: transferências) deve registrar no histórico e não ajustar saldo diretamente.