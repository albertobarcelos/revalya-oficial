-- Migration: Sistema de Refresh Tokens Multi-Tenant
-- Inspirado na arquitetura da Omie para auto-login sem códigos na URL
-- Data: 2025-01-09

-- =====================================================
-- 1. TABELA: tenant_refresh_tokens
-- =====================================================
-- Armazena refresh tokens de longa duração (30 dias) para auto-login
CREATE TABLE IF NOT EXISTS tenant_refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL UNIQUE, -- Hash SHA-256 do refresh token
    expires_at timestamptz NOT NULL,
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Metadados de segurança
    ip_address inet,
    user_agent text,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- Índices para performance
CREATE INDEX idx_tenant_refresh_tokens_user_tenant ON tenant_refresh_tokens(user_id, tenant_id);
CREATE INDEX idx_tenant_refresh_tokens_hash ON tenant_refresh_tokens(refresh_token_hash);
CREATE INDEX idx_tenant_refresh_tokens_expires ON tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_tenant_refresh_tokens_active ON tenant_refresh_tokens(user_id, tenant_id, expires_at) WHERE revoked_at IS NULL;

-- =====================================================
-- 2. TABELA: tenant_sessions_audit
-- =====================================================
-- Log de auditoria para todas as ações relacionadas a sessões de tenant
CREATE TABLE IF NOT EXISTS tenant_sessions_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('created', 'refreshed', 'revoked', 'expired', 'invalid_attempt')),
    
    -- Metadados da sessão
    refresh_token_id uuid REFERENCES tenant_refresh_tokens(id) ON DELETE SET NULL,
    session_duration_minutes integer,
    
    -- Metadados de segurança
    ip_address inet,
    user_agent text,
    
    -- Detalhes adicionais (JSON)
    details jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT now()
);

-- Índices para auditoria e análise
CREATE INDEX idx_tenant_sessions_audit_user ON tenant_sessions_audit(user_id, created_at DESC);
CREATE INDEX idx_tenant_sessions_audit_tenant ON tenant_sessions_audit(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_sessions_audit_action ON tenant_sessions_audit(action, created_at DESC);
CREATE INDEX idx_tenant_sessions_audit_timerange ON tenant_sessions_audit(created_at DESC);

-- =====================================================
-- 3. FUNÇÃO: Limpeza automática de tokens expirados
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Marcar tokens expirados como revogados
    UPDATE tenant_refresh_tokens 
    SET 
        revoked_at = now(),
        updated_at = now()
    WHERE 
        expires_at < now() 
        AND revoked_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO tenant_sessions_audit (
        user_id, 
        tenant_id, 
        action, 
        details
    )
    SELECT 
        user_id,
        tenant_id,
        'expired',
        jsonb_build_object(
            'cleanup_batch', true,
            'expired_count', deleted_count,
            'cleanup_timestamp', now()
        )
    FROM tenant_refresh_tokens 
    WHERE revoked_at = now()
    LIMIT 1; -- Um log por batch
    
    RETURN deleted_count;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO: Validar refresh token
-- =====================================================
CREATE OR REPLACE FUNCTION validate_refresh_token(
    token_hash text,
    p_tenant_id uuid,
    p_user_id uuid
)
RETURNS TABLE (
    is_valid boolean,
    token_id uuid,
    expires_at timestamptz,
    tenant_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (rt.id IS NOT NULL 
         AND rt.revoked_at IS NULL 
         AND rt.expires_at > now()) as is_valid,
        rt.id as token_id,
        rt.expires_at,
        t.slug as tenant_slug
    FROM tenant_refresh_tokens rt
    JOIN tenants t ON t.id = rt.tenant_id
    WHERE 
        rt.refresh_token_hash = token_hash
        AND rt.tenant_id = p_tenant_id
        AND rt.user_id = p_user_id
    LIMIT 1;
END;
$$;

-- =====================================================
-- 5. TRIGGER: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_tenant_refresh_tokens_updated_at
    BEFORE UPDATE ON tenant_refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. RLS (Row Level Security)
-- =====================================================
-- Habilitar RLS nas tabelas
ALTER TABLE tenant_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sessions_audit ENABLE ROW LEVEL SECURITY;

-- Política para tenant_refresh_tokens
-- Usuários só podem ver seus próprios tokens
CREATE POLICY "Users can manage their own refresh tokens"
ON tenant_refresh_tokens
FOR ALL
USING (auth.uid() = user_id);

-- Política para tenant_sessions_audit  
-- Usuários só podem ver seus próprios logs de auditoria
CREATE POLICY "Users can view their own session audit logs"
ON tenant_sessions_audit
FOR SELECT
USING (auth.uid() = user_id);

-- Service role pode fazer tudo (para Edge Functions)
CREATE POLICY "Service role full access to refresh tokens"
ON tenant_refresh_tokens
FOR ALL
TO service_role
USING (true);

CREATE POLICY "Service role full access to session audit"
ON tenant_sessions_audit
FOR ALL
TO service_role
USING (true);

-- =====================================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE tenant_refresh_tokens IS 'Armazena refresh tokens de longa duração para auto-login multi-tenant inspirado na arquitetura da Omie';
COMMENT ON TABLE tenant_sessions_audit IS 'Log de auditoria completo para todas as ações de sessão de tenant';

COMMENT ON COLUMN tenant_refresh_tokens.refresh_token_hash IS 'Hash SHA-256 do refresh token JWT para armazenamento seguro';
COMMENT ON COLUMN tenant_refresh_tokens.expires_at IS 'Data de expiração do refresh token (tipicamente 30 dias)';
COMMENT ON COLUMN tenant_refresh_tokens.last_used_at IS 'Última vez que o token foi usado para renovar access token';
COMMENT ON COLUMN tenant_refresh_tokens.revoked_at IS 'Data de revogação manual do token (logout, segurança, etc)';

COMMENT ON COLUMN tenant_sessions_audit.action IS 'Tipo de ação: created, refreshed, revoked, expired, invalid_attempt';
COMMENT ON COLUMN tenant_sessions_audit.session_duration_minutes IS 'Duração da sessão em minutos (para análise de uso)';
COMMENT ON COLUMN tenant_sessions_audit.details IS 'Detalhes adicionais em formato JSON para análise e debugging';

-- =====================================================
-- 8. DADOS INICIAIS / CONFIGURAÇÃO
-- =====================================================
-- Inserir configuração padrão para limpeza automática
INSERT INTO public.system_config (key, value, description) 
VALUES (
    'refresh_token_cleanup_enabled', 
    'true', 
    'Habilita limpeza automática de refresh tokens expirados'
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_config (key, value, description) 
VALUES (
    'refresh_token_max_age_days', 
    '30', 
    'Idade máxima em dias para refresh tokens antes da expiração'
) ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 9. GRANTS DE PERMISSÃO
-- =====================================================
-- Garantir que o service role pode executar as funções
GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION validate_refresh_token(text, uuid, uuid) TO service_role;

-- Garantir acesso às tabelas para authenticated users
GRANT SELECT, INSERT, UPDATE ON tenant_refresh_tokens TO authenticated;
GRANT SELECT, INSERT ON tenant_sessions_audit TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
