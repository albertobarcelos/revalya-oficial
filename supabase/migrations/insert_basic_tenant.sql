-- Inserir tenant básico para teste
INSERT INTO tenants (name, slug, email, active) 
VALUES ('Nexsyn Teste', 'nexsyn', 'teste@nexsyn.com', true) 
ON CONFLICT (slug) DO NOTHING;

-- Verificar se foi inserido
SELECT 'Tenant inserido:' as info;
SELECT * FROM tenants WHERE slug = 'nexsyn';