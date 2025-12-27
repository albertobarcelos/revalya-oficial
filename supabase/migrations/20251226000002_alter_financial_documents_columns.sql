-- Migration: Change financial_documents columns from UUID to TEXT to support Enum keys
-- Description: Since financial_launchs table was dropped and replaced by static Enums,
-- we need to store the Enum keys (e.g., 'JUROS', 'MULTA') instead of UUIDs in financial_documents.

ALTER TABLE public.financial_documents
  ALTER COLUMN open_id TYPE text USING NULL, -- Resetting to NULL as old UUIDs are invalid references now
  ALTER COLUMN settle_id TYPE text USING NULL,
  ALTER COLUMN addition_id TYPE text USING NULL;
