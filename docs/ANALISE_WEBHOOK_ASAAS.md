# Análise: Configuração de Webhook Asaas

## Data da Análise
2025-01-13

## Objetivo
Verificar se é possível fazer o botão "Configurar Webhook" funcionar corretamente através da API do Asaas.

## Resultado da Análise
✅ **SIM, é possível fazer o botão funcionar**, porém existem problemas na implementação atual que precisam ser corrigidos.

## Problemas Identificados

### 1. URL do Endpoint Incorreta
- **Código atual**: `/v3/webhook` (singular)
- **Documentação Asaas**: `/v3/webhooks` (plural)
- **Localização**: `src/services/asaas/webhookService.ts`, linha 57

### 2. Estrutura do Body Incorreta
- **Código atual**: Envia `type: 'PAYMENT'`
- **Documentação Asaas**: Exige um array `events` com eventos específicos
- **Eventos recomendados para pagamentos**:
  - `PAYMENT_RECEIVED` - Pagamento recebido
  - `PAYMENT_CONFIRMED` - Pagamento confirmado
  - `PAYMENT_OVERDUE` - Pagamento vencido
  - `PAYMENT_REFUNDED` - Pagamento estornado
  - `PAYMENT_DELETED` - Pagamento deletado

### 3. Campos Faltantes (Opcionais mas Recomendados)
- `name`: Nome do webhook (opcional)
- `sendType`: Tipo de envio - `SEQUENTIALLY` ou `NON_SEQUENTIALLY` (opcional)

### 4. Problema na Remoção de Webhook
- **Código atual**: Tenta deletar usando `/v3/webhook` (DELETE)
- **Documentação Asaas**: Exige `/v3/webhooks/{id}` (DELETE)
- **Solução**: Primeiro listar os webhooks, encontrar o ID do webhook do tenant, e então deletar usando o ID

## Estrutura Correta do Request Body

Segundo a documentação oficial do Asaas:

```json
{
  "name": "Webhook Revalya - Tenant {tenantId}",
  "url": "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/{tenantId}",
  "enabled": true,
  "interrupted": false,
  "apiVersion": 3,
  "authToken": "token-gerado-aleatoriamente",
  "sendType": "SEQUENTIALLY",
  "events": [
    "PAYMENT_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_OVERDUE",
    "PAYMENT_REFUNDED",
    "PAYMENT_DELETED",
    "PAYMENT_RESTORED"
  ]
}
```

## Endpoints da API Asaas

### POST /v3/webhooks
- **Descrição**: Criar novo webhook
- **Headers**: 
  - `access_token`: API Key do Asaas
  - `Content-Type`: application/json

### GET /v3/webhooks
- **Descrição**: Listar todos os webhooks
- **Query params**: `offset`, `limit` (max: 100)
- **Retorno**: Lista de webhooks com seus IDs

### DELETE /v3/webhooks/{id}
- **Descrição**: Remover webhook específico
- **Parâmetro**: `id` (ID do webhook)

## Fluxo Correto de Implementação

### Para Configurar Webhook:
1. Verificar se credenciais do Asaas estão configuradas
2. Gerar URL do webhook: `{SUPABASE_FUNCTIONS_URL}/asaas-webhook-charges/{tenantId}`
3. Gerar token de autenticação seguro
4. Fazer POST para `/v3/webhooks` com body correto
5. Salvar configuração no banco de dados

### Para Remover Webhook:
1. Listar webhooks usando GET `/v3/webhooks`
2. Encontrar o webhook pela URL
3. Deletar usando DELETE `/v3/webhooks/{id}`
4. Limpar configuração no banco de dados

## Conclusão

O botão "Configurar Webhook" **pode funcionar** após as correções:
- ✅ API do Asaas suporta criação de webhooks
- ✅ Endpoint existe e está documentado
- ✅ Estrutura de dados é clara
- ⚠️ Código atual precisa ser corrigido para seguir a documentação oficial

## Próximos Passos

1. Corrigir URL do endpoint (singular → plural)
2. Corrigir estrutura do body (type → events array)
3. Implementar lógica correta para remoção (buscar ID primeiro)
4. Adicionar campos opcionais recomendados (name, sendType)
5. Testar integração com API do Asaas
