# 🔄 Fluxo de Sincronização: Development ↔ Main

## 📋 Visão Geral

Este documento explica como funciona o fluxo de sincronização entre a branch **`development`** e a branch **`main`** (produção) no Supabase.

---

## 🏗️ Arquitetura de Branches

### Branches Disponíveis:

- **`main`** (Produção)
  - Project ID: `wyehpiutzvwplllumgdk`
  - URL: `https://wyehpiutzvwplllumgdk.supabase.co`
  - **⚠️ Ambiente de produção - dados reais**

- **`development`** (Desenvolvimento)
  - Project ID: `sqkkktsstkcupldqtsgi`
  - URL: `https://sqkkktsstkcupldqtsgi.supabase.co`
  - **✅ Ambiente de desenvolvimento - dados de teste**

---

## 🔄 Fluxos de Sincronização

### 1️⃣ **Main → Development** (Copiar Produção para Dev)

**Quando usar:**
- Quando você quer que o `development` tenha o mesmo schema da produção
- Após mudanças importantes na produção que precisam ser testadas
- Para resetar o ambiente de desenvolvimento

**Como fazer:**

#### Opção A: Via Dashboard (Recomendado)

1. Acessar: **Supabase Dashboard** → **Branches** → `development`
2. Clicar em **"Reset branch"**
3. Confirmar a ação
4. ⚠️ **Atenção:** Isso aplica todas as migrations da `main` automaticamente

#### Opção B: Via CLI (Mais controle)

```powershell
# 1. Fazer backup da main
supabase db dump --db-url "postgresql://postgres.wyehpiutzvwplllumgdk:...@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" -f backup-main.sql

# 2. Resetar development branch (via dashboard ou CLI se disponível)
# Dashboard: Branches → development → Reset

# 3. Restaurar backup na development
psql "postgresql://postgres.sqkkktsstkcupldqtsgi:...@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" -f backup-main.sql
```

**⚠️ Importante:**
- Isso **sobrescreve** todos os dados da development
- Migrations são aplicadas automaticamente após reset
- Edge Functions precisam ser redeployadas manualmente

---

### 2️⃣ **Development → Main** (Enviar Mudanças para Produção)

**Quando usar:**
- Quando você testou algo na development e quer aplicar na produção
- Após validar migrations e Edge Functions

**Como fazer:**

#### Passo 1: Criar Migration na Development

```powershell
# Criar nova migration
supabase migration new nome_da_migration

# Editar o arquivo criado em: supabase/migrations/YYYYMMDDHHMMSS_nome_da_migration.sql
```

#### Passo 2: Aplicar Migration na Development

```powershell
# Linkar com development
supabase link --project-ref sqkkktsstkcupldqtsgi

# Aplicar migration
supabase db push
```

#### Passo 3: Testar na Development

- ✅ Validar que tudo funciona
- ✅ Testar Edge Functions
- ✅ Verificar RLS policies
- ✅ Testar queries importantes

#### Passo 4: Fazer Merge para Main

**Via Dashboard (Recomendado):**

1. Acessar: **Supabase Dashboard** → **Branches** → `development`
2. Clicar em **"Merge to production"**
3. Revisar as mudanças
4. Confirmar o merge

**Via CLI:**

```powershell
# Listar branches
supabase branches list --project-ref wyehpiutzvwplllumgdk

# Fazer merge (se disponível)
supabase branches merge <branch_id> --project-ref wyehpiutzvwplllumgdk
```

**⚠️ Importante:**
- O merge aplica **apenas migrations** da development para a main
- Edge Functions precisam ser deployadas manualmente na main
- Secrets precisam ser configurados manualmente na main

---

## 📦 Componentes Sincronizados

### ✅ **Sincronizados Automaticamente:**

1. **Schema do Banco de Dados**
   - Tabelas, views, functions, triggers
   - RLS policies
   - Constraints e índices
   - ✅ Via migrations

2. **Migrations**
   - Arquivos em `supabase/migrations/`
   - ✅ Aplicados automaticamente no merge

### ⚠️ **NÃO Sincronizados (Manual):**

1. **Dados (Data)**
   - Dados das tabelas não são copiados
   - Cada branch tem seus próprios dados
   - ⚠️ Precisa fazer backup/restore manual

2. **Edge Functions**
   - Precisam ser deployadas manualmente em cada branch
   - ⚠️ Deploy separado para development e main

3. **Secrets (Variáveis de Ambiente)**
   - Secrets são específicos de cada projeto
   - ⚠️ Precisam ser configurados manualmente em cada branch

4. **Storage (Arquivos)**
   - Buckets e arquivos não são sincronizados
   - ⚠️ Cada branch tem seu próprio storage

---

## 🔐 Secrets e Configurações

### Secrets que Precisam ser Configurados:

#### Development (`sqkkktsstkcupldqtsgi`):

```bash
# Evolution API
EVOLUTION_API_URL=https://evolution.nexsyn.com.br
EVOLUTION_API_KEY=d93ec17f36bc03867215097fe2d9045907a0ad43f91892936656144412d1fa9a

# Email (se configurado)
EMAIL_PROVIDER=...
EMAIL_API_KEY=...
EMAIL_FROM=...
```

#### Main (`wyehpiutzvwplllumgdk`):

```bash
# Mesmas variáveis, mas valores podem ser diferentes
# (ex: Evolution API pode ter instância diferente)
```

**Como configurar:**

```bash
# Via CLI
supabase secrets set EVOLUTION_API_URL=https://evolution.nexsyn.com.br --project-ref sqkkktsstkcupldqtsgi
supabase secrets set EVOLUTION_API_KEY=... --project-ref sqkkktsstkcupldqtsgi

# Ou via Dashboard: Settings → Edge Functions → Secrets
```

---

## 🚀 Edge Functions

### Deploy em Development:

```bash
# Linkar com development
supabase link --project-ref sqkkktsstkcupldqtsgi

# Deploy de uma função específica
supabase functions deploy nome-da-funcao

# Deploy de todas as funções
supabase functions deploy
```

### Deploy em Main:

```bash
# Linkar com main
supabase link --project-ref wyehpiutzvwplllumgdk

# Deploy de uma função específica
supabase functions deploy nome-da-funcao

# Deploy de todas as funções
supabase functions deploy
```

**⚠️ Importante:**
- Edge Functions **não são sincronizadas** automaticamente
- Sempre deployar em ambos os ambientes após mudanças

---

## 📝 Workflow Recomendado

### Desenvolvimento de Nova Feature (Com GitHub Actions):

```
1. Criar migration na development
   └─ supabase migration new feature_nova

2. Desenvolver e testar localmente
   └─ Testar migrations e Edge Functions

3. Commit e push para branch de feature
   └─ git add . && git commit -m "feat: nova feature"
   └─ git push origin feature/nova-feature

4. Criar PR e fazer merge para develop
   └─ ✅ Deploy automático no Supabase Development (via GitHub Actions)
   └─ Nada precisa ser feito manualmente!

5. Validar tudo funciona na development
   └─ Testar queries, RLS, Edge Functions

6. Fazer merge de develop para main
   └─ ✅ Deploy automático no Supabase Production (via GitHub Actions)
   └─ Apenas mudanças são aplicadas (não tudo)
   └─ Nada precisa ser feito manualmente!

7. Configurar Secrets na main (se necessário)
   └─ Dashboard ou CLI (apenas se adicionar novos secrets)
```

### Desenvolvimento de Nova Feature (Manual - sem GitHub Actions):

```
1. Criar migration na development
   └─ supabase migration new feature_nova

2. Desenvolver e testar na development
   └─ Aplicar migration: supabase db push
   └─ Deploy Edge Functions: supabase functions deploy

3. Validar tudo funciona
   └─ Testar queries, RLS, Edge Functions

4. Fazer merge para main
   └─ Dashboard: Branches → development → Merge to production

5. Deploy Edge Functions na main
   └─ supabase link --project-ref wyehpiutzvwplllumgdk
   └─ supabase functions deploy

6. Configurar Secrets na main (se necessário)
   └─ Dashboard ou CLI
```

### Sincronizar Schema da Main para Development:

```
1. Resetar development branch
   └─ Dashboard: Branches → development → Reset

2. Aguardar migrations serem aplicadas
   └─ Dashboard mostra progresso

3. Deploy Edge Functions na development
   └─ supabase link --project-ref sqkkktsstkcupldqtsgi
   └─ supabase functions deploy

4. Configurar Secrets na development (se necessário)
   └─ Dashboard ou CLI
```

---

## 🔍 Verificações Importantes

### Antes de Fazer Merge para Main:

- [ ] ✅ Migration testada na development
- [ ] ✅ Edge Functions funcionando na development
- [ ] ✅ RLS policies validadas
- [ ] ✅ Queries importantes testadas
- [ ] ✅ Sem erros no console/logs
- [ ] ✅ Backup da main feito (opcional, mas recomendado)

### Após Reset da Development:

- [ ] ✅ Migrations aplicadas corretamente
- [ ] ✅ Edge Functions deployadas
- [ ] ✅ Secrets configurados
- [ ] ✅ Schema validado (tabelas, functions, triggers)
- [ ] ✅ RLS policies ativas

---

## 📊 Comparação: Main vs Development

| Aspecto | Main | Development |
|---------|------|-------------|
| **Project ID** | `wyehpiutzvwplllumgdk` | `sqkkktsstkcupldqtsgi` |
| **URL** | `*.wyehpiutzvwplllumgdk.supabase.co` | `*.sqkkktsstkcupldqtsgi.supabase.co` |
| **Dados** | ✅ Produção (reais) | ✅ Teste (desenvolvimento) |
| **Schema** | ✅ Via migrations | ✅ Via migrations (merge) |
| **Edge Functions** | ⚠️ Deploy manual | ⚠️ Deploy manual |
| **Secrets** | ⚠️ Configuração manual | ⚠️ Configuração manual |
| **Storage** | ✅ Próprio | ✅ Próprio |
| **Backup** | ✅ Automático (PITR) | ⚠️ Manual (se necessário) |

---

## 🛠️ Comandos Úteis

### Verificar Status das Branches:

```bash
# Listar branches
supabase branches list --project-ref wyehpiutzvwplllumgdk

# Ver detalhes de uma branch
supabase branches get <branch_id> --project-ref wyehpiutzvwplllumgdk
```

### Verificar Migrations:

```bash
# Listar migrations aplicadas
supabase migrations list --project-ref sqkkktsstkcupldqtsgi

# Ver diferenças entre branches
# (comparar migrations manualmente)
```

### Verificar Edge Functions:

```bash
# Listar Edge Functions
supabase functions list --project-ref sqkkktsstkcupldqtsgi

# Ver código de uma função
supabase functions get nome-da-funcao --project-ref sqkkktsstkcupldqtsgi
```

### Verificar Secrets:

```bash
# Listar secrets (apenas nomes, não valores)
supabase secrets list --project-ref sqkkktsstkcupldqtsgi
```

---

## ⚠️ Limitações e Considerações

### 1. **Dados Não São Sincronizados**

- Cada branch tem seus próprios dados
- Para copiar dados, precisa fazer backup/restore manual
- ⚠️ Cuidado ao fazer reset - perde todos os dados da development

### 2. **Edge Functions Precisam Deploy Manual**

- Mudanças em Edge Functions não são sincronizadas automaticamente
- Sempre deployar em ambos os ambientes

### 3. **Secrets São Específicos por Projeto**

- Secrets precisam ser configurados manualmente em cada branch
- Valores podem ser diferentes (ex: API keys de sandbox vs produção)

### 4. **Storage Não É Sincronizado**

- Arquivos no Storage são específicos de cada branch
- Para copiar arquivos, precisa fazer upload manual ou usar API

### 5. **RLS Policies São Sincronizadas**

- RLS policies fazem parte do schema
- São aplicadas via migrations
- ✅ Sincronizadas automaticamente

---

## 🎯 Resumo do Fluxo

### **Main → Development:**
```
1. Reset development branch (Dashboard)
2. Migrations aplicadas automaticamente
3. Deploy Edge Functions manualmente
4. Configurar Secrets manualmente
```

### **Development → Main:**
```
1. Criar e testar migration na development
2. Merge para main (Dashboard)
3. Migrations aplicadas automaticamente
4. Deploy Edge Functions manualmente na main
5. Configurar Secrets manualmente na main (se necessário)
```

---

## 🤖 Automação com GitHub Actions

### Workflows Automáticos:

- **`.github/workflows/supabase-development.yml`**
  - Deploy automático quando há merge para `develop`
  - Aplica apenas migrations e Edge Functions que mudaram

- **`.github/workflows/supabase-production.yml`**
  - Deploy automático quando há merge de `develop` para `main`
  - Aplica apenas mudanças (não tudo)

### Configuração:

Veja o guia completo: [`docs/CONFIGURAR_GITHUB_ACTIONS.md`](./CONFIGURAR_GITHUB_ACTIONS.md)

**Benefícios:**
- ✅ Nada precisa ser feito manualmente
- ✅ Deploy apenas das mudanças (não tudo)
- ✅ Logs e histórico no GitHub
- ✅ Proteção opcional com aprovação manual para produção

---

## 📚 Referências

- [Supabase Branches Documentation](https://supabase.com/docs/guides/platform/branching)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/platform/migrating-within-supabase)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Última atualização:** 2025-01-19

