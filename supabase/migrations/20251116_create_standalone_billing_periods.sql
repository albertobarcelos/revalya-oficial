-- =====================================================
-- MIGRAÇÃO: CRIAÇÃO DAS TABELAS DE FATURAMENTO AVULSO
-- Data: 2025-11-16
-- Descrição: Tabelas para gerenciar faturamentos avulsos (sem contrato)
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Criar tipo ENUM para status de faturamento avulso
-- Reutiliza os mesmos valores de contract_billing_periods para consistência
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'standalone_billing_status') THEN
    CREATE TYPE standalone_billing_status AS ENUM (
      'PENDING',
      'DUE_TODAY',
      'BILLED',
      'PAID',
      'OVERDUE',
      'CANCELLED'
    );
  END IF;
END $$;

-- AIDEV-NOTE: Tabela principal para períodos de faturamento avulso
-- Estrutura similar a contract_billing_periods, mas sem contract_id
CREATE TABLE IF NOT EXISTS public.standalone_billing_periods (
  -- CHAVES PRIMÁRIAS E IDENTIFICAÇÃO
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- RELACIONAMENTOS
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  contract_id UUID NULL REFERENCES contracts(id) ON DELETE SET NULL, -- Opcional: cliente pode ter contrato
  
  -- DATAS E PERÍODOS
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL, -- Data de vencimento da cobrança
  
  -- STATUS E VALORES
  status standalone_billing_status NOT NULL DEFAULT 'PENDING',
  amount_planned DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_billed DECIMAL(15,2) DEFAULT NULL,
  billed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- CONFIGURAÇÕES DE PAGAMENTO
  payment_method TEXT, -- PIX, BOLETO, CREDIT_CARD, CASH
  payment_gateway_id UUID REFERENCES payment_gateways(id) ON DELETE SET NULL,
  
  -- METADADOS E AUDITORIA
  description TEXT,
  manual_mark BOOLEAN DEFAULT FALSE,
  manual_reason TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status standalone_billing_status,
  transition_reason TEXT,
  
  -- TIMESTAMPS
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Sao_Paulo'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Sao_Paulo'::text, now()) NOT NULL,
  
  -- CONSTRAINTS
  CONSTRAINT chk_amount_planned_positive CHECK (amount_planned >= 0),
  CONSTRAINT chk_amount_billed_positive CHECK (amount_billed IS NULL OR amount_billed >= 0),
  CONSTRAINT chk_due_date_after_bill_date CHECK (due_date >= bill_date)
);

-- AIDEV-NOTE: Tabela para itens (produtos/serviços) do faturamento avulso
CREATE TABLE IF NOT EXISTS public.standalone_billing_items (
  -- CHAVES PRIMÁRIAS E IDENTIFICAÇÃO
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  standalone_billing_period_id UUID NOT NULL REFERENCES standalone_billing_periods(id) ON DELETE CASCADE,
  
  -- RELACIONAMENTOS (um item pode ser produto OU serviço)
  product_id UUID NULL REFERENCES products(id) ON DELETE RESTRICT,
  service_id UUID NULL REFERENCES services(id) ON DELETE RESTRICT,
  storage_location_id UUID NULL REFERENCES storage_locations(id) ON DELETE SET NULL, -- Para baixa de estoque
  
  -- QUANTIDADE E VALORES
  quantity DECIMAL(15,6) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- DESCRIÇÃO E METADADOS
  description TEXT,
  observation TEXT,
  
  -- VINCULAÇÃO COM MOVIMENTAÇÃO DE ESTOQUE (após faturamento)
  stock_movement_id UUID NULL REFERENCES stock_movements(id) ON DELETE SET NULL,
  
  -- TIMESTAMPS
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Sao_Paulo'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Sao_Paulo'::text, now()) NOT NULL,
  
  -- CONSTRAINTS
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_unit_price_positive CHECK (unit_price >= 0),
  CONSTRAINT chk_item_has_product_or_service CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR
    (product_id IS NULL AND service_id IS NOT NULL)
  )
);

-- AIDEV-NOTE: Índices para performance
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_tenant_id 
  ON standalone_billing_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_customer_id 
  ON standalone_billing_periods(customer_id);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_contract_id 
  ON standalone_billing_periods(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_status 
  ON standalone_billing_periods(status);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_bill_date 
  ON standalone_billing_periods(bill_date);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_periods_due_date 
  ON standalone_billing_periods(due_date);

CREATE INDEX IF NOT EXISTS idx_standalone_billing_items_tenant_id 
  ON standalone_billing_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_items_period_id 
  ON standalone_billing_items(standalone_billing_period_id);
CREATE INDEX IF NOT EXISTS idx_standalone_billing_items_product_id 
  ON standalone_billing_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_standalone_billing_items_service_id 
  ON standalone_billing_items(service_id) WHERE service_id IS NOT NULL;

-- AIDEV-NOTE: Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_standalone_billing_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_standalone_billing_periods_updated_at
  BEFORE UPDATE ON standalone_billing_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_billing_periods_updated_at();

CREATE OR REPLACE FUNCTION update_standalone_billing_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_standalone_billing_items_updated_at
  BEFORE UPDATE ON standalone_billing_items
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_billing_items_updated_at();

-- AIDEV-NOTE: RLS Policies para isolamento multi-tenant
-- Política para standalone_billing_periods
ALTER TABLE standalone_billing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view standalone billing periods from their tenant"
  ON standalone_billing_periods
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create standalone billing periods in their tenant"
  ON standalone_billing_periods
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update standalone billing periods from their tenant"
  ON standalone_billing_periods
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete standalone billing periods from their tenant"
  ON standalone_billing_periods
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Política para standalone_billing_items
ALTER TABLE standalone_billing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view standalone billing items from their tenant"
  ON standalone_billing_items
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create standalone billing items in their tenant"
  ON standalone_billing_items
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update standalone billing items from their tenant"
  ON standalone_billing_items
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete standalone billing items from their tenant"
  ON standalone_billing_items
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- AIDEV-NOTE: Comentários nas tabelas para documentação
COMMENT ON TABLE standalone_billing_periods IS 'Períodos de faturamento avulso (sem contrato obrigatório)';
COMMENT ON TABLE standalone_billing_items IS 'Itens (produtos/serviços) de faturamentos avulsos';
COMMENT ON COLUMN standalone_billing_periods.contract_id IS 'Opcional: permite vincular faturamento avulso a um contrato existente do cliente';
COMMENT ON COLUMN standalone_billing_items.stock_movement_id IS 'Vincula movimentação de estoque criada após faturamento';

