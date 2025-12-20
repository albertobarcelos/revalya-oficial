# Aplicar Migração Diretamente

Como há conflitos com migrações duplicadas, vamos aplicar apenas a nova migração diretamente:

## ✅ Opção 1: Via Supabase Dashboard (MAIS FÁCIL)

1. Acesse: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr
2. Vá em: **SQL Editor** (menu lateral)
3. Clique em **New query**
4. Abra o arquivo: `supabase/migrations/20251220111401_functions_triggers_policies.sql`
5. Cole todo o conteúdo no editor
6. Clique em **Run** (ou Ctrl+Enter)

## Opção 2: Via psql (se tiver acesso direto)

```bash
# Conectar ao banco
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f supabase/migrations/20251220111401_functions_triggers_policies.sql
```

## Opção 3: Marcar migrações como aplicadas e usar CLI

Se as outras migrações já foram aplicadas manualmente:

```bash
# Marcar migrações duplicadas como aplicadas
supabase migration repair --status applied 20251213
supabase migration repair --status applied 20251214

# Depois aplicar nova migração
supabase db push
```

## 🎯 RECOMENDAÇÃO

**Use a Opção 1 (Dashboard)** - É a mais simples e segura!

