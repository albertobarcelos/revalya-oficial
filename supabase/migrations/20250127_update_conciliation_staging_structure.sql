-- =====================================================
-- MIGRAÇÃO: ATUALIZAÇÃO DA ESTRUTURA CONCILIATION_STAGING
-- Data: 2025-01-27
-- Descrição: Adiciona colunas faltantes para dados completos do ASAAS
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração adiciona todas as colunas necessárias para
-- capturar completamente os dados enviados pelo webhook ASAAS

-- =====================================================
-- ADIÇÃO DE COLUNAS PARA DADOS EXTERNOS (ASAAS)
-- =====================================================

-- Identificadores externos
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- =====================================================
-- VALORES E TAXAS DETALHADAS
-- =====================================================

-- Valores originais e líquidos
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS valor_original DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valor_liquido DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valor_juros DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_multa DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_desconto DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- MÉTODO DE PAGAMENTO E STATUS DETALHADO
-- =====================================================

-- Método de pagamento e status anterior
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS status_anterior TEXT,
ADD COLUMN IF NOT EXISTS deleted_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anticipated_flag BOOLEAN DEFAULT FALSE;

-- =====================================================
-- DATAS COMPLETAS DO CICLO DE PAGAMENTO
-- =====================================================

-- Datas adicionais do ASAAS
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS data_vencimento_original TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_pagamento_cliente TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_confirmacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_credito TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_credito_estimada TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- DADOS DO CLIENTE
-- =====================================================

-- Informações completas do cliente
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_document TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_mobile_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_address_number TEXT,
ADD COLUMN IF NOT EXISTS customer_complement TEXT,
ADD COLUMN IF NOT EXISTS customer_province TEXT,
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS customer_state TEXT,
ADD COLUMN IF NOT EXISTS customer_postal_code TEXT,
ADD COLUMN IF NOT EXISTS customer_country TEXT;

-- =====================================================
-- PARCELAMENTO E ASSINATURA
-- =====================================================

-- Dados de parcelamento
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS installment_number INTEGER,
ADD COLUMN IF NOT EXISTS installment_count INTEGER;

-- =====================================================
-- URLs E DOCUMENTOS
-- =====================================================

-- URLs importantes
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS bank_slip_url TEXT,
ADD COLUMN IF NOT EXISTS transaction_receipt_url TEXT;

-- =====================================================
-- DADOS BRUTOS E CONTROLE DE WEBHOOK
-- =====================================================

-- Dados completos do webhook
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS webhook_event TEXT,
ADD COLUMN IF NOT EXISTS webhook_signature TEXT,
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- =====================================================
-- CONTROLE DE PROCESSAMENTO
-- =====================================================

-- Flags de controle
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- =====================================================
-- CONCILIAÇÃO MANUAL
-- =====================================================

-- Controle de conciliação
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

-- =====================================================
-- AUDITORIA COMPLETA
-- =====================================================

-- Campos de auditoria
ALTER TABLE conciliation_staging 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE (SEM CONCURRENTLY)
-- =====================================================

-- Índices para campos críticos
CREATE INDEX IF NOT EXISTS idx_conciliation_staging_asaas_customer_id
ON conciliation_staging(tenant_id, asaas_customer_id);

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_external_reference
ON conciliation_staging(tenant_id, external_reference) WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_payment_method
ON conciliation_staging(tenant_id, payment_method);

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_processed
ON conciliation_staging(tenant_id, processed) WHERE NOT processed;

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_reconciled
ON conciliation_staging(tenant_id, reconciled) WHERE NOT reconciled;

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_webhook_event
ON conciliation_staging(tenant_id, webhook_event);

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_dates
ON conciliation_staging(tenant_id, data_vencimento, data_pagamento);

CREATE INDEX IF NOT EXISTS idx_conciliation_staging_raw_data_gin
ON conciliation_staging USING GIN (raw_data);

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Constraint para garantir valores positivos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_financial_values' 
        AND table_name = 'conciliation_staging'
    ) THEN
        ALTER TABLE conciliation_staging 
        ADD CONSTRAINT check_positive_financial_values 
        CHECK (
          (valor_cobranca IS NULL OR valor_cobranca >= 0) AND
          (valor_pago IS NULL OR valor_pago >= 0) AND
          (valor_original IS NULL OR valor_original >= 0) AND
          (valor_liquido IS NULL OR valor_liquido >= 0) AND
          (valor_juros IS NULL OR valor_juros >= 0) AND
          (valor_multa IS NULL OR valor_multa >= 0) AND
          (valor_desconto IS NULL OR valor_desconto >= 0)
        );
    END IF;
END $$;

-- Constraint para garantir datas lógicas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_logical_payment_dates' 
        AND table_name = 'conciliation_staging'
    ) THEN
        ALTER TABLE conciliation_staging 
        ADD CONSTRAINT check_logical_payment_dates 
        CHECK (
          (data_pagamento IS NULL OR data_vencimento IS NULL OR data_pagamento >= data_vencimento - INTERVAL '30 days') AND
          (data_confirmacao IS NULL OR data_pagamento IS NULL OR data_confirmacao >= data_pagamento) AND
          (data_credito IS NULL OR data_confirmacao IS NULL OR data_credito >= data_confirmacao)
        );
    END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN conciliation_staging.asaas_customer_id IS 'ID do cliente no ASAAS';
COMMENT ON COLUMN conciliation_staging.asaas_subscription_id IS 'ID da assinatura no ASAAS (se aplicável)';
COMMENT ON COLUMN conciliation_staging.external_reference IS 'Referência externa (nosso número)';
COMMENT ON COLUMN conciliation_staging.valor_original IS 'Valor original da cobrança no ASAAS';
COMMENT ON COLUMN conciliation_staging.valor_liquido IS 'Valor líquido após taxas no ASAAS';
COMMENT ON COLUMN conciliation_staging.valor_juros IS 'Valor de juros aplicado no ASAAS';
COMMENT ON COLUMN conciliation_staging.valor_multa IS 'Valor de multa aplicado no ASAAS';
COMMENT ON COLUMN conciliation_staging.valor_desconto IS 'Valor de desconto aplicado no ASAAS';
COMMENT ON COLUMN conciliation_staging.payment_method IS 'Método de pagamento (PIX, BOLETO, CREDIT_CARD, etc.)';
COMMENT ON COLUMN conciliation_staging.webhook_event IS 'Tipo do evento webhook (PAYMENT_RECEIVED, PAYMENT_CONFIRMED, etc.)';
COMMENT ON COLUMN conciliation_staging.raw_data IS 'Dados completos do webhook ASAAS em formato JSON';
COMMENT ON COLUMN conciliation_staging.processed IS 'Flag indicando se o registro foi processado para a tabela charges';
COMMENT ON COLUMN conciliation_staging.reconciled IS 'Flag indicando se o registro foi conciliado manualmente';