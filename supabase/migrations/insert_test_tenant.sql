-- Inserir tenant de teste
INSERT INTO tenants (id, name, slug, document, email, active) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Nexsyn Teste', 'nexsyn', '12345678901', 'teste@nexsyn.com', true) 
ON CONFLICT (slug) DO NOTHING;

-- Inserir algumas cobranças de teste
INSERT INTO customers (id, name, email, cpf_cnpj, tenant_id) 
VALUES ('660e8400-e29b-41d4-a716-446655440001', 'Cliente Teste 1', 'cliente1@teste.com', 98765432101, '550e8400-e29b-41d4-a716-446655440000') 
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, name, email, cpf_cnpj, tenant_id) 
VALUES ('660e8400-e29b-41d4-a716-446655440002', 'Cliente Teste 2', 'cliente2@teste.com', 98765432102, '550e8400-e29b-41d4-a716-446655440000') 
ON CONFLICT (id) DO NOTHING;

-- Inserir cobranças de teste com diferentes status
INSERT INTO charges (id, tenant_id, customer_id, valor, status, tipo, data_vencimento, descricao) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 150.00, 'PAGO', 'BOLETO', '2024-01-15', 'Cobrança teste 1'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 250.00, 'PENDENTE', 'BOLETO', '2024-02-15', 'Cobrança teste 2'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 300.00, 'VENCIDO', 'BOLETO', '2024-01-01', 'Cobrança teste 3'),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 100.00, 'PENDENTE', 'BOLETO', '2024-03-15', 'Cobrança teste 4'),
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 200.00, 'VENCIDO', 'BOLETO', '2023-12-15', 'Cobrança teste 5')
ON CONFLICT (id) DO NOTHING;