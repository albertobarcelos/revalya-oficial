-- =====================================================
-- Migration: Corrigir Foreign Keys de Customers na DEVELOP
-- Data: 2025-12-21
-- Descrição: Adiciona foreign keys faltantes relacionadas a customers
--            para o PostgREST reconhecer os relacionamentos em joins
--            (charges, contracts, tasks)
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Criar foreign key charges_customer_id_fkey (CRÍTICA - usada pelo PostgREST)
-- Esta foreign key permite joins como: charges?select=*,customer:customers(*)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'charges_customer_id_fkey'
    AND conrelid = 'public.charges'::regclass
  ) THEN
    ALTER TABLE public.charges
    ADD CONSTRAINT charges_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key charges_customer_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key charges_customer_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key contracts_customer_id_fkey (CRÍTICA - usada pelo PostgREST)
-- Esta foreign key permite joins como: contracts?select=*,customers!inner(*)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_customer_id_fkey'
    AND conrelid = 'public.contracts'::regclass
  ) THEN
    ALTER TABLE public.contracts
    ADD CONSTRAINT contracts_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;
    
    RAISE NOTICE 'Foreign key contracts_customer_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key contracts_customer_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tasks_client_id_fkey (CRÍTICA - usada pelo PostgREST)
-- Esta foreign key permite joins como: tasks?select=*,client:customers(*)
-- Nota: A coluna em tasks é "client_id", não "customer_id"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_client_id_fkey'
    AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key tasks_client_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tasks_client_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key tasks_charge_id_fkey (CRÍTICA - usada pelo PostgREST)
-- Esta foreign key permite joins como: tasks?select=*,charge:charges(*)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_charge_id_fkey'
    AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_charge_id_fkey
    FOREIGN KEY (charge_id) REFERENCES public.charges(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key tasks_charge_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key tasks_charge_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key charges_contract_id_fkey (CRÍTICA - usada pelo PostgREST)
-- Esta foreign key permite joins como: charges?select=*,contracts(id,contract_number)
-- Nota: Verifica ambos os nomes possíveis (fk_charges_contract_id ou charges_contract_id_fkey)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE (conname = 'fk_charges_contract_id' OR conname = 'charges_contract_id_fkey')
    AND conrelid = 'public.charges'::regclass
  ) THEN
    ALTER TABLE public.charges
    ADD CONSTRAINT charges_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Foreign key charges_contract_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key charges_contract_id já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key message_history_customer_id_fkey (se necessário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_history_customer_id_fkey'
    AND conrelid = 'public.message_history'::regclass
  ) THEN
    ALTER TABLE public.message_history
    ADD CONSTRAINT message_history_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key message_history_customer_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key message_history_customer_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Criar foreign key customers_tenant_id_fkey (se necessário)
-- Garante que customers está relacionado com tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_tenant_id_fkey'
    AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
    ADD CONSTRAINT customers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key customers_tenant_id_fkey criada';
  ELSE
    RAISE NOTICE 'Foreign key customers_tenant_id_fkey já existe';
  END IF;
END $$;

-- AIDEV-NOTE: Comentários descritivos (idempotentes)
-- Comentar constraints apenas se existirem
DO $$
BEGIN
  -- Comentar charges_customer_id_fkey
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'charges_customer_id_fkey'
    AND conrelid = 'public.charges'::regclass
  ) THEN
    COMMENT ON CONSTRAINT charges_customer_id_fkey ON public.charges IS 
      'Foreign key para relacionamento com customers - necessário para PostgREST reconhecer joins';
  END IF;
  
  -- Comentar contracts_customer_id_fkey
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_customer_id_fkey'
    AND conrelid = 'public.contracts'::regclass
  ) THEN
    COMMENT ON CONSTRAINT contracts_customer_id_fkey ON public.contracts IS 
      'Foreign key para relacionamento com customers - necessário para PostgREST reconhecer joins';
  END IF;
  
  -- Comentar tasks_client_id_fkey
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_client_id_fkey'
    AND conrelid = 'public.tasks'::regclass
  ) THEN
    COMMENT ON CONSTRAINT tasks_client_id_fkey ON public.tasks IS 
      'Foreign key para relacionamento com customers (client_id) - necessário para PostgREST reconhecer joins';
  END IF;
  
  -- Comentar tasks_charge_id_fkey
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_charge_id_fkey'
    AND conrelid = 'public.tasks'::regclass
  ) THEN
    COMMENT ON CONSTRAINT tasks_charge_id_fkey ON public.tasks IS 
      'Foreign key para relacionamento com charges - necessário para PostgREST reconhecer joins';
  END IF;
  
  -- Comentar charges_contract_id_fkey (verifica ambos os nomes possíveis)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE (conname = 'fk_charges_contract_id' OR conname = 'charges_contract_id_fkey')
    AND conrelid = 'public.charges'::regclass
  ) THEN
    -- Comentar usando o nome que existe
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'charges_contract_id_fkey'
      AND conrelid = 'public.charges'::regclass
    ) THEN
      COMMENT ON CONSTRAINT charges_contract_id_fkey ON public.charges IS 
        'Foreign key para relacionamento com contracts - necessário para PostgREST reconhecer joins';
    ELSIF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'fk_charges_contract_id'
      AND conrelid = 'public.charges'::regclass
    ) THEN
      COMMENT ON CONSTRAINT fk_charges_contract_id ON public.charges IS 
        'Foreign key para relacionamento com contracts - necessário para PostgREST reconhecer joins';
    END IF;
  END IF;
END $$;

COMMIT;

