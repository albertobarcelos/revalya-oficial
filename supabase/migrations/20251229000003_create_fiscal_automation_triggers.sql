-- AIDEV-NOTE: Triggers para automação de emissão de notas fiscais
-- Executa emissão automática baseada em fiscal_config do contrato

-- Função para verificar e emitir NF-e automaticamente ao faturar
CREATE OR REPLACE FUNCTION trigger_auto_emit_nfe()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id uuid;
  v_fiscal_config jsonb;
  v_has_products boolean;
BEGIN
  -- AIDEV-NOTE: Só processar se status mudou para BILLED
  IF NEW.status != 'BILLED' OR OLD.status = 'BILLED' THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Buscar contract_id e fiscal_config
  SELECT contract_id, fiscal_config
  INTO v_contract_id, v_fiscal_config
  FROM contracts
  WHERE id = NEW.contract_id;

  -- AIDEV-NOTE: Verificar se auto_emit_nfe está habilitado
  IF v_fiscal_config IS NULL OR (v_fiscal_config->>'auto_emit_nfe')::boolean != true THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Verificar se tem produtos no período
  SELECT EXISTS(
    SELECT 1 FROM billing_period_items
    WHERE billing_period_id = NEW.id
    AND product_id IS NOT NULL
  ) INTO v_has_products;

  IF NOT v_has_products THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Chamar Edge Function para emitir NF-e
  -- Nota: Em produção, isso seria feito via pg_net ou webhook
  -- Por enquanto, apenas registra que deve ser emitido
  INSERT INTO fiscal_invoices (
    tenant_id,
    tipo,
    origem,
    customer_id,
    contract_id,
    billing_period_id,
    valor,
    status,
    metadata
  )
  SELECT
    NEW.tenant_id,
    'NFE',
    'PRODUTO',
    NEW.customer_id,
    NEW.contract_id,
    NEW.id,
    COALESCE(NEW.amount_billed, NEW.amount_planned, 0),
    'PENDENTE',
    jsonb_build_object(
      'auto_emitted', true,
      'triggered_at', now()
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM fiscal_invoices
    WHERE billing_period_id = NEW.id
    AND tipo = 'NFE'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-emissão de NF-e
CREATE TRIGGER auto_emit_nfe_on_billing
AFTER UPDATE OF status ON contract_billing_periods
FOR EACH ROW
WHEN (NEW.status = 'BILLED' AND OLD.status != 'BILLED')
EXECUTE FUNCTION trigger_auto_emit_nfe();

-- Função para verificar e emitir NFS-e automaticamente no recebimento
CREATE OR REPLACE FUNCTION trigger_auto_emit_nfse()
RETURNS TRIGGER AS $$
DECLARE
  v_billing_period_id uuid;
  v_contract_id uuid;
  v_fiscal_config jsonb;
  v_emit_moment text;
  v_has_services boolean;
BEGIN
  -- AIDEV-NOTE: Só processar se status mudou para RECEIVED*
  IF NEW.status NOT LIKE 'RECEIVED%' OR OLD.status LIKE 'RECEIVED%' THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Buscar billing_period_id
  v_billing_period_id := NEW.billing_periods;

  IF v_billing_period_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Buscar contract_id e fiscal_config
  SELECT contract_id, fiscal_config
  INTO v_contract_id, v_fiscal_config
  FROM contract_billing_periods
  WHERE id = v_billing_period_id;

  IF v_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fiscal_config
  INTO v_fiscal_config
  FROM contracts
  WHERE id = v_contract_id;

  -- AIDEV-NOTE: Verificar se auto_emit_nfse está habilitado
  IF v_fiscal_config IS NULL OR (v_fiscal_config->>'auto_emit_nfse')::boolean != true THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Verificar momento de emissão
  v_emit_moment := v_fiscal_config->>'nfse_emit_moment';

  IF v_emit_moment != 'recebimento' THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Verificar se tem serviços no período
  SELECT EXISTS(
    SELECT 1 FROM billing_period_items
    WHERE billing_period_id = v_billing_period_id
    AND service_id IS NOT NULL
  ) INTO v_has_services;

  IF NOT v_has_services THEN
    RETURN NEW;
  END IF;

  -- AIDEV-NOTE: Criar registro de NFS-e pendente
  -- A emissão real será feita via Edge Function
  INSERT INTO fiscal_invoices (
    tenant_id,
    tipo,
    origem,
    customer_id,
    contract_id,
    billing_period_id,
    charge_id,
    valor,
    status,
    metadata
  )
  SELECT
    NEW.tenant_id,
    'NFSE',
    'SERVICO',
    (SELECT customer_id FROM contract_billing_periods WHERE id = v_billing_period_id),
    v_contract_id,
    v_billing_period_id,
    NEW.id,
    NEW.valor,
    'PENDENTE',
    jsonb_build_object(
      'auto_emitted', true,
      'triggered_at', now(),
      'valor_mode', v_fiscal_config->>'nfse_valor_mode',
      'parcelas_mode', v_fiscal_config->>'nfse_parcelas_mode'
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM fiscal_invoices
    WHERE charge_id = NEW.id
    AND tipo = 'NFSE'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-emissão de NFS-e
CREATE TRIGGER auto_emit_nfse_on_receipt
AFTER UPDATE OF status ON charges
FOR EACH ROW
WHEN (NEW.status LIKE 'RECEIVED%' AND OLD.status NOT LIKE 'RECEIVED%')
EXECUTE FUNCTION trigger_auto_emit_nfse();

-- Comentários
COMMENT ON FUNCTION trigger_auto_emit_nfe() IS 'Trigger para emitir NF-e automaticamente ao faturar produtos, baseado em fiscal_config do contrato';
COMMENT ON FUNCTION trigger_auto_emit_nfse() IS 'Trigger para emitir NFS-e automaticamente ao receber pagamento, baseado em fiscal_config do contrato';

