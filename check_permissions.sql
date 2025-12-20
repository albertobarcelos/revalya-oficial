-- Verificar permissões das tabelas tenants e charges
SELECT 
  'tenants' as table_name,
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'tenants' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee;

-- Verificar se há dados na tabela tenants
SELECT 
  'tenants_count' as info,
  COUNT(*) as total
FROM tenants;

-- Verificar permissões da tabela charges
SELECT 
  'charges' as table_name,
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'charges' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY grantee;

-- Verificar se há dados na tabela charges
SELECT 
  'charges_count' as info,
  COUNT(*) as total
FROM charges;

-- Listar alguns tenants se existirem
SELECT 
  id, name, slug, active
FROM tenants 
LIMIT 5;