-- Conceder permissões para as tabelas necessárias
GRANT ALL PRIVILEGES ON tenants TO authenticated;
GRANT ALL PRIVILEGES ON customers TO authenticated;
GRANT ALL PRIVILEGES ON charges TO authenticated;

GRANT SELECT ON tenants TO anon;
GRANT SELECT ON customers TO anon;
GRANT SELECT ON charges TO anon;

-- Verificar se existem tenants
SELECT 'Tenants existentes:' as info;
SELECT COUNT(*) as total_tenants FROM tenants;
SELECT * FROM tenants LIMIT 5;