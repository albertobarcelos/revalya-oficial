-- AIDEV-NOTE: Correção das políticas RLS da tabela tenant_integrations
-- O erro "column tenant_integrations.active does not exist" estava sendo causado
-- por políticas RLS que referenciam tenant_users.active incorretamente

-- Primeiro, vamos remover as políticas existentes que estão causando o erro
DROP POLICY IF EXISTS "delete" ON public.tenant_integrations;
DROP POLICY IF EXISTS "insert" ON public.tenant_integrations;
DROP POLICY IF EXISTS "select" ON public.tenant_integrations;
DROP POLICY IF EXISTS "update" ON public.tenant_integrations;

-- Recriar as políticas RLS corrigidas para tenant_integrations
-- Política para SELECT
CREATE POLICY "tenant_integrations_select_policy" ON public.tenant_integrations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE tenant_id = tenant_integrations.tenant_id
      AND active = true  -- Esta é a coluna correta em tenant_users
    )
  );

-- Política para INSERT
CREATE POLICY "tenant_integrations_insert_policy" ON public.tenant_integrations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE tenant_id = tenant_integrations.tenant_id
      AND active = true
      AND role IN ('owner', 'admin')
    )
  );

-- Política para UPDATE
CREATE POLICY "tenant_integrations_update_policy" ON public.tenant_integrations
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE tenant_id = tenant_integrations.tenant_id
      AND active = true
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE tenant_id = tenant_integrations.tenant_id
      AND active = true
      AND role IN ('owner', 'admin')
    )
  );

-- Política para DELETE
CREATE POLICY "tenant_integrations_delete_policy" ON public.tenant_integrations
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE tenant_id = tenant_integrations.tenant_id
      AND active = true
      AND role IN ('owner', 'admin')
    )
  );

-- Garantir que RLS está habilitado
ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON POLICY "tenant_integrations_select_policy" ON public.tenant_integrations IS
'Permite que usuários ativos de um tenant vejam as integrações do seu tenant';

COMMENT ON POLICY "tenant_integrations_insert_policy" ON public.tenant_integrations IS
'Permite que apenas owners e admins ativos criem novas integrações';

COMMENT ON POLICY "tenant_integrations_update_policy" ON public.tenant_integrations IS
'Permite que apenas owners e admins ativos modifiquem integrações do seu tenant';

COMMENT ON POLICY "tenant_integrations_delete_policy" ON public.tenant_integrations IS
'Permite que apenas owners e admins ativos removam integrações do seu tenant';