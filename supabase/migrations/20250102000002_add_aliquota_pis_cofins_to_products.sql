-- =====================================================
-- MIGRATION: Adicionar colunas de alíquota PIS e COFINS à tabela products
-- =====================================================
--
-- AIDEV-NOTE: Esta migration adiciona as colunas 'aliquota_pis' e 'aliquota_cofins'
-- à tabela 'products'. Essas alíquotas são importantes para o cálculo de impostos
-- e devem ser armazenadas como NUMERIC para permitir cálculos precisos.
--
-- Data: 2025-01-02
-- =====================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(5, 2) DEFAULT 0;

COMMENT ON COLUMN products.aliquota_pis IS
'Alíquota de PIS (Programa de Integração Social) em percentual. Exemplo: 1.65 para 1,65%.';

COMMENT ON COLUMN products.aliquota_cofins IS
'Alíquota de COFINS (Contribuição para o Financiamento da Seguridade Social) em percentual. Exemplo: 7.60 para 7,60%.';

