-- =====================================================
-- Migration: Criar Tabela invites
-- Data: 2025-12-21
-- Descrição: Cria a tabela invites para armazenar convites genéricos
--            (usada por create_reseller_with_invite para convites de revendedores)
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Criar tabela invites para convites genéricos
-- Esta tabela é usada pela função create_reseller_with_invite
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at TIMESTAMPTZ
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON public.invites(created_by);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON public.invites(expires_at);

-- Índice para buscar convites não utilizados
CREATE INDEX IF NOT EXISTS idx_invites_unused ON public.invites(token) 
    WHERE used_at IS NULL;

-- Comentários descritivos
COMMENT ON TABLE public.invites IS 
    'Tabela de convites genéricos do sistema. Usada para convites de revendedores e outros tipos de convites.';
COMMENT ON COLUMN public.invites.token IS 
    'Token único para o convite. Usado para validar e aceitar o convite.';
COMMENT ON COLUMN public.invites.metadata IS 
    'Metadados do convite em formato JSON. Pode conter type, reseller_id, role, etc.';
COMMENT ON COLUMN public.invites.used_at IS 
    'Data/hora em que o convite foi utilizado. NULL se ainda não foi usado.';

-- RLS Policies
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver seus próprios convites criados
CREATE POLICY "invites_select_own" 
    ON public.invites
    FOR SELECT
    USING (auth.uid() = created_by);

-- Policy: Apenas usuários autenticados podem criar convites
CREATE POLICY "invites_insert_authenticated" 
    ON public.invites
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Usuários podem atualizar convites que criaram
CREATE POLICY "invites_update_own" 
    ON public.invites
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Policy: Permitir leitura pública por token (para validação de convites)
-- Isso permite que usuários não autenticados validem convites usando o token
CREATE POLICY "invites_select_by_token" 
    ON public.invites
    FOR SELECT
    USING (true); -- Permitir leitura pública para validação de convites

COMMIT;

