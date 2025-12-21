-- =====================================================
-- Script SQL: Remover Migrations "Fantasma"
-- Descrição: Remove migrations do histórico que não estão mais no Git
--            Isso resolve o erro "Remote migration versions not found"
-- =====================================================

BEGIN;

-- Lista de migrations que DEVEM estar no Git
-- Qualquer migration no banco que não estiver nesta lista será removida
WITH migrations_git AS (
  SELECT unnest(ARRAY[
    '20240101000000',
    '20250127',
    '20251125',
    '20251126',
    '20251127',
    '20251128',
    '20251212',
    '20251213',
    '20251213120001',
    '20251213120002',
    '20251214',
    '20251215161709',
    '20251220111401',
    '20251221022210',
    '20251221022558',
    '20251221023114',
    '20251221024204',
    '20251221024205',
    '20251221024436',
    '20251221025023',
    '20251221025309'
  ]) AS version
),
migrations_fantasma AS (
  SELECT sm.version::TEXT AS version, sm.name
  FROM supabase_migrations.schema_migrations sm
  LEFT JOIN migrations_git mg ON sm.version::TEXT = mg.version
  WHERE mg.version IS NULL
)
-- Mostrar migrations que serão removidas
DO $$
DECLARE
  migration_record RECORD;
  total_fantasma INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_fantasma
  FROM supabase_migrations.schema_migrations sm
  LEFT JOIN (
    SELECT unnest(ARRAY[
      '20240101000000', '20250127', '20251125', '20251126', '20251127',
      '20251128', '20251212', '20251213', '20251213120001', '20251213120002',
      '20251214', '20251215161709', '20251220111401', '20251221022210',
      '20251221022558', '20251221023114', '20251221024204', '20251221024205',
      '20251221024436', '20251221025023', '20251221025309'
    ]) AS version
  ) mg ON sm.version::TEXT = mg.version
  WHERE mg.version IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMOVENDO MIGRATIONS FANTASMA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de migrations fantasma encontradas: %', total_fantasma;
  RAISE NOTICE '';
  
  IF total_fantasma > 0 THEN
    RAISE NOTICE 'Migrations que serão removidas:';
    FOR migration_record IN 
      SELECT sm.version::TEXT AS version, sm.name
      FROM supabase_migrations.schema_migrations sm
      LEFT JOIN (
        SELECT unnest(ARRAY[
          '20240101000000', '20250127', '20251125', '20251126', '20251127',
          '20251128', '20251212', '20251213', '20251213120001', '20251213120002',
          '20251214', '20251215161709', '20251220111401', '20251221022210',
          '20251221022558', '20251221023114', '20251221024204', '20251221024205',
          '20251221024436', '20251221025023', '20251221025309'
        ]) AS version
      ) mg ON sm.version::TEXT = mg.version
      WHERE mg.version IS NULL
      ORDER BY sm.version
    LOOP
      RAISE NOTICE '  ❌ % : %', migration_record.version, migration_record.name;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Nenhuma migration fantasma encontrada!';
    RAISE NOTICE 'Todas as migrations no banco estão no Git.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Remover migrations fantasma
DELETE FROM supabase_migrations.schema_migrations 
WHERE version::TEXT NOT IN (
  '20240101000000',
  '20250127',
  '20251125',
  '20251126',
  '20251127',
  '20251128',
  '20251212',
  '20251213',
  '20251213120001',
  '20251213120002',
  '20251214',
  '20251215161709',
  '20251220111401',
  '20251221022210',
  '20251221022558',
  '20251221023114',
  '20251221024204',
  '20251221024205',
  '20251221024436',
  '20251221025023',
  '20251221025309'
);

-- Verificar resultado
DO $$
DECLARE
  removed_count INTEGER;
  remaining_fantasma INTEGER;
BEGIN
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO remaining_fantasma
  FROM supabase_migrations.schema_migrations sm
  LEFT JOIN (
    SELECT unnest(ARRAY[
      '20240101000000', '20250127', '20251125', '20251126', '20251127',
      '20251128', '20251212', '20251213', '20251213120001', '20251213120002',
      '20251214', '20251215161709', '20251220111401', '20251221022210',
      '20251221022558', '20251221023114', '20251221024204', '20251221024205',
      '20251221024436', '20251221025023', '20251221025309'
    ]) AS version
  ) mg ON sm.version::TEXT = mg.version
  WHERE mg.version IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESULTADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrations removidas: %', removed_count;
  
  IF remaining_fantasma = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO: Histórico sincronizado!';
    RAISE NOTICE '';
    RAISE NOTICE 'O erro "Remote migration versions not found" deve ser resolvido.';
    RAISE NOTICE 'Faça um novo push ou aguarde a próxima sincronização do Supabase.';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Ainda existem % migrations fantasma.', remaining_fantasma;
    RAISE NOTICE 'Verifique manualmente.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. PRIMEIRO execute: identificar_migrations_fantasma.sql
--    Isso mostra quais migrations são "fantasma" sem remover nada
-- 
-- 2. DEPOIS execute este script para remover as migrations fantasma
-- 
-- 3. Após executar, o Supabase deve sincronizar corretamente
-- =====================================================

