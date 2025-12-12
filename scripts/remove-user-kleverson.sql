-- =====================================================
-- Script para remover completamente o usuário
-- Email: kleverson.jara@revalya.com.br
-- =====================================================
-- 
-- Este script remove:
-- 1. Associações em tenant_users
-- 2. Convites em tenant_invites
-- 3. Registro em users
-- 4. Usuário do Auth (deve ser feito via Admin API)
-- 
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- Para remover do Auth, use a Admin API ou Dashboard
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT := 'kleverson.jara@revalya.com.br';
BEGIN
  -- 1. Buscar ID do usuário
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado na tabela users: %', v_user_email;
    RETURN;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removendo usuário: %', v_user_email;
  RAISE NOTICE 'ID do usuário: %', v_user_id;
  RAISE NOTICE '========================================';
  
  -- 2. Remover associações em tenant_users
  DELETE FROM public.tenant_users
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Associações em tenant_users removidas';
  
  -- 3. Remover convites relacionados
  DELETE FROM public.tenant_invites
  WHERE email = v_user_email OR user_id = v_user_id;
  
  RAISE NOTICE '✅ Convites removidos';
  
  -- 4. Remover registro principal em users
  DELETE FROM public.users
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Registro em users removido';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Usuário removido com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE 'Para remover completamente do Supabase Auth,';
  RAISE NOTICE 'use o Dashboard ou Admin API:';
  RAISE NOTICE 'supabase.auth.admin.deleteUser(''%'')', v_user_id;
  RAISE NOTICE '========================================';
  
END $$;

-- Verificar se foi removido
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'kleverson.jara@revalya.com.br') 
    THEN '❌ Usuário ainda existe em users'
    ELSE '✅ Usuário removido de users'
  END as status_users,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id IN (SELECT id FROM public.users WHERE email = 'kleverson.jara@revalya.com.br'))
    THEN '❌ Ainda há associações em tenant_users'
    ELSE '✅ Sem associações em tenant_users'
  END as status_tenant_users;

