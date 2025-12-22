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
  - category: NEW.category_id::text
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
    NEW.id, -- CORRIGIDO: Removido ::text pois a coluna destino é UUID
    COALESCE(NEW.category_id::text, NULL),
    auth.uid()
  );
  RETURN NEW;
END;
$function$;
