-- AIDEV-NOTE: Função para configurar webhook do ASAAS
CREATE OR REPLACE FUNCTION setup_asaas_webhook(
  p_tenant_id UUID,
  p_webhook_url TEXT,
  p_webhook_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration_id INTEGER;
  v_config JSONB;
BEGIN
  -- Busca o ID da integração ASAAS do tenant
  SELECT id, config INTO v_integration_id, v_config
  FROM tenant_integrations
  WHERE tenant_id = p_tenant_id
    AND integration_type = 'asaas'
    AND is_active = true;

  -- Se não encontrou integração ativa, retorna erro
  IF v_integration_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Integração ASAAS não encontrada ou inativa'
    );
  END IF;

  -- Atualiza a configuração do webhook
  UPDATE tenant_integrations
  SET webhook_url = p_webhook_url,
      webhook_token = p_webhook_token,
      updated_at = NOW()
  WHERE id = v_integration_id;

  -- Retorna sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Webhook configurado com sucesso'
  );
END;
$$;