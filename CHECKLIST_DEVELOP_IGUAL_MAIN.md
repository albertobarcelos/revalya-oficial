# Checklist: Deixar Develop Igual a Main

## ✅ Já Concluído

- [x] **Tabelas** - Já existem no banco develop
- [x] **Functions (RPC)** - Aplicadas via migração
- [x] **Triggers** - Aplicados via migração
- [x] **Types (ENUMs)** - Aplicados via migração
- [x] **Extensions** - Aplicadas via migração
- [x] **Schemas** - Aplicados via migração
- [x] **Grants** - Aplicados via migração
- [x] **Roles** - Aplicados via migração

## ⏳ Pendente

### 1. Edge Functions (CRÍTICO)

Deploy de todas as Edge Functions no Supabase:

```bash
# Lista de todas as functions que precisam ser deployadas:
supabase functions deploy asaas-import-all-charges
supabase functions deploy asaas-import-charges
supabase functions deploy asaas-proxy
supabase functions deploy asaas-webhook-charges
supabase functions deploy assinafy-delete-contact
supabase functions deploy assinafy-delete-template
supabase functions deploy assinafy-list-contacts
supabase functions deploy assinafy-list-signer-documents
supabase functions deploy assinafy-list-templates
supabase functions deploy assinafy-update-contact
supabase functions deploy bulk-insert-helper
supabase functions deploy cleanup-expired-tokens
supabase functions deploy create-user-admin
supabase functions deploy cron-cleanup-scheduler
supabase functions deploy digital-contracts
supabase functions deploy evolution-proxy
supabase functions deploy exchange-tenant-code
supabase functions deploy fetch-asaas-customer
supabase functions deploy financial-calculations
supabase functions deploy financial-notifications
supabase functions deploy financial-reports
supabase functions deploy focusnfe
supabase functions deploy jwt-custom-claims
supabase functions deploy messages
supabase functions deploy monitor-constraint-violations
supabase functions deploy recalc-billing-statuses
supabase functions deploy revoke-tenant-session
supabase functions deploy send-bulk-messages
supabase functions deploy send-invite-email
supabase functions deploy send-welcome-email
supabase functions deploy sync-charges-from-asaas-api
supabase functions deploy validate-tenant-token
```

**Script rápido para deploy de todas:**
```bash
# No PowerShell
Get-ChildItem -Path "supabase\functions" -Directory | ForEach-Object {
    $functionName = $_.Name
    if ($functionName -ne "_shared") {
        Write-Host "Deploying $functionName..."
        supabase functions deploy $functionName
    }
}
```

### 2. Dados de Seed (OPCIONAL)

O arquivo `data.sql` contém dados de produção (usuários, sessões, etc.) que **NÃO devem** ser aplicados no ambiente de desenvolvimento.

**Se precisar de dados de teste/seed:**
- Criar um arquivo separado `seed_dev.sql` com dados de teste
- Não usar o `data.sql` que contém dados de produção

### 3. Verificações Finais

Execute estas queries para confirmar que tudo está igual:

```sql
-- Verificar se todas as functions existem
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Verificar se todos os triggers existem
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY trigger_name;

-- Verificar se todos os types existem
SELECT typname 
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' 
AND t.typtype = 'e'
ORDER BY typname;

-- Verificar extensions
SELECT extname 
FROM pg_extension 
ORDER BY extname;
```

## 📋 Resumo

**O que falta:**
1. ⚠️ **Edge Functions** - Deploy de todas as 30+ functions
2. ⚠️ **Dados de seed** (se necessário) - Criar arquivo separado com dados de teste

**O que NÃO fazer:**
- ❌ Não aplicar `data.sql` (contém dados de produção)
- ❌ Não aplicar políticas RLS (já removidas conforme solicitado)

## 🚀 Próximos Passos

1. Deploy das Edge Functions (use o script acima)
2. Verificar se há alguma configuração específica no Supabase Dashboard
3. Testar funcionalidades principais

