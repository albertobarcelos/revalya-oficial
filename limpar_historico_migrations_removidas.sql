-- =====================================================
-- Script SQL: Limpar Histórico de Migrations Removidas
-- Execute este script no SQL Editor do Supabase (projeto develop)
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Remover migrations que foram removidas do Git mas ainda estão no histórico
-- Isso resolve o erro "Remote migration versions not found"
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20251220202812',  -- test_fluxo_develop_main (já removida do Git)
  '20251220224743'   -- rollback_test_fluxo_develop_main (ainda no Git, mas deve ser removida)
);

-- Verificar resultado
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM supabase_migrations.schema_migrations 
  WHERE version IN ('20251220202812', '20251220224743');
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Migrations removidas do histórico!';
    RAISE NOTICE '';
    RAISE NOTICE 'O erro "Remote migration versions not found" deve ser resolvido.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Ainda existem % migrations no histórico.', remaining_count;
    RAISE NOTICE 'Verifique se as versões estão corretas.';
    RAISE NOTICE '';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase (projeto develop)
-- 2. Após executar, o Supabase deve sincronizar corretamente
-- 3. Se ainda houver erro, verifique se há outras migrations no banco
--    que não estão no Git executando:
--    
--    SELECT version, name 
--    FROM supabase_migrations.schema_migrations 
--    ORDER BY version;
-- =====================================================

