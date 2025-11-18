-- =====================================================
-- MIGRAÇÃO: FUNÇÃO RPC attempt_standalone_billing_charge
-- Data: 2025-11-16
-- Descrição: Função para processar faturamento avulso (criar charge, baixar estoque, etc)
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Função para processar faturamento avulso
-- Cria charge local, movimentações de estoque e vincula ao período
-- A criação de charge no gateway deve ser feita pelo serviço TypeScript depois
CREATE OR REPLACE FUNCTION attempt_standalone_billing_charge(
  p_period_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period RECORD;
  v_customer RECORD;
  v_gateway RECORD;
  v_charge_id UUID;
  v_item RECORD;
  v_movement_id UUID;
  v_total_amount NUMERIC := 0;
  v_items_processed INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_result JSONB;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para segurança
  PERFORM set_tenant_context_simple(p_tenant_id);

  -- AIDEV-NOTE: Buscar período avulso
  SELECT 
    sbp.*,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.cpf_cnpj as customer_document,
    c.customer_asaas_id
  INTO v_period
  FROM standalone_billing_periods sbp
  INNER JOIN customers c ON c.id = sbp.customer_id
  WHERE sbp.id = p_period_id
    AND sbp.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Período de faturamento avulso não encontrado'
    );
  END IF;

  -- AIDEV-NOTE: Validar que período não está já faturado
  IF v_period.status = 'BILLED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Período já foi faturado'
    );
  END IF;

  -- AIDEV-NOTE: Buscar gateway de pagamento padrão ou do período
  -- AIDEV-NOTE: Gateway será usado pelo serviço TypeScript para criar charge externa
  IF v_period.payment_gateway_id IS NOT NULL THEN
    SELECT * INTO v_gateway
    FROM payment_gateways
    WHERE id = v_period.payment_gateway_id
      AND tenant_id = p_tenant_id
      AND is_active = true;
  END IF;

  -- AIDEV-NOTE: Se não encontrou gateway específico, buscar gateway padrão do tenant
  IF v_gateway IS NULL THEN
    SELECT * INTO v_gateway
    FROM payment_gateways
    WHERE tenant_id = p_tenant_id
      AND is_active = true
      AND is_default = true
    LIMIT 1;
  END IF;

  -- AIDEV-NOTE: Se ainda não encontrou, buscar qualquer gateway ativo do tenant
  IF v_gateway IS NULL THEN
    SELECT * INTO v_gateway
    FROM payment_gateways
    WHERE tenant_id = p_tenant_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- AIDEV-NOTE: Calcular total dos itens
  SELECT COALESCE(SUM(total_price), 0) INTO v_total_amount
  FROM standalone_billing_items
  WHERE standalone_billing_period_id = p_period_id
    AND tenant_id = p_tenant_id;

  -- AIDEV-NOTE: Criar charge local (sem gateway ainda - será feito pelo serviço TypeScript)
  -- AIDEV-NOTE: billing_periods fica NULL para avulsos (referencia contract_billing_periods)
  -- A vinculação será feita via descrição ou busca reversa pela data e cliente
  INSERT INTO charges (
    tenant_id,
    customer_id,
    contract_id,
    valor,
    status,
    tipo,
    data_vencimento,
    descricao,
    billing_periods, -- NULL para avulsos
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    v_period.customer_id,
    v_period.contract_id, -- Pode ser NULL
    v_total_amount,
    'PENDING',
    COALESCE(v_period.payment_method, 'BOLETO'),
    v_period.due_date,
    COALESCE(
      v_period.description, 
      format('Faturamento Avulso - %s (Período: %s)', v_period.customer_name, p_period_id)
    ),
    NULL, -- AIDEV-NOTE: billing_periods NULL para avulsos (referencia contract_billing_periods)
    timezone('America/Sao_Paulo'::text, now()),
    timezone('America/Sao_Paulo'::text, now())
  )
  RETURNING id INTO v_charge_id;

  -- AIDEV-NOTE: Processar itens e criar movimentações de estoque para produtos
  FOR v_item IN 
    SELECT * FROM standalone_billing_items
    WHERE standalone_billing_period_id = p_period_id
      AND tenant_id = p_tenant_id
      AND product_id IS NOT NULL -- Apenas produtos precisam de baixa de estoque
  LOOP
    BEGIN
      -- AIDEV-NOTE: Validar estoque disponível
      DECLARE
        v_available_stock NUMERIC;
      BEGIN
        SELECT COALESCE(available_stock, 0) INTO v_available_stock
        FROM product_stock_by_location
        WHERE tenant_id = p_tenant_id
          AND product_id = v_item.product_id
          AND storage_location_id = COALESCE(v_item.storage_location_id, (
            SELECT id FROM storage_locations 
            WHERE tenant_id = p_tenant_id 
            AND is_default = true 
            LIMIT 1
          ));

        IF v_available_stock < v_item.quantity THEN
          v_errors := array_append(v_errors, 
            format('Estoque insuficiente para produto %s: disponível %s, necessário %s', 
              v_item.product_id, v_available_stock, v_item.quantity));
          CONTINUE;
        END IF;

        -- AIDEV-NOTE: Calcular saldo de estoque usando função RPC
        DECLARE
          v_balance_result RECORD;
          v_storage_location_id UUID;
        BEGIN
          v_storage_location_id := COALESCE(v_item.storage_location_id, (
            SELECT id FROM storage_locations 
            WHERE tenant_id = p_tenant_id 
            AND is_default = true 
            LIMIT 1
          ));

          -- Calcular novo saldo
          SELECT * INTO v_balance_result
          FROM calculate_stock_balance(
            p_tenant_id,
            v_item.product_id,
            v_storage_location_id,
            'SAIDA'::stock_movement_type,
            v_item.quantity,
            v_item.unit_price
          );

          -- AIDEV-NOTE: Criar movimentação de estoque
          INSERT INTO stock_movements (
            tenant_id,
            product_id,
            storage_location_id,
            movement_type,
            movement_reason,
            movement_date,
            quantity,
            unit_value,
            accumulated_balance,
            unit_cmc,
            operation,
            customer_or_supplier,
            observation,
            created_by
          ) VALUES (
            p_tenant_id,
            v_item.product_id,
            v_storage_location_id,
            'SAIDA',
            'Faturamento Avulso',
            v_period.bill_date,
            v_item.quantity,
            v_item.unit_price,
            v_balance_result.accumulated_balance,
            v_balance_result.unit_cmc,
            'VENDA',
            v_period.customer_name,
            format('Faturamento avulso - Período: %s', p_period_id),
            auth.uid()
          )
          RETURNING id INTO v_movement_id;

          -- AIDEV-NOTE: Vincular movimentação ao item
          UPDATE standalone_billing_items
          SET stock_movement_id = v_movement_id,
              updated_at = timezone('America/Sao_Paulo'::text, now())
          WHERE id = v_item.id;

          v_items_processed := v_items_processed + 1;
        END;
      END;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := array_append(v_errors, 
          format('Erro ao processar item %s: %s', v_item.id, SQLERRM));
    END;
  END LOOP;

  -- AIDEV-NOTE: Vincular charge ao período avulso
  -- AIDEV-NOTE: A coluna billing_periods em charges referencia contract_billing_periods.id
  -- Para faturamentos avulsos, não podemos usar billing_periods diretamente
  -- A vinculação será feita via metadata ou podemos deixar NULL
  -- O período avulso já tem a referência através do campo billing_periods na tabela charges
  -- que pode ser NULL para avulsos (não há constraint que obrigue)
  -- Por enquanto, deixamos NULL e a vinculação é feita via standalone_billing_periods.id

  -- AIDEV-NOTE: Atualizar período como BILLED
  UPDATE standalone_billing_periods
  SET 
    status = 'BILLED'::standalone_billing_status,
    billed_at = timezone('America/Sao_Paulo'::text, now()),
    amount_billed = v_total_amount,
    updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE id = p_period_id;

  -- AIDEV-NOTE: Preparar resultado
  v_result := jsonb_build_object(
    'success', true,
    'charge_id', v_charge_id,
    'period_id', p_period_id,
    'amount', v_total_amount,
    'items_processed', v_items_processed,
    'errors', v_errors,
    'customer_id', v_period.customer_id,
    'customer_name', v_period.customer_name,
    'customer_asaas_id', v_period.customer_asaas_id,
    'customer_email', v_period.customer_email,
    'customer_phone', v_period.customer_phone,
    'customer_document', v_period.customer_document,
    'gateway_id', CASE WHEN v_gateway IS NOT NULL THEN v_gateway.id ELSE NULL END,
    'gateway_code', CASE WHEN v_gateway IS NOT NULL THEN v_gateway.code ELSE 'ASAAS' END,
    'payment_method', COALESCE(v_period.payment_method, 'BOLETO'),
    'due_date', v_period.due_date,
    'description', COALESCE(v_period.description, 'Faturamento Avulso - ' || v_period.customer_name)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- AIDEV-NOTE: Em caso de erro, fazer rollback implícito e retornar erro
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- AIDEV-NOTE: Comentário na função
COMMENT ON FUNCTION attempt_standalone_billing_charge(UUID, UUID) IS 
'Processa faturamento avulso: cria charge local, movimentações de estoque e atualiza status. Retorna dados para criação de charge no gateway.';

