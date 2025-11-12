# 🔧 Correção: Dados do Customer Não Estavam Sendo Salvos no Webhook

## 📋 Problema Identificado

Os dados do customer (nome, email, documento, telefone, etc.) que estavam sendo preenchidos na tabela `conciliation_staging` pararam de ser salvos nos registros recentes.

### Situação

- ✅ **Registros antigos (novembro)**: Tinham dados do customer preenchidos
- ❌ **Registros recentes (últimos 7 dias)**: Todos os campos do customer estão `null`

### Causa Raiz

O webhook do ASAAS envia `payment.customer` como **string (ID do customer)**, não como objeto com dados completos. O código estava tentando buscar os dados na API do ASAAS, mas:

1. **Falhas silenciosas**: Se a busca falhasse, não havia logs detalhados
2. **Tratamento de erro insuficiente**: Erros não eram logados adequadamente
3. **Validação de parâmetros**: Não havia validação antes de fazer a requisição
4. **URL malformada**: Possível problema na construção da URL da API

---

## ✅ Solução Implementada

### 1. Melhorias na Função `fetchAsaasCustomer`

**Arquivo:** `supabase/functions/asaas-webhook-charges/index.ts`

#### Validações Adicionadas:
- ✅ Validação de parâmetros antes da requisição
- ✅ Limpeza do `customerId` (remover espaços)
- ✅ Construção correta da URL (evitar `/v3` duplicado)
- ✅ Validação da resposta da API
- ✅ Logs detalhados em cada etapa

#### Tratamento de Erros:
- ✅ Logs específicos para cada tipo de erro
- ✅ Tratamento especial para 404 (customer não encontrado)
- ✅ Stack trace em caso de exceções
- ✅ Não bloqueia o processamento do webhook se a busca falhar

### 2. Melhorias no Processamento do Webhook

**Arquivo:** `supabase/functions/asaas-webhook-charges/index.ts` (linhas 301-337)

#### Extração do Customer ID:
```typescript
// Suporta payment.customer como string (ID) ou objeto
let customerId: string | null = null;

if (typeof payment.customer === 'string') {
  customerId = payment.customer;
} else if (payment.customer && typeof payment.customer === 'object' && payment.customer.id) {
  customerId = payment.customer.id;
  // Se o webhook já enviar dados como objeto, usar diretamente
  customerData = payment.customer;
}
```

#### Busca na API com Logs:
```typescript
if (!customerData && customerId && integrationData.config?.api_key && integrationData.config?.api_url) {
  console.log(`🔍 Buscando dados do customer ${customerId} na API ASAAS...`);
  try {
    customerData = await fetchAsaasCustomer(...);
    if (customerData) {
      console.log(`✅ Dados do customer obtidos: ${customerData.name || 'N/A'}`);
    } else {
      console.warn(`⚠️ Não foi possível obter dados do customer ${customerId}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar customer ${customerId}:`, error);
  }
}
```

---

## 🔍 Verificações Realizadas

### 1. Configuração da Integração

✅ **Status:** Configurada corretamente
- `api_key`: Presente
- `api_url`: `https://api.asaas.com/v3`
- `is_active`: `true`

### 2. Estrutura do Payload

✅ **Confirmado:** `payment.customer` vem como **string (ID)**
- Exemplo: `"cus_000107222327"`
- Não vem como objeto com dados completos

### 3. Dados Históricos

- ✅ Registros de novembro tinham dados do customer
- ❌ Registros recentes não têm dados do customer

---

## 📊 Impacto

### Dados Afetados

- **Registros sem dados do customer**: Todos os registros criados nos últimos 7 dias
- **Campos afetados**:
  - `customer_name`
  - `customer_email`
  - `customer_document`
  - `customer_phone`
  - `customer_mobile_phone`
  - `customer_address`
  - `customer_city`
  - `customer_state`
  - E outros campos relacionados

### Importância

⚠️ **CRÍTICO**: Esses dados são essenciais para:
- Atualizar dados do cliente na tabela `customers`
- Identificar clientes em movimentos de conciliação
- Vincular movimentos a contratos
- Enviar mensagens aos clientes

---

## 🚀 Próximos Passos

### 1. Deploy da Correção

```bash
npx supabase functions deploy asaas-webhook-charges --project-ref wyehpiutzvwplllumgdk
```

### 2. Monitorar Logs

Após o deploy, monitorar os logs para verificar:
- ✅ Se a busca do customer está funcionando
- ✅ Se os dados estão sendo salvos corretamente
- ✅ Se há erros na API do ASAAS

### 3. Atualizar Registros Históricos

Criar uma função para buscar e atualizar dados do customer para registros que não têm dados:

```sql
-- Função para atualizar dados do customer em registros históricos
-- (será criada em migration separada)
```

---

## 📝 Logs Esperados

### Sucesso:
```
🔍 Buscando dados do customer cus_000107222327 na API ASAAS...
🔧 URL da API: https://api.asaas.com/v3
🌐 URL completa: https://api.asaas.com/v3/customers/cus_000107222327
📡 Status da resposta: 200 - OK
✅ Cliente encontrado: João Silva (joao@example.com)
✅ Dados do customer obtidos: João Silva
```

### Erro (404):
```
🔍 Buscando dados do customer cus_000107222327 na API ASAAS...
📡 Status da resposta: 404 - Not Found
⚠️ Customer cus_000107222327 não encontrado na API ASAAS
⚠️ Não foi possível obter dados do customer cus_000107222327
```

### Erro (Configuração):
```
⚠️ API key ou URL não configurados - não é possível buscar dados do customer
```

---

## ✅ Checklist de Validação

Após o deploy, verificar:

- [ ] Webhook está recebendo eventos
- [ ] Logs mostram tentativas de buscar customer
- [ ] Dados do customer estão sendo salvos em novos registros
- [ ] Não há erros críticos nos logs
- [ ] Registros recentes têm `customer_name`, `customer_email`, etc. preenchidos

---

## 📚 Arquivos Modificados

1. **`supabase/functions/asaas-webhook-charges/index.ts`**
   - Função `fetchAsaasCustomer`: Melhorias em validação, logs e tratamento de erros
   - Processamento do webhook: Extração correta do customer ID e busca na API

---

## 🔗 Referências

- **Webhook ASAAS:** `docs/WEBHOOK_ASAAS_FUNCIONAMENTO.md`
- **API ASAAS Customers:** https://docs.asaas.com/reference/consultar-cliente


