-- =====================================================
-- Script SQL: Verificar Reaplicação de Migrations
-- Execute este script periodicamente até mostrar 21 migrations
-- =====================================================

-- Contar total de migrations
SELECT 
  COUNT(*) as total_migrations,
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Aguardando reaplicação...'
    WHEN COUNT(*) < 21 THEN CONCAT('⚠️  Parcial: ', COUNT(*), ' de 21 migrations')
    WHEN COUNT(*) = 21 THEN '✅ Completo: Todas as 21 migrations foram reaplicadas!'
    ELSE CONCAT('⚠️  Inesperado: ', COUNT(*), ' migrations (esperado 21)')
  END as status
FROM supabase_migrations.schema_migrations;

-- Listar migrations reaplicadas (últimas 10)
SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations 
ORDER BY inserted_at DESC
LIMIT 10;

-- =====================================================
-- INSTRUÇÕES:
-- =====================================================
-- 1. Execute este script a cada 1-2 minutos
-- 2. Quando total_migrations = 21, está pronto para merge
-- 3. Se após 5 minutos ainda estiver em 0, faça push para develop
-- =====================================================

