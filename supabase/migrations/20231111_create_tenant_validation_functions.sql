-- Funções para validação e monitoramento de tenants
-- Criado em: 11/11/2023

-- Função que retorna todos os tenants com contagem de usuários
CREATE OR REPLACE FUNCTION public.get_all_tenants_with_user_count()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  active boolean,
  created_at timestamptz,
  user_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.active,
    t.created_at,
    COUNT(tu.user_id)::bigint as user_count
  FROM 
    tenants t
    LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
  GROUP BY 
    t.id
  ORDER BY 
    t.active DESC, t.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que lista usuários em tenants inativos
CREATE OR REPLACE FUNCTION public.get_users_in_inactive_tenants()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  tenant_id uuid,
  tenant_name text,
  tenant_active boolean,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    t.id as tenant_id,
    t.name as tenant_name,
    t.active as tenant_active,
    tu.role
  FROM 
    tenant_users tu
    JOIN auth.users au ON tu.user_id = au.id
    JOIN tenants t ON tu.tenant_id = t.id
  WHERE 
    t.active = false
  ORDER BY 
    au.email, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que desativa automaticamente acessos a tenants inativos
CREATE OR REPLACE FUNCTION public.deactivate_access_to_inactive_tenants()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  affected_users bigint
) AS $$
BEGIN
  CREATE TEMP TABLE temp_results (
    tenant_id uuid,
    tenant_name text,
    affected_users bigint
  ) ON COMMIT DROP;

  -- Atualiza os registros e conta quantos foram afetados por tenant
  WITH updates AS (
    UPDATE tenant_users tu
    SET active = false
    FROM tenants t
    WHERE tu.tenant_id = t.id
      AND t.active = false
      AND tu.active = true
    RETURNING tu.tenant_id
  ),
  counts AS (
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      COUNT(u.tenant_id)::bigint as affected_users
    FROM updates u
    JOIN tenants t ON t.id = u.tenant_id
    GROUP BY t.id, t.name
  )
  INSERT INTO temp_results
  SELECT * FROM counts;
  
  RETURN QUERY SELECT * FROM temp_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON FUNCTION public.get_all_tenants_with_user_count() IS 'Retorna todos os tenants com contagem de usuários';
COMMENT ON FUNCTION public.get_users_in_inactive_tenants() IS 'Lista usuários em tenants inativos';
COMMENT ON FUNCTION public.deactivate_access_to_inactive_tenants() IS 'Desativa automaticamente acessos a tenants inativos e retorna quantos usuários foram afetados por tenant';
