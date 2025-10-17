-- AIDEV-NOTE: Backup das políticas RLS atuais da tabela tenant_integrations
-- Data: 2024-12-27
-- Motivo: Backup antes de implementar políticas otimizadas seguindo o guia multi-tenant

-- =====================================================
-- BACKUP DAS POLÍTICAS RLS ATUAIS
-- =====================================================

-- SELECT Policy
CREATE POLICY "tenant_integrations_select_policy" ON "public"."tenant_integrations"
AS PERMISSIVE FOR SELECT
TO public
USING (
  ((tenant_id IN ( SELECT tenant_users.tenant_id
           FROM tenant_users
          WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))) OR (auth.role() = 'service_role'::text))
);

-- INSERT Policy
CREATE POLICY "tenant_integrations_insert_policy" ON "public"."tenant_integrations"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (
  ((tenant_id IN ( SELECT tenant_users.tenant_id
           FROM tenant_users
          WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))) OR (auth.role() = 'service_role'::text))
);

-- UPDATE Policy
CREATE POLICY "tenant_integrations_update_policy" ON "public"."tenant_integrations"
AS PERMISSIVE FOR UPDATE
TO public
USING (
  ((tenant_id IN ( SELECT tenant_users.tenant_id
           FROM tenant_users
          WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))) OR (auth.role() = 'service_role'::text))
)
WITH CHECK (
  ((tenant_id IN ( SELECT tenant_users.tenant_id
           FROM tenant_users
          WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))) OR (auth.role() = 'service_role'::text))
);

-- DELETE Policy
CREATE POLICY "tenant_integrations_delete_policy" ON "public"."tenant_integrations"
AS PERMISSIVE FOR DELETE
TO public
USING (
  ((tenant_id IN ( SELECT tenant_users.tenant_id
           FROM tenant_users
          WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))) OR (auth.role() = 'service_role'::text))
);

-- =====================================================
-- COMANDOS PARA RESTAURAR (SE NECESSÁRIO)
-- =====================================================

/*
-- Para restaurar as políticas antigas, execute:

-- 1. Remover políticas otimizadas
DROP POLICY IF EXISTS "tenant_integrations_select_policy_v2" ON "public"."tenant_integrations";
DROP POLICY IF EXISTS "tenant_integrations_insert_policy_v2" ON "public"."tenant_integrations";
DROP POLICY IF EXISTS "tenant_integrations_update_policy_v2" ON "public"."tenant_integrations";
DROP POLICY IF EXISTS "tenant_integrations_delete_policy_v2" ON "public"."tenant_integrations";

-- 2. Executar as políticas de backup acima
*/