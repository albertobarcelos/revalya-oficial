-- Verificar dados na tabela charges para o tenant nexsyn

-- 1. Buscar o tenant_id do nexsyn
SELECT id, name, slug FROM tenants WHERE slug = 'nexsyn';

-- 2. Verificar se existem cobranças para este tenant
SELECT 
    c.id,
    c.tenant_id,
    c.valor,
    c.status,
    c.data_vencimento,
    c.created_at,
    t.name as tenant_name
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Contar total de cobranças por tenant
SELECT 
    t.name as tenant_name,
    t.slug,
    COUNT(c.id) as total_charges
FROM tenants t
LEFT JOIN charges c ON c.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY total_charges DESC;

-- 4. Verificar se há cobranças em geral na tabela
SELECT COUNT(*) as total_charges_all_tenants FROM charges;