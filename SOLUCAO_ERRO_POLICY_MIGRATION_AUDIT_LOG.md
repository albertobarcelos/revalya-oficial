# 🔧 Solução: Erro "policy already exists" - migration_audit_log

**Data:** 21/12/2025  
**Erro:** `policy "migration_audit_log_select_policy" for table "migration_audit_log" already exists (SQLSTATE 42710)`

---

## 📋 Problema

A migration `20251220202812_test_fluxo_develop_main.sql` está tentando criar uma policy que já existe no banco de dados:

```sql
CREATE POLICY "migration_audit_log_select_policy" 
  ON public.migration_audit_log
  FOR SELECT
  USING (auth.role() = 'authenticated')
```

Isso causa erro porque a policy já foi criada anteriormente (provavelmente em uma execução anterior da mesma migration ou em outra migration).

---

## 🔍 Causa

A migration não está usando o padrão **idempotente** que verifica se a policy existe antes de criar. Outras migrations do projeto seguem este padrão:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'migration_audit_log' 
    AND policyname = 'migration_audit_log_select_policy'
  ) THEN
    CREATE POLICY "migration_audit_log_select_policy" 
      ON public.migration_audit_log
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;
```

---

## ✅ Solução

### Opção 1: Corrigir a Migration no GitHub (Recomendado)

A migration `20251220202812_test_fluxo_develop_main.sql` precisa ser corrigida no repositório GitHub para usar o padrão idempotente:

1. **Acesse o arquivo no GitHub:**
   - Branch: `develop`
   - Caminho: `supabase/migrations/20251220202812_test_fluxo_develop_main.sql`

2. **Substitua todas as criações de policies por:**
   ```sql
   -- Policy: Apenas usuários autenticados podem ver
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'migration_audit_log' 
       AND policyname = 'migration_audit_log_select_policy'
     ) THEN
       CREATE POLICY "migration_audit_log_select_policy" 
         ON public.migration_audit_log
         FOR SELECT
         USING (auth.role() = 'authenticated');
     END IF;
   END $$;
   ```

3. **Repita para todas as outras policies:**
   - `migration_audit_log_insert_policy`
   - `migration_audit_log_update_policy`
   - `migration_audit_log_delete_policy`

### Opção 2: Usar DROP POLICY IF EXISTS (Alternativa)

Se preferir, pode usar `DROP POLICY IF EXISTS` antes de criar:

```sql
-- Remover policy se existir
DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;

-- Criar policy
CREATE POLICY "migration_audit_log_select_policy" 
  ON public.migration_audit_log
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

### Opção 3: Remover a Migration do Histórico

Se a migration `20251220202812_test_fluxo_develop_main.sql` foi apenas para testes e não é mais necessária:

1. **Marcar como reverted no Supabase:**
   ```bash
   supabase link --project-ref ivaeoagtrvjsksebnqwr
   supabase migration repair --status reverted 20251220202812
   ```

2. **Ou remover do histórico diretamente:**
   ```sql
   -- Executar no SQL Editor do Supabase
   DELETE FROM supabase_migrations.schema_migrations 
   WHERE version = '20251220202812';
   ```

---

## 🚀 Solução Imediata (Para Aplicar Agora)

Foi criada uma migration de correção (`20251220202811_fix_migration_audit_log_policies.sql`) que remove as policies antes da migration problemática ser executada. No entanto, como a migration problemática já foi parcialmente aplicada, você precisa:

1. **Remover as policies manualmente no Supabase:**
   ```sql
   -- Executar no SQL Editor do Supabase (projeto develop)
   DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;
   DROP POLICY IF EXISTS "migration_audit_log_insert_policy" ON public.migration_audit_log;
   DROP POLICY IF EXISTS "migration_audit_log_update_policy" ON public.migration_audit_log;
   DROP POLICY IF EXISTS "migration_audit_log_delete_policy" ON public.migration_audit_log;
   ```

2. **Marcar a migration problemática como reverted:**
   ```sql
   -- Executar no SQL Editor do Supabase
   DELETE FROM supabase_migrations.schema_migrations 
   WHERE version = '20251220202812';
   ```

3. **Corrigir a migration no GitHub** (usando Opção 1 acima)

4. **Fazer novo merge** - A migration corrigida será aplicada corretamente

---

## 📝 Padrão Recomendado para Futuras Migrations

**SEMPRE** use o padrão idempotente ao criar policies:

```sql
-- ✅ CORRETO: Verifica se existe antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'nome_tabela' 
    AND policyname = 'nome_policy'
  ) THEN
    CREATE POLICY "nome_policy" 
      ON public.nome_tabela
      FOR SELECT
      USING (condicao);
  END IF;
END $$;
```

**NUNCA** faça:

```sql
-- ❌ ERRADO: Cria sem verificar se existe
CREATE POLICY "nome_policy" 
  ON public.nome_tabela
  FOR SELECT
  USING (condicao);
```

---

## 🔄 Após a Correção

Após corrigir a migration no GitHub e remover as policies existentes, o merge deve funcionar corretamente.

---

## ⚠️ Prevenção

Para evitar este problema no futuro:

1. **Sempre use padrão idempotente** ao criar policies, triggers, funções, etc.
2. **Teste migrations localmente** antes de fazer merge
3. **Use `IF NOT EXISTS` ou verificação** para todos os objetos do banco

---

**Última atualização:** 21/12/2025

