-- Adiciona funções de revogação de tokens para o sistema multi-tenant por aba
-- Implementa incremento de token_version para invalidar todos os tokens emitidos anteriormente

-- Adicionar índice na coluna token_version para pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_tenant_users_token_version ON public.tenant_users (token_version);

-- Função para incrementar a versão do token, invalidando todos os tokens existentes
CREATE OR REPLACE FUNCTION public.revoke_user_tenant_tokens(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
  v_current_version INTEGER;
  v_audit_id UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário solicitante tem acesso ao tenant
  -- e se é admin ou owner
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role IN ('admin', 'owner')
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    -- Registrar tentativa de acesso não autorizado
    INSERT INTO public.security_logs (
      user_id,
      action,
      details,
      ip_address
    ) VALUES (
      v_user_id,
      'UNAUTHORIZED_TOKEN_REVOCATION_ATTEMPT',
      json_build_object(
        'target_user_id', p_user_id,
        'target_tenant_id', p_tenant_id
      ),
      inet_client_addr()::TEXT
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas admins ou owners podem revogar tokens'
    );
  END IF;
  
  -- Obter a versão atual do token para o usuário no tenant
  SELECT token_version INTO v_current_version
  FROM public.tenant_users
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
  
  -- Incrementar a versão do token
  UPDATE public.tenant_users
  SET 
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now()
  WHERE 
    user_id = p_user_id 
    AND tenant_id = p_tenant_id
  RETURNING token_version INTO v_current_version;
  
  -- Registrar no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'USER_TENANT_TOKENS_REVOKED',
    json_build_object(
      'target_user_id', p_user_id,
      'previous_token_version', v_current_version - 1,
      'new_token_version', v_current_version,
      'revoked_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'tenant_id', p_tenant_id,
    'token_version', v_current_version,
    'audit_log_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para revogar todos os tokens de um tenant
-- Útil ao detectar uma violação de segurança
CREATE OR REPLACE FUNCTION public.revoke_all_tenant_tokens(
  p_tenant_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_affected_rows INTEGER;
  v_audit_id UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário é owner do tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    -- Registrar tentativa de acesso não autorizado
    INSERT INTO public.security_logs (
      user_id,
      action,
      details,
      ip_address
    ) VALUES (
      v_user_id,
      'UNAUTHORIZED_MASS_TOKEN_REVOCATION_ATTEMPT',
      json_build_object('tenant_id', p_tenant_id),
      inet_client_addr()::TEXT
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas owners podem revogar todos os tokens'
    );
  END IF;
  
  -- Incrementar a versão do token para todos os usuários do tenant
  UPDATE public.tenant_users
  SET 
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now()
  WHERE 
    tenant_id = p_tenant_id
  AND active = true;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  -- Registrar no log de auditoria (ação crítica)
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'ALL_TENANT_TOKENS_REVOKED',
    json_build_object(
      'affected_users', v_affected_rows,
      'revoked_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Registrar também nos logs de segurança
  INSERT INTO public.security_logs (
    user_id,
    tenant_id,
    action,
    details,
    ip_address
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'ALL_TENANT_TOKENS_REVOKED',
    json_build_object(
      'affected_users', v_affected_rows,
      'audit_log_id', v_audit_id
    ),
    inet_client_addr()::TEXT
  );
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'affected_users', v_affected_rows,
    'audit_log_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar token_version ao remover membro do tenant
CREATE OR REPLACE FUNCTION public.remove_tenant_member(
  p_tenant_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_audit_id UUID;
  v_membership_exists BOOLEAN;
  v_is_last_owner BOOLEAN;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário tem permissão para remover membros
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas admins ou owners podem remover membros'
    );
  END IF;
  
  -- Verificar se o usuário a ser removido é o último owner
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
    AND role = 'owner'
    AND user_id = p_user_id
    AND (
      SELECT COUNT(*) FROM public.tenant_users
      WHERE tenant_id = p_tenant_id
      AND role = 'owner'
    ) = 1
  ) INTO v_is_last_owner;
  
  IF v_is_last_owner THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não é possível remover o último owner do tenant'
    );
  END IF;
  
  -- Verificar se o membro existe no tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
  ) INTO v_membership_exists;
  
  IF NOT v_membership_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não é membro deste tenant'
    );
  END IF;
  
  -- Desativar o membro, mas manter o registro para auditoria
  -- e incrementar token_version para invalidar tokens existentes
  UPDATE public.tenant_users
  SET 
    active = false,
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now(),
    deactivated_at = now(),
    deactivated_by = v_user_id
  WHERE 
    tenant_id = p_tenant_id
    AND user_id = p_user_id;
  
  -- Registrar no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'TENANT_MEMBER_REMOVED',
    json_build_object(
      'removed_user_id', p_user_id,
      'removed_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'user_id', p_user_id,
    'audit_log_id', v_audit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON FUNCTION public.revoke_user_tenant_tokens(UUID, UUID) IS 
'Incrementa a versão do token para um usuário específico em um tenant, invalidando todos os tokens JWT emitidos anteriormente para esta combinação de usuário-tenant.';

COMMENT ON FUNCTION public.revoke_all_tenant_tokens(UUID) IS 
'Incrementa a versão do token para todos os usuários de um tenant, invalidando todos os tokens JWT emitidos anteriormente. Útil em caso de comprometimento de segurança.';

COMMENT ON FUNCTION public.remove_tenant_member(UUID, UUID) IS 
'Remove um membro de um tenant (desativando-o) e incrementa seu token_version para invalidar todos os tokens existentes. Previne remoção do último owner.';
