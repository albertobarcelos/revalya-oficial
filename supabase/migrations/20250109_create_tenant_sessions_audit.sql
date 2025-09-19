-- Migration: Criar tabela de auditoria para sessões de tenant
-- Data: 2025-01-09
-- Descrição: Implementa sistema de logs de auditoria para todas as operações de sessão

-- Criar tabela de auditoria de sessões
CREATE TABLE IF NOT EXISTS tenant_sessions_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES tenant_refresh_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_slug varchar(100) NOT NULL,
  action varchar(50) NOT NULL, -- 'created', 'refreshed', 'revoked', 'expired'
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_audit_user_id ON tenant_sessions_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_audit_tenant_id ON tenant_sessions_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_audit_action ON tenant_sessions_audit(action);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_audit_created_at ON tenant_sessions_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_audit_session_id ON tenant_sessions_audit(session_id);

-- RLS para isolamento de dados
ALTER TABLE tenant_sessions_audit ENABLE ROW LEVEL SECURITY;

-- Policy para usuários verem apenas seus próprios logs
CREATE POLICY "Users can view their own audit logs"
ON tenant_sessions_audit FOR SELECT
USING (user_id = auth.uid());

-- Policy para admins verem logs do tenant
CREATE POLICY "Tenant admins can view tenant audit logs"
ON tenant_sessions_audit FOR SELECT
USING (
  tenant_id IN (
    SELECT t.id 
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'owner')
  )
);

-- Função para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION log_tenant_session_audit(
  p_session_id uuid,
  p_user_id uuid,
  p_tenant_id uuid,
  p_tenant_slug varchar,
  p_action varchar,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO tenant_sessions_audit (
    session_id,
    user_id,
    tenant_id,
    tenant_slug,
    action,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_session_id,
    p_user_id,
    p_tenant_id,
    p_tenant_slug,
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Trigger para log automático de criação de sessões
CREATE OR REPLACE FUNCTION trigger_log_session_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM log_tenant_session_audit(
    NEW.id,
    NEW.user_id,
    NEW.tenant_id,
    NEW.tenant_slug,
    'created',
    NEW.ip_address::inet,
    NEW.user_agent,
    jsonb_build_object(
      'refresh_expires_at', NEW.refresh_expires_at,
      'access_expires_at', NEW.access_expires_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para log automático de atualização de sessões
CREATE OR REPLACE FUNCTION trigger_log_session_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log apenas se houve mudança no access_token (refresh)
  IF OLD.access_token != NEW.access_token THEN
    PERFORM log_tenant_session_audit(
      NEW.id,
      NEW.user_id,
      NEW.tenant_id,
      NEW.tenant_slug,
      'refreshed',
      NEW.ip_address::inet,
      NEW.user_agent,
      jsonb_build_object(
        'old_access_expires_at', OLD.access_expires_at,
        'new_access_expires_at', NEW.access_expires_at,
        'last_access', NEW.last_access
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para log automático de revogação de sessões
CREATE OR REPLACE FUNCTION trigger_log_session_revoked()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log apenas se a sessão foi desativada
  IF OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM log_tenant_session_audit(
      OLD.id,
      OLD.user_id,
      OLD.tenant_id,
      OLD.tenant_slug,
      'revoked',
      OLD.ip_address::inet,
      OLD.user_agent,
      jsonb_build_object(
        'revoked_at', now(),
        'reason', 'manual_revocation'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar triggers na tabela tenant_refresh_sessions
DROP TRIGGER IF EXISTS trigger_tenant_session_created ON tenant_refresh_sessions;
CREATE TRIGGER trigger_tenant_session_created
  AFTER INSERT ON tenant_refresh_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_session_created();

DROP TRIGGER IF EXISTS trigger_tenant_session_updated ON tenant_refresh_sessions;
CREATE TRIGGER trigger_tenant_session_updated
  AFTER UPDATE ON tenant_refresh_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_session_updated();

DROP TRIGGER IF EXISTS trigger_tenant_session_revoked ON tenant_refresh_sessions;
CREATE TRIGGER trigger_tenant_session_revoked
  AFTER UPDATE ON tenant_refresh_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_session_revoked();

-- Função para limpeza automática de logs antigos (manter apenas 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM tenant_sessions_audit
  WHERE created_at < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE tenant_sessions_audit IS 'Logs de auditoria para todas as operações de sessão de tenant';
COMMENT ON COLUMN tenant_sessions_audit.action IS 'Tipo de ação: created, refreshed, revoked, expired';
COMMENT ON COLUMN tenant_sessions_audit.metadata IS 'Dados adicionais específicos da ação em formato JSON';
COMMENT ON FUNCTION log_tenant_session_audit IS 'Função para registrar eventos de auditoria de sessões';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs de auditoria com mais de 90 dias';
