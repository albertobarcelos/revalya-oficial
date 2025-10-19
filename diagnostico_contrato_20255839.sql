-- AIDEV-NOTE: Script de diagnóstico para contrato 20255839
-- Executar no Supabase SQL Editor para identificar causa raiz

-- 1. Verificar se o contrato existe
SELECT 
  id,
  contract_number,
  tenant_id,
  status,
  created_at,
  updated_at
FROM contracts 
WHERE id = 'f6df338a-e559-465f-8792-f08bd58f19a7';

-- 2. Verificar serviços do contrato
SELECT 
  cs.*,
  s.name as service_name,
  s.is_active as service_active
FROM contract_services cs
LEFT JOIN services s ON cs.service_id = s.id
WHERE cs.contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7';

-- 3. Verificar produtos do contrato
SELECT 
  cp.*,
  p.name as product_name,
  p.is_active as product_active
FROM contract_products cp
LEFT JOIN products p ON cp.product_id = p.id
WHERE cp.contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7';

-- 4. Verificar integridade referencial
SELECT 
  'contract_services' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN service_id IS NULL THEN 1 END) as orphaned_records
FROM contract_services 
WHERE contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7'

UNION ALL

SELECT 
  'contract_products' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN product_id IS NULL THEN 1 END) as orphaned_records
FROM contract_products 
WHERE contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7';

-- 5. Verificar configurações de faturamento
SELECT 
  'services' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN generate_billing = true THEN 1 END) as billing_enabled,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM contract_services cs
JOIN services s ON cs.service_id = s.id
WHERE cs.contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7'

UNION ALL

SELECT 
  'products' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN generate_billing = true THEN 1 END) as billing_enabled,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM contract_products cp
JOIN products p ON cp.product_id = p.id
WHERE cp.contract_id = 'f6df338a-e559-465f-8792-f08bd58f19a7';