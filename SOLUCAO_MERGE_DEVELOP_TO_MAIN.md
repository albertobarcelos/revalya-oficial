# 🔧 Solução: Merge Develop → Main Não Aplica Atualizações

## 📚 Baseado na Documentação Oficial

Referência: [Supabase GitHub Integration](https://supabase.com/docs/guides/deployment/branching/github-integration)

---

## 🐛 Problema Identificado

**Sintoma:**
- ❌ Ao fazer merge de `develop` para `main`, as migrations não são aplicadas
- ❌ Edge Functions não são deployadas
- ❌ Erro: "Remote migration versions not found in local migrations directory"

**Configuração Atual (da imagem):**
- ✅ **Deploy to production**: Habilitado
- ✅ **Production branch name**: `main`
- ⚠️ **Supabase directory**: `./supabase` (pode estar causando problema)
- ❌ **Automatic branching**: Desabilitado (OK)

---

## ✅ Solução Passo a Passo

### 1. Corrigir "Supabase directory"

**Problema:** O valor `./supabase` pode não estar sendo interpretado corretamente.

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Clique na integração GitHub
3. **Altere "Supabase directory"** de `./supabase` para `supabase` (sem o `./`)
4. Clique em **"Save changes"**

> **Nota da Documentação:**
> O campo "Supabase directory" deve conter o **caminho relativo** ao diretório `supabase` a partir da raiz do repositório. Se suas migrations estão em `supabase/migrations/`, use apenas `supabase`.

### 2. Verificar Estrutura do Repositório

A documentação do Supabase espera esta estrutura:

```
revalya-oficial/
├── supabase/
│   ├── migrations/
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20251220202812_test_fluxo_develop_main.sql
│   │   └── ...
│   ├── functions/
│   │   └── ...
│   └── config.toml
└── ...
```

**Verificar:**
```bash
# No terminal
ls supabase/migrations/
ls supabase/functions/
```

### 3. Como Funciona "Deploy to Production"

Segundo a documentação, quando **"Deploy to production"** está habilitado:

> "Enable the **Deploy to production** option in your GitHub Integration configuration to automatically deploy changes when you push or merge to production branch."

**O que é deployado automaticamente:**
- ✅ **New migrations** são aplicadas
- ✅ **Edge Functions** declaradas em `config.toml` são deployadas
- ✅ **Storage buckets** declaradas em `config.toml` são deployadas

**O que NÃO é deployado:**
- ❌ Configurações de API
- ❌ Configurações de Auth
- ❌ Arquivos `seed.sql`

### 4. Verificar `config.toml`

A documentação menciona que Edge Functions devem estar declaradas em `config.toml`:

```toml
[functions]
function_name = true
```

**Verificar:**
```bash
cat supabase/config.toml
```

Se suas Edge Functions não estão listadas, elas podem não ser deployadas automaticamente.

---

## 🔍 Diagnóstico Detalhado

### Verificar se Integração Está Funcionando

1. **Após fazer merge para `main`:**
   - Aguarde 2-5 minutos
   - Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
   - Procure por logs de migrations

2. **Verificar histórico de migrations:**
   ```sql
   SELECT version, name, inserted_at 
   FROM supabase_migrations.schema_migrations 
   ORDER BY inserted_at DESC 
   LIMIT 10;
   ```

3. **Verificar se migration está no GitHub:**
   ```bash
   git checkout main
   ls supabase/migrations/ | grep 20251220202812
   ```

### Possíveis Causas

#### Causa 1: "Supabase directory" Incorreto
- **Sintoma:** Erro "Remote migration versions not found"
- **Solução:** Alterar de `./supabase` para `supabase`

#### Causa 2: Migrations Não Estão no Commit
- **Sintoma:** Migration existe localmente mas não no GitHub
- **Solução:** Verificar se migration foi commitada e pushada

#### Causa 3: Histórico de Migrations Dessincronizado
- **Sintoma:** Supabase tenta aplicar migrations que já existem
- **Solução:** Usar `supabase migration repair` (já foi feito antes)

#### Causa 4: Edge Functions Não Declaradas em `config.toml`
- **Sintoma:** Functions não são deployadas
- **Solução:** Adicionar functions em `config.toml`

---

## 🛠️ Ações Imediatas

### Passo 1: Corrigir Configuração (URGENTE)

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Altere "Supabase directory" de `./supabase` para `supabase`
3. Salve

### Passo 2: Verificar `config.toml`

```bash
# Verificar se functions estão listadas
cat supabase/config.toml | grep -A 20 "\[functions\]"
```

### Passo 3: Fazer Teste

1. Fazer um pequeno commit na `main` (ou push vazio)
2. Aguardar 2-5 minutos
3. Verificar logs do Supabase
4. Verificar se migration foi aplicada

### Passo 4: Se Ainda Não Funcionar

Aplicar manualmente (temporário):

```bash
supabase link --project-ref wyehpiutzvwplllumgdk
supabase db push
supabase functions deploy
```

---

## 📋 Checklist de Verificação

- [ ] "Supabase directory" está como `supabase` (sem `./`)
- [ ] "Deploy to production" está habilitado
- [ ] "Production branch name" está como `main`
- [ ] Migrations estão commitadas no GitHub
- [ ] `config.toml` existe e está correto
- [ ] Edge Functions estão declaradas em `config.toml` (se aplicável)
- [ ] Teste realizado após correção

---

## 🎯 O Que Esperar Após Corrigir

### Quando Fizer Merge para `main`:

1. **Supabase detecta o push/merge** (2-5 minutos)
2. **Lê migrations de `supabase/migrations/`**
3. **Aplica apenas migrations novas** (não reaplica antigas)
4. **Deploya Edge Functions** (se declaradas em `config.toml`)
5. **Logs mostram o processo**

### Logs Esperados:

```
Applying migration: 20251220202812_test_fluxo_develop_main.sql
Migration applied successfully
Deploying Edge Functions...
```

---

## 📚 Referências

- [Supabase GitHub Integration Docs](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Preventing Migration Failures](https://supabase.com/docs/guides/deployment/branching/github-integration#preventing-migration-failures)
- [Deploying Changes to Production](https://supabase.com/docs/guides/deployment/branching/github-integration#deploying-changes-to-production)

---

## ⚠️ Importante

Segundo a documentação:

> "We highly recommend turning on a 'required check' for the Supabase integration. You can do this from your GitHub repository settings. This prevents PRs from being merged when migration checks fail, and stops invalid migrations from being merged into your production branch."

**Recomendação:**
1. Após corrigir, configure o check "Supabase Preview" como obrigatório no GitHub
2. Isso evita merges com migrations inválidas

---

**Status:** ⚠️ **AGUARDANDO CORREÇÃO DO "SUPABASE DIRECTORY"**

Após alterar de `./supabase` para `supabase` e salvar, o problema deve ser resolvido.

