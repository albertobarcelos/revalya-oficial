-- =====================================================
-- Script SQL: Identificar Migrations "Fantasma"
-- Descrição: Encontra migrations no histórico do banco
--            que NÃO estão mais no repositório Git
-- =====================================================

-- Lista de migrations que DEVEM estar no Git (atualizada)
-- Se alguma migration do banco não estiver nesta lista, é uma "fantasma"

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
migrations_banco AS (
  SELECT version::TEXT AS version, name
  FROM supabase_migrations.schema_migrations
)
-- Migrations que estão no banco mas NÃO estão no Git (FANTASMAS)
SELECT 
  '❌ FANTASMA' as status,
  mb.version,
  mb.name,
  'Esta migration está no banco mas não está no Git!' as problema
FROM migrations_banco mb
LEFT JOIN migrations_git mg ON mb.version = mg.version
WHERE mg.version IS NULL

UNION ALL

-- Migrations que estão no Git mas NÃO estão no banco (FALTANTES)
SELECT 
  '⚠️  FALTANTE' as status,
  mg.version,
  NULL as name,
  'Esta migration está no Git mas não está no banco!' as problema
FROM migrations_git mg
LEFT JOIN migrations_banco mb ON mg.version = mb.version
WHERE mb.version IS NULL

ORDER BY status, version;

-- =====================================================
-- Se o resultado estiver vazio, significa que está tudo sincronizado!
-- Se houver migrations "fantasma", você precisa removê-las do histórico
-- =====================================================

