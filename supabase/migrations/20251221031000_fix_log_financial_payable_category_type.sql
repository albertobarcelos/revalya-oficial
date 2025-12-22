CREATE OR REPLACE FUNCTION log_financial_payable_insert_to_history()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
/*
  Registra uma operação DEBIT em bank_operation_history quando uma
  conta a pagar é criada em financial_payables.

  Campos mapeados:
  - tenant_id: NEW.tenant_id
  - bank_acount_id: NEW.bank_account_id
  - operation_type: 'DEBIT'
  - amount: NEW.net_amount
  - operation_date: timezone('America/Sao_Paulo', now())
  - description: NEW.description
  - document_reference: NEW.id
  - category: NEW.category_id
*/
BEGIN
  INSERT INTO public.bank_operation_history (
    tenant_id,
    bank_acount_id,
    operation_type,
    amount,
    operation_date,
    description,
    document_reference,
    category,
    created_by
  ) VALUES (
    NEW.tenant_id,
    NEW.bank_account_id,
    'DEBIT'::bank_operation_type,
    COALESCE(NEW.net_amount, 0),
    timezone('America/Sao_Paulo'::text, now()),
    NEW.description,
    NEW.id,
    NEW.category_id, -- CORRIGIDO: Removido ::text pois a coluna destino é UUID
    auth.uid()
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION log_financial_payable_payment_to_history()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
/*
  Registra uma operação DEBIT em bank_operation_history quando uma
  conta a pagar é marcada como PAID.

  Critérios:
  - NEW.status = 'PAID'
  - NEW.payment_date IS NOT NULL
  - Mudança relevante em payment_date, status ou paid_amount
*/
DECLARE
  v_amount NUMERIC(18,2);
BEGIN
  IF NEW.status = 'PAID' AND NEW.payment_date IS NOT NULL AND (
       COALESCE(OLD.payment_date, 'epoch'::date) IS DISTINCT FROM NEW.payment_date
    OR COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status
    OR COALESCE(OLD.paid_amount, -1) IS DISTINCT FROM COALESCE(NEW.paid_amount, -1)
  ) THEN
    v_amount := COALESCE(NEW.paid_amount, NEW.net_amount, 0);
    INSERT INTO public.bank_operation_history (
      tenant_id,
      bank_acount_id,
      operation_type,
      amount,
      operation_date,
      description,
      document_reference,
      category,
      created_by
    ) VALUES (
      NEW.tenant_id,
      NEW.bank_account_id,
      'DEBIT'::bank_operation_type,
      v_amount,
      NEW.payment_date::timestamptz,
      NEW.description,
      NEW.id,
      NEW.category_id, -- CORRIGIDO: Removido ::text pois a coluna destino é UUID
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$function$;
