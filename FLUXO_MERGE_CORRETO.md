# 🔄 Fluxo Correto de Merge

**Branch atual:** `update_develop`  
**Fluxo:** `update_develop` → `develop` → `main`

---

## 📋 Passo a Passo Completo

### PASSO 1: Verificar Estado Atual ✅

Você está em: `update_develop`  
Status: Limpo, pronto para merge

### PASSO 2: Aguardar Reaplicação no Supabase ⏳

**IMPORTANTE:** Antes de fazer merge, aguarde a reaplicação das migrations:

1. **Aguarde 2-5 minutos** após executar `zerar_historico_develop.sql`
2. **Verifique** no SQL Editor do Supabase (projeto develop):

```sql
SELECT COUNT(*) as total_migrations
FROM supabase_migrations.schema_migrations;
```

**Resultado esperado:** `21` migrations

3. **Confirme** que todas foram reaplicadas:

```sql
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

### PASSO 3: Fazer Merge `update_develop` → `develop` 🚀

**Só faça isso DEPOIS de verificar que as migrations foram reaplicadas!**

```bash
# 1. Certifique-se de que está em update_develop
git checkout update_develop

# 2. Verifique que está tudo commitado
git status

# 3. Faça merge para develop
git checkout develop
git merge update_develop

# 4. Push para develop
git push origin develop
```

### PASSO 4: Verificar Merge em Develop ✅

Após o merge:

1. **Verifique** que o merge foi bem-sucedido
2. **Aguarde** a sincronização do Supabase (se necessário)
3. **Confirme** que não há erros

### PASSO 5: Fazer Merge `develop` → `main` 🎯

**Só faça isso DEPOIS de verificar que develop está ok!**

```bash
# 1. Certifique-se de que está em develop
git checkout develop

# 2. Faça merge para main
git checkout main
git merge develop

# 3. Push para main
git push origin main
```

---

## ⚠️ IMPORTANTE: Ordem Correta

1. ✅ **PRIMEIRO:** Aguardar reaplicação das migrations (2-5 min)
2. ✅ **SEGUNDO:** Verificar que há 21 migrations no histórico
3. ✅ **TERCEIRO:** Fazer merge `update_develop` → `develop`
4. ✅ **QUARTO:** Verificar que develop está ok
5. ✅ **QUINTO:** Fazer merge `develop` → `main`

---

## 🎯 Resumo Rápido

```
update_develop (você está aqui)
    ↓
    ⏳ Aguardar reaplicação (2-5 min)
    ↓
    ✅ Verificar 21 migrations
    ↓
develop (merge update_develop)
    ↓
    ✅ Verificar que está ok
    ↓
main (merge develop)
```

---

## 📝 Checklist

- [ ] Histórico zerado no Supabase (develop)
- [ ] Aguardou 2-5 minutos para reaplicação
- [ ] Verificou que há 21 migrations no histórico
- [ ] Fez merge `update_develop` → `develop`
- [ ] Verificou que develop está ok
- [ ] Fez merge `develop` → `main`
- [ ] Verificou que main está ok

---

**Última atualização:** 21/12/2025

