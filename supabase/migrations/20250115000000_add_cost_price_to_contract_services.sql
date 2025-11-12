-- AIDEV-NOTE: Migração para adicionar campo cost_price na tabela contract_services
-- Data: 2025-01-15
-- Descrição: Adiciona coluna cost_price (preço de custo) para controle de margem de lucro

-- Adicionar coluna cost_price na tabela contract_services
ALTER TABLE public.contract_services 
ADD COLUMN cost_price DECIMAL(10,2) NULL DEFAULT 0;

-- Comentário para documentação
COMMENT ON COLUMN public.contract_services.cost_price IS 'Preço de custo do serviço para cálculo de margem de lucro';

-- Criar índice para otimizar consultas por cost_price (opcional, para relatórios futuros)
CREATE INDEX IF NOT EXISTS idx_contract_services_cost_price 
ON public.contract_services USING btree (cost_price) 
TABLESPACE pg_default;

-- Atualizar trigger de updated_at (se existir)
-- O trigger update_contract_totals já existe e será executado automaticamente
-- quando houver mudanças na tabela contract_services

-- Verificar se a coluna foi criada corretamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contract_services' 
        AND column_name = 'cost_price'
    ) THEN
        RAISE EXCEPTION 'Falha ao criar coluna cost_price na tabela contract_services';
    END IF;
    
    RAISE NOTICE 'Coluna cost_price adicionada com sucesso à tabela contract_services';
END $$;