# Como Executar a Edge Function `sync-charges-from-staging`

## ⚠️ Importante: Edge Functions não são executadas via SQL

**Edge Functions são funções serverless executadas via HTTP**, não podem ser chamadas diretamente via SQL. Elas são acessadas através de requisições HTTP POST.

## 📋 Informações da Função

- **Nome interno**: `sync-charges-from-staging`
- **Slug (URL)**: `hyper-task` ⚠️ **IMPORTANTE**: O slug é diferente do nome!
- **URL Base**: `https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/hyper-task/{tenant_id}`
- **Método**: POST
- **Autenticação**: Bearer Token (SUPABASE_ANON_KEY)

## 🧪 Executar Teste em Modo DRY-RUN (Recomendado)

### Via PowerShell (Windows)

```powershell
# Executar o script de teste
powershell -ExecutionPolicy Bypass -File test-sync-cli.ps1
```

O script `test-sync-cli.ps1` já está configurado com:
- Tenant ID: `8d2888f1-64a5-445f-84f5-2614d5160251`
- Modo: `dryRun: true`
- Batch Size: `50`

### Via cURL (Linux/Mac/Windows)

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/hyper-task/8d2888f1-64a5-445f-84f5-2614d5160251" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "batchSize": 50}'
```

## 🚀 Executar Sincronização Real (Atualiza Dados)

⚠️ **ATENÇÃO**: Isso irá atualizar dados reais no banco!

### Via PowerShell

Edite o arquivo `test-sync-cli.ps1` e altere:
```powershell
$body = @{
    dryRun = $false  # Mudar para false
    batchSize = 50
} | ConvertTo-Json
```

### Via cURL

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/hyper-task/8d2888f1-64a5-445f-84f5-2614d5160251" \
  -H "Authorization: Bearer [SUA_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "batchSize": 50}'
```

## 📊 Resultado do Teste DRY-RUN (Executado em 2025-01-09)

```
✅ SUCESSO!

RESUMO:
   Total encontrado: 934
   Processadas: 2
   Seriam atualizadas: 2
   Seriam ignoradas: 932
   Erros: 0
```

### Interpretação

- **934 movimentações** encontradas em `conciliation_staging` com `origem='ASAAS'` e `status_externo` preenchido
- **2 charges** seriam atualizadas (têm `charge_id` ou `asaas_id` correspondente)
- **932 movimentações** ignoradas porque não têm charges vinculadas

## 🔍 Parâmetros Disponíveis

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `dryRun` | boolean | `false` | Se `true`, apenas simula sem alterar dados |
| `batchSize` | number | `100` | Quantidade de registros processados por lote |
| `forceUpdate` | boolean | `false` | Se `true`, força atualização mesmo se já estiver atualizado |

## 📝 Exemplo de Resposta JSON

```json
{
  "success": true,
  "tenantId": "8d2888f1-64a5-445f-84f5-2614d5160251",
  "summary": {
    "total": 934,
    "processed": 2,
    "updated": 2,
    "skipped": 932,
    "errors": 0
  },
  "details": [
    {
      "movement_id": "...",
      "charge_id": "...",
      "id_externo": "...",
      "status_externo": "received",
      "status_mapped": "RECEIVED",
      "payment_value": 150.00
    }
  ]
}
```

## 🛠️ Troubleshooting

### Erro 404: Function Not Found

Verifique se o **slug** está correto. Use `hyper-task` (não `sync-charges-from-staging`).

### Erro 401: Unauthorized

Verifique se o `Authorization` header está correto com a `SUPABASE_ANON_KEY` válida.

### Erro 400: Bad Request

Verifique se o `tenant_id` na URL é um UUID válido.

## 📚 Documentação Relacionada

- `docs/SINCRONIZACAO_CHARGES_HISTORICOS.md` - Documentação completa da função
- `supabase/functions/sync-charges-from-staging/index.ts` - Código fonte da função

