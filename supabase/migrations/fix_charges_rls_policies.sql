-- Migration: Fix charges table RLS policies
-- Description: Remove existing policies and create new ones following the project's multi-tenant pattern
-- Date: 2025-01-27

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "charges_select_policy" ON public.charges;
DROP POLICY IF EXISTS "charges_insert_policy" ON public.charges;
DROP POLICY IF EXISTS "charges_update_policy" ON public.charges;
DROP POLICY IF EXISTS "charges_delete_policy" ON public.charges;
DROP POLICY IF EXISTS "Enable read access for users based on tenant_id" ON public.charges;
DROP POLICY IF EXISTS "Enable insert for users based on tenant_id" ON public.charges;
DROP POLICY IF EXISTS "Enable update for users based on tenant_id" ON public.charges;
DROP POLICY IF EXISTS "Enable delete for users based on tenant_id" ON public.charges;
DROP POLICY IF EXISTS "Users can view charges from their tenant" ON public.charges;
DROP POLICY IF EXISTS "Users can insert charges to their tenant" ON public.charges;
DROP POLICY IF EXISTS "Users can update charges from their tenant" ON public.charges;
DROP POLICY IF EXISTS "Users can delete charges from their tenant" ON public.charges;

-- Ensure RLS is enabled
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges FORCE ROW LEVEL SECURITY;

-- Create SELECT policy
CREATE POLICY "charges_tenant_select_policy" ON public.charges
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            INNER JOIN public.tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = charges.tenant_id
            AND tu.active = true
            AND t.active = true
        )
    );

-- Create INSERT policy
CREATE POLICY "charges_tenant_insert_policy" ON public.charges
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            INNER JOIN public.tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = charges.tenant_id
            AND tu.active = true
            AND t.active = true
        )
    );

-- Create UPDATE policy
CREATE POLICY "charges_tenant_update_policy" ON public.charges
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            INNER JOIN public.tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = charges.tenant_id
            AND tu.active = true
            AND t.active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            INNER JOIN public.tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = charges.tenant_id
            AND tu.active = true
            AND t.active = true
        )
    );

-- Create DELETE policy
CREATE POLICY "charges_tenant_delete_policy" ON public.charges
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            INNER JOIN public.tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = auth.uid()
            AND tu.tenant_id = charges.tenant_id
            AND tu.active = true
            AND t.active = true
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charges TO authenticated;
GRANT SELECT ON public.charges TO anon;

-- Add audit comment
COMMENT ON TABLE public.charges IS 'Tabela de cobranças com políticas RLS multi-tenant corrigidas - Migração aplicada em 2025-01-27';

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: charges RLS policies fixed successfully';
END $$;