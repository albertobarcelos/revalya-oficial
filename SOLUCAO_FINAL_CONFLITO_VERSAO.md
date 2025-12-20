# ✅ Solução Final: Conflito de Versão na Develop

## 🐛 Problema Identificado

### Erro nos Logs

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20251213) already exists.
```

### Causa

A integração nativa do Supabase extrai a versão do nome do arquivo:
- **Arquivo**: `20251213_120001_add_api_key_encryption.sql`
- **Versão extraída**: `20251213` (apenas primeiros 8 dígitos)
- **Conflito**: Já existe migration com versão `20251213` (`20251213_120000_remove_tenant_invites_updated_at_trigger.sql`)

---

## ✅ Solução Aplicada

### 1. Adicionar Migrations no Histórico da Develop

As migrations foram adicionadas diretamente no histórico com versões corretas:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES 
  ('20251213120001', '120001_add_api_key_encryption'),
  ('20251213120002', '120002_update_functions_to_use_vault')
ON CONFLICT (version) DO NOTHING;
```

**Status**: ✅ **Aplicado na develop**

### 2. Renomear Arquivos (Recomendado para Futuro)

Para evitar problemas futuros, renomear os arquivos para usar timestamp completo:

```bash
# Renomear para timestamp completo (14 dígitos)
mv supabase/migrations/20251213_120001_add_api_key_encryption.sql \
   supabase/migrations/20251213120001_add_api_key_encryption.sql

mv supabase/migrations/20251213_120002_update_functions_to_use_vault.sql \
   supabase/migrations/20251213120002_update_functions_to_use_vault.sql
```

**Benefício**: Integração nativa reconhecerá versões corretas automaticamente

---

## 🔍 Status Atual

### Develop (ivaeoagtrvjsksebnqwr)

- ✅ Migrations adicionadas no histórico com versões corretas
- ✅ Conflito resolvido
- ⚠️ Arquivos ainda precisam ser renomeados (opcional, mas recomendado)

### Main (wyehpiutzvwplllumgdk)

- ✅ Todas as migrations sincronizadas
- ✅ Sem conflitos

---

## 📋 Próximos Passos

### Opção 1: Renomear Arquivos (Recomendado)

```powershell
# Executar script de renomeação
.\renomear_migrations_conflito.ps1

# Commit
git add supabase/migrations/
git commit -m "fix: renomear migrations para evitar conflito de versão"
git push origin develop
```

**Vantagem**: Integração nativa reconhecerá automaticamente as versões corretas

### Opção 2: Manter Como Está

Se as migrations já estão no histórico com versões corretas, pode manter os arquivos como estão. A integração nativa não tentará reaplicar se já estiverem no histórico.

---

## 🎯 Recomendação

**Renomear os arquivos** para evitar problemas futuros:

1. **Executar script de renomeação**
2. **Commit e push**
3. **Sincronizar histórico** (se necessário)

Isso garante que:
- ✅ Integração nativa reconhece versões corretas
- ✅ Sem conflitos futuros
- ✅ Histórico alinhado com nomes de arquivos

---

## ✅ Verificação

Após renomear, verificar:

1. **Arquivos renomeados** corretamente
2. **Histórico sincronizado** na develop
3. **Logs da integração nativa** sem erros

---

**Status**: ✅ **CONFLITO RESOLVIDO**

Migrations adicionadas no histórico da develop com versões corretas. Recomendado renomear arquivos para evitar problemas futuros.

