# 🔧 Solução: Erro "Remote migration versions not found" na Develop

**Data:** 21/12/2025  
**Erro:** `Remote migration versions not found in local migrations directory`

---

## 📋 Problema

A integração nativa do Supabase está detectando migrations no banco de dados `develop` que não existem no repositório Git. Isso causa o erro:

```
2025/12/21 03:10:39 Remote migration versions not found in local migrations directory.
```

---

## 🔍 Causa

O histórico de migrations no banco `develop` contém versões que foram aplicadas anteriormente, mas os arquivos correspondentes não estão mais no repositório Git (ou nunca estiveram).

---

## ✅ Solução

### Opção 1: Marcar migrations remotas como "reverted" (Recomendado)

Se as migrations no banco não são mais necessárias ou já foram consolidadas em outras migrations:

```bash
# 1. Linkar ao projeto develop
supabase link --project-ref ivaeoagtrvjsksebnqwr

# 2. Verificar quais migrations estão no banco mas não no Git
supabase migration list

# 3. Marcar migrations antigas como "reverted"
# Substitua as versões abaixo pelas que aparecerem no erro
supabase migration repair --status reverted [VERSOES_SEPARADAS_POR_ESPACO]
```

### Opção 2: Verificar e adicionar migrations faltantes

Se as migrations são importantes e precisam estar no Git:

1. **Verificar migrations no banco:**
   ```sql
   -- Executar no SQL Editor do Supabase
   SELECT version, name 
   FROM supabase_migrations.schema_migrations 
   ORDER BY version;
   ```

2. **Comparar com migrations locais:**
   ```bash
   # Listar migrations locais
   Get-ChildItem supabase\migrations\*.sql | 
     Where-Object { $_.Name -match '^\d{8,14}_' } | 
     Sort-Object Name
   ```

3. **Se necessário, criar migrations faltantes ou marcar como reverted**

---

## 🚀 Solução Rápida (Recomendada)

### Opção 1: Deletar Todas as Migrations do Histórico (Mais Simples)

**Execute no SQL Editor do Supabase (projeto develop):**

1. Abra o SQL Editor no dashboard do Supabase (projeto develop)
2. Execute o arquivo `deletar_todas_migrations_develop.sql` que foi criado na raiz do projeto
3. Isso remove todas as migrations do histórico, permitindo que a integração nativa reaplique todas as migrations do Git

**⚠️ ATENÇÃO:** Isso permite que todas as migrations sejam reaplicadas. Use apenas se tiver certeza de que as migrations locais estão corretas.

### Opção 2: Marcar Migrations como "reverted" (Mais Segura)

1. **Verificar migrations no banco:**
   ```sql
   SELECT version, name 
   FROM supabase_migrations.schema_migrations 
   ORDER BY version;
   ```

2. **Executar repair via CLI:**
   ```bash
   supabase link --project-ref ivaeoagtrvjsksebnqwr
   supabase migration repair --status reverted [VERSOES_SEPARADAS_POR_ESPACO]
   ```

### Migrations Locais Atuais (21/12/2025)

- `20240101000000`
- `20250127`
- `20251125`
- `20251126`
- `20251127`
- `20251128`
- `20251212`
- `20251213`
- `20251213120001`
- `20251213120002`
- `20251214`
- `20251215161709`
- `20251220111401`
- `20251221022558`
- `20251221023114`
- `20251221024204`
- `20251221024205`
- `20251221024436`
- `20251221025023`
- `20251221025309`

---

## 📝 Nota Importante

**A integração nativa do Supabase** (não o GitHub Actions) está tentando sincronizar o histórico. Ela precisa que:

1. **Todas as migrations no banco estejam no Git**, OU
2. **Migrations antigas estejam marcadas como "reverted"**

---

## 🔄 Após a Correção

Após marcar as migrations como "reverted", a integração nativa deve funcionar normalmente e aplicar apenas as novas migrations que estão no Git.

---

## ⚠️ Prevenção

Para evitar este problema no futuro:

1. **Sempre crie migrations via Git** - Nunca aplique migrations diretamente no Supabase sem versioná-las
2. **Use `supabase migration repair`** - Quando necessário sincronizar histórico
3. **Mantenha o histórico limpo** - Marque migrations antigas como "reverted" se não forem mais necessárias

---

**Última atualização:** 21/12/2025

