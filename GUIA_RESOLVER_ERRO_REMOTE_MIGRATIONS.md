# 🔧 Guia: Resolver Erro "Remote migration versions not found"

**Data:** 21/12/2025  
**Erro:** `Remote migration versions not found in local migrations directory`

---

## 📋 O Problema

O Supabase está detectando migrations no banco de dados `develop` que não existem no repositório Git. Isso acontece quando:

1. Migrations foram aplicadas manualmente no banco
2. Migrations foram removidas do Git mas ainda estão no histórico do banco
3. Há inconsistência entre o histórico do banco e o repositório Git

---

## ✅ Solução Passo a Passo

### PASSO 1: Executar Script SQL no Supabase

1. **Acesse o Supabase Dashboard:**
   - Projeto: `revalya` (develop)
   - Vá em **SQL Editor**

2. **Execute o script `limpar_historico_migrations_develop.sql`:**
   - Copie o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run** ou pressione `Ctrl+Enter`

3. **Verifique o resultado:**
   - O script mostrará quais migrations foram removidas
   - Deve aparecer: `✅ SUCESSO: Todas as migrations foram removidas do histórico.`

### PASSO 2: Verificar Migrations no Git

Certifique-se de que **TODAS** as migrations abaixo estão no repositório Git (branch `develop`):

```
✅ 20240101000000_initial_schema.sql
✅ 20250127_simplify_avatar_system.sql
✅ 20251125_120000_add_bank_history_balance_adjust_triggers.sql
✅ 20251126_120000_add_payables_triggers_bank_history.sql
✅ 20251127_120000_create_bank_operation_history.sql
✅ 20251128_120000_create_get_bank_statement_rpc.sql
✅ 20251212_120000_allow_public_read_tenant_invites_by_token.sql
✅ 20251213_120000_remove_tenant_invites_updated_at_trigger.sql
✅ 20251213120001_add_api_key_encryption.sql
✅ 20251213120002_update_functions_to_use_vault.sql
✅ 20251214_120000_add_focusnfe_integration.sql
✅ 20251215161709_update_default_templates_tags.sql
✅ 20251220111401_functions_triggers_policies.sql
✅ 20251220202811_fix_migration_audit_log_policies.sql (opcional - pode remover)
✅ 20251220202812_test_fluxo_develop_main.sql (CORRIGIDA - idempotente)
✅ 20251221022558_fix_tenant_users_foreign_keys_develop.sql
✅ 20251221023114_sync_all_foreign_keys_from_main.sql
✅ 20251221024204_create_invites_table.sql
✅ 20251221024205_fix_create_reseller_with_invite_permission_check.sql
✅ 20251221024436_create_invites_table.sql
✅ 20251221025023_sync_profiles_table_and_data_from_main.sql
✅ 20251221025309_fix_customers_foreign_keys_develop.sql
✅ 20251221025400_remove_migration_audit_log_table.sql
```

### PASSO 3: Fazer Commit e Push

```bash
# Verificar status
git status

# Adicionar todas as migrations
git add supabase/migrations/*.sql

# Commit
git commit -m "fix: corrigir migration 20251220202812 e adicionar migrations faltantes"

# Push para develop
git push origin develop
```

### PASSO 4: Aguardar Sincronização

Após o push:

1. O Supabase detectará automaticamente as migrations no Git
2. A integração nativa aplicará todas as migrations na ordem correta
3. O merge deve funcionar sem erros

---

## 🔍 Diagnóstico (Se o Problema Persistir)

Se após executar o script o erro continuar, execute o script `diagnosticar_migrations_faltantes.sql` para identificar exatamente quais migrations estão causando problema.

---

## ⚠️ Observações Importantes

1. **O script NÃO afeta dados ou estrutura do banco** - apenas remove o histórico de migrations
2. **Todas as migrations serão reaplicadas** - mas como são idempotentes, não causarão problemas
3. **Certifique-se de que todas as migrations estão no Git** antes de executar o script
4. **A migration `20251220202812` já está corrigida** - usa padrão idempotente

---

## 📝 Checklist Final

- [ ] Executei o script `limpar_historico_migrations_develop.sql` no Supabase
- [ ] Verifiquei que todas as migrations estão no Git
- [ ] Fiz commit e push das migrations para `develop`
- [ ] Aguardei a sincronização do Supabase
- [ ] O merge funcionou sem erros

---

**Última atualização:** 21/12/2025

