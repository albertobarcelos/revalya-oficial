# 📡 Webhook ASAAS - Documentação Completa

## 🎯 Visão Geral

O webhook do ASAAS é uma **Edge Function** do Supabase que recebe notificações em tempo real sobre mudanças de status de pagamentos e atualiza automaticamente as cobranças no sistema Revalya.

**Localização:** `supabase/functions/asaas-webhook-charges/index.ts`

---

## 🔄 Fluxo Completo do Webhook

### 1. **Recepção do Webhook**

```
ASAAS → POST /functions/v1/asaas-webhook-charges/{tenant_id}
```

**Características:**
- ✅ **JWT desabilitado** (`verifyJWT: false`) - necessário para webhooks externos
- ✅ Suporta **POST** (webhooks) e **GET** (consultas)
- ✅ CORS configurado para aceitar requisições do ASAAS

### 2. **Extração do Tenant ID**

O tenant é extraído da URL:
```typescript
const url = new URL(req.url);
const pathParts = url.pathname.split("/");
const tenantId = pathParts[pathParts.length - 1];
```

**URL de exemplo:**
```
https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/{tenant_id}
```

### 3. **Validação de Segurança**

#### 3.1. Buscar Configuração da Integração
```typescript
const { data: integrationData } = await supabase
  .from("tenant_integrations")
  .select("id, webhook_token, config")
  .eq("tenant_id", tenantId)
  .eq("integration_type", "asaas")
  .eq("is_active", true)
  .maybeSingle();
```

#### 3.2. Validar Token de Webhook
O token pode vir em vários headers (flexibilidade):
- `asaas-access-token`
- `x-asaas-access-token`
- `x-webhook-token`
- `authorization` (Bearer token)

```typescript
const accessToken = req.headers.get("asaas-access-token") || 
                   req.headers.get("x-asaas-access-token") || 
                   req.headers.get("x-webhook-token") || 
                   req.headers.get("authorization")?.replace("Bearer ", "");

if (!accessToken || accessToken.trim() !== integrationData.webhook_token.trim()) {
  return new Response({ error: "Não autorizado" }, { status: 401 });
}
```

### 4. **Processamento do Payload**

#### 4.1. Parse e Extração de Dados
```typescript
const payload = await req.json();
const eventId = payload.event?.id || crypto.randomUUID();
const eventType = payload.event?.type || payload.event || "UNKNOWN";
const payment = payload.payment || {};
```

#### 4.2. Buscar Dados do Cliente (Opcional)
Se `payment.customer` estiver presente, busca dados completos na API ASAAS:

```typescript
if (payment.customer && integrationData.config?.api_key && integrationData.config?.api_url) {
  customerData = await fetchAsaasCustomer(
    payment.customer, 
    integrationData.config.api_key,
    integrationData.config.api_url
  );
}
```

**Endpoint usado:** `GET {api_url}/v3/customers/{customerId}`

### 5. **Idempotência - Prevenir Duplicatas**

Verifica se o evento já foi processado:

```typescript
const { data: existing } = await supabase
  .from("integration_processed_events")
  .select("id")
  .eq("tenant_id", tenantId)
  .eq("integration_id", integrationData.id)
  .eq("event_id", eventId)
  .maybeSingle();

if (existing) {
  return new Response({ message: "Evento já processado" }, { status: 200 });
}
```

### 6. **Registrar Evento Processado**

```typescript
await supabase.from("integration_processed_events").insert({
  tenant_id: tenantId,
  integration_id: integrationData.id,
  event_type: eventType,
  event_id: eventId,
  status: "processed",
  payload,
  processed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // UTC-3 (Brasília)
});
```

### 7. **Persistir na Tabela `conciliation_staging`**

#### 7.1. Mapeamento de Status
```typescript
function mapPaymentStatusToExternal(status: string): string {
  const statusMap = {
    "PENDING": "pending",
    "RECEIVED": "received",
    "PAID": "received",
    "CONFIRMED": "confirmed",
    "OVERDUE": "overdue",
    "REFUNDED": "refunded",
    // ... outros status
  };
  return statusMap[status] || "pending";
}
```

#### 7.2. UPSERT na Tabela
```typescript
const { error: persistError } = await supabase
  .from("conciliation_staging")
  .upsert({
    tenant_id: tenantId,
    origem: "ASAAS",
    id_externo: payment.id || eventId || crypto.randomUUID(),
    asaas_customer_id: payment.customer,
    asaas_subscription_id: payment.subscription,
    valor_cobranca: payment.value,
    valor_pago: payment.netValue ?? 0,
    valor_original: payment.originalValue,
    valor_liquido: payment.netValue ?? 0,
    taxa_juros: payment.interest?.value ?? 0,
    taxa_multa: payment.fine?.value ?? 0,
    valor_desconto: payment.discount?.value ?? 0,
    status_externo: mapPaymentStatusToExternal(payment.status || "pending"),
    status_conciliacao: "PENDENTE",
    // Datas
    data_vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString() : null,
    data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
    // ... outras datas
    // Dados do cliente (da API)
    customer_name: customerData?.name || null,
    customer_email: customerData?.email || null,
    customer_document: customerData?.cpfCnpj || null,
    // ... outros campos do cliente
    webhook_event: eventType,
    raw_data: payload,
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  }, {
    onConflict: "tenant_id,id_externo,origem",
    ignoreDuplicates: false
  });
```

**Chave única:** `(tenant_id, id_externo, origem)`

### 8. **Sincronização com Tabela `charges` (Opcional)**

Se houver uma cobrança vinculada pelo `asaas_id`:

```typescript
// Buscar charge vinculada
const { data: linkedCharge } = await supabase
  .from("charges")
  .select("id, status, data_pagamento, asaas_payment_date, asaas_net_value, asaas_invoice_url")
  .eq("tenant_id", tenantId)
  .eq("asaas_id", payment.id)
  .single();

if (linkedCharge) {
  // Atualizar charge com dados do webhook
  const updateData = {
    asaas_payment_date: payment.paymentDate || null,
    asaas_net_value: payment.netValue || null,
    asaas_invoice_url: payment.invoiceUrl || null,
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  };

  // Atualizar data_pagamento apenas se ainda não existe
  if (payment.paymentDate && !linkedCharge.data_pagamento) {
    updateData.data_pagamento = payment.paymentDate;
  }

  await supabase
    .from("charges")
    .update(updateData)
    .eq("id", linkedCharge.id)
    .eq("tenant_id", tenantId);
}
```

### 9. **Resposta de Sucesso**

```typescript
return new Response(JSON.stringify({
  success: true,
  message: "Webhook processado com sucesso",
  eventType,
  eventId
}), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

---

## 📊 Estrutura de Dados

### Tabela `conciliation_staging`

**Campos principais:**
- `id` (UUID) - Chave primária
- `tenant_id` (UUID) - ID do tenant
- `origem` (TEXT) - Origem da movimentação ("ASAAS")
- `id_externo` (TEXT) - ID do pagamento no ASAAS
- `valor_cobranca` (NUMERIC) - Valor original da cobrança
- `valor_pago` (NUMERIC) - Valor pago (netValue)
- `valor_liquido` (NUMERIC) - Valor líquido recebido
- `status_externo` (TEXT) - Status do pagamento no ASAAS
- `status_conciliacao` (TEXT) - Status de conciliação ("PENDENTE", "CONCILIADO", etc.)
- `data_vencimento` (TIMESTAMP) - Data de vencimento
- `data_pagamento` (TIMESTAMP) - Data de pagamento
- `asaas_customer_id` (TEXT) - ID do cliente no ASAAS
- `customer_name`, `customer_email`, `customer_document` - Dados do cliente
- `raw_data` (JSONB) - Payload completo do webhook

**Constraint único:** `(tenant_id, id_externo, origem)`

### Tabela `tenant_integrations`

**Campos principais:**
- `id` (INTEGER) - Chave primária
- `tenant_id` (UUID) - ID do tenant
- `integration_type` (TEXT) - Tipo de integração ("asaas")
- `is_active` (BOOLEAN) - Se a integração está ativa
- `webhook_token` (TEXT) - Token para validação de webhooks
- `webhook_url` (TEXT) - URL do webhook configurada
- `config` (JSONB) - Configurações (api_key, api_url, etc.)

### Tabela `integration_processed_events`

**Campos principais:**
- `tenant_id` (UUID)
- `integration_id` (INTEGER)
- `event_id` (TEXT) - ID único do evento
- `event_type` (TEXT) - Tipo do evento
- `status` (TEXT) - Status do processamento
- `payload` (JSONB) - Payload completo
- `processed_at` (TIMESTAMP)

**Usado para:** Prevenir processamento duplicado de eventos

---

## 🔐 Segurança

### 1. **Validação de Token**
- Token obrigatório no header
- Comparação exata com `webhook_token` da integração
- Suporta múltiplos formatos de header

### 2. **Multi-Tenant**
- Tenant ID extraído da URL
- Todas as queries filtram por `tenant_id`
- RLS (Row Level Security) ativo no banco

### 3. **Idempotência**
- Eventos duplicados são ignorados
- Registro em `integration_processed_events`

### 4. **Validação de Dados**
- Valores nulos tratados com `?? 0`
- Datas convertidas para ISO string
- URLs limpas (remove vírgulas no final)

---

## 🎯 Tipos de Eventos Processados

O webhook processa diferentes tipos de eventos do ASAAS:

- `PAYMENT_CREATED` - Pagamento criado
- `PAYMENT_UPDATED` - Pagamento atualizado
- `PAYMENT_RECEIVED` - Pagamento recebido
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_DELETED` - Pagamento deletado
- `PAYMENT_ANTICIPATED` - Pagamento antecipado
- E outros...

---

## 🔄 Fluxo de Sincronização

```
1. ASAAS envia webhook
   ↓
2. Edge Function valida token e tenant
   ↓
3. Busca dados do cliente na API ASAAS (se necessário)
   ↓
4. Verifica idempotência
   ↓
5. Registra evento processado
   ↓
6. UPSERT em conciliation_staging
   ↓
7. Se houver charge vinculada, atualiza charges
   ↓
8. Retorna sucesso
```

---

## 📝 Observações Importantes

### 1. **Horário de Brasília (UTC-3)**
Todos os timestamps são ajustados para UTC-3:
```typescript
new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
```

### 2. **Tratamento de netValue**
```typescript
const netValueSafe = payment.netValue ?? 0;
```
Garante que `valor_pago` e `valor_liquido` sempre tenham um valor numérico.

### 3. **Limpeza de URLs**
```typescript
invoice_url: payment.invoiceUrl?.replace(/,$/, '') || null
```
Remove vírgulas no final das URLs (bug conhecido do ASAAS).

### 4. **Mapeamento de Status**
O status do ASAAS é mapeado para valores válidos do constraint do banco:
- `PAID` → `received`
- `RECEIVED` → `received`
- `OVERDUE` → `overdue`
- etc.

### 5. **Sincronização Opcional**
A atualização da tabela `charges` é opcional e não interrompe o fluxo principal se falhar.

---

## 🛠️ Endpoint GET (Consulta)

Além de receber webhooks (POST), a função também suporta consultas GET:

```
GET /functions/v1/asaas-webhook-charges/{tenant_id}?customer_id={customer_id}
```

**Funcionalidade:**
- Busca dados de um cliente na API ASAAS
- Retorna informações completas do cliente
- Útil para sincronização manual ou debug

---

## 📚 Referências

- **Edge Function:** `supabase/functions/asaas-webhook-charges/index.ts`
- **Serviço Frontend:** `src/services/webhookSyncService.ts`
- **Documentação ASAAS:** https://docs.asaas.com/

---

## ✅ Checklist de Configuração

Para que o webhook funcione corretamente:

- [ ] Integração ASAAS cadastrada em `tenant_integrations`
- [ ] `integration_type = 'asaas'` (minúsculo)
- [ ] `is_active = true`
- [ ] `webhook_token` configurado
- [ ] `config.api_key` configurado
- [ ] `config.api_url` configurado
- [ ] URL do webhook configurada no painel ASAAS
- [ ] Token do webhook configurado no painel ASAAS

---

**Última atualização:** Janeiro 2025
**Versão da Edge Function:** 42

