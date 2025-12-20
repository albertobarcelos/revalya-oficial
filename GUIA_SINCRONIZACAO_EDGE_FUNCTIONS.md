# Guia: Sincronizar Edge Functions do Main para Local

## 🎯 Objetivo

Garantir que todas as Edge Functions do ambiente **main** (produção) estejam 100% sincronizadas com o ambiente local.

## ⚠️ Importante

**Edge Functions NÃO estão nos arquivos SQL** (`schema.sql`, `data.sql`, `roles.sql`).  
Elas são arquivos TypeScript/Deno armazenados separadamente no Supabase.

## 🔄 Métodos de Sincronização

### Método 1: Via Supabase Dashboard (MAIS CONFIÁVEL)

1. **Acesse o Dashboard do Main:**
   ```
   https://supabase.com/dashboard/project/<project-ref-main>/functions
   ```

2. **Para cada Edge Function:**
   - Clique na function
   - Copie TODO o código
   - Salve localmente em: `supabase/functions/<nome-da-function>/index.ts`
   - Se houver arquivos adicionais (deno.json, etc.), copie também

3. **Lista completa de functions a sincronizar:**
   - asaas-import-all-charges
   - asaas-import-charges
   - asaas-proxy
   - asaas-webhook-charges
   - assinafy-delete-contact
   - assinafy-delete-template
   - assinafy-list-contacts
   - assinafy-list-signer-documents
   - assinafy-list-templates
   - assinafy-update-contact
   - bulk-insert-helper
   - cleanup-expired-tokens
   - create-user-admin
   - cron-cleanup-scheduler
   - digital-contracts
   - evolution-proxy
   - exchange-tenant-code
   - fetch-asaas-customer
   - financial-calculations
   - financial-notifications
   - financial-reports
   - focusnfe (tem subdiretórios: handlers/, utils/)
   - jwt-custom-claims
   - messages
   - monitor-constraint-violations
   - recalc-billing-statuses
   - revoke-tenant-session
   - send-bulk-messages
   - send-invite-email
   - send-welcome-email
   - sync-charges-from-asaas-api
   - validate-tenant-token

### Método 2: Via Supabase CLI (se disponível)

```bash
# Conectar ao projeto main
supabase link --project-ref <project-ref-main>

# Listar functions
supabase functions list

# Nota: O CLI pode não ter comando direto para pull
# Use o Dashboard ou API
```

### Método 3: Via API do Supabase (Avançado)

1. **Obter Access Token:**
   - Dashboard > Account > Access Tokens
   - Criar novo token

2. **Usar o script Python:**
   ```bash
   export SUPABASE_ACCESS_TOKEN='seu-token'
   export SUPABASE_PROJECT_REF='seu-project-ref'
   python download_edge_functions_via_api.py
   ```

   **Nota:** A API do Supabase pode não ter endpoint direto para código de Edge Functions. Nesse caso, use o Método 1.

## ✅ Verificação

Após sincronizar, verifique:

1. **Todas as functions existem localmente:**
   ```bash
   ls supabase/functions/
   ```

2. **Comparar com o Dashboard:**
   - Verificar se o número de functions bate
   - Verificar se não há functions no Dashboard que não estão locais

3. **Testar deploy:**
   ```bash
   supabase functions deploy <nome-da-function>
   ```

## 📋 Checklist de Sincronização

- [ ] Conectar ao projeto main no Dashboard
- [ ] Listar todas as Edge Functions
- [ ] Para cada function:
  - [ ] Copiar código completo
  - [ ] Salvar em `supabase/functions/<nome>/index.ts`
  - [ ] Copiar arquivos adicionais (deno.json, etc.)
  - [ ] Verificar subdiretórios (focusnfe tem handlers/, utils/)
- [ ] Verificar se todas as 30+ functions foram copiadas
- [ ] Comparar com lista esperada
- [ ] Testar deploy de uma function para validar

## 🚨 Atenção

- **NÃO** modifique as functions durante a cópia
- **NÃO** remova comentários ou formatação
- **COPIE** exatamente como está no Dashboard
- **VERIFIQUE** se há arquivos adicionais além do index.ts

## 📝 Notas

- Edge Functions são versionadas no Supabase
- Cada function pode ter múltiplos arquivos
- Algumas functions têm dependências (_shared/)
- O código no Dashboard é a fonte da verdade

