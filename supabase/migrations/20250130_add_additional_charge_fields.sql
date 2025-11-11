-- =====================================================
-- MIGRAÇÃO: Adicionar campos adicionais em charges
-- Data: 2025-01-30
-- Descrição: Adiciona campos para valor_liquido, taxa_juros, taxa_multa, valor_desconto, transaction_receipt_url
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração adiciona campos adicionais em charges para armazenar
-- dados financeiros e URLs de documentos do ASAAS

-- =====================================================
-- ADICIONAR COLUNAS SE NÃO EXISTIREM
-- =====================================================

-- AIDEV-NOTE: net_value - Valor líquido recebido (após taxas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'net_value'
  ) THEN
    ALTER TABLE charges ADD COLUMN net_value NUMERIC;
    RAISE NOTICE 'Coluna net_value adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna net_value já existe na tabela charges';
  END IF;
END $$;

-- AIDEV-NOTE: interest_rate - Taxa de juros aplicada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'interest_rate'
  ) THEN
    ALTER TABLE charges ADD COLUMN interest_rate NUMERIC;
    RAISE NOTICE 'Coluna interest_rate adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna interest_rate já existe na tabela charges';
  END IF;
END $$;

-- AIDEV-NOTE: fine_rate - Taxa de multa aplicada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'fine_rate'
  ) THEN
    ALTER TABLE charges ADD COLUMN fine_rate NUMERIC;
    RAISE NOTICE 'Coluna fine_rate adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna fine_rate já existe na tabela charges';
  END IF;
END $$;

-- AIDEV-NOTE: discount_value - Valor de desconto aplicado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE charges ADD COLUMN discount_value NUMERIC;
    RAISE NOTICE 'Coluna discount_value adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna discount_value já existe na tabela charges';
  END IF;
END $$;

-- AIDEV-NOTE: transaction_receipt_url - URL do comprovante de transação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'transaction_receipt_url'
  ) THEN
    ALTER TABLE charges ADD COLUMN transaction_receipt_url TEXT;
    RAISE NOTICE 'Coluna transaction_receipt_url adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna transaction_receipt_url já existe na tabela charges';
  END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN charges.net_value IS 'Valor líquido recebido após dedução de taxas (valor_liquido do ASAAS)';
COMMENT ON COLUMN charges.interest_rate IS 'Taxa de juros aplicada na cobrança (taxa_juros do ASAAS)';
COMMENT ON COLUMN charges.fine_rate IS 'Taxa de multa aplicada na cobrança (taxa_multa do ASAAS)';
COMMENT ON COLUMN charges.discount_value IS 'Valor de desconto aplicado na cobrança (valor_desconto do ASAAS)';
COMMENT ON COLUMN charges.transaction_receipt_url IS 'URL do comprovante de transação do ASAAS';

