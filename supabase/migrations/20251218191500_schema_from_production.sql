-- =====================================================
-- Migration: Schema completo da produÃ§Ã£o
-- Data: 2025-12-18
-- DescriÃ§Ã£o: Dump completo do schema public da branch main (produÃ§Ã£o)
-- Gerado via MCP Supabase
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA public;

-- =====================================================
-- ENUMS (Tipos Customizados)
-- =====================================================
CREATE TYPE public.bank_operation_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE public.billing_period_status AS ENUM ('PENDING', 'DUE_TODAY', 'LATE', 'BILLED', 'SKIPPED', 'FAILED', 'PAID');
CREATE TYPE public.billing_type_enum AS ENUM ('regular', 'complementary', 'adjustment');
CREATE TYPE public.dre_category AS ENUM ('NONE', 'DEFAULT', 'SALES', 'ADMIN', 'FINANCIAL', 'MARKETING', 'PERSONAL', 'SOCIAL_CHARGES', 'OTHER');
CREATE TYPE public.financial_operation_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE public.financial_setting_type AS ENUM ('EXPENSE_CATEGORY', 'DOCUMENT_TYPE', 'ENTRY_TYPE');
CREATE TYPE public.payable_status AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'DUE_SOON', 'DUE_TODAY');
CREATE TYPE public.service_billing_event_status AS ENUM ('PENDING', 'PROCESSED', 'SKIPPED', 'ERROR');
CREATE TYPE public.stock_movement_type AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA');

-- =====================================================
-- TABELAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agente_ia_empresa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  nome_agente text NOT NULL,
  tom_de_voz text NOT NULL,
  exemplos_de_mensagem jsonb DEFAULT '[]'::jsonb,
  usa_emojis boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agente_ia_mensagens_regua (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  etapa_regua_id uuid NOT NULL,
  mensagem text NOT NULL,
  variaveis_contexto jsonb DEFAULT '[]'::jsonb,
  personalizado boolean DEFAULT false,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

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
  performed_at timestamp with time zone DEFAULT now()
);

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
  current_balance numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.bank_operation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  bank_acount_id uuid,
  operation_type bank_operation_type NOT NULL,
  amount numeric NOT NULL,
  operation_date timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
  description text,
  document_reference uuid,
  category uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.billing_period_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  billing_period_id uuid NOT NULL,
  product_id uuid,
  service_id uuid,
  storage_location_id uuid,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric,
  description text,
  observation text,
  stock_movement_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now())
);

CREATE TABLE IF NOT EXISTS public.charges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  valor numeric NOT NULL,
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
  asaas_discount_value numeric,
  asaas_invoice_url text,
  billing_periods uuid,
  created_by uuid,
  updated_by uuid,
  barcode text,
  pix_key text,
  installment_number integer DEFAULT 1,
  total_installments integer DEFAULT 1,
  installment_value numeric,
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
  external_customer_id text
);

CREATE TABLE IF NOT EXISTS public.conciliation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.conciliation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.conciliation_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  origem text NOT NULL,
  id_externo text NOT NULL,
  valor_cobranca numeric,
  valor_pago numeric NOT NULL,
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
  valor_original numeric,
  valor_liquido numeric,
  taxa_juros numeric DEFAULT 0,
  taxa_multa numeric DEFAULT 0,
  valor_desconto numeric DEFAULT 0,
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
  imported_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.contract_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contract_billing_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  billing_id uuid NOT NULL,
  contract_service_id uuid,
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric,
  total_amount numeric,
  tax_code character varying(50),
  tax_rate numeric DEFAULT 0,
  tax_amount numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_billing_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  billing_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  payment_date timestamp with time zone NOT NULL,
  amount numeric NOT NULL,
  payment_method character varying(50) NOT NULL,
  transaction_id character varying(100),
  payment_gateway_id uuid,
  external_id character varying(100),
  notes text,
  receipt_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.contract_billing_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  amount_planned numeric,
  amount_billed numeric,
  actor_id uuid,
  from_status billing_period_status,
  transition_reason text,
  order_number text,
  customer_id uuid,
  due_date date,
  payment_method text,
  payment_gateway_id uuid,
  description text,
  is_standalone boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.contract_billings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  amount numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric,
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
  original_amount numeric,
  complementary_amount numeric,
  service_changes jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.contract_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  product_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric,
  total_amount numeric,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric,
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
  generate_billing boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.contract_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  service_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric,
  total_amount numeric,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric,
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
  cost_price numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.contract_stage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  from_stage_id uuid,
  to_stage_id uuid NOT NULL,
  comments text,
  internal_notes text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  changed_by uuid,
  metadata jsonb
);

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
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_stage_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  from_stage_id uuid NOT NULL,
  to_stage_id uuid NOT NULL,
  allowed_roles character varying[],
  requires_comment boolean DEFAULT false,
  requires_approval boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  approval_role text
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  total_amount numeric NOT NULL DEFAULT 0,
  total_discount numeric DEFAULT 0,
  total_tax numeric DEFAULT 0,
  stage_id uuid,
  description text,
  internal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  billed boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.des_payables_sequence (
  tenant_id uuid NOT NULL,
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
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
  customer_id uuid,
  notes text
);

-- AIDEV-NOTE: Garantir que as colunas customer_id e notes existam mesmo se a tabela já foi criada
-- Isso é necessário porque CREATE TABLE IF NOT EXISTS não adiciona colunas se a tabela já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'finance_entries' 
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.finance_entries ADD COLUMN customer_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'finance_entries' 
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.finance_entries ADD COLUMN notes text;
  END IF;
END $$;

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
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_launchs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  operation_type financial_operation_type,
  generate_bank_movement boolean NOT NULL DEFAULT false,
  consider_settlement_movement boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_payables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entry_number text,
  description text,
  gross_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  issue_date date,
  status payable_status NOT NULL DEFAULT 'PENDING'::payable_status,
  payment_date date,
  paid_amount numeric,
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
  bank_account_id uuid
);

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
  dre_category dre_category DEFAULT 'DEFAULT'::dre_category
);

CREATE TABLE IF NOT EXISTS public.health_check (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'ok'::text,
  last_checked timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  batch_id uuid DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  tags text[] NOT NULL DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  recipient_email text,
  subject text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  description text,
  tenant_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_stock_by_location (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  storage_location_id uuid NOT NULL,
  available_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  unit_cmc numeric DEFAULT 0,
  total_cmc numeric,
  updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now())
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  description text,
  code character varying(50),
  sku character varying(50),
  barcode character varying(50),
  unit_price numeric NOT NULL,
  cost_price numeric,
  stock_quantity integer DEFAULT 0,
  min_stock_quantity integer DEFAULT 0,
  category character varying(100),
  supplier character varying(100),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  created_by uuid,
  tenant_id uuid NOT NULL,
  tax_rate numeric DEFAULT 0.00,
  has_inventory boolean DEFAULT true,
  image_url text,
  unit_of_measure character varying(10) DEFAULT 'un'::character varying,
  category_id uuid
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  context text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  charge_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  contract_id uuid,
  valor_recebido numeric NOT NULL,
  valor_original numeric NOT NULL,
  desconto numeric DEFAULT 0,
  juros numeric DEFAULT 0,
  multa numeric DEFAULT 0,
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
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT false,
  canal_whatsapp boolean DEFAULT true,
  canal_email boolean DEFAULT true,
  canal_sms boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_estatisticas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_etapas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  posicao integer NOT NULL,
  gatilho character varying NOT NULL,
  dias integer DEFAULT 0,
  canal character varying NOT NULL,
  mensagem text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_execucao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_interacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  cliente_id character varying NOT NULL,
  cobranca_id character varying NOT NULL,
  tipo character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_template_etapas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  posicao integer NOT NULL,
  gatilho character varying NOT NULL,
  dias integer DEFAULT 0,
  canal character varying NOT NULL,
  mensagem text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regua_cobranca_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  descricao text,
  escopo character varying NOT NULL,
  tenant_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resellers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text NOT NULL,
  email text NOT NULL,
  phone text,
  active boolean DEFAULT true,
  commission_rate numeric DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.resellers_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reseller_id uuid NOT NULL,
  role character varying(20) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.service_billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  service_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0.00,
  status service_billing_event_status NOT NULL DEFAULT 'PENDING'::service_billing_event_status,
  charge_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_order_sequences (
  tenant_id uuid NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code character varying(50),
  name character varying(255) NOT NULL,
  description text,
  municipality_code character varying(50),
  lc_code character varying(50),
  tax_code character varying(50),
  default_price numeric NOT NULL,
  tax_rate numeric DEFAULT 0,
  withholding_tax boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  no_charge boolean NOT NULL DEFAULT false,
  unit_type character varying(50),
  cost_price numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  storage_location_id uuid NOT NULL,
  movement_type stock_movement_type NOT NULL,
  movement_reason text,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric NOT NULL,
  unit_value numeric DEFAULT 0,
  total_value numeric,
  accumulated_balance numeric DEFAULT 0,
  unit_cmc numeric DEFAULT 0,
  total_cmc numeric,
  invoice_number text,
  operation text,
  customer_or_supplier text,
  observation text,
  origin_storage_location_id uuid,
  destination_storage_location_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_by uuid
);

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
  created_by uuid
);

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
  customer_id uuid
);

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
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_access_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  code character varying(64) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone
);

-- SequÃªncia para tenant_integrations
CREATE SEQUENCE IF NOT EXISTS public.tenant_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

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
  encrypted_api_key text
);

CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text,
  role text NOT NULL DEFAULT 'TENANT_USER'::text,
  token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  accepted_at timestamp with time zone,
  user_id uuid
);

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'TENANT_USER'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}'::jsonb,
  token_version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  reseller_id uuid
);

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
  role text DEFAULT 'authenticated'::text
);

-- =====================================================
-- FUNÃ‡Ã•ES (Todas as funÃ§Ãµes da produÃ§Ã£o)
-- =====================================================

-- AIDEV-NOTE: Todas as funÃ§Ãµes abaixo foram extraÃ­das diretamente da branch main (produÃ§Ã£o)
-- usando pg_get_functiondef via MCP Supabase

CREATE OR REPLACE FUNCTION public.acknowledge_security_notification(p_notification_id uuid, p_acknowledged_by uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    notification_exists BOOLEAN;
BEGIN
    -- Verifica se a notificaÃ§Ã£o existe e se o usuÃ¡rio tem permissÃ£o
    SELECT EXISTS(
        SELECT 1 FROM public.security_notifications
        WHERE id = p_notification_id
        AND (
            get_current_user_role_from_jwt() IN ('PLATFORM_ADMIN', 'ADMIN') OR
            (
                get_current_user_role_from_jwt() IN ('TENANT_ADMIN', 'MANAGER') AND
                user_has_tenant_access_jwt(tenant_id)
            ) OR
            user_id = auth.uid()
        )
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Atualiza a notificaÃ§Ã£o
    UPDATE public.security_notifications
    SET 
        acknowledged = TRUE,
        acknowledged_by = p_acknowledged_by,
        acknowledged_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
/*
  Reverte o efeito do registro removido de bank_operation_history
  no current_balance da conta bancÃ¡ria associada.
*/
DECLARE
  v_old_delta NUMERIC(18,2);
BEGIN
  IF OLD.bank_acount_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_old_delta := CASE WHEN OLD.operation_type = 'CREDIT' THEN OLD.amount ELSE -OLD.amount END;

  UPDATE public.bank_acounts AS ba
  SET current_balance = COALESCE(ba.current_balance, 0) - v_old_delta,
      updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE ba.id = OLD.bank_acount_id
    AND ba.tenant_id = OLD.tenant_id;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
/*
  Ajusta current_balance da conta bancÃ¡ria associada ao registro
  inserido em bank_operation_history.
  Regras:
  - CREDIT: soma amount
  - DEBIT: subtrai amount
  - Ignora quando bank_acount_id Ã© NULL
*/
DECLARE
  v_delta NUMERIC(18,2);
BEGIN
  IF NEW.bank_acount_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_delta := CASE WHEN NEW.operation_type = 'CREDIT' THEN NEW.amount ELSE -NEW.amount END;

  UPDATE public.bank_acounts AS ba
  SET current_balance = COALESCE(ba.current_balance, 0) + v_delta,
      updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE ba.id = NEW.bank_acount_id
    AND ba.tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
/*
  Ajusta current_balance considerando mudanÃ§as em amount, operation_type
  e/ou bank_acount_id.
  - Se a conta mudou: remove efeito antigo da conta OLD e aplica efeito
    novo na conta NEW.
  - Caso contrÃ¡rio: aplica apenas a diferenÃ§a (novo - antigo) na mesma conta.
  - Ignora quando ambas as contas sÃ£o NULL.
*/
DECLARE
  v_old_delta NUMERIC(18,2);
  v_new_delta NUMERIC(18,2);
  v_diff NUMERIC(18,2);
BEGIN
  v_old_delta := CASE WHEN OLD.operation_type = 'CREDIT' THEN OLD.amount ELSE -OLD.amount END;
  v_new_delta := CASE WHEN NEW.operation_type = 'CREDIT' THEN NEW.amount ELSE -NEW.amount END;

  IF COALESCE(OLD.bank_acount_id, '00000000-0000-0000-0000-000000000000'::uuid) 
     IS DISTINCT FROM COALESCE(NEW.bank_acount_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    -- Remove da conta antiga
    IF OLD.bank_acount_id IS NOT NULL THEN
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) - v_old_delta,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = OLD.bank_acount_id
        AND ba.tenant_id = OLD.tenant_id;
    END IF;
    -- Aplica na conta nova
    IF NEW.bank_acount_id IS NOT NULL THEN
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) + v_new_delta,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = NEW.bank_acount_id
        AND ba.tenant_id = NEW.tenant_id;
    END IF;
  ELSE
    -- Mesma conta: aplica diferenÃ§a
    IF NEW.bank_acount_id IS NOT NULL THEN
      v_diff := v_new_delta - v_old_delta;
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) + v_diff,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = NEW.bank_acount_id
        AND ba.tenant_id = NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- FUNÃ‡Ã•ES DE CONTEXTO DE TENANT
-- =====================================================

-- FunÃ§Ã£o para obter o tenant_id atual do contexto da sessÃ£o
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Tentar obter do contexto da sessÃ£o
  BEGIN
    v_tenant_id := (current_setting('app.current_tenant_id', true))::uuid;
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Tentar obter do contexto alternativo
  BEGIN
    v_tenant_id := (current_setting('app.tenant_id', true))::uuid;
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Se nÃ£o encontrou no contexto, tentar obter do tenant_users
  IF auth.uid() IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND active = true
    LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- FunÃ§Ã£o alternativa para obter tenant_id (alias)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.current_tenant_id();
END;
$$;

-- FunÃ§Ã£o robusta para obter contexto de tenant (com mÃºltiplas estratÃ©gias)
CREATE OR REPLACE FUNCTION public.get_current_tenant_context_robust()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- EstratÃ©gia 1: Tentar obter do contexto da sessÃ£o (app.current_tenant_id)
  BEGIN
    v_tenant_id := (current_setting('app.current_tenant_id', true))::uuid;
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- EstratÃ©gia 2: Tentar obter do contexto alternativo (app.tenant_id)
  BEGIN
    v_tenant_id := (current_setting('app.tenant_id', true))::uuid;
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- EstratÃ©gia 3: Obter do primeiro tenant ativo do usuÃ¡rio autenticado
  IF auth.uid() IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND (active IS NULL OR active = true)
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
      RETURN v_tenant_id;
    END IF;
  END IF;
  
  -- EstratÃ©gia 4: Se for admin, pode nÃ£o ter tenant especÃ­fico (retorna NULL)
  -- Isso permite que admins vejam dados de mÃºltiplos tenants via outras polÃ­ticas
  
  RETURN NULL;
END;
$$;

-- FunÃ§Ã£o para verificar acesso seguro ao tenant
CREATE OR REPLACE FUNCTION public.check_tenant_access_safe(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_current_tenant_id uuid;
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  -- Se nÃ£o hÃ¡ tenant_id fornecido, negar acesso
  IF p_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obter tenant atual
  v_current_tenant_id := public.current_tenant_id();
  
  -- Se o tenant_id corresponde ao contexto atual, permitir
  IF v_current_tenant_id = p_tenant_id THEN
    RETURN true;
  END IF;
  
  -- Verificar se o usuÃ¡rio Ã© admin global
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.users
      WHERE id = v_user_id
        AND user_role IN ('ADMIN', 'SUPER_ADMIN')
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Verificar se o usuÃ¡rio pertence ao tenant
  IF v_user_id IS NOT NULL THEN
    RETURN EXISTS(
      SELECT 1
      FROM public.tenant_users
      WHERE user_id = v_user_id
        AND tenant_id = p_tenant_id
        AND active = true
    );
  END IF;
  
  RETURN false;
END;
$$;

-- =====================================================
-- POLÃTICAS RLS (Row Level Security)
-- =====================================================
-- NOTA: Todas as polÃ­ticas RLS estÃ£o comentadas porque nÃ£o estÃ£o sendo usadas na produÃ§Ã£o (main)
-- RLS estÃ¡ desativado na produÃ§Ã£o, entÃ£o comentamos aqui tambÃ©m

/*
-- Habilitar RLS nas tabelas (COMENTADO - RLS nÃ£o estÃ¡ ativo na produÃ§Ã£o)
-- -- ALTER TABLE public.agente_ia_empresa ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.agente_ia_mensagens_regua ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conciliation_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conciliation_rules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_billing_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_billing_payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_billing_periods ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_billings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_stage_transitions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contract_stages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.health_check ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.regua_cobranca_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.regua_cobranca_etapas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.resellers_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.service_billing_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tenant_access_codes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas RLS especÃ­ficas (COMENTADAS - RLS nÃ£o estÃ¡ ativo na produÃ§Ã£o)
-- CREATE POLICY agente_ia_empresa_delete ON public.agente_ia_empresa FOR DELETE TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--   FROM tenant_users
--  WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--   FROM auth.users
--  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text))))));
-- CREATE POLICY agente_ia_empresa_insert ON public.agente_ia_empresa FOR INSERT TO PUBLIC WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY agente_ia_empresa_select ON public.agente_ia_empresa FOR SELECT TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY agente_ia_empresa_update ON public.agente_ia_empresa FOR UPDATE TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY agente_mensagens_delete ON public.agente_ia_mensagens_regua FOR DELETE TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text))))));
-- CREATE POLICY agente_mensagens_insert ON public.agente_ia_mensagens_regua FOR INSERT TO PUBLIC WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY agente_mensagens_select ON public.agente_ia_mensagens_regua FOR SELECT TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY agente_mensagens_update ON public.agente_ia_mensagens_regua FOR UPDATE TO PUBLIC USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['ADMIN'::text, 'TENANT_ADMIN'::text]))))) OR (EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND (((users.raw_user_meta_data ->> 'role'::text) = 'ADMIN'::text) OR ((users.raw_user_meta_data ->> 'role'::text) = 'RESELLER'::text)))))));
-- CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO PUBLIC WITH CHECK (true);
-- CREATE POLICY "Users can view tenant audit logs" ON public.audit_logs FOR SELECT TO PUBLIC USING ((tenant_id IN ( SELECT t.id
--    FROM (tenants t
--      JOIN tenant_users tu ON ((t.id = tu.tenant_id)))
--   WHERE (tu.user_id = auth.uid()))));
-- CREATE POLICY bank_acounts_delete_same_tenant ON public.bank_acounts FOR DELETE TO PUBLIC USING (((tenant_id = current_tenant_id()) AND check_tenant_access_safe(tenant_id)));
-- CREATE POLICY bank_acounts_insert_same_tenant ON public.bank_acounts FOR INSERT TO PUBLIC WITH CHECK (((tenant_id = current_tenant_id()) AND check_tenant_access_safe(tenant_id)));
-- CREATE POLICY bank_acounts_select_same_tenant ON public.bank_acounts FOR SELECT TO PUBLIC USING (((tenant_id = current_tenant_id()) AND check_tenant_access_safe(tenant_id)));
-- CREATE POLICY bank_acounts_update_same_tenant ON public.bank_acounts FOR UPDATE TO PUBLIC USING (((tenant_id = current_tenant_id()) AND check_tenant_access_safe(tenant_id))) WITH CHECK (((tenant_id = current_tenant_id()) AND check_tenant_access_safe(tenant_id)));
-- CREATE POLICY bank_operation_history_delete_policy ON public.bank_operation_history FOR DELETE TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY bank_operation_history_insert_policy ON public.bank_operation_history FOR INSERT TO PUBLIC WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY bank_operation_history_select_policy ON public.bank_operation_history FOR SELECT TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY bank_operation_history_update_policy ON public.bank_operation_history FOR UPDATE TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true))))) WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY "Users can create standalone billing items in their tenant" ON public.billing_period_items FOR INSERT TO PUBLIC WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY "Users can delete standalone billing items from their tenant" ON public.billing_period_items FOR DELETE TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY "Users can update standalone billing items from their tenant" ON public.billing_period_items FOR UPDATE TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true))))) WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY "Users can view standalone billing items from their tenant" ON public.billing_period_items FOR SELECT TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.active = true)))));
-- CREATE POLICY charges_unified_delete_policy ON public.charges FOR DELETE TO authenticated USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY charges_unified_insert_policy ON public.charges FOR INSERT TO authenticated, anon WITH CHECK ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY charges_unified_select_policy ON public.charges FOR SELECT TO authenticated, anon USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))) OR (auth.uid() IS NULL)));
-- CREATE POLICY charges_unified_update_policy ON public.charges FOR UPDATE TO authenticated, anon USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))))) WITH CHECK ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY "Users can insert reconciliation_history for their tenant" ON public.conciliation_history FOR INSERT TO PUBLIC WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY "Users can view reconciliation_history from their tenant" ON public.conciliation_history FOR SELECT TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY "Users can manage reconciliation_rules for their tenant" ON public.conciliation_rules FOR ALL TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY "Users can view reconciliation_rules from their tenant" ON public.conciliation_rules FOR SELECT TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY conciliation_staging_tenant_context_isolation ON public.conciliation_staging FOR ALL TO PUBLIC USING (((tenant_id = get_tenant_id()) OR (get_tenant_id() IS NULL)));
-- CREATE POLICY service_role_full_access_conciliation_staging ON public.conciliation_staging FOR ALL TO service_role USING (true) WITH CHECK (true);
-- CREATE POLICY contract_attachments_tenant_access ON public.contract_attachments FOR ALL TO PUBLIC USING (user_has_tenant_access(tenant_id)) WITH CHECK (user_has_tenant_access(tenant_id));
-- CREATE POLICY "Acesso a itens de faturamento baseado em acesso ao faturamento" ON public.contract_billing_items FOR ALL TO PUBLIC USING ((billing_id IN ( SELECT contract_billings.id
--    FROM contract_billings
--   WHERE (contract_billings.tenant_id IN ( SELECT tenant_users.tenant_id
--            FROM tenant_users
--           WHERE (tenant_users.user_id = auth.uid()))))));
-- CREATE POLICY "Acesso a pagamentos baseado em tenant" ON public.contract_billing_payments FOR ALL TO PUBLIC USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY contract_billing_periods_tenant_secure ON public.contract_billing_periods FOR ALL TO PUBLIC USING ((((current_setting('app.current_tenant_id'::text, true) IS NOT NULL) AND (tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)) OR ((current_setting('app.tenant_id'::text, true) IS NOT NULL) AND (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY contract_billings_delete_policy ON public.contract_billings FOR DELETE TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))) AND (EXISTS ( SELECT 1
--    FROM (tenant_users tu
--      JOIN users u ON ((tu.user_id = u.id)))
--   WHERE ((tu.user_id = auth.uid()) AND (tu.tenant_id = contract_billings.tenant_id) AND (u.user_role = ANY (ARRAY['ADMIN'::text, 'MANAGER'::text])))))));
-- CREATE POLICY contract_billings_insert_policy ON public.contract_billings FOR INSERT TO authenticated WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY contract_billings_select_policy ON public.contract_billings FOR SELECT TO authenticated USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY contract_billings_update_policy ON public.contract_billings FOR UPDATE TO authenticated USING ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid())))) WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid()))));
-- CREATE POLICY contract_services_unified_delete_policy ON public.contract_services FOR DELETE TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY contract_services_unified_insert_policy ON public.contract_services FOR INSERT TO authenticated WITH CHECK ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY contract_services_unified_select_policy ON public.contract_services FOR SELECT TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY contract_services_unified_update_policy ON public.contract_services FOR UPDATE TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))));
-- CREATE POLICY "Acesso a histÃ³rico baseado em acesso ao contrato" ON public.contract_stage_history FOR ALL TO PUBLIC USING ((contract_id IN ( SELECT contracts.id
--    FROM contracts
--   WHERE (contracts.tenant_id IN ( SELECT tenant_users.tenant_id
--            FROM tenant_users
--           WHERE (tenant_users.user_id = auth.uid()))))));
-- CREATE POLICY "Allow contract_stage_history operations for development" ON public.contract_stage_history FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- CREATE POLICY simple_contract_stage_transitions_access ON public.contract_stage_transitions FOR ALL TO PUBLIC USING (check_user_tenant_access(tenant_id)) WITH CHECK (check_user_tenant_access(tenant_id));
-- CREATE POLICY "Allow contract_stages operations for development" ON public.contract_stages FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- CREATE POLICY simple_contract_stages_access ON public.contract_stages FOR ALL TO PUBLIC USING (((EXISTS ( SELECT 1
--    FROM pg_policies
--   WHERE ((pg_policies.tablename = 'contract_stages'::name) AND (pg_policies.policyname = 'Allow contract_stages operations for development'::name)))) OR check_user_tenant_access(tenant_id))) WITH CHECK (((EXISTS ( SELECT 1
--    FROM pg_policies
--   WHERE ((pg_policies.tablename = 'contract_stages'::name) AND (pg_policies.policyname = 'Allow contract_stages operations for development'::name)))) OR check_user_tenant_access(tenant_id)));
-- CREATE POLICY contracts_tenant_secure ON public.contracts FOR ALL TO PUBLIC USING ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id))) WITH CHECK ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id)));
-- CREATE POLICY customers_tenant_secure ON public.customers FOR ALL TO PUBLIC USING ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id))) WITH CHECK ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id)));
-- CREATE POLICY "Users can delete finance entries from their tenant" ON public.finance_entries FOR DELETE TO PUBLIC USING (((tenant_id = get_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY "Users can insert finance entries for their tenant" ON public.finance_entries FOR INSERT TO PUBLIC WITH CHECK (((tenant_id = get_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY "Users can update finance entries from their tenant" ON public.finance_entries FOR UPDATE TO PUBLIC USING (((tenant_id = get_tenant_id()) OR (auth.role() = 'service_role'::text))) WITH CHECK (((tenant_id = get_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY "Users can view finance entries from their tenant" ON public.finance_entries FOR SELECT TO PUBLIC USING (((tenant_id = get_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY financial_documents_delete ON public.financial_documents FOR DELETE TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_documents_insert ON public.financial_documents FOR INSERT TO PUBLIC WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_documents_select ON public.financial_documents FOR SELECT TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_documents_update ON public.financial_documents FOR UPDATE TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY fl_tenant_delete ON public.financial_launchs FOR DELETE TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_launchs.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY fl_tenant_insert ON public.financial_launchs FOR INSERT TO PUBLIC WITH CHECK (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_launchs.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY fl_tenant_select ON public.financial_launchs FOR SELECT TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_launchs.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY fl_tenant_update ON public.financial_launchs FOR UPDATE TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_launchs.tenant_id) AND (tenant_users.active = true)))))) WITH CHECK (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_launchs.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY financial_payables_delete ON public.financial_payables FOR DELETE TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_payables_insert ON public.financial_payables FOR INSERT TO PUBLIC WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_payables_select ON public.financial_payables FOR SELECT TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY financial_payables_update ON public.financial_payables FOR UPDATE TO PUBLIC USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
-- CREATE POLICY tenant_isolation_financial_settings_delete ON public.financial_settings FOR DELETE TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_settings.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY tenant_isolation_financial_settings_insert ON public.financial_settings FOR INSERT TO PUBLIC WITH CHECK (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_settings.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY tenant_isolation_financial_settings_select ON public.financial_settings FOR SELECT TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_settings.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY tenant_isolation_financial_settings_update ON public.financial_settings FOR UPDATE TO PUBLIC USING (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_settings.tenant_id) AND (tenant_users.active = true)))))) WITH CHECK (((tenant_id = current_tenant_id()) OR (auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = financial_settings.tenant_id) AND (tenant_users.active = true))))));
-- CREATE POLICY "Allow anonymous read access to health_check" ON public.health_check FOR SELECT TO anon USING (true);
-- CREATE POLICY strict_tenant_isolation_policy ON public.notification_templates FOR ALL TO PUBLIC USING ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id))) WITH CHECK ((tenant_id = COALESCE((current_setting('app.tenant_id'::text, true))::uuid, tenant_id)));
-- CREATE POLICY admin_full_access_policy ON public.notifications FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
--    FROM auth.users
--   WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));
-- CREATE POLICY tenant_strict_isolation_policy ON public.notifications FOR ALL TO PUBLIC USING (((tenant_id = COALESCE((current_setting('app.current_tenant_id'::text, true))::uuid, ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid())
--  LIMIT 1))) AND (EXISTS ( SELECT 1
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = notifications.tenant_id)))) AND (recipient_email = (( SELECT users.email
--    FROM auth.users
--   WHERE (users.id = auth.uid())))::text))) WITH CHECK (((tenant_id = COALESCE((current_setting('app.current_tenant_id'::text, true))::uuid, ( SELECT tenant_users.tenant_id
--    FROM tenant_users
--   WHERE (tenant_users.user_id = auth.uid())
--  LIMIT 1))) AND (EXISTS ( SELECT 1
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = notifications.tenant_id))))));
-- CREATE POLICY "Context Based Read Access" ON public.profiles FOR SELECT TO authenticated USING ((((context = 'TENANT'::text) AND (EXISTS ( SELECT 1
--    FROM tenant_users tu
--   WHERE (tu.user_id = auth.uid())))) OR ((context = 'RESELLER'::text) AND (EXISTS ( SELECT 1
--    FROM resellers_users ru
--   WHERE (ru.user_id = auth.uid())))) OR ((context = 'ADMIN'::text) AND ((EXISTS ( SELECT 1
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND (tu.role = 'SUPER_ADMIN'::text)))) OR (EXISTS ( SELECT 1
--    FROM resellers_users ru
--   WHERE ((ru.user_id = auth.uid()) AND ((ru.role)::text = 'SUPER_ADMIN'::text))))))));
-- CREATE POLICY "Super Admin Full Access" ON public.profiles FOR ALL TO authenticated USING (((EXISTS ( SELECT 1
--    FROM (auth.users u
--      JOIN tenant_users tu ON ((u.id = tu.user_id)))
--   WHERE ((u.id = auth.uid()) AND (tu.role = 'SUPER_ADMIN'::text)))) OR (EXISTS ( SELECT 1
--    FROM (auth.users u
--      JOIN resellers_users ru ON ((u.id = ru.user_id)))
--   WHERE ((u.id = auth.uid()) AND ((ru.role)::text = 'SUPER_ADMIN'::text))))));
-- CREATE POLICY receipts_tenant_isolation ON public.receipts FOR ALL TO PUBLIC USING ((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid));
-- CREATE POLICY "Admins do tenant podem gerenciar configuraÃ§Ãµes da rÃ©gua" ON public.regua_cobranca_config FOR ALL TO PUBLIC USING ((EXISTS ( SELECT 1
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = regua_cobranca_config.tenant_id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = 'TENANT_ADMIN'::text)))));
-- CREATE POLICY "UsuÃ¡rios do tenant podem ver configuraÃ§Ãµes da rÃ©gua" ON public.regua_cobranca_config FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
--    FROM tenant_users
--   WHERE ((tenant_users.tenant_id = regua_cobranca_config.tenant_id) AND (tenant_users.user_id = auth.uid())))));
-- CREATE POLICY "Admins do tenant podem gerenciar etapas da rÃ©gua" ON public.regua_cobranca_etapas FOR ALL TO PUBLIC USING (user_is_tenant_admin(tenant_id));
-- CREATE POLICY "UsuÃ¡rios do tenant podem ver etapas da rÃ©gua" ON public.regua_cobranca_etapas FOR SELECT TO PUBLIC USING (user_belongs_to_tenant(tenant_id));
-- CREATE POLICY "Permitir acesso a revendedores para usuÃ¡rios autenticados" ON public.resellers FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir acesso para usuÃ¡rios autenticados" ON public.resellers FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Reseller admins can manage users" ON public.resellers_users FOR ALL TO PUBLIC USING (((auth.uid() IN ( SELECT resellers_users.user_id
--    FROM users
--   WHERE ((users.user_role = 'RESELLER_ADMIN'::text) AND (users.id = auth.uid())))) OR (auth.uid() = user_id)));
-- CREATE POLICY "UsuÃ¡rios veem seus prÃ³prios vÃ­nculos" ON public.resellers_users FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
-- CREATE POLICY policy_sbe_tenant_isolation ON public.service_billing_events FOR ALL TO authenticated USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));
-- CREATE POLICY services_unified_delete_policy ON public.services FOR DELETE TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY services_unified_insert_policy ON public.services FOR INSERT TO PUBLIC WITH CHECK ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY services_unified_select_policy ON public.services FOR SELECT TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))) OR (auth.uid() IS NULL)));
-- CREATE POLICY services_unified_update_policy ON public.services FOR UPDATE TO PUBLIC USING ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true)))))))) WITH CHECK ((((get_current_tenant_context_robust() IS NOT NULL) AND (tenant_id = get_current_tenant_context_robust())) OR ((auth.uid() IS NOT NULL) AND (tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND ((tu.active IS NULL) OR (tu.active = true))))))));
-- CREATE POLICY "Secure tenant access to tasks" ON public.tasks FOR ALL TO PUBLIC USING ((tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND (tu.active = true) AND (tu.role = ANY (ARRAY['TENANT_ADMIN'::text, 'admin'::text, 'owner'::text])))))) WITH CHECK ((tenant_id IN ( SELECT tu.tenant_id
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND (tu.active = true) AND (tu.role = ANY (ARRAY['TENANT_ADMIN'::text, 'admin'::text, 'owner'::text]))))));
-- CREATE POLICY "Tenant context access to tasks" ON public.tasks FOR ALL TO postgres USING (((tenant_id)::text = current_setting('app.current_tenant_id'::text, true))) WITH CHECK (((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)));
-- CREATE POLICY attachments_delete ON public.tasks_attachments FOR DELETE TO PUBLIC USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text) AND (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)));
-- CREATE POLICY attachments_insert ON public.tasks_attachments FOR INSERT TO PUBLIC WITH CHECK (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text) AND (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)));
-- CREATE POLICY attachments_select ON public.tasks_attachments FOR SELECT TO PUBLIC USING (((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text) AND (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)));
-- CREATE POLICY admin_select_tenant_access_codes ON public.tenant_access_codes FOR SELECT TO PUBLIC USING ((auth.uid() IN ( SELECT tenant_users.user_id
--    FROM tenant_users
--   WHERE ((tenant_users.role = 'admin'::text) OR (tenant_users.role = 'owner'::text)))));
-- CREATE POLICY no_direct_delete ON public.tenant_access_codes FOR DELETE TO PUBLIC USING (false);
-- CREATE POLICY no_direct_insert ON public.tenant_access_codes FOR INSERT TO PUBLIC WITH CHECK (false);
-- CREATE POLICY no_direct_update ON public.tenant_access_codes FOR UPDATE TO PUBLIC USING (false);
-- CREATE POLICY tenant_access_codes_delete_policy ON public.tenant_access_codes FOR DELETE TO PUBLIC USING ((EXISTS ( SELECT 1
--    FROM users u
--   WHERE ((u.id = auth.uid()) AND ((u.user_role = 'ADMIN'::text) OR (u.user_role = 'SUPER_ADMIN'::text))))));
-- CREATE POLICY tenant_access_codes_insert_policy ON public.tenant_access_codes FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
-- CREATE POLICY tenant_access_codes_select_policy ON public.tenant_access_codes FOR SELECT TO PUBLIC USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
--    FROM users u
--   WHERE ((u.id = auth.uid()) AND ((u.user_role = 'ADMIN'::text) OR (u.user_role = 'SUPER_ADMIN'::text)))))));
-- CREATE POLICY tenant_access_codes_update_policy ON public.tenant_access_codes FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));
-- CREATE POLICY tenant_integrations_delete_policy_v2 ON public.tenant_integrations FOR DELETE TO PUBLIC USING (((tenant_id = get_current_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY tenant_integrations_insert_policy_v2 ON public.tenant_integrations FOR INSERT TO PUBLIC WITH CHECK (((tenant_id = get_current_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY tenant_integrations_select_policy_v2 ON public.tenant_integrations FOR SELECT TO PUBLIC USING (((tenant_id = get_current_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY tenant_integrations_update_policy_v2 ON public.tenant_integrations FOR UPDATE TO PUBLIC USING (((tenant_id = get_current_tenant_id()) OR (auth.role() = 'service_role'::text))) WITH CHECK (((tenant_id = get_current_tenant_id()) OR (auth.role() = 'service_role'::text)));
-- CREATE POLICY "Admins do tenant podem gerenciar convites" ON public.tenant_invites FOR ALL TO PUBLIC USING (user_is_tenant_admin(tenant_id));
-- CREATE POLICY "Users can view invites sent to them" ON public.tenant_invites FOR SELECT TO PUBLIC USING ((email = (( SELECT users.email
--    FROM auth.users
--   WHERE (users.id = auth.uid())))::text));
-- CREATE POLICY "UsuÃ¡rios do tenant podem ver convites" ON public.tenant_invites FOR SELECT TO PUBLIC USING (user_belongs_to_tenant(tenant_id));
-- CREATE POLICY public_read_pending_invites_by_token ON public.tenant_invites FOR SELECT TO PUBLIC USING (((status = 'PENDING'::text) AND (expires_at > now())));
-- CREATE POLICY simple_tenant_invites_policy ON public.tenant_invites FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- CREATE POLICY tenant_admin_invites_policy ON public.tenant_invites FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
--    FROM tenant_users
--   WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = tenant_invites.tenant_id) AND (tenant_users.role = 'TENANT_ADMIN'::text)))));
-- CREATE POLICY user_invites_policy ON public.tenant_invites FOR SELECT TO authenticated USING (((email = (( SELECT users.email
--    FROM auth.users
--   WHERE (users.id = auth.uid())))::text) OR (user_id = auth.uid())));
-- CREATE POLICY "Allow auth admin to read tenant_users" ON public.tenant_users FOR SELECT TO supabase_auth_admin USING (true);
-- CREATE POLICY "Users can view their own tenant associations" ON public.tenant_users FOR SELECT TO PUBLIC USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
--    FROM users
--   WHERE ((users.id = auth.uid()) AND (users.user_role = ANY (ARRAY['ADMIN'::text, 'RESELLER'::text])))))));
-- CREATE POLICY simple_tenant_users_access ON public.tenant_users FOR ALL TO PUBLIC USING (((EXISTS ( SELECT 1
--    FROM pg_policies
--   WHERE ((pg_policies.tablename = 'tenant_users'::name) AND (pg_policies.policyname = 'simple_tenant_users_policy'::name)))) OR check_user_tenant_access(tenant_id) OR (user_id = auth.uid()))) WITH CHECK (((EXISTS ( SELECT 1
--    FROM pg_policies
--   WHERE ((pg_policies.tablename = 'tenant_users'::name) AND (pg_policies.policyname = 'simple_tenant_users_policy'::name)))) OR check_user_tenant_access(tenant_id) OR (user_id = auth.uid())));
-- CREATE POLICY simple_tenant_users_policy ON public.tenant_users FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- CREATE POLICY supabase_auth_admin_tenant_users_select ON public.tenant_users FOR SELECT TO supabase_auth_admin USING (true);
-- CREATE POLICY user_tenant_users_policy ON public.tenant_users FOR SELECT TO authenticated USING ((user_id = auth.uid()));
-- CREATE POLICY "Allow authenticated delete access" ON public.tenants FOR DELETE TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated insert access" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Allow authenticated read access" ON public.tenants FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated update access" ON public.tenants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow users to select tenants they belong to" ON public.tenants FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
--    FROM tenant_users tu
--   WHERE ((tu.user_id = auth.uid()) AND (tu.tenant_id = tenants.id)))));
-- CREATE POLICY supabase_auth_admin_tenants_select ON public.tenants FOR SELECT TO supabase_auth_admin USING (true);
-- CREATE POLICY "Allow auth admin to read users" ON public.users FOR SELECT TO supabase_auth_admin USING (true);
*/
-- CREATE POLICY enable_all_authenticated_users ON public.users FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
