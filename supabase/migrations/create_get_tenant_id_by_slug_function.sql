-- Função RPC para obter tenant_id pelo slug
-- AIDEV-NOTE: Esta função contorna as políticas RLS durante a inicialização
-- e permite que o TenantManager obtenha o ID do tenant pelo slug

CREATE OR REPLACE FUNCTION public.get_tenant_id_by_slug(
  p_slug text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_has_access boolean := false;
BEGIN
  -- Log de entrada para depuração
  RAISE LOG 'get_tenant_id_by_slug chamada com slug: %, user_id: %', p_slug, p_user_id;
  
  -- Buscar o tenant pelo slug
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = p_slug
    AND active = true;
  
  -- Log do resultado da busca
  RAISE LOG 'Tenant encontrado: %', v_tenant_id;
  
  -- Se não encontrou o tenant, retornar null
  IF v_tenant_id IS NULL THEN
    RAISE LOG 'Nenhum tenant ativo encontrado para slug: %', p_slug;
    RETURN NULL;
  END IF;
  
  -- Se foi fornecido um user_id, verificar se o usuário tem acesso ao tenant
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.tenant_users tu
      WHERE tu.tenant_id = v_tenant_id
        AND tu.user_id = p_user_id
        AND tu.active = true
    ) INTO v_user_has_access;
    
    RAISE LOG 'Usuário % tem acesso ao tenant %: %', p_user_id, v_tenant_id, v_user_has_access;
    
    -- Se o usuário não tem acesso, retornar null
    IF NOT v_user_has_access THEN
      RAISE LOG 'Acesso negado para usuário % ao tenant %', p_user_id, v_tenant_id;
      RETURN NULL;
    END IF;
  END IF;
  
  -- Log de sucesso
  RAISE LOG 'Retornando tenant_id: %', v_tenant_id;
  
  -- Retornar o tenant_id
  RETURN v_tenant_id;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_slug(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_id_by_slug(text, uuid) TO anon;

-- Comentário sobre a função
COMMENT ON FUNCTION public.get_tenant_id_by_slug(text, uuid) IS 
'Função RPC que retorna o ID do tenant baseado no slug. '
'Verifica se o tenant está ativo e, opcionalmente, se o usuário tem acesso ao tenant. '
'Utilizada pelo TenantManager para resolver o contexto do tenant durante a inicialização.';