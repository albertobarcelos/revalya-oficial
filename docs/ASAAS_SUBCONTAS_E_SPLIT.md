# Documentação: Subcontas e Split de Pagamento - API Asaas

## Visão Geral

A API do Asaas oferece funcionalidades para gerenciar **subcontas** (contas secundárias) e realizar **split de pagamento** (divisão automática de valores entre diferentes contas).

---

## 1. Subcontas (Subaccounts)

### 1.1 Conceito

Subcontas são contas secundárias criadas dentro de uma conta principal Asaas. Cada subconta possui:
- Identificador único (`id`)
- `walletId` - Identificador único da carteira para realizar splits ou transferências entre contas Asaas
- Dados cadastrais completos (nome, email, CPF/CNPJ, endereço, etc.)
- Número de conta próprio na Asaas
- Tokens de acesso (API keys) independentes

### 1.2 Endpoints Principais

#### Criar Subconta
```
POST /v3/accounts
```

**Campos obrigatórios:**
- `name` - Nome da subconta
- `email` - Email da subconta
- `cpfCnpj` - CPF ou CNPJ do proprietário
- `mobilePhone` - Telefone celular
- `incomeValue` - Faturamento/Renda mensal
- `address` - Logradouro
- `addressNumber` - Número do endereço
- `province` - Bairro
- `postalCode` - CEP

**Campos opcionais:**
- `loginEmail` - Email para login (se diferente do email principal)
- `birthDate` - Data de nascimento (apenas para pessoa física)
- `companyType` - Tipo de empresa (MEI, LIMITED, INDIVIDUAL, ASSOCIATION)
- `site` - URL do site
- `webhooks` - Configuração de webhooks

**Resposta inclui:**
- `id` - Identificador único da subconta
- `walletId` - **Importante**: Usado para splits e transferências
- `accountNumber` - Número da conta na Asaas (agência, conta, dígito)
- `accessToken` - Token de acesso da API com `apiKey`

#### Listar Subcontas
```
GET /v3/accounts
```

**Filtros disponíveis:**
- `cpfCnpj` - Filtrar por CPF/CNPJ
- `email` - Filtrar por email
- `name` - Filtrar por nome
- `walletId` - Filtrar por walletId

#### Consultar Subconta Específica
```
GET /v3/accounts/{id}
```

---

## 2. Split de Pagamento

### 2.1 Conceito

Split de pagamento permite dividir automaticamente o valor de um pagamento recebido entre múltiplas contas Asaas. O split é configurado no momento da criação do pagamento ou posteriormente (para parcelas).

### 2.2 Tipos de Split

#### Por Valor Fixo
- `fixedValue` - Valor fixo a ser transferido quando o pagamento for recebido

#### Por Percentual
- `percentualValue` - Percentual do valor líquido a ser transferido

#### Por Valor Total (Apenas para Parcelas)
- `totalFixedValue` - Valor total que será dividido entre todas as parcelas

### 2.3 Configuração de Split em Pagamentos

#### Ao Criar Pagamento
```
POST /v3/payments
```

**Campo `split` (array):**
```json
{
  "split": [
    {
      "walletId": "c0c1688f-636b-42c0-b6ee-7339182276b7",
      "fixedValue": 50.00,
      "description": "Comissão do parceiro",
      "externalReference": "REF-001"
    },
    {
      "walletId": "outro-wallet-id",
      "percentualValue": 10.0,
      "description": "Taxa de plataforma"
    }
  ]
}
```

**Campos do split:**
- `walletId` (obrigatório) - Identificador da carteira que receberá o split
- `fixedValue` - Valor fixo (não pode ser usado junto com `percentualValue`)
- `percentualValue` - Percentual do valor líquido
- `totalFixedValue` - Valor total para parcelas (apenas para parcelas)
- `description` - Descrição do split
- `externalReference` - Identificador externo do split no seu sistema

### 2.4 Atualizar Split em Parcelas

```
PUT /v3/installments/{id}/splits
```

Permite atualizar os splits de uma parcela existente. Útil para ajustar divisões antes do recebimento.

**Campos adicionais para parcelas:**
- `installmentNumber` - Número da parcela específica para vincular o split (não pode ser usado junto com `totalFixedValue`)

### 2.5 Consultar Splits

#### Splits Enviados (Paid)
```
GET /v3/payments/splits/paid
```

Lista os splits que você enviou para outras contas.

**Filtros:**
- `paymentId` - Filtrar por ID do pagamento
- `status` - Filtrar por status (PENDING, PROCESSING, DONE, CANCELLED, etc.)
- `paymentConfirmedDate[ge]` / `paymentConfirmedDate[le]` - Filtrar por data de confirmação
- `creditDate[ge]` / `creditDate[le]` - Filtrar por data de crédito

#### Splits Recebidos (Received)
```
GET /v3/payments/splits/received
```

Lista os splits que você recebeu de outras contas.

**Filtros:** Mesmos do endpoint de splits pagos.

#### Consultar Split Específico
```
GET /v3/payments/splits/paid/{id}
GET /v3/payments/splits/received/{id}
```

### 2.6 Status do Split

Os splits podem ter os seguintes status:

- `PENDING` - Aguardando processamento
- `PROCESSING` - Em processamento
- `PROCESSING_REFUND` - Processando reembolso
- `AWAITING_CREDIT` - Aguardando crédito
- `CANCELLED` - Cancelado
- `DONE` - Concluído
- `REFUNDED` - Reembolsado
- `BLOCKED_BY_VALUE_DIVERGENCE` - Bloqueado por divergência de valor

### 2.7 Motivos de Cancelamento

- `PAYMENT_DELETED` - Pagamento foi deletado
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_RECEIVED_IN_CASH` - Pagamento recebido em dinheiro
- `PAYMENT_REFUNDED` - Pagamento reembolsado
- `VALUE_DIVERGENCE_BLOCK` - Bloqueado por divergência de valor
- `WALLET_UNABLE_TO_RECEIVE` - Carteira não pode receber

### 2.8 Estatísticas de Split

```
GET /v3/finance/split/statistics
```

Retorna:
- `value` - Valores a serem enviados (splits que você vai pagar)
- `income` - Valores a receber (splits que você vai receber)

---

## 3. Fluxo de Trabalho Recomendado

### 3.1 Criar Subconta e Configurar Split

1. **Criar subconta:**
   ```
   POST /v3/accounts
   ```
   - Guardar o `walletId` retornado

2. **Criar pagamento com split:**
   ```
   POST /v3/payments
   ```
   - Incluir array `split` com o `walletId` da subconta
   - Definir `fixedValue` ou `percentualValue`

3. **Monitorar splits:**
   ```
   GET /v3/payments/splits/paid
   GET /v3/payments/splits/received
   ```

### 3.2 Para Parcelas

1. Criar parcela normalmente
2. Configurar splits:
   ```
   PUT /v3/installments/{id}/splits
   ```
   - Usar `totalFixedValue` para dividir entre todas as parcelas
   - Ou usar `installmentNumber` para parcelas específicas

---

## 4. Observações Importantes

1. **WalletId é obrigatório:** Sempre necessário para realizar splits
2. **Valor fixo OU percentual:** Não é possível usar ambos no mesmo split
3. **Valor líquido:** O percentual é calculado sobre o valor líquido (após taxas)
4. **Parcelas:** Splits podem ser configurados por parcela específica ou para o total
5. **Webhooks:** Eventos relacionados a splits:
   - `PAYMENT_SPLIT_CANCELLED`
   - `PAYMENT_SPLIT_DIVERGENCE_BLOCK`
   - `PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED`

---

## 5. Exemplo Prático

```json
// 1. Criar subconta
POST /v3/accounts
{
  "name": "Parceiro XYZ",
  "email": "parceiro@example.com",
  "cpfCnpj": "12345678000190",
  "mobilePhone": "11999999999",
  "incomeValue": 50000,
  "address": "Rua Exemplo",
  "addressNumber": "123",
  "province": "Centro",
  "postalCode": "01310-100"
}

// Resposta: walletId = "abc123-def456-..."

// 2. Criar pagamento com split de 10% para o parceiro
POST /v3/payments
{
  "customer": "cus_xxx",
  "billingType": "PIX",
  "value": 1000.00,
  "dueDate": "2024-12-31",
  "split": [
    {
      "walletId": "abc123-def456-...",
      "percentualValue": 10.0,
      "description": "Comissão do parceiro"
    }
  ]
}
```

---

## 6. Referências

- Base URL: `https://api-sandbox.asaas.com` (sandbox) ou `https://api.asaas.com` (produção)
- Documentação completa: Consulte a especificação OpenAPI do Asaas
- Autenticação: Token de API via header `access_token`
