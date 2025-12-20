# ✅ Solução: Workflow "Deploy Supabase - Development" Faltando

## 🐛 Problema Identificado

O workflow **"Deploy Supabase - Development"** não aparece na lista do GitHub porque o arquivo `supabase-development.yml` **não está na branch `develop`**.

### Situação Atual:

- ✅ Arquivo existe localmente: `supabase-development.yml`
- ✅ Arquivo está commitado na branch: `feat_creation_supabase_develop`
- ❌ Arquivo **NÃO está** na branch `develop`
- ❌ Arquivo **NÃO está** na branch `main`

**Resultado:** O GitHub não detecta o workflow porque ele não está nas branches principais.

---

## ✅ Solução: Fazer Merge para `develop`

### Opção 1: Via GitHub (Recomendado)

1. **Criar Pull Request:**
   - Acesse: https://github.com/albertobarcelos/revalya-oficial
   - Crie uma PR de `feat_creation_supabase_develop` → `develop`
   - Revise as mudanças
   - Faça merge

2. **Após o merge:**
   - O workflow aparecerá na lista
   - Será acionado automaticamente em merges futuros na `develop`

### Opção 2: Via Git Local

```powershell
# 1. Mudar para develop
git checkout develop

# 2. Atualizar develop
git pull origin develop

# 3. Fazer merge da branch com o workflow
git merge feat_creation_supabase_develop

# 4. Push
git push origin develop
```

---

## 🎯 Após o Merge

Quando o arquivo estiver na branch `develop`:

1. ✅ O workflow aparecerá na lista: **"Deploy Supabase - Development"**
2. ✅ Será acionado automaticamente quando houver merge na `develop`
3. ✅ Fazer deploy no Supabase Development (Project ID: `sqkkktsstkcupldqtsgi`)

---

## 📋 Verificação

Após fazer o merge, verifique:

1. **No GitHub:**
   - Settings → Actions → Workflows
   - Deve aparecer: **"Deploy Supabase - Development"**

2. **Testar:**
   - Faça um merge na `develop`
   - Verifique em Actions se o workflow foi acionado
   - Deve aparecer: **"Deploy Supabase - Development"** (não `supabase-staging`)

---

## 🔍 Por que estava acionando `supabase-staging.yml`?

Se você estava vendo `supabase-staging.yml` sendo acionado, pode ser:

1. **Workflow antigo ainda ativo:**
   - O workflow pode ter sido removido do código mas ainda está ativo no GitHub
   - Solução: Desabilitar em Settings → Actions → Workflows

2. **Nome diferente:**
   - O GitHub pode estar mostrando um nome diferente
   - Verifique o nome real na página de Actions

---

## ✅ Checklist

- [ ] Fazer merge de `feat_creation_supabase_develop` → `develop`
- [ ] Verificar se `supabase-development.yml` está na branch `develop`
- [ ] Verificar se o workflow aparece na lista do GitHub
- [ ] Testar fazendo merge na `develop`
- [ ] Confirmar que aciona "Deploy Supabase - Development" (não staging)
- [ ] Desabilitar/deletar workflows antigos se necessário

---

**Última atualização:** 2025-01-20

