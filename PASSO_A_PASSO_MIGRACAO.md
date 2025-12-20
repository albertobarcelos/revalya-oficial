# Passo a Passo - Migração para Ambiente de Desenvolvimento

## Pré-requisitos
- Supabase CLI instalado
- Acesso ao projeto Supabase (branch `develop`)
- Tabelas já existem no banco

## Comandos

### 1. Conectar ao projeto Supabase
```bash
supabase link --project-ref <seu-project-ref>
```

### 2. Verificar conexão
```bash
supabase db remote commit
```

### 3. Executar migração (functions, triggers, policies)
```bash
# Aplicar a migração (o Supabase CLI detecta automaticamente)
supabase db push

# OU executar diretamente
supabase migration up
```

### 4. Verificar se executou sem erros
```bash
supabase db diff
```

### 5. (Opcional) Deploy das Edge Functions
```bash
# Listar functions disponíveis
ls supabase/functions

# Deploy de uma function específica
supabase functions deploy <nome-da-function>

# Ou deploy de todas (uma por uma)
supabase functions deploy asaas-webhook-charges
supabase functions deploy evolution-proxy
# ... etc
```

## Comandos Alternativos (se usar psql direto)

### 1. Conectar via psql
```bash
psql -h <host> -U postgres -d postgres
```

### 2. Executar migração
```sql
\i supabase/migrations/functions_triggers_policies.sql
```

## Verificação Final

### Verificar functions criadas
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

### Verificar triggers criados
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY trigger_name;
```

### Verificar policies criadas
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

