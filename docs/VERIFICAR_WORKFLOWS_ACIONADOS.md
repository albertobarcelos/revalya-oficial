# 🔍 Verificar Qual Workflow Está Sendo Acionado

## 📋 Situação Atual

Você mencionou que ao fazer merge na `develop` está acionando `supabase-staging.yml`, mas isso **NÃO está correto**.

## ✅ Workflows Corretos

### Workflows que DEVEM existir:

1. **`supabase-development.yml`** 
   - ✅ Deve acionar na branch `develop`
   - ✅ Deploy no Supabase Development
   - ✅ Environment: `Preview`

2. **`supabase-production.yml`**
   - ✅ Deve acionar na branch `main`
   - ✅ Deploy no Supabase Production
   - ✅ Environment: `production`

### Workflows que NÃO devem existir:

- ❌ `supabase-staging.yml` - Foi removido (duplicado)
- ❌ `supabase-validate.yml` - Foi removido (redundante)

---

## 🔍 Como Verificar Qual Workflow Está Sendo Acionado

### Passo 1: Verificar no GitHub Actions

1. Acesse: https://github.com/albertobarcelos/revalya-oficial/actions
2. Veja os workflows que foram executados recentemente
3. Verifique o nome do workflow que está rodando quando você faz merge na `develop`

### Passo 2: Verificar Workflows Ativos

1. Acesse: **Settings** → **Actions** → **Workflows**
2. Veja todos os workflows listados
3. Verifique se há algum workflow com nome `supabase-staging` ou similar

### Passo 3: Verificar Arquivos Locais

```powershell
# Listar todos os workflows
Get-ChildItem -Path .github\workflows -Filter "*.yml" | Select-Object Name
```

**Deve mostrar apenas:**
- ✅ `supabase-development.yml`
- ✅ `supabase-production.yml`
- ✅ `cleanup-cron.yml`
- ✅ `deploy.yml`

---

## 🐛 Problema: Workflow Antigo Ainda Ativo

Se você está vendo `supabase-staging.yml` sendo acionado, pode ser:

1. **Workflow ainda existe no GitHub mas não no código local**
   - O workflow pode ter sido removido do código mas ainda está ativo no GitHub
   - Solução: Desabilitar ou deletar o workflow no GitHub

2. **Nome diferente sendo mostrado**
   - O GitHub pode estar mostrando um nome diferente
   - Verifique o nome real do workflow na página de Actions

3. **Workflow criado pelo Supabase automaticamente**
   - O Supabase pode criar workflows automaticamente
   - Solução: Desabilitar no dashboard do Supabase

---

## ✅ Solução: Desabilitar Workflow Antigo

### Opção 1: Via GitHub UI

1. Acesse: **Settings** → **Actions** → **Workflows**
2. Procure por `supabase-staging` ou qualquer workflow com nome similar
3. Clique no workflow
4. Clique em **"..."** (três pontos) → **"Disable workflow"**

### Opção 2: Verificar se Existe no Código

```powershell
# Procurar por referências a "staging"
Get-ChildItem -Path .github\workflows -Recurse | Select-String -Pattern "staging" -CaseSensitive:$false
```

Se encontrar algo, remova ou renomeie.

---

## 🎯 Workflow Correto para `develop`

Quando você faz merge na branch `develop`, o workflow que **DEVE** ser acionado é:

**`supabase-development.yml`**

### Configuração Esperada:

```yaml
name: Deploy Supabase - Development

on:
  push:
    branches:
      - develop  # ✅ Deve acionar na develop
    paths:
      - 'supabase/**'  # ✅ Apenas se houver mudanças em supabase/
```

### O que ele faz:

1. ✅ Detecta mudanças em `supabase/migrations/` → Aplica migrations
2. ✅ Detecta mudanças em `supabase/functions/` → Deploy Edge Functions
3. ✅ Deploy no Supabase Development (Project ID: `sqkkktsstkcupldqtsgi`)
4. ✅ Usa environment `Preview`

---

## 🔄 Comparação: Development vs Staging

| Aspecto | Development (Correto) | Staging (Incorreto) |
|---------|----------------------|---------------------|
| **Workflow** | `supabase-development.yml` | `supabase-staging.yml` ❌ |
| **Branch** | `develop` | `develop` ou `staging` |
| **Project ID** | `sqkkktsstkcupldqtsgi` | ? (não deveria existir) |
| **Environment** | `Preview` | ? |
| **Status** | ✅ Deve estar ativo | ❌ Deve ser removido |

---

## 📝 Checklist de Verificação

- [ ] Verificar se `supabase-development.yml` existe e está correto
- [ ] Verificar se `supabase-staging.yml` ainda existe (não deveria)
- [ ] Verificar qual workflow está sendo acionado no GitHub Actions
- [ ] Se `supabase-staging.yml` existir, desabilitá-lo
- [ ] Confirmar que `supabase-development.yml` está acionando corretamente

---

## 🆘 Se o Problema Persistir

1. **Verificar logs do workflow:**
   - Acesse: **Actions** → Clique no workflow executado
   - Veja qual workflow realmente foi acionado
   - Verifique o nome exato

2. **Verificar triggers:**
   - Veja se há múltiplos workflows com o mesmo trigger
   - Desabilite os workflows duplicados

3. **Limpar workflows antigos:**
   - Settings → Actions → Workflows
   - Desabilite ou delete workflows não utilizados

---

## 📚 Referências

- [Guia de Configuração: `docs/CONFIGURAR_GITHUB_ACTIONS.md`](./CONFIGURAR_GITHUB_ACTIONS.md)
- [Correção de Workflows: `docs/CORRECAO_WORKFLOWS.md`](./CORRECAO_WORKFLOWS.md)

---

**Última atualização:** 2025-01-20

