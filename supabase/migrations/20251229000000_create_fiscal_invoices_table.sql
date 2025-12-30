-- AIDEV-NOTE: Criar tabela fiscal_invoices
-- Tabela central para armazenar todas as notas fiscais emitidas (NF-e e NFS-e)

CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Tipo e origem
  tipo text NOT NULL CHECK (tipo IN ('NFE', 'NFSE')),
  origem text NOT NULL CHECK (origem IN ('PRODUTO', 'SERVICO')),
  
  -- Vínculos
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  billing_period_id uuid REFERENCES contract_billing_periods(id) ON DELETE SET NULL,
  charge_id uuid REFERENCES charges(id) ON DELETE SET NULL,
  
  -- Valores
  valor numeric NOT NULL CHECK (valor > 0),
  
  -- Status interno
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'EMITIDA', 'CANCELADA', 'ERRO')),
  
  -- Dados FocusNFe
  focus_ref text,
  focus_status text,
  chave text,
  numero text,
  serie text,
  xml_url text,
  pdf_url text,
  danfe_url text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  
  -- Auditoria
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Constraint: apenas 1 NF-e por billing_period_id
  CONSTRAINT uq_nfe_per_billing_period UNIQUE (billing_period_id, tipo) 
    WHERE tipo = 'NFE' AND billing_period_id IS NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_tenant ON fiscal_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_customer ON fiscal_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_contract ON fiscal_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_billing_period ON fiscal_invoices(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_charge ON fiscal_invoices(charge_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_status ON fiscal_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_tipo ON fiscal_invoices(tipo);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_chave ON fiscal_invoices(chave) WHERE chave IS NOT NULL;

-- RLS
ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas notas fiscais do próprio tenant
CREATE POLICY "Usuários podem ver notas fiscais do próprio tenant"
ON fiscal_invoices FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Policy: Usuários podem inserir notas fiscais no próprio tenant
CREATE POLICY "Usuários podem inserir notas fiscais no próprio tenant"
ON fiscal_invoices FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Policy: Usuários podem atualizar notas fiscais do próprio tenant
CREATE POLICY "Usuários podem atualizar notas fiscais do próprio tenant"
ON fiscal_invoices FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Comentários
COMMENT ON TABLE fiscal_invoices IS 'Tabela fonte da verdade para emissões fiscais (NF-e e NFS-e) via FocusNFe';
COMMENT ON COLUMN fiscal_invoices.tipo IS 'Tipo de nota: NFE (Nota Fiscal Eletrônica) ou NFSE (Nota Fiscal de Serviços Eletrônica)';
COMMENT ON COLUMN fiscal_invoices.origem IS 'Origem: PRODUTO (NF-e) ou SERVICO (NFS-e)';
COMMENT ON COLUMN fiscal_invoices.status IS 'Status interno: PENDENTE, PROCESSANDO, EMITIDA, CANCELADA, ERRO';
COMMENT ON COLUMN fiscal_invoices.focus_ref IS 'Referência única da nota na API FocusNFe';
COMMENT ON COLUMN fiscal_invoices.chave IS 'Chave de acesso da nota fiscal (44 dígitos)';
COMMENT ON COLUMN fiscal_invoices.metadata IS 'Metadados adicionais da emissão (payload completo, logs, etc)';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fiscal_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fiscal_invoices_updated_at
BEFORE UPDATE ON fiscal_invoices
FOR EACH ROW
EXECUTE FUNCTION update_fiscal_invoices_updated_at();

