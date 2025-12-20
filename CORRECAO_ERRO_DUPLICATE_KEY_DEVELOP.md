# 🔧 Correção: Erro de Duplicate Key na Develop

## 🐛 Problema Identificado

### Erro nos Logs da Integração Nativa (Develop)

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20251213) already exists.
At statement: 12
```

### Causa

1. **Conflito de versão**: Duas migrations tentam usar a mesma versão `20251213`:
   - `20251213_120000_remove_tenant_invites_updated_at_trigger.sql` → versão `20251213` ✅ (já no histórico)
   - `20251213_120001_add_api_key_encryption.sql` → versão `20251213` ❌ (tentando inserir novamente)

2. **Problema**: A integração nativa está extraindo apenas os primeiros 8 dígitos (`20251213`) do nome do arquivo, ignorando o sufixo `120001`.

3. **Resultado**: Tenta inserir `20251213` duas vezes no histórico, causando erro de constraint única.

---

## ✅ Solução

### Opção 1: Renomear Arquivo (Recomendado)

Renomear o arquivo para usar um timestamp completo único:

```bash
# Renomear para usar timestamp completo
mv supabase/migrations/20251213_120001_add_api_key_encryption.sql \
   supabase/migrations/20251213120001_add_api_key_encryption.sql
```

**Vantagem**: Versão única e clara (`20251213120001`)

### Opção 2: Corrigir Migration para Inserir Versão Correta

Adicionar comando explícito para inserir versão correta no histórico:

```sql
-- No final da migration, antes do COMMIT
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251213120001', '120001_add_api_key_encryption')
ON CONFLICT (version) DO NOTHING;
```

**Vantagem**: Não precisa renomear arquivo

---

## 🔍 Análise do Problema

### Como a Integração Nativa Extrai Versões

A integração nativa do Supabase extrai a versão do nome do arquivo seguindo estas regras:

1. **Formato YYYYMMDDHHMMSS_nome.sql** → Versão: `YYYYMMDDHHMMSS`
2. **Formato YYYYMMDD_nome.sql** → Versão: `YYYYMMDD` (apenas 8 dígitos)

### Problema no Seu Caso

- Arquivo: `20251213_120001_add_api_key_encryption.sql`
- Integração nativa extrai: `20251213` (primeiros 8 dígitos)
- Mas já existe: `20251213` (de outra migration)
- **Resultado**: Conflito!

---

## ✅ Solução Recomendada

### Renomear Arquivos para Timestamp Completo

Renomear as migrations que têm conflito:

```bash
# Migration 1: add_api_key_encryption
mv supabase/migrations/20251213_120001_add_api_key_encryption.sql \
   supabase/migrations/20251213120001_add_api_key_encryption.sql

# Migration 2: update_functions_to_use_vault
mv supabase/migrations/20251213_120002_update_functions_to_use_vault.sql \
   supabase/migrations/20251213120002_update_functions_to_use_vault.sql
```

**Benefícios:**
- ✅ Versões únicas e claras
- ✅ Integração nativa reconhece corretamente
- ✅ Sem conflitos de versão
- ✅ Ordem cronológica mantida

---

## 🔄 Sincronizar Develop

Após renomear, sincronizar o histórico da develop:

```powershell
# Sincronizar develop
.\sincronizar_historico_migrations.ps1 -ProjectRef "ivaeoagtrvjsksebnqwr" -ProjectName "develop"
```

Ou adicionar diretamente via SQL:

```sql
-- Na develop
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES 
  ('20251213120001', '120001_add_api_key_encryption'),
  ('20251213120002', '120002_update_functions_to_use_vault')
ON CONFLICT (version) DO NOTHING;
```

---

## 📋 Checklist de Correção

- [ ] Renomear arquivo `20251213_120001_add_api_key_encryption.sql` para `20251213120001_add_api_key_encryption.sql`
- [ ] Renomear arquivo `20251213_120002_update_functions_to_use_vault.sql` para `20251213120002_update_functions_to_use_vault.sql`
- [ ] Commit das mudanças
- [ ] Sincronizar histórico da develop
- [ ] Verificar que integração nativa não tenta mais reaplicar

---

## 🎯 Próximos Passos

1. **Renomear arquivos** para usar timestamp completo
2. **Commit e push** para develop
3. **Sincronizar histórico** da develop
4. **Verificar logs** da integração nativa

---

**Status**: ⚠️ **PRECISA CORREÇÃO**

Renomear os arquivos para evitar conflito de versão.

