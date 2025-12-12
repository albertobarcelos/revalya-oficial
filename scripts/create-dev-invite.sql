-- =====================================================
-- Script para criar convite de teste em desenvolvimento
-- =====================================================
-- 
-- Uso:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Copie o token gerado
-- 3. Acesse: http://localhost:5173/register?token=TOKEN_AQUI
--
-- IMPORTANTE: Este script cria um convite válido para desenvolvimento
-- Substitua os valores abaixo pelos seus dados de teste
-- =====================================================

-- Substitua estes valores pelos seus dados de teste
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_email TEXT := 'dev@teste.com'; -- Email para teste
BEGIN
  -- 1. Buscar um tenant existente (ou usar o primeiro)
  SELECT id INTO v_tenant_id 
  FROM tenants 
  LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum tenant encontrado. Crie um tenant primeiro.';
  END IF;
  
  -- 2. Buscar um usuário existente para usar como invited_by
  SELECT id INTO v_user_id 
  FROM users 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado. Crie um usuário primeiro.';
  END IF;
  
  -- 3. Gerar token único
  v_token := gen_random_uuid()::TEXT;
  
  -- 4. Deletar convites antigos para este email (opcional)
  DELETE FROM tenant_invites 
  WHERE email = v_email AND status = 'PENDING';
  
  -- 5. Criar novo convite de teste
  INSERT INTO tenant_invites (
    tenant_id,
    email,
    role,
    status,
    invited_by,
    token,
    expires_at
  ) VALUES (
    v_tenant_id,
    v_email,
    'TENANT_ADMIN',
    'PENDING',
    v_user_id,
    v_token,
    NOW() + INTERVAL '30 days' -- Válido por 30 dias
  );
  
  -- 6. Exibir informações do convite criado
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Convite de teste criado com sucesso!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Token: %', v_token;
  RAISE NOTICE 'URL de registro: http://localhost:5173/register?token=%', v_token;
  RAISE NOTICE '========================================';
  
  -- Retornar o token (para uso em queries)
  SELECT v_token;
END $$;

-- Para ver o token gerado, execute também:
SELECT 
  token,
  email,
  status,
  expires_at,
  tenant_id,
  'http://localhost:5173/register?token=' || token as register_url
FROM tenant_invites 
WHERE email = 'dev@teste.com' 
  AND status = 'PENDING'
ORDER BY created_at DESC
LIMIT 1;

