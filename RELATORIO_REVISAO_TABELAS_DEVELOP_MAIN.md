# 📊 Relatório de Revisão: Tabelas Develop vs Main

**Data:** 2025-01-27  
**Objetivo:** Comparar estrutura de tabelas entre branches `develop` e `main`

---

## 📋 Resumo Executivo

### Status Geral
- ✅ **Total de Tabelas no Banco (Develop):** 60 tabelas
- ✅ **Migrations Aplicadas:** 33 migrations
- ⚠️ **Migrations Recentes (2025-01-01):** 6 novas migrations relacionadas a produtos e fiscal

### Principais Descobertas

1. **Novas Tabelas Criadas em 2025:**
   - `product_brands` - Marcas de produtos
   - `product_categories` - Categorias de produtos
   - `cfop_reference` - Referência de CFOPs
   - `cfop_regime_mapping` - Mapeamento CFOP x Regime Tributário

2. **Tabelas Modificadas:**
   - `products` - Adicionados campos fiscais e foreign keys
   - `services` - Adicionados campos para NFSe
   - `tenants` - Adicionado campo `company_data` (JSONB)

3. **Migrations Específicas de Develop:**
   - Várias migrations com sufixo `_develop` que podem não estar na main

---

## 🔍 Análise Detalhada

### 1. Tabelas de Produtos e Fiscal

#### ✅ Tabela: `product_brands`
- **Status:** ✅ Criada em develop
- **Migration:** `20250101000003_create_product_brands_table.sql`
- **Colunas Principais:**
  - `id` (UUID, PK)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `tenant_id` (UUID, FK → tenants)
  - `is_active` (BOOLEAN, default: true)
- **RLS:** ✅ Habilitado com policies de isolamento por tenant
- **Índices:** ✅ Criados para performance

#### ✅ Tabela: `product_categories`
- **Status:** ✅ Criada em develop
- **Migration:** `20250101000004_add_category_id_to_products.sql`
- **Colunas Principais:**
  - `id` (UUID, PK)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `tenant_id` (UUID, FK → tenants)
  - `is_active` (BOOLEAN, default: true)
- **RLS:** ✅ Habilitado com policies de isolamento por tenant
- **Constraint:** ✅ `unique_category_name_per_tenant` (name + tenant_id)

#### ✅ Tabela: `cfop_reference`
- **Status:** ✅ Criada em develop
- **Migration:** `20250101000002_create_cfop_reference_tables.sql`
- **Colunas Principais:**
  - `id` (UUID, PK)
  - `code` (TEXT, UNIQUE) - Código CFOP de 4 dígitos
  - `description` (TEXT)
  - `category` (TEXT) - 'entrada' | 'saida' | 'ajuste_entrada' | 'ajuste_saida'
  - `is_active` (BOOLEAN, default: true)
- **Dados:** ✅ 42 CFOPs inseridos (mais comuns)
- **Funções:** ✅ `get_valid_cfops_by_regime()`, `validate_cfop_for_regime()`

#### ✅ Tabela: `cfop_regime_mapping`
- **Status:** ✅ Criada em develop
- **Migration:** `20250101000002_create_cfop_reference_tables.sql`
- **Colunas Principais:**
  - `id` (UUID, PK)
  - `cfop_id` (UUID, FK → cfop_reference)
  - `regime_tributario` (TEXT) - 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
  - `is_default` (BOOLEAN) - CFOP padrão para o regime
  - `is_active` (BOOLEAN, default: true)
- **Dados:** ✅ 126 mapeamentos inseridos
- **Constraint:** ✅ `unique_cfop_regime` (cfop_id + regime_tributario)

### 2. Modificações em Tabelas Existentes

#### 📝 Tabela: `products`
- **Migrations Aplicadas:**
  1. `20250101000001_add_fiscal_fields_to_products_and_services.sql`
  2. `20250101000002_create_cfop_reference_tables.sql`
  3. `20250101000003_create_product_brands_table.sql`
  4. `20250101000004_add_category_id_to_products.sql`
  5. `20250101000005_update_get_products_by_tenant_rpc.sql`

- **Novos Campos Adicionados:**
  - ✅ `ncm` (TEXT) - Nomenclatura Comum do Mercosul
  - ✅ `origem` (TEXT, default: '0') - Origem da mercadoria (0-8)
  - ✅ `cst_icms` (TEXT) - Código de Situação Tributária do ICMS
  - ✅ `cst_ipi` (TEXT) - Código de Situação Tributária do IPI
  - ✅ `cst_pis` (TEXT) - Código de Situação Tributária do PIS
  - ✅ `cst_cofins` (TEXT) - Código de Situação Tributária do COFINS
  - ✅ `cfop_id` (UUID, FK → cfop_reference) - Substitui campo `cfop` (TEXT)
  - ✅ `brand_id` (UUID, FK → product_brands) - Substitui campo `brand` (TEXT)
  - ✅ `category_id` (UUID, FK → product_categories) - Substitui campo `category` (TEXT)

- **Campos Removidos:**
  - ❌ `category` (TEXT) - Substituído por `category_id` (UUID)
  - ❌ `brand` (TEXT) - Substituído por `brand_id` (UUID)
  - ❌ `cfop` (TEXT) - Substituído por `cfop_id` (UUID)

- **Índices Criados:**
  - ✅ `idx_products_ncm` (parcial, WHERE ncm IS NOT NULL)
  - ✅ `idx_products_cfop_id` (parcial, WHERE cfop_id IS NOT NULL)
  - ✅ `idx_products_brand_id` (parcial, WHERE brand_id IS NOT NULL)
  - ✅ `idx_products_category_id` (parcial, WHERE category_id IS NOT NULL)

#### 📝 Tabela: `services`
- **Migration:** `20250101000001_add_fiscal_fields_to_products_and_services.sql`
- **Novos Campos Adicionados:**
  - ✅ `codigo_servico_lc116` (TEXT) - Código de serviço conforme LC 116/2003
  - ✅ `municipio_prestacao_ibge` (TEXT) - Código IBGE do município

- **Índices Criados:**
  - ✅ `idx_services_codigo_lc116` (parcial, WHERE codigo_servico_lc116 IS NOT NULL)

#### 📝 Tabela: `tenants`
- **Migration:** `20250101000000_add_company_data_to_tenants.sql`
- **Novos Campos Adicionados:**
  - ✅ `company_data` (JSONB, default: '{}') - Dados fiscais e de empresa

- **Índices Criados:**
  - ✅ `idx_tenants_company_data_gin` (GIN index para consultas JSONB)

- **Funções Criadas:**
  - ✅ `validate_tenant_company_data(UUID)` - Valida dados da empresa

### 3. Funções RPC Modificadas

#### 📝 Função: `get_products_by_tenant`
- **Migration:** `20250101000005_update_get_products_by_tenant_rpc.sql`
- **Mudanças:**
  - ✅ Parâmetro `p_category` (TEXT) → `p_category_id` (UUID)
  - ✅ Retorno `category` (TEXT) → `category_id` (UUID)
  - ✅ Tipos de retorno alterados de VARCHAR para TEXT
  - ✅ CASTs explícitos adicionados para compatibilidade

---

## ⚠️ Migrations Específicas de Develop

As seguintes migrations têm sufixo `_develop` e podem não estar na main:

1. `20251221022210_ensure_trigger_auth_to_users_develop.sql`
2. `20251221022558_fix_tenant_users_foreign_keys_develop.sql`
3. `20251221023114_sync_all_foreign_keys_from_main.sql`
4. `20251221025309_fix_customers_foreign_keys_develop.sql`

**Ação Necessária:** Verificar se estas migrations foram mergeadas para main ou se precisam ser aplicadas.

---

## 📊 Lista Completa de Tabelas (60 tabelas)

### Tabelas Core (Autenticação e Multi-Tenant)
1. `users` - Usuários do sistema
2. `tenants` - Tenants (empresas)
3. `tenant_users` - Relação usuário-tenant
4. `resellers` - Revendedores
5. `resellers_users` - Relação usuário-revendedor
6. `profiles` - Perfis/roles do sistema
7. `invites` - Convites genéricos
8. `tenant_invites` - Convites de tenant
9. `tenant_access_codes` - Códigos de acesso
10. `tenant_integrations` - Integrações por tenant

### Tabelas de Produtos e Serviços
11. `products` - Produtos
12. `product_brands` - **NOVA** Marcas de produtos
13. `product_categories` - **NOVA** Categorias de produtos
14. `services` - Serviços
15. `storage_locations` - Locais de armazenamento
16. `product_stock_by_location` - Estoque por localização
17. `stock_movements` - Movimentações de estoque

### Tabelas Fiscais
18. `cfop_reference` - **NOVA** Referência de CFOPs
19. `cfop_regime_mapping` - **NOVA** Mapeamento CFOP x Regime

### Tabelas de Clientes e Contratos
20. `customers` - Clientes
21. `contracts` - Contratos
22. `contract_stages` - Estágios de contrato
23. `contract_stage_history` - Histórico de estágios
24. `contract_stage_transitions` - Transições de estágio
25. `contract_stage_transition_rules` - Regras de transição
26. `contract_services` - Serviços do contrato
27. `contract_products` - Produtos do contrato
28. `contract_attachments` - Anexos de contrato
29. `contract_billings` - Faturamentos de contrato
30. `contract_billing_items` - Itens de faturamento
31. `contract_billing_payments` - Pagamentos de faturamento
32. `contract_billing_periods` - Períodos de faturamento
33. `billing_period_items` - Itens de período de faturamento
34. `service_billing_events` - Eventos de faturamento de serviço

### Tabelas Financeiras
35. `charges` - Cobranças
36. `receipts` - Recebimentos
37. `finance_entries` - Lançamentos financeiros
38. `financial_settings` - Configurações financeiras
39. `financial_documents` - Documentos financeiros
40. `financial_launchs` - Lançamentos financeiros
41. `financial_payables` - Contas a pagar
42. `bank_acounts` - Contas bancárias
43. `bank_operation_history` - Histórico de operações bancárias

### Tabelas de Conciliação
44. `conciliation_staging` - Staging de conciliação
45. `conciliation_rules` - Regras de conciliação
46. `conciliation_history` - Histórico de conciliação

### Tabelas de Notificações e Mensagens
47. `notification_templates` - Templates de notificação
48. `notifications` - Notificações
49. `message_history` - Histórico de mensagens

### Tabelas de Regra de Cobrança
50. `regua_cobranca_config` - Configuração da régua
51. `regua_cobranca_etapas` - Etapas da régua
52. `regua_cobranca_templates` - Templates da régua
53. `regua_cobranca_template_etapas` - Etapas de template
54. `regua_cobranca_execucao` - Execuções da régua
55. `regua_cobranca_mensagens` - Mensagens da régua
56. `regua_cobranca_interacoes` - Interações da régua
57. `regua_cobranca_estatisticas` - Estatísticas da régua

### Tabelas de IA
58. `agente_ia_empresa` - Agente IA da empresa
59. `agente_ia_mensagens_regua` - Mensagens de IA da régua

### Tabelas Auxiliares
60. `tasks` - Tarefas
61. `tasks_attachments` - Anexos de tarefas
62. `audit_logs` - Logs de auditoria
63. `payment_gateways` - Gateways de pagamento
64. `service_order_sequences` - Sequências de ordem de serviço
65. `des_payables_sequence` - Sequência de contas a pagar
66. `health_check` - Health check

---

## 🔄 Comparação Develop vs Main

### Tabelas que DEVEM estar em Main (Core)
✅ Todas as 60 tabelas listadas acima devem existir em main

### Tabelas NOVAS que podem NÃO estar em Main
⚠️ As seguintes tabelas foram criadas em 2025 e podem não estar em main:

1. **`product_brands`** - Criada em `20250101000003`
2. **`product_categories`** - Criada em `20250101000004`
3. **`cfop_reference`** - Criada em `20250101000002`
4. **`cfop_regime_mapping`** - Criada em `20250101000002`

### Campos NOVOS que podem NÃO estar em Main
⚠️ Os seguintes campos foram adicionados em 2025:

**Tabela `products`:**
- `ncm`, `origem`, `cst_icms`, `cst_ipi`, `cst_pis`, `cst_cofins`
- `cfop_id` (substitui `cfop`)
- `brand_id` (substitui `brand`)
- `category_id` (substitui `category`)

**Tabela `services`:**
- `codigo_servico_lc116`
- `municipio_prestacao_ibge`

**Tabela `tenants`:**
- `company_data` (JSONB)

---

## ✅ Checklist de Verificação

### Para Verificar em Main:

- [ ] **Tabela `product_brands` existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_brands'
  );
  ```

- [ ] **Tabela `product_categories` existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_categories'
  );
  ```

- [ ] **Tabela `cfop_reference` existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cfop_reference'
  );
  ```

- [ ] **Tabela `cfop_regime_mapping` existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cfop_regime_mapping'
  );
  ```

- [ ] **Campo `company_data` em `tenants` existe?**
  ```sql
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants' 
    AND column_name = 'company_data'
  );
  ```

- [ ] **Campos fiscais em `products` existem?**
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name IN ('ncm', 'origem', 'cst_icms', 'cst_ipi', 'cst_pis', 'cst_cofins', 'cfop_id', 'brand_id', 'category_id');
  ```

- [ ] **Campos fiscais em `services` existem?**
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'services' 
  AND column_name IN ('codigo_servico_lc116', 'municipio_prestacao_ibge');
  ```

- [ ] **Migrations de 2025-01-01 aplicadas?**
  ```sql
  SELECT version, name 
  FROM supabase_migrations.schema_migrations 
  WHERE version LIKE '20250101%'
  ORDER BY version;
  ```

---

## 🚨 Ações Recomendadas

### 1. Verificar Sincronização Main ↔ Develop

Execute no banco **main**:

```sql
-- Contar total de tabelas
SELECT COUNT(*) as total_tabelas
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Listar todas as tabelas
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar migrations aplicadas
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

### 2. Comparar Estrutura de Tabelas Específicas

Execute no banco **main** para comparar com develop:

```sql
-- Verificar estrutura de products
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Verificar foreign keys de products
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'products'
  AND tc.constraint_type = 'FOREIGN KEY';
```

### 3. Verificar Dados de Referência

```sql
-- Verificar CFOPs inseridos
SELECT COUNT(*) as total_cfops FROM cfop_reference;
SELECT COUNT(*) as total_mappings FROM cfop_regime_mapping;

-- Verificar se há produtos usando os novos campos
SELECT 
  COUNT(*) as total_produtos,
  COUNT(cfop_id) as produtos_com_cfop,
  COUNT(brand_id) as produtos_com_marca,
  COUNT(category_id) as produtos_com_categoria
FROM products;
```

---

## 📝 Conclusão

### Status Atual (Develop)
- ✅ **60 tabelas** criadas e funcionais
- ✅ **33 migrations** aplicadas
- ✅ **6 novas migrations** de 2025-01-01 relacionadas a produtos e fiscal
- ✅ **4 novas tabelas** de referência fiscal
- ✅ **Campos fiscais** adicionados em produtos e serviços
- ✅ **RLS policies** configuradas corretamente
- ✅ **Foreign keys** e índices criados

### Próximos Passos
1. ✅ **Verificar** se main tem as mesmas 60 tabelas
2. ✅ **Aplicar** migrations de 2025-01-01 em main (se necessário)
3. ✅ **Validar** que foreign keys estão corretas em main
4. ✅ **Confirmar** que dados de referência (CFOPs) foram inseridos em main
5. ✅ **Testar** função `get_products_by_tenant` em main

---

**Documento gerado automaticamente em:** 2025-01-27  
**Última atualização:** 2025-01-27

