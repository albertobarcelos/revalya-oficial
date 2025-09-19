-- Função que verifica se um usuário tem acesso a um tenant específico
-- Retorna 1 se tem acesso, 0 se não tem
CREATE OR REPLACE FUNCTION public.check_user_tenant_access(p_user_id uuid, p_tenant_id uuid)
RETURNS integer AS
$$
DECLARE
  access_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO access_count
  FROM public.tenant_users
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id;
  
  RETURN access_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que retorna todos os tenants que um usuário tem acesso
CREATE OR REPLACE FUNCTION public.get_user_tenants(p_user_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  active boolean,
  role text
) AS
$$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.active,
    tu.role
  FROM 
    public.tenants t
    INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
  WHERE 
    tu.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON FUNCTION public.check_user_tenant_access(uuid, uuid) IS 'Verifica se um usuário tem acesso a um tenant específico';
COMMENT ON FUNCTION public.get_user_tenants(uuid) IS 'Retorna todos os tenants que um usuário tem acesso';
