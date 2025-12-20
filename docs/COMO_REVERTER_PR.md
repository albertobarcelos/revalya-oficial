# 🔄 Como Reverter uma PR Mergeada na Main

## 📋 Visão Geral

Este guia explica como reverter uma Pull Request que foi mergeada na branch `main`. Existem duas formas principais de fazer isso:

1. **`git revert`** (Recomendado) - Cria um novo commit que desfaz as mudanças
2. **Via GitHub UI** - Usando a interface do GitHub

---

## ✅ Método 1: Git Revert (Recomendado)

### Por que usar `git revert`?

- ✅ Preserva o histórico do Git
- ✅ Seguro para branches compartilhadas
- ✅ Não reescreve o histórico
- ✅ Pode ser revertido novamente se necessário

### Passo a Passo:

#### 1. Certifique-se de estar na branch `main` e atualizada:

```bash
# Mudar para main
git checkout main

# Atualizar com as últimas mudanças
git pull origin main
```

#### 2. Identificar o commit de merge da PR:

Você pode encontrar o commit de merge de duas formas:

**Opção A: Via GitHub**
- Acesse a PR no GitHub
- O commit de merge está no campo `merge_commit_sha`
- Exemplo: PR #59 tem merge commit `7e0405bb5a7b184887af204a009d7344110b05d1`

**Opção B: Via Git Log**
```bash
# Ver commits recentes
git log --oneline -10

# Ver commits de merge
git log --merges --oneline -10
```

#### 3. Reverter o commit de merge:

```bash
# Reverter o commit de merge específico
git revert -m 1 <merge_commit_sha>

# Exemplo para PR #59:
git revert -m 1 7e0405bb5a7b184887af204a009d7344110b05d1
```

**Nota:** O `-m 1` indica que queremos reverter para o primeiro parent (a branch main antes do merge).

#### 4. Resolver conflitos (se houver):

Se houver conflitos durante o revert:

```bash
# Ver arquivos com conflito
git status

# Resolver conflitos manualmente nos arquivos
# Depois, adicionar os arquivos resolvidos:
git add <arquivos_resolvidos>

# Continuar o revert:
git revert --continue
```

#### 5. Fazer push da reversão:

```bash
# Push para main
git push origin main
```

#### 6. Criar PR de reversão (Opcional, mas recomendado):

Se você quiser revisar antes de fazer push direto na main:

```bash
# Criar branch para reversão
git checkout -b revert-pr-59

# Fazer push da branch
git push origin revert-pr-59

# Depois criar PR no GitHub
```

---

## 🌐 Método 2: Via GitHub UI

### Passo a Passo:

1. **Acesse a PR no GitHub:**
   - Vá para: `https://github.com/albertobarcelos/revalya-oficial/pull/[NUMERO_PR]`
   - Exemplo: `https://github.com/albertobarcelos/revalya-oficial/pull/59`

2. **Clique em "Revert":**
   - No final da página da PR, há um botão "Revert"
   - Isso criará uma nova PR que reverte as mudanças

3. **Revisar e fazer merge:**
   - Revise as mudanças na nova PR
   - Faça merge quando estiver pronto

**Nota:** Este método cria automaticamente uma nova PR, então você pode revisar antes de fazer merge.

---

## 🔍 Exemplo Prático: Reverter PR #59

A PR #59 "Feat creation supabase develop" foi mergeada com o commit `7e0405bb5a7b184887af204a009d7344110b05d1`.

### Comandos para reverter:

```bash
# 1. Ir para main
git checkout main

# 2. Atualizar
git pull origin main

# 3. Reverter
git revert -m 1 7e0405bb5a7b184887af204a009d7344110b05d1

# 4. Push
git push origin main
```

---

## ⚠️ Considerações Importantes

### 1. **Múltiplas PRs Mergeadas:**

Se você quer reverter múltiplas PRs, reverta uma por vez na ordem inversa (mais recente primeiro):

```bash
# Reverter PR #59 (mais recente)
git revert -m 1 7e0405bb5a7b184887af204a009d7344110b05d1

# Depois reverter PR #58
git revert -m 1 <merge_commit_pr_58>
```

### 2. **Conflitos:**

Se houver conflitos durante o revert:
- Resolva manualmente
- Use `git revert --continue` após resolver
- Ou use `git revert --abort` para cancelar

### 3. **Reverter a Reversão:**

Se você precisar desfazer uma reversão:

```bash
# Reverter o commit de revert
git revert <commit_sha_do_revert>
```

### 4. **Supabase e Deploy:**

⚠️ **IMPORTANTE:** Se a PR incluiu mudanças no Supabase (migrations, Edge Functions), você precisará:

1. **Reverter migrations manualmente:**
   - Criar uma nova migration que desfaz as mudanças
   - Aplicar na branch de desenvolvimento primeiro
   - Depois fazer merge para main

2. **Reverter Edge Functions:**
   - Fazer deploy da versão anterior das funções
   - Ou remover as funções se foram adicionadas na PR

---

## 📝 Checklist de Reversão

Antes de reverter uma PR:

- [ ] ✅ Identificar o commit de merge correto
- [ ] ✅ Verificar se há dependências (outras PRs que dependem desta)
- [ ] ✅ Verificar mudanças no Supabase (migrations, Edge Functions)
- [ ] ✅ Fazer backup ou anotar mudanças importantes
- [ ] ✅ Comunicar com a equipe sobre a reversão
- [ ] ✅ Testar a reversão em ambiente de desenvolvimento primeiro (se possível)

Após reverter:

- [ ] ✅ Verificar que o código está funcionando
- [ ] ✅ Verificar se migrations precisam ser revertidas
- [ ] ✅ Verificar se Edge Functions precisam ser revertidas
- [ ] ✅ Atualizar documentação se necessário
- [ ] ✅ Notificar a equipe sobre a reversão

---

## 🆘 Troubleshooting

### Erro: "fatal: revert is not possible because you have uncommitted changes"

**Solução:** Faça commit ou stash das mudanças pendentes:

```bash
# Opção 1: Stash
git stash
git revert -m 1 <commit>
git stash pop

# Opção 2: Commit
git add .
git commit -m "WIP: mudanças temporárias"
git revert -m 1 <commit>
```

### Erro: "error: could not revert"

**Solução:** Pode haver conflitos. Resolva manualmente:

```bash
# Ver status
git status

# Resolver conflitos nos arquivos
# Depois:
git add <arquivos>
git revert --continue
```

### Reverter múltiplos commits de uma PR:

Se a PR teve vários commits, você pode reverter cada um:

```bash
# Ver commits da PR
git log --oneline <merge_commit>^..<merge_commit>

# Reverter cada commit individualmente (na ordem inversa)
git revert <commit_sha_1>
git revert <commit_sha_2>
```

---

## 📚 Referências

- [Git Revert Documentation](https://git-scm.com/docs/git-revert)
- [GitHub: Reverting a Pull Request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/reverting-a-pull-request)

---

**Última atualização:** 2025-01-20

