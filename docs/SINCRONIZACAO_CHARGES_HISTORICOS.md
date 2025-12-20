# 🔄 Sincronização de Charges Históricos

## 📋 Contexto

Os webhooks do ASAAS já foram executados anteriormente, mas o código ainda não estava configurado para atualizar os campos `status` e `payment_value` na tabela `charges`. 

Agora que o webhook foi atualizado, ele sincroniza automaticamente os **novos** eventos, mas os dados **históricos** precisam ser sincronizados manualmente.

---

## 🎯 Solução: Edge Function `sync-charges-from-staging`

### Funcionalidade

A Edge Function `sync-charges-from-staging` sincroniza dados históricos de `conciliation_staging` para `charges`:

- ✅ Atualiza `status` (mapeado de `status_externo`)
- ✅ Atualiza `payment_value` (de `valor_cobranca`)
- ✅ Processa em lotes para performance
- ✅ Modo dry-run para testar sem alterar dados
- ✅ Proteção multi-tenant
- ✅ Relatório detalhado

---

## 🚀 Como Usar

### 1. Deploy da Função

```bash
supabase functions deploy sync-charges-from-staging
```

### 2. Teste (Dry-Run) - Recomendado Primeiro

**Não atualiza dados, apenas mostra o que seria atualizado:**

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

**Resposta exemplo:**
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
  "details": [...],
  "note": "Modo dry-run: nenhum dado foi alterado"
}
```

### 3. Execução Real

**Atualiza os dados de fato:**

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-staging/{tenant_id}" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 100
  }'
```

### 4. Forçar Atualização (Mesmo se Já Estiver Atualizado)

**Útil para re-sincronizar tudo:**

```bash
curl -X POST \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-staging/{tenant_id}" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: "application/json" \
  -d '{
    "forceUpdate": true,
    "batchSize": 100
  }'
```

---

## 📊 Parâmetros

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `dryRun` | boolean | `false` | Se `true`, não atualiza dados, apenas mostra o que seria atualizado |
| `batchSize` | number | `100` | Quantidade de registros processados por lote |
| `forceUpdate` | boolean | `false` | Se `true`, atualiza mesmo se os dados já estiverem corretos |

---

## 🔍 Critérios de Sincronização

A função sincroniza charges que:

1. **Têm `charge_id` direto** em `conciliation_staging`
2. **OU têm `id_externo`** que corresponde a `asaas_id` em `charges`

**Filtros aplicados:**
- ✅ `origem = 'ASAAS'`
- ✅ `deleted_flag = false`
- ✅ `status_externo IS NOT NULL`
- ✅ Mesmo `tenant_id` (proteção multi-tenant)

---

## ⚡ Otimizações

### Verificação Inteligente

Por padrão, a função **não atualiza** se os dados já estiverem corretos:

- Se `status` já está mapeado corretamente
- Se `payment_value` já está igual a `valor_cobranca`

Use `forceUpdate: true` para forçar atualização mesmo se já estiver correto.

### Processamento em Lotes

- Processa `batchSize` registros por vez
- Evita sobrecarga no banco de dados
- Permite monitoramento do progresso

---

## 📝 Resposta da API

### Sucesso

```json
{
  "success": true,
  "tenantId": "uuid",
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
  ],
  "errors": []
}
```

### Erro

```json
{
  "error": "Mensagem de erro",
  "details": {...}
}
```

---

## 🔐 Segurança

- ✅ **Multi-tenant**: Sempre filtra por `tenant_id`
- ✅ **Validação de UUID**: Valida formato do `tenant_id` na URL
- ✅ **Service Role Key**: Usa chave de serviço para bypass de RLS (necessário para atualizações)
- ✅ **Proteção de dados**: Não atualiza se dados já estiverem corretos (a menos que `forceUpdate`)

---

## 🎯 Quando Usar

### Sincronização Histórica (Uma Vez)
1. Execute em modo `dryRun: true` primeiro
2. Revise os resultados
3. Execute sem `dryRun` para atualizar

### Manutenção Contínua
- Se dados ficarem dessincronizados
- Após correções manuais
- Para auditoria e validação

---

## ⚠️ Observações Importantes

1. **Backup**: Recomendado fazer backup antes da primeira execução
2. **Teste primeiro**: Sempre execute em `dryRun: true` antes da execução real
3. **Monitoramento**: Acompanhe os logs durante a execução
4. **Performance**: Ajuste `batchSize` conforme necessário (100-200 é recomendado)

---

## 🗑️ Remover Após Uso?

### Opção 1: Manter (Recomendado)
- Útil para manutenção futura
- Pode ser executada periodicamente
- Ferramenta de auditoria

### Opção 2: Remover
- Se não houver necessidade de re-sincronização
- Para manter o código limpo
- Pode ser recriada se necessário

**Recomendação:** Manter como ferramenta de manutenção, mas pode ser removida se não houver necessidade futura.

---

## 📚 Relacionado

- `docs/SINCRONIZACAO_AUTOMATICA_CHARGES_CRON.md` - **Sincronização automática via pg_cron (a cada 1 hora)** ⭐ RECOMENDADO
- `docs/ANALISE_WEBHOOK_ATUALIZACAO_CHARGES.md` - Como o webhook atualiza charges
- `supabase/functions/asaas-webhook-charges/index.ts` - Webhook principal

