-- =====================================================
-- MIGRAÇÃO: Adicionar campo external_customer_id em charges
-- Data: 2025-01-30
-- Descrição: Adiciona campo external_customer_id para armazenar asaas_customer_id
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração adiciona campo external_customer_id em charges para armazenar
-- o ID do customer no sistema externo (ASAAS)

-- =====================================================
-- ADICIONAR COLUNA SE NÃO EXISTIR
-- =====================================================

-- AIDEV-NOTE: external_customer_id - ID do customer no sistema externo (ASAAS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' 
    AND column_name = 'external_customer_id'
  ) THEN
    ALTER TABLE charges ADD COLUMN external_customer_id TEXT;
    RAISE NOTICE 'Coluna external_customer_id adicionada à tabela charges';
  ELSE
    RAISE NOTICE 'Coluna external_customer_id já existe na tabela charges';
  END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN charges.external_customer_id IS 'ID do customer no sistema externo (ex: asaas_customer_id do ASAAS)';

