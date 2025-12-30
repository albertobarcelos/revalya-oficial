-- AIDEV-NOTE: Adicionar campos de controle fiscal em billing_period_items
-- Permite rastrear quais itens já foram incluídos em notas fiscais

-- Campos para controle de NF-e (produtos)
ALTER TABLE billing_period_items
ADD COLUMN IF NOT EXISTS product_nfe_emitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS product_nfe_emitted_at timestamptz,
ADD COLUMN IF NOT EXISTS product_nfe_invoice_id uuid REFERENCES fiscal_invoices(id) ON DELETE SET NULL;

-- Campos para controle de NFS-e (serviços)
ALTER TABLE billing_period_items
ADD COLUMN IF NOT EXISTS service_nfse_emitted_amount numeric DEFAULT 0 CHECK (service_nfse_emitted_amount >= 0);

-- Comentários
COMMENT ON COLUMN billing_period_items.product_nfe_emitted IS 'Se true, este item de produto já foi incluído em uma NF-e emitida. Impede emissão duplicada.';
COMMENT ON COLUMN billing_period_items.product_nfe_emitted_at IS 'Data/hora em que o item de produto foi incluído na NF-e.';
COMMENT ON COLUMN billing_period_items.product_nfe_invoice_id IS 'Referência à fiscal_invoice que incluiu este item de produto. Permite rastreabilidade.';
COMMENT ON COLUMN billing_period_items.service_nfse_emitted_amount IS 'Valor já emitido em NFS-e para este item de serviço. Deve ser <= (unit_price * quantity). Permite emissão proporcional ao pagamento.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_billing_period_items_product_nfe_emitted ON billing_period_items(product_nfe_emitted) WHERE product_nfe_emitted = true;
CREATE INDEX IF NOT EXISTS idx_billing_period_items_product_nfe_invoice ON billing_period_items(product_nfe_invoice_id) WHERE product_nfe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_period_items_service_nfse_amount ON billing_period_items(service_nfse_emitted_amount) WHERE service_id IS NOT NULL;

