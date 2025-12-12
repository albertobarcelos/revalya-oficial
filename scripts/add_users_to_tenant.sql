-- Script para adicionar usuários ao tenant
-- Tenant ID: 5832173a-e3eb-4af0-b22c-863b8b917d28

-- =====================================================
-- USUÁRIO 1: alberto.melo@nexsyn.com.br
-- Já existe, apenas adicionar ao tenant
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID := '5832173a-e3eb-4af0-b22c-863b8b917d28'::UUID;
  v_email TEXT := 'alberto.melo@nexsyn.com.br';
BEGIN
  -- Buscar ID do usuário existente
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users', v_email;
  END IF;

  -- Verificar se já está no tenant
  IF EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = v_user_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE NOTICE 'Usuário % já está associado ao tenant', v_email;
  ELSE
    -- Adicionar ao tenant
    INSERT INTO public.tenant_users (tenant_id, user_id, role, created_at)
    VALUES (v_tenant_id, v_user_id, 'TENANT_USER', NOW())
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Usuário % adicionado ao tenant com sucesso', v_email;
  END IF;
END $$;

-- =====================================================
-- USUÁRIO 2: Contato@consysa.com.br
-- Criar novo usuário com senha 123456
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID := '5832173a-e3eb-4af0-b22c-863b8b917d28'::UUID;
  v_email TEXT := 'Contato@consysa.com.br';
  v_password TEXT := '123456';
  v_encrypted_password TEXT;
BEGIN
  -- Verificar se usuário já existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Criar novo usuário no auth.users usando a função admin
    -- Nota: Isso precisa ser feito via API do Supabase ou função RPC
    -- Por enquanto, vamos apenas preparar o script
    
    RAISE NOTICE 'Usuário % não existe. Será necessário criar via API do Supabase.', v_email;
    RAISE NOTICE 'Após criar o usuário, execute a parte abaixo para adicionar ao tenant';
    
    -- Se o usuário for criado, buscar o ID novamente
    -- SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  ELSE
    RAISE NOTICE 'Usuário % já existe com ID: %', v_email, v_user_id;
  END IF;

  -- Adicionar ao tenant (se usuário existe)
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE user_id = v_user_id AND tenant_id = v_tenant_id
    ) THEN
      RAISE NOTICE 'Usuário % já está associado ao tenant', v_email;
    ELSE
      INSERT INTO public.tenant_users (tenant_id, user_id, role, created_at)
      VALUES (v_tenant_id, v_user_id, 'TENANT_USER', NOW())
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
      
      RAISE NOTICE 'Usuário % adicionado ao tenant com sucesso', v_email;
    END IF;
  END IF;
END $$;

