-- =====================================================
-- MIGRATION: Atualizar RPC get_products_by_tenant (TEXT + JSONB + sem CASTs)
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration consolida todas as atualizações da RPC function:
-- 1. Retorna barcode como JSONB (não TEXT)
-- 2. Todas as colunas de texto retornam TEXT (não VARCHAR)
-- 3. Remove CASTs desnecessários (colunas já são TEXT/JSONB)
-- Isso simplifica o código e melhora a performance.
--
-- Data: 2025-01-01
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

-- AIDEV-NOTE: Criar nova função sem CASTs desnecessários (colunas já são TEXT)
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
  barcode JSONB, -- AIDEV-NOTE: JSONB para múltiplos códigos de barras
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
    fp.name, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.description, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.code, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.sku, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.barcode, -- AIDEV-NOTE: Já é JSONB, não precisa de CAST
    fp.unit_price,
    fp.cost_price,
    fp.stock_quantity,
    fp.min_stock_quantity,
    fp.category_id,
    fp.brand_id,
    fp.supplier, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.unit_of_measure, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.is_active,
    fp.tax_rate,
    fp.has_inventory,
    fp.image_url, -- AIDEV-NOTE: Já é TEXT, não precisa de CAST
    fp.tenant_id,
    fp.created_at,
    fp.updated_at,
    fp.created_by,
    fp.total_count
  FROM filtered_products fp;
END;
$$;

-- Comentário
COMMENT ON FUNCTION get_products_by_tenant IS 
'Função RPC para buscar produtos por tenant com filtros.
- Todas as colunas de texto usam TEXT (não VARCHAR) conforme recomendação PostgreSQL
- Coluna barcode usa JSONB para permitir múltiplos códigos de barras por produto
- Sem CASTs desnecessários (colunas já são TEXT/JSONB)
Parâmetros: p_tenant_id (obrigatório), p_search_term, p_category_id, p_is_active, p_min_price, p_max_price, p_in_stock, p_page, p_limit';

