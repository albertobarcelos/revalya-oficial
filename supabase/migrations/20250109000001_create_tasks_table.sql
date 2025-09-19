-- Migration: Criar tabela tasks para sistema de tarefas multi-tenant
-- Autor: Sistema Revalya
-- Data: 2025-01-09

-- Criar tabela tasks com estrutura completa
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT,
    client_id UUID,
    charge_id UUID,
    due_date DATE,
    priority TEXT DEFAULT 'medium'::text,
    status TEXT DEFAULT 'pending'::text,
    created_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
    tenant_id UUID NOT NULL
);

-- AIDEV-NOTE: Adicionar foreign keys conforme especificado
-- Foreign key para tabela customers (client_id)
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES public.customers(id) 
ON DELETE SET NULL;

-- Foreign key para tabela charges (charge_id) 
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_charge_id_fkey 
FOREIGN KEY (charge_id) 
REFERENCES public.charges(id) 
ON DELETE SET NULL;

-- Foreign key para tabela tenants (tenant_id)
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_charge_id ON public.tasks(charge_id) WHERE charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(tenant_id, created_at DESC);

-- Habilitar RLS (Row Level Security) para isolamento multi-tenant
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários só podem acessar tarefas do seu tenant
CREATE POLICY "Tenant isolation for tasks"
ON public.tasks FOR ALL
USING (
    tenant_id = COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        (auth.jwt() ->> 'tenant_id')::UUID
    )
);

-- Política para administradores (opcional)
CREATE POLICY "Admin access to tasks"
ON public.tasks FOR ALL
USING (
    auth.uid() IN (
        SELECT user_id FROM public.tenant_users
        WHERE tenant_id = tasks.tenant_id
        AND role IN ('admin', 'owner')
        AND active = true
    )
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tasks_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.tasks IS 'Tabela de tarefas do sistema multi-tenant';
COMMENT ON COLUMN public.tasks.id IS 'Identificador único da tarefa';
COMMENT ON COLUMN public.tasks.title IS 'Título da tarefa';
COMMENT ON COLUMN public.tasks.description IS 'Descrição detalhada da tarefa';
COMMENT ON COLUMN public.tasks.client_name IS 'Nome do cliente (cache para performance)';
COMMENT ON COLUMN public.tasks.client_id IS 'Referência ao cliente (FK para customers)';
COMMENT ON COLUMN public.tasks.charge_id IS 'Referência à cobrança (FK para charges)';
COMMENT ON COLUMN public.tasks.due_date IS 'Data de vencimento da tarefa';
COMMENT ON COLUMN public.tasks.priority IS 'Prioridade: low, medium, high';
COMMENT ON COLUMN public.tasks.status IS 'Status: pending, in_progress, completed';
COMMENT ON COLUMN public.tasks.tenant_id IS 'ID do tenant (obrigatório para isolamento)';
COMMENT ON COLUMN public.tasks.created_at IS 'Data de criação';
COMMENT ON COLUMN public.tasks.completed_at IS 'Data de conclusão';
COMMENT ON COLUMN public.tasks.updated_at IS 'Data da última atualização';

-- Verificar se as tabelas referenciadas existem
DO $$
BEGIN
    -- Verificar se a tabela customers existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        RAISE NOTICE 'AVISO: Tabela customers não encontrada. A foreign key tasks_client_id_fkey pode falhar.';
    END IF;
    
    -- Verificar se a tabela charges existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'charges') THEN
        RAISE NOTICE 'AVISO: Tabela charges não encontrada. A foreign key tasks_charge_id_fkey pode falhar.';
    END IF;
    
    -- Verificar se a tabela tenants existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenants') THEN
        RAISE NOTICE 'AVISO: Tabela tenants não encontrada. A foreign key tasks_tenant_id_fkey pode falhar.';
    END IF;
END
$$;