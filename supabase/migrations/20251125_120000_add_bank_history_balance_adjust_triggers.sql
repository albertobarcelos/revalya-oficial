-- =====================================================
-- TRIGGERS: Ajuste automático de saldo em bank_acounts
-- Origem: bank_operation_history (CREDIT/DEBIT)
-- Data: 2025-11-25
-- Autor: Sistema Revalya
-- =====================================================

-- Função: ajuste após INSERT em bank_operation_history
CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_insert()
RETURNS TRIGGER AS $$
/*
  Ajusta current_balance da conta bancária associada ao registro
  inserido em bank_operation_history.
  Regras:
  - CREDIT: soma amount
  - DEBIT: subtrai amount
  - Ignora quando bank_acount_id é NULL
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: ajuste após UPDATE em bank_operation_history
CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_update()
RETURNS TRIGGER AS $$
/*
  Ajusta current_balance considerando mudanças em amount, operation_type
  e/ou bank_acount_id.
  - Se a conta mudou: remove efeito antigo da conta OLD e aplica efeito
    novo na conta NEW.
  - Caso contrário: aplica apenas a diferença (novo - antigo) na mesma conta.
  - Ignora quando ambas as contas são NULL.
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
    -- Mesma conta: aplica diferença
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: ajuste após DELETE em bank_operation_history
CREATE OR REPLACE FUNCTION public.adjust_balance_on_history_delete()
RETURNS TRIGGER AS $$
/*
  Reverte o efeito do registro removido de bank_operation_history
  no current_balance da conta bancária associada.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers vinculadas à tabela bank_operation_history
DROP TRIGGER IF EXISTS bank_history_adjust_on_insert ON public.bank_operation_history;
CREATE TRIGGER bank_history_adjust_on_insert
  AFTER INSERT ON public.bank_operation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_balance_on_history_insert();

DROP TRIGGER IF EXISTS bank_history_adjust_on_update ON public.bank_operation_history;
CREATE TRIGGER bank_history_adjust_on_update
  AFTER UPDATE ON public.bank_operation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_balance_on_history_update();

DROP TRIGGER IF EXISTS bank_history_adjust_on_delete ON public.bank_operation_history;
CREATE TRIGGER bank_history_adjust_on_delete
  AFTER DELETE ON public.bank_operation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.adjust_balance_on_history_delete();