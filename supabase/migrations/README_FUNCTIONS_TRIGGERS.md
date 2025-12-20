# Migração: Functions, Triggers e Policies

## 📋 Descrição

Este arquivo (`functions_triggers_policies.sql`) contém todas as estruturas do banco de dados **exceto tabelas**, extraídas automaticamente dos arquivos de migração originais.

## 📦 O que está incluído

### ✅ Estruturas Extraídas

1. **Schemas**
   - `app_auth`
   - `crm`
   - `nexhunters`

2. **Extensions**
   - `pg_cron`
   - `pg_net`
   - `pgsodium`
   - `http`
   - `hypopg`
   - `index_advisor`
   - `pg_graphql`
   - `pg_stat_statements`
   - `pgcrypto`
   - `pgjwt`
   - `supabase_vault`
   - `unaccent`
   - `uuid-ossp`

3. **Types (ENUMs)**
   - `bank_operation_type`
   - `billing_period_status`
   - `billing_type_enum`
   - `dre_category`
   - `financial_operation_type`
   - `financial_setting_type`
   - `payable_status`
   - `service_billing_event_status`
   - `stock_movement_type`

4. **Functions (RPC)**
   - Todas as functions PostgreSQL (RPC functions)
   - Functions de segurança multi-tenant
   - Functions de negócio (billing, contracts, etc)
   - Functions de autenticação
   - Functions administrativas

5. **Triggers**
   - Triggers de auditoria
   - Triggers de atualização automática
   - Triggers de validação
   - Triggers de sincronização

6. **Policies (RLS)**
   - Todas as Row Level Security policies
   - Policies de acesso por tenant
   - Policies de segurança

7. **Views**
   - Views materializadas (se houver)
   - Views de consulta

8. **Sequences**
   - Sequences para auto-incremento

9. **Grants**
   - Permissões em functions
   - Permissões em sequences
   - Permissões em types
   - Permissões em schemas

10. **Roles e Configurações**
    - Configurações de roles
    - Timeouts e configurações de sessão

## ❌ O que NÃO está incluído

- **Tabelas** (já existem no banco da branch `develop`)
- **Dados** (INSERT statements)
- **Edge Functions** (estão em `supabase/functions/` e são deployadas separadamente)

## 🚀 Como usar

### Para ambiente de desenvolvimento

1. **Certifique-se de que as tabelas já existem** no banco de dados da branch `develop`

2. **Execute o arquivo de migração:**
   ```bash
   # Via Supabase CLI (recomendado)
   supabase db push
   
   # Ou via psql (se necessário)
   psql -h <host> -U <user> -d <database> -f supabase/migrations/20251220111401_functions_triggers_policies.sql
   ```

3. **Deploy das Edge Functions** (se necessário):
   ```bash
   supabase functions deploy <function-name>
   ```

## 📝 Notas Importantes

### ⚠️ Ordem de Execução

1. Primeiro: Tabelas (já existem no banco)
2. Segundo: Este arquivo (functions, triggers, policies)
3. Terceiro: Edge Functions (deploy separado)

### 🔐 Segurança Multi-Tenant

Todas as functions e policies de segurança multi-tenant estão incluídas, garantindo:
- Isolamento de dados por tenant
- Validação de acesso
- Contexto de tenant configurado

### 🔄 Triggers Desabilitados

Alguns triggers podem estar desabilitados intencionalmente. Verifique:
```sql
ALTER TABLE "public"."contract_billings" DISABLE TRIGGER "trg_after_insert_contract_billings";
```

## 📊 Estatísticas

- **Tamanho**: ~743 KB
- **Linhas**: ~19.808 linhas
- **Functions**: Centenas de functions
- **Triggers**: Dezenas de triggers
- **Policies**: Centenas de policies RLS

## 🛠️ Manutenção

Se precisar atualizar este arquivo:

1. Execute o script de extração:
   ```bash
   python extract_non_table_objects.py
   ```

2. O arquivo será regenerado em `supabase/migrations/functions_triggers_policies.sql`

## 📚 Referências

- Arquivos originais:
  - `supabase/migrations/schema.sql`
  - `supabase/migrations/data.sql`
  - `supabase/migrations/roles.sql`

- Script de extração:
  - `extract_non_table_objects.py`

