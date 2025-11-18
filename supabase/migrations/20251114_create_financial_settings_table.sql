-- Create financial settings enum and table (multi-tenant)
-- Distinction by type: EXPENSE_CATEGORY | DOCUMENT_TYPE | ENTRY_TYPE

-- Enum
create type public.financial_setting_type as enum ('EXPENSE_CATEGORY','DOCUMENT_TYPE','ENTRY_TYPE');

-- Table
create table if not exists public.financial_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type public.financial_setting_type not null,
  name text not null,
  code text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique name per tenant/type (case-insensitive)
create unique index if not exists financial_settings_unique_name
  on public.financial_settings (tenant_id, type, lower(name));

-- Optional unique code per tenant/type
create unique index if not exists financial_settings_unique_code
  on public.financial_settings (tenant_id, type, lower(code))
  where code is not null;

-- Listing index
create index if not exists financial_settings_list_idx
  on public.financial_settings (tenant_id, type, is_active, sort_order);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_financial_settings_updated_at on public.financial_settings;
create trigger trg_financial_settings_updated_at
before update on public.financial_settings
for each row execute function public.set_updated_at();

-- RLS policies using app tenant context (compatible com set_tenant_context_simple)
alter table public.financial_settings enable row level security;

create policy financial_settings_select on public.financial_settings
for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy financial_settings_insert on public.financial_settings
for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy financial_settings_update on public.financial_settings
for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy financial_settings_delete on public.financial_settings
for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

