# Configuração CI/CD Supabase - Revalya

## 📋 Visão Geral

Este documento descreve a configuração de CI/CD do Supabase usando GitHub Actions.

## 🏗️ Arquitetura de Ambientes

| Branch Git | Supabase | Descrição |
|------------|----------|-----------|
| `feature/*` | Local | Desenvolvimento de features |
| `develop` | Local (validação) | Integração e testes |
| `main` | `wyehpiutzvwplllumgdk` | **Produção** |

## 🔄 Fluxo de Trabalho

```
┌─────────────────┐
│  feature-branch │  ← Desenvolvimento local
└────────┬────────┘
         │ PR
         ▼
┌─────────────────┐
│     develop     │  ← Validação automática (CI)
│                 │     Testes locais
└────────┬────────┘
         │ PR
         ▼
┌─────────────────┐
│      main       │  ← Deploy automático
│  (production)   │     wyehpiutzvwplllumgdk
└─────────────────┘
```

## 🔐 Secrets Necessários no GitHub

Adicione os seguintes secrets em **Settings > Secrets and variables > Actions**:

### Secrets Obrigatórios

| Secret | Descrição | Como Obter |
|--------|-----------|------------|
| `SUPABASE_ACCESS_TOKEN` | Token de acesso pessoal | [Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `PRODUCTION_PROJECT_ID` | ID do projeto produção | `wyehpiutzvwplllumgdk` |
| `PRODUCTION_DB_PASSWORD` | Senha do banco produção | Dashboard > Settings > Database |

### Como Gerar o Access Token

1. Acesse [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Clique em **Generate new token**
3. Dê um nome (ex: "GitHub Actions")
4. Copie o token gerado (só aparece uma vez!)

### Como Obter a Senha do Banco

1. Acesse o Dashboard do Supabase
2. Vá em **Settings > Database**
3. Na seção "Connection string", você pode ver/resetar a senha

## 📁 Estrutura de Arquivos

```
.github/
└── workflows/
    ├── supabase-validate.yml   # Validação em develop/PRs
    └── supabase-production.yml # Deploy para main

supabase/
├── config.toml                 # Configuração do projeto
├── migrations/                 # Migrações do banco
└── functions/                  # Edge Functions
```

## 🚀 Workflows de CI/CD

### 1. `supabase-validate.yml`
- **Trigger:** Push em `develop` ou PRs para `main`
- **Ações:**
  - Inicia banco local
  - Gera tipos TypeScript
  - Valida migrações

### 2. `supabase-production.yml`
- **Trigger:** Push na branch `main`
- **Ações:**
  - Aplica migrações na Produção
  - Deploy de Edge Functions

## 📝 Comandos Úteis

### Desenvolvimento Local (requer Docker Desktop)

```bash
# Iniciar Supabase local
supabase start

# Criar nova migração
supabase migration new nome_da_migracao

# Gerar diff de alterações feitas no Studio local
supabase db diff -f nome_da_migracao

# Aplicar migrações localmente (reset)
supabase db reset

# Gerar tipos TypeScript
supabase gen types typescript --local > src/types/database.ts
```

### Deploy Manual para Produção

```bash
# Linkar ao projeto de produção
supabase link --project-ref wyehpiutzvwplllumgdk

# Aplicar migrações
supabase db push

# Deploy de Edge Functions
supabase functions deploy
```

### Listar Migrações

```bash
supabase migration list
```

## 🔗 URL do Ambiente de Produção

- **API:** `https://wyehpiutzvwplllumgdk.supabase.co`
- **Dashboard:** [Link Dashboard Produção](https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk)

## ⚠️ Notas Importantes

1. **Develop é apenas validação:** Push em `develop` valida as migrações, mas não aplica em nenhum ambiente.

2. **Main é produção:** Somente merge para `main` aplica as migrações na produção.

3. **Migrações são sequenciais:** Cada migração é aplicada na ordem dos timestamps.

4. **Rollback de migrações:** Para reverter, crie uma nova migração com as alterações inversas.

5. **Edge Functions:** São deployadas automaticamente junto com as migrações na produção.

## 🛠️ Troubleshooting

### Erro "permission denied"

Se ocorrer erro de permissão ao fazer `db push`, execute no SQL Editor:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

### Migrações fora de sync

```bash
# Verificar status
supabase migration list

# Puxar alterações do remoto
supabase db pull
```

---

**Última atualização:** Dezembro 2024
