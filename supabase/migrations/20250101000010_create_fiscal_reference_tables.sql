-- =====================================================
-- MIGRATION: Criar tabelas de referência fiscal (NCM, CEST, CSTs, Tipo)
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration cria tabelas de referência para dados fiscais
-- que devem ser validados e estar ativos conforme legislação brasileira.
-- 
-- Tabelas criadas:
-- 1. ncm_reference - REMOVIDO (validação via API FocusNFe)
-- 2. cest_reference - REMOVIDO (não há API pública confiável, campo será apenas formatado)
-- 3. cst_icms_reference - Códigos de Situação Tributária ICMS
-- 4. cst_ipi_reference - Códigos de Situação Tributária IPI
-- 5. cst_pis_cofins_reference - Códigos de Situação Tributária PIS/COFINS
-- 6. product_type_reference - Tipos de produto (Mercadoria para revenda, etc.)
--
-- Data: 2025-01-01
-- =====================================================

-- =====================================================
-- 1. TABELA: ncm_reference
-- =====================================================
-- AIDEV-NOTE: REMOVIDO - NCM agora é validado via API FocusNFe
-- Não há necessidade de tabela local, validação é feita diretamente na API
-- Esta seção foi removida para evitar criação da tabela

-- =====================================================
-- 2. TABELA: cest_reference
-- =====================================================
-- AIDEV-NOTE: REMOVIDO - CEST não possui API pública confiável
-- Campo será apenas formatado, sem validação de existência
-- Esta seção foi removida para evitar criação da tabela

-- =====================================================
-- 3. TABELA: cst_icms_reference
-- =====================================================
-- AIDEV-NOTE: CST ICMS conforme legislação estadual
CREATE TABLE IF NOT EXISTS cst_icms_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- AIDEV-NOTE: Código CST ICMS (2 dígitos, ex: 00, 10, 20)
  description TEXT NOT NULL, -- AIDEV-NOTE: Descrição do CST
  is_active BOOLEAN NOT NULL DEFAULT true, -- AIDEV-NOTE: CST ativo conforme legislação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AIDEV-NOTE: Índices
CREATE INDEX IF NOT EXISTS idx_cst_icms_code ON cst_icms_reference(code);
CREATE INDEX IF NOT EXISTS idx_cst_icms_active ON cst_icms_reference(is_active) WHERE is_active = true;

-- AIDEV-NOTE: Constraint para validar formato do código CST ICMS (2 dígitos)
ALTER TABLE cst_icms_reference
ADD CONSTRAINT check_cst_icms_code_format 
CHECK (code ~ '^\d{2}$');

COMMENT ON TABLE cst_icms_reference IS 
'Tabela de referência de CST ICMS (Código de Situação Tributária).
Códigos conforme legislação estadual vigente.
Apenas códigos ativos devem ser utilizados.';

-- =====================================================
-- 4. TABELA: cst_ipi_reference
-- =====================================================
-- AIDEV-NOTE: CST IPI conforme legislação federal
CREATE TABLE IF NOT EXISTS cst_ipi_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- AIDEV-NOTE: Código CST IPI (2 dígitos, ex: 00, 50, 53)
  description TEXT NOT NULL, -- AIDEV-NOTE: Descrição do CST
  is_active BOOLEAN NOT NULL DEFAULT true, -- AIDEV-NOTE: CST ativo conforme legislação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AIDEV-NOTE: Índices
CREATE INDEX IF NOT EXISTS idx_cst_ipi_code ON cst_ipi_reference(code);
CREATE INDEX IF NOT EXISTS idx_cst_ipi_active ON cst_ipi_reference(is_active) WHERE is_active = true;

-- AIDEV-NOTE: Constraint para validar formato do código CST IPI (2 dígitos)
ALTER TABLE cst_ipi_reference
ADD CONSTRAINT check_cst_ipi_code_format 
CHECK (code ~ '^\d{2}$');

COMMENT ON TABLE cst_ipi_reference IS 
'Tabela de referência de CST IPI (Código de Situação Tributária).
Códigos conforme legislação federal vigente.
Apenas códigos ativos devem ser utilizados.';

-- =====================================================
-- 5. TABELA: cst_pis_cofins_reference
-- =====================================================
-- AIDEV-NOTE: CST PIS/COFINS conforme legislação federal
CREATE TABLE IF NOT EXISTS cst_pis_cofins_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- AIDEV-NOTE: Código CST PIS/COFINS (2 dígitos, ex: 01, 49)
  description TEXT NOT NULL, -- AIDEV-NOTE: Descrição do CST
  applies_to TEXT NOT NULL DEFAULT 'both', -- AIDEV-NOTE: 'pis', 'cofins', 'both'
  is_active BOOLEAN NOT NULL DEFAULT true, -- AIDEV-NOTE: CST ativo conforme legislação
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_applies_to CHECK (applies_to IN ('pis', 'cofins', 'both'))
);

-- AIDEV-NOTE: Índices
CREATE INDEX IF NOT EXISTS idx_cst_pis_cofins_code ON cst_pis_cofins_reference(code);
CREATE INDEX IF NOT EXISTS idx_cst_pis_cofins_active ON cst_pis_cofins_reference(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cst_pis_cofins_applies ON cst_pis_cofins_reference(applies_to);

-- AIDEV-NOTE: Constraint para validar formato do código CST PIS/COFINS (2 dígitos)
ALTER TABLE cst_pis_cofins_reference
ADD CONSTRAINT check_cst_pis_cofins_code_format 
CHECK (code ~ '^\d{2}$');

COMMENT ON TABLE cst_pis_cofins_reference IS 
'Tabela de referência de CST PIS/COFINS (Código de Situação Tributária).
Códigos conforme legislação federal vigente.
Apenas códigos ativos devem ser utilizados.';

-- =====================================================
-- 6. TABELA: product_type_reference
-- =====================================================
-- AIDEV-NOTE: Tipos de produto conforme legislação fiscal
CREATE TABLE IF NOT EXISTS product_type_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- AIDEV-NOTE: Código do tipo (ex: 00, 01)
  description TEXT NOT NULL, -- AIDEV-NOTE: Descrição do tipo
  is_active BOOLEAN NOT NULL DEFAULT true, -- AIDEV-NOTE: Tipo ativo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AIDEV-NOTE: Índices
CREATE INDEX IF NOT EXISTS idx_product_type_code ON product_type_reference(code);
CREATE INDEX IF NOT EXISTS idx_product_type_active ON product_type_reference(is_active) WHERE is_active = true;

COMMENT ON TABLE product_type_reference IS 
'Tabela de referência de tipos de produto conforme legislação fiscal.
Exemplos: Mercadoria para revenda, Matéria-prima, Produto acabado, etc.
Apenas tipos ativos devem ser utilizados.';

-- =====================================================
-- 7. INSERIR DADOS INICIAIS
-- =====================================================

-- AIDEV-NOTE: Inserir tipos de produto padrão
INSERT INTO product_type_reference (code, description, is_active) VALUES
  ('00', 'Mercadoria para revenda', true),
  ('01', 'Matéria-prima', true),
  ('02', 'Embalagem', true),
  ('03', 'Produto em processo', true),
  ('04', 'Produto acabado', true),
  ('05', 'Subproduto', true),
  ('06', 'Produto intermediário', true),
  ('07', 'Material de uso e consumo', true),
  ('08', 'Ativo imobilizado', true),
  ('09', 'Serviços', true),
  ('10', 'Outros insumos', true),
  ('99', 'Outras', true)
ON CONFLICT (code) DO NOTHING;

-- AIDEV-NOTE: Inserir CSTs ICMS mais comuns
INSERT INTO cst_icms_reference (code, description, is_active) VALUES
  ('00', 'Tributado integralmente', true),
  ('10', 'Tributado e com cobrança do ICMS por substituição tributária', true),
  ('20', 'Com redução de base de cálculo', true),
  ('30', 'Isento ou não tributado e com cobrança do ICMS por substituição tributária', true),
  ('40', 'Isento', true),
  ('41', 'Não tributado', true),
  ('50', 'Suspensão', true),
  ('51', 'Diferimento', true),
  ('60', 'ICMS cobrado anteriormente por substituição tributária', true),
  ('70', 'Com redução de base de cálculo e cobrança do ICMS por substituição tributária', true),
  ('90', 'Outras', true)
ON CONFLICT (code) DO NOTHING;

-- AIDEV-NOTE: Inserir CSTs IPI mais comuns
INSERT INTO cst_ipi_reference (code, description, is_active) VALUES
  ('00', 'Entrada com recuperação de crédito', true),
  ('01', 'Entrada tributada com alíquota zero', true),
  ('02', 'Entrada isenta', true),
  ('03', 'Entrada não-tributada', true),
  ('04', 'Entrada imune', true),
  ('05', 'Entrada com suspensão', true),
  ('49', 'Outras entradas', true),
  ('50', 'Saída tributada', true),
  ('51', 'Saída tributada com alíquota zero', true),
  ('52', 'Saída isenta', true),
  ('53', 'Saída não-tributada', true),
  ('54', 'Saída imune', true),
  ('55', 'Saída com suspensão', true),
  ('99', 'Outras saídas', true)
ON CONFLICT (code) DO NOTHING;

-- AIDEV-NOTE: Inserir CSTs PIS/COFINS mais comuns
INSERT INTO cst_pis_cofins_reference (code, description, applies_to, is_active) VALUES
  ('01', 'Operação tributável com alíquota básica', 'both', true),
  ('02', 'Operação tributável com alíquota diferenciada', 'both', true),
  ('03', 'Operação tributável com alíquota por unidade de medida de produto', 'both', true),
  ('04', 'Operação tributável monofásica - revenda a alíquota zero', 'both', true),
  ('05', 'Operação tributável por substituição tributária', 'both', true),
  ('06', 'Operação tributável a alíquota zero', 'both', true),
  ('07', 'Operação isenta da contribuição', 'both', true),
  ('08', 'Operação sem incidência da contribuição', 'both', true),
  ('09', 'Operação com suspensão da contribuição', 'both', true),
  ('49', 'Outras operações de saída', 'both', true),
  ('50', 'Operação com direito a crédito - vinculada exclusivamente a receita tributada no mercado interno', 'both', true),
  ('51', 'Operação com direito a crédito - vinculada exclusivamente a receita não tributada no mercado interno', 'both', true),
  ('52', 'Operação com direito a crédito - vinculada exclusivamente a receita de exportação', 'both', true),
  ('53', 'Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno', 'both', true),
  ('54', 'Operação com direito a crédito - vinculada a receitas tributadas no mercado interno e de exportação', 'both', true),
  ('55', 'Operação com direito a crédito - vinculada a receitas não-tributadas no mercado interno e de exportação', 'both', true),
  ('56', 'Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno e de exportação', 'both', true),
  ('60', 'Crédito presunto - operação de aquisição vinculada exclusivamente a receita tributada no mercado interno', 'both', true),
  ('61', 'Crédito presunto - operação de aquisição vinculada exclusivamente a receita não-tributada no mercado interno', 'both', true),
  ('62', 'Crédito presunto - operação de aquisição vinculada exclusivamente a receita de exportação', 'both', true),
  ('63', 'Crédito presunto - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno', 'both', true),
  ('64', 'Crédito presunto - operação de aquisição vinculada a receitas tributadas no mercado interno e de exportação', 'both', true),
  ('65', 'Crédito presunto - operação de aquisição vinculada a receitas não-tributadas no mercado interno e de exportação', 'both', true),
  ('66', 'Crédito presunto - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno e de exportação', 'both', true),
  ('67', 'Crédito presunto - outras operações', 'both', true),
  ('70', 'Operação de aquisição sem direito a crédito', 'both', true),
  ('71', 'Operação de aquisição com isenção', 'both', true),
  ('72', 'Operação de aquisição com suspensão', 'both', true),
  ('73', 'Operação de aquisição a alíquota zero', 'both', true),
  ('74', 'Operação de aquisição sem incidência da contribuição', 'both', true),
  ('75', 'Operação de aquisição por substituição tributária', 'both', true),
  ('98', 'Outras operações de entrada', 'both', true),
  ('99', 'Outras operações', 'both', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 8. ADICIONAR COLUNAS NA TABELA PRODUCTS
-- =====================================================

-- AIDEV-NOTE: Adicionar foreign keys para referências fiscais
-- AIDEV-NOTE: ncm_id removido - NCM validado via API FocusNFe, não precisa de FK
-- AIDEV-NOTE: cest_id removido - CEST não possui API pública, campo será apenas formatado
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES product_type_reference(id),
ADD COLUMN IF NOT EXISTS cst_icms_id UUID REFERENCES cst_icms_reference(id),
ADD COLUMN IF NOT EXISTS cst_ipi_id UUID REFERENCES cst_ipi_reference(id),
ADD COLUMN IF NOT EXISTS cst_pis_id UUID REFERENCES cst_pis_cofins_reference(id),
ADD COLUMN IF NOT EXISTS cst_cofins_id UUID REFERENCES cst_pis_cofins_reference(id);

-- AIDEV-NOTE: Manter campos legados para compatibilidade (serão removidos em migration futura)
-- Por enquanto, manteremos ncm, cst_icms, cst_ipi, cst_pis, cst_cofins como TEXT
-- e adicionaremos validação para garantir que sejam códigos válidos

-- AIDEV-NOTE: Comentários nas colunas
-- AIDEV-NOTE: ncm_id removido - NCM validado via API FocusNFe
-- AIDEV-NOTE: cest_id removido - CEST não possui API pública
COMMENT ON COLUMN products.product_type_id IS
'Foreign key para product_type_reference. Tipo de produto validado.';
COMMENT ON COLUMN products.cst_icms_id IS 
'Foreign key para cst_icms_reference. CST ICMS validado e ativo.';
COMMENT ON COLUMN products.cst_ipi_id IS 
'Foreign key para cst_ipi_reference. CST IPI validado e ativo.';
COMMENT ON COLUMN products.cst_pis_id IS 
'Foreign key para cst_pis_cofins_reference. CST PIS validado e ativo.';
COMMENT ON COLUMN products.cst_cofins_id IS 
'Foreign key para cst_pis_cofins_reference. CST COFINS validado e ativo.';

