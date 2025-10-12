-- Migration: Criar sistema de monitoramento de constraint violations
-- Data: 2025-01-28
-- Objetivo: Implementar logging e monitoramento de violações de constraint

-- AIDEV-NOTE: Tabela para registrar tentativas de violação de constraint
CREATE TABLE IF NOT EXISTS constraint_violation_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  constraint_name TEXT NOT NULL,
  attempted_value TEXT,
  tenant_id UUID,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para performance
  INDEX idx_constraint_violation_log_created_at ON constraint_violation_log(created_at),
  INDEX idx_constraint_violation_log_table_constraint ON constraint_violation_log(table_name, constraint_name),
  INDEX idx_constraint_violation_log_tenant ON constraint_violation_log(tenant_id)
);

-- AIDEV-NOTE: Função para obter estatísticas da tabela
CREATE OR REPLACE FUNCTION get_table_statistics(table_name TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_rows BIGINT;
  inserts_today BIGINT;
BEGIN
  -- Obter total de registros
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO total_rows;
  
  -- Obter inserções de hoje (se a tabela tiver created_at)
  BEGIN
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE created_at >= CURRENT_DATE', table_name) INTO inserts_today;
  EXCEPTION
    WHEN OTHERS THEN
      inserts_today := NULL;
  END;
  
  -- Construir resultado JSON
  result := json_build_object(
    'table_name', table_name,
    'total_rows', total_rows,
    'inserts_today', inserts_today,
    'last_updated', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Função para registrar violações de constraint
CREATE OR REPLACE FUNCTION log_constraint_violation(
  p_table_name TEXT,
  p_constraint_name TEXT,
  p_attempted_value TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO constraint_violation_log (
    table_name,
    constraint_name,
    attempted_value,
    tenant_id,
    error_message,
    created_at
  ) VALUES (
    p_table_name,
    p_constraint_name,
    p_attempted_value,
    p_tenant_id,
    COALESCE(p_error_message, 'Constraint violation detected'),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Função para limpar logs antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_constraint_violation_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM constraint_violation_log 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Trigger para capturar violações na tabela conciliation_staging
-- Este trigger será executado quando houver erro de constraint
CREATE OR REPLACE FUNCTION trigger_log_conciliation_staging_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- AIDEV-NOTE: Este trigger só é executado em caso de erro
  -- Verificar se o valor de origem é inválido
  IF NEW.origem NOT IN ('ASAAS', 'PIX', 'MANUAL', 'CORA', 'ITAU', 'BRADESCO', 'SANTANDER') THEN
    -- Registrar a tentativa de violação
    PERFORM log_constraint_violation(
      'conciliation_staging',
      'conciliation_staging_origem_check',
      NEW.origem,
      NEW.tenant_id,
      format('Tentativa de inserir origem inválida: %s', NEW.origem)
    );
  END IF;
  
  -- Continuar com o processamento normal (que falhará devido à constraint)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AIDEV-NOTE: Aplicar trigger BEFORE INSERT/UPDATE para capturar tentativas
DROP TRIGGER IF EXISTS trigger_log_conciliation_staging_violation ON conciliation_staging;
CREATE TRIGGER trigger_log_conciliation_staging_violation
  BEFORE INSERT OR UPDATE ON conciliation_staging
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_conciliation_staging_violation();

-- AIDEV-NOTE: Criar view para facilitar consultas de monitoramento
CREATE OR REPLACE VIEW v_constraint_violations_summary AS
SELECT 
  table_name,
  constraint_name,
  attempted_value,
  COUNT(*) as violation_count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  COUNT(DISTINCT tenant_id) as affected_tenants
FROM constraint_violation_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY table_name, constraint_name, attempted_value
ORDER BY violation_count DESC, last_occurrence DESC;

-- AIDEV-NOTE: Comentários para documentação
COMMENT ON TABLE constraint_violation_log IS 'Log de tentativas de violação de constraints para monitoramento';
COMMENT ON FUNCTION get_table_statistics(TEXT) IS 'Retorna estatísticas básicas de uma tabela';
COMMENT ON FUNCTION log_constraint_violation(TEXT, TEXT, TEXT, UUID, TEXT) IS 'Registra uma violação de constraint no log';
COMMENT ON FUNCTION cleanup_constraint_violation_logs() IS 'Remove logs de violação mais antigos que 30 dias';
COMMENT ON VIEW v_constraint_violations_summary IS 'Resumo de violações de constraint nas últimas 24 horas';

-- AIDEV-NOTE: Inserir registro inicial para teste
INSERT INTO constraint_violation_log (
  table_name,
  constraint_name,
  attempted_value,
  error_message
) VALUES (
  'system',
  'monitoring_setup',
  'initial_setup',
  'Sistema de monitoramento de constraints inicializado'
);