-- =====================================================
-- MIGRAÇÃO: CRIAÇÃO DA TABELA BANK_OPERATION_HISTORY
-- Data: 2025-11-25
-- Descrição: Registro unificado de operações financeiras (crédito/débito)
-- Autor: Sistema Revalya
-- =====================================================

-- Criar tipo ENUM para tipo de operação bancária
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_operation_type') THEN
    CREATE TYPE bank_operation_type AS ENUM ('CREDIT', 'DEBIT');
  END IF;
END $$;

-- Criar tabela de histórico de operações bancárias
CREATE TABLE IF NOT EXISTS public.bank_operation_history (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Relacionamentos
  bank_acount_id UUID REFERENCES bank_acounts(id) ON DELETE SET NULL,

  -- Dados da operação
  operation_type bank_operation_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  operation_date TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo'::text, now()),
  description TEXT,
  document_reference TEXT,
  category TEXT,

  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('America/Sao_Paulo'::text, now()),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance em filtros comuns
CREATE INDEX IF NOT EXISTS idx_bank_operation_history_tenant_account_date 
  ON public.bank_operation_history(tenant_id, bank_acount_id, operation_date DESC);

CREATE INDEX IF NOT EXISTS idx_bank_operation_history_tenant_type_date 
  ON public.bank_operation_history(tenant_id, operation_type, operation_date DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_bank_operation_history_updated_at()
RETURNS TRIGGER AS $$
/*
  Atualiza a coluna updated_at com o timestamp atual em fuso horário São Paulo
  sempre que um registro de bank_operation_history for alterado.
*/
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se não existir (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bank_operation_history_updated_at'
  ) THEN
    CREATE TRIGGER bank_operation_history_updated_at
      BEFORE UPDATE ON public.bank_operation_history
      FOR EACH ROW
      EXECUTE FUNCTION public.update_bank_operation_history_updated_at();
  END IF;
END $$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.bank_operation_history ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "bank_operation_history_select_policy" ON public.bank_operation_history
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- INSERT
CREATE POLICY "bank_operation_history_insert_policy" ON public.bank_operation_history
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- UPDATE
CREATE POLICY "bank_operation_history_update_policy" ON public.bank_operation_history
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- DELETE
CREATE POLICY "bank_operation_history_delete_policy" ON public.bank_operation_history
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Comentários descritivos
COMMENT ON TABLE public.bank_operation_history IS 'Histórico de operações financeiras (créditos e débitos) por conta bancária';
COMMENT ON COLUMN public.bank_operation_history.operation_type IS 'Tipo da operação: CREDIT (crédito) ou DEBIT (débito)';
COMMENT ON COLUMN public.bank_operation_history.document_reference IS 'Referência ao documento/fonte relacionado (ex.: ID da conta a pagar)';
COMMENT ON COLUMN public.bank_operation_history.category IS 'Classificação/categoria textual da operação';