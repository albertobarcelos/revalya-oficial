-- Query para verificar dados do tenant nexsyn
-- Esta query será executada para obter resultados específicos

-- 1. Buscar ID do tenant nexsyn
WITH nexsyn_tenant AS (
  SELECT id, name, slug FROM tenants WHERE slug = 'nexsyn'
)
-- 2. Contar e listar cobranças
SELECT 
  'TENANT_INFO' as query_type,
  nt.id::text as tenant_id,
  nt.name as tenant_name,
  nt.slug as tenant_slug
FROM nexsyn_tenant nt

UNION ALL

SELECT 
  'CHARGES_COUNT' as query_type,
  COUNT(*)::text as count,
  'total_charges' as description,
  '' as extra
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'

UNION ALL

SELECT 
  'CUSTOMERS_COUNT' as query_type,
  COUNT(*)::text as count,
  'total_customers' as description,
  '' as extra
FROM customers cust
JOIN tenants t ON cust.tenant_id = t.id
WHERE t.slug = 'nexsyn';

-- Query separada para listar cobranças detalhadas
SELECT 
  c.id::text as charge_id,
  c.valor::text as valor,
  c.status,
  c.tipo,
  c.data_vencimento::text as data_vencimento,
  c.data_pagamento::text as data_pagamento,
  c.descricao,
  c.created_at::text as created_at,
  cust.name as customer_name,
  cust.email as customer_email,
  t.slug as tenant_slug
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
JOIN customers cust ON c.customer_id = cust.id
WHERE t.slug = 'nexsyn'
ORDER BY c.created_at DESC
LIMIT 20;