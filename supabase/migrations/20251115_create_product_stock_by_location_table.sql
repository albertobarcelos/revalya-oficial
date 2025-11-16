-- =====================================================
-- MIGRAÇÃO: CRIAÇÃO DA TABELA PRODUCT_STOCK_BY_LOCATION
-- Data: 2025-11-15
-- Descrição: Tabela para rastrear estoque de produtos por local
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Tabela para rastrear estoque disponível por local de armazenamento
-- Mantém sincronização com movimentações de estoque

-- Criar tabela product_stock_by_location
CREATE TABLE IF NOT EXISTS public.product_stock_by_location (
  -- CHAVES PRIMÁRIAS E IDENTIFICAÇÃO
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- RELACIONAMENTOS
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  
  -- ESTOQUE E CMC
  available_stock DECIMAL(15,6) DEFAULT 0 CHECK (available_stock >= 0),
  min_stock DECIMAL(15,6) DEFAULT 0 CHECK (min_stock >= 0),
  unit_cmc DECIMAL(15,2) DEFAULT 0,
  total_cmc DECIMAL(15,2) GENERATED ALWAYS AS (available_stock * unit_cmc) STORED,
  
  -- AUDITORIA
  updated_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
  
  -- CONSTRAINT: Um produto só pode ter um registro por local por tenant
  CONSTRAINT product_stock_by_location_unique UNIQUE (tenant_id, product_id, storage_location_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_stock_by_location_tenant_id ON public.product_stock_by_location(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_location_product_id ON public.product_stock_by_location(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_location_storage_location_id ON public.product_stock_by_location(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_location_tenant_product ON public.product_stock_by_location(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_by_location_updated_at ON public.product_stock_by_location(tenant_id, updated_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_product_stock_by_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_stock_by_location_updated_at
  BEFORE UPDATE ON public.product_stock_by_location
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_by_location_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.product_stock_by_location ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "product_stock_by_location_select_policy" ON public.product_stock_by_location
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Política para INSERT
CREATE POLICY "product_stock_by_location_insert_policy" ON public.product_stock_by_location
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Política para UPDATE
CREATE POLICY "product_stock_by_location_update_policy" ON public.product_stock_by_location
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Política para DELETE
CREATE POLICY "product_stock_by_location_delete_policy" ON public.product_stock_by_location
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- =====================================================
-- COMENTÁRIOS NAS COLUNAS
-- =====================================================

COMMENT ON TABLE public.product_stock_by_location IS 'Tabela para rastrear estoque de produtos por local de armazenamento';
COMMENT ON COLUMN public.product_stock_by_location.available_stock IS 'Estoque disponível no local';
COMMENT ON COLUMN public.product_stock_by_location.min_stock IS 'Estoque mínimo configurado para o local';
COMMENT ON COLUMN public.product_stock_by_location.unit_cmc IS 'Custo Médio de Compra unitário';
COMMENT ON COLUMN public.product_stock_by_location.total_cmc IS 'CMC total (available_stock * unit_cmc)';

