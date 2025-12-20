# 🔧 Solução: Botão "Run workflow" Não Aparece

## 🐛 Problema

O botão **"Run workflow"** aparece para **"Deploy Supabase - Production"** mas **NÃO aparece** para **"Deploy Supabase - Development"**.

## 🔍 Causa Provável

O GitHub Actions pode exigir que o workflow esteja na **branch padrão** (`main`) para aparecer na lista e mostrar o botão "Run workflow".

### Situação Atual:
- ✅ `supabase-development.yml` está na branch `develop`
- ❌ `supabase-development.yml` **NÃO está** na branch `main`
- ✅ `supabase-production.yml` está na branch `main` (por isso aparece)

## ✅ Soluções

### Solução 1: Fazer Merge para `main` (Recomendado)

Para que o workflow apareça e o botão funcione, faça merge do arquivo para `main`:

```powershell
# 1. Mudar para main
git checkout main

# 2. Atualizar main
git pull origin main

# 3. Fazer merge de develop (ou cherry-pick do arquivo)
git merge develop
# OU apenas o arquivo:
git checkout develop -- .github/workflows/supabase-development.yml

# 4. Commit e push
git add .github/workflows/supabase-development.yml
git commit -m "feat: adicionar workflow Deploy Supabase - Development"
git push origin main
```

### Solução 2: Verificar se Está Desabilitado

1. Acesse: **Settings** → **Actions** → **Workflows**
2. Procure por **"Deploy Supabase - Development"**
3. Se estiver desabilitado, clique em **"Enable workflow"**

### Solução 3: Verificar Permissões

1. Acesse: **Settings** → **Actions** → **General**
2. Verifique se **"Allow all actions and reusable workflows"** está habilitado
3. Verifique se há restrições de branch

### Solução 4: Aguardar Processamento

Às vezes o GitHub leva alguns minutos para processar workflows novos:
- Aguarde 5-10 minutos após fazer push
- Recarregue a página de Actions

## 🎯 Verificação

Após fazer merge para `main`:

1. ✅ Acesse: https://github.com/albertobarcelos/revalya-oficial/actions
2. ✅ Procure por **"Deploy Supabase - Development"**
3. ✅ Deve aparecer o botão **"Run workflow"** no canto superior direito
4. ✅ Clique no workflow → **"Run workflow"** → Selecione a branch `develop`

## 📝 Nota Importante

Mesmo que o workflow esteja em `main`, você pode:
- ✅ Executar manualmente escolhendo a branch `develop`
- ✅ O workflow continuará sendo acionado automaticamente em pushes na `develop`
- ✅ O botão "Run workflow" aparecerá na lista

## 🔄 Diferença entre Production e Development

| Aspecto | Production | Development |
|---------|-----------|------------|
| **Arquivo em `main`** | ✅ Sim | ❌ Não (precisa merge) |
| **Botão aparece** | ✅ Sim | ❌ Não (até fazer merge) |
| **Branch alvo** | `main` | `develop` |
| **Environment** | `production` | `Preview` |

---

**Última atualização:** 2025-12-20

