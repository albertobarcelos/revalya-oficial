-- =====================================================
-- SCRIPT DE VERIFICAÇÃO: Tabelas Develop vs Main
-- =====================================================
-- 
-- AIDEV-NOTE: Execute este script no banco MAIN para comparar com DEVELOP
-- 
-- Data: 2025-01-27
-- =====================================================

-- =====================================================
-- 1. CONTAGEM GERAL DE TABELAS
-- =====================================================

SELECT 
  'Total de Tabelas' as metrica,
  COUNT(*)::TEXT as valor
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- =====================================================
-- 2. LISTAR TODAS AS TABELAS
-- =====================================================

SELECT 
  tablename as tabela,
  tableowner as proprietario
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 3. VERIFICAR TABELAS NOVAS (2025-01-01)
-- =====================================================

-- Verificar product_brands
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_brands'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status,
  'product_brands' as tabela;

-- Verificar product_categories
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'product_categories'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status,
  'product_categories' as tabela;

-- Verificar cfop_reference
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cfop_reference'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status,
  'cfop_reference' as tabela;

-- Verificar cfop_regime_mapping
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'cfop_regime_mapping'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status,
  'cfop_regime_mapping' as tabela;

-- =====================================================
-- 4. VERIFICAR CAMPOS NOVOS EM PRODUCTS
-- =====================================================

SELECT 
  column_name as campo,
  data_type as tipo,
  CASE 
    WHEN is_nullable = 'YES' THEN 'NULL'
    ELSE 'NOT NULL'
  END as nullable,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'products'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = c.column_name
    ) THEN '✅ FK'
    ELSE ''
  END as foreign_key
FROM information_schema.columns c
WHERE table_schema = 'public' 
  AND table_name = 'products'
  AND column_name IN (
    'ncm', 
    'origem', 
    'cst_icms', 
    'cst_ipi', 
    'cst_pis', 
    'cst_cofins', 
    'cfop_id', 
    'brand_id', 
    'category_id'
  )
ORDER BY column_name;

-- =====================================================
-- 5. VERIFICAR CAMPOS NOVOS EM SERVICES
-- =====================================================

SELECT 
  column_name as campo,
  data_type as tipo,
  CASE 
    WHEN is_nullable = 'YES' THEN 'NULL'
    ELSE 'NOT NULL'
  END as nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'services'
  AND column_name IN (
    'codigo_servico_lc116',
    'municipio_prestacao_ibge'
  )
ORDER BY column_name;

-- =====================================================
-- 6. VERIFICAR CAMPO company_data EM TENANTS
-- =====================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'company_data'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status,
  'tenants.company_data' as campo,
  (
    SELECT data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'company_data'
  ) as tipo_dado;

-- =====================================================
-- 7. VERIFICAR FOREIGN KEYS DE PRODUCTS
-- =====================================================

SELECT
  kcu.column_name as coluna,
  ccu.table_name AS tabela_referenciada,
  ccu.column_name AS coluna_referenciada,
  tc.constraint_name as constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'products'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name IN ('cfop_id', 'brand_id', 'category_id', 'tenant_id')
ORDER BY kcu.column_name;

-- =====================================================
-- 8. VERIFICAR MIGRATIONS APLICADAS (2025-01-01)
-- =====================================================

SELECT 
  version,
  name,
  CASE 
    WHEN version LIKE '20250101%' THEN '✅ Migration 2025-01-01'
    ELSE 'Outra migration'
  END as categoria
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '20250101%'
ORDER BY version;

-- =====================================================
-- 9. VERIFICAR DADOS DE REFERÊNCIA
-- =====================================================

-- Contar CFOPs
SELECT 
  'cfop_reference' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE is_active = true) as ativos
FROM cfop_reference;

-- Contar mapeamentos CFOP x Regime
SELECT 
  'cfop_regime_mapping' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) FILTER (WHERE is_default = true) as padroes
FROM cfop_regime_mapping;

-- Contar marcas
SELECT 
  'product_brands' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE is_active = true) as ativos
FROM product_brands;

-- Contar categorias
SELECT 
  'product_categories' as tabela,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE is_active = true) as ativos
FROM product_categories;

-- =====================================================
-- 10. VERIFICAR USO DOS NOVOS CAMPOS EM PRODUCTS
-- =====================================================

SELECT 
  COUNT(*) as total_produtos,
  COUNT(cfop_id) as produtos_com_cfop,
  COUNT(brand_id) as produtos_com_marca,
  COUNT(category_id) as produtos_com_categoria,
  COUNT(ncm) as produtos_com_ncm,
  COUNT(CASE WHEN origem IS NOT NULL THEN 1 END) as produtos_com_origem
FROM products;

-- =====================================================
-- 11. VERIFICAR RLS (Row Level Security)
-- =====================================================

SELECT 
  tablename as tabela,
  CASE 
    WHEN rowsecurity = true THEN '✅ Habilitado'
    ELSE '❌ Desabilitado'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('product_brands', 'product_categories', 'cfop_reference', 'cfop_regime_mapping')
ORDER BY tablename;

-- =====================================================
-- 12. VERIFICAR ÍNDICES
-- =====================================================

SELECT
  tablename as tabela,
  indexname as indice,
  indexdef as definicao
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('products', 'services', 'tenants', 'product_brands', 'product_categories', 'cfop_reference', 'cfop_regime_mapping')
    OR indexname LIKE '%cfop%'
    OR indexname LIKE '%brand%'
    OR indexname LIKE '%category%'
    OR indexname LIKE '%company_data%'
    OR indexname LIKE '%ncm%'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- 13. VERIFICAR FUNÇÕES RPC
-- =====================================================

-- Verificar função get_products_by_tenant
SELECT 
  p.proname as nome_funcao,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_function_result(p.oid) as tipo_retorno,
  CASE 
    WHEN p.proname = 'get_products_by_tenant' THEN '✅ Função existe'
    ELSE 'Verificar'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_products_by_tenant';

-- Verificar função validate_tenant_company_data
SELECT 
  p.proname as nome_funcao,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_function_result(p.oid) as tipo_retorno,
  CASE 
    WHEN p.proname = 'validate_tenant_company_data' THEN '✅ Função existe'
    ELSE 'Verificar'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'validate_tenant_company_data';

-- Verificar funções de CFOP
SELECT 
  p.proname as nome_funcao,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_function_result(p.oid) as tipo_retorno
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%cfop%'
    OR p.proname LIKE '%regime%'
  )
ORDER BY p.proname;

-- =====================================================
-- 14. RESUMO COMPARATIVO
-- =====================================================

SELECT 
  'RESUMO COMPARATIVO' as secao,
  '' as detalhe;

-- Tabelas esperadas: 60
SELECT 
  'Total de Tabelas' as metrica,
  COUNT(*)::TEXT as valor_esperado,
  COUNT(*)::TEXT as valor_atual,
  CASE 
    WHEN COUNT(*) = 60 THEN '✅ OK'
    ELSE '⚠️ DIFERENTE'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Tabelas novas (2025-01-01)
SELECT 
  'Tabelas Novas (2025-01-01)' as metrica,
  (
    SELECT COUNT(*)::TEXT
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name IN ('product_brands', 'product_categories', 'cfop_reference', 'cfop_regime_mapping')
  ) as valor_atual,
  '4' as valor_esperado,
  CASE 
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_name IN ('product_brands', 'product_categories', 'cfop_reference', 'cfop_regime_mapping')
    ) = 4 THEN '✅ OK'
    ELSE '⚠️ FALTANDO'
  END as status;

-- Campos novos em products
SELECT 
  'Campos Novos em Products' as metrica,
  (
    SELECT COUNT(*)::TEXT
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name IN ('ncm', 'origem', 'cst_icms', 'cst_ipi', 'cst_pis', 'cst_cofins', 'cfop_id', 'brand_id', 'category_id')
  ) as valor_atual,
  '9' as valor_esperado,
  CASE 
    WHEN (
      SELECT COUNT(*)
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name IN ('ncm', 'origem', 'cst_icms', 'cst_ipi', 'cst_pis', 'cst_cofins', 'cfop_id', 'brand_id', 'category_id')
    ) = 9 THEN '✅ OK'
    ELSE '⚠️ FALTANDO'
  END as status;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================


