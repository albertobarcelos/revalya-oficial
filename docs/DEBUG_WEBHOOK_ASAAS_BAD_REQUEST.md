# Debug: Erro Bad Request ao Configurar Webhook Asaas

## Data
2025-01-13

## Problema
Ao tentar configurar o webhook do Asaas, a API retorna erro 400 (Bad Request).

## Logs Adicionados

### No `asaas-proxy/index.ts`:
1. **Log do body sanitizado** - Mostra o body sendo enviado (sem expor o authToken completo)
2. **Log detalhado de erros** - Captura a resposta completa da API Asaas quando há erro
3. **Log da URL final** - Mostra a URL completa sendo chamada

### No `webhookService.ts`:
1. **Log de debug** - Mostra o que está sendo enviado para o proxy
2. **Log da URL do webhook** - Mostra a URL gerada para o webhook

## Como Verificar os Logs

### 1. Logs do Proxy (Edge Function)
Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions/asaas-proxy/logs

Procure por:
- `Body da requisição (sanitizado):` - Verifica o que está sendo enviado
- `URL final:` - Verifica a URL completa
- `Erro na API Asaas - Detalhes completos:` - Mostra o erro exato da API

### 2. Logs do Cliente (Console do Navegador)
No console do navegador, procure por:
- `🔍 [DEBUG] Enviando requisição para asaas-proxy:` - Mostra o que está sendo preparado
- `Erro ao configurar webhook no ASAAS:` - Mostra o erro final

## Possíveis Causas do Bad Request

### 1. URL do Webhook Inválida
- A URL deve ser HTTPS válida
- A URL deve ser acessível publicamente
- Formato esperado: `https://{domain}/functions/v1/asaas-webhook-charges/{tenantId}`

### 2. Formato do Body Incorreto
- Verificar se todos os campos obrigatórios estão presentes
- Verificar se os tipos estão corretos (apiVersion como número, events como array)

### 3. Validação da API Asaas
- A API pode estar validando se a URL é acessível antes de aceitar
- A API pode estar validando o formato da URL

## Próximos Passos

1. **Verificar os logs do proxy** para ver o erro exato retornado pela API Asaas
2. **Verificar a URL do webhook** - Confirmar que está acessível
3. **Testar a URL manualmente** - Fazer uma requisição GET para verificar se responde
4. **Verificar se há webhooks existentes** - Pode haver limite de webhooks por conta

## Estrutura do Body Enviado

```json
{
  "name": "Webhook Revalya - Tenant {tenantId}",
  "url": "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/{tenantId}",
  "enabled": true,
  "interrupted": false,
  "apiVersion": 3,
  "authToken": "{token-32-chars}",
  "sendType": "SEQUENTIALLY",
  "events": [
    "PAYMENT_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_OVERDUE",
    "PAYMENT_REFUNDED",
    "PAYMENT_DELETED",
    "PAYMENT_RESTORED",
    "PAYMENT_UPDATED",
    "PAYMENT_ANTICIPATED"
  ]
}
```

## Campos Obrigatórios (segundo documentação)
- ✅ `url` - URL do webhook
- ✅ `enabled` - Boolean
- ✅ `interrupted` - Boolean  
- ✅ `apiVersion` - Integer (3)
- ✅ `authToken` - String
- ✅ `events` - Array de strings

## Campos Opcionais
- `name` - Nome do webhook
- `sendType` - "SEQUENTIALLY" ou "NON_SEQUENTIALLY"
- `email` - Email para notificações
