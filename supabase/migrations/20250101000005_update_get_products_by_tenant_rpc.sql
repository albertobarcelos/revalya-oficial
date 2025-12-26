-- =====================================================
-- MIGRATION: Atualizar função RPC get_products_by_tenant
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration atualiza a função RPC get_products_by_tenant
-- para usar category_id ao invés de category (campo legado removido).
--
-- Data: 2025-01-01
-- =====================================================

-- =====================================================
-- ATUALIZAR FUNÇÃO RPC get_products_by_tenant
-- =====================================================

-- AIDEV-NOTE: Remover TODAS as versões antigas da função antes de criar a nova
-- Isso é necessário porque não podemos usar CREATE OR REPLACE quando mudamos o tipo de retorno

-- Versão 1: Com p_category TEXT (sem nomes de parâmetros)
DROP FUNCTION IF EXISTS get_products_by_tenant(UUID, TEXT, TEXT, BOOLEAN, NUMERIC, NUMERIC, BOOLEAN, INTEGER, INTEGER);

-- Versão 2: Com p_category TEXT (com nomes de parâmetros)
DROP FUNCTION IF EXISTS get_products_by_tenant(
  p_tenant_id UUID,
  p_search_term TEXT,
  p_category TEXT,
  p_is_active BOOLEAN,
  p_min_price NUMERIC,
  p_max_price NUMERIC,
  p_in_stock BOOLEAN,
  p_page INTEGER,
  p_limit INTEGER
);

-- Versão 3: Com p_category_id UUID mas tipos de retorno antigos (caso já tenha sido criada parcialmente)
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

-- AIDEV-NOTE: Criar nova função com assinatura atualizada (p_category_id UUID)
CREATE OR REPLACE FUNCTION get_products_by_tenant(
  p_tenant_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL, -- AIDEV-NOTE: Alterado de p_category (TEXT) para p_category_id (UUID)
  p_is_active BOOLEAN DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_in_stock BOOLEAN DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL (https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_varchar.28n.29_by_default)
  description TEXT,
  code TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL
  sku TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL
  barcode TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL
  unit_price NUMERIC,
  cost_price NUMERIC,
  stock_quantity INTEGER,
  min_stock_quantity INTEGER,
  category_id UUID, -- AIDEV-NOTE: Alterado de category (TEXT) para category_id (UUID)
  brand_id UUID,
  supplier TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL
  unit_of_measure TEXT, -- AIDEV-NOTE: Usando TEXT conforme recomendação PostgreSQL
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
  -- AIDEV-NOTE: Calcular offset para paginação
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
      AND (p_category_id IS NULL OR p.category_id = p_category_id) -- AIDEV-NOTE: Usar category_id ao invés de category
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
    fp.name::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(255), função espera TEXT
    fp.description,
    fp.code::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(50), função espera TEXT
    fp.sku::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(50), função espera TEXT
    fp.barcode::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(50), função espera TEXT
    fp.unit_price,
    fp.cost_price,
    fp.stock_quantity,
    fp.min_stock_quantity,
    fp.category_id, -- AIDEV-NOTE: Retornar category_id ao invés de category
    fp.brand_id,
    fp.supplier::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(100), função espera TEXT
    fp.unit_of_measure::TEXT, -- AIDEV-NOTE: CAST explícito necessário - tabela retorna CHARACTER VARYING(10), função espera TEXT
    fp.is_active,
    fp.tax_rate,
    fp.has_inventory,
    fp.image_url,
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
Atualizada para usar category_id (UUID) ao invés de category (TEXT).
Usa TEXT ao invés de VARCHAR(n) conforme recomendação PostgreSQL (wiki.postgresql.org Don''t Do This).
Parâmetros: p_tenant_id (obrigatório), p_search_term, p_category_id, p_is_active, p_min_price, p_max_price, p_in_stock, p_page, p_limit';

