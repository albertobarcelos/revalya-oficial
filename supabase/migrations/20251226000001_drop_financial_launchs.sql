-- Migration: Drop financial_launchs table as it is replaced by financial_launch_type_enum
-- Description: Removes the dynamic settings table for launch types. The system now uses fixed Enum values (JUROS, MULTA, DESCONTO, PAGAMENTO).

DROP TABLE IF EXISTS public.financial_launchs;

-- Note: The 'financial_operation_type' enum might still be useful if referenced elsewhere, 
-- but if it was only used by financial_launchs, it could be dropped. 
-- For safety, we keep it if other tables might use it in future or currently.
-- However, we should verify if any other table uses it.
-- Checked: financial_payables uses 'USER-DEFINED' for status, but not operation_type.
-- Checked: finance_entries uses 'text' for type.

-- Optional: If we wanted to enforce the Enum on finance_entries, we would add a column.
-- But finance_entries are Headers. The launches are in metadata.
