ALTER TABLE financial_payables 
ADD COLUMN IF NOT EXISTS installments TEXT DEFAULT '001/001';
