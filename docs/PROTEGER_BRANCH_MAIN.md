# 🔒 Como Proteger a Branch MAIN no GitHub

## 📋 Visão Geral

Este guia explica como configurar **Branch Protection Rules** na branch `main` para evitar merges acidentais e garantir que todas as mudanças passem por revisão.

---

## 🎯 Objetivos da Proteção

- ✅ **Exigir Pull Request** antes de fazer merge na main
- ✅ **Exigir aprovação** de pelo menos 1 revisor
- ✅ **Bloquear push direto** na main
- ✅ **Exigir que status checks passem** antes do merge
- ✅ **Exigir que a branch esteja atualizada** antes do merge

---

## 🔧 Configuração Passo a Passo

### ⚠️ IMPORTANTE: Nova Interface de Rulesets

O GitHub agora usa **Rulesets** em vez de "Branch protection rules". Se você já criou um Ruleset mas vê o alerta "This ruleset not target any resources", siga os passos abaixo.

### Passo 1: Acessar Configurações do Repositório

1. Acesse seu repositório no GitHub: `https://github.com/albertobarcelos/revalya-oficial`
2. Clique em **Settings** (Configurações)
3. No menu lateral esquerdo, clique em **Rules** → **Rulesets**

### Passo 2: Adicionar Target Branch (CRÍTICO!)

Se você já criou o Ruleset "MAIN" mas vê o alerta amarelo:

1. **Clique no Ruleset "MAIN"** para editá-lo
2. Na seção **"Target branches"**, clique em **"Add target"**
3. Selecione **"Branch name"**
4. Digite: `main` (ou use o padrão `main` se aparecer)
5. Clique em **"Add"** ou **"Save"**

**Agora o ruleset será aplicado à branch `main`!**

### Passo 3: Configurar as Regras

Com o target branch configurado, configure as regras:

#### ✅ Configurações Recomendadas na Seção "Rules":

**1. Branch rules (já configurado):**
- ✅ **Restrict creations** - Já marcado ✅
- ✅ **Restrict updates** - Já marcado ✅
- ✅ **Restrict deletions** - Já marcado ✅
- ⚠️ **Require linear history** - Opcional (deixe desmarcado por enquanto)

**2. Pull request rules (adicione):**
- Clique em **"Add rule"** ou procure por **"Pull request rules"**
- ✅ **Require pull request before merging**
  - **Required approvals:** `1` (ou mais)
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ⚠️ **Require review from Code Owners** (opcional, se tiver CODEOWNERS)

**3. Status checks (adicione):**
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - Adicione status checks importantes (ex: workflows do GitHub Actions)

**4. Conversation resolution:**
- ✅ **Require conversation resolution before merging**

**5. Bypass list:**
- ⚠️ Opcional - Adicione usuários/teams que podem bypassar as regras (não recomendado para produção)

### Passo 4: Salvar Configuração

1. Role até o final da página
2. Clique em **"Save changes"** ou **"Update ruleset"**
3. Verifique se o alerta amarelo desapareceu

---

## 🎯 Passos Rápidos para Completar a Configuração

Baseado nas imagens que você compartilhou, você precisa:

1. ✅ **Ruleset criado** - "MAIN" ✅
2. ❌ **Target branch não configurado** - PRECISA ADICIONAR!

### Ação Imediata:

1. Na página do Ruleset "MAIN", vá para a seção **"Target branches"**
2. Clique em **"Add target"**
3. Selecione **"Branch name"**
4. Digite: `main`
5. Clique em **"Add"**

Isso vai fazer o alerta amarelo desaparecer e aplicar as regras à branch `main`!

---

## 📸 Exemplo de Configuração Completa

```
Branch name pattern: main

✅ Require a pull request before merging
   - Require approvals: 1
   - Dismiss stale approvals: ✅
   - Require review from Code Owners: ✅

✅ Require status checks to pass before merging
   - Require branches to be up to date: ✅
   - Status checks required:
     - Deploy Supabase - Production

✅ Require conversation resolution before merging

✅ Include administrators

❌ Allow force pushes
❌ Allow deletions
```

---

## 🔄 Como Funciona Após Configuração

### Antes (Sem Proteção):
```bash
# ❌ Isso funcionava (perigoso!)
git checkout main
git merge feature-branch
git push origin main
```

### Depois (Com Proteção):
```bash
# ✅ Agora você DEVE criar uma PR
git checkout -b feature-branch
# ... fazer mudanças ...
git push origin feature-branch
# Criar PR no GitHub → Aguardar aprovação → Fazer merge
```

---

## 🚨 O Que Acontece Se Tentar Push Direto?

Após configurar a proteção, se você tentar fazer push direto na main:

```bash
git push origin main
```

**Resultado:**
```
! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'origin'
```

**Mensagem no GitHub:**
- ❌ Push será rejeitado
- ✅ Você precisará criar uma PR

---

## 🔧 Configuração Avançada

### 1. Code Owners (Opcional mas Recomendado)

Crie um arquivo `.github/CODEOWNERS` na raiz do repositório:

```
# Code Owners
* @albertobarcelos

# Supabase
supabase/migrations/ @albertobarcelos
supabase/functions/ @albertobarcelos

# Workflows
.github/workflows/ @albertobarcelos
```

Isso garante que mudanças em áreas específicas precisem de aprovação do dono.

### 2. Status Checks Específicos

Você pode exigir que workflows específicos passem:

- `Deploy Supabase - Production`
- `Lint and Test`
- `Build`

### 3. Múltiplos Aprovadores

Para mudanças críticas, você pode exigir mais aprovações:
- **Require approvals:** `2` ou mais
- Útil para produção

---

## ⚠️ Reverter Merge Acidental na MAIN

Se você fez merge acidentalmente na main (como aconteceu), siga estes passos:

### Opção 1: Reverter via Git (Recomendado)

```bash
# 1. Identificar o commit de merge acidental
git log --oneline --merges -5

# 2. Reverter o commit
git checkout main
git pull origin main
git revert -m 1 <merge_commit_sha>

# 3. Push
git push origin main
```

### Opção 2: Reverter via GitHub UI

1. Acesse a PR que foi mergeada acidentalmente
2. Clique em **"Revert"** no final da página
3. Isso criará uma nova PR que reverte as mudanças
4. Revise e faça merge

### Opção 3: Mover para Develop

Se o merge deveria ter sido feito na `develop`:

```bash
# 1. Reverter o merge na main
git checkout main
git revert -m 1 <merge_commit_sha>
git push origin main

# 2. Fazer merge correto na develop
git checkout develop
git merge <branch_original>
git push origin develop
```

**Veja o guia completo:** [`docs/COMO_REVERTER_PR.md`](./COMO_REVERTER_PR.md)

---

## ✅ Checklist de Configuração

Após configurar a proteção, verifique:

- [ ] ✅ Tentar fazer push direto na main → Deve ser bloqueado
- [ ] ✅ Criar uma PR para main → Deve exigir aprovação
- [ ] ✅ Tentar fazer merge sem aprovação → Deve ser bloqueado
- [ ] ✅ Fazer merge após aprovação → Deve funcionar
- [ ] ✅ Verificar se status checks são exigidos

---

## 🧪 Testar a Proteção

### Teste 1: Push Direto (Deve Falhar)

```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin main
# ❌ Deve falhar com erro de branch protegida
```

### Teste 2: PR Sem Aprovação (Deve Bloquear Merge)

1. Criar uma PR para main
2. Tentar fazer merge sem aprovação
3. ❌ Deve mostrar mensagem exigindo aprovação

### Teste 3: PR Com Aprovação (Deve Funcionar)

1. Criar uma PR para main
2. Aprovar a PR
3. ✅ Deve permitir fazer merge

---

## 🔍 Verificar Configuração Atual

Para verificar se a proteção está ativa:

1. Acesse: **Settings** → **Branches**
2. Procure por regras de proteção para `main`
3. Verifique se as opções estão marcadas corretamente

Ou via GitHub CLI:

```bash
gh api repos/albertobarcelos/revalya-oficial/branches/main/protection
```

---

## 📚 Referências

- [GitHub: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub: Requiring Pull Request Reviews](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-pull-request-reviews-before-merging)
- [GitHub: CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

## 🎯 Resumo

| Ação | Antes (Sem Proteção) | Depois (Com Proteção) |
|------|---------------------|----------------------|
| Push direto na main | ✅ Permitido | ❌ Bloqueado |
| Merge sem PR | ✅ Permitido | ❌ Bloqueado |
| Merge sem aprovação | ✅ Permitido | ❌ Bloqueado |
| Merge com aprovação | ✅ Permitido | ✅ Permitido |

**Resultado:** A branch main está protegida! 🛡️

---

**Última atualização:** 2025-01-20

