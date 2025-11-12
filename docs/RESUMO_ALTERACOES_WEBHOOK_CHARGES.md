# 📋 Resumo das Alterações - Webhook ASAAS → Atualização de Charges

## 🎯 Objetivo

Atualizar a tabela `charges` com dados sincronizados do webhook ASAAS:
1. **Sincronizar `status`** de `charges` com `status_externo` de `conciliation_staging`
2. **Atualizar `payment_value`** de `charges` com `valor_cobranca` de `conciliation_staging`

---

## 📊 Análise das Tabelas

### Tabela `charges`
- ✅ Campo `status` existe (text, NOT NULL)
- ✅ Campo `payment_value` existe (numeric, nullable)
- ✅ Campo `asaas_id` existe (text, nullable) - usado para vinculação
- **Constraint `status`:** 'PENDING', 'RECEIVED', 'RECEIVED_IN_CASH', 'RECEIVED_PIX', 'RECEIVED_BOLETO', 'OVERDUE', 'REFUNDED', 'CONFIRMED'

### Tabela `conciliation_staging`
- ✅ Campo `status_externo` existe (text, NOT NULL)
- ✅ Campo `valor_cobranca` existe (numeric, nullable)
- **Valores encontrados em `status_externo`:** 'pending', 'received', 'overdue', 'confirmed', 'refunded' (minúsculas)

---

## 🔄 Mapeamento de Status Necessário

### Problema Identificado
- `status_externo` (conciliation_staging) usa valores em **minúsculas**: 'pending', 'received', 'overdue', 'confirmed', 'refunded'
- `status` (charges) usa valores em **MAIÚSCULAS**: 'PENDING', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CONFIRMED'

### Mapeamento Proposto
```typescript
function mapExternalStatusToChargeStatus(statusExterno: string): string {
  const statusMap: Record<string, string> = {
    "pending": "PENDING",
    "received": "RECEIVED",
    "overdue": "OVERDUE",
    "confirmed": "CONFIRMED",
    "refunded": "REFUNDED",
    "created": "PENDING",      // Default para PENDING
    "deleted": "PENDING",      // Default para PENDING
    "checkout_viewed": "PENDING", // Default para PENDING
    "anticipaded": "RECEIVED"  // Mantém o typo do constraint
  };
  return statusMap[statusExterno?.toLowerCase()] || "PENDING"; // Default para PENDING
}
```

---

## 📝 Alterações Propostas no Código

### Localização
**Arquivo:** `supabase/functions/asaas-webhook-charges/index.ts`  
**Linhas:** ~399-445 (seção de sincronização com charges)

### Mudanças

#### 1. Adicionar função de mapeamento de status
```typescript
// Nova função após mapPaymentStatusToExternal
function mapExternalStatusToChargeStatus(statusExterno: string): string {
  // Mapear status_externo (minúsculas) para status (MAIÚSCULAS)
}
```

#### 2. Buscar `status_externo` e `valor_cobranca` de `conciliation_staging`
```typescript
// Após persistir em conciliation_staging, buscar os dados persistidos
const { data: persistedData } = await supabase
  .from("conciliation_staging")
  .select("status_externo, valor_cobranca")
  .eq("tenant_id", tenantId)
  .eq("id_externo", idExterno)
  .eq("origem", "ASAAS")
  .single();
```

#### 3. Atualizar `updateData` em charges
```typescript
const updateData: any = {
  asaas_payment_date: payment.paymentDate || null,
  asaas_net_value: payment.netValue || null,
  asaas_invoice_url: payment.invoiceUrl || null,
  updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  
  // NOVO: Sincronizar status com status_externo
  status: persistedData?.status_externo 
    ? mapExternalStatusToChargeStatus(persistedData.status_externo)
    : undefined,
  
  // NOVO: Atualizar payment_value com valor_cobranca
  payment_value: persistedData?.valor_cobranca || null
};
```

---

## ⚠️ Considerações Importantes

### 1. Ordem de Execução
- Primeiro: Persistir em `conciliation_staging` (já existe)
- Depois: Buscar dados persistidos de `conciliation_staging`
- Por fim: Atualizar `charges` com os dados sincronizados

### 2. Validação de Status
- O mapeamento garante que apenas valores válidos do constraint sejam usados
- Default para "PENDING" se o status não for reconhecido

### 3. Proteção Multi-Tenant
- Todas as queries continuam filtrando por `tenant_id`
- Garantia de isolamento de dados

### 4. Tratamento de Erros
- Se a busca de `conciliation_staging` falhar, não atualiza `status` e `payment_value`
- Se o mapeamento de status falhar, usa "PENDING" como default
- Erros não interrompem o fluxo principal

---

## 📋 Resumo Executivo

### O que será adicionado:
1. ✅ Função `mapExternalStatusToChargeStatus()` para mapear status
2. ✅ Busca de `status_externo` e `valor_cobranca` após persistir em `conciliation_staging`
3. ✅ Atualização de `status` em `charges` (sincronizado com `status_externo`)
4. ✅ Atualização de `payment_value` em `charges` (sincronizado com `valor_cobranca`)

### Critério de atualização (mantido):
- ✅ Charge deve ter `asaas_id` preenchido
- ✅ `asaas_id` deve corresponder ao `payment.id` do webhook
- ✅ Charge deve pertencer ao mesmo `tenant_id`

### Colunas que serão atualizadas (adicionais):
- ✅ `status` → mapeado de `status_externo` (conciliation_staging)
- ✅ `payment_value` → valor de `valor_cobranca` (conciliation_staging)

---

## ✅ Confirmação Necessária

Antes de implementar, confirme:
1. ✅ O mapeamento de status está correto?
2. ✅ A ordem de execução (persistir → buscar → atualizar) está adequada?
3. ✅ O tratamento de erros está suficiente?
4. ✅ Devo prosseguir com a implementação?

