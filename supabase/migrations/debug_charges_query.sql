-- Query para verificar cobranças do tenant 'nexsyn'
-- Esta é uma consulta de debug para identificar o problema

-- Primeiro, vamos encontrar o tenant_id do 'nexsyn'
SELECT id, name, slug FROM tenants WHERE slug = 'nexsyn';

-- Agora vamos verificar se existem cobranças para este tenant
SELECT 
    c.id,
    c.tenant_id,
    c.valor,
    c.status,
    c.tipo,
    c.data_vencimento,
    c.data_pagamento,
    c.descricao,
    c.created_at,
    cust.name as customer_name
FROM charges c
JOIN customers cust ON c.customer_id = cust.id
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'
ORDER BY c.created_at DESC
LIMIT 20;

-- Contar total de cobranças por status
SELECT 
    c.status,
    COUNT(*) as total
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'
GROUP BY c.status
ORDER BY total DESC;

-- Verificar cobranças dos últimos 30 dias
SELECT 
    COUNT(*) as total_last_30_days,
    COUNT(CASE WHEN c.status = 'PENDING' THEN 1 END) as pending,
    COUNT(CASE WHEN c.status = 'RECEIVED' THEN 1 END) as received,
    COUNT(CASE WHEN c.status = 'OVERDUE' THEN 1 END) as overdue
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'
AND c.created_at >= NOW() - INTERVAL '30 days';