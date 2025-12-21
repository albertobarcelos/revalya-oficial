# 🔧 Solução Completa: Remover Migrations do Git E do Banco

**Problema:** Quando você remove migrations do Git e faz merge, elas ainda ficam no histórico do banco de dados, causando inconsistências.

---

## 📋 Entendendo o Problema

1. **Git:** Remove a migration do repositório
2. **Banco de Dados:** A migration ainda está registrada em `supabase_migrations.schema_migrations`
3. **Resultado:** Inconsistência entre Git e banco

---

## ✅ Solução Completa (2 Passos)

### PASSO 1: Remover do Git

```bash
# Remover migrations de teste
git rm supabase/migrations/20251220202812_test_fluxo_develop_main.sql
git rm supabase/migrations/20251220224743_rollback_test_fluxo_develop_main.sql

# Commit
git commit -m "chore: remover migrations de teste"
git push origin develop
```

### PASSO 2: Remover do Histórico do Banco

**Execute no SQL Editor do Supabase (projeto develop E main):**

```sql
-- Remover migrations de teste do histórico
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20251220202812', '20251220224743');
```

---

## 🎯 Processo Completo para Merge Develop → Main

### 1. Na Branch Develop

```bash
# 1. Remover migrations do Git
git rm supabase/migrations/20251220202812_test_fluxo_develop_main.sql
git rm supabase/migrations/20251220224743_rollback_test_fluxo_develop_main.sql

# 2. Commit
git commit -m "chore: remover migrations de teste antes de merge para main"
git push origin develop
```

### 2. No Supabase (Projeto Develop)

Execute no SQL Editor:

```sql
-- Remover do histórico do banco develop
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20251220202812', '20251220224743');
```

### 3. Fazer Merge para Main

```bash
# Fazer merge
git checkout main
git merge develop
git push origin main
```

### 4. No Supabase (Projeto Main/Produção)

Execute no SQL Editor:

```sql
-- Remover do histórico do banco main (se existirem)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20251220202812', '20251220224743');
```

---

## 🔍 Script SQL Completo

Criei um script SQL (`remover_migrations_do_historico.sql`) que você pode executar em ambos os ambientes.

---

## ⚠️ Importante

- **Sempre remova do Git PRIMEIRO**
- **Depois remova do histórico do banco**
- **Execute em AMBOS os ambientes (develop E main)**
- **Faça backup antes de remover do histórico** (opcional, mas recomendado)

---

## 📝 Checklist

- [ ] Remover migrations do Git (develop)
- [ ] Commit e push para develop
- [ ] Remover do histórico do banco (develop)
- [ ] Fazer merge para main
- [ ] Remover do histórico do banco (main) - se necessário

---

**Última atualização:** 21/12/2025

