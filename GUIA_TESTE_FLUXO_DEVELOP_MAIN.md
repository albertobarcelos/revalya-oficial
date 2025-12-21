# 🧪 Guia de Teste: Fluxo Develop → Main

## 🎯 Objetivo

Testar o fluxo completo de migrations:
1. **Branch feature** → **Develop**
2. **Develop** → **Main**

---

## 📋 Migration Criada

**Arquivo**: `supabase/migrations/20251220202812_test_fluxo_develop_main.sql`

**O que faz:**
- ✅ Cria tabela `migration_audit_log` (apenas para teste)
- ✅ Não modifica tabelas existentes
- ✅ Fácil de reverter se necessário
- ✅ Útil para rastrear aplicação de migrations

---

## 🚀 Passo a Passo para Testar

### Passo 1: Criar Branch de Feature

```bash
# Criar nova branch
git checkout -b feature/test-migration-fluxo

# Verificar que migration foi criada
ls supabase/migrations/20251220202812_test_fluxo_develop_main.sql
```

### Passo 2: Testar Localmente (Opcional)

```bash
# Aplicar migration localmente para testar
supabase db reset

# OU apenas aplicar a nova migration
supabase migration up
```

**Verificar:**
```sql
-- No Supabase Dashboard (SQL Editor)
SELECT * FROM migration_audit_log;
```

### Passo 3: Commit e Push para Branch

```bash
# Adicionar migration
git add supabase/migrations/20251220202812_test_fluxo_develop_main.sql

# Commit
git commit -m "test: adicionar migration de teste para validar fluxo develop → main"

# Push
git push origin feature/test-migration-fluxo
```

### Passo 4: Criar Pull Request para Develop

1. Acesse: https://github.com/[seu-usuario]/revalya-oficial/pulls
2. Clique em **"New Pull Request"**
3. **Base**: `develop`
4. **Compare**: `feature/test-migration-fluxo`
5. **Título**: `test: Migration de teste para validar fluxo`
6. **Descrição**: 
   ```
   Migration de teste para validar fluxo completo:
   - Branch → Develop
   - Develop → Main
   
   Esta migration cria uma tabela de auditoria simples.
   ```
7. Clique em **"Create Pull Request"**

**O que esperar:**
- ✅ Se Automatic Branching estiver habilitado: Supabase cria branch preview
- ✅ Status check aparece no PR
- ✅ Migration é aplicada na branch preview (se habilitado)

### Passo 5: Fazer Merge para Develop

```bash
# Fazer merge do PR (via GitHub ou CLI)
git checkout develop
git pull origin develop
git merge feature/test-migration-fluxo
git push origin develop
```

**O que esperar:**
- ✅ Se "Deploy to production" estiver configurado para develop:
  - Supabase detecta mudança em `develop`
  - Aplica migration automaticamente na develop
  - Status aparece nos logs

**Verificar na Develop:**
```sql
-- No Supabase Dashboard da develop (ivaeoagtrvjsksebnqwr)
SELECT * FROM migration_audit_log;
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';
```

### Passo 6: Fazer Merge para Main

```bash
# Fazer merge do PR (via GitHub ou CLI)
git checkout main
git pull origin main
git merge develop
git push origin main
```

**O que esperar:**
- ✅ Supabase detecta mudança em `main`
- ✅ Aplica migration automaticamente na main
- ✅ Status aparece nos logs

**Verificar na Main:**
```sql
-- No Supabase Dashboard da main (wyehpiutzvwplllumgdk)
SELECT * FROM migration_audit_log;
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';
```

---

## ✅ Checklist de Validação

### Na Branch Feature
- [ ] Migration criada
- [ ] Commit feito
- [ ] Push realizado
- [ ] PR criado

### Na Develop
- [ ] PR mergeado para develop
- [ ] Migration aplicada automaticamente (se configurado)
- [ ] Tabela `migration_audit_log` existe
- [ ] Registro na tabela `supabase_migrations.schema_migrations`

### Na Main
- [ ] PR mergeado para main
- [ ] Migration aplicada automaticamente
- [ ] Tabela `migration_audit_log` existe
- [ ] Registro na tabela `supabase_migrations.schema_migrations`

---

## 🔍 Como Verificar se Funcionou

### 1. Verificar Logs do Supabase

**Develop:**
- Acesse: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr/logs/edge-logs
- Procure por logs de migration

**Main:**
- Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs/edge-logs
- Procure por logs de migration

### 2. Verificar Histórico de Migrations

```sql
-- Na develop
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';

-- Na main
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';
```

### 3. Verificar Tabela Criada

```sql
-- Verificar se tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'migration_audit_log';

-- Verificar dados
SELECT * FROM migration_audit_log;
```

---

## 🚨 Troubleshooting

### Migration não foi aplicada automaticamente

**Possíveis causas:**
1. "Deploy to production" não está habilitado
2. "Automatic branching" está criando branch preview ao invés de aplicar
3. Erro na migration

**Solução:**
1. Verificar configuração da integração no Dashboard
2. Verificar logs do Supabase
3. Aplicar manualmente se necessário:
   ```bash
   supabase link --project-ref [PROJECT_ID]
   supabase db push
   ```

### Erro na migration

**Solução:**
1. Verificar logs do Supabase
2. Corrigir migration
3. Criar nova migration para corrigir

---

## 🧹 Limpeza (Opcional)

Se quiser remover a migration de teste depois:

```sql
-- Remover tabela
DROP TABLE IF EXISTS public.migration_audit_log;

-- Remover do histórico (cuidado!)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';
```

**OU** criar migration de rollback:

```bash
supabase migration new rollback_test_fluxo
```

```sql
-- Conteúdo da migration de rollback
DROP TABLE IF EXISTS public.migration_audit_log;
```

---

## 📊 Resultado Esperado

### Se Tudo Funcionou:

✅ **Branch Feature**:
- Migration criada
- PR criado

✅ **Develop**:
- PR mergeado
- Migration aplicada automaticamente
- Tabela criada
- Registro no histórico

✅ **Main**:
- PR mergeado
- Migration aplicada automaticamente
- Tabela criada
- Registro no histórico

---

## 🎯 Próximos Passos Após Teste

1. **Validar configuração**: Se funcionou, configuração está correta
2. **Documentar**: Anotar qualquer ajuste necessário
3. **Limpar**: Remover migration de teste (opcional)
4. **Começar a desenvolver**: Agora pode criar migrations reais com confiança

---

**Boa sorte com o teste!** 🚀

Se encontrar algum problema, verifique os logs e a configuração da integração.

