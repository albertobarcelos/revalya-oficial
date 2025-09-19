-- Verificar cobranças do tenant nexsyn
-- Primeiro, vamos encontrar o ID do tenant nexsyn
SELECT id, name, slug FROM tenants WHERE slug = 'nexsyn';

-- Contar total de cobranças do tenant nexsyn
SELECT COUNT(*) as total_charges
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn';

-- Listar todas as cobranças do tenant nexsyn com detalhes
SELECT 
    c.id,
    c.valor,
    c.status,
    c.tipo,
    c.data_vencimento,
    c.data_pagamento,
    c.descricao,
    c.created_at,
    cust.name as customer_name,
    cust.email as customer_email
FROM charges c
JOIN tenants t ON c.tenant_id = t.id
JOIN customers cust ON c.customer_id = cust.id
WHERE t.slug = 'nexsyn'
ORDER BY c.created_at DESC;

-- Verificar se existem customers para o tenant nexsyn
SELECT COUNT(*) as total_customers
FROM customers cust
JOIN tenants t ON cust.tenant_id = t.id
WHERE t.slug = 'nexsyn';

-- Listar customers do tenant nexsyn
SELECT 
    cust.id,
    cust.name,
    cust.email,
    cust.active,
    cust.created_at
FROM customers cust
JOIN tenants t ON cust.tenant_id = t.id
WHERE t.slug = 'nexsyn'
ORDER BY cust.created_at DESC;