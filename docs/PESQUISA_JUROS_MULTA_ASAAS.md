# 🔍 Pesquisa: Juros, Multa e Valor Total Atualizado - ASAAS

## 📋 Objetivo

Investigar como obter o **valor total atualizado** de uma cobrança vencida no ASAAS, incluindo juros e multa, para garantir que o valor exibido no sistema corresponda ao valor que o cliente verá ao abrir o link do boleto/PIX.

---

## ✅ O Que Já Recebemos no Webhook

### Campos Disponíveis no Webhook ASAAS

```typescript
interface AsaasWebhookPayment {
  // Valores individuais
  value: number;                    // ✅ Valor original da cobrança
  originalValue?: number;           // ✅ Valor original (se diferente)
  netValue: number;                 // ✅ Valor líquido recebido (após taxas)
  
  // Juros, Multa e Desconto
  interest?: {                      // ✅ JÁ RECEBEMOS
    value: number;                  // Valor de juros
  };
  fine?: {                          // ✅ JÁ RECEBEMOS
    value: number;                  // Valor de multa
  };
  discount?: {                      // ✅ JÁ RECEBEMOS
    value: number;                  // Valor de desconto
  };
}
```

### Mapeamento Atual no Webhook

**Arquivo:** `supabase/functions/asaas-webhook-charges/index.ts`

```typescript
// Linhas 363-365
taxa_juros: payment.interest?.value ?? 0,      // ✅ Salvo em conciliation_staging
taxa_multa: payment.fine?.value ?? 0,          // ✅ Salvo em conciliation_staging
valor_desconto: payment.discount?.value ?? 0, // ✅ Salvo em conciliation_staging
valor_cobranca: payment.value,                 // ✅ Valor original
valor_liquido: payment.netValue ?? 0,         // ✅ Valor líquido recebido
```

---

## 🎯 Problema Identificado

### Situação Atual

1. **Valor Original**: `payment.value` → `valor_cobranca`
2. **Juros**: `payment.interest?.value` → `taxa_juros`
3. **Multa**: `payment.fine?.value` → `taxa_multa`
4. **Desconto**: `payment.discount?.value` → `valor_desconto`
5. **Valor Líquido**: `payment.netValue` → `valor_liquido` (valor recebido após taxas)

### ⚠️ O Que Está Faltando

**Valor Total Atualizado** = Valor que o cliente deve pagar AGORA (incluindo juros e multa se vencido)

**Fórmula:**
```
Valor Total = valor_original + juros + multa - desconto
```

**OU**

```
Valor Total = payment.value + (payment.interest?.value || 0) + (payment.fine?.value || 0) - (payment.discount?.value || 0)
```

---

## 🔍 Análise do Webhook

### Campos Disponíveis no Webhook

| Campo | Tipo | Descrição | Status |
|-------|------|-----------|--------|
| `value` | number | Valor original da cobrança | ✅ Recebido |
| `originalValue` | number | Valor original (se diferente) | ✅ Recebido |
| `netValue` | number | Valor líquido recebido | ✅ Recebido |
| `interest.value` | number | Valor de juros | ✅ Recebido |
| `fine.value` | number | Valor de multa | ✅ Recebido |
| `discount.value` | number | Valor de desconto | ✅ Recebido |

### ❓ Campo "Valor Total Atualizado"

**Pergunta:** O webhook envia um campo com o valor total atualizado?

**Resposta:** **NÃO diretamente**, mas podemos calcular:

```typescript
const valorTotalAtualizado = payment.value 
  + (payment.interest?.value || 0)
  + (payment.fine?.value || 0)
  - (payment.discount?.value || 0);
```

**OU** usar `payment.netValue` se o pagamento já foi recebido (mas isso não serve para cobranças vencidas não pagas).

---

## 🔄 Buscar Via API ASAAS

### Endpoint: GET /payments/{payment_id}

**URL:** `{api_url}/v3/payments/{payment_id}`

**Headers:**
```
access_token: {api_key}
Content-Type: application/json
```

### Resposta da API

```json
{
  "id": "pay_123456789",
  "customer": "cus_123456789",
  "value": 1000.00,              // Valor original
  "netValue": 1050.00,           // Valor líquido (se pago)
  "originalValue": 1000.00,      // Valor original
  "interest": {
    "value": 30.00               // Juros aplicados
  },
  "fine": {
    "value": 20.00               // Multa aplicada
  },
  "discount": {
    "value": 0.00                // Desconto aplicado
  },
  "status": "OVERDUE",           // Status atual
  "dueDate": "2025-01-10",       // Data de vencimento
  "paymentDate": null,           // Data de pagamento (null se não pago)
  // ... outros campos
}
```

### Cálculo do Valor Total Atualizado

```typescript
function calcularValorTotalAtualizado(payment: AsaasPayment): number {
  const valorOriginal = payment.originalValue || payment.value;
  const juros = payment.interest?.value || 0;
  const multa = payment.fine?.value || 0;
  const desconto = payment.discount?.value || 0;
  
  return valorOriginal + juros + multa - desconto;
}
```

---

## 💡 Soluções Propostas

### Solução 1: Calcular no Webhook (Recomendado)

**Vantagens:**
- ✅ Dados já disponíveis no webhook
- ✅ Não precisa fazer requisição adicional
- ✅ Atualização em tempo real

**Implementação:**

```typescript
// No webhook asaas-webhook-charges/index.ts
const valorTotalAtualizado = payment.value 
  + (payment.interest?.value || 0)
  + (payment.fine?.value || 0)
  - (payment.discount?.value || 0);

// Adicionar ao upsertData
upsertData.valor_total_atualizado = valorTotalAtualizado;
```

**Pré-requisito:** Adicionar campo `valor_total_atualizado` na tabela `conciliation_staging`.

---

### Solução 2: Buscar Via API no Cron Job

**Vantagens:**
- ✅ Sempre obtém valor mais atualizado
- ✅ Útil para cobranças vencidas que não receberam webhook recente

**Desvantagens:**
- ⚠️ Requer requisição HTTP adicional
- ⚠️ Mais lento
- ⚠️ Depende da API do ASAAS estar disponível

**Implementação:**

```typescript
// No cron job sync-charges-from-staging
async function buscarValorAtualizadoAsaas(paymentId: string, apiKey: string, apiUrl: string) {
  const response = await fetch(`${apiUrl}/v3/payments/${paymentId}`, {
    headers: {
      'access_token': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar pagamento: ${response.statusText}`);
  }
  
  const payment = await response.json();
  
  return {
    valorTotal: payment.value 
      + (payment.interest?.value || 0)
      + (payment.fine?.value || 0)
      - (payment.discount?.value || 0),
    juros: payment.interest?.value || 0,
    multa: payment.fine?.value || 0,
    desconto: payment.discount?.value || 0
  };
}
```

---

### Solução 3: Híbrida (Webhook + API quando necessário)

**Estratégia:**
1. **Webhook**: Calcula e salva `valor_total_atualizado` quando recebe evento
2. **Cron Job**: Para cobranças vencidas (`status = 'OVERDUE'`), busca valor atualizado via API periodicamente

**Implementação:**

```typescript
// No cron job, para cobranças vencidas
if (movement.status_externo === 'overdue' && movement.id_externo) {
  try {
    const valorAtualizado = await buscarValorAtualizadoAsaas(
      movement.id_externo,
      apiKey,
      apiUrl
    );
    
    // Atualizar conciliation_staging com valor atualizado
    await supabase
      .from('conciliation_staging')
      .update({
        valor_total_atualizado: valorAtualizado.valorTotal,
        taxa_juros: valorAtualizado.juros,
        taxa_multa: valorAtualizado.multa,
        valor_desconto: valorAtualizado.desconto
      })
      .eq('id', movement.id);
  } catch (error) {
    console.error('Erro ao buscar valor atualizado:', error);
  }
}
```

---

## 📊 Estrutura de Dados Atual

### Tabela `conciliation_staging`

**Campos relacionados a valores:**
- ✅ `valor_cobranca` (NUMERIC) - Valor original
- ✅ `valor_pago` (NUMERIC) - Valor pago
- ✅ `valor_liquido` (NUMERIC) - Valor líquido recebido
- ✅ `valor_original` (NUMERIC) - Valor original
- ✅ `taxa_juros` (NUMERIC) - Juros
- ✅ `taxa_multa` (NUMERIC) - Multa
- ✅ `valor_desconto` (NUMERIC) - Desconto
- ❌ `valor_total_atualizado` (NUMERIC) - **NÃO EXISTE** (precisa criar)

### Tabela `charges`

**Campos relacionados a valores:**
- ✅ `valor` (NUMERIC) - Valor original
- ✅ `payment_value` (NUMERIC) - Valor pago
- ✅ `asaas_interest_value` (NUMERIC) - Juros do ASAAS
- ✅ `asaas_fine_value` (NUMERIC) - Multa do ASAAS
- ✅ `asaas_discount_value` (NUMERIC) - Desconto do ASAAS
- ❌ `valor_total_atualizado` (NUMERIC) - **NÃO EXISTE** (precisa criar)

---

## 🎯 Recomendações

### 1. Adicionar Campo `valor_total_atualizado`

**Migration SQL:**

```sql
-- Adicionar campo em conciliation_staging
ALTER TABLE conciliation_staging
ADD COLUMN IF NOT EXISTS valor_total_atualizado NUMERIC;

-- Adicionar campo em charges
ALTER TABLE charges
ADD COLUMN IF NOT EXISTS valor_total_atualizado NUMERIC;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_conciliation_staging_valor_total 
ON conciliation_staging(valor_total_atualizado);

CREATE INDEX IF NOT EXISTS idx_charges_valor_total 
ON charges(valor_total_atualizado);
```

### 2. Atualizar Webhook para Calcular e Salvar

```typescript
// Calcular valor total atualizado
const valorTotalAtualizado = payment.value 
  + (payment.interest?.value || 0)
  + (payment.fine?.value || 0)
  - (payment.discount?.value || 0);

// Adicionar ao upsertData
upsertData.valor_total_atualizado = valorTotalAtualizado;
```

### 3. Atualizar Cron Job para Buscar Valores Atualizados

Para cobranças vencidas, buscar periodicamente via API do ASAAS.

### 4. Sincronizar com Tabela `charges`

Atualizar `charges.valor_total_atualizado` quando sincronizar de `conciliation_staging`.

---

## 📝 Exemplo de Cálculo

### Cenário: Cobrança Vencida

```
Valor Original: R$ 1.000,00
Juros (2% ao mês, 10 dias): R$ 6,67
Multa (2%): R$ 20,00
Desconto: R$ 0,00

Valor Total Atualizado = 1.000,00 + 6,67 + 20,00 - 0,00
Valor Total Atualizado = R$ 1.026,67
```

### No Webhook

```json
{
  "value": 1000.00,
  "interest": { "value": 6.67 },
  "fine": { "value": 20.00 },
  "discount": { "value": 0.00 }
}
```

**Cálculo:**
```typescript
const valorTotal = 1000.00 + 6.67 + 20.00 - 0.00; // = 1026.67
```

---

## ✅ Conclusão

### Resposta à Pergunta

**Sim, conseguimos obter juros e multa:**

1. ✅ **Via Webhook**: Já recebemos `interest.value` e `fine.value`
2. ✅ **Via API**: Podemos buscar via `GET /v3/payments/{id}`
3. ✅ **Cálculo**: Podemos calcular `valor_total_atualizado = original + juros + multa - desconto`

### Próximos Passos

1. ✅ Adicionar campo `valor_total_atualizado` nas tabelas
2. ✅ Atualizar webhook para calcular e salvar
3. ✅ Atualizar cron job para buscar valores atualizados de cobranças vencidas
4. ✅ Sincronizar com tabela `charges`
5. ✅ Usar `valor_total_atualizado` nas mensagens enviadas aos clientes

---

## 📚 Referências

- **Webhook ASAAS:** `supabase/functions/asaas-webhook-charges/index.ts`
- **Documentação Webhook:** `docs/WEBHOOK_ASAAS_FUNCIONAMENTO.md`
- **API ASAAS:** https://docs.asaas.com/reference/listar-cobrancas
- **Cron Job:** `supabase/migrations/20250109_sync_charges_cron.sql`

