-- =====================================================
-- MIGRAÇÃO: FUNÇÃO RPC CALCULATE_STOCK_BALANCE
-- Data: 2025-11-15
-- Descrição: Função para calcular saldo acumulado e CMC após movimentação
-- Autor: Sistema Revalya
-- =====================================================

-- AIDEV-NOTE: Função para calcular saldo acumulado e CMC após uma movimentação
-- Esta função é chamada após inserir uma movimentação para atualizar os valores

CREATE OR REPLACE FUNCTION public.calculate_stock_balance(
  p_tenant_id UUID,
  p_product_id UUID,
  p_storage_location_id UUID,
  p_movement_type stock_movement_type,
  p_quantity DECIMAL,
  p_unit_value DECIMAL DEFAULT 0
)
RETURNS TABLE (
  accumulated_balance DECIMAL,
  unit_cmc DECIMAL,
  total_cmc DECIMAL
) AS $$
DECLARE
  v_current_balance DECIMAL := 0;
  v_current_cmc DECIMAL := 0;
  v_new_balance DECIMAL;
  v_new_cmc DECIMAL;
  v_total_value DECIMAL;
  v_total_stock DECIMAL;
BEGIN
  -- AIDEV-NOTE: Obter saldo atual e CMC do local de estoque
  SELECT 
    COALESCE(available_stock, 0),
    COALESCE(unit_cmc, 0)
  INTO v_current_balance, v_current_cmc
  FROM public.product_stock_by_location
  WHERE tenant_id = p_tenant_id
    AND product_id = p_product_id
    AND storage_location_id = p_storage_location_id;
  
  -- Se não existe registro, criar com valores iniciais
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
    v_current_cmc := 0;
    
    INSERT INTO public.product_stock_by_location (
      tenant_id,
      product_id,
      storage_location_id,
      available_stock,
      unit_cmc
    ) VALUES (
      p_tenant_id,
      p_product_id,
      p_storage_location_id,
      0,
      0
    )
    ON CONFLICT (tenant_id, product_id, storage_location_id) DO NOTHING;
  END IF;
  
  -- AIDEV-NOTE: Calcular novo saldo baseado no tipo de movimento
  CASE p_movement_type
    WHEN 'ENTRADA' THEN
      -- Entrada: incrementar estoque e recalcular CMC médio
      v_total_stock := v_current_balance + p_quantity;
      v_total_value := (v_current_balance * v_current_cmc) + (p_quantity * p_unit_value);
      
      IF v_total_stock > 0 THEN
        v_new_cmc := v_total_value / v_total_stock;
      ELSE
        v_new_cmc := p_unit_value;
      END IF;
      
      v_new_balance := v_total_stock;
      
    WHEN 'SAIDA' THEN
      -- Saída: decrementar estoque, manter CMC
      v_new_balance := GREATEST(0, v_current_balance - p_quantity);
      v_new_cmc := v_current_cmc;
      
    WHEN 'AJUSTE' THEN
      -- Ajuste: definir estoque para quantidade específica, manter CMC
      v_new_balance := p_quantity;
      v_new_cmc := v_current_cmc;
      
    WHEN 'TRANSFERENCIA' THEN
      -- Transferência: decrementar origem (já calculado), incrementar destino
      -- Esta função calcula apenas para o local de destino
      v_new_balance := v_current_balance + p_quantity;
      v_new_cmc := v_current_cmc;
      
    ELSE
      -- Tipo desconhecido, manter valores atuais
      v_new_balance := v_current_balance;
      v_new_cmc := v_current_cmc;
  END CASE;
  
  -- AIDEV-NOTE: Atualizar ou inserir registro em product_stock_by_location
  INSERT INTO public.product_stock_by_location (
    tenant_id,
    product_id,
    storage_location_id,
    available_stock,
    unit_cmc
  ) VALUES (
    p_tenant_id,
    p_product_id,
    p_storage_location_id,
    v_new_balance,
    v_new_cmc
  )
  ON CONFLICT (tenant_id, product_id, storage_location_id)
  DO UPDATE SET
    available_stock = EXCLUDED.available_stock,
    unit_cmc = EXCLUDED.unit_cmc,
    updated_at = timezone('America/Sao_Paulo'::text, now());
  
  -- Retornar valores calculados
  RETURN QUERY SELECT
    v_new_balance,
    v_new_cmc,
    (v_new_balance * v_new_cmc) AS total_cmc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION public.calculate_stock_balance IS 'Calcula saldo acumulado e CMC após uma movimentação de estoque';

