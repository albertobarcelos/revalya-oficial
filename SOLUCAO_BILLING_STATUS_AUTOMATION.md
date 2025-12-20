# Solução: Automação de Status de Períodos de Faturamento

## 📋 Problema Identificado

Os registros na tabela `contract_billing_periods` permaneciam com status `PENDING` indefinidamente, não sendo atualizados automaticamente para `DUE_TODAY` ou `LATE` conforme as datas de vencimento.

## 🔍 Análise Realizada

### Funções RPC Existentes
- ✅ `recalc_billing_statuses()`: Função funcional que atualiza status corretamente
- ✅ `daily_billing_status_recalc()`: Wrapper que chama múltiplas funções de recálculo
- ✅ `recalc_contract_period_statuses()`: Função específica para períodos de contrato

### Automação Ausente
- ❌ Edge Function `recalc-billing-statuses` estava documentada mas não implementada
- ❌ Nenhum cron job configurado para execução automática
- ❌ `pg_cron` não instalado no Supabase

## 🛠 Solução Implementada

### 1. Edge Function `recalc-billing-statuses`

**Arquivo**: `supabase/functions/recalc-billing-statuses/index.ts`

**Funcionalidades**:
- Executa recálculo para todos os tenants ativos
- Configura contexto de tenant para cada execução
- Chama `recalc_billing_statuses()` RPC para cada tenant
- Logs detalhados para monitoramento
- Tratamento de erros por tenant
- Estatísticas de execução

**Lógica de Atualização**:
```sql
-- PENDING → DUE_TODAY (quando bill_date = hoje)
-- PENDING/DUE_TODAY → LATE (quando bill_date < hoje)
```

### 2. Configuração do Cron Job

**Problema de Timezone Identificado**:
- Servidor/banco em UTC, usuários no Brasil (UTC-3)
- 00:00 UTC = 21:00 do dia anterior no Brasil
- Contratos do dia atual apareciam como "pending" porque o sistema já considerava o dia seguinte

**Solução Implementada**:
```sql
-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configurar cron job para horário brasileiro
SELECT cron.schedule(
  'recalc-billing-statuses-daily',
  '0 3 * * *',  -- 03:00 UTC = 00:00 Brasil
  'SELECT recalc_billing_statuses();'
);
```

**Cronograma**:
- **Execução**: Diariamente às 03:00 UTC (00:00 no Brasil)
- **Função**: Chama diretamente a RPC `recalc_billing_statuses()`
- **Status**: Ativo (jobid: 2)

### 3. Estrutura da Resposta

```json
{
  "success": true,
  "message": "Recálculo concluído: X períodos atualizados",
  "timestamp": "2025-10-13T19:51:36.000Z",
  "stats": {
    "total_tenants": 2,
    "successful_tenants": 2,
    "failed_tenants": 0,
    "total_periods_updated": 2,
    "execution_time_ms": 1250,
    "results": [...]
  }
}
```

## ✅ Resultado da Implementação

### Antes da Correção
```sql
-- Todos os períodos ficavam PENDING indefinidamente
bill_date: 2025-09-10 → status: PENDING ❌
bill_date: 2025-10-13 → status: PENDING ❌
```

### Após a Correção
```sql
-- Status atualizados corretamente
bill_date: 2025-09-10 → status: LATE ✅
bill_date: 2025-10-13 → status: DUE_TODAY ✅
```

## 🔄 Configuração de Cron Job

### Status Atual: ✅ CONFIGURADO

**Cron Job Ativo**:
- **Nome**: `recalc-billing-statuses-daily`
- **Schedule**: `0 3 * * *` (03:00 UTC = 00:00 Brasil)
- **Comando**: `SELECT recalc_billing_statuses();`
- **Status**: Ativo (jobid: 2)

### Verificação do Cron Job
```sql
-- Verificar cron jobs ativos
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job 
ORDER BY jobid;
```

### Gerenciamento do Cron Job
```sql
-- Desabilitar temporariamente
SELECT cron.unschedule('recalc-billing-statuses-daily');

-- Reabilitar
SELECT cron.schedule(
  'recalc-billing-statuses-daily',
  '0 3 * * *',
  'SELECT recalc_billing_statuses();'
);
```

## 📊 Monitoramento

### Logs da Edge Function
- Execução por tenant
- Períodos atualizados por tenant
- Erros específicos por tenant
- Tempo total de execução

### Verificação Manual
```sql
-- Verificar status atuais
SELECT 
  bill_date,
  status,
  CASE 
    WHEN bill_date = CURRENT_DATE THEN 'DUE_TODAY'
    WHEN bill_date < CURRENT_DATE THEN 'LATE'
    ELSE 'PENDING'
  END as status_esperado
FROM contract_billing_periods 
ORDER BY bill_date DESC;
```

### Execução Manual
```sql
-- Executar recálculo manualmente
SELECT recalc_billing_statuses();
```

## 🔧 Manutenção

### Troubleshooting
1. **Verificar logs da Edge Function** no Dashboard Supabase
2. **Testar RPC manualmente** com `SELECT recalc_billing_statuses()`
3. **Verificar tenants ativos** na tabela `tenants`
4. **Confirmar permissões** do service role key

### Melhorias Futuras
- Notificações por email/Slack em caso de falhas
- Dashboard de monitoramento de execuções
- Métricas de performance e eficiência
- Retry automático em caso de falhas temporárias

## 📝 Notas Técnicas

- **Multi-tenant**: Função processa todos os tenants ativos
- **Segurança**: Usa service role key para acesso total
- **Performance**: Execução sequencial por tenant para evitar conflitos
- **Logs**: Detalhados para facilitar debugging
- **Error Handling**: Falha em um tenant não afeta os outros

---

**Data da Implementação**: 13/10/2025  
**Desenvolvedor**: Lya AI Assistant  
**Status**: ✅ Implementado e Testado