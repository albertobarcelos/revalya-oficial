CREATE OR REPLACE FUNCTION public.change_contract_stage(p_contract_id uuid, p_stage_id uuid, p_user_id uuid, p_comments text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_can_transition BOOLEAN;
  v_requires_comment BOOLEAN;
  v_stage_code VARCHAR(50);
  v_status VARCHAR(20);
BEGIN
  -- Obter dados do contrato
  SELECT c.id, c.tenant_id, c.stage_id, c.status
  INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Contrato não encontrado');
  END IF;
  
  -- Verificar se pode fazer a transição
  SELECT can_transition_stage(p_contract_id, p_stage_id, p_user_id) INTO v_can_transition;
  
  IF NOT v_can_transition THEN
    RETURN json_build_object('success', FALSE, 'error', 'Transição de estágio não permitida');
  END IF;
  
  -- Verificar se a transição requer comentário
  SELECT cst.requires_comment
  INTO v_requires_comment
  FROM contract_stage_transitions cst
  WHERE cst.from_stage_id = v_contract.stage_id
    AND cst.to_stage_id = p_stage_id
    AND cst.tenant_id = v_contract.tenant_id;
  
  IF v_requires_comment AND (p_comments IS NULL OR trim(p_comments) = '') THEN
    RETURN json_build_object('success', FALSE, 'error', 'Esta transição requer um comentário');
  END IF;
  
  -- Obter código do novo estágio para definir o status do contrato
  SELECT cs.code INTO v_stage_code
  FROM contract_stages cs
  WHERE cs.id = p_stage_id;
  
  -- Mapear código do estágio para status do contrato
  CASE v_stage_code
    WHEN 'ACTIVE' THEN v_status := 'ACTIVE';
    WHEN 'SUSPENDED' THEN v_status := 'SUSPENDED';
    WHEN 'CANCELED' THEN v_status := 'CANCELED';
    ELSE v_status := 'DRAFT';
  END CASE;
  
  -- Atualizar estágio do contrato
  UPDATE contracts
  SET
    stage_id = p_stage_id,
    status = v_status,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_contract_id;
  
  -- O histórico será criado automaticamente pelo trigger log_contract_stage_changes
  -- Mas precisamos adicionar comentários se fornecidos
  IF p_comments IS NOT NULL AND trim(p_comments) != '' THEN
    UPDATE contract_stage_history
    SET comments = p_comments
    WHERE contract_id = p_contract_id
      AND to_stage_id = p_stage_id
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM contract_stage_history
        WHERE contract_id = p_contract_id
          AND to_stage_id = p_stage_id
      );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', p_contract_id,
    'new_stage_id', p_stage_id,
    'new_status', v_status
  );
END;
$function$;
