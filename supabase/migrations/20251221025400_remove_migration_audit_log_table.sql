-- =====================================================
-- Migration: Remover Tabela migration_audit_log
-- Data: 2025-12-21
-- Descrição: Remove a tabela migration_audit_log que foi criada
--            apenas para testes e não deveria estar em produção
--            Esta migration deve ser aplicada antes de outras
--            que possam tentar criar policies nesta tabela
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Remover policies da tabela migration_audit_log (se existirem)
-- Isso evita erros quando outras migrations tentam criar essas policies
DO $$
BEGIN
  -- Remover todas as policies relacionadas
  DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_insert_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_update_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_delete_policy" ON public.migration_audit_log;
  
  RAISE NOTICE 'Policies da tabela migration_audit_log removidas (se existiam)';
END $$;

-- AIDEV-NOTE: Desabilitar RLS antes de dropar a tabela
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'migration_audit_log'
  ) THEN
    ALTER TABLE public.migration_audit_log DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS desabilitado na tabela migration_audit_log';
  END IF;
END $$;

-- AIDEV-NOTE: Remover índices relacionados (se existirem)
DROP INDEX IF EXISTS public.idx_migration_audit_log_version;
DROP INDEX IF EXISTS public.idx_migration_audit_log_environment;

-- AIDEV-NOTE: Remover a tabela migration_audit_log
DROP TABLE IF EXISTS public.migration_audit_log;

-- Verificar se foi removida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'migration_audit_log'
  ) THEN
    RAISE NOTICE '✅ Tabela migration_audit_log removida com sucesso';
  ELSE
    RAISE NOTICE '⚠️  Tabela migration_audit_log ainda existe';
  END IF;
END $$;

COMMIT;

