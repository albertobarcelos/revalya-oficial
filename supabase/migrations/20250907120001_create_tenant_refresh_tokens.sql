-- Migration: Criar tabela tenant_refresh_tokens para sistema de refresh tokens
-- Autor: Sistema Revalya
-- Data: 2025-09-07

-- Criar tabela para armazenar refresh tokens por tenant
CREATE TABLE IF NOT EXISTS tenant_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT tenant_refresh_tokens_user_tenant_key UNIQUE(user_id, tenant_id, token)
);

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_tenant_refresh_tokens_token ON tenant_refresh_tokens(token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_refresh_tokens_user_tenant ON tenant_refresh_tokens(user_id, tenant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_refresh_tokens_expires_at ON tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- RLS Policies para segurança
ALTER TABLE tenant_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só podem ver seus próprios refresh tokens
DROP POLICY IF EXISTS "Users can view own refresh tokens" ON tenant_refresh_tokens;
CREATE POLICY "Users can view own refresh tokens" ON tenant_refresh_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir seus próprios refresh tokens
DROP POLICY IF EXISTS "Users can insert own refresh tokens" ON tenant_refresh_tokens;
CREATE POLICY "Users can insert own refresh tokens" ON tenant_refresh_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar (revogar) seus próprios refresh tokens
DROP POLICY IF EXISTS "Users can update own refresh tokens" ON tenant_refresh_tokens;
CREATE POLICY "Users can update own refresh tokens" ON tenant_refresh_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service role pode fazer todas as operações (para Edge Functions)
DROP POLICY IF EXISTS "Service role full access" ON tenant_refresh_tokens;
CREATE POLICY "Service role full access" ON tenant_refresh_tokens
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Função para limpar refresh tokens expirados (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Marcar tokens expirados como revogados
    UPDATE tenant_refresh_tokens 
    SET revoked_at = NOW()
    WHERE expires_at < NOW() 
    AND revoked_at IS NULL;
    
    -- Log da limpeza
    INSERT INTO audit_logs (user_id, tenant_id, action, details)
    SELECT 
        user_id,
        tenant_id,
        'REFRESH_TOKEN_EXPIRED',
        jsonb_build_object('revoked_count', COUNT(*))
    FROM tenant_refresh_tokens
    WHERE revoked_at = NOW()
    GROUP BY user_id, tenant_id;
END;
$$;

-- Função para revogar todos os refresh tokens de um usuário em um tenant
CREATE OR REPLACE FUNCTION revoke_user_refresh_tokens(p_user_id UUID, p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE tenant_refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND revoked_at IS NULL;
    
    -- Log da revogação
    INSERT INTO audit_logs (user_id, tenant_id, action, details)
    VALUES (
        p_user_id,
        p_tenant_id,
        'REFRESH_TOKENS_REVOKED',
        jsonb_build_object('reason', 'manual_revocation')
    );
END;
$$;

-- Função para gerar refresh token
CREATE OR REPLACE FUNCTION generate_refresh_token(p_user_id UUID, p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Gerar token único
    v_token := encode(gen_random_bytes(32), 'base64url');
    v_expires_at := NOW() + INTERVAL '30 days';
    
    -- Revogar refresh tokens existentes para este usuário/tenant
    UPDATE tenant_refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND revoked_at IS NULL;
    
    -- Inserir novo refresh token
    INSERT INTO tenant_refresh_tokens (user_id, tenant_id, token, expires_at)
    VALUES (p_user_id, p_tenant_id, v_token, v_expires_at);
    
    RETURN v_token;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE tenant_refresh_tokens IS 'Armazena refresh tokens para renovação automática de acesso por tenant';
COMMENT ON COLUMN tenant_refresh_tokens.token IS 'Token único para renovação, armazenado em cookie httpOnly';
COMMENT ON COLUMN tenant_refresh_tokens.expires_at IS 'Data de expiração do refresh token (30 dias)';
COMMENT ON COLUMN tenant_refresh_tokens.revoked_at IS 'Data de revogação manual ou por expiração';
COMMENT ON COLUMN tenant_refresh_tokens.last_used_at IS 'Última vez que o token foi usado para renovação';
