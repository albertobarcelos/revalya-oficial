-- Query para verificar as cobranças do tenant Nexsyn
-- Primeiro, vamos encontrar o ID do tenant Nexsyn
SELECT 
    t.id as tenant_id,
    t.name,
    t.slug,
    t.active
FROM tenants t 
WHERE t.slug = 'nexsyn' OR LOWER(t.name) LIKE '%nexsyn%';

-- Query para verificar todas as cobranças com relacionamentos
SELECT 
    c.id,
    c.tenant_id,
    c.customer_id,
    c.valor,
    c.status,
    c.tipo,
    c.data_vencimento,
    c.data_pagamento,
    c.descricao,
    c.created_at,
    c.updated_at,
    c.contract_id,
    -- Dados do customer
    cust.name as customer_name,
    cust.email as customer_email,
    cust.active as customer_active,
    -- Dados do tenant
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.active as tenant_active
FROM charges c
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn'
ORDER BY c.created_at DESC;

-- Query para contar cobranças por tenant
SELECT 
    t.name as tenant_name,
    t.slug as tenant_slug,
    COUNT(c.id) as total_charges,
    COUNT(CASE WHEN c.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
    COUNT(CASE WHEN c.status = 'RECEIVED' THEN 1 ELSE 0 END) as received,
    COUNT(CASE WHEN c.status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue
FROM tenants t
LEFT JOIN charges c ON t.id = c.tenant_id
GROUP BY t.id, t.name, t.slug
ORDER BY total_charges DESC;

-- Query específica para verificar se existem cobranças órfãs (sem customer válido)
SELECT 
    c.id,
    c.tenant_id,
    c.customer_id,
    c.valor,
    c.status,
    c.tipo,
    c.data_vencimento,
    CASE 
        WHEN cust.id IS NULL THEN 'CUSTOMER_NOT_FOUND'
        WHEN cust.active = false THEN 'CUSTOMER_INACTIVE'
        ELSE 'CUSTOMER_OK'
    END as customer_status
FROM charges c
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN tenants t ON c.tenant_id = t.id
WHERE t.slug = 'nexsyn';