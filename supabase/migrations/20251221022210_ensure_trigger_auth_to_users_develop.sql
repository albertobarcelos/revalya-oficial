-- =====================================================
-- Migration: Garantir Trigger Auth → Users na Develop
-- Data: 2025-12-21
-- Descrição: Garante que o trigger on_auth_user_created existe
--            para criar automaticamente registro em public.users
--            quando usuário é criado no auth.users
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Garantir que a função sync_user_role existe
-- Esta função cria automaticamente registro em public.users quando usuário é criado no auth
CREATE OR REPLACE FUNCTION public.sync_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_email TEXT;
  user_role_value TEXT := 'USER'; -- Papel padrão
BEGIN
  -- Obter email do novo registro
  user_email := NEW.email;
  
  -- Verificar se o usuário tem papel administrativo nos metadados
  IF NEW.raw_user_meta_data->>'role' = 'service_role' THEN
    user_role_value := 'ADMIN';
  ELSIF NEW.raw_user_meta_data->>'admin' = 'true' THEN
    user_role_value := 'ADMIN';
  END IF;
  
  -- Inserir ou atualizar na tabela users (corrigido para usar apenas user_role)
  INSERT INTO public.users (
    id, 
    email, 
    user_role,  -- Usando apenas user_role, sem referenciar a coluna "role"
    name,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email, 
    user_role_value,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1)),
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = user_email,
    user_role = COALESCE(public.users.user_role, user_role_value),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- AIDEV-NOTE: Criar trigger idempotente (apenas se não existir)
-- Este trigger dispara automaticamente quando um usuário é criado no auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_role();
  END IF;
END $$;

-- Comentários descritivos
COMMENT ON FUNCTION public.sync_user_role() IS 'Função trigger que cria automaticamente registro em public.users quando usuário é criado no auth.users';

-- AIDEV-NOTE: Não podemos comentar triggers na tabela auth.users pois não somos owners
-- O trigger on_auth_user_created dispara sync_user_role() após inserção de novo usuário no auth

COMMIT;

