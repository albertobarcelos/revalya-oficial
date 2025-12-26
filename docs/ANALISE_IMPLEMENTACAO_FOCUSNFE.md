# 📋 ANÁLISE COMPLETA - IMPLEMENTAÇÃO FOCUSNFE NO REVALYA

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Autor:** AI Agent (Barcelitos)  
**Projeto:** Revalya Oficial  
**Status:** 📊 Análise e Planejamento

---

## 🎯 OBJETIVO

Implementar emissão de **Notas Fiscais (NFs)** e **Notas Fiscais Eletrônicas (NFe)** no sistema Revalya utilizando a API da **FocusNFe**, seguindo os padrões de segurança multi-tenant e arquitetura já estabelecidos no projeto.

---

## 📚 ANÁLISE DA DOCUMENTAÇÃO FOCUSNFE

### 1. **Visão Geral da API FocusNFe**

A FocusNFe oferece uma API REST completa para emissão de documentos fiscais:

- **NFe (Nota Fiscal Eletrônica)**: Para produtos e serviços
- **NFCe (Nota Fiscal de Consumidor Eletrônica)**: Para vendas no varejo
- **NFSe (Nota Fiscal de Serviços Eletrônica)**: Para prestação de serviços
- **CTe/CTeOS**: Conhecimento de Transporte
- **MDFe**: Manifesto de Documentos Fiscais

**URLs da API:**
- **Produção**: `https://api.focusnfe.com.br/v2`
- **Homologação**: `https://homologacao.focusnfe.com.br/v2`

### 2. **Autenticação**

A API utiliza autenticação via **Token de Acesso**:

```http
Authorization: Token token="SEU_TOKEN_AQUI"
```

**Limites:**
- 100 créditos/minuto por token
- Cada requisição consome 1 crédito
- Headers de resposta: `Rate-Limit-Limit`, `Rate-Limit-Remaining`, `Rate-Limit-Reset`

### 3. **Status da API**

A API retorna status de processamento:

- `processando`: Em processamento
- `autorizado`: Autorizado pela SEFAZ
- `cancelado`: Cancelado
- `erro_autorizacao`: Erro na autorização
- `denegado`: Denegado pela SEFAZ

### 4. **Campos Obrigatórios para NFe**

#### **4.1. Dados do Emitente (Empresa)**
- CNPJ
- Razão Social
- Nome Fantasia
- Inscrição Estadual
- Endereço completo (logradouro, número, bairro, cidade, UF, CEP)
- Telefone
- Email

#### **4.2. Dados do Destinatário (Cliente)**
- CPF/CNPJ
- Nome/Razão Social
- Endereço completo
- Email (opcional mas recomendado)
- Telefone (opcional)

#### **4.3. Dados dos Produtos/Serviços**
- Código do produto/serviço
- Descrição
- NCM (Nomenclatura Comum do Mercosul) - para produtos
- CFOP (Código Fiscal de Operações e Prestações)
- Unidade de medida
- Quantidade
- Valor unitário
- Valor total
- Código de tributação (ICMS, IPI, PIS, COFINS)

#### **4.4. Dados da Nota**
- Data de emissão
- Data de saída/entrada
- Natureza da operação
- Forma de pagamento
- Informações adicionais (opcional)

### 5. **Campos Obrigatórios para NFSe**

#### **5.1. Dados do Prestador (Empresa)**
- CNPJ
- Inscrição Municipal
- Endereço completo
- Email

#### **5.2. Dados do Tomador (Cliente)**
- CPF/CNPJ
- Nome/Razão Social
- Endereço completo
- Email

#### **5.3. Dados dos Serviços**
- Código de serviço (LC 116/2003)
- Descrição detalhada
- Quantidade
- Valor unitário
- Valor total
- Alíquota de ISS
- Base de cálculo do ISS

#### **5.4. Dados da Nota**
- Data de emissão
- Data de prestação do serviço
- Discriminação dos serviços
- Valores (serviços, deduções, ISS, valor líquido)

---

## 🔍 MAPEAMENTO DE CAMPOS - REVALYA → FOCUSNFE

### 1. **Dados do Emitente (Empresa/Tenant)**

**Fonte no Revalya:**
- Tabela: `tenants` + `tenant_integrations`
- Campos necessários:
  - `tenants.name` → Razão Social
  - `tenants.slug` → Nome Fantasia (pode ser usado)
  - **FALTANDO**: CNPJ, Inscrição Estadual, Endereço completo da empresa

**Ação Necessária:**
- ✅ Adicionar coluna `company_data` (JSONB) em `tenants`
- ✅ Estrutura JSONB proposta:
  ```json
  {
    "cnpj": "12.345.678/0001-90",
    "razao_social": "Empresa Exemplo LTDA",
    "nome_fantasia": "Empresa Exemplo",
    "inscricao_estadual": "123.456.789.012",
    "inscricao_municipal": "123456",
    "endereco": {
      "logradouro": "Rua Exemplo",
      "numero": "123",
      "complemento": "Sala 45",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP",
      "cep": "01234-567"
    },
    "contato": {
      "telefone": "(11) 1234-5678",
      "email": "contato@empresa.com.br"
    },
    "fiscal": {
      "regime_tributario": "simples_nacional",
      "cnae_principal": "62.01-5-00"
    }
  }
  ```

### 2. **Dados do Destinatário/Tomador (Cliente)**

**Fonte no Revalya:**
- Tabela: `customers`
- Campos disponíveis:
  - ✅ `name` → Nome/Razão Social
  - ✅ `cpf_cnpj` → CPF/CNPJ
  - ✅ `email` → Email
  - ✅ `phone` → Telefone
  - ✅ `address` → Logradouro
  - ✅ `address_number` → Número
  - ✅ `complement` → Complemento
  - ✅ `neighborhood` → Bairro
  - ✅ `city` → Cidade
  - ✅ `state` → UF
  - ✅ `postal_code` → CEP
  - ✅ `country` → País

**Status:** ✅ **COMPLETO** - Todos os campos necessários já existem

### 3. **Dados dos Produtos e Serviços**

**AIDEV-NOTE:** ⚠️ **IMPORTANTE - DISTINÇÃO CRÍTICA:**
- **SERVICES (Serviços)** → Emitem **NFSe** (Nota Fiscal de Serviços)
- **PRODUCTS (Produtos)** → Emitem **NFe** (Nota Fiscal Eletrônica)

#### **3.1. SERVICES (Serviços) - Para NFSe**

**Fonte no Revalya:**
- Tabela: `services` (cadastro prévio de configurações de serviços)
- Tabela: `contract_services` (serviços vinculados ao contrato)
- Tabela: `contract_billing_items` (itens do faturamento)

**Campos disponíveis:**
- ✅ `services.name` → Descrição do serviço
- ✅ `services.code` → Código do serviço (pode ser usado como LC 116)
- ✅ `contract_services.quantity` → Quantidade
- ✅ `contract_services.unit_price` → Valor unitário
- ✅ `contract_services.total_amount` → Valor total
- ✅ `contract_services.tax_rate` → Alíquota de imposto (ISS)
- ✅ `services.tax_code` → Código de tributação

**Campos FALTANDO para NFSe:**
- ❌ `codigo_servico_lc116` (Código LC 116/2003) - obrigatório para NFSe
- ❌ `municipio_prestacao_ibge` (Código IBGE do município de prestação) - obrigatório

**Ação Necessária:**
- ✅ Adicionar campos em `services`:
  - `codigo_servico_lc116` (TEXT) - Código de serviço conforme LC 116/2003
  - `municipio_prestacao_ibge` (TEXT) - Código IBGE do município onde o serviço é prestado

#### **3.2. PRODUCTS (Produtos) - Para NFe**

**Fonte no Revalya:**
- Tabela: `products` (cadastro de produtos)
- Tabela: `contract_billing_items` (itens do faturamento que podem ser produtos)

**Campos disponíveis:**
- ✅ `products.name` → Descrição do produto
- ✅ `products.code` → Código do produto
- ✅ `products.sku` → SKU do produto
- ✅ `products.unit_price` → Valor unitário
- ✅ `products.unit_of_measure` → Unidade de medida (já existe!)
- ✅ `products.tax_rate` → Alíquota de imposto

**Campos FALTANDO para NFe:**
- ❌ `ncm` (NCM - Nomenclatura Comum do Mercosul) - **OBRIGATÓRIO** para NFe
- ❌ `cfop` (CFOP - Código Fiscal de Operações e Prestações) - **OBRIGATÓRIO** para NFe
- ❌ `origem` (Origem da mercadoria) - para cálculo de ICMS
- ❌ `cst_icms` (CST ICMS) - Código de Situação Tributária do ICMS
- ❌ `cst_ipi` (CST IPI) - Código de Situação Tributária do IPI (se aplicável)
- ❌ `cst_pis` (CST PIS) - Código de Situação Tributária do PIS
- ❌ `cst_cofins` (CST COFINS) - Código de Situação Tributária do COFINS

**Ação Necessária:**
- ✅ Adicionar campos em `products`:
  - `ncm` (TEXT) - NCM do produto (obrigatório)
  - `cfop_id` (UUID, FK) - **CFOP via tabela de referência** (obrigatório)
    - ⚠️ **IMPORTANTE**: CFOP não pode ser campo livre!
    - Deve ser selecionado de `cfop_reference` baseado no regime tributário
    - Validação automática por regime (Simples Nacional, Lucro Presumido, Lucro Real)
  - `origem` (TEXT) - Origem da mercadoria (0-8)
  - `cst_icms` (TEXT) - CST ICMS
  - `cst_ipi` (TEXT) - CST IPI (opcional)
  - `cst_pis` (TEXT) - CST PIS
  - `cst_cofins` (TEXT) - CST COFINS

### 4. **Dados do Faturamento (Contract Billings)**

**Fonte no Revalya:**
- Tabela: `contract_billings`
- Campos disponíveis:
  - ✅ `billing_number` → Número da nota (pode ser usado como referência)
  - ✅ `issue_date` → Data de emissão
  - ✅ `due_date` → Data de vencimento
  - ✅ `amount` → Valor total
  - ✅ `tax_amount` → Valor de impostos
  - ✅ `net_amount` → Valor líquido
  - ✅ `reference_period` → Período de referência
  - ✅ `items` → Itens do faturamento (via `contract_billing_items`)

**Status:** ✅ **QUASE COMPLETO** - Falta apenas mapear para formato FocusNFe

---

## 🏗️ ARQUITETURA PROPOSTA

### 1. **Estrutura de Arquivos**

```
src/
├── services/
│   ├── focusnfe.ts                    # Serviço principal FocusNFe
│   └── focusnfeService.ts              # Serviço auxiliar (se necessário)
├── types/
│   └── focusnfe.ts                     # Tipos TypeScript FocusNFe
├── components/
│   └── invoices/
│       ├── FocusNFeConfig.tsx          # Configuração da integração
│       ├── InvoiceEmissionModal.tsx     # Modal para emitir nota
│       └── InvoiceStatusBadge.tsx       # Badge de status da nota
├── hooks/
│   ├── useFocusNFe.ts                  # Hook para operações FocusNFe
│   └── useInvoiceEmission.ts            # Hook para emissão de notas
└── supabase/
    └── functions/
        └── focusnfe-proxy/
            └── index.ts                 # Edge Function proxy (similar ao asaas-proxy)
```

### 2. **Tabelas do Banco de Dados**

#### **2.1. Atualização: `tenants` (ADICIONAR COLUNA JSONB)**

**Decisão Arquitetural:** ✅ Usar coluna JSONB em `tenants` ao invés de tabela separada

**Vantagens:**
- ✅ Evita JOIN desnecessário
- ✅ Dados da empresa são inerentemente parte do tenant
- ✅ JSONB permite flexibilidade para evoluções futuras
- ✅ Consulta mais simples e performática
- ✅ Mantém tudo relacionado ao tenant em um lugar

```sql
-- AIDEV-NOTE: Adicionar coluna company_data JSONB na tabela tenants
-- Esta coluna armazena todos os dados fiscais e de empresa necessários para emissão de notas fiscais
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS company_data JSONB DEFAULT '{}';

-- Criar índice GIN para consultas eficientes no JSONB
CREATE INDEX IF NOT EXISTS idx_tenants_company_data_gin 
ON tenants USING GIN (company_data);

-- Comentário na coluna para documentação
COMMENT ON COLUMN tenants.company_data IS 
'Dados fiscais e de empresa para emissão de notas fiscais. Estrutura: {
  "cnpj": "string",
  "razao_social": "string",
  "nome_fantasia": "string",
  "inscricao_estadual": "string",
  "inscricao_municipal": "string",
  "endereco": {
    "logradouro": "string",
    "numero": "string",
    "complemento": "string",
    "bairro": "string",
    "cidade": "string",
    "uf": "string",
    "cep": "string"
  },
  "contato": {
    "telefone": "string",
    "email": "string"
  },
  "fiscal": {
    "regime_tributario": "simples_nacional|lucro_presumido|lucro_real",
    "cnae_principal": "string"
  }
}';
```

**Estrutura JSONB Proposta:**

```json
{
  "cnpj": "12.345.678/0001-90",
  "razao_social": "Empresa Exemplo LTDA",
  "nome_fantasia": "Empresa Exemplo",
  "inscricao_estadual": "123.456.789.012",
  "inscricao_municipal": "123456",
  "endereco": {
    "logradouro": "Rua Exemplo",
    "numero": "123",
    "complemento": "Sala 45",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01234-567"
  },
  "contato": {
    "telefone": "(11) 1234-5678",
    "email": "contato@empresa.com.br"
  },
  "fiscal": {
    "regime_tributario": "simples_nacional",
    "cnae_principal": "62.01-5-00"
  }
}
```

**Exemplo de Consulta:**

```sql
-- Buscar CNPJ do tenant
SELECT company_data->>'cnpj' as cnpj 
FROM tenants 
WHERE id = 'tenant-uuid';

-- Buscar endereço completo
SELECT company_data->'endereco' as endereco 
FROM tenants 
WHERE id = 'tenant-uuid';

-- Validar se dados estão completos
SELECT 
  id,
  name,
  (company_data->>'cnpj') IS NOT NULL as tem_cnpj,
  (company_data->>'razao_social') IS NOT NULL as tem_razao_social,
  (company_data->'endereco'->>'logradouro') IS NOT NULL as tem_endereco
FROM tenants
WHERE id = 'tenant-uuid';
```

#### **2.2. Tabela: `invoices` (NOVA)**

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  billing_id UUID REFERENCES contract_billings(id),
  contract_id UUID REFERENCES contracts(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  
  -- Dados da Nota Fiscal
  invoice_type TEXT NOT NULL, -- 'nfe', 'nfce', 'nfse'
  invoice_number TEXT, -- Número da nota fiscal
  invoice_key TEXT, -- Chave de acesso da NFe
  verification_code TEXT, -- Código de verificação
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', 
  -- 'draft', 'processing', 'authorized', 'cancelled', 'denied', 'error'
  
  -- Dados FocusNFe
  focusnfe_id TEXT, -- ID da nota na FocusNFe
  focusnfe_ref TEXT, -- Referência na FocusNFe
  
  -- URLs
  pdf_url TEXT,
  xml_url TEXT,
  danfe_url TEXT, -- URL do DANFe (para NFe)
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Datas
  issue_date TIMESTAMPTZ NOT NULL,
  authorization_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_focusnfe_ref UNIQUE (tenant_id, focusnfe_ref)
);

-- Índices
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_billing_id ON invoices(billing_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_focusnfe_id ON invoices(focusnfe_id);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant invoices"
  ON invoices FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );
```

#### **2.3. Atualização: `services` (ADICIONAR CAMPOS PARA NFSe)**

**AIDEV-NOTE:** Services são para **NFSe** (Nota Fiscal de Serviços)

```sql
-- AIDEV-NOTE: Campos para emissão de NFSe (Nota Fiscal de Serviços)
-- Services são cadastros prévios de configurações de serviços

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS codigo_servico_lc116 TEXT;

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS municipio_prestacao_ibge TEXT;

-- Comentários para documentação
COMMENT ON COLUMN services.codigo_servico_lc116 IS 
'Código de serviço conforme LC 116/2003. Obrigatório para emissão de NFSe.';

COMMENT ON COLUMN services.municipio_prestacao_ibge IS 
'Código IBGE do município onde o serviço é prestado. Obrigatório para emissão de NFSe.';
```

#### **2.4. Atualização: `products` (ADICIONAR CAMPOS PARA NFe)**

**AIDEV-NOTE:** Products são para **NFe** (Nota Fiscal Eletrônica)

```sql
-- AIDEV-NOTE: Campos para emissão de NFe (Nota Fiscal Eletrônica)
-- Products são cadastros de produtos físicos

-- Campos obrigatórios para NFe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ncm TEXT;

-- AIDEV-NOTE: CFOP será adicionado via foreign key na migration de referência
-- Ver migration 20250101000002_create_cfop_reference_tables.sql
-- CFOP não pode ser campo livre - deve ser tabela de referência com validação por regime

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';

-- Campos de tributação ICMS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_icms TEXT;

-- Campos de tributação IPI (opcional, apenas para produtos sujeitos a IPI)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_ipi TEXT;

-- Campos de tributação PIS/COFINS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_pis TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cst_cofins TEXT;

-- Comentários para documentação
COMMENT ON COLUMN products.ncm IS 
'NCM (Nomenclatura Comum do Mercosul). Obrigatório para emissão de NFe.';

-- AIDEV-NOTE: Comentário sobre CFOP movido para migration de referência

COMMENT ON COLUMN products.origem IS 
'Origem da mercadoria (0-8). Padrão: 0 (Nacional).';

COMMENT ON COLUMN products.cst_icms IS 
'CST ICMS (Código de Situação Tributária do ICMS).';

COMMENT ON COLUMN products.cst_ipi IS 
'CST IPI (Código de Situação Tributária do IPI). Apenas para produtos sujeitos a IPI.';

COMMENT ON COLUMN products.cst_pis IS 
'CST PIS (Código de Situação Tributária do PIS).';

COMMENT ON COLUMN products.cst_cofins IS 
'CST COFINS (Código de Situação Tributária do COFINS).';
```

#### **2.5. Tabelas de Referência: `cfop_reference` e `cfop_regime_mapping` (NOVAS)**

**AIDEV-NOTE:** ⚠️ **CRÍTICO**: CFOP não pode ser campo livre! Deve ser tabela de referência com validação por regime tributário.

**Estrutura:**
- `cfop_reference`: Lista completa de CFOPs válidos (código, descrição, categoria)
- `cfop_regime_mapping`: Define quais CFOPs são válidos para cada regime tributário
- `products.cfop_id`: Foreign key para `cfop_reference` (não campo TEXT livre!)
- Funções auxiliares:
  - `get_valid_cfops_by_regime()`: Busca CFOPs válidos por regime
  - `validate_cfop_for_regime()`: Valida se CFOP é válido para regime

**Vantagens:**
- ✅ Validação automática por regime tributário (Simples Nacional, Lucro Presumido, Lucro Real)
- ✅ Integridade referencial garantida
- ✅ Facilita manutenção (atualização centralizada)
- ✅ Previne erros de digitação
- ✅ Permite filtragem inteligente no frontend
- ✅ CFOPs padrão marcados por regime (`is_default`)

**Ver migration completa:** `supabase/migrations/20250101000002_create_cfop_reference_tables.sql`

#### **2.6. Atualização: `tenant_integrations` (JÁ EXISTE)**

A tabela `tenant_integrations` já existe e será usada para armazenar as credenciais da FocusNFe:

```sql
-- Exemplo de inserção
INSERT INTO tenant_integrations (
  tenant_id,
  integration_type,
  is_active,
  environment,
  config,
  webhook_token
) VALUES (
  'tenant-uuid',
  'focusnfe',
  true,
  'production', -- ou 'homologacao'
  '{
    "token": "seu_token_aqui",
    "api_url": "https://api.focusnfe.com.br/v2"
  }'::jsonb,
  'webhook_token_secreto'
);
```

---

## 🔄 FLUXO DE IMPLEMENTAÇÃO - PASSO A PASSO

### **FASE 1: PREPARAÇÃO E CONFIGURAÇÃO** ⏱️ 2-3 dias

#### **Passo 1.1: Criar Migrations do Banco de Dados**

1. ✅ Criar migration para `tenant_company_data`
2. ✅ Criar migration para `invoices`
3. ✅ Criar migration para adicionar campos em `services`
4. ✅ Criar RLS policies para segurança multi-tenant
5. ✅ Criar índices para performance

**Arquivo:** `supabase/migrations/YYYYMMDD_create_focusnfe_tables.sql`

#### **Passo 1.2: Criar Tipos TypeScript**

1. ✅ Criar `src/types/focusnfe.ts` com:
   - Interfaces para requisições NFe
   - Interfaces para requisições NFSe
   - Interfaces para respostas da API
   - Tipos de status
   - Mapeamentos de dados

**Arquivo:** `src/types/focusnfe.ts`

#### **Passo 1.3: Configurar Credenciais FocusNFe**

1. ✅ Criar componente de configuração em `src/components/integracoes/FocusNFeConfig.tsx`
2. ✅ Integrar com `tenant_integrations`
3. ✅ Adicionar validação de token
4. ✅ Suportar ambiente de homologação e produção

---

### **FASE 2: SERVIÇOS E EDGE FUNCTIONS** ⏱️ 3-4 dias

#### **Passo 2.1: Criar Edge Function `focusnfe-proxy`**

1. ✅ Criar `supabase/functions/focusnfe-proxy/index.ts`
2. ✅ Implementar autenticação multi-tenant
3. ✅ Implementar proxy para API FocusNFe
4. ✅ Implementar rate limiting
5. ✅ Implementar tratamento de erros
6. ✅ Implementar logs de auditoria

**Padrão:** Seguir a estrutura de `asaas-proxy` como referência

#### **Passo 2.2: Criar Serviço FocusNFe**

1. ✅ Criar `src/services/focusnfe.ts`
2. ✅ Implementar métodos:
   - `createNFe()` - Criar NFe
   - `createNFSe()` - Criar NFSe
   - `getInvoiceStatus()` - Consultar status
   - `cancelInvoice()` - Cancelar nota
   - `downloadPDF()` - Baixar PDF
   - `downloadXML()` - Baixar XML
3. ✅ Implementar mapeamento de dados Revalya → FocusNFe
4. ✅ Implementar tratamento de erros
5. ✅ Implementar retry logic

**Arquivo:** `src/services/focusnfe.ts`

#### **Passo 2.3: Criar Serviço de Emissão de Notas**

1. ✅ Criar `src/services/invoiceEmissionService.ts`
2. ✅ Implementar lógica de negócio:
   - Validar dados antes de emitir
   - Preparar payload FocusNFe
   - Chamar serviço FocusNFe
   - Salvar resultado no banco
   - Atualizar status do faturamento
3. ✅ Implementar validações:
   - Dados do emitente completos
   - Dados do cliente completos
   - Itens com códigos fiscais válidos
   - Valores calculados corretamente

**Arquivo:** `src/services/invoiceEmissionService.ts`

---

### **FASE 3: HOOKS E COMPONENTES UI** ⏱️ 3-4 dias

#### **Passo 3.1: Criar Hooks**

1. ✅ Criar `src/hooks/useFocusNFe.ts`
   - `useFocusNFeConfig()` - Configuração
   - `useFocusNFeInvoice()` - Operações com notas
   - `useFocusNFeStatus()` - Status de notas

2. ✅ Criar `src/hooks/useInvoiceEmission.ts`
   - `useEmitInvoice()` - Emitir nota
   - `useCancelInvoice()` - Cancelar nota
   - `useInvoiceStatus()` - Status da nota

**Arquivos:**
- `src/hooks/useFocusNFe.ts`
- `src/hooks/useInvoiceEmission.ts`

#### **Passo 3.2: Criar Componentes de Configuração**

1. ✅ Criar `src/components/integracoes/FocusNFeConfig.tsx`
   - Formulário de configuração
   - Campos para token, ambiente
   - Validação de credenciais
   - Teste de conexão

2. ✅ Integrar em `src/components/integracoes/IntegrationServices.tsx`

#### **Passo 3.3: Criar Componentes de Emissão**

1. ✅ Criar `src/components/invoices/InvoiceEmissionModal.tsx`
   - Modal para emitir nota
   - Seleção de tipo (NFe/NFSe)
   - Preview dos dados
   - Confirmação e emissão

2. ✅ Criar `src/components/invoices/InvoiceStatusBadge.tsx`
   - Badge com status da nota
   - Cores por status
   - Ações (baixar PDF/XML, cancelar)

3. ✅ Criar `src/components/invoices/InvoiceList.tsx`
   - Lista de notas emitidas
   - Filtros e busca
   - Ações em lote

---

### **FASE 4: INTEGRAÇÃO COM FATURAMENTO** ⏱️ 2-3 dias

#### **Passo 4.1: Integrar com Contract Billings**

1. ✅ Adicionar botão "Emitir Nota Fiscal" em `BillingOrderDetails.tsx`
2. ✅ Criar fluxo: Faturamento → Emissão de Nota
3. ✅ Atualizar status do faturamento após emissão
4. ✅ Vincular nota ao faturamento

#### **Passo 4.2: Adicionar Validações**

1. ✅ Validar dados do cliente antes de permitir emissão
2. ✅ Validar dados da empresa (tenants.company_data)
3. ✅ Validar itens com códigos fiscais
4. ✅ Mostrar erros de validação de forma clara

#### **Passo 4.3: Adicionar Indicadores Visuais**

1. ✅ Badge de status da nota no faturamento
2. ✅ Link para PDF/XML da nota
3. ✅ Indicador de nota emitida/cancelada

---

### **FASE 5: WEBHOOKS E NOTIFICAÇÕES** ⏱️ 2-3 dias

#### **Passo 5.1: Criar Edge Function para Webhook**

1. ✅ Criar `supabase/functions/focusnfe-webhook/index.ts`
2. ✅ Implementar validação de webhook
3. ✅ Processar eventos:
   - Nota autorizada
   - Nota cancelada
   - Erro na autorização
4. ✅ Atualizar status no banco

#### **Passo 5.2: Configurar Webhook na FocusNFe**

1. ✅ Documentar como configurar webhook
2. ✅ Criar interface para configurar URL do webhook
3. ✅ Testar recebimento de eventos

---

### **FASE 6: TESTES E VALIDAÇÃO** ⏱️ 2-3 dias

#### **Passo 6.1: Testes em Homologação**

1. ✅ Configurar ambiente de homologação
2. ✅ Testar emissão de NFe
3. ✅ Testar emissão de NFSe
4. ✅ Testar cancelamento
5. ✅ Testar webhooks
6. ✅ Validar todos os fluxos

#### **Passo 6.2: Testes de Integração**

1. ✅ Testar integração completa: Faturamento → Nota Fiscal
2. ✅ Testar com diferentes tipos de clientes (CPF/CNPJ)
3. ✅ Testar com diferentes tipos de serviços
4. ✅ Testar tratamento de erros
5. ✅ Testar performance

#### **Passo 6.3: Documentação**

1. ✅ Documentar configuração
2. ✅ Documentar fluxo de emissão
3. ✅ Documentar troubleshooting
4. ✅ Criar guia de uso

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Preparação**
- [ ] Criar migrations do banco de dados
- [ ] Criar tipos TypeScript
- [ ] Configurar credenciais FocusNFe (homologação)

### **Backend**
- [ ] Criar Edge Function `focusnfe-proxy`
- [ ] Criar serviço `focusnfe.ts`
- [ ] Criar serviço `invoiceEmissionService.ts`
- [ ] Implementar mapeamento de dados
- [ ] Implementar tratamento de erros

### **Frontend**
- [ ] Criar componente de configuração
- [ ] Criar hooks de FocusNFe
- [ ] Criar modal de emissão
- [ ] Criar lista de notas
- [ ] Integrar com faturamento

### **Webhooks**
- [ ] Criar Edge Function para webhook
- [ ] Configurar webhook na FocusNFe
- [ ] Testar recebimento de eventos

### **Testes**
- [ ] Testes em homologação
- [ ] Testes de integração
- [ ] Validação de segurança multi-tenant
- [ ] Testes de performance

### **Documentação**
- [ ] Documentar configuração
- [ ] Documentar fluxo de emissão
- [ ] Criar guia de troubleshooting

---

## 🔐 CONSIDERAÇÕES DE SEGURANÇA

### **1. Multi-Tenant**

- ✅ Todas as queries devem incluir `tenant_id`
- ✅ Edge Functions devem validar `tenant_id`
- ✅ RLS policies devem estar ativas
- ✅ Credenciais devem ser isoladas por tenant

### **2. Credenciais**

- ✅ Tokens devem ser armazenados criptografados
- ✅ Usar função RPC para descriptografar (se necessário)
- ✅ Nunca expor tokens no frontend
- ✅ Validar permissões antes de operações

### **3. Validação de Dados**

- ✅ Validar CPF/CNPJ antes de enviar
- ✅ Validar endereços completos
- ✅ Validar códigos fiscais (NCM, CFOP, LC 116)
- ✅ Validar valores e cálculos

### **4. Auditoria**

- ✅ Logar todas as operações
- ✅ Logar erros com detalhes
- ✅ Manter histórico de alterações
- ✅ Rastrear quem emitiu/cancelou notas

---

## 📊 MAPEAMENTO DE DADOS DETALHADO

### **NFe - Estrutura Completa**

```typescript
interface NFePayload {
  // Emitente (de tenants.company_data)
  cnpj_emitente: string;
  nome_emitente: string;
  nome_fantasia_emitente: string;
  inscricao_estadual_emitente: string;
  endereco_emitente: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  
  // Destinatário (da customers)
  cpf_cnpj_destinatario: string;
  nome_destinatario: string;
  endereco_destinatario: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  email_destinatario?: string;
  
  // Itens (da contract_billing_items + products)
  // AIDEV-NOTE: NFe é para PRODUTOS, não serviços
  items: Array<{
    codigo_produto: string;
    descricao: string;
    ncm: string; // Da tabela products
    cfop: string; // Da tabela products
    unidade: string; // products.unit_of_measure
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    icms: {
      origem: string;
      cst: string;
      aliquota: number;
    };
    ipi?: {
      cst: string;
      aliquota: number;
    };
    pis?: {
      cst: string;
      aliquota: number;
    };
    cofins?: {
      cst: string;
      aliquota: number;
    };
  }>;
  
  // Dados da Nota
  data_emissao: string;
  data_saida_entrada: string;
  natureza_operacao: string;
  forma_pagamento: string;
  informacoes_adicionais?: string;
}
```

### **NFSe - Estrutura Completa**

```typescript
interface NFSePayload {
  // Prestador (de tenants.company_data)
  cnpj_prestador: string;
  inscricao_municipal_prestador: string;
  endereco_prestador: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  
  // Tomador (da customers)
  cpf_cnpj_tomador: string;
  razao_social_tomador: string;
  endereco_tomador: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  email_tomador?: string;
  
  // Serviços (da contract_billing_items + services)
  // AIDEV-NOTE: NFSe é para SERVIÇOS, não produtos
  servicos: Array<{
    codigo_servico: string; // LC 116/2003 - Da tabela services.codigo_servico_lc116
    descricao: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    aliquota_iss: number;
    base_calculo_iss: number;
    valor_iss: number;
    municipio_prestacao: string; // Código IBGE - Da tabela services.municipio_prestacao_ibge
  }>;
  
  // Dados da Nota
  data_emissao: string;
  data_prestacao: string;
  discriminacao_servicos: string;
  valor_servicos: number;
  valor_deducoes: number;
  valor_iss: number;
  valor_liquido: number;
}
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Revisar e Aprovar este Plano**
   - Validar estrutura proposta
   - Ajustar conforme necessário
   - Definir prioridades

2. **Criar Conta FocusNFe (Homologação)**
   - Criar conta de teste
   - Obter token de homologação
   - Testar API manualmente

3. **Iniciar FASE 1**
   - Criar migrations
   - Criar tipos TypeScript
   - Configurar ambiente

---

## 📚 REFERÊNCIAS

- **Documentação FocusNFe**: https://doc.focusnfe.com.br/reference/introducao
- **Documentação Completa**: https://focusnfe.com.br/doc/#introducao
- **Padrão ASAAS no Revalya**: `src/services/asaas.ts`
- **Padrão de Integrações**: `src/components/integracoes/IntegrationServices.tsx`

---

## ✅ CONCLUSÃO

Este documento apresenta uma análise completa da implementação da FocusNFe no Revalya, incluindo:

- ✅ Análise detalhada da documentação FocusNFe
- ✅ Mapeamento completo de campos Revalya → FocusNFe
- ✅ Arquitetura proposta seguindo padrões do projeto
- ✅ Fluxo de implementação passo a passo
- ✅ Considerações de segurança multi-tenant
- ✅ Estruturas de dados detalhadas

**Próximo passo:** Revisar este documento e iniciar a FASE 1 da implementação.

---

**Fim do Documento**

