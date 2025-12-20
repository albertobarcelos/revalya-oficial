-- =====================================================
-- Migration: Criptografia de Chaves API Asaas
-- Data: 2025-12-13
-- Descrição: Adiciona suporte a criptografia de chaves API usando pgcrypto
--            Mantém compatibilidade com chaves em texto plano durante transição
-- =====================================================

BEGIN;

-- 1. Habilitar extensão pgcrypto (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Adicionar coluna para chave criptografada (opcional, mantém compatibilidade)
ALTER TABLE tenant_integrations 
ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT;

-- 3. Criar função para criptografar chave API
-- AIDEV-NOTE: Usa Supabase Vault para armazenar chave mestra de forma segura
-- A chave mestra deve ser configurada via Supabase Vault com nome 'ENCRYPTION_KEY'
CREATE OR REPLACE FUNCTION encrypt_api_key(plain_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Obter chave mestra do Supabase Vault
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.secrets
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

-- 4. Criar função para descriptografar chave API
-- AIDEV-NOTE: Usa Supabase Vault para obter chave mestra de forma segura
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Se encrypted_key for NULL, retornar NULL
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obter chave mestra do Supabase Vault
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.secrets
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

-- 5. Criar função helper que retorna chave descriptografada ou texto plano (compatibilidade)
-- AIDEV-NOTE: Esta função tenta descriptografar primeiro, se falhar, retorna do config (texto plano)
CREATE OR REPLACE FUNCTION get_decrypted_api_key(
  p_tenant_id UUID,
  p_integration_type TEXT DEFAULT 'asaas'
)
RETURNS TEXT AS $$
DECLARE
  v_encrypted_key TEXT;
  v_plain_key TEXT;
  v_config JSONB;
BEGIN
  -- Buscar integração
  SELECT encrypted_api_key, config
  INTO v_encrypted_key, v_config
  FROM tenant_integrations
  WHERE tenant_id = p_tenant_id
    AND integration_type = p_integration_type
    AND is_active = true
  LIMIT 1;
  
  -- Se não encontrou integração, retornar NULL
  IF v_encrypted_key IS NULL AND v_config IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Tentar descriptografar chave criptografada primeiro
  IF v_encrypted_key IS NOT NULL THEN
    v_plain_key := decrypt_api_key(v_encrypted_key);
    
    -- Se descriptografou com sucesso, retornar
    IF v_plain_key IS NOT NULL THEN
      RETURN v_plain_key;
    END IF;
  END IF;
  
  -- Fallback: retornar chave em texto plano do config (compatibilidade)
  IF v_config IS NOT NULL AND v_config->>'api_key' IS NOT NULL THEN
    RETURN v_config->>'api_key';
  END IF;
  
  -- Se não encontrou nada, retornar NULL
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comentários para documentação
COMMENT ON FUNCTION encrypt_api_key IS 
  'Criptografa chave API usando pgcrypto. Retorna NULL se criptografia não estiver configurada (compatibilidade)';

COMMENT ON FUNCTION decrypt_api_key IS 
  'Descriptografa chave API usando pgcrypto. Retorna NULL se descriptografia falhar (permite fallback)';

COMMENT ON FUNCTION get_decrypted_api_key IS 
  'Função helper que retorna chave API descriptografada ou texto plano (compatibilidade com dados antigos)';

COMMENT ON COLUMN tenant_integrations.encrypted_api_key IS 
  'Chave API criptografada usando pgcrypto. Mantém compatibilidade com api_key em config (texto plano)';

-- 7. Criar índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_encrypted_key 
ON tenant_integrations(tenant_id, integration_type) 
WHERE encrypted_api_key IS NOT NULL;

COMMIT;

-- =====================================================
-- INSTRUÇÕES PÓS-MIGRATION:
-- =====================================================
-- 1. Configurar chave mestra de criptografia no Supabase Vault:
--    - Acessar Dashboard do Supabase > Database > Vault
--    - Clicar em "Add new secret"
--    - Preencher:
--      * Name: ENCRYPTION_KEY
--      * Description: Chave mestra para criptografia de chaves API Asaas (32 bytes, base64)
--      * Secret value: MwoReDD03IqZ8TzFCdEcFvnsU8/yqJaJ7EOgGKaVdus=
--    - Clicar em "Add secret"
--
-- 2. Gerar chave segura (32 bytes) - JÁ GERADA:
--    - Chave gerada: MwoReDD03IqZ8TzFCdEcFvnsU8/yqJaJ7EOgGKaVdus=
--    - Para gerar nova: openssl rand -base64 32
--    - OU: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
--
-- 3. Testar criptografia (executar após adicionar secret no Vault):
--    SELECT encrypt_api_key('teste-chave-api-123') as encrypted_test;
--    -- Deve retornar string base64 (não NULL)
--
-- 4. Migrar chaves existentes (executar após configurar chave mestra):
--    UPDATE tenant_integrations
--    SET encrypted_api_key = encrypt_api_key(config->>'api_key')
--    WHERE integration_type = 'asaas' 
--      AND config->>'api_key' IS NOT NULL
--      AND encrypted_api_key IS NULL;
--
-- 5. Após migração bem-sucedida, remover chaves em texto plano (OPCIONAL):
--    UPDATE tenant_integrations
--    SET config = config - 'api_key'
--    WHERE integration_type = 'asaas' 
--      AND encrypted_api_key IS NOT NULL;
-- =====================================================
