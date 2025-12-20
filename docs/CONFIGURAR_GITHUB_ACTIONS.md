# ⚙️ Configurar GitHub Actions para Deploy Automático

## 📋 Visão Geral

Este documento explica como configurar os workflows do GitHub Actions para fazer deploy automático no Supabase quando há merges nas branches.

---

## 🔄 Fluxo Automatizado

### 1️⃣ **Merge para `develop`** → Deploy Automático em Development

Quando você faz merge de uma branch terceira para `develop`:
- ✅ Deploy automático no Supabase Development
- ✅ Aplica apenas migrations que mudaram
- ✅ Deploy apenas Edge Functions que mudaram
- ✅ Nada precisa ser feito manualmente

### 2️⃣ **Merge de `develop` para `main`** → Deploy Automático em Production

Quando você faz merge de `develop` para `main`:
- ✅ Deploy automático no Supabase Production
- ✅ Aplica apenas migrations que mudaram desde `develop`
- ✅ Deploy apenas Edge Functions que mudaram desde `develop`
- ✅ Apenas as mudanças são aplicadas (não tudo)

---

## 🔐 Configurar Secrets no GitHub

### Passo 1: Obter Access Token do Supabase

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **"Generate new token"**
3. Dê um nome (ex: "GitHub Actions")
4. Copie o token gerado

### Passo 2: Adicionar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**
4. Adicione os seguintes secrets:

#### Secrets Obrigatórios:

| Nome do Secret | Valor | Descrição |
|----------------|-------|-----------|
| `SUPABASE_ACCESS_TOKEN` | Token do Supabase | Token de acesso do Supabase (obtido no passo 1) |
| `DEVELOPMENT_PROJECT_ID` | `sqkkktsstkcupldqtsgi` | Project ID da branch development |
| `PRODUCTION_PROJECT_ID` | `wyehpiutzvwplllumgdk` | Project ID da branch main (produção) |

---

## 🎯 Configurar Environments (Opcional mas Recomendado)

Para adicionar proteção extra na produção:

### Passo 1: Criar Environment "production"

1. Acesse: **Settings** → **Environments**
2. Clique em **"New environment"**
3. Nome: `production`
4. (Opcional) Adicione **"Required reviewers"** para aprovação manual antes do deploy

### Passo 2: Criar Environment "Preview" (Development)

1. Clique em **"New environment"** novamente
2. Nome: `Preview` (ou `development` - o GitHub pode criar automaticamente como "Preview")
3. Não precisa de aprovação (deploy automático)
4. ⚠️ **Nota:** O GitHub pode criar automaticamente como "Preview" quando você usa `environment: Preview` no workflow

---

## 📁 Estrutura dos Workflows

### `.github/workflows/supabase-development.yml`

- **Trigger:** Push para `develop` ou `workflow_dispatch`
- **Ação:** Deploy automático no Supabase Development
- **Environment:** `Preview` (ou `development`)
- **Detecta:** Apenas mudanças em `supabase/**`

### `.github/workflows/supabase-production.yml`

- **Trigger:** Push para `main` ou `workflow_dispatch`
- **Ação:** Deploy automático no Supabase Production
- **Detecta:** Apenas mudanças em `supabase/**`
- **Proteção:** Environment `production` (pode requerer aprovação)

---

## 🔍 Como Funciona a Detecção de Mudanças

### Para Development:

```yaml
# Detecta mudanças comparando com commit anterior
git diff --name-only ${{ github.event.before }} ${{ github.sha }}
```

- Se houver mudanças em `supabase/migrations/` → Aplica migrations
- Se houver mudanças em `supabase/functions/` → Deploy Edge Functions
- Se não houver mudanças → Nada é feito

### Para Production:

```yaml
# Detecta apenas mudanças que vieram de develop
git diff --name-only ${{ github.event.before }} ${{ github.sha }}
```

- Aplica apenas migrations que mudaram desde o último commit em `main`
- Deploy apenas Edge Functions que mudaram desde o último commit em `main`
- **Não aplica tudo**, apenas as mudanças

---

## ✅ Verificar se Está Funcionando

### 1. Fazer Merge para `develop`

1. Criar uma branch de feature
2. Fazer mudanças em `supabase/migrations/` ou `supabase/functions/`
3. Fazer merge para `develop`
4. Verificar: **Actions** → Deve aparecer workflow "Deploy Supabase - Development"
5. Verificar logs para confirmar deploy

### 2. Fazer Merge de `develop` para `main`

1. Fazer merge de `develop` para `main`
2. Verificar: **Actions** → Deve aparecer workflow "Deploy Supabase - Production"
3. Se configurou aprovação: Aprovar o deploy
4. Verificar logs para confirmar deploy

---

## 🐛 Troubleshooting

### Erro: "SUPABASE_ACCESS_TOKEN not found"

**Solução:** Adicione o secret `SUPABASE_ACCESS_TOKEN` no GitHub

### Erro: "Failed to link project"

**Solução:** Verifique se os Project IDs estão corretos:
- `DEVELOPMENT_PROJECT_ID` = `sqkkktsstkcupldqtsgi`
- `PRODUCTION_PROJECT_ID` = `wyehpiutzvwplllumgdk`

### Erro: "No migrations to apply"

**Causa:** Não há migrations novas ou já foram aplicadas
**Solução:** Isso é normal se não houver mudanças

### Deploy está aplicando tudo, não apenas mudanças

**Causa:** O `github.event.before` pode estar vazio em alguns casos
**Solução:** O workflow tenta detectar mudanças, mas em caso de dúvida, aplica tudo (seguro)

---

## 📝 Exemplo de Uso

### Cenário 1: Nova Feature em Development

```bash
# 1. Criar branch de feature
git checkout -b feature/nova-funcionalidade

# 2. Criar migration
supabase migration new adicionar_nova_tabela

# 3. Editar migration e criar Edge Function
# ... fazer mudanças ...

# 4. Commit e push
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/nova-funcionalidade

# 5. Criar PR e fazer merge para develop
# ✅ Deploy automático acontece no Supabase Development
```

### Cenário 2: Deploy para Produção

```bash
# 1. Fazer merge de develop para main
git checkout main
git merge develop
git push origin main

# ✅ Deploy automático acontece no Supabase Production
# ⚠️ Se configurou aprovação, precisa aprovar no GitHub
```

---

## 🔒 Segurança

### Boas Práticas:

1. ✅ **Nunca commite secrets** no código
2. ✅ Use **GitHub Secrets** para tokens e senhas
3. ✅ Configure **aprovação manual** para produção (opcional mas recomendado)
4. ✅ Use **environments** para separar dev/prod
5. ✅ Revise os logs após cada deploy

### Secrets que NUNCA devem estar no código:

- ❌ `SUPABASE_ACCESS_TOKEN`
- ❌ `SUPABASE_DB_PASSWORD`
- ❌ Chaves de API
- ❌ Tokens de autenticação

---

## 📊 Monitoramento

### Verificar Status dos Deploys:

1. Acesse: **Actions** no GitHub
2. Veja os workflows executados
3. Clique em um workflow para ver logs detalhados
4. Verifique se houve erros

### Verificar no Supabase:

1. **Development:** https://supabase.com/dashboard/project/sqkkktsstkcupldqtsgi
2. **Production:** https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk

---

## 🎯 Resumo

| Ação | Branch | Deploy Automático |
|------|--------|-------------------|
| Merge para `develop` | `develop` | ✅ Supabase Development |
| Merge de `develop` para `main` | `main` | ✅ Supabase Production |

**Resultado:** Nada precisa ser feito manualmente! 🎉

---

**Última atualização:** 2025-01-19

