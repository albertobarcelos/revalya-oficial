create table public.contract_services (
  id uuid not null default extensions.uuid_generate_v4 (),
  contract_id uuid not null - Puxar o ID do contrato vinculado ao cliente que criamos anteriormente
  service_id uuid not null - Puxar o ID do serviço que está na tabela contratos_prontos linha 1 - abaixo das colunas que são serviços, cada ID é um serviço diferente e no 
  
  quantity numeric(10, 4) not null default 1 - c1552361-c1db-43ae-ad3a-9a6f8143f668 é necessário considerar as quantidades. O resto é tudo 1.
  unit_price numeric(10, 2) not null, 35.00 cada unidade de serviço
  discount_percentage numeric(10, 6) null default 0,
  discount_amount numeric GENERATED ALWAYS as (
    round(
      ((unit_price * quantity) * discount_percentage),
      2
    )
  ) STORED (10, 2) null,
  total_amount numeric GENERATED ALWAYS as (
    round(
      (
        (unit_price * quantity) - ((unit_price * quantity) * discount_percentage)
      ),
      2
    )
  ) STORED (10, 2) null,
  tax_rate numeric(5, 2) null default 0,
  tax_amount numeric GENERATED ALWAYS as (
    round(
      (
        (
          (unit_price * quantity) - ((unit_price * quantity) * discount_percentage)
        ) * (tax_rate / (100)::numeric)
      ),
      2
    )
  ) STORED (10, 2) null,
  description text null,
  is_active boolean null default true, - true
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  tenant_id uuid null, - id do tenant que está no contrato
  payment_method character varying(50) null, Boleto
  card_type character varying(20) null,
  billing_type character varying(50) null, Único
  recurrence_frequency character varying(50) null, Mensal
  installments integer null default 1,
  payment_gateway text null,
  due_next_month boolean null default false,
  no_charge boolean not null default false,
  generate_billing boolean not null default true, FALSE
  due_type text not null default 'days_after_billing'::text, days_after_billing
  due_value integer not null default 5,
  cost_price numeric(10, 2) null default 0, aqui você irá colocar apenas nos serviços com o ID dbad5192-79b1-41e6-adbd-5218167c738c ai o custo é o presente na coluna "Custo" dentro da planilha.
  precisa ser respeitado o custo de cada cliente/contrato.
  constraint contract_services_pkey primary key (id),
  constraint contract_services_contract_id_service_id_key unique (contract_id, service_id),
  constraint contract_services_contract_id_fkey foreign KEY (contract_id) references contracts (id) on delete CASCADE,
  constraint contract_services_service_id_fkey foreign KEY (service_id) references services (id) on delete RESTRICT,
  constraint contract_services_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on update CASCADE on delete CASCADE,
  constraint chk_installments_positive check ((installments > 0)),
  constraint check_due_type check (
    (
      due_type = any (
        array['days_after_billing'::text, 'fixed_day'::text]
      )
    )
  ),
  constraint chk_recurrence_frequency check (
    (
      (
        (recurrence_frequency)::text = any (
          array[
            ('Mensal'::character varying)::text,
            ('Trimestral'::character varying)::text,
            ('Semestral'::character varying)::text,
            ('Anual'::character varying)::text,
            ('Único'::character varying)::text
          ]
        )
      )
      or (recurrence_frequency is null)
    )
  ),
  constraint chk_payment_method check (
    (
      (
        (payment_method)::text = any (
          array[
            ('PIX'::character varying)::text,
            ('Boleto'::character varying)::text,
            ('Cartão'::character varying)::text,
            ('Transferência'::character varying)::text
          ]
        )
      )
      or (payment_method is null)
    )
  ),
  constraint check_due_value_positive check ((due_value > 0)),
  constraint chk_billing_type check (
    (
      (
        (billing_type)::text = any (
          array[
            ('Mensal'::character varying)::text,
            ('Trimestral'::character varying)::text,
            ('Semestral'::character varying)::text,
            ('Anual'::character varying)::text,
            ('Único'::character varying)::text
          ]
        )
      )
      or (billing_type is null)
    )
  ),
  constraint chk_card_type check (
    (
      (card_type is null)
      or (
        (card_type)::text = any (
          (
            array[
              'debit'::character varying,
              'credit'::character varying,
              'credit_recurring'::character varying
            ]
          )::text[]
        )
      )
    )
  ),
  constraint chk_card_type_with_payment_method check (
    (
      (
        ((payment_method)::text = 'Cartão'::text)
        and (card_type is not null)
      )
      or (
        ((payment_method)::text <> 'Cartão'::text)
        and (card_type is null)
      )
      or (payment_method is null)
    )
  )
) TABLESPACE pg_default;