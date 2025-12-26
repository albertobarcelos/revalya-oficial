-- AIDEV-NOTE: Migration para criar tabela de marcas de produtos
-- Segue o mesmo padrão de product_categories para consistência

-- =====================================================
-- TABELA: product_brands
-- =====================================================

CREATE TABLE IF NOT EXISTS product_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AIDEV-NOTE: Constraint de unicidade por tenant (mesmo nome não pode repetir no mesmo tenant)
  CONSTRAINT unique_brand_name_per_tenant UNIQUE (name, tenant_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_brands_tenant_id ON product_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_brands_name ON product_brands(name);
CREATE INDEX IF NOT EXISTS idx_product_brands_active ON product_brands(is_active) WHERE is_active = true;

-- Comentários para documentação
COMMENT ON TABLE product_brands IS 
'Tabela de marcas de produtos. Cada tenant pode ter suas próprias marcas.';

COMMENT ON COLUMN product_brands.name IS 
'Nome da marca (ex: Samsung, Apple, Nike). Deve ser único por tenant.';

COMMENT ON COLUMN product_brands.description IS 
'Descrição opcional da marca.';

COMMENT ON COLUMN product_brands.tenant_id IS 
'ID do tenant proprietário da marca. Isolamento multi-tenant obrigatório.';

COMMENT ON COLUMN product_brands.is_active IS 
'Se true, a marca está ativa e pode ser usada em produtos.';

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- AIDEV-NOTE: Habilitar RLS na tabela
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;

-- AIDEV-NOTE: Policy para SELECT - usuários só podem ver marcas do próprio tenant
CREATE POLICY "tenant_isolation_select_product_brands" ON product_brands
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para INSERT - usuários só podem criar marcas para o próprio tenant
CREATE POLICY "tenant_isolation_insert_product_brands" ON product_brands
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para UPDATE - usuários só podem atualizar marcas do próprio tenant
CREATE POLICY "tenant_isolation_update_product_brands" ON product_brands
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para DELETE - usuários só podem deletar marcas do próprio tenant
CREATE POLICY "tenant_isolation_delete_product_brands" ON product_brands
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_brands_updated_at
  BEFORE UPDATE ON product_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_product_brands_updated_at();

-- =====================================================
-- ATUALIZAR TABELA PRODUCTS PARA USAR FOREIGN KEY
-- =====================================================

-- AIDEV-NOTE: Adicionar coluna brand_id como foreign key para product_brands
-- Se já existir coluna brand (TEXT), vamos substituir por brand_id (UUID)
ALTER TABLE products DROP COLUMN IF EXISTS brand;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES product_brands(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id) WHERE brand_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN products.brand_id IS 
'Marca do produto - Foreign key para product_brands.';

