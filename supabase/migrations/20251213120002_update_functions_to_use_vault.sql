-- =====================================================
-- Migration: Atualizar Funções para Usar Supabase Vault
-- Data: 2025-12-13
-- Descrição: Atualiza funções de criptografia para usar Supabase Vault
--            ao invés de current_setting (requer privilégios de superusuário)
-- =====================================================

BEGIN;

-- 1. Atualizar função encrypt_api_key para usar Supabase Vault
CREATE OR REPLACE FUNCTION encrypt_api_key(plain_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Obter chave mestra do Supabase Vault (usar view decrypted_secrets)
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'ENCRYPTION_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se Vault não estiver disponível ou secret não existir, retornar NULL
    encryption_key := NULL;
  END;
  
  -- Se não houver chave ou chave vazia, retornar NULL (compatibilidade)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Criptografar usando pgp_sym_encrypt
  BEGIN
    RETURN encode(
      pgp_sym_encrypt(
        plain_key,
        encryption_key
      ),
      'base64'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se criptografia falhar, retornar NULL (compatibilidade)
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar função decrypt_api_key para usar Supabase Vault
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Se encrypted_key for NULL, retornar NULL
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obter chave mestra do Supabase Vault (usar view decrypted_secrets)
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'ENCRYPTION_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se Vault não estiver disponível ou secret não existir, retornar NULL
    RETURN NULL;
  END;
  
  -- Se não houver chave ou chave vazia, retornar NULL
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Descriptografar usando pgp_sym_decrypt
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_key, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar na descriptografia, retornar NULL
    -- Isso permite fallback para texto plano
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar comentários
COMMENT ON FUNCTION encrypt_api_key IS 
  'Criptografa chave API usando pgcrypto e Supabase Vault. Retorna NULL se criptografia não estiver configurada (compatibilidade)';

COMMENT ON FUNCTION decrypt_api_key IS 
  'Descriptografa chave API usando pgcrypto e Supabase Vault. Retorna NULL se descriptografia falhar (permite fallback)';

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. ANTES de executar esta migration, adicione o secret no Supabase Vault:
--    - Dashboard > Database > Vault
--    - Clique em "Add new secret"
--    - Name: ENCRYPTION_KEY
--    - Description: Chave mestra para criptografia de chaves API Asaas (32 bytes, base64)
--    - Secret value: MwoReDD03IqZ8TzFCdEcFvnsU8/yqJaJ7EOgGKaVdus=
--    - Clique em "Add secret"
--
-- 2. Execute esta migration via SQL Editor
--
-- 3. Teste se está funcionando:
--    SELECT encrypt_api_key('teste-chave-api-123') as encrypted_test;
--    -- Deve retornar string base64 (não NULL)
-- =====================================================
