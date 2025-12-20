-- =====================================================
-- Migration: Teste de Fluxo Develop → Main
-- Data: 2025-12-20
-- Descrição: Migration de teste para validar fluxo completo
--            Branch → Develop → Main
-- =====================================================

BEGIN;

-- Criar tabela de auditoria de migrations (apenas para teste)
-- Esta tabela será usada para rastrear quando migrations são aplicadas
CREATE TABLE IF NOT EXISTS public.migration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version TEXT NOT NULL,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
  applied_by TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('local', 'develop', 'main')),
  notes TEXT
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_migration_audit_log_version 
  ON public.migration_audit_log(migration_version);

CREATE INDEX IF NOT EXISTS idx_migration_audit_log_environment 
  ON public.migration_audit_log(environment, applied_at DESC);

-- RLS Policies
ALTER TABLE public.migration_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas usuários autenticados podem ver
CREATE POLICY "migration_audit_log_select_policy" 
  ON public.migration_audit_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Apenas service_role pode inserir (via migrations)
CREATE POLICY "migration_audit_log_insert_policy" 
  ON public.migration_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Comentários descritivos
COMMENT ON TABLE public.migration_audit_log IS 'Tabela de auditoria para rastrear aplicação de migrations em diferentes ambientes';
COMMENT ON COLUMN public.migration_audit_log.environment IS 'Ambiente onde a migration foi aplicada: local, develop ou main';
COMMENT ON COLUMN public.migration_audit_log.applied_by IS 'Usuário ou sistema que aplicou a migration';

-- Inserir registro desta migration (apenas para teste)
-- AIDEV-NOTE: Este INSERT será executado quando a migration for aplicada
-- O ambiente será detectado automaticamente ou pode ser passado como parâmetro
INSERT INTO public.migration_audit_log (
  migration_version,
  migration_name,
  environment,
  notes
) VALUES (
  '20251220202812',
  'test_fluxo_develop_main',
  'local', -- Será atualizado quando aplicado em develop/main
  'Migration de teste para validar fluxo Branch → Develop → Main'
);

COMMIT;

