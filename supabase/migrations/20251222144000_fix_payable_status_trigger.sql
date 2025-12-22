CREATE OR REPLACE FUNCTION public.set_financial_payable_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Cancelado preserva
  IF NEW.status = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  -- Verifica se está pago pelo valor
  -- Considera pago se paid_amount >= net_amount (ou gross_amount se net for nulo)
  -- E o valor total deve ser > 0 para evitar falsos positivos em contas zeradas (se existirem)
  IF COALESCE(NEW.paid_amount, 0) >= COALESCE(NEW.net_amount, NEW.gross_amount, 0) 
     AND COALESCE(NEW.net_amount, NEW.gross_amount, 0) > 0 THEN
       NEW.status := 'PAID';
       -- Garante data de pagamento se não houver
       IF NEW.payment_date IS NULL THEN
          NEW.payment_date := current_date;
       END IF;
       RETURN NEW;
  END IF;

  -- Se foi marcado explicitamente como PAID mas o valor pago é menor, aceitamos se a aplicação mandou
  IF NEW.status = 'PAID' THEN
     RETURN NEW;
  END IF;

  -- Se não está totalmente pago nem cancelado, recalculamos o status baseado no vencimento

  -- Sem vencimento: pendente
  IF NEW.due_date IS NULL THEN
    NEW.status := 'PENDING';
    RETURN NEW;
  END IF;

  -- Vence hoje
  IF current_date = NEW.due_date THEN
    NEW.status := 'DUE_TODAY';

  -- Vencido
  ELSIF current_date > NEW.due_date THEN
    NEW.status := 'OVERDUE';

  -- A vencer baseado na emissão: se a diferença due_date - issue_date ≤ 7 dias
  ELSIF NEW.issue_date IS NOT NULL AND (NEW.due_date - NEW.issue_date) <= 7 THEN
    NEW.status := 'DUE_SOON';

  -- A vencer: dentro da janela de 7 dias até o vencimento (baseado na data atual)
  ELSIF current_date >= (NEW.due_date - interval '7 days')::date THEN
    NEW.status := 'DUE_SOON';

  -- Pendente: fora da janela
  ELSE
    NEW.status := 'PENDING';
  END IF;

  RETURN NEW;
END;
$function$;
