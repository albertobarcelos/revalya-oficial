-- Migration: Remover coluna "Coluna de Teste Branch" da tabela agente_ia_empresa
-- Data: 2025-12-20
-- Descrição: Remove a coluna de teste que foi criada durante desenvolvimento

-- AIDEV-NOTE: Remoção de coluna de teste
-- Esta coluna foi criada para testes e não é mais necessária

-- Verificar se a coluna existe antes de remover (evita erro se já foi removida)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agente_ia_empresa' 
        AND column_name = 'Coluna de Teste Branch'
    ) THEN
        -- Remover a coluna (usar aspas duplas porque o nome tem espaços)
        ALTER TABLE public.agente_ia_empresa 
        DROP COLUMN "Coluna de Teste Branch";
        
        RAISE NOTICE 'Coluna "Coluna de Teste Branch" removida com sucesso da tabela agente_ia_empresa';
    ELSE
        RAISE NOTICE 'Coluna "Coluna de Teste Branch" não existe na tabela agente_ia_empresa (já foi removida ou nunca existiu)';
    END IF;
END $$;

