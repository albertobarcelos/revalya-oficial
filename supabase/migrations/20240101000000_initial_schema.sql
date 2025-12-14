-- =====================================================
-- MIGRAÇÃO INICIAL - Schema Base do Revalya
-- Data: 2024-01-01 (timestamp antigo para ser executada primeiro)
-- Descrição: Cria todas as tabelas base necessárias para o sistema
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TIPOS ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.bank_operation_type AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.billing_period_status AS ENUM ('PENDING', 'DUE_TODAY', 'LATE', 'BILLED', 'SKIPPED', 'FAILED', 'PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.billing_type_enum AS ENUM ('regular', 'complementary', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.dre_category AS ENUM ('NONE', 'DEFAULT', 'SALES', 'ADMIN', 'FINANCIAL', 'MARKETING', 'PERSONAL', 'SOCIAL_CHARGES', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.financial_operation_type AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.financial_setting_type AS ENUM ('EXPENSE_CATEGORY', 'DOCUMENT_TYPE', 'ENTRY_TYPE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payable_status AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'DUE_SOON', 'DUE_TODAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.service_billing_event_status AS ENUM ('PENDING', 'PROCESSED', 'SKIPPED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.stock_movement_type AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- TABELAS BASE (sem dependências)
-- =====================================================

-- Profiles (roles/perfis do sistema)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    context text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Resellers (revendedores)
CREATE TABLE IF NOT EXISTS public.resellers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    document text NOT NULL,
    email text NOT NULL,
    phone text,
    active boolean DEFAULT true,
    commission_rate numeric(5,2) DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT resellers_pkey PRIMARY KEY (id)
);

-- Tenants (empresas/clientes do SaaS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text NOT NULL,
    document text NOT NULL,
    email text NOT NULL,
    phone text,
    active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    branding jsonb DEFAULT '{"logo_url": null, "primary_color": "#00B4D8", "secondary_color": "#0077B6"}'::jsonb,
    integration_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    reseller_id uuid,
    CONSTRAINT tenants_pkey PRIMARY KEY (id),
    CONSTRAINT tenants_slug_key UNIQUE (slug)
);

-- Users (usuários do sistema)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    user_role text NOT NULL DEFAULT 'USER'::text,
    name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    settings jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'ACTIVE'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    role text DEFAULT 'authenticated'::text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Tenant Users (relação usuário-tenant)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'TENANT_USER'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true,
    permissions jsonb DEFAULT '{}'::jsonb,
    token_version integer DEFAULT 1,
    CONSTRAINT tenant_users_pkey PRIMARY KEY (id),
    CONSTRAINT tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id)
);

-- Resellers Users
CREATE TABLE IF NOT EXISTS public.resellers_users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    reseller_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone,
    CONSTRAINT resellers_users_pkey PRIMARY KEY (id)
);

-- Customers (clientes dos tenants)
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    customer_asaas_id text,
    active boolean DEFAULT true,
    additional_info text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    company text,
    cpf_cnpj bigint,
    address character varying(255),
    postal_code character varying(20),
    address_number character varying(20),
    complement character varying(255),
    neighborhood character varying(100),
    city character varying(100),
    state character varying(2),
    country character varying(50) DEFAULT 'Brasil'::character varying,
    celular_whatsapp text,
    created_by uuid,
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE SERVIÇOS E PRODUTOS
-- =====================================================

-- Services
CREATE TABLE IF NOT EXISTS public.services (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    code character varying(50),
    name character varying(255) NOT NULL,
    description text,
    municipality_code character varying(50),
    lc_code character varying(50),
    tax_code character varying(50),
    default_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0,
    withholding_tax boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    no_charge boolean NOT NULL DEFAULT false,
    unit_type character varying(50),
    cost_price numeric DEFAULT 0,
    CONSTRAINT services_pkey PRIMARY KEY (id)
);

-- Product Categories
CREATE TABLE IF NOT EXISTS public.product_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_categories_pkey PRIMARY KEY (id)
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    description text,
    code character varying(50),
    sku character varying(50),
    barcode character varying(50),
    unit_price numeric(15,2) NOT NULL,
    cost_price numeric(15,2),
    stock_quantity integer DEFAULT 0,
    min_stock_quantity integer DEFAULT 0,
    category character varying(100),
    supplier character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    created_by uuid,
    tenant_id uuid NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0.00,
    has_inventory boolean DEFAULT true,
    image_url text,
    unit_of_measure character varying(10) DEFAULT 'un'::character varying,
    category_id uuid,
    CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- Storage Locations
CREATE TABLE IF NOT EXISTS public.storage_locations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    address text,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    created_by uuid,
    CONSTRAINT storage_locations_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE CONTRATOS
-- =====================================================

-- Contract Stages
CREATE TABLE IF NOT EXISTS public.contract_stages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    color character varying(20),
    icon character varying(50),
    order_index integer NOT NULL,
    is_initial boolean DEFAULT false,
    is_final boolean DEFAULT false,
    is_active boolean DEFAULT true,
    required_role character varying(50),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    ai_enabled boolean DEFAULT false,
    ai_trigger_conditions jsonb DEFAULT '{}'::jsonb,
    ai_actions jsonb DEFAULT '{}'::jsonb,
    auto_transition_rules jsonb DEFAULT '{}'::jsonb,
    notification_template_id uuid,
    duration_sla_days integer,
    requires_approval boolean DEFAULT false,
    approval_role text,
    CONSTRAINT contract_stages_pkey PRIMARY KEY (id)
);

-- Contracts
CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    contract_number text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'::character varying,
    initial_date date NOT NULL,
    final_date date NOT NULL,
    billing_type text NOT NULL,
    billing_day integer NOT NULL,
    anticipate_weekends boolean DEFAULT true,
    reference_period text,
    installments integer DEFAULT 1,
    total_amount numeric(10,2) NOT NULL DEFAULT 0,
    total_discount numeric(10,2) DEFAULT 0,
    total_tax numeric(10,2) DEFAULT 0,
    stage_id uuid,
    description text,
    internal_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    billed boolean DEFAULT false,
    CONSTRAINT contracts_pkey PRIMARY KEY (id)
);

-- Contract Services
CREATE TABLE IF NOT EXISTS public.contract_services (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    service_id uuid NOT NULL,
    quantity numeric(10,4) NOT NULL DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    discount_percentage numeric(10,6) DEFAULT 0,
    discount_amount numeric(10,2),
    total_amount numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid,
    payment_method character varying(50),
    card_type character varying(20),
    billing_type character varying(50),
    recurrence_frequency character varying(50),
    installments integer DEFAULT 1,
    payment_gateway text,
    due_next_month boolean DEFAULT false,
    no_charge boolean NOT NULL DEFAULT false,
    generate_billing boolean NOT NULL DEFAULT true,
    due_type text NOT NULL DEFAULT 'days_after_billing'::text,
    due_value integer NOT NULL DEFAULT 5,
    cost_price numeric(10,2) DEFAULT 0,
    CONSTRAINT contract_services_pkey PRIMARY KEY (id)
);

-- Contract Products
CREATE TABLE IF NOT EXISTS public.contract_products (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    product_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    quantity numeric(10,4) NOT NULL DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    discount_percentage numeric(10,6) DEFAULT 0,
    discount_amount numeric(10,2),
    total_amount numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    payment_method character varying,
    card_type character varying,
    billing_type character varying,
    recurrence_frequency character varying,
    installments integer DEFAULT 1,
    payment_gateway text,
    due_date_type character varying DEFAULT 'days_after_billing'::character varying,
    due_days integer DEFAULT 5,
    due_day integer DEFAULT 10,
    due_next_month boolean DEFAULT false,
    generate_billing boolean NOT NULL DEFAULT true,
    CONSTRAINT contract_products_pkey PRIMARY KEY (id)
);

-- Contract Attachments
CREATE TABLE IF NOT EXISTS public.contract_attachments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_type character varying(100),
    file_size integer,
    description text,
    category character varying(50),
    is_active boolean DEFAULT true,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
    uploaded_by uuid,
    tenant_id uuid NOT NULL,
    CONSTRAINT contract_attachments_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE COBRANÇA
-- =====================================================

-- Charges
CREATE TABLE IF NOT EXISTS public.charges (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    valor numeric(10,2) NOT NULL,
    status text NOT NULL,
    tipo text NOT NULL,
    data_vencimento date NOT NULL,
    data_pagamento date,
    descricao text,
    invoice_url text,
    asaas_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    contract_id uuid,
    external_invoice_number text,
    asaas_discount_value numeric(10,2),
    asaas_invoice_url text,
    billing_periods uuid,
    created_by uuid,
    updated_by uuid,
    barcode text,
    pix_key text,
    installment_number integer DEFAULT 1,
    total_installments integer DEFAULT 1,
    installment_value numeric(10,2),
    is_installment boolean DEFAULT false,
    customer_name text,
    origem text DEFAULT 'MANUAL'::text,
    raw_data jsonb,
    observacao text,
    payment_value numeric,
    pdf_url text,
    net_value numeric,
    interest_rate numeric,
    fine_rate numeric,
    discount_value numeric,
    transaction_receipt_url text,
    external_customer_id text,
    CONSTRAINT charges_pkey PRIMARY KEY (id)
);

-- Contract Billing Periods
CREATE TABLE IF NOT EXISTS public.contract_billing_periods (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    contract_id uuid,
    period_start date,
    period_end date,
    bill_date date NOT NULL,
    status billing_period_status NOT NULL DEFAULT 'PENDING'::billing_period_status,
    billed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    manual_mark boolean NOT NULL DEFAULT false,
    manual_reason text,
    amount_planned numeric(10,2),
    amount_billed numeric(10,2),
    actor_id uuid,
    from_status billing_period_status,
    transition_reason text,
    order_number text,
    customer_id uuid,
    due_date date,
    payment_method text,
    payment_gateway_id uuid,
    description text,
    is_standalone boolean NOT NULL DEFAULT false,
    CONSTRAINT contract_billing_periods_pkey PRIMARY KEY (id)
);

-- Billing Period Items
CREATE TABLE IF NOT EXISTS public.billing_period_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    billing_period_id uuid NOT NULL,
    product_id uuid,
    service_id uuid,
    storage_location_id uuid,
    quantity numeric(15,6) NOT NULL DEFAULT 1,
    unit_price numeric(15,2) NOT NULL DEFAULT 0,
    total_price numeric(15,2),
    description text,
    observation text,
    stock_movement_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
    CONSTRAINT billing_period_items_pkey PRIMARY KEY (id)
);

-- Contract Billings
CREATE TABLE IF NOT EXISTS public.contract_billings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    billing_number character varying(50) NOT NULL,
    installment_number integer NOT NULL,
    total_installments integer NOT NULL,
    reference_period character varying(50) NOT NULL,
    reference_start_date date NOT NULL,
    reference_end_date date NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    original_due_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2),
    status character varying(20) DEFAULT 'PENDING'::character varying,
    payment_date timestamp with time zone,
    payment_method character varying(50),
    payment_gateway_id uuid,
    external_id character varying(100),
    payment_link text,
    is_manually_paid boolean DEFAULT false,
    synchronization_status character varying(20),
    last_sync_attempt timestamp with time zone,
    invoice_number character varying(50),
    invoice_url text,
    invoice_status character varying(20),
    invoice_text text,
    invoice_description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    currency character varying(3) DEFAULT 'BRL'::character varying,
    billing_type billing_type_enum NOT NULL DEFAULT 'regular'::billing_type_enum,
    parent_billing_id uuid,
    complementary_reason text,
    original_amount numeric(10,2),
    complementary_amount numeric(10,2),
    service_changes jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT contract_billings_pkey PRIMARY KEY (id)
);

-- Contract Billing Items
CREATE TABLE IF NOT EXISTS public.contract_billing_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    billing_id uuid NOT NULL,
    contract_service_id uuid,
    description text NOT NULL,
    quantity numeric(10,4) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_percentage numeric(10,6) DEFAULT 0,
    discount_amount numeric(10,2),
    total_amount numeric(10,2),
    tax_code character varying(50),
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT contract_billing_items_pkey PRIMARY KEY (id)
);

-- Contract Billing Payments
CREATE TABLE IF NOT EXISTS public.contract_billing_payments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    billing_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    payment_date timestamp with time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    transaction_id character varying(100),
    payment_gateway_id uuid,
    external_id character varying(100),
    notes text,
    receipt_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    CONSTRAINT contract_billing_payments_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS FINANCEIRAS
-- =====================================================

-- Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_acounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    agency text NOT NULL,
    count text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by uuid,
    updated_by uuid,
    bank text,
    current_balance numeric NOT NULL DEFAULT 0,
    CONSTRAINT bank_acounts_pkey PRIMARY KEY (id)
);

-- Bank Operation History
CREATE TABLE IF NOT EXISTS public.bank_operation_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    bank_acount_id uuid,
    operation_type bank_operation_type NOT NULL,
    amount numeric(18,2) NOT NULL,
    operation_date timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
    description text,
    document_reference uuid,
    category uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_by uuid,
    CONSTRAINT bank_operation_history_pkey PRIMARY KEY (id)
);

-- Financial Settings
CREATE TABLE IF NOT EXISTS public.financial_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    type financial_setting_type NOT NULL,
    name text NOT NULL,
    code text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    dre_category dre_category DEFAULT 'DEFAULT'::dre_category,
    CONSTRAINT financial_settings_pkey PRIMARY KEY (id)
);

-- Financial Documents
CREATE TABLE IF NOT EXISTS public.financial_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    credit_title_type text NOT NULL,
    open_id uuid,
    settle_id uuid,
    addition_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT financial_documents_pkey PRIMARY KEY (id)
);

-- Financial Launchs
CREATE TABLE IF NOT EXISTS public.financial_launchs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    operation_type financial_operation_type,
    generate_bank_movement boolean NOT NULL DEFAULT false,
    consider_settlement_movement boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT financial_launchs_pkey PRIMARY KEY (id)
);

-- Financial Payables
CREATE TABLE IF NOT EXISTS public.financial_payables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    entry_number text,
    description text,
    gross_amount numeric(14,2) NOT NULL DEFAULT 0,
    net_amount numeric(14,2) NOT NULL DEFAULT 0,
    due_date date NOT NULL,
    issue_date date,
    status payable_status NOT NULL DEFAULT 'PENDING'::payable_status,
    payment_date date,
    paid_amount numeric(14,2),
    payment_method text,
    category_id uuid,
    document_id uuid,
    supplier_id uuid,
    supplier_name text,
    repeat boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    bank_account_id uuid,
    CONSTRAINT financial_payables_pkey PRIMARY KEY (id)
);

-- Finance Entries
CREATE TABLE IF NOT EXISTS public.finance_entries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    due_date date NOT NULL,
    payment_date timestamp with time zone,
    status text NOT NULL DEFAULT 'pending'::text,
    category_id uuid,
    charge_id uuid,
    contract_id uuid,
    tenant_id uuid NOT NULL,
    bank_account_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT finance_entries_pkey PRIMARY KEY (id)
);

-- Receipts
CREATE TABLE IF NOT EXISTS public.receipts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    charge_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    contract_id uuid,
    valor_recebido numeric(10,2) NOT NULL,
    valor_original numeric(10,2) NOT NULL,
    desconto numeric(10,2) DEFAULT 0,
    juros numeric(10,2) DEFAULT 0,
    multa numeric(10,2) DEFAULT 0,
    metodo_pagamento text NOT NULL,
    data_recebimento date NOT NULL DEFAULT CURRENT_DATE,
    data_processamento timestamp with time zone DEFAULT timezone('utc'::text, now()),
    observacoes text,
    numero_comprovante text,
    banco_origem text,
    agencia_origem text,
    conta_origem text,
    anexos jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT receipts_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE INTEGRAÇÃO
-- =====================================================

-- Sequence para tenant_integrations
CREATE SEQUENCE IF NOT EXISTS tenant_integrations_id_seq;

-- Tenant Integrations
CREATE TABLE IF NOT EXISTS public.tenant_integrations (
    id integer NOT NULL DEFAULT nextval('tenant_integrations_id_seq'::regclass),
    tenant_id uuid NOT NULL,
    integration_type text NOT NULL,
    is_active boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    environment character varying(20) DEFAULT 'production'::character varying,
    webhook_url text,
    webhook_token text,
    last_sync_at timestamp with time zone,
    sync_status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    created_by uuid,
    config jsonb DEFAULT '{}'::jsonb,
    encrypted_api_key text,
    CONSTRAINT tenant_integrations_pkey PRIMARY KEY (id)
);

-- Tenant Invites
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    status text NOT NULL DEFAULT 'PENDING'::text,
    role text NOT NULL DEFAULT 'TENANT_USER'::text,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    accepted_at timestamp with time zone,
    user_id uuid,
    CONSTRAINT tenant_invites_pkey PRIMARY KEY (id)
);

-- Tenant Access Codes
CREATE TABLE IF NOT EXISTS public.tenant_access_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    code character varying(64) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT tenant_access_codes_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE CONCILIAÇÃO
-- =====================================================

-- Conciliation Staging
CREATE TABLE IF NOT EXISTS public.conciliation_staging (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    origem text NOT NULL,
    id_externo text NOT NULL,
    valor_cobranca numeric(10,2),
    valor_pago numeric(10,2) NOT NULL,
    status_externo text NOT NULL,
    status_conciliacao text NOT NULL DEFAULT 'PENDENTE'::text,
    contrato_id uuid,
    data_vencimento timestamp with time zone,
    data_pagamento timestamp with time zone,
    observacao text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    asaas_customer_id text,
    external_reference text,
    valor_original numeric(10,2),
    valor_liquido numeric(10,2),
    taxa_juros numeric(10,2) DEFAULT 0,
    taxa_multa numeric(10,2) DEFAULT 0,
    valor_desconto numeric(10,2) DEFAULT 0,
    payment_method text,
    deleted_flag boolean DEFAULT false,
    anticipated_flag boolean DEFAULT false,
    customer_name text,
    customer_email text,
    customer_document text,
    customer_phone text,
    customer_mobile_phone text,
    customer_address text,
    customer_address_number text,
    customer_complement text,
    customer_cityName text,
    customer_city text,
    customer_state text,
    customer_postal_code text,
    customer_country text,
    installment_number integer,
    invoice_url text,
    pdf_url text,
    transaction_receipt_url text,
    raw_data jsonb,
    processed boolean DEFAULT false,
    created_by uuid,
    updated_by uuid,
    charge_id uuid,
    invoice_number text,
    customer_province text,
    customer_company text,
    barcode text,
    pix_key text,
    imported_at timestamp with time zone,
    CONSTRAINT conciliation_staging_pkey PRIMARY KEY (id)
);

-- Conciliation Rules
CREATE TABLE IF NOT EXISTS public.conciliation_rules (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    source text NOT NULL,
    conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
    actions jsonb NOT NULL DEFAULT '{}'::jsonb,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    auto_match boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT conciliation_rules_pkey PRIMARY KEY (id)
);

-- Conciliation History
CREATE TABLE IF NOT EXISTS public.conciliation_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    charge_id uuid,
    movement_id uuid,
    rule_id uuid,
    action text NOT NULL,
    previous_status text,
    new_status text,
    notes text,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT conciliation_history_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE NOTIFICAÇÃO E MENSAGENS
-- =====================================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    message text NOT NULL,
    active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    days_offset integer NOT NULL DEFAULT 0,
    is_before_due boolean DEFAULT true,
    tags text[] NOT NULL DEFAULT '{}'::text[],
    CONSTRAINT notification_templates_pkey PRIMARY KEY (id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    recipient_email text,
    subject text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone,
    error text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    tenant_id uuid,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Message History
CREATE TABLE IF NOT EXISTS public.message_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    charge_id uuid NOT NULL,
    template_id uuid,
    customer_id uuid NOT NULL,
    message text NOT NULL,
    status text NOT NULL,
    error_details text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    batch_id uuid DEFAULT uuid_generate_v4(),
    CONSTRAINT message_history_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE ESTOQUE
-- =====================================================

-- Product Stock by Location
CREATE TABLE IF NOT EXISTS public.product_stock_by_location (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    storage_location_id uuid NOT NULL,
    available_stock numeric(15,6) DEFAULT 0,
    min_stock numeric(15,6) DEFAULT 0,
    unit_cmc numeric(15,2) DEFAULT 0,
    total_cmc numeric(15,2),
    updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    CONSTRAINT product_stock_by_location_pkey PRIMARY KEY (id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    storage_location_id uuid NOT NULL,
    movement_type stock_movement_type NOT NULL,
    movement_reason text,
    movement_date date NOT NULL DEFAULT CURRENT_DATE,
    quantity numeric(15,6) NOT NULL,
    unit_value numeric(15,2) DEFAULT 0,
    total_value numeric(15,2),
    accumulated_balance numeric(15,6) DEFAULT 0,
    unit_cmc numeric(15,2) DEFAULT 0,
    total_cmc numeric(15,2),
    invoice_number text,
    operation text,
    customer_or_supplier text,
    observation text,
    origin_storage_location_id uuid,
    destination_storage_location_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    updated_by uuid,
    CONSTRAINT stock_movements_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE TAREFAS
-- =====================================================

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    client_name text,
    client_id uuid,
    charge_id uuid,
    due_date date,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
    tenant_id uuid NOT NULL,
    assigned_to uuid,
    customer_id uuid,
    CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- Tasks Attachments
CREATE TABLE IF NOT EXISTS public.tasks_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_attachments_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE AUDITORIA E LOGS
-- =====================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    tenant_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    entity_type text,
    entity_id text,
    old_data jsonb,
    new_data jsonb,
    changed_fields jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE RÉGUA DE COBRANÇA
-- =====================================================

-- Regua Cobrança Config
CREATE TABLE IF NOT EXISTS public.regua_cobranca_config (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    ativo boolean DEFAULT false,
    canal_whatsapp boolean DEFAULT true,
    canal_email boolean DEFAULT true,
    canal_sms boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid NOT NULL,
    CONSTRAINT regua_cobranca_config_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Etapas
CREATE TABLE IF NOT EXISTS public.regua_cobranca_etapas (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    posicao integer NOT NULL,
    gatilho character varying NOT NULL,
    dias integer DEFAULT 0,
    canal character varying NOT NULL,
    mensagem text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_etapas_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Templates
CREATE TABLE IF NOT EXISTS public.regua_cobranca_templates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    nome character varying NOT NULL,
    descricao text,
    escopo character varying NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_templates_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Template Etapas
CREATE TABLE IF NOT EXISTS public.regua_cobranca_template_etapas (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    template_id uuid NOT NULL,
    posicao integer NOT NULL,
    gatilho character varying NOT NULL,
    dias integer DEFAULT 0,
    canal character varying NOT NULL,
    mensagem text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_template_etapas_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Execução
CREATE TABLE IF NOT EXISTS public.regua_cobranca_execucao (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    cobranca_id uuid NOT NULL,
    etapa_id uuid NOT NULL,
    status character varying NOT NULL,
    canal character varying NOT NULL,
    data_agendada timestamp with time zone NOT NULL,
    data_execucao timestamp with time zone,
    mensagem_enviada text,
    erro text,
    metadados jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_execucao_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Mensagens
CREATE TABLE IF NOT EXISTS public.regua_cobranca_mensagens (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    etapa_id uuid NOT NULL,
    cobranca_id character varying NOT NULL,
    cliente_id character varying NOT NULL,
    status character varying NOT NULL,
    canal character varying NOT NULL,
    data_agendada timestamp with time zone,
    data_execucao timestamp with time zone,
    erro text,
    mensagem_processada text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_mensagens_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Interações
CREATE TABLE IF NOT EXISTS public.regua_cobranca_interacoes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    mensagem_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    cliente_id character varying NOT NULL,
    cobranca_id character varying NOT NULL,
    tipo character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_interacoes_pkey PRIMARY KEY (id)
);

-- Regua Cobrança Estatísticas
CREATE TABLE IF NOT EXISTS public.regua_cobranca_estatisticas (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    periodo character varying NOT NULL,
    etapa_id uuid,
    canal character varying NOT NULL,
    total_enviadas integer DEFAULT 0,
    total_entregues integer DEFAULT 0,
    total_lidas integer DEFAULT 0,
    total_respondidas integer DEFAULT 0,
    total_pagas_apos_24h integer DEFAULT 0,
    total_pagas_apos_72h integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regua_cobranca_estatisticas_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE IA
-- =====================================================

-- Agente IA Empresa
CREATE TABLE IF NOT EXISTS public.agente_ia_empresa (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    nome_agente text NOT NULL,
    tom_de_voz text NOT NULL,
    exemplos_de_mensagem jsonb DEFAULT '[]'::jsonb,
    usa_emojis boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT agente_ia_empresa_pkey PRIMARY KEY (id)
);

-- Agente IA Mensagens Régua
CREATE TABLE IF NOT EXISTS public.agente_ia_mensagens_regua (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    etapa_regua_id uuid NOT NULL,
    mensagem text NOT NULL,
    variaveis_contexto jsonb DEFAULT '[]'::jsonb,
    personalizado boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT agente_ia_mensagens_regua_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABELAS DE CONTROLE
-- =====================================================

-- Contract Stage History
CREATE TABLE IF NOT EXISTS public.contract_stage_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    from_stage_id uuid,
    to_stage_id uuid NOT NULL,
    comments text,
    internal_notes text,
    changed_at timestamp with time zone NOT NULL DEFAULT now(),
    changed_by uuid,
    metadata jsonb,
    CONSTRAINT contract_stage_history_pkey PRIMARY KEY (id)
);

-- Contract Stage Transitions
CREATE TABLE IF NOT EXISTS public.contract_stage_transitions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    from_stage_id uuid NOT NULL,
    to_stage_id uuid NOT NULL,
    allowed_roles character varying(50)[],
    requires_comment boolean DEFAULT false,
    requires_approval boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT contract_stage_transitions_pkey PRIMARY KEY (id)
);

-- Contract Stage Transition Rules
CREATE TABLE IF NOT EXISTS public.contract_stage_transition_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    from_stage_id uuid NOT NULL,
    to_stage_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    conditions jsonb NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contract_stage_transition_rules_pkey PRIMARY KEY (id)
);

-- Service Billing Events
CREATE TABLE IF NOT EXISTS public.service_billing_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    service_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL DEFAULT 0.00,
    status service_billing_event_status NOT NULL DEFAULT 'PENDING'::service_billing_event_status,
    charge_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT service_billing_events_pkey PRIMARY KEY (id)
);

-- Service Order Sequences
CREATE TABLE IF NOT EXISTS public.service_order_sequences (
    tenant_id uuid NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT service_order_sequences_pkey PRIMARY KEY (tenant_id)
);

-- DES Payables Sequence
CREATE TABLE IF NOT EXISTS public.des_payables_sequence (
    tenant_id uuid NOT NULL,
    last_value bigint NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT des_payables_sequence_pkey PRIMARY KEY (tenant_id)
);

-- Health Check
CREATE TABLE IF NOT EXISTS public.health_check (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    status text NOT NULL DEFAULT 'ok'::text,
    last_checked timestamp with time zone DEFAULT now(),
    CONSTRAINT health_check_pkey PRIMARY KEY (id)
);

-- =====================================================
-- FIM DA MIGRAÇÃO INICIAL
-- =====================================================
