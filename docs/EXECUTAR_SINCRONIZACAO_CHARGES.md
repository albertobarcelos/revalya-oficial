# 🚀 Como Executar a Sincronização de Charges

## 📋 Pré-requisitos

1. ✅ Edge Function `sync-charges-from-staging` deployada
2. ✅ `tenant_id` do tenant que deseja sincronizar
3. ✅ `SUPABASE_ANON_KEY` configurada (ou `VITE_SUPABASE_ANON_KEY`)

---

## 🔧 Passo 1: Deploy da Função

### Opção A: Via Supabase Dashboard
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions
2. Clique em "Deploy a new function"
3. Selecione a pasta `supabase/functions/sync-charges-from-staging`
4. Clique em "Deploy"

### Opção B: Via CLI (requer login)
```bash
# Fazer login primeiro
npx supabase login

# Deploy
npx supabase functions deploy sync-charges-from-staging --project-ref wyehpiutzvwplllumgdk
```

---

## 🧪 Passo 2: Teste em Dry-Run (Recomendado)

### Via Script Node.js

```bash
# Configurar a chave (se ainda não estiver configurada)
export SUPABASE_ANON_KEY="sua_chave_aqui"
# ou no Windows PowerShell:
$env:SUPABASE_ANON_KEY="sua_chave_aqui"

# Executar teste
node scripts/test-sync-charges-dry-run.js <tenant_id>
```

**Exemplo:**
```bash
node scripts/test-sync-charges-dry-run.js 8d2888f1-64a5-445f-84f5-2614d5160251
```

### Via cURL

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-staging/{tenant_id}" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "batchSize": 50
  }'
```

**Substitua:**
- `{tenant_id}` pelo UUID do seu tenant
- `YOUR_ANON_KEY` pela sua chave anon do Supabase

---

## ✅ Passo 3: Executar Sincronização Real

### Via Script Node.js

```bash
# Executar sincronização
node scripts/sync-charges-real.js <tenant_id>

# Ou forçar atualização de tudo
node scripts/sync-charges-real.js <tenant_id> --force
```

**O script pedirá confirmação antes de executar.**

### Via cURL

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-staging/{tenant_id}" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 100
  }'
```

---

## 🔍 Como Obter o Tenant ID

### Opção 1: Via Dashboard Supabase
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
2. Vá em "Table Editor" → Tabela `tenants`
3. Copie o `id` do tenant desejado

### Opção 2: Via SQL
```sql
SELECT id, name, slug FROM tenants;
```

### Opção 3: Via Código
Se você tem acesso ao código, o tenant_id geralmente está em:
- `src/core/tenant/TenantContext.tsx`
- SessionStorage do navegador
- Estado do Zustand

---

## 📊 Exemplo de Resposta

```json
{
  "success": true,
  "tenantId": "8d2888f1-64a5-445f-84f5-2614d5160251",
  "summary": {
    "total": 150,
    "processed": 150,
    "updated": 120,
    "skipped": 30,
    "errors": 0
  },
  "details": [
    {
      "movement_id": "uuid",
      "charge_id": "uuid",
      "id_externo": "pay_123",
      "status_externo": "received",
      "status_mapped": "RECEIVED",
      "payment_value": 1000.50
    }
  ]
}
```

---

## ⚠️ Observações Importantes

1. **Sempre teste em dry-run primeiro**
2. **Faça backup antes da execução real**
3. **Acompanhe os logs durante a execução**
4. **A função processa em lotes para não sobrecarregar o banco**

---

## 🆘 Troubleshooting

### Erro: "Tenant ID inválido"
- Verifique se o UUID está correto
- Formato esperado: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Erro: "Não autorizado"
- Verifique se a `SUPABASE_ANON_KEY` está correta
- Verifique se a função foi deployada corretamente

### Erro: "Função não encontrada"
- Verifique se o deploy foi concluído
- Verifique o nome da função na URL

---

## 📚 Documentação Relacionada

- `docs/SINCRONIZACAO_CHARGES_HISTORICOS.md` - Documentação completa
- `docs/ANALISE_WEBHOOK_ATUALIZACAO_CHARGES.md` - Como o webhook atualiza charges


