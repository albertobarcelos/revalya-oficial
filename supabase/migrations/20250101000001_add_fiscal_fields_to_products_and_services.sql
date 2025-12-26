-- AIDEV-NOTE: Migration para adicionar campos fiscais em products e services
-- IMPORTANTE: Services → NFSe | Products → NFe

-- =====================================================
-- SERVICES - Campos para NFSe (Nota Fiscal de Serviços)
-- =====================================================
-- AIDEV-NOTE: Services são cadastros prévios de configurações de serviços
-- Estes campos são obrigatórios para emissão de NFSe

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS codigo_servico_lc116 TEXT;

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS municipio_prestacao_ibge TEXT;

-- Comentários para documentação
COMMENT ON COLUMN services.codigo_servico_lc116 IS 
'Código de serviço conforme LC 116/2003. Obrigatório para emissão de NFSe. Exemplo: "14.01"';

COMMENT ON COLUMN services.municipio_prestacao_ibge IS 
'Código IBGE do município onde o serviço é prestado. Obrigatório para emissão de NFSe. Exemplo: "3550308" (São Paulo)';

-- =====================================================
-- PRODUCTS - Campos para NFe (Nota Fiscal Eletrônica)
-- =====================================================
-- AIDEV-NOTE: Products são cadastros de produtos físicos
-- Estes campos são obrigatórios para emissão de NFe

-- Campos obrigatórios para NFe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ncm TEXT;

-- AIDEV-NOTE: CFOP será adicionado via foreign key na migration 20250101000002
-- Não adicionar aqui para evitar conflito

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';

-- Campos de tributação ICMS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_icms TEXT;

-- Campos de tributação IPI (opcional, apenas para produtos sujeitos a IPI)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_ipi TEXT;

-- Campos de tributação PIS/COFINS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_pis TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_cofins TEXT;

-- Comentários para documentação
COMMENT ON COLUMN products.ncm IS 
'NCM (Nomenclatura Comum do Mercosul). Obrigatório para emissão de NFe. Exemplo: "8517.12.00"';

-- AIDEV-NOTE: Comentário sobre CFOP movido para migration 20250101000002
-- CFOP será foreign key para cfop_reference, não campo TEXT livre

COMMENT ON COLUMN products.origem IS 
'Origem da mercadoria (0-8). Padrão: 0 (Nacional). 
0 = Nacional
1 = Estrangeira - Importação direta
2 = Estrangeira - Adquirida no mercado interno
3 = Nacional - Mercadoria com mais de 40% de conteúdo estrangeiro
4 = Nacional - Produção em conformidade com processos produtivos básicos
5 = Nacional - Mercadoria com menos de 40% de conteúdo estrangeiro
6 = Estrangeira - Importação direta sem similar nacional
7 = Estrangeira - Adquirida no mercado interno sem similar nacional
8 = Nacional - Mercadoria com Conteúdo de Importação superior a 70%';

COMMENT ON COLUMN products.cst_icms IS 
'CST ICMS (Código de Situação Tributária do ICMS). Exemplos: "00" (Tributada integralmente), "40" (Isenta), "41" (Não tributada)';

COMMENT ON COLUMN products.cst_ipi IS 
'CST IPI (Código de Situação Tributária do IPI). Apenas para produtos sujeitos a IPI. Exemplos: "00" (Entrada com recuperação de crédito), "49" (Outras entradas)';

COMMENT ON COLUMN products.cst_pis IS 
'CST PIS (Código de Situação Tributária do PIS). Exemplos: "01" (Operação tributável com alíquota básica), "08" (Operação sem incidência)';

COMMENT ON COLUMN products.cst_cofins IS 
'CST COFINS (Código de Situação Tributária do COFINS). Exemplos: "01" (Operação tributável com alíquota básica), "08" (Operação sem incidência)';

-- AIDEV-NOTE: Índices para melhorar performance em consultas fiscais
CREATE INDEX IF NOT EXISTS idx_products_ncm ON products(ncm) WHERE ncm IS NOT NULL;
-- AIDEV-NOTE: Índice de CFOP será criado na migration 20250101000002 (foreign key)
CREATE INDEX IF NOT EXISTS idx_services_codigo_lc116 ON services(codigo_servico_lc116) WHERE codigo_servico_lc116 IS NOT NULL;

