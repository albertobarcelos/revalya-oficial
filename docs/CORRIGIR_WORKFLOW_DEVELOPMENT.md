# 🔧 Corrigir Workflow "Deploy Supabase - Development"

## 🐛 Problema Identificado

Na página de Actions do GitHub, o workflow **"Deploy Supabase - Development"** não está aparecendo na lista, mas o arquivo existe localmente.

## ✅ Workflows que DEVEM aparecer

Na lista de workflows do GitHub, você deve ver:

1. ✅ **"Deploy Supabase - Development"** - Para branch `develop`
2. ✅ **"Deploy Supabase - Production"** - Para branch `main` (já aparece ✅)
3. ✅ **"Daily Token Cleanup"** - Limpeza diária (já aparece ✅)
4. ✅ **"Deploy Manual"** - Deploy manual VPS (já aparece ✅)
5. ❌ **"Validar Migrações - Develop"** - Desabilitado (correto, era redundante)

## 🔍 Por que "Deploy Supabase - Development" não aparece?

### Possíveis causas:

1. **Workflow não foi commitado/pushado**
   - O arquivo existe localmente mas não está no repositório remoto
   - Solução: Fazer commit e push

2. **Workflow está desabilitado**
   - Pode ter sido desabilitado acidentalmente
   - Solução: Reabilitar no GitHub

3. **Nome do workflow diferente**
   - O GitHub pode estar mostrando um nome diferente
   - Solução: Verificar o nome exato no arquivo

4. **Workflow não está sendo detectado**
   - Problema de sintaxe YAML
   - Solução: Verificar sintaxe

## ✅ Solução Passo a Passo

### Passo 1: Verificar se o arquivo está no repositório

```powershell
# Verificar se o arquivo está commitado
git ls-files .github/workflows/supabase-development.yml

# Se não aparecer, o arquivo não está no repositório
```

### Passo 2: Fazer Commit e Push (se necessário)

```powershell
# Adicionar o arquivo
git add .github/workflows/supabase-development.yml

# Commit
git commit -m "fix: adicionar workflow Deploy Supabase - Development"

# Push
git push origin develop
```

### Passo 3: Verificar no GitHub

1. Acesse: https://github.com/albertobarcelos/revalya-oficial/actions
2. Procure por **"Deploy Supabase - Development"**
3. Se não aparecer, vá em **Settings** → **Actions** → **Workflows**
4. Procure pelo workflow

### Passo 4: Reabilitar se estiver desabilitado

1. Acesse: **Settings** → **Actions** → **Workflows**
2. Procure por **"Deploy Supabase - Development"**
3. Se estiver desabilitado, clique nele
4. Clique em **"Enable workflow"**

## 🎯 Workflow Correto

O workflow `supabase-development.yml` deve ter:

```yaml
name: Deploy Supabase - Development

on:
  push:
    branches:
      - develop
    paths:
      - 'supabase/**'
  workflow_dispatch:
```

**Nome que aparece no GitHub:** `Deploy Supabase - Development`

## 📋 Checklist

- [ ] Verificar se `supabase-development.yml` está commitado
- [ ] Fazer push se necessário
- [ ] Verificar se aparece na lista de workflows
- [ ] Reabilitar se estiver desabilitado
- [ ] Testar fazendo merge na `develop`
- [ ] Confirmar que o workflow correto é acionado

## 🔄 Sobre "Validar Migrações - Develop"

Vejo que **"Validar Migrações - Develop"** aparece **duas vezes** e ambas estão desabilitadas.

Isso está **correto** - esse workflow era redundante e foi desabilitado conforme a documentação em `docs/EXPLICACAO_WORKFLOW_VALIDACAO.md`.

Você pode:
- ✅ Deixar desabilitado (recomendado)
- ❌ Ou deletar completamente se quiser limpar

## 🆘 Se o Problema Persistir

1. **Verificar sintaxe YAML:**
   ```powershell
   # Validar sintaxe (se tiver yamllint ou similar)
   yamllint .github/workflows/supabase-development.yml
   ```

2. **Verificar se há erros no GitHub:**
   - Settings → Actions → Workflows
   - Veja se há mensagens de erro

3. **Criar workflow manualmente no GitHub:**
   - Actions → New workflow
   - Use o conteúdo do arquivo local

---

**Última atualização:** 2025-01-20

