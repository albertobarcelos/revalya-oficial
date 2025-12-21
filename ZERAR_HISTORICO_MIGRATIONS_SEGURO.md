# 🔄 Solução Segura: Zerar Histórico de Migrations

**Objetivo:** Sincronizar completamente develop e main, garantindo que ambas tenham exatamente as mesmas migrations.

**Estratégia:** Limpar o histórico do banco e permitir que o Supabase reaplique todas as migrations do Git.

---

## ⚠️ IMPORTANTE: Por que isso é seguro?

1. **Todas as migrations são idempotentes** - usam `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.
2. **Não afeta dados** - apenas remove o registro de que as migrations foram aplicadas
3. **Reaplicação automática** - Supabase reaplica todas as migrations do Git na ordem correta
4. **Reversível** - você pode fazer backup do histórico antes (opcional)

---

## 📋 Processo Completo (Passo a Passo)

### PASSO 1: Verificar Estado Atual

**Execute no SQL Editor do Supabase (projeto develop):**

```sql
-- Ver todas as migrations no histórico
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

**Anote quantas migrations existem** (para referência).

### PASSO 2: Fazer Backup (Opcional mas Recomendado)

**Execute no SQL Editor:**

```sql
-- Criar backup do histórico atual
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations_backup AS
SELECT * FROM supabase_migrations.schema_migrations;

-- Verificar backup
SELECT COUNT(*) as total_backup 
FROM supabase_migrations.schema_migrations_backup;
```

### PASSO 3: Limpar Histórico no Develop

**Execute no SQL Editor do Supabase (projeto develop):**

```sql
-- Limpar TODO o histórico de migrations
DELETE FROM supabase_migrations.schema_migrations;
```

**OU use o script completo:** `zerar_historico_develop.sql`

### PASSO 4: Verificar que está Limpo

```sql
-- Deve retornar 0
SELECT COUNT(*) 
FROM supabase_migrations.schema_migrations;
```

### PASSO 5: Fazer Push para Develop

```bash
# Certifique-se de que todas as migrations estão no Git
git status

# Se tudo estiver ok, faça push
git push origin develop
```

### PASSO 6: Aguardar Sincronização Automática

O Supabase detectará automaticamente que o histórico está vazio e reaplicará todas as migrations do Git na ordem correta.

**Tempo estimado:** 2-5 minutos

### PASSO 7: Verificar Resultado

**Execute no SQL Editor:**

```sql
-- Verificar migrations reaplicadas
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

**Deve mostrar todas as migrations do Git.**

---

## 🎯 Para Main (Depois do Merge)

Após fazer merge para main e garantir que está tudo ok:

1. **Limpar histórico do main também** (se necessário)
2. **Permitir reaplicação automática**

---

## ✅ Vantagens desta Abordagem

1. ✅ **Sincronização completa** - develop e main terão exatamente as mesmas migrations
2. ✅ **Sem inconsistências** - não há migrations "fantasma" no histórico
3. ✅ **Processo limpo** - começar do zero com tudo documentado
4. ✅ **Seguro** - todas as migrations são idempotentes
5. ✅ **Reversível** - backup disponível se necessário

---

## ⚠️ Cuidados

1. ⚠️ **Não faça isso em produção sem testar primeiro em develop**
2. ⚠️ **Certifique-se de que todas as migrations estão no Git**
3. ⚠️ **Aguarde a reaplicação completa antes de fazer merge**

---

## 📝 Checklist Final

- [ ] Backup do histórico (opcional)
- [ ] Limpar histórico do develop
- [ ] Verificar que está limpo (COUNT = 0)
- [ ] Fazer push para develop
- [ ] Aguardar sincronização automática
- [ ] Verificar migrations reaplicadas
- [ ] Fazer merge para main
- [ ] Verificar que main está ok

---

**Última atualização:** 21/12/2025

