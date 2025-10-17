# Manual de Configuração e Memória Persistente - Webhook ASAAS

**Data de Criação:** Janeiro 2025  
**Última Atualização:** Janeiro 2025  
**Status:** 🔴 ÁREA CRÍTICA  
**Autor:** Barcelitos (AI Agent)

## 📋 Visão Geral

Este documento serve como manual de configuração e memória persistente para o sistema de webhooks ASAAS, incluindo sua implementação, manutenção e evolução.

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **AsaasWebhookService** (`src/services/asaas/webhookService.ts`)
   - Gerenciamento de webhooks via API ASAAS
   - Suporte multi-tenant
   - Ambientes sandbox e produção

2. **Edge Function** (`asaas-webhook-charges/index.ts`)
   - Processamento de webhooks
   - Validação HMAC SHA-256
   - Proteção contra duplicatas

3. **Banco de Dados**
   - Tabela `tenant_integrations` para configurações
   - Tabela `conciliation_staging` para processamento
   - Constraints de segurança multi-tenant

## 🔧 Configuração do Webhook

### Pré-requisitos

1. Conta ASAAS ativa
2. Credenciais de API configuradas
3. Permissões adequadas no sistema

### Estrutura do Webhook

- **URL:** Endpoint único por tenant
- **Token:** Gerado automaticamente
- **Versão API:** v3
- **Modo:** Sequencial

### Processo de Configuração

1. Acesse o painel administrativo
2. Navegue até "Integrações > ASAAS"
3. Clique em "Configurar Webhook"
4. Sistema configura automaticamente:
   - Token seguro
   - Webhook no ASAAS
   - Configurações no banco

## 🔐 Segurança

### Medidas Implementadas

1. **Token por Tenant**
   - Único por integração
   - Rotação automática

2. **Validação HMAC**
   - SHA-256
   - Por tenant

3. **Isolamento**
   - Multi-tenancy
   - RLS policies

4. **Monitoramento**
   - Logs detalhados
   - Alertas de falha

## 📊 Estrutura de Dados

### Tabela `tenant_integrations`

\`\`\`sql
CREATE TABLE tenant_integrations (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  integration_type VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  environment VARCHAR,
  credentials JSONB,
  webhook_url TEXT,
  webhook_token TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR,
  error_message TEXT,
  created_by UUID,
  config JSONB
);
\`\`\`

### Configuração ASAAS (`config`)

\`\`\`json
{
  "api_key": "sua_api_key",
  "api_url": "https://api.asaas.com/v3",
  "environment": "production",
  "instance_name": "nome_instancia"
}
\`\`\`

## 🔄 Fluxo de Dados

\`\`\`
ASAAS → Webhook → Edge Function → conciliation_staging → Reconciliação
\`\`\`

### Mapeamento de Dados

- `id_externo` ← `payment.id`
- `valor` ← `payment.value`
- `status` ← `payment.status`
- `data_vencimento` ← `payment.dueDate`
- `data_pagamento` ← `payment.paymentDate`
- `customer_id` ← `payment.customer`
- `raw_data` ← payload completo (JSONB)

## ⚠️ Regras Críticas

### 🔴 NUNCA ALTERAR
1. Constraints de `tenant_id`
2. Validação HMAC SHA-256
3. Estrutura `id_externo`
4. Mapeamento status ASAAS → interno

### 🟡 ALTERAR COM CUIDADO
1. Estrutura de tabelas
2. Formato `raw_data`
3. Timeouts API
4. Rate limiting

### 🟢 SEGURO ALTERAR
1. Logs e monitoramento
2. Mensagens de erro
3. Configurações UI
4. Documentação

## 📊 Monitoramento

### Métricas Principais

1. **Webhooks**
   - Taxa de sucesso
   - Tempo de processamento
   - Erros de validação
   - Volume por tenant

2. **Importação**
   - Registros processados
   - Performance
   - Erros de API
   - Tempo por lote

3. **Reconciliação**
   - Taxa de sucesso
   - Tempo médio
   - Criação de customers
   - Discrepâncias

## 🔍 Troubleshooting

### Webhook Não Recebe Eventos

1. Verificar URL e status
2. Confirmar token
3. Checar logs
4. Testar endpoint

### Erro de Autenticação

1. Validar credenciais
2. Verificar token
3. Confirmar tenant ativo

### Dados Não Processados

1. Checar status integração
2. Validar tenant_id
3. Analisar logs

## 📚 Referências

### Código Principal
- `src/services/asaas.ts`
- `src/services/gatewayService.ts`
- `supabase/functions/asaas-proxy/index.ts`
- `src/n8n/workflows/`

### APIs
- [Documentação ASAAS](https://docs.asaas.com)
- [API Reference](https://api.asaas.com/v3/docs)
- [Webhooks](https://docs.asaas.com/reference/webhook)

## 📝 Histórico de Atualizações

| Data | Alteração | Status |
|------|-----------|---------|
| Jan 2025 | Implementação inicial | ✅ |
| Jan 2025 | Configuração multi-tenant | ✅ |
| Jan 2025 | Validação HMAC | ✅ |
| Jan 2025 | Documentação unificada | ✅ |

## ⚠️ NOTA IMPORTANTE

Este documento deve ser atualizado sempre que houver alterações no fluxo de webhooks ASAAS. Todas as mudanças devem ser documentadas aqui para manter um histórico completo e servir como referência central para a equipe.