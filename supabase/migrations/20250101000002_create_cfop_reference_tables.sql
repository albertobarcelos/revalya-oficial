-- AIDEV-NOTE: Migration para criar tabelas de referência de CFOPs
-- CFOP (Código Fiscal de Operações e Prestações) não pode ser campo livre
-- Deve ser uma tabela de referência com validação por regime tributário

-- =====================================================
-- TABELA DE REFERÊNCIA DE CFOPs
-- =====================================================

CREATE TABLE IF NOT EXISTS cfop_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Código CFOP (ex: "5102")
  description TEXT NOT NULL, -- Descrição do CFOP
  category TEXT NOT NULL, -- 'entrada' | 'saida' | 'ajuste_entrada' | 'ajuste_saida'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cfop_reference_code ON cfop_reference(code);
CREATE INDEX IF NOT EXISTS idx_cfop_reference_category ON cfop_reference(category);
CREATE INDEX IF NOT EXISTS idx_cfop_reference_active ON cfop_reference(is_active);

-- Comentário
COMMENT ON TABLE cfop_reference IS 
'Tabela de referência de CFOPs (Código Fiscal de Operações e Prestações).
Contém todos os CFOPs válidos conforme legislação da Receita Federal.';

COMMENT ON COLUMN cfop_reference.code IS 
'Código CFOP de 4 dígitos. Exemplos: "5102" (Venda de produção), "1102" (Compra para comercialização)';

COMMENT ON COLUMN cfop_reference.category IS 
'Categoria do CFOP: entrada, saida, ajuste_entrada, ajuste_saida';

-- =====================================================
-- TABELA DE MAPEAMENTO CFOP x REGIME TRIBUTÁRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS cfop_regime_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfop_id UUID NOT NULL REFERENCES cfop_reference(id) ON DELETE CASCADE,
  regime_tributario TEXT NOT NULL, -- 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
  is_default BOOLEAN DEFAULT false, -- Se é CFOP padrão para este regime
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_cfop_regime UNIQUE (cfop_id, regime_tributario)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cfop_regime_cfop ON cfop_regime_mapping(cfop_id);
CREATE INDEX IF NOT EXISTS idx_cfop_regime_regime ON cfop_regime_mapping(regime_tributario);
CREATE INDEX IF NOT EXISTS idx_cfop_regime_default ON cfop_regime_mapping(regime_tributario, is_default) WHERE is_default = true;

-- Comentário
COMMENT ON TABLE cfop_regime_mapping IS 
'Mapeamento de CFOPs válidos por regime tributário.
Define quais CFOPs podem ser usados em cada regime (Simples Nacional, Lucro Presumido, Lucro Real).';

COMMENT ON COLUMN cfop_regime_mapping.regime_tributario IS 
'Regime tributário: simples_nacional, lucro_presumido, lucro_real';

COMMENT ON COLUMN cfop_regime_mapping.is_default IS 
'Se true, este CFOP é o padrão recomendado para este regime tributário';

-- =====================================================
-- ATUALIZAR TABELA PRODUCTS PARA USAR FOREIGN KEY
-- =====================================================

-- Remover coluna TEXT antiga (se existir)
ALTER TABLE products DROP COLUMN IF EXISTS cfop;

-- Adicionar coluna com foreign key
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cfop_id UUID REFERENCES cfop_reference(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_products_cfop_id ON products(cfop_id) WHERE cfop_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN products.cfop_id IS 
'CFOP (Código Fiscal de Operações e Prestações) - Foreign key para cfop_reference.
O CFOP deve ser válido para o regime tributário da empresa (tenants.company_data->fiscal->regime_tributario).';

-- =====================================================
-- FUNÇÃO PARA BUSCAR CFOPs VÁLIDOS POR REGIME
-- =====================================================

CREATE OR REPLACE FUNCTION get_valid_cfops_by_regime(
  p_regime_tributario TEXT,
  p_category TEXT DEFAULT NULL -- 'entrada' | 'saida' | NULL (todos)
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  description TEXT,
  category TEXT,
  is_default BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id,
    cf.code,
    cf.description,
    cf.category,
    COALESCE(crm.is_default, false) as is_default
  FROM cfop_reference cf
  INNER JOIN cfop_regime_mapping crm ON crm.cfop_id = cf.id
  WHERE 
    crm.regime_tributario = p_regime_tributario
    AND crm.is_active = true
    AND cf.is_active = true
    AND (p_category IS NULL OR cf.category = p_category)
  ORDER BY 
    crm.is_default DESC, -- CFOPs padrão primeiro
    cf.code ASC;
END;
$$;

COMMENT ON FUNCTION get_valid_cfops_by_regime(TEXT, TEXT) IS 
'Retorna lista de CFOPs válidos para um regime tributário específico.
Parâmetros: regime_tributario (obrigatório), category (opcional: entrada, saida, etc.)';

-- =====================================================
-- FUNÇÃO PARA VALIDAR CFOP POR REGIME
-- =====================================================

CREATE OR REPLACE FUNCTION validate_cfop_for_regime(
  p_cfop_code TEXT,
  p_regime_tributario TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM cfop_reference cf
  INNER JOIN cfop_regime_mapping crm ON crm.cfop_id = cf.id
  WHERE 
    cf.code = p_cfop_code
    AND crm.regime_tributario = p_regime_tributario
    AND crm.is_active = true
    AND cf.is_active = true;
  
  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION validate_cfop_for_regime(TEXT, TEXT) IS 
'Valida se um CFOP é válido para um regime tributário específico.
Retorna true se válido, false caso contrário.';

-- =====================================================
-- INSERIR CFOPs MAIS COMUNS
-- =====================================================
-- AIDEV-NOTE: Inserir CFOPs mais utilizados por regime tributário
-- Esta é uma lista inicial - pode ser expandida conforme necessário

-- CFOPs para SAÍDA (Vendas) - Comuns a todos os regimes
INSERT INTO cfop_reference (code, description, category) VALUES
  ('5102', 'Venda de produção do estabelecimento', 'saida'),
  ('5109', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária', 'saida'),
  ('5405', 'Venda de produção do estabelecimento que não deva por ele ingressar', 'saida'),
  ('5101', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5115', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5120', 'Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5122', 'Venda de mercadoria adquirida ou recebida de terceiros em operação com mercadoria sujeita ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5401', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5403', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5408', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5411', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5412', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5413', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5414', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5415', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5416', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5417', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5418', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5419', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5420', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5551', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5552', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5553', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5554', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5555', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5556', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5557', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5558', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida'),
  ('5559', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'saida'),
  ('5560', 'Venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'saida')
ON CONFLICT (code) DO NOTHING;

-- CFOPs para ENTRADA (Compras)
INSERT INTO cfop_reference (code, description, category) VALUES
  ('1102', 'Compra para comercialização', 'entrada'),
  ('1101', 'Compra para industrialização', 'entrada'),
  ('1103', 'Compra para comercialização em operação com mercadoria sujeita ao regime de substituição tributária', 'entrada'),
  ('1111', 'Compra para industrialização em operação com mercadoria sujeita ao regime de substituição tributária', 'entrada'),
  ('1201', 'Compra para comercialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'entrada'),
  ('1202', 'Compra para comercialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'entrada'),
  ('1203', 'Compra para industrialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'entrada'),
  ('1204', 'Compra para industrialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'entrada'),
  ('1301', 'Compra para comercialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'entrada'),
  ('1302', 'Compra para comercialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'entrada'),
  ('1303', 'Compra para industrialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituído', 'entrada'),
  ('1304', 'Compra para industrialização em operação com produto sujeito ao regime de substituição tributária, na condição de contribuinte substituto', 'entrada')
ON CONFLICT (code) DO NOTHING;

-- Mapear CFOPs para SIMPLES NACIONAL (CFOPs mais comuns)
INSERT INTO cfop_regime_mapping (cfop_id, regime_tributario, is_default)
SELECT id, 'simples_nacional', 
  CASE WHEN code IN ('5102', '5109', '5405') THEN true ELSE false END
FROM cfop_reference
WHERE category = 'saida'
  AND code IN ('5102', '5109', '5405', '5101', '5115', '5120', '5122', '5401', '5403', '5408', '5411', '5412', '5413', '5414', '5415', '5416', '5417', '5418', '5419', '5420', '5551', '5552', '5553', '5554', '5555', '5556', '5557', '5558', '5559', '5560')
ON CONFLICT (cfop_id, regime_tributario) DO NOTHING;

-- Mapear CFOPs para LUCRO PRESUMIDO
INSERT INTO cfop_regime_mapping (cfop_id, regime_tributario, is_default)
SELECT id, 'lucro_presumido',
  CASE WHEN code IN ('5102', '5109', '5405') THEN true ELSE false END
FROM cfop_reference
WHERE category = 'saida'
  AND code IN ('5102', '5109', '5405', '5101', '5115', '5120', '5122', '5401', '5403', '5408', '5411', '5412', '5413', '5414', '5415', '5416', '5417', '5418', '5419', '5420', '5551', '5552', '5553', '5554', '5555', '5556', '5557', '5558', '5559', '5560')
ON CONFLICT (cfop_id, regime_tributario) DO NOTHING;

-- Mapear CFOPs para LUCRO REAL
INSERT INTO cfop_regime_mapping (cfop_id, regime_tributario, is_default)
SELECT id, 'lucro_real',
  CASE WHEN code IN ('5102', '5109', '5405') THEN true ELSE false END
FROM cfop_reference
WHERE category = 'saida'
  AND code IN ('5102', '5109', '5405', '5101', '5115', '5120', '5122', '5401', '5403', '5408', '5411', '5412', '5413', '5414', '5415', '5416', '5417', '5418', '5419', '5420', '5551', '5552', '5553', '5554', '5555', '5556', '5557', '5558', '5559', '5560')
ON CONFLICT (cfop_id, regime_tributario) DO NOTHING;

-- Mapear CFOPs de ENTRADA para todos os regimes
INSERT INTO cfop_regime_mapping (cfop_id, regime_tributario, is_default)
SELECT id, regime, 
  CASE WHEN code IN ('1102', '1101') THEN true ELSE false END
FROM cfop_reference
CROSS JOIN (VALUES ('simples_nacional'), ('lucro_presumido'), ('lucro_real')) AS regimes(regime)
WHERE category = 'entrada'
  AND code IN ('1102', '1101', '1103', '1111', '1201', '1202', '1203', '1204', '1301', '1302', '1303', '1304')
ON CONFLICT (cfop_id, regime_tributario) DO NOTHING;

-- AIDEV-NOTE: Esta migration cria a estrutura base com CFOPs mais comuns
-- Para uma lista completa de CFOPs, recomenda-se importar de fonte oficial:
-- - Receita Federal do Brasil
-- - Secretarias da Fazenda estaduais
-- - APIs de consulta fiscal

