-- =====================================================
-- Script SQL: Verificar Sincronização de Migrations
-- Execute este script após zerar o histórico para verificar
-- se as migrations foram reaplicadas corretamente
-- =====================================================

-- Verificar total de migrations no histórico
SELECT 
  COUNT(*) as total_migrations,
  MIN(version) as primeira_migration,
  MAX(version) as ultima_migration
FROM supabase_migrations.schema_migrations;

-- Listar todas as migrations (últimas 20)
SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC
LIMIT 20;

-- Verificar se há migrations faltando (comparar com Git)
-- Ajuste a lista conforme suas migrations no Git
SELECT 
  CASE 
    WHEN version = '20240101000000' THEN '✅'
    WHEN version = '20250127' THEN '✅'
    WHEN version = '20251125' THEN '✅'
    WHEN version = '20251126' THEN '✅'
    WHEN version = '20251127' THEN '✅'
    WHEN version = '20251128' THEN '✅'
    WHEN version = '20251212' THEN '✅'
    WHEN version = '20251213' THEN '✅'
    WHEN version = '20251213120001' THEN '✅'
    WHEN version = '20251213120002' THEN '✅'
    WHEN version = '20251214' THEN '✅'
    WHEN version = '20251215161709' THEN '✅'
    WHEN version = '20251220111401' THEN '✅'
    WHEN version = '20251221022210' THEN '✅'
    WHEN version = '20251221022558' THEN '✅'
    WHEN version = '20251221023114' THEN '✅'
    WHEN version = '20251221024204' THEN '✅'
    WHEN version = '20251221024205' THEN '✅'
    WHEN version = '20251221024436' THEN '✅'
    WHEN version = '20251221025023' THEN '✅'
    WHEN version = '20251221025309' THEN '✅'
    ELSE '❌'
  END as status,
  version,
  name
FROM supabase_migrations.schema_migrations 
ORDER BY version;

