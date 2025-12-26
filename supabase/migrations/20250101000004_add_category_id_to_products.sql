-- =====================================================
-- MIGRATION: Adicionar category_id como Foreign Key em products
-- =====================================================
-- 
-- AIDEV-NOTE: Esta migration adiciona a coluna category_id como foreign key
-- para product_categories, seguindo o mesmo padrão usado para brand_id.
-- A coluna category (TEXT) legada será removida se existir.
--
-- Data: 2025-01-01
-- =====================================================

-- =====================================================
-- VERIFICAR E CRIAR TABELA product_categories SE NÃO EXISTIR
-- =====================================================

-- AIDEV-NOTE: Criar tabela product_categories se não existir (seguindo padrão de product_brands)
-- Primeiro criar sem foreign key se a tabela não existir
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AIDEV-NOTE: Constraint de unicidade por tenant (mesmo nome não pode repetir no mesmo tenant)
  CONSTRAINT unique_category_name_per_tenant UNIQUE (name, tenant_id)
);

-- AIDEV-NOTE: Garantir que a foreign key tenant_id existe e está correta
-- Se a tabela já existir sem a foreign key, vamos adicionar
DO $$
BEGIN
  -- Verificar se a coluna tenant_id existe mas não tem foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'product_categories' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'tenant_id'
  ) THEN
    -- Adicionar foreign key se não existir
    ALTER TABLE product_categories 
    ADD CONSTRAINT fk_product_categories_tenant_id 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active) WHERE is_active = true;

-- Comentários para documentação
COMMENT ON TABLE product_categories IS 
'Tabela de categorias de produtos. Cada tenant pode ter suas próprias categorias.';

COMMENT ON COLUMN product_categories.name IS 
'Nome da categoria (ex: Eletrônicos, Roupas, Alimentos). Deve ser único por tenant.';

COMMENT ON COLUMN product_categories.description IS 
'Descrição opcional da categoria.';

COMMENT ON COLUMN product_categories.tenant_id IS 
'ID do tenant proprietário da categoria. Isolamento multi-tenant obrigatório.';

COMMENT ON COLUMN product_categories.is_active IS 
'Se true, a categoria está ativa e pode ser usada em produtos.';

-- =====================================================
-- RLS (Row Level Security) para product_categories
-- =====================================================

-- AIDEV-NOTE: Habilitar RLS na tabela
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- AIDEV-NOTE: Remover policies existentes se houver (para recriar)
DROP POLICY IF EXISTS "tenant_isolation_select_product_categories" ON product_categories;
DROP POLICY IF EXISTS "tenant_isolation_insert_product_categories" ON product_categories;
DROP POLICY IF EXISTS "tenant_isolation_update_product_categories" ON product_categories;
DROP POLICY IF EXISTS "tenant_isolation_delete_product_categories" ON product_categories;

-- AIDEV-NOTE: Policy para SELECT - usuários só podem ver categorias do próprio tenant
CREATE POLICY "tenant_isolation_select_product_categories" ON product_categories
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para INSERT - usuários só podem criar categorias para o próprio tenant
CREATE POLICY "tenant_isolation_insert_product_categories" ON product_categories
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para UPDATE - usuários só podem atualizar categorias do próprio tenant
CREATE POLICY "tenant_isolation_update_product_categories" ON product_categories
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- AIDEV-NOTE: Policy para DELETE - usuários só podem deletar categorias do próprio tenant
CREATE POLICY "tenant_isolation_delete_product_categories" ON product_categories
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_categories_updated_at ON product_categories;
CREATE TRIGGER trigger_update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_product_categories_updated_at();

-- =====================================================
-- ATUALIZAR TABELA PRODUCTS PARA USAR FOREIGN KEY
-- =====================================================

-- AIDEV-NOTE: Remover coluna category (TEXT) legada se existir
ALTER TABLE products DROP COLUMN IF EXISTS category;

-- AIDEV-NOTE: Remover coluna category_id se já existir (para recriar com constraint correta)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    -- Se a coluna existe, verificar se tem constraint de foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'products' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'category_id'
    ) THEN
      -- Se não tem constraint, remover e recriar
      ALTER TABLE products DROP COLUMN category_id;
    END IF;
  END IF;
END $$;

-- AIDEV-NOTE: Adicionar coluna category_id como foreign key para product_categories
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id) WHERE category_id IS NOT NULL;

-- Comentário
COMMENT ON COLUMN products.category_id IS 
'Categoria do produto - Foreign key para product_categories.';

-- =====================================================
-- GARANTIR FOREIGN KEY tenant_id NA TABELA PRODUCTS
-- =====================================================

-- AIDEV-NOTE: Verificar e adicionar foreign key tenant_id se não existir
DO $$
BEGIN
  -- Verificar se a coluna tenant_id existe mas não tem foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'products' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'tenant_id'
  ) THEN
    -- Adicionar foreign key se não existir
    ALTER TABLE products 
    ADD CONSTRAINT fk_products_tenant_id 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key fk_products_tenant_id adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Foreign key tenant_id já existe ou coluna não encontrada';
  END IF;
END $$;

