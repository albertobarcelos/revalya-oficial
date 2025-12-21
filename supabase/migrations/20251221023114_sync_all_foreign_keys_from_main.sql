-- =====================================================
-- Migration: Sincronizar Foreign Keys da MAIN para DEVELOP
-- Data: 2025-12-21
-- Descrição: Adiciona todas as foreign keys que existem na MAIN
--            mas faltam na DEVELOP, especialmente relacionadas a tenants
--            para o PostgREST reconhecer os relacionamentos
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Criar foreign key tenant_invites_tenant_id_fkey (CRÍTICA - usada pelo PostgREST)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_invites_tenant_id_fkey'
    AND conrelid = 'public.tenant_invites'::regclass
  ) THEN
    ALTER TABLE public.tenant_invites
    ADD CONSTRAINT tenant_invites_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key tenant_invites_tenant_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_invites_tenant_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key users_id_fkey (relaciona users com auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_id_fkey'
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key users_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key users_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tenant_access_codes_tenant_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_access_codes_tenant_id_fkey'
    AND conrelid = 'public.tenant_access_codes'::regclass
  ) THEN
    ALTER TABLE public.tenant_access_codes
    ADD CONSTRAINT tenant_access_codes_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key tenant_access_codes_tenant_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_access_codes_tenant_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tenant_access_codes_user_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_access_codes_user_id_fkey'
    AND conrelid = 'public.tenant_access_codes'::regclass
  ) THEN
    ALTER TABLE public.tenant_access_codes
    ADD CONSTRAINT tenant_access_codes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key tenant_access_codes_user_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_access_codes_user_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tenant_integrations_tenant_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_integrations_tenant_id_fkey'
    AND conrelid = 'public.tenant_integrations'::regclass
  ) THEN
    ALTER TABLE public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
    
    RAISE NOTICE 'Foreign key tenant_integrations_tenant_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenant_integrations_tenant_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tenants_reseller_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_reseller_id_fkey'
    AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_reseller_id_fkey
    FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON UPDATE CASCADE ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key tenants_reseller_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tenants_reseller_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key resellers_users_reseller_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resellers_users_reseller_id_fkey'
    AND conrelid = 'public.resellers_users'::regclass
  ) THEN
    ALTER TABLE public.resellers_users
    ADD CONSTRAINT resellers_users_reseller_id_fkey
    FOREIGN KEY (reseller_id) REFERENCES public.resellers(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key resellers_users_reseller_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key resellers_users_reseller_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key resellers_users_user_id_fkey (para auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resellers_users_user_id_fkey'
    AND conrelid = 'public.resellers_users'::regclass
  ) THEN
    ALTER TABLE public.resellers_users
    ADD CONSTRAINT resellers_users_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key resellers_users_user_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key resellers_users_user_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key resellers_users_public_user_id_fkey (para users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resellers_users_public_user_id_fkey'
    AND conrelid = 'public.resellers_users'::regclass
  ) THEN
    ALTER TABLE public.resellers_users
    ADD CONSTRAINT resellers_users_public_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key resellers_users_public_user_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key resellers_users_public_user_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Garantir foreign keys de tenant_users (caso não existam)
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
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_user_id_fkey'
    AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
    ADD CONSTRAINT tenant_users_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id);
    
    RAISE NOTICE 'Foreign key tenant_users_user_id_fkey criada';
  END IF;
END $$;

-- Comentários descritivos
COMMENT ON CONSTRAINT tenant_invites_tenant_id_fkey ON public.tenant_invites IS 
  'Foreign key para relacionamento com tenants - necessário para PostgREST reconhecer joins';
COMMENT ON CONSTRAINT users_id_fkey ON public.users IS 
  'Foreign key para relacionamento com auth.users - necessário para integridade referencial';

COMMIT;

