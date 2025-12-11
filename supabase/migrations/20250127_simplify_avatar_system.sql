-- =====================================================
-- Migration: Simplificação do Sistema de Avatares
-- Data: 2025-01-27
-- Descrição: Remove tabela user_avatars e usa apenas users.avatar_url como TEXT
-- =====================================================

-- 1. Primeiro, remover foreign key constraints (se existirem)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS fk_users_avatar_user_avatars;

DO $$
BEGIN
  -- Tenta remover constraint com nome alternativo
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_avatar_url_fkey'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_avatar_url_fkey;
  END IF;
END $$;

-- 2. Alterar tipo da coluna avatar_url de UUID para TEXT (antes do UPDATE)
ALTER TABLE public.users
ALTER COLUMN avatar_url TYPE TEXT USING 
  CASE 
    WHEN avatar_url IS NULL THEN NULL
    ELSE avatar_url::text
  END;

-- 3. Migrar dados existentes de user_avatars para users.avatar_url
--    Agora que avatar_url é TEXT, podemos fazer o UPDATE
UPDATE public.users u
SET avatar_url = ua.file_path
FROM public.user_avatars ua
WHERE u.avatar_url = ua.id::text
  AND ua.is_active = true
  AND ua.user_id = u.id;

-- 4. Dropar a tabela user_avatars (obsoleta)
DROP TABLE IF EXISTS public.user_avatars CASCADE;

-- 5. Comentário na coluna para documentação
COMMENT ON COLUMN public.users.avatar_url IS 
  'Caminho do arquivo de avatar no storage: {tenant_id}/{user_id}/avatar_{timestamp}.{ext}';

