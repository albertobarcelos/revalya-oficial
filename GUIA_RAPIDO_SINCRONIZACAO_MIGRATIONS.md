# 🚀 Guia Rápido: Sincronizar Migrations com GitHub

## 🎯 Objetivo

**GitHub como fonte única de verdade** - Quando você fizer merge de `develop` → `main`, apenas as **novas migrations** serão aplicadas automaticamente, sem risco de quebrar o banco.

---

## ⚡ Quick Start (3 Passos)

### 1️⃣ Sincronizar Histórico Inicial

```powershell
# Para MAIN (produção)
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"

# Para DEVELOP
.\sincronizar_historico_migrations.ps1 -ProjectRef "ivaeoagtrvjsksebnqwr" -ProjectName "develop"
```

**O que faz:**
- Lista migrations do GitHub
- Marca migrations já aplicadas no histórico do Supabase
- Garante que apenas novas migrations sejam aplicadas

### 2️⃣ Desenvolver Nova Migration

```bash
# 1. Criar migration
supabase migration new nome_da_migration

# 2. Editar migration
# Arquivo: supabase/migrations/YYYYMMDDHHMMSS_nome_da_migration.sql

# 3. Commit e push para develop
git add supabase/migrations/
git commit -m "feat: nova migration"
git push origin develop

# 4. GitHub Actions aplica automaticamente na develop ✅
```

### 3️⃣ Migrar para Main

```bash
# 1. Fazer merge de develop para main
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions detecta APENAS novas migrations ✅
# 3. Aplica APENAS as novas migrations na main ✅
# 4. Não refaz migrations antigas ✅
```

---

## 🔍 Como Funciona

### Detecção Automática

O workflow GitHub Actions:
1. **Compara commits** - Detecta apenas migrations que mudaram
2. **Aplica apenas novas** - Não refaz migrations antigas
3. **Seguro** - Não quebra o banco existente

### Histórico Sincronizado

O Supabase mantém histórico em `supabase_migrations.schema_migrations`:
- Migrations do GitHub marcadas como `applied` = já aplicadas
- Novas migrations = serão aplicadas automaticamente
- Migrations removidas = marcadas como `reverted`

---

## ✅ Checklist de Sincronização

### Antes de Começar

- [ ] Executar script de sincronização para main
- [ ] Executar script de sincronização para develop
- [ ] Verificar que histórico está alinhado com GitHub

### Durante Desenvolvimento

- [ ] Criar migration no GitHub (não aplicar manualmente)
- [ ] Testar na develop primeiro
- [ ] Commit e push para develop

### Ao Migrar para Main

- [ ] Fazer merge de develop → main
- [ ] GitHub Actions aplica automaticamente
- [ ] Verificar que apenas novas migrations foram aplicadas

---

## 🛠️ Scripts Disponíveis

### `sincronizar_historico_migrations.ps1`

Sincroniza histórico de migrations com GitHub.

**Uso:**
```powershell
# Sincronizar main
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"

# Sincronizar develop
.\sincronizar_historico_migrations.ps1 -ProjectRef "ivaeoagtrvjsksebnqwr" -ProjectName "develop"

# Dry-run (simulação)
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main" -DryRun
```

**Opções:**
1. Marcar todas as migrations do GitHub como aplicadas
2. Marcar migrations específicas como aplicadas
3. Marcar migrations como reverted (removidas)

---

## ⚠️ Regras Importantes

### ✅ SEMPRE

1. **Commits no GitHub** - Todas as migrations devem estar no repositório
2. **Sincronizar antes de grandes mudanças** - Garantir histórico alinhado
3. **Testar na develop primeiro** - Sempre validar antes de main
4. **Uma migration por feature** - Não misturar múltiplas mudanças

### ❌ NUNCA

1. **Aplicar migrations manualmente** sem commit no GitHub
2. **Modificar migrations já aplicadas** - Criar nova migration para corrigir
3. **Pular sincronização** quando houver divergências
4. **Aplicar migrations antigas** que já foram aplicadas

---

## 🔍 Verificação

### Verificar Sincronização

```sql
-- Verificar migrations aplicadas no Supabase
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

# Se não houver diferenças, está sincronizado! ✅
```

---

## 🚨 Troubleshooting

### Problema: Migration já aplicada mas não no histórico

**Solução:**
```bash
supabase migration repair --status applied YYYYMMDDHHMMSS
```

### Problema: Histórico completamente desincronizado

**Solução:**
1. Executar script de sincronização completa
2. Marcar todas as migrations aplicadas como `applied`
3. Garantir que GitHub tenha todas as migrations

### Problema: Workflow não detecta novas migrations

**Solução:**
1. Verificar que migration está no commit
2. Verificar que caminho está correto: `supabase/migrations/`
3. Verificar logs do GitHub Actions

---

## 📚 Documentação Completa

- **`SOLUCAO_SINCRONIZACAO_MIGRATIONS.md`** - Guia completo e detalhado
- **`WORKFLOW_COMPLETO_DEVELOP_TO_MAIN.md`** - Workflow completo de migração

---

**Última atualização**: 2025-01-XX

