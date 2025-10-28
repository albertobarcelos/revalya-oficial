create table public.services (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  code character varying(50) null,
  name character varying(255) not null,
  description text null,
  municipality_code character varying(50) null,
  lc_code character varying(50) null,
  tax_code character varying(50) null,
  default_price numeric(10, 2) not null,
  tax_rate numeric(5, 2) null default 0,
  withholding_tax boolean null default false,
  is_active boolean null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  no_charge boolean not null default false,
  unit_type character varying(50) null,
  cost_price numeric null default 0,
  constraint services_pkey primary key (id),
  constraint services_tenant_id_code_key unique (tenant_id, code),
  constraint services_tenant_id_fkey foreign KEY (tenant_id) references tenants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_services_service_type on public.services using btree (unit_type) TABLESPACE pg_default
where
  (unit_type is not null);

create index IF not exists idx_services_active on public.services using btree (tenant_id, is_active) TABLESPACE pg_default;

create index IF not exists idx_services_tenant_id on public.services using btree (tenant_id) TABLESPACE pg_default;

create trigger update_services_updated_at BEFORE
update on services for EACH row
execute FUNCTION update_updated_at_column ();