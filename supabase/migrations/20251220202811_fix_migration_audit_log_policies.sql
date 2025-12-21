-- =====================================================
-- Migration: Corrigir Policies migration_audit_log
-- Data: 2025-12-20
-- Descrição: Remove policies existentes antes de recriar
--            Evita erro "policy already exists" ao executar
--            migrations subsequentes que tentam criar essas policies
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Remover policies da tabela migration_audit_log se existirem
-- Isso garante que migrations subsequentes possam criar essas policies sem erro
DO $$
BEGIN
  -- Remover todas as policies relacionadas à migration_audit_log
  DROP POLICY IF EXISTS "migration_audit_log_select_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_insert_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_update_policy" ON public.migration_audit_log;
  DROP POLICY IF EXISTS "migration_audit_log_delete_policy" ON public.migration_audit_log;
  
  RAISE NOTICE 'Policies da tabela migration_audit_log removidas (se existiam)';
END $$;

COMMIT;

