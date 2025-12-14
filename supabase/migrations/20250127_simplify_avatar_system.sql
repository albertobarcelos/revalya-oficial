-- =====================================================
-- Migration: Simplificação do Sistema de Avatares
-- Data: 2025-01-27
-- Descrição: Remove tabela user_avatars e usa apenas users.avatar_url como TEXT
-- =====================================================

-- Esta migração é idempotente e só executa se necessário
-- Em branches novas, a tabela users já tem avatar_url como TEXT na migração inicial

DO $$
BEGIN
  -- Verificar se a tabela users existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) THEN
    -- Verificar se avatar_url existe e qual é o tipo
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'avatar_url'
    ) THEN
      -- Verificar se o tipo é UUID (precisa migrar) ou TEXT (já está correto)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'avatar_url'
        AND data_type = 'uuid'
      ) THEN
        -- 1. Remover foreign key constraints (se existirem)
        ALTER TABLE public.users
        DROP CONSTRAINT IF EXISTS fk_users_avatar_user_avatars;

        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'users_avatar_url_fkey'
        ) THEN
          ALTER TABLE public.users DROP CONSTRAINT users_avatar_url_fkey;
        END IF;

        -- 2. Alterar tipo da coluna avatar_url de UUID para TEXT
        ALTER TABLE public.users
        ALTER COLUMN avatar_url TYPE TEXT USING 
          CASE 
            WHEN avatar_url IS NULL THEN NULL
            ELSE avatar_url::text
          END;

        -- 3. Migrar dados existentes de user_avatars para users.avatar_url
        --    (só se a tabela user_avatars existir)
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_avatars'
        ) THEN
          UPDATE public.users u
          SET avatar_url = ua.file_path
          FROM public.user_avatars ua
          WHERE u.avatar_url = ua.id::text
            AND ua.is_active = true
            AND ua.user_id = u.id;

          -- 4. Dropar a tabela user_avatars (obsoleta)
          DROP TABLE IF EXISTS public.user_avatars CASCADE;
        END IF;
      END IF;

      -- 5. Comentário na coluna para documentação (sempre atualizar)
      COMMENT ON COLUMN public.users.avatar_url IS 
        'Caminho do arquivo de avatar no storage: {tenant_id}/{user_id}/avatar_{timestamp}.{ext}';
    END IF;
  END IF;
END $$;

