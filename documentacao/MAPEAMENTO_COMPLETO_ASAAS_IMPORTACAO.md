# 📊 MAPEAMENTO COMPLETO - IMPORTAÇÃO DE DADOS ASAAS

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Autor:** Barcelitos (AI Agent)  
**Projeto:** Revalya Oficial  
**Status:** 🔴 DOCUMENTAÇÃO CRÍTICA - REFERÊNCIA MASTER

---

## 🎯 **OBJETIVO DESTA DOCUMENTAÇÃO**

Este documento mapeia **TODAS** as informações disponíveis quando importamos cobranças do ASAAS, identificando:

- ✅ **Campos Atualmente Mapeados** - O que já utilizamos
- 🟡 **Campos Disponíveis Não Mapeados** - O que podemos utilizar
- 🔴 **Campos Críticos Perdidos** - O que devemos mapear urgentemente
- 📋 **Recomendações de Implementação** - Como melhorar o mapeamento

---

## 📦 **ESTRUTURA COMPLETA DO WEBHOOK ASAAS**

### **1. Estrutura Principal do Payload**

```json
{
  "event": {
    "id": "string",           // ID único do evento
    "type": "string"          // Tipo do evento (PAYMENT_CREATED, PAYMENT_UPDATED, etc.)
  },
  "payment": {
    // Dados completos do pagamento (ver seção detalhada abaixo)
  }
}
```

### **2. Objeto `payment` - DADOS COMPLETOS DISPONÍVEIS**

```typescript
interface AsaasWebhookPayment {
  // ===== IDENTIFICAÇÃO =====
  id: string;                           // ✅ MAPEADO → id_externo
  customer: string;                     // ✅ MAPEADO → asaas_customer_id
  subscription?: string;                // ✅ MAPEADO → asaas_subscription_id
  installment?: string;                 // 🟡 DISPONÍVEL - ID da parcela
  externalReference?: string;           // ✅ MAPEADO → external_reference
  
  // ===== VALORES FINANCEIROS =====
  value: number;                        // ✅ MAPEADO → valor_cobranca
  netValue: number;                     // ✅ MAPEADO → valor_liquido + valor_pago
  originalValue?: number;               // ✅ MAPEADO → valor_original
  
  // ===== VALORES DETALHADOS =====
  interest?: {                          // ✅ MAPEADO → valor_juros
    value: number;
  };
  fine?: {                              // ✅ MAPEADO → valor_multa
    value: number;
  };
  discount?: {                          // ✅ MAPEADO → valor_desconto
    value: number;
  };
  
  // ===== DATAS =====
  dueDate: string;                      // ✅ MAPEADO → data_vencimento
  originalDueDate?: string;             // ✅ MAPEADO → data_vencimento_original
  paymentDate?: string;                 // ✅ MAPEADO → data_pagamento
  clientPaymentDate?: string;           // ✅ MAPEADO → data_pagamento_cliente
  confirmedDate?: string;               // ✅ MAPEADO → data_confirmacao
  creditDate?: string;                  // ✅ MAPEADO → data_credito
  estimatedCreditDate?: string;         // ✅ MAPEADO → data_credito_estimada
  dateCreated: string;                  // 🟡 DISPONÍVEL - Data de criação
  
  // ===== STATUS E CONTROLE =====
  status: string;                       // ✅ MAPEADO → status_externo
  billingType: string;                  // ✅ MAPEADO → payment_method
  deleted: boolean;                     // ✅ MAPEADO → deleted_flag
  anticipated: boolean;                 // ✅ MAPEADO → anticipated_flag
  
  // ===== PARCELAMENTO =====
  installmentNumber?: number;           // ✅ MAPEADO → installment_number
  installmentCount?: number;            // ✅ MAPEADO → installment_count
  
  // ===== URLS E DOCUMENTOS =====
  invoiceUrl?: string;                  // ✅ MAPEADO → invoice_url
  bankSlipUrl?: string;                 // ✅ MAPEADO → bank_slip_url
  transactionReceiptUrl?: string;       // ✅ MAPEADO → transaction_receipt_url
  pixQrCodeUrl?: string;                // 🟡 DISPONÍVEL - QR Code PIX
  
  // ===== IDENTIFICADORES BANCÁRIOS =====
  identificationField?: string;         // 🟡 DISPONÍVEL - Linha digitável
  barCode?: string;                     // 🟡 DISPONÍVEL - Código de barras
  nossoNumero?: string;                 // 🟡 DISPONÍVEL - Nosso número
  
  // ===== DESCRIÇÃO =====
  description?: string;                 // 🟡 DISPONÍVEL - Descrição da cobrança
  
  // ===== CONTROLE DE CANCELAMENTO =====
  canBeCancelled?: boolean;             // 🟡 DISPONÍVEL - Pode ser cancelada
  
  // ===== ESTORNOS =====
  refunds?: Array<{                     // 🟡 DISPONÍVEL - Lista de estornos
    id: string;
    value: number;
    status: string;
    description?: string;
    refundDate: string;
  }>;
  
  // ===== DADOS ADICIONAIS (MENOS COMUNS) =====
  invoiceNumber?: string;               // 🟡 DISPONÍVEL - Número da nota fiscal
  postalService?: boolean;              // 🟡 DISPONÍVEL - Envio pelos correios
  split?: Array<{                       // 🟡 DISPONÍVEL - Split de pagamento
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
  chargeback?: {                        // 🟡 DISPONÍVEL - Dados de chargeback
    status: string;
    reason: string;
  };
}
```

---

## 🗃️ **MAPEAMENTO ATUAL - TABELA `conciliation_staging`**

### **Campos Atualmente Mapeados (✅)**

| Campo ASAAS | Campo Staging | Tipo | Observações |
|-------------|---------------|------|-------------|
| `payment.id` | `id_externo` | TEXT | ✅ Chave primária externa |
| `payment.customer` | `asaas_customer_id` | TEXT | ✅ ID do cliente no ASAAS |
| `payment.subscription` | `asaas_subscription_id` | TEXT | ✅ ID da assinatura |
| `payment.value` | `valor_cobranca` | NUMERIC | ✅ Valor da cobrança |
| `payment.netValue` | `valor_pago` | NUMERIC | ✅ Valor líquido pago |
| `payment.netValue` | `valor_liquido` | NUMERIC | ✅ Valor líquido |
| `payment.originalValue` | `valor_original` | NUMERIC | ✅ Valor original |
| `payment.interest.value` | `valor_juros` | NUMERIC | ✅ Juros aplicados |
| `payment.fine.value` | `valor_multa` | NUMERIC | ✅ Multa aplicada |
| `payment.discount.value` | `valor_desconto` | NUMERIC | ✅ Desconto aplicado |
| `payment.status` | `status_externo` | TEXT | ✅ Status do pagamento |
| `payment.billingType` | `payment_method` | TEXT | ✅ Método de pagamento |
| `payment.dueDate` | `data_vencimento` | TIMESTAMPTZ | ✅ Data de vencimento |
| `payment.originalDueDate` | `data_vencimento_original` | TIMESTAMPTZ | ✅ Data original |
| `payment.paymentDate` | `data_pagamento` | TIMESTAMPTZ | ✅ Data do pagamento |
| `payment.clientPaymentDate` | `data_pagamento_cliente` | TIMESTAMPTZ | ✅ Data informada pelo cliente |
| `payment.confirmedDate` | `data_confirmacao` | TIMESTAMPTZ | ✅ Data de confirmação |
| `payment.creditDate` | `data_credito` | TIMESTAMPTZ | ✅ Data de crédito |
| `payment.estimatedCreditDate` | `data_credito_estimada` | TIMESTAMPTZ | ✅ Data estimada de crédito |
| `payment.installmentNumber` | `installment_number` | INTEGER | ✅ Número da parcela |
| `payment.installmentCount` | `installment_count` | INTEGER | ✅ Total de parcelas |
| `payment.invoiceUrl` | `invoice_url` | TEXT | ✅ URL da fatura |
| `payment.bankSlipUrl` | `bank_slip_url` | TEXT | ✅ URL do boleto |
| `payment.transactionReceiptUrl` | `transaction_receipt_url` | TEXT | ✅ URL do comprovante |
| `payment.externalReference` | `external_reference` | TEXT | ✅ Referência externa |
| `payment.deleted` | `deleted_flag` | BOOLEAN | ✅ Flag de exclusão |
| `payment.anticipated` | `anticipated_flag` | BOOLEAN | ✅ Flag de antecipação |
| `event.type` | `webhook_event` | TEXT | ✅ Tipo do evento |
| `payload` | `raw_data` | JSONB | ✅ Dados brutos completos |

### **Dados do Cliente (via API ASAAS) - Mapeados (✅)**

| Campo ASAAS Customer | Campo Staging | Tipo | Observações |
|---------------------|---------------|------|-------------|
| `customer.name` | `customer_name` | TEXT | ✅ Nome do cliente |
| `customer.email` | `customer_email` | TEXT | ✅ Email do cliente |
| `customer.phone` | `customer_phone` | TEXT | ✅ Telefone fixo |
| `customer.mobilePhone` | `customer_mobile_phone` | TEXT | ✅ Telefone celular |
| `customer.cpfCnpj` | `customer_document` | TEXT | ✅ CPF/CNPJ |
| `customer.address` | `customer_address` | TEXT | ✅ Endereço |
| `customer.addressNumber` | `customer_address_number` | TEXT | ✅ Número |
| `customer.complement` | `customer_complement` | TEXT | ✅ Complemento |
| `customer.city` | `customer_city` | TEXT | ✅ Cidade |
| `customer.state` | `customer_state` | TEXT | ✅ Estado |
| `customer.province` | `customer_province` | TEXT | ✅ Província |
| `customer.postalCode` | `customer_postal_code` | TEXT | ✅ CEP |
| `customer.country` | `customer_country` | TEXT | ✅ País |

---

## 🔴 **CAMPOS DISPONÍVEIS NÃO MAPEADOS - OPORTUNIDADES**

### **1. Campos de Alto Valor (🔴 CRÍTICOS)**

| Campo ASAAS | Tipo | Valor de Negócio | Recomendação |
|-------------|------|------------------|--------------|
| `payment.description` | TEXT | **ALTO** - Descrição da cobrança | 🔴 **MAPEAR URGENTE** |
| `payment.pixQrCodeUrl` | TEXT | **ALTO** - QR Code PIX | 🔴 **MAPEAR URGENTE** |
| `payment.identificationField` | TEXT | **ALTO** - Linha digitável | 🔴 **MAPEAR URGENTE** |
| `payment.barCode` | TEXT | **ALTO** - Código de barras | 🔴 **MAPEAR URGENTE** |
| `payment.nossoNumero` | TEXT | **ALTO** - Nosso número bancário | 🔴 **MAPEAR URGENTE** |
| `payment.dateCreated` | TIMESTAMPTZ | **ALTO** - Data de criação | 🔴 **MAPEAR URGENTE** |

### **2. Campos de Médio Valor (🟡 IMPORTANTES)**

| Campo ASAAS | Tipo | Valor de Negócio | Recomendação |
|-------------|------|------------------|--------------|
| `payment.installment` | TEXT | **MÉDIO** - ID da parcela | 🟡 **CONSIDERAR** |
| `payment.canBeCancelled` | BOOLEAN | **MÉDIO** - Controle de cancelamento | 🟡 **CONSIDERAR** |
| `payment.invoiceNumber` | TEXT | **MÉDIO** - Número da nota fiscal | 🟡 **CONSIDERAR** |
| `payment.refunds[]` | JSONB | **MÉDIO** - Histórico de estornos | 🟡 **CONSIDERAR** |
| `payment.chargeback` | JSONB | **MÉDIO** - Dados de chargeback | 🟡 **CONSIDERAR** |

### **3. Campos de Baixo Valor (🔵 OPCIONAIS)**

| Campo ASAAS | Tipo | Valor de Negócio | Recomendação |
|-------------|------|------------------|--------------|
| `payment.postalService` | BOOLEAN | **BAIXO** - Envio pelos correios | 🔵 **OPCIONAL** |
| `payment.split[]` | JSONB | **BAIXO** - Split de pagamento | 🔵 **OPCIONAL** |
| `event.id` | TEXT | **BAIXO** - ID do evento | 🔵 **OPCIONAL** |

### **4. Dados do Cliente Não Mapeados**

| Campo ASAAS Customer | Tipo | Valor de Negócio | Recomendação |
|---------------------|------|------------------|--------------|
| `customer.neighborhood` | TEXT | **MÉDIO** - Bairro | 🟡 **CONSIDERAR** |
| `customer.personType` | TEXT | **MÉDIO** - Tipo de pessoa (F/J) | 🟡 **CONSIDERAR** |
| `customer.additionalEmails` | TEXT | **BAIXO** - Emails adicionais | 🔵 **OPCIONAL** |
| `customer.externalReference` | TEXT | **BAIXO** - Referência externa | 🔵 **OPCIONAL** |
| `customer.notificationDisabled` | BOOLEAN | **BAIXO** - Notificações desabilitadas | 🔵 **OPCIONAL** |
| `customer.observations` | TEXT | **BAIXO** - Observações | 🔵 **OPCIONAL** |
| `customer.company` | TEXT | **MÉDIO** - Nome da empresa | 🟡 **CONSIDERAR** |

---

## 📋 **RECOMENDAÇÕES DE IMPLEMENTAÇÃO**

### **🔴 PRIORIDADE ALTA - IMPLEMENTAR IMEDIATAMENTE**

#### **1. Adicionar Campos Críticos na Tabela `conciliation_staging`**

```sql
-- AIDEV-NOTE: Migration para adicionar campos críticos
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS identification_field TEXT,
ADD COLUMN IF NOT EXISTS bar_code TEXT,
ADD COLUMN IF NOT EXISTS nosso_numero TEXT,
ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conciliation_staging_description 
  ON conciliation_staging(description) WHERE description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conciliation_staging_nosso_numero 
  ON conciliation_staging(nosso_numero) WHERE nosso_numero IS NOT NULL;
```

#### **2. Atualizar Edge Function `asaas-webhook-charges`**

```typescript
// AIDEV-NOTE: Adicionar mapeamento dos campos críticos
const { error: persistError } = await supabase.from("conciliation_staging").upsert({
  // ... campos existentes ...
  
  // 🔴 NOVOS CAMPOS CRÍTICOS
  description: payment.description || null,
  pix_qr_code_url: payment.pixQrCodeUrl || null,
  identification_field: payment.identificationField || null,
  bar_code: payment.barCode || null,
  nosso_numero: payment.nossoNumero || null,
  date_created: payment.dateCreated ? new Date(payment.dateCreated).toISOString() : null,
  
  // ... resto do mapeamento ...
});
```

### **🟡 PRIORIDADE MÉDIA - IMPLEMENTAR EM SEGUNDA FASE**

#### **1. Campos de Controle e Histórico**

```sql
-- AIDEV-NOTE: Migration para campos de controle
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS installment_id TEXT,
ADD COLUMN IF NOT EXISTS can_be_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS refunds_data JSONB,
ADD COLUMN IF NOT EXISTS chargeback_data JSONB;
```

#### **2. Dados Complementares do Cliente**

```sql
-- AIDEV-NOTE: Migration para dados complementares do cliente
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS customer_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS customer_person_type TEXT,
ADD COLUMN IF NOT EXISTS customer_company TEXT;
```

### **🔵 PRIORIDADE BAIXA - IMPLEMENTAR SE NECESSÁRIO**

#### **1. Campos Opcionais**

```sql
-- AIDEV-NOTE: Migration para campos opcionais
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS postal_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS split_data JSONB,
ADD COLUMN IF NOT EXISTS event_id TEXT;
```

---

## 🔍 **ANÁLISE DE IMPACTO**

### **Benefícios da Implementação Completa**

#### **🔴 Campos Críticos**
- **`description`**: Melhora identificação e reconciliação manual
- **`pixQrCodeUrl`**: Essencial para pagamentos PIX
- **`identificationField`**: Crucial para boletos bancários
- **`barCode`**: Necessário para leitura de códigos de barras
- **`nossoNumero`**: Fundamental para conciliação bancária
- **`dateCreated`**: Importante para auditoria e relatórios

#### **🟡 Campos Importantes**
- **`installment`**: Melhor controle de parcelamentos
- **`canBeCancelled`**: Controle de operações permitidas
- **`refunds`**: Histórico completo de estornos
- **`chargeback`**: Controle de disputas

#### **🔵 Campos Opcionais**
- **`split`**: Suporte a marketplace
- **`postalService`**: Controle de envio físico

### **Estimativa de Esforço**

| Prioridade | Tempo Estimado | Complexidade | Risco |
|------------|----------------|--------------|-------|
| 🔴 **Alta** | 4-6 horas | **Baixa** | **Baixo** |
| 🟡 **Média** | 2-3 horas | **Baixa** | **Baixo** |
| 🔵 **Baixa** | 1-2 horas | **Baixa** | **Baixo** |

---

## 🧪 **PLANO DE TESTES**

### **1. Testes de Webhook**

```typescript
// AIDEV-NOTE: Estrutura de teste para novos campos
const testWebhookPayload = {
  event: {
    id: "evt_test_123",
    type: "PAYMENT_UPDATED"
  },
  payment: {
    id: "pay_test_123",
    description: "Teste de descrição da cobrança",
    pixQrCodeUrl: "https://pix.example.com/qr/123",
    identificationField: "12345.67890 12345.678901 12345.678901 1 23456789012345",
    barCode: "12345678901234567890123456789012345678901234567890",
    nossoNumero: "123456789",
    dateCreated: "2025-01-28T10:00:00.000Z",
    // ... outros campos ...
  }
};
```

### **2. Validação de Dados**

```sql
-- AIDEV-NOTE: Queries de validação pós-implementação
-- Verificar se novos campos estão sendo populados
SELECT 
  COUNT(*) as total_records,
  COUNT(description) as with_description,
  COUNT(pix_qr_code_url) as with_pix_qr,
  COUNT(identification_field) as with_identification,
  COUNT(bar_code) as with_barcode,
  COUNT(nosso_numero) as with_nosso_numero,
  COUNT(date_created) as with_date_created
FROM conciliation_staging 
WHERE tenant_id = '{TENANT_ID}' 
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 📊 **MÉTRICAS DE SUCESSO**

### **KPIs Pós-Implementação**

1. **Cobertura de Dados**: % de registros com novos campos populados
2. **Qualidade de Reconciliação**: Redução de reconciliações manuais
3. **Tempo de Processamento**: Impacto na performance
4. **Erros de Webhook**: Taxa de falhas na importação
5. **Satisfação do Usuário**: Feedback sobre novas informações disponíveis

### **Monitoramento Contínuo**

```sql
-- AIDEV-NOTE: Query de monitoramento de qualidade dos dados
SELECT 
  DATE(created_at) as data,
  COUNT(*) as total_webhooks,
  AVG(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) * 100 as pct_with_description,
  AVG(CASE WHEN pix_qr_code_url IS NOT NULL THEN 1 ELSE 0 END) * 100 as pct_with_pix_qr,
  AVG(CASE WHEN identification_field IS NOT NULL THEN 1 ELSE 0 END) * 100 as pct_with_identification
FROM conciliation_staging 
WHERE tenant_id = '{TENANT_ID}'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

---

## 🔄 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Semana 1: Preparação**
- [ ] Revisar estrutura atual da tabela `conciliation_staging`
- [ ] Criar migrations para novos campos
- [ ] Atualizar tipos TypeScript em `src/types/asaas.ts`

### **Semana 2: Implementação Crítica**
- [ ] Implementar campos de prioridade alta (🔴)
- [ ] Atualizar Edge Function `asaas-webhook-charges`
- [ ] Testes unitários e de integração

### **Semana 3: Implementação Complementar**
- [ ] Implementar campos de prioridade média (🟡)
- [ ] Testes de regressão
- [ ] Documentação atualizada

### **Semana 4: Validação e Deploy**
- [ ] Testes em ambiente de staging
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy

---

## 📚 **REFERÊNCIAS TÉCNICAS**

### **Arquivos Relacionados**
- <mcfile name="index.ts" path="F:\NEXFINAN\revalya-oficial\supabase\functions\asaas-webhook-charges\index.ts"></mcfile>
- <mcfile name="asaas.ts" path="F:\NEXFINAN\revalya-oficial\src\types\asaas.ts"></mcfile>
- <mcfile name="ESTRUTURA_COBRANÇA_ASAAS.md" path="F:\NEXFINAN\revalya-oficial\Documentação do Projeto\INTEGRAÇÕES\INTEGRAÇÕES SISTEMAS\ASAAS\ESTRUTURA_COBRANÇA_ASAAS.md"></mcfile>

### **Tabelas do Banco**
- `conciliation_staging` - Tabela principal de staging
- `tenant_integrations` - Configurações de integração
- `integration_processed_events` - Controle de idempotência

### **APIs e Documentação**
- **ASAAS API v3**: `https://api.asaas.com/v3`
- **ASAAS Webhooks**: `https://docs.asaas.com/docs/webhooks`
- **Supabase Edge Functions**: `https://supabase.com/docs/guides/functions`

---

## ⚠️ **NOTAS CRÍTICAS**

### **🔴 ATENÇÃO ESPECIAL**
1. **Backward Compatibility**: Todos os campos novos devem ser `NULL`-able
2. **Performance**: Novos índices podem impactar performance de inserção
3. **Webhook Timeout**: Processamento adicional pode aumentar tempo de resposta
4. **Storage**: Campos adicionais aumentam uso de storage

### **🛡️ SEGURANÇA**
1. **Validação de Entrada**: Todos os novos campos devem ser sanitizados
2. **Logs Sensíveis**: Não logar dados financeiros em plain text
3. **Rate Limiting**: Considerar impacto no rate limiting do ASAAS

### **🔄 MANUTENÇÃO**
1. **Documentação**: Manter esta documentação atualizada
2. **Monitoramento**: Implementar alertas para falhas de mapeamento
3. **Backup**: Considerar impacto nos backups com dados adicionais

---

**📝 AIDEV-NOTE:** Esta documentação deve ser a referência única para mapeamento de dados ASAAS. Qualquer alteração na estrutura de dados deve ser refletida aqui imediatamente.

**🔄 Última Atualização:** Janeiro 2025  
**👤 Responsável:** Barcelitos (AI Agent)  
**📋 Status:** 🔴 DOCUMENTAÇÃO CRÍTICA - CONSULTAR ANTES DE QUALQUER ALTERAÇÃO