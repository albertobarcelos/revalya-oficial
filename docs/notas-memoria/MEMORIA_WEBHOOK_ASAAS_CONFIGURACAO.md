# Memória Persistente - Configuração Webhook ASAAS

**Data de Criação:** 2025-01-09  
**Última Atualização:** 2025-01-09  
**Status:** ✅ IMPLEMENTADO  
**Criticidade:** 🔴 CRÍTICO

## 📋 Resumo da Implementação

Implementação completa da configuração automática de webhook ASAAS via API, incluindo:

1. **Serviço de Webhook** (`webhookService.ts`)
2. **Script de Configuração** (`setup-asaas-webhook.ts`)
3. **Manual Completo** (`MANUAL_CONFIGURACAO_WEBHOOK_ASAAS.md`)
4. **Edge Function** (`asaas-webhook-charges/index.ts`)
5. **Migration** (`20250109_create_conciliation_staging_table.sql`)

## 🏗️ Arquitetura Implementada

### Componentes Criados

1. **AsaasWebhookService** (`src/services/asaas/webhookService.ts`)
   - Classe para gerenciar webhooks via API ASAAS
   - Métodos: create, list, update, delete
   - Configuração automática de todos os eventos de cobrança
   - Suporte a ambientes sandbox e produção

2. **Script de Setup** (`scripts/setup-asaas-webhook.ts`)
   - Configuração automática via linha de comando
   - Geração automática de auth tokens (UUID v4)
   - Validação de pré-requisitos
   - Detecção automática de webhooks existentes

3. **Edge Function** (`supabase/functions/asaas-webhook-charges/index.ts`)
   - Processamento de webhooks ASAAS
   - Validação HMAC SHA-256
   - UPSERT na tabela `conciliation_staging`
   - Proteção contra duplicatas

4. **Migration** (`supabase/migrations/20250109_create_conciliation_staging_table.sql`)
   - Estrutura completa da tabela
   - Constraints de integridade
   - Índices de performance
   - RLS policies para multi-tenancy

## 🔧 Configuração Automática

### Comando Principal
```bash
npm run setup:asaas-webhook -- --env=sandbox --email=seu@email.com
```

### Variáveis de Ambiente Necessárias
- `ASAAS_SANDBOX_API_KEY` ou `ASAAS_PROD_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

### Eventos Configurados (23 total)
- PAYMENT_CREATED, PAYMENT_UPDATED, PAYMENT_CONFIRMED
- PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED
- PAYMENT_RESTORED, PAYMENT_REFUNDED, PAYMENT_REFUND_IN_PROGRESS
- PAYMENT_RECEIVED_IN_CASH_UNDONE, PAYMENT_CHARGEBACK_REQUESTED
- PAYMENT_CHARGEBACK_DISPUTE, PAYMENT_AWAITING_CHARGEBACK_REVERSAL
- PAYMENT_DUNNING_REQUESTED, PAYMENT_DUNNING_RECEIVED
- PAYMENT_BANK_SLIP_VIEWED, PAYMENT_CHECKOUT_VIEWED
- PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, PAYMENT_ANTICIPATED
- PAYMENT_AUTHORIZED, PAYMENT_AWAITING_RISK_ANALYSIS
- PAYMENT_APPROVED_BY_RISK_ANALYSIS, PAYMENT_REPROVED_BY_RISK_ANALYSIS

## 🔐 Segurança Implementada

### Validações na Edge Function
1. **CORS Headers** - Configurados para ASAAS
2. **HMAC SHA-256** - Validação de assinatura
3. **Auth Token** - Header `asaas-access-token`
4. **Tenant Validation** - Verificação de tenant_id
5. **Duplicate Prevention** - UPSERT com constraint única

### Constraints de Banco
- `unique_external_id_per_tenant` - Previne duplicatas
- `check_positive_values` - Valores monetários positivos
- `check_logical_dates` - Datas lógicas
- RLS policies por tenant

## 📊 Fluxo de Dados

```
ASAAS → Webhook → Edge Function → conciliation_staging → Reconciliação
```

### Mapeamento de Dados
- `id_externo` ← `payment.id`
- `valor` ← `payment.value`
- `status` ← `payment.status`
- `data_vencimento` ← `payment.dueDate`
- `data_pagamento` ← `payment.paymentDate`
- `customer_id` ← `payment.customer`
- `raw_data` ← payload completo (JSONB)

## 🚨 Regras Críticas

### NUNCA ALTERAR
- Constraint `unique_external_id_per_tenant`
- Validação HMAC na Edge Function
- Estrutura do campo `raw_data` (JSONB)
- Mapeamento de `tenant_id`

### ALTERAR COM CUIDADO
- Lista de eventos do webhook
- Estrutura da tabela `conciliation_staging`
- Lógica de determinação de tenant
- Headers de CORS

## 📝 Arquivos de Referência

### Implementação
- `src/services/asaas/webhookService.ts` - Serviço principal
- `scripts/setup-asaas-webhook.ts` - Script de configuração
- `supabase/functions/asaas-webhook-charges/index.ts` - Edge Function
- `supabase/migrations/20250109_create_conciliation_staging_table.sql` - Migration

### Documentação
- `docs/MANUAL_CONFIGURACAO_WEBHOOK_ASAAS.md` - Manual completo
- `docs/INTEGRAÇÕES/INTEGRAÇÕES SISTEMAS/ASAAS/ESTRUTURA_COBRANÇA_ASAAS.md` - Arquitetura
- `docs/notas-memoria/MEMORIA_ESTRUTURA_COBRANCA_ASAAS.md` - Memória da estrutura

### Configuração
- `package.json` - Script `setup:asaas-webhook`
- `supabase/functions/cors.ts` - Headers CORS atualizados

## 🔍 Monitoramento

### Métricas Importantes
- Taxa de sucesso do webhook (deve ser ~100%)
- Tempo de resposta da Edge Function (<5s)
- Status da fila de eventos ASAAS
- Registros na tabela `conciliation_staging`

### Logs para Monitorar
- **ASAAS:** Menu → Integrações → Logs de Webhook
- **Supabase:** Edge Functions → asaas-webhook-charges → Logs
- **Banco:** Query na tabela `conciliation_staging`

## 🧪 Testes Necessários

### Próximos Passos (Em Progresso)
1. **Deploy da Migration** - Criar tabela `conciliation_staging`
2. **Deploy da Edge Function** - Implantar no Supabase
3. **Configurar Webhook** - Executar script de setup
4. **Teste com Evento Real** - Criar cobrança no ASAAS sandbox
5. **Validar Dados** - Verificar inserção na tabela

### Cenários de Teste
- Criação de cobrança
- Pagamento de cobrança
- Vencimento de cobrança
- Estorno de pagamento
- Eventos duplicados
- Falha de rede/timeout

## 🚀 Próximas Implementações

### Monitoramento e Alertas (Pendente)
- Dashboard de métricas
- Alertas por email/Slack
- Logs estruturados
- Métricas de performance

### Melhorias Futuras
- Retry automático para falhas
- Batch processing para alta volumetria
- Cache de dados de customer
- Webhook de status para cliente

## 📞 Troubleshooting

### Problemas Comuns
1. **Webhook não recebe eventos** - Verificar URL e Edge Function
2. **Fila interrompida** - Reativar no painel ASAAS
3. **Eventos duplicados** - Verificar constraint única
4. **Erro de tenant** - Validar mapeamento de tenant_id

### Comandos Úteis
```bash
# Listar webhooks existentes
curl -H "access_token: $ASAAS_API_KEY" https://api-sandbox.asaas.com/v3/webhooks

# Testar Edge Function
curl -X POST https://projeto.supabase.co/functions/v1/asaas-webhook-charges \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_CREATED","payment":{"id":"test"}}'

# Verificar dados na tabela
SELECT * FROM conciliation_staging WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 📈 Histórico de Atualizações

### 2025-01-09 - Implementação Inicial
- ✅ Criado AsaasWebhookService
- ✅ Criado script de configuração automática
- ✅ Criado Edge Function completa
- ✅ Criado migration da tabela
- ✅ Criado manual de configuração
- ✅ Adicionado script ao package.json
- ✅ Configurado CORS para ASAAS

### Próximas Atualizações
- [ ] Testes em ambiente de desenvolvimento
- [ ] Implementação de monitoramento
- [ ] Deploy em produção
- [ ] Documentação de troubleshooting avançado