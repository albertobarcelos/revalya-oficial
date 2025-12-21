-- =====================================================
-- Migration: Corrigir Foreign Keys tenant_users na Develop
-- Data: 2025-12-21
-- Descrição: Garante que as foreign keys entre tenant_users
--            e tenants/users existam para o PostgREST reconhecer
--            os relacionamentos nas queries
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Criar foreign key tenant_users_tenant_id_fkey se não existir
-- Esta foreign key é necessária para o PostgREST reconhecer o relacionamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_tenant_id_fkey'
    AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key tenant_users_tenant_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_users_tenant_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tenant_users_user_id_fkey se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_user_id_fkey'
    AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
    ADD CONSTRAINT tenant_users_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id);
    
    RAISE NOTICE 'Foreign key tenant_users_user_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_users_user_id_fkey já existe';
  END IF;
END $$;

-- Comentários descritivos
COMMENT ON CONSTRAINT tenant_users_tenant_id_fkey ON public.tenant_users IS 
  'Foreign key para relacionamento com tenants - necessário para PostgREST reconhecer joins';
COMMENT ON CONSTRAINT tenant_users_user_id_fkey ON public.tenant_users IS 
  'Foreign key para relacionamento com users - necessário para PostgREST reconhecer joins';

COMMIT;

