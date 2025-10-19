-- =====================================================
-- MIGRAÇÃO: CORREÇÃO CONSTRAINT STATUS_CONCILIACAO
-- Data: 2025-01-29
-- Descrição: Adiciona constraint para aceitar valores em MAIÚSCULO
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração corrige a constraint de status_conciliacao
-- para aceitar valores em MAIÚSCULO conforme padrão do sistema

-- =====================================================
-- REMOÇÃO DE CONSTRAINT EXISTENTE (SE HOUVER)
-- =====================================================

-- Remove constraint existente se houver
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_status_conciliacao_valid' 
        AND table_name = 'conciliation_staging'
    ) THEN
        ALTER TABLE conciliation_staging 
        DROP CONSTRAINT check_status_conciliacao_valid;
        RAISE NOTICE 'Constraint check_status_conciliacao_valid removida';
    END IF;
END $$;

-- =====================================================
-- ADIÇÃO DA NOVA CONSTRAINT EM MAIÚSCULO
-- =====================================================

-- AIDEV-NOTE: Constraint que aceita apenas valores válidos em MAIÚSCULO
-- Valores permitidos: PENDENTE, CONCILIADO, ERRO, DIVERGENTE, CANCELADO
ALTER TABLE conciliation_staging 
ADD CONSTRAINT check_status_conciliacao_valid 
CHECK (status_conciliacao IN ('PENDENTE', 'CONCILIADO', 'ERRO', 'DIVERGENTE', 'CANCELADO'));

-- =====================================================
-- ATUALIZAÇÃO DOS VALORES EXISTENTES
-- =====================================================

-- AIDEV-NOTE: Converte valores existentes para MAIÚSCULO
UPDATE conciliation_staging 
SET status_conciliacao = CASE 
    WHEN LOWER(status_conciliacao) = 'pendente' OR LOWER(status_conciliacao) = 'pending' THEN 'PENDENTE'
    WHEN LOWER(status_conciliacao) = 'conciliado' OR LOWER(status_conciliacao) = 'reconciled' THEN 'CONCILIADO'
    WHEN LOWER(status_conciliacao) = 'erro' OR LOWER(status_conciliacao) = 'error' THEN 'ERRO'
    WHEN LOWER(status_conciliacao) = 'divergente' OR LOWER(status_conciliacao) = 'divergent' THEN 'DIVERGENTE'
    WHEN LOWER(status_conciliacao) = 'cancelado' OR LOWER(status_conciliacao) = 'cancelled' THEN 'CANCELADO'
    ELSE 'PENDENTE' -- Valor padrão para casos não mapeados
END
WHERE status_conciliacao IS NOT NULL;

-- =====================================================
-- ATUALIZAÇÃO DO VALOR PADRÃO
-- =====================================================

-- AIDEV-NOTE: Define valor padrão em MAIÚSCULO
ALTER TABLE conciliation_staging 
ALTER COLUMN status_conciliacao SET DEFAULT 'PENDENTE';

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN conciliation_staging.status_conciliacao IS 'Status da conciliação: PENDENTE, CONCILIADO, ERRO, DIVERGENTE, CANCELADO (sempre em MAIÚSCULO)';

-- =====================================================
-- LOG DE SUCESSO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Constraint check_status_conciliacao_valid criada com sucesso!';
    RAISE NOTICE 'Valores válidos: PENDENTE, CONCILIADO, ERRO, DIVERGENTE, CANCELADO';
    RAISE NOTICE 'Valor padrão atualizado para: PENDENTE';
    RAISE NOTICE 'Registros existentes convertidos para MAIÚSCULO';
END $$;