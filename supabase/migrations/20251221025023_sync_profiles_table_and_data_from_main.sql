-- =====================================================
-- Migration: Sincronizar Tabela profiles e Dados da MAIN
-- Data: 2025-12-21
-- Descrição: Garante que a tabela profiles existe com estrutura correta
--            e insere os dados necessários (especialmente TENANT_ADMIN)
--            para validação de roles em tenant_invites
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Criar tabela profiles se não existir
-- Esta tabela é usada pelo trigger trigger_validate_role para validar roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    context TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT profiles_context_check CHECK (context IN ('ADMIN', 'RESELLER', 'TENANT'))
);

-- AIDEV-NOTE: Criar constraint de unicidade (name, context)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_profiles_name_context'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT uk_profiles_name_context UNIQUE (name, context);
    END IF;
END $$;

-- AIDEV-NOTE: Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);
CREATE INDEX IF NOT EXISTS idx_profiles_context ON public.profiles(context);

-- AIDEV-NOTE: Inserir dados essenciais da tabela profiles
-- Estes dados são necessários para validação de roles em tenant_invites e tenant_users
INSERT INTO public.profiles (id, name, permissions, context, created_at, updated_at)
VALUES
    -- ADMIN Context
    ('52ea1c21-b40b-47d0-a7c0-6dfd4e1820c5', 'SUPER_ADMIN', '["all"]'::jsonb, 'ADMIN', now(), now()),
    
    -- RESELLER Context
    ('466cd602-0224-4fc1-aae6-8483c67ee15b', 'MANAGER', '["view", "create", "edit", "delete"]'::jsonb, 'RESELLER', now(), now()),
    ('a24207f2-9f98-44c8-87cf-41f6b0bbb1e8', 'EDITOR', '["view", "create", "edit"]'::jsonb, 'RESELLER', now(), now()),
    ('0dfbc737-876d-492d-a8e8-bc47d48e9b36', 'VIEWER', '["view"]'::jsonb, 'RESELLER', now(), now()),
    ('f0443f1f-689e-4572-8d04-9a3a64891b13', 'RESELLER_ADMIN', '["read", "write", "admin"]'::jsonb, 'RESELLER', now(), now()),
    ('66e7c64c-f895-41ce-85a0-e491be41a8c2', 'RESELLER_USER', '["read"]'::jsonb, 'RESELLER', now(), now()),
    
    -- TENANT Context (CRÍTICO - usado em tenant_invites)
    ('312ae376-5dfe-4d42-81fa-6ddb86962cf3', 'TENANT_ADMIN', '["create", "read", "update", "delete", "manage_users", "manage_settings", "view_reports", "manage_billing"]'::jsonb, 'TENANT', now(), now()),
    ('99c26562-2f95-40d4-994d-1f08498300a8', 'TENANT_USER', '["view", "create", "edit"]'::jsonb, 'TENANT', now(), now()),
    ('9f80c5f5-1546-467d-9f02-d470ca15e97a', 'ADMIN', '["view", "create", "edit", "delete", "approve"]'::jsonb, 'TENANT', now(), now()),
    ('3048d0a3-b4ed-4c51-b989-bf3c0282090f', 'APPROVER', '["view", "approve"]'::jsonb, 'TENANT', now(), now()),
    ('1f829237-6a21-4fdf-ab24-1e808df38ed0', 'OPERATOR', '["view", "create", "edit"]'::jsonb, 'TENANT', now(), now()),
    ('7fb2507e-09fe-4ae4-b35f-827dbb2b437a', 'VIEWER', '["view"]'::jsonb, 'TENANT', now(), now())
ON CONFLICT (name, context) DO NOTHING; -- Não sobrescrever se já existir

-- AIDEV-NOTE: Garantir que a função validate_role_exists existe
CREATE OR REPLACE FUNCTION public.validate_role_exists(role_name TEXT, role_context TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o contexto não for especificado, verifica se o role existe em qualquer contexto
  IF role_context IS NULL THEN
    RETURN EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE name = role_name
    );
  END IF;
  
  -- Se o contexto for especificado, verifica se o role existe no contexto específico
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE name = role_name 
    AND context = role_context
  );
END;
$$;

-- AIDEV-NOTE: Garantir que o trigger trigger_validate_role existe e está configurado
CREATE OR REPLACE FUNCTION public.trigger_validate_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    expected_context TEXT;
BEGIN
    -- Determinar contexto baseado na tabela
    CASE TG_TABLE_NAME
        WHEN 'tenant_users' THEN expected_context := 'TENANT';
        WHEN 'tenant_invites' THEN expected_context := 'TENANT';
        WHEN 'resellers_users' THEN expected_context := 'RESELLER';
        ELSE expected_context := NULL;
    END CASE;
    
    -- Validar se o role existe
    IF NOT validate_role_exists(NEW.role, expected_context) THEN
        RAISE EXCEPTION 'Role "%" não existe na tabela profiles para o contexto "%"', NEW.role, expected_context;
    END IF;
    
    RETURN NEW;
END;
$$;

-- AIDEV-NOTE: Garantir que o trigger está anexado à tabela tenant_invites
DO $$
BEGIN
    -- Remover trigger se já existir (para recriar)
    DROP TRIGGER IF EXISTS validate_role_trigger ON public.tenant_invites;
    
    -- Criar trigger
    CREATE TRIGGER validate_role_trigger
        BEFORE INSERT OR UPDATE ON public.tenant_invites
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_validate_role();
END $$;

-- AIDEV-NOTE: Garantir que o trigger está anexado à tabela tenant_users
DO $$
BEGIN
    -- Remover trigger se já existir (para recriar)
    DROP TRIGGER IF EXISTS validate_role_trigger ON public.tenant_users;
    
    -- Criar trigger
    CREATE TRIGGER validate_role_trigger
        BEFORE INSERT OR UPDATE ON public.tenant_users
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_validate_role();
END $$;

-- Comentários descritivos
COMMENT ON TABLE public.profiles IS 
    'Tabela de perfis/roles do sistema com permissões por contexto. Inclui TENANT_ADMIN para administração de tenants.';
COMMENT ON COLUMN public.profiles.context IS 
    'Contexto do perfil: ADMIN, RESELLER ou TENANT';
COMMENT ON COLUMN public.profiles.name IS 
    'Nome do perfil/role (ex: TENANT_ADMIN, TENANT_USER, etc.)';
COMMENT ON FUNCTION public.validate_role_exists IS 
    'Valida se um role existe na tabela profiles para um contexto específico';
COMMENT ON FUNCTION public.trigger_validate_role IS 
    'Trigger que valida se o role existe na tabela profiles antes de inserir/atualizar em tenant_invites ou tenant_users';

-- RLS Policies (se necessário)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Context Based Read Access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Context Based Read Access'
    ) THEN
        CREATE POLICY "Context Based Read Access" 
            ON public.profiles 
            FOR SELECT 
            TO authenticated 
            USING (
                (context = 'TENANT' AND EXISTS (
                    SELECT 1 FROM tenant_users tu
                    WHERE tu.user_id = auth.uid()
                ))
                OR
                (context = 'RESELLER' AND EXISTS (
                    SELECT 1 FROM resellers_users ru
                    WHERE ru.user_id = auth.uid()
                ))
                OR
                (context = 'ADMIN' AND EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.user_role = 'ADMIN'
                ))
            );
    END IF;
END $$;

-- Policy: Super Admin Full Access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Super Admin Full Access'
    ) THEN
        CREATE POLICY "Super Admin Full Access" 
            ON public.profiles 
            TO authenticated 
            USING (
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.user_role = 'ADMIN'
                )
            );
    END IF;
END $$;

COMMIT;

