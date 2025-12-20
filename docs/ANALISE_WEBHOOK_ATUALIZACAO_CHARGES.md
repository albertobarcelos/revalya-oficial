# 📊 Análise: Atualização da Tabela `charges` pelo Webhook ASAAS

## ✅ Resposta Direta

**SIM**, o webhook `asaas-webhook-charges` atualiza a tabela `charges`, mas **apenas condicionalmente** e de forma **opcional** (não bloqueia o fluxo principal se falhar).

---

## 🔍 Critério de Atualização

### Condição para Atualizar

O webhook atualiza uma `charge` **APENAS** se:

1. ✅ Existe uma `charge` vinculada ao pagamento ASAAS
2. ✅ A vinculação é feita pelo campo `asaas_id` da tabela `charges`
3. ✅ O `asaas_id` da `charge` corresponde ao `payment.id` do webhook
4. ✅ A `charge` pertence ao mesmo `tenant_id` do webhook

### Query de Busca

```typescript
const { data: linkedCharge, error: chargeError } = await supabase
  .from("charges")
  .select("id, status, data_pagamento, asaas_payment_date, asaas_net_value, asaas_invoice_url")
  .eq("tenant_id", tenantId)           // 🛡️ Filtro de segurança multi-tenant
  .eq("asaas_id", payment.id)          // 🔗 Critério de vinculação
  .single();
```

**Critério de vinculação:** `charges.asaas_id = payment.id` (ID do pagamento do ASAAS)

---

## 📝 Colunas Atualizadas

### Sempre Atualizadas (se a charge for encontrada):

1. **`asaas_payment_date`**
   - Valor: `payment.paymentDate` do webhook
   - Pode ser `null` se não vier no webhook

2. **`asaas_net_value`**
   - Valor: `payment.netValue` do webhook
   - Pode ser `null` se não vier no webhook

3. **`asaas_invoice_url`**
   - Valor: `payment.invoiceUrl` do webhook
   - Pode ser `null` se não vier no webhook

4. **`updated_at`**
   - Valor: Data/hora atual (UTC-3, horário de Brasília)
   - Sempre atualizado

5. **`status`** ⭐ **NOVO**
   - Valor: Mapeado de `status_externo` (conciliation_staging)
   - Mapeamento: `pending` → `PENDING`, `received` → `RECEIVED`, `overdue` → `OVERDUE`, `confirmed` → `CONFIRMED`, `refunded` → `REFUNDED`
   - Condição: Apenas se `status_externo` existir em `conciliation_staging`

6. **`payment_value`** ⭐ **NOVO**
   - Valor: `valor_cobranca` de `conciliation_staging`
   - Condição: Apenas se `valor_cobranca` existir em `conciliation_staging`

### Atualizada Condicionalmente:

7. **`data_pagamento`**
   - **Condição:** Apenas se `payment.paymentDate` existir **E** `linkedCharge.data_pagamento` for `null` (ainda não preenchido)
   - Valor: `payment.paymentDate` do webhook
   - **Lógica:** Não sobrescreve se já existir um valor

```typescript
// Atualizar data_pagamento apenas se veio do webhook e ainda não existe
if (payment.paymentDate && !linkedCharge.data_pagamento) {
  updateData.data_pagamento = payment.paymentDate;
}
```

---

## 🔄 Fluxo de Atualização

```
1. Webhook recebe payload do ASAAS
   ↓
2. Persiste dados em conciliation_staging (sempre)
   ↓
3. Busca dados persistidos de conciliation_staging:
   - SELECT status_externo, valor_cobranca
   - WHERE tenant_id = {tenantId} AND id_externo = {payment.id} AND origem = 'ASAAS'
   ↓
4. Tenta buscar charge vinculada:
   - WHERE tenant_id = {tenantId}
   - AND asaas_id = {payment.id}
   ↓
5. Se encontrou charge:
   ✅ Atualiza asaas_payment_date
   ✅ Atualiza asaas_net_value
   ✅ Atualiza asaas_invoice_url
   ✅ Atualiza updated_at
   ✅ Atualiza status (mapeado de status_externo)
   ✅ Atualiza payment_value (de valor_cobranca)
   ✅ Atualiza data_pagamento (se ainda não existe)
   ↓
6. Se não encontrou:
   ℹ️ Apenas loga: "Nenhuma charge vinculada encontrada"
   (Não é erro - sincronização é opcional)
```

---

## ⚠️ Características Importantes

### 1. **Sincronização Opcional**
- A atualização de `charges` está dentro de um `try/catch`
- Se falhar, **não interrompe** o fluxo principal
- O webhook continua normalmente e retorna sucesso
- Erros são apenas logados, não retornados ao ASAAS

### 2. **Proteção Multi-Tenant**
- Sempre filtra por `tenant_id` na busca e na atualização
- Garante isolamento de dados entre tenants

### 3. **Proteção de Dados Existentes**
- `data_pagamento` só é atualizado se ainda não existir
- Evita sobrescrever dados já preenchidos manualmente

### 4. **Campos NÃO Atualizados**
O webhook **NÃO atualiza**:
- ❌ `valor` da charge (valor original da cobrança)
- ❌ `descricao` da charge
- ❌ `customer_id` da charge
- ❌ `contrato_id` da charge
- ❌ Outros campos de negócio

**Nota:** O campo `status` agora é atualizado sincronizado com `status_externo` de `conciliation_staging`.

---

## 📋 Resumo das Colunas Atualizadas

| Coluna | Sempre Atualizada | Condição | Valor |
|--------|-------------------|----------|-------|
| `asaas_payment_date` | ✅ Sim | Se charge encontrada | `payment.paymentDate` |
| `asaas_net_value` | ✅ Sim | Se charge encontrada | `payment.netValue` |
| `asaas_invoice_url` | ✅ Sim | Se charge encontrada | `payment.invoiceUrl` |
| `updated_at` | ✅ Sim | Se charge encontrada | Data/hora atual |
| **`status`** | **✅ Sim** | **Se charge encontrada e `status_externo` existir** | **Mapeado de `status_externo` (conciliation_staging)** |
| **`payment_value`** | **✅ Sim** | **Se charge encontrada e `valor_cobranca` existir** | **`valor_cobranca` (conciliation_staging)** |
| `data_pagamento` | ⚠️ Condicional | Se charge encontrada **E** `data_pagamento` for `null` | `payment.paymentDate` |

---

## 🔗 Critério de Vinculação

**Campo de vinculação:** `charges.asaas_id`

**Valor usado:** `payment.id` (ID do pagamento do ASAAS)

**Query:**
```sql
SELECT * FROM charges 
WHERE tenant_id = '{tenantId}' 
  AND asaas_id = '{payment.id}'
```

---

## 💡 Observações

1. **A charge precisa ter `asaas_id` preenchido** para ser encontrada e atualizada
2. **A atualização é unidirecional:** Webhook → Charge (não cria charges, apenas atualiza existentes)
3. **A sincronização é assíncrona e opcional:** Falhas não afetam o processamento do webhook
4. **Dados completos ficam em `conciliation_staging`:** Mesmo que a charge não seja atualizada, todos os dados do webhook são persistidos em `conciliation_staging`

---

## 🎯 Conclusão

O webhook atualiza `charges` de forma **inteligente e segura**:
- ✅ Apenas se houver vinculação prévia (`asaas_id`)
- ✅ Protegido por multi-tenant (`tenant_id`)
- ✅ Não sobrescreve dados existentes (`data_pagamento`)
- ✅ Não bloqueia o fluxo principal se falhar
- ✅ Atualiza apenas campos relacionados ao pagamento ASAAS
- ✅ **Sincroniza `status` com `status_externo` de `conciliation_staging`** ⭐
- ✅ **Sincroniza `payment_value` com `valor_cobranca` de `conciliation_staging`** ⭐

