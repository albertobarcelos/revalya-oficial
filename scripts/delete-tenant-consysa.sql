-- Script de Exclusão Completa do Tenant Consysa
-- Tenant ID: 5832173a-e3eb-4af0-b22c-863b8b917d28
-- Nome: Consysa Sistemas LTDA
-- Documento: 23750090000133

-- AIDEV-NOTE: Este script remove TODOS os dados relacionados ao tenant
-- Execute com cuidado! Esta operação é IRREVERSÍVEL.

BEGIN;

-- 1. Excluir convites do tenant
DELETE FROM tenant_invites
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 2. Excluir associações de usuários ao tenant
DELETE FROM tenant_users
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 3. Excluir integrações do tenant
DELETE FROM tenant_integrations
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 4. Excluir configurações de régua de cobrança
DELETE FROM regua_cobranca_config
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM regua_cobranca_etapas
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM regua_cobranca_execucao
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM regua_cobranca_mensagens
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM regua_cobranca_interacoes
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM regua_cobranca_estatisticas
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 5. Excluir templates de notificação
DELETE FROM notification_templates
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 6. Excluir histórico de mensagens
DELETE FROM message_history
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 7. Excluir notificações
DELETE FROM notifications
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 8. Excluir clientes (se houver)
DELETE FROM customers
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 9. Excluir contratos e relacionados (se houver)
DELETE FROM contract_attachments
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_products
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_services
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_stage_transitions
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_stage_transition_rules
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_stages
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contracts
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 10. Excluir cobranças (se houver)
DELETE FROM charges
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 11. Excluir serviços
DELETE FROM services
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 12. Excluir produtos
DELETE FROM products
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM product_categories
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 13. Excluir faturamentos
DELETE FROM contract_billing_periods
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM contract_billings
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 14. Excluir agente IA
DELETE FROM agente_ia_empresa
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM agente_ia_mensagens_regua
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 15. Excluir conciliação
DELETE FROM conciliation_staging
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM conciliation_history
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM reconciliation_rules
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 16. Excluir financeiro
DELETE FROM finance_entries
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM financial_payables
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM financial_settings
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM financial_launchs
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM financial_documents
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM bank_acounts
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM bank_operation_history
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 17. Excluir estoque
DELETE FROM stock_movements
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM product_stock_by_location
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM storage_locations
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 18. Excluir recebimentos
DELETE FROM receipts
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 19. Excluir tarefas
DELETE FROM tasks
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 20. Excluir códigos de acesso
DELETE FROM tenant_access_codes
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 21. Excluir sequências
DELETE FROM service_order_sequences
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

DELETE FROM des_payables_sequence
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 22. Excluir logs de auditoria relacionados
DELETE FROM audit_logs
WHERE tenant_id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

-- 23. FINALMENTE: Excluir o tenant
DELETE FROM tenants
WHERE id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

COMMIT;

-- Verificação final
SELECT 
  'Verificação: Tenant excluído?' as status,
  COUNT(*) as registros_restantes
FROM tenants
WHERE id = '5832173a-e3eb-4af0-b22c-863b8b917d28';

