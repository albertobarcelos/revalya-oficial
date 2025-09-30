-- =====================================================
-- MIGRAÇÃO: CRIAÇÃO DA TABELA CONCILIATION_STAGING
-- Data: 2025-01-09
-- Descrição: Estrutura final para receber dados de webhooks ASAAS
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Tabela central para staging de dados de conciliação
-- Esta tabela recebe dados brutos de webhooks ASAAS antes do processamento
-- Implementa estratégias anti-duplicação e segurança multi-tenant

CREATE TABLE IF NOT EXISTS conciliation_staging (
  -- CHAVES PRIMÁRIAS E IDENTIFICAÇÃO
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- DADOS EXTERNOS (ASAAS)
  id_externo TEXT NOT NULL,                    -- ID único do ASAAS (charge_id)
  asaas_customer_id TEXT,                      -- ID do cliente no ASAAS
  asaas_subscription_id TEXT,                  -- ID da assinatura no ASAAS (se aplicável)
  
  -- DADOS FINANCEIROS
  valor DECIMAL(10,2) NOT NULL,                -- Valor da cobrança
  valor_pago DECIMAL(10,2),                    -- Valor efetivamente pago
  valor_liquido DECIMAL(10,2),                 -- Valor líquido (após taxas)
  taxa_asaas DECIMAL(10,2) DEFAULT 0,          -- Taxa cobrada pelo ASAAS
  
  -- STATUS E CONTROLE
  status TEXT NOT NULL,                        -- Status ASAAS (PENDING, RECEIVED, CONFIRMED, etc.)
  status_anterior TEXT,                        -- Status anterior (para auditoria)
  payment_method TEXT,                         -- Método de pagamento (PIX, BOLETO, CREDIT_CARD, etc.)
  
  -- DATAS IMPORTANTES
  data_vencimento DATE,                        -- Data de vencimento
  data_pagamento TIMESTAMP WITH TIME ZONE,    -- Data do pagamento
  data_confirmacao TIMESTAMP WITH TIME ZONE,  -- Data de confirmação
  data_cancelamento TIMESTAMP WITH TIME ZONE, -- Data de cancelamento (se aplicável)
  
  -- DADOS DO CLIENTE
  customer_name TEXT,                          -- Nome do cliente
  customer_email TEXT,                         -- Email do cliente
  customer_document TEXT,                      -- CPF/CNPJ do cliente
  customer_phone TEXT,                         -- Telefone do cliente
  
  -- DADOS ADICIONAIS
  description TEXT,                            -- Descrição da cobrança
  external_reference TEXT,                     -- Referência externa (nosso número)
  installment_number INTEGER,                  -- Número da parcela (se parcelado)
  installment_count INTEGER,                   -- Total de parcelas
  
  -- DADOS BRUTOS E CONTROLE
  raw_data JSONB NOT NULL,                     -- Dados completos do webhook
  webhook_event TEXT,                          -- Tipo do evento webhook
  webhook_signature TEXT,                      -- Assinatura HMAC do webhook
  
  -- CONTROLE DE PROCESSAMENTO
  processed BOOLEAN DEFAULT FALSE,             -- Flag de processamento
  processed_at TIMESTAMP WITH TIME ZONE,      -- Data do processamento
  processing_attempts INTEGER DEFAULT 0,      -- Tentativas de processamento
  processing_error TEXT,                       -- Erro de processamento (se houver)
  
  -- CONCILIAÇÃO
  reconciled BOOLEAN DEFAULT FALSE,            -- Flag de conciliação
  reconciled_at TIMESTAMP WITH TIME ZONE,     -- Data da conciliação
  reconciled_by UUID REFERENCES auth.users(id), -- Usuário que conciliou
  reconciliation_notes TEXT,                  -- Observações da conciliação
  
  -- VINCULAÇÃO COM SISTEMA INTERNO
  contract_id UUID,                            -- ID do contrato vinculado
  charge_id UUID,                              -- ID da cobrança vinculada
  
  -- AUDITORIA
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- CONSTRAINTS DE SEGURANÇA E INTEGRIDADE
-- =====================================================

-- AIDEV-NOTE: Constraint principal para prevenir duplicação por tenant
ALTER TABLE conciliation_staging 
ADD CONSTRAINT unique_external_id_per_tenant 
UNIQUE (tenant_id, id_externo);

-- AIDEV-NOTE: Constraint para garantir valores positivos
ALTER TABLE conciliation_staging 
ADD CONSTRAINT check_positive_values 
CHECK (valor > 0 AND (valor_pago IS NULL OR valor_pago >= 0));

-- AIDEV-NOTE: Constraint para garantir datas lógicas
ALTER TABLE conciliation_staging 
ADD CONSTRAINT check_logical_dates 
CHECK (
  (data_pagamento IS NULL OR data_vencimento IS NULL OR data_pagamento >= data_vencimento - INTERVAL '30 days') AND
  (data_confirmacao IS NULL OR data_pagamento IS NULL OR data_confirmacao >= data_pagamento)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- AIDEV-NOTE: Índices essenciais para consultas frequentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_tenant_id 
ON conciliation_staging(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_id_externo 
ON conciliation_staging(id_externo);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_processed 
ON conciliation_staging(tenant_id, processed) WHERE NOT processed;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_reconciled 
ON conciliation_staging(tenant_id, reconciled) WHERE NOT reconciled;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_status 
ON conciliation_staging(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_payment_method 
ON conciliation_staging(tenant_id, payment_method);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_dates 
ON conciliation_staging(tenant_id, data_vencimento, data_pagamento);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_customer 
ON conciliation_staging(tenant_id, asaas_customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_created_at 
ON conciliation_staging(tenant_id, created_at DESC);

-- AIDEV-NOTE: Índice para busca por referência externa (nosso número)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_external_ref 
ON conciliation_staging(tenant_id, external_reference) WHERE external_reference IS NOT NULL;

-- AIDEV-NOTE: Índice para dados JSONB (busca em raw_data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conciliation_staging_raw_data_gin 
ON conciliation_staging USING GIN (raw_data);

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- AIDEV-NOTE: Habilitar RLS para segurança multi-tenant
ALTER TABLE conciliation_staging ENABLE ROW LEVEL SECURITY;

-- AIDEV-NOTE: Política para SELECT - usuários só veem dados do próprio tenant
CREATE POLICY "Users can view conciliation_staging from their tenant" ON conciliation_staging
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- AIDEV-NOTE: Política para INSERT - usuários só inserem no próprio tenant
CREATE POLICY "Users can insert conciliation_staging in their tenant" ON conciliation_staging
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- AIDEV-NOTE: Política para UPDATE - usuários só atualizam dados do próprio tenant
CREATE POLICY "Users can update conciliation_staging from their tenant" ON conciliation_staging
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- AIDEV-NOTE: Política para DELETE - usuários só deletam dados do próprio tenant
CREATE POLICY "Users can delete conciliation_staging from their tenant" ON conciliation_staging
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- TRIGGERS PARA AUDITORIA
-- =====================================================

-- AIDEV-NOTE: Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conciliation_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_conciliation_staging_updated_at
  BEFORE UPDATE ON conciliation_staging
  FOR EACH ROW
  EXECUTE FUNCTION update_conciliation_staging_updated_at();

-- AIDEV-NOTE: Trigger para definir created_by no INSERT
CREATE OR REPLACE FUNCTION set_conciliation_staging_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = COALESCE(NEW.created_by, auth.uid());
  NEW.updated_by = COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_conciliation_staging_created_by
  BEFORE INSERT ON conciliation_staging
  FOR EACH ROW
  EXECUTE FUNCTION set_conciliation_staging_created_by();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE conciliation_staging IS 'Tabela de staging para dados de conciliação de webhooks ASAAS';
COMMENT ON COLUMN conciliation_staging.id_externo IS 'ID único da cobrança no ASAAS (charge_id)';
COMMENT ON COLUMN conciliation_staging.raw_data IS 'Dados completos do webhook ASAAS em formato JSON';
COMMENT ON COLUMN conciliation_staging.processed IS 'Flag indicando se o registro foi processado para a tabela charges';
COMMENT ON COLUMN conciliation_staging.reconciled IS 'Flag indicando se o registro foi conciliado manualmente';
COMMENT ON COLUMN conciliation_staging.webhook_signature IS 'Assinatura HMAC SHA-256 do webhook para validação';

-- =====================================================
-- GRANTS DE PERMISSÃO
-- =====================================================

-- AIDEV-NOTE: Permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE ON conciliation_staging TO authenticated;
GRANT USAGE ON SEQUENCE conciliation_staging_id_seq TO authenticated;

-- AIDEV-NOTE: Permissões para service_role (Edge Functions)
GRANT ALL ON conciliation_staging TO service_role;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- AIDEV-NOTE: Log de criação da tabela
DO $$
BEGIN
  RAISE NOTICE 'Tabela conciliation_staging criada com sucesso!';
  RAISE NOTICE 'Constraints: unique_external_id_per_tenant, check_positive_values, check_logical_dates';
  RAISE NOTICE 'Índices: 10 índices criados para otimização';
  RAISE NOTICE 'RLS: Habilitado com 4 políticas de segurança';
  RAISE NOTICE 'Triggers: 2 triggers para auditoria automática';
END $$;