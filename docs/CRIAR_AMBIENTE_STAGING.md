# 🚀 Criar Ambiente de Staging (Dev) no Supabase

## 📋 Visão Geral

Este guia explica como criar e configurar um ambiente de desenvolvimento/staging do seu projeto Supabase online. O Supabase oferece **Development Branches** que são ambientes isolados perfeitos para testes antes de ir para produção.

## 💰 Informações de Custo

**Custo da Branch:** $0.01344 por hora (~$10/mês se rodar 24/7)

⚠️ **Importante:** Você precisa confirmar que entende este custo antes de criar a branch.

## 🔍 Situação Atual

Você já possui:
- **Produção:** `wyehpiutzvwplllumgdk` (projeto principal)
- **Branch "develop":** `salhcvfmblogfnuqdhve` (status: MIGRATIONS_FAILED - precisa ser corrigida)

## 🎯 Opções para Criar/Configurar Staging

### Opção 1: Corrigir a Branch "develop" Existente (Recomendado)

A branch "develop" já existe mas está com falha nas migrações. Vamos corrigi-la:

#### Passo 1: Verificar Status da Branch

```powershell
# Fazer login no Supabase CLI
supabase login

# Listar branches do projeto
supabase branches list --project-ref wyehpiutzvwplllumgdk
```

#### Passo 2: Linkar ao Projeto de Produção

```powershell
# Linkar ao projeto principal
supabase link --project-ref wyehpiutzvwplllumgdk
```

#### Passo 3: Verificar Migrações

```powershell
# Verificar status das migrações
supabase migration list
```

#### Passo 4: Aplicar Migrações na Branch "develop"

```powershell
# Linkar à branch develop
supabase branches link develop --project-ref salhcvfmblogfnuqdhve

# Aplicar todas as migrações
supabase db push
```

#### Passo 5: Verificar Status

```powershell
# Verificar se as migrações foram aplicadas
supabase migration list
```

### Opção 2: Criar uma Nova Branch de Staging

Se preferir criar uma nova branch do zero:

#### Passo 1: Confirmar Custo

O custo é **$0.01344 por hora**. Você precisa confirmar que entende este custo.

#### Passo 2: Criar a Branch

```powershell
# Fazer login
supabase login

# Linkar ao projeto principal
supabase link --project-ref wyehpiutzvwplllumgdk

# Criar nova branch (exemplo: "staging")
supabase branches create staging
```

**Nota:** O comando acima criará uma branch com todas as migrações do projeto principal aplicadas, mas **sem dados** (banco vazio).

#### Passo 3: Obter o Project Ref da Nova Branch

Após criar, você receberá um `project_ref` (ex: `abc123xyz`). Anote este valor.

#### Passo 4: Linkar à Nova Branch

```powershell
# Linkar à branch criada
supabase branches link staging --project-ref [PROJECT_REF_DA_BRANCH]
```

#### Passo 5: Aplicar Migrações (se necessário)

```powershell
# As migrações já devem estar aplicadas, mas verifique
supabase db push
```

## 🔧 Configuração do Ambiente de Staging

### 1. Obter Credenciais da Branch

Após criar/linkar a branch, você precisa das credenciais:

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione o projeto da branch (pelo `project_ref`)
3. Vá em **Settings > API**
4. Copie:
   - **Project URL** (ex: `https://salhcvfmblogfnuqdhve.supabase.co`)
   - **anon/public key**
   - **service_role key** (se necessário)

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.staging` ou configure no seu sistema de CI/CD:

```env
# Staging Environment
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
VITE_SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
```

### 3. Atualizar Configuração do Projeto

Se necessário, atualize `src/lib/supabase.ts` para suportar múltiplos ambientes:

```typescript
// Exemplo de configuração multi-ambiente
const getSupabaseUrl = () => {
  if (import.meta.env.MODE === 'staging') {
    return import.meta.env.VITE_SUPABASE_STAGING_URL
  }
  return import.meta.env.VITE_SUPABASE_URL
}
```

## 📝 Comandos Úteis para Gerenciar Staging

### Listar Todas as Branches

```powershell
supabase branches list --project-ref wyehpiutzvwplllumgdk
```

### Ver Detalhes de uma Branch

```powershell
supabase branches get [NOME_DA_BRANCH] --project-ref wyehpiutzvwplllumgdk
```

### Aplicar Migrações na Branch

```powershell
# Linkar à branch
supabase branches link [NOME_DA_BRANCH] --project-ref [PROJECT_REF]

# Aplicar migrações
supabase db push
```

### Deploy de Edge Functions na Branch

```powershell
# Deploy de todas as functions
supabase functions deploy

# Deploy de uma function específica
supabase functions deploy [NOME_DA_FUNCTION]
```

### Resetar a Branch (Cuidado!)

```powershell
# Resetar todas as migrações (volta ao estado inicial)
supabase branches reset [NOME_DA_BRANCH] --project-ref wyehpiutzvwplllumgdk
```

### Deletar uma Branch

```powershell
# Deletar branch (para parar custos)
supabase branches delete [NOME_DA_BRANCH] --project-ref wyehpiutzvwplllumgdk
```

## 🔄 Fluxo de Trabalho Recomendado

```
┌─────────────────┐
│  feature-branch │  ← Desenvolvimento local
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  staging branch │  ← Testes em ambiente real
│  (Supabase)     │     Deploy de migrações
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   production    │  ← Apenas após validação
│  (main branch)  │
└─────────────────┘
```

### Workflow Sugerido

1. **Desenvolvimento Local:**
   ```powershell
   supabase start  # Banco local
   # Desenvolver e testar
   ```

2. **Deploy para Staging:**
   ```powershell
   supabase branches link staging --project-ref [PROJECT_REF]
   supabase db push
   supabase functions deploy
   ```

3. **Validação em Staging:**
   - Testar funcionalidades
   - Validar migrações
   - Verificar Edge Functions

4. **Deploy para Produção:**
   ```powershell
   supabase link --project-ref wyehpiutzvwplllumgdk
   supabase db push
   supabase functions deploy
   ```

## 🗄️ Dados de Teste

**Importante:** As branches começam **vazias** (sem dados). Para popular com dados de teste:

### Opção 1: Seed SQL

Crie um arquivo `supabase/seed.sql`:

```sql
-- Exemplo de seed
INSERT INTO tenants (id, name, code) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Tenant Teste', 'TESTE');
```

Aplique o seed:

```powershell
supabase db reset  # Aplica migrações + seed localmente
# Para staging, você precisaria executar o SQL manualmente no dashboard
```

### Opção 2: Copiar Dados de Produção (Cuidado!)

⚠️ **Nunca copie dados de produção para staging sem anonimizar!**

Se precisar copiar estrutura:

```powershell
# Exportar schema (sem dados)
supabase db dump --schema-only -f schema.sql

# Aplicar em staging
# (via dashboard SQL Editor ou CLI)
```

## 🔗 URLs dos Ambientes

### Produção
- **API:** `https://wyehpiutzvwplllumgdk.supabase.co`
- **Dashboard:** [Link](https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk)

### Staging (Branch develop atual)
- **API:** `https://salhcvfmblogfnuqdhve.supabase.co`
- **Dashboard:** [Link](https://supabase.com/dashboard/project/salhcvfmblogfnuqdhve)

## ⚠️ Troubleshooting

### Erro: "MIGRATIONS_FAILED"

Se a branch está com falha nas migrações:

1. **Verificar logs:**
   ```powershell
   supabase branches get develop --project-ref wyehpiutzvwplllumgdk
   ```

2. **Tentar aplicar migrações novamente:**
   ```powershell
   supabase branches link develop --project-ref salhcvfmblogfnuqdhve
   supabase db push
   ```

3. **Se persistir, resetar a branch:**
   ```powershell
   supabase branches reset develop --project-ref wyehpiutzvwplllumgdk
   supabase db push
   ```

### Erro: "permission denied"

Execute no SQL Editor do dashboard da branch:

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

### Branch não aparece no Dashboard

1. Verifique se está logado na conta correta
2. Verifique se a branch ainda existe: `supabase branches list`
3. Acesse diretamente pela URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`

## 📚 Referências

- [Supabase Branching Docs](https://supabase.com/docs/guides/cli/local-development#branching)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Development Branches](https://supabase.com/docs/guides/platform/branching)

## ✅ Checklist de Configuração

- [ ] Fazer login no Supabase CLI
- [ ] Linkar ao projeto principal
- [ ] Criar/corrigir branch de staging
- [ ] Obter credenciais (URL, anon key, service_role key)
- [ ] Configurar variáveis de ambiente
- [ ] Aplicar migrações na branch
- [ ] Deploy de Edge Functions
- [ ] Testar conexão com staging
- [ ] Documentar URLs e credenciais (em local seguro)

---

**Última atualização:** Dezembro 2024
