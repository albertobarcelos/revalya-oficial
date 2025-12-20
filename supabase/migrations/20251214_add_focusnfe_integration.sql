-- =====================================================
-- MIGRAÇÃO: Integração FocusNFe
-- Data: 2025-12-14
-- Descrição: Adiciona estrutura necessária para integração com FocusNFe
-- =====================================================

-- =====================================================
-- 1. TABELA PAYMENT_GATEWAYS
-- Armazena configurações de gateways de pagamento e emissão fiscal
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    provider varchar(50) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    api_key text,
    api_secret text,
    environment varchar(20) NOT NULL DEFAULT 'homologacao',
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    webhook_url text,
    webhook_token text,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT payment_gateways_pkey PRIMARY KEY (id),
    CONSTRAINT payment_gateways_tenant_provider_unique UNIQUE (tenant_id, provider),
    CONSTRAINT payment_gateways_provider_check CHECK (
        provider IN ('asaas', 'focusnfe', 'nfse_io', 'omie', 'stripe', 'pagarme', 'cielo')
    ),
    CONSTRAINT payment_gateways_environment_check CHECK (
        environment IN ('homologacao', 'producao', 'sandbox', 'production')
    )
);

-- AIDEV-NOTE: Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant_id 
    ON public.payment_gateways(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider 
    ON public.payment_gateways(provider);

CREATE INDEX IF NOT EXISTS idx_payment_gateways_tenant_provider_active 
    ON public.payment_gateways(tenant_id, provider) 
    WHERE is_active = true;

-- AIDEV-NOTE: Comentários para documentação
COMMENT ON TABLE public.payment_gateways IS 'Configurações de gateways de pagamento e emissão fiscal por tenant';
COMMENT ON COLUMN public.payment_gateways.provider IS 'Nome do provider (asaas, focusnfe, nfse_io, omie, etc)';
COMMENT ON COLUMN public.payment_gateways.settings IS 'Configurações específicas do provider (emitente, defaults fiscais, etc)';
COMMENT ON COLUMN public.payment_gateways.environment IS 'Ambiente da API (homologacao ou producao)';

-- =====================================================
-- 2. COLUNAS ADICIONAIS NA FINANCE_ENTRIES
-- Para armazenar dados de notas fiscais emitidas
-- =====================================================

-- AIDEV-NOTE: Adicionar coluna invoice_status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'finance_entries' 
        AND column_name = 'invoice_status'
    ) THEN
        ALTER TABLE public.finance_entries 
        ADD COLUMN invoice_status varchar(20);
        
        COMMENT ON COLUMN public.finance_entries.invoice_status IS 
            'Status da nota fiscal: pending, processing, issued, cancelled, error, denied';
    END IF;
END $$;

-- AIDEV-NOTE: Adicionar coluna invoice_data se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'finance_entries' 
        AND column_name = 'invoice_data'
    ) THEN
        ALTER TABLE public.finance_entries 
        ADD COLUMN invoice_data jsonb DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN public.finance_entries.invoice_data IS 
            'Dados da nota fiscal emitida (referencia, chave, numero, xml_url, pdf_url, etc)';
    END IF;
END $$;

-- AIDEV-NOTE: Índice para busca por referência da nota fiscal
CREATE INDEX IF NOT EXISTS idx_finance_entries_invoice_referencia 
    ON public.finance_entries((invoice_data->>'referencia')) 
    WHERE invoice_data->>'referencia' IS NOT NULL;

-- AIDEV-NOTE: Índice para busca por status de nota fiscal
CREATE INDEX IF NOT EXISTS idx_finance_entries_invoice_status 
    ON public.finance_entries(invoice_status) 
    WHERE invoice_status IS NOT NULL;

-- =====================================================
-- 3. CONSTRAINT DE STATUS DE INVOICE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'finance_entries_invoice_status_check'
    ) THEN
        ALTER TABLE public.finance_entries
        ADD CONSTRAINT finance_entries_invoice_status_check CHECK (
            invoice_status IS NULL OR 
            invoice_status IN ('pending', 'processing', 'issued', 'cancelled', 'error', 'denied')
        );
    END IF;
END $$;

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- AIDEV-NOTE: Habilitar RLS na tabela payment_gateways
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- AIDEV-NOTE: Policy para SELECT - usuários autenticados podem ver gateways do seu tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_gateways' 
        AND policyname = 'payment_gateways_select_policy'
    ) THEN
        CREATE POLICY payment_gateways_select_policy 
            ON public.payment_gateways 
            FOR SELECT 
            USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users 
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- AIDEV-NOTE: Policy para INSERT - apenas admins do tenant podem criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_gateways' 
        AND policyname = 'payment_gateways_insert_policy'
    ) THEN
        CREATE POLICY payment_gateways_insert_policy 
            ON public.payment_gateways 
            FOR INSERT 
            WITH CHECK (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users 
                    WHERE user_id = auth.uid() 
                    AND role IN ('TENANT_ADMIN', 'TENANT_OWNER')
                )
            );
    END IF;
END $$;

-- AIDEV-NOTE: Policy para UPDATE - apenas admins do tenant podem atualizar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_gateways' 
        AND policyname = 'payment_gateways_update_policy'
    ) THEN
        CREATE POLICY payment_gateways_update_policy 
            ON public.payment_gateways 
            FOR UPDATE 
            USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users 
                    WHERE user_id = auth.uid() 
                    AND role IN ('TENANT_ADMIN', 'TENANT_OWNER')
                )
            );
    END IF;
END $$;

-- AIDEV-NOTE: Policy para DELETE - apenas admins do tenant podem deletar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_gateways' 
        AND policyname = 'payment_gateways_delete_policy'
    ) THEN
        CREATE POLICY payment_gateways_delete_policy 
            ON public.payment_gateways 
            FOR DELETE 
            USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users 
                    WHERE user_id = auth.uid() 
                    AND role IN ('TENANT_ADMIN', 'TENANT_OWNER')
                )
            );
    END IF;
END $$;

-- =====================================================
-- 5. FUNÇÃO PARA ATUALIZAR updated_at
-- =====================================================

-- AIDEV-NOTE: Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_payment_gateways_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AIDEV-NOTE: Criar trigger se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'payment_gateways_updated_at_trigger'
    ) THEN
        CREATE TRIGGER payment_gateways_updated_at_trigger
            BEFORE UPDATE ON public.payment_gateways
            FOR EACH ROW
            EXECUTE FUNCTION public.update_payment_gateways_updated_at();
    END IF;
END $$;

-- =====================================================
-- 6. GRANT DE PERMISSÕES
-- =====================================================

-- AIDEV-NOTE: Permissões para authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- AIDEV-NOTE: Permissões para service_role (Edge Functions)
GRANT ALL ON public.payment_gateways TO service_role;

-- =====================================================
-- EXEMPLO DE CONFIGURAÇÃO FOCUSNFE
-- (Comentado - apenas para referência)
-- =====================================================

/*
INSERT INTO public.payment_gateways (
    tenant_id,
    provider,
    api_key,
    environment,
    settings
) VALUES (
    'seu-tenant-id-aqui',
    'focusnfe',
    'seu-token-focusnfe-aqui',
    'homologacao',
    '{
        "emitente": {
            "cnpj": "12345678000199",
            "razao_social": "Empresa Exemplo LTDA",
            "nome_fantasia": "Empresa Exemplo",
            "inscricao_estadual": "123456789",
            "inscricao_municipal": "12345",
            "endereco": {
                "logradouro": "Rua Exemplo",
                "numero": "100",
                "complemento": "Sala 1",
                "bairro": "Centro",
                "codigo_municipio": "3550308",
                "municipio": "São Paulo",
                "uf": "SP",
                "cep": "01001000"
            },
            "regime_tributario": "1",
            "cnae_principal": "6203100"
        },
        "fiscal_defaults": {
            "nfe": {
                "serie": "1",
                "natureza_operacao": "Venda de mercadoria",
                "tipo_documento": "1",
                "finalidade_emissao": "1",
                "consumidor_final": "1",
                "modalidade_frete": "9"
            },
            "nfse": {
                "natureza_operacao": "1",
                "optante_simples_nacional": true,
                "incentivador_cultural": false
            }
        },
        "webhook_url": "https://seu-projeto.supabase.co/functions/v1/focusnfe/webhook/seu-tenant-id"
    }'::jsonb
);
*/
