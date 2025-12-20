# 🔄 Sincronização Automática de Charges (pg_cron)

## 📋 Contexto

A sincronização de `charges` com `conciliation_staging` agora é executada **automaticamente a cada 1 hora** via `pg_cron`, garantindo que os dados estejam sempre atualizados mesmo se o webhook falhar ou não for recebido.

---

## ✅ Solução Implementada: pg_cron

### Vantagens sobre Edge Function Agendada

- ✅ **Mais rápido**: Executa direto no banco (sem latência HTTP)
- ✅ **Mais barato**: Não consome invocações de Edge Function
- ✅ **Mais confiável**: Não depende de serviços externos
- ✅ **Já está em uso**: Projeto já usa `pg_cron` para outros jobs

### Frequência

- **Execução**: A cada 1 hora (minuto 0 de cada hora)
- **Formato cron**: `0 * * * *`
- **Execuções/dia**: 24
- **Execuções/mês**: ~720

---

## 🗄️ Funções SQL Criadas

### 1. `map_external_status_to_charge_status(status_externo TEXT)`

Mapeia `status_externo` (minúsculas) para `status` (MAIÚSCULAS).

```sql
SELECT map_external_status_to_charge_status('received');
-- Retorna: 'RECEIVED'
```

### 2. `sync_charges_from_staging_for_tenant(p_tenant_id UUID)`

Sincroniza charges para um tenant específico.

**Retorna JSON:**
```json
{
  "tenant_id": "uuid",
  "total_found": 934,
  "processed": 2,
  "updated": 2,
  "skipped": 932,
  "errors": 0,
  "timestamp": "2025-01-09T12:00:00Z"
}
```

### 3. `sync_charges_from_staging_all_tenants()`

Processa todos os tenants ativos automaticamente.

**Retorna JSON:**
```json
{
  "success": true,
  "total_tenants": 2,
  "successful_tenants": 2,
  "failed_tenants": 0,
  "results": [...],
  "timestamp": "2025-01-09T12:00:00Z"
}
```

---

## 🚀 Como Aplicar

### 1. Executar a Migration

Execute o SQL da migration no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/20250109_sync_charges_cron.sql
```

Ou via Supabase CLI:

```bash
supabase db push
```

### 2. Verificar se o Cron Job Foi Criado

```sql
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'sync-charges-from-staging-hourly';
```

**Resultado esperado:**
```
jobid | schedule | command | active | jobname
------|----------|---------|--------|----------------------------------
123   | 0 * * * *| SELECT...| t      | sync-charges-from-staging-hourly
```

### 3. Testar Manualmente (Opcional)

```sql
-- Testar para um tenant específico
SELECT sync_charges_from_staging_for_tenant('8d2888f1-64a5-445f-84f5-2614d5160251');

-- Testar para todos os tenants
SELECT sync_charges_from_staging_all_tenants();
```

---

## 📊 Monitoramento

### Ver Histórico de Execuções

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'sync-charges-from-staging-hourly'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Ver Última Execução

```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'sync-charges-from-staging-hourly'
)
ORDER BY start_time DESC
LIMIT 1;
```

---

## ⚙️ Gerenciamento do Cron Job

### Desabilitar Temporariamente

```sql
SELECT cron.unschedule('sync-charges-from-staging-hourly');
```

### Reabilitar

```sql
SELECT cron.schedule(
  'sync-charges-from-staging-hourly',
  '0 * * * *',  -- A cada 1 hora
  $$
  SELECT sync_charges_from_staging_all_tenants();
  $$
);
```

### Alterar Frequência

**Para a cada 30 minutos:**
```sql
SELECT cron.unschedule('sync-charges-from-staging-hourly');

SELECT cron.schedule(
  'sync-charges-from-staging-hourly',
  '*/30 * * * *',  -- A cada 30 minutos
  $$
  SELECT sync_charges_from_staging_all_tenants();
  $$
);
```

**Para a cada 2 horas:**
```sql
SELECT cron.unschedule('sync-charges-from-staging-hourly');

SELECT cron.schedule(
  'sync-charges-from-staging-hourly',
  '0 */2 * * *',  -- A cada 2 horas
  $$
  SELECT sync_charges_from_staging_all_tenants();
  $$
);
```

---

## 🔍 Critérios de Sincronização

A função sincroniza charges que:

1. ✅ Têm `charge_id` direto em `conciliation_staging`
2. ✅ OU têm `id_externo` que corresponde a `asaas_id` em `charges`

**Filtros aplicados:**
- ✅ `origem = 'ASAAS'`
- ✅ `deleted_flag = false`
- ✅ `status_externo IS NOT NULL`
- ✅ Mesmo `tenant_id` (proteção multi-tenant)

**Atualiza apenas se:**
- ✅ `status` está diferente do mapeado
- ✅ `payment_value` está diferente de `valor_cobranca`

---

## 📝 Campos Atualizados

| Campo | Origem | Mapeamento |
|-------|--------|-----------|
| `status` | `status_externo` (conciliation_staging) | Minúsculas → MAIÚSCULAS |
| `payment_value` | `valor_cobranca` (conciliation_staging) | Valor direto |
| `updated_at` | Sistema | Data/hora atual (UTC-3) |

---

## 🔐 Segurança

- ✅ **Multi-tenant**: Sempre filtra por `tenant_id`
- ✅ **SECURITY DEFINER**: Executa com privilégios do criador (necessário para bypass de RLS)
- ✅ **Proteção de dados**: Não atualiza se dados já estiverem corretos
- ✅ **Isolamento**: Cada tenant processado independentemente

---

## ⚠️ Troubleshooting

### Cron Job Não Está Executando

1. Verificar se `pg_cron` está habilitado:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Verificar se o job está ativo:
```sql
SELECT active FROM cron.job 
WHERE jobname = 'sync-charges-from-staging-hourly';
```

3. Verificar logs de erro:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-charges-from-staging-hourly')
  AND status = 'failed'
ORDER BY start_time DESC;
```

### Nenhuma Charge Atualizada

1. Verificar se há dados em `conciliation_staging`:
```sql
SELECT COUNT(*) 
FROM conciliation_staging
WHERE origem = 'ASAAS' 
  AND deleted_flag = false 
  AND status_externo IS NOT NULL;
```

2. Verificar se há charges vinculadas:
```sql
SELECT COUNT(DISTINCT cs.charge_id)
FROM conciliation_staging cs
WHERE cs.origem = 'ASAAS'
  AND cs.deleted_flag = false
  AND cs.charge_id IS NOT NULL;
```

---

## 📚 Relacionado

- `supabase/functions/sync-charges-from-staging/index.ts` - Edge Function (execução manual)
- `docs/ANALISE_WEBHOOK_ATUALIZACAO_CHARGES.md` - Como o webhook atualiza charges
- `docs/SINCRONIZACAO_CHARGES_HISTORICOS.md` - Sincronização histórica (Edge Function)

---

## 🎯 Resumo

✅ **Solução**: pg_cron executando a cada 1 hora  
✅ **Função**: `sync_charges_from_staging_all_tenants()`  
✅ **Cron Job**: `sync-charges-from-staging-hourly`  
✅ **Frequência**: `0 * * * *` (a cada 1 hora)  
✅ **Status**: Automático e contínuo

