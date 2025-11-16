-- =====================================================
-- MIGRAÇÃO: CRIAÇÃO DA TABELA STOCK_MOVEMENTS
-- Data: 2025-11-15
-- Descrição: Tabela para rastrear movimentações de estoque
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Tabela para registro de todas as movimentações de estoque
-- Implementa isolamento multi-tenant e auditoria completa

-- Criar tipo ENUM para tipos de movimento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE stock_movement_type AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA');
  END IF;
END $$;

-- Criar tabela stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  -- CHAVES PRIMÁRIAS E IDENTIFICAÇÃO
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- RELACIONAMENTOS
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  
  -- TIPO E MOTIVO DO MOVIMENTO
  movement_type stock_movement_type NOT NULL,
  movement_reason TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- QUANTIDADE E VALORES
  quantity DECIMAL(15,6) NOT NULL CHECK (quantity > 0),
  unit_value DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_value) STORED,
  
  -- SALDO E CMC (Custo Médio de Compra)
  accumulated_balance DECIMAL(15,6) DEFAULT 0,
  unit_cmc DECIMAL(15,2) DEFAULT 0,
  total_cmc DECIMAL(15,2) GENERATED ALWAYS AS (accumulated_balance * unit_cmc) STORED,
  
  -- DADOS ADICIONAIS
  invoice_number TEXT,
  operation TEXT,
  customer_or_supplier TEXT,
  observation TEXT,
  
  -- TRANSFERÊNCIAS ENTRE LOCAIS
  origin_storage_location_id UUID REFERENCES storage_locations(id) ON DELETE RESTRICT,
  destination_storage_location_id UUID REFERENCES storage_locations(id) ON DELETE RESTRICT,
  
  -- AUDITORIA
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_by UUID REFERENCES auth.users(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_storage_location_id ON public.stock_movements(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_product ON public.stock_movements(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(tenant_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(tenant_id, created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_stock_movements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movements_updated_at
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_movements_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "stock_movements_select_policy" ON public.stock_movements
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Política para INSERT
CREATE POLICY "stock_movements_insert_policy" ON public.stock_movements
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Política para UPDATE
CREATE POLICY "stock_movements_update_policy" ON public.stock_movements
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
CREATE POLICY "stock_movements_delete_policy" ON public.stock_movements
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

COMMENT ON TABLE public.stock_movements IS 'Tabela para registro de movimentações de estoque';
COMMENT ON COLUMN public.stock_movements.movement_type IS 'Tipo de movimento: ENTRADA, SAIDA, AJUSTE, TRANSFERENCIA';
COMMENT ON COLUMN public.stock_movements.accumulated_balance IS 'Saldo acumulado após esta movimentação';
COMMENT ON COLUMN public.stock_movements.unit_cmc IS 'Custo Médio de Compra unitário';
COMMENT ON COLUMN public.stock_movements.total_cmc IS 'CMC total (accumulated_balance * unit_cmc)';

