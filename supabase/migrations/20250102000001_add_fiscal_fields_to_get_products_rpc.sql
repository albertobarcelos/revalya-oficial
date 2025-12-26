-- =====================================================
-- MIGRATION: Adicionar campos fiscais à função RPC get_products_by_tenant
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration adiciona os campos fiscais à função RPC
-- para que os produtos retornados incluam dados fiscais (CFOP, NCM, CSTs, etc.)
-- Isso permite que o formulário de edição carregue corretamente os dados fiscais salvos.
--
-- Data: 2025-01-02
-- =====================================================

-- AIDEV-NOTE: Remover função antiga
DROP FUNCTION IF EXISTS get_products_by_tenant(
  p_tenant_id UUID,
  p_search_term TEXT,
  p_category_id UUID,
  p_is_active BOOLEAN,
  p_min_price NUMERIC,
  p_max_price NUMERIC,
  p_in_stock BOOLEAN,
  p_page INTEGER,
  p_limit INTEGER
);

-- AIDEV-NOTE: Recriar função com campos fiscais incluídos
CREATE OR REPLACE FUNCTION get_products_by_tenant(
  p_tenant_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_in_stock BOOLEAN DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  code TEXT,
  sku TEXT,
  barcode JSONB,
  unit_price NUMERIC,
  cost_price NUMERIC,
  stock_quantity INTEGER,
  min_stock_quantity INTEGER,
  category_id UUID,
  brand_id UUID,
  supplier TEXT,
  unit_of_measure TEXT,
  is_active BOOLEAN,
  tax_rate NUMERIC,
  has_inventory BOOLEAN,
  image_url TEXT,
  -- AIDEV-NOTE: Campos fiscais adicionados
  ncm TEXT,
  cest TEXT,
  product_type_id UUID,
  cfop_id UUID,
  origem TEXT,
  cst_icms TEXT,
  cst_icms_id UUID,
  cst_ipi TEXT,
  cst_ipi_id UUID,
  cst_pis TEXT,
  cst_pis_id UUID,
  cst_cofins TEXT,
  cst_cofins_id UUID,
  -- AIDEV-NOTE: Alíquotas de PIS e COFINS
  aliquota_pis NUMERIC,
  aliquota_cofins NUMERIC,
  tenant_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  WITH filtered_products AS (
    SELECT 
      p.*,
      COUNT(*) OVER() as total_count
    FROM products p
    WHERE p.tenant_id = p_tenant_id
      AND (p_search_term IS NULL OR 
           p.name ILIKE '%' || p_search_term || '%' OR
           p.description ILIKE '%' || p_search_term || '%' OR
           p.sku ILIKE '%' || p_search_term || '%')
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_is_active IS NULL OR p.is_active = p_is_active)
      AND (p_min_price IS NULL OR p.unit_price >= p_min_price)
      AND (p_max_price IS NULL OR p.unit_price <= p_max_price)
      AND (p_in_stock IS NULL OR 
           (p_in_stock = true AND p.stock_quantity > 0) OR
           (p_in_stock = false AND p.stock_quantity = 0))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  )
  SELECT 
    fp.id,
    fp.name,
    fp.description,
    fp.code,
    fp.sku,
    fp.barcode,
    fp.unit_price,
    fp.cost_price,
    fp.stock_quantity,
    fp.min_stock_quantity,
    fp.category_id,
    fp.brand_id,
    fp.supplier,
    fp.unit_of_measure,
    fp.is_active,
    fp.tax_rate,
    fp.has_inventory,
    fp.image_url,
    -- AIDEV-NOTE: Campos fiscais adicionados
    fp.ncm,
    fp.cest,
    fp.product_type_id,
    fp.cfop_id,
    fp.origem,
    fp.cst_icms,
    fp.cst_icms_id,
    fp.cst_ipi,
    fp.cst_ipi_id,
    fp.cst_pis,
    fp.cst_pis_id,
    fp.cst_cofins,
    fp.cst_cofins_id,
    -- AIDEV-NOTE: Alíquotas de PIS e COFINS
    fp.aliquota_pis,
    fp.aliquota_cofins,
    fp.tenant_id,
    fp.created_at,
    fp.updated_at,
    fp.created_by,
    fp.total_count
  FROM filtered_products fp;
END;
$$;

-- Comentário atualizado
COMMENT ON FUNCTION get_products_by_tenant IS 
'Função RPC para buscar produtos por tenant com filtros.
- Inclui todos os campos fiscais (NCM, CFOP, CSTs, etc.)
- Todas as colunas de texto usam TEXT (não VARCHAR) conforme recomendação PostgreSQL
- Coluna barcode usa JSONB para permitir múltiplos códigos de barras por produto
Parâmetros: p_tenant_id (obrigatório), p_search_term, p_category_id, p_is_active, p_min_price, p_max_price, p_in_stock, p_page, p_limit';

