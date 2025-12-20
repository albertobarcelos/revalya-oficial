# 🔒 Scripts de Branch Protection

## 📋 Scripts Disponíveis

### 1. `setup-branch-protection.ps1`

Script PowerShell para configurar Branch Protection Rules na branch `main` via GitHub API.

#### Pré-requisitos

1. **GitHub Personal Access Token** com permissões:
   - `repo` (Full control of private repositories)
   - Ou pelo menos `public_repo` se o repositório for público

#### Como Obter o Token

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token (classic)"**
3. Dê um nome (ex: "Branch Protection Setup")
4. Selecione o escopo: **`repo`** (ou `public_repo` para repositórios públicos)
5. Clique em **"Generate token"**
6. **Copie o token** (você só verá ele uma vez!)

#### Como Usar

```powershell
# Opção 1: Com parâmetros padrão (main, 1 aprovação)
.\scripts\setup-branch-protection.ps1 -GitHubToken "seu_token_aqui"

# Opção 2: Com parâmetros customizados
.\scripts\setup-branch-protection.ps1 `
    -GitHubToken "seu_token_aqui" `
    -Owner "albertobarcelos" `
    -Repo "revalya-oficial" `
    -Branch "main" `
    -RequiredApprovals 2
```

#### Parâmetros

| Parâmetro | Obrigatório | Padrão | Descrição |
|-----------|-------------|--------|-----------|
| `GitHubToken` | ✅ Sim | - | Token de acesso do GitHub |
| `Owner` | ❌ Não | `albertobarcelos` | Dono do repositório |
| `Repo` | ❌ Não | `revalya-oficial` | Nome do repositório |
| `Branch` | ❌ Não | `main` | Nome da branch a proteger |
| `RequiredApprovals` | ❌ Não | `1` | Número de aprovações necessárias |

#### Configurações Aplicadas

O script configura as seguintes regras:

- ✅ **Require pull request before merging**
  - Required approvals: `1` (ou o valor especificado)
  - Dismiss stale reviews: `true`
  
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date: `true`
  
- ✅ **Require conversation resolution before merging**

- ✅ **Include administrators** (aplica regras até para admins)

- ❌ **Allow force pushes**: `false`

- ❌ **Allow deletions**: `false`

#### Exemplo de Uso Completo

```powershell
# 1. Navegar para o diretório do projeto
cd D:\DESENVOLVIMENTO\revalya-oficial

# 2. Executar o script
.\scripts\setup-branch-protection.ps1 -GitHubToken "ghp_xxxxxxxxxxxxxxxxxxxx"

# 3. Verificar resultado
# O script mostrará se foi bem-sucedido ou não
```

#### Troubleshooting

**Erro: "Resource not accessible by integration"**
- O token não tem permissões suficientes
- Solução: Crie um novo token com permissão `repo`

**Erro: "Not Found"**
- O repositório ou branch não existe
- Solução: Verifique se o nome do repositório e branch estão corretos

**Erro: "Forbidden"**
- Você não tem permissão de admin no repositório
- Solução: Verifique suas permissões no repositório ou use um token de um admin

---

## 🔄 Alternativa: Configuração Manual

Se o script não funcionar, você pode configurar manualmente:

1. Acesse: https://github.com/albertobarcelos/revalya-oficial/settings/branches
2. Clique em **"Add rule"**
3. Configure conforme o guia: [`docs/PROTEGER_BRANCH_MAIN.md`](../docs/PROTEGER_BRANCH_MAIN.md)

---

## 📚 Referências

- [GitHub API: Branch Protection](https://docs.github.com/en/rest/branches/branch-protection)
- [GitHub: About Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Guia Completo: `docs/PROTEGER_BRANCH_MAIN.md`](../docs/PROTEGER_BRANCH_MAIN.md)

---

**Última atualização:** 2025-01-20

