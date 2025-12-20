# 🔄 Solução: Sincronização de Migrations com GitHub

## 🎯 Objetivo

Sincronizar o histórico de migrations do Supabase com o GitHub como **fonte única de verdade**, garantindo que:
- ✅ Apenas **novas migrations** sejam aplicadas quando fizer merge de develop → main
- ✅ Não refazer migrations já aplicadas
- ✅ Sem risco de quebra
- ✅ GitHub controla o estado das migrations

---

## 📋 Problema Atual

- Migrations locais diferentes das migrations na develop
- Migrations na develop diferentes das migrations na main
- Histórico de migrations no Supabase desincronizado com o GitHub
- Risco de aplicar migrations duplicadas ou quebrar o banco

---

## ✅ Solução: Sincronizar Histórico com GitHub

### Conceito

O Supabase mantém um histórico de migrations aplicadas na tabela `supabase_migrations.schema_migrations`. Precisamos sincronizar esse histórico com as migrations que estão no GitHub.

**Estratégia:**
1. **GitHub é a fonte da verdade** - As migrations no repositório definem o estado esperado
2. **Marcar migrations aplicadas** - Usar `supabase migration repair` para marcar migrations que já estão no banco
3. **Aplicar apenas novas** - O workflow detecta apenas migrations novas e aplica apenas elas

---

## 🚀 Passo a Passo: Sincronização Inicial

### Fase 1: Identificar Estado Atual

#### 1.1 Verificar Migrations no GitHub (Local)

```powershell
# Listar migrations no repositório
Get-ChildItem supabase/migrations/*.sql | Select-Object Name | Sort-Object Name
```

#### 1.2 Verificar Migrations Aplicadas no Supabase

```sql
-- Conectar ao banco (main ou develop)
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

#### 1.3 Comparar

Identifique:
- Migrations que estão no GitHub mas não no histórico do Supabase
- Migrations que estão no histórico mas não no GitHub
- Migrations que precisam ser marcadas como aplicadas

### Fase 2: Sincronizar Histórico

#### 2.1 Para MAIN (Produção)

```bash
# 1. Conectar ao projeto main
supabase link --project-ref wyehpiutzvwplllumgdk

# 2. Listar migrations que estão no GitHub
# (Execute o script sincronizar_historico_migrations.ps1)

# 3. Marcar migrations que já estão aplicadas no banco
# O script fará isso automaticamente baseado nas migrations do GitHub
```

#### 2.2 Para DEVELOP

```bash
# 1. Conectar ao projeto develop
supabase link --project-ref ivaeoagtrvjsksebnqwr

# 2. Executar sincronização
# (Execute o script sincronizar_historico_migrations.ps1)
```

---

## 🛠️ Script de Sincronização

Use o script `sincronizar_historico_migrations.ps1` para:
1. Ler migrations do GitHub (pasta `supabase/migrations/`)
2. Verificar quais já estão aplicadas no Supabase
3. Marcar migrations aplicadas no histórico usando `migration repair`
4. Garantir que apenas novas migrations sejam aplicadas

---

## 🔄 Workflow GitHub Actions

O workflow `.github/workflows/supabase-production.yml` já está configurado para:
1. **Detectar apenas novas migrations** (comparando commits)
2. **Aplicar apenas as novas** (não refazer tudo)
3. **Reparar histórico** se necessário

### Como Funciona

```yaml
# Detecta apenas migrations que mudaram
git diff --name-only $PREV_COMMIT $CURRENT_COMMIT | grep '^supabase/migrations/'

# Se houver novas migrations, aplica apenas elas
supabase db push --include-all --yes
```

---

## 📝 Processo Recomendado

### 1. Desenvolvimento (Develop)

```bash
# 1. Criar nova migration
supabase migration new nome_da_migration

# 2. Editar migration
# Arquivo: supabase/migrations/YYYYMMDDHHMMSS_nome_da_migration.sql

# 3. Commit e push para develop
git add supabase/migrations/
git commit -m "feat: nova migration"
git push origin develop

# 4. GitHub Actions aplica automaticamente na develop
```

### 2. Migração para Main

```bash
# 1. Fazer merge de develop para main
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions detecta apenas novas migrations
# 3. Aplica apenas as novas migrations na main
# 4. Não refaz migrations antigas
```

---

## ⚠️ Importante

### ✅ SEMPRE Fazer

1. **Commits no GitHub** - Todas as migrations devem estar no repositório
2. **Sincronizar histórico** - Antes de grandes mudanças, sincronizar
3. **Testar na develop** - Sempre testar migrations na develop primeiro
4. **Uma migration por feature** - Não misturar múltiplas mudanças

### ❌ NUNCA Fazer

1. **Aplicar migrations manualmente** sem commit no GitHub
2. **Modificar migrations já aplicadas** (criar nova migration para corrigir)
3. **Pular sincronização** quando houver divergências
4. **Aplicar migrations antigas** que já foram aplicadas

---

## 🔍 Verificação

### Verificar Sincronização

```sql
-- Verificar migrations aplicadas
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;

-- Comparar com migrations no GitHub
-- Devem estar alinhadas!
```

### Verificar se Apenas Novas Serão Aplicadas

```bash
# Verificar diferenças
supabase db diff

# Se não houver diferenças, está sincronizado!
```

---

## 🚨 Troubleshooting

### Problema: Migration já aplicada mas não no histórico

**Solução:**
```bash
supabase migration repair --status applied YYYYMMDDHHMMSS
```

### Problema: Migration no histórico mas não no GitHub

**Solução:**
```bash
# Se a migration foi removida do GitHub mas já está aplicada
supabase migration repair --status reverted YYYYMMDDHHMMSS
```

### Problema: Histórico completamente desincronizado

**Solução:**
1. Executar script de sincronização completa
2. Marcar todas as migrations aplicadas como `applied`
3. Garantir que GitHub tenha todas as migrations

---

## 📚 Próximos Passos

1. **Execute o script de sincronização** para alinhar histórico
2. **Teste o workflow** fazendo uma nova migration na develop
3. **Verifique** que apenas novas migrations são aplicadas
4. **Documente** qualquer migration especial que precise tratamento manual

---

**Última atualização**: 2025-01-XX

