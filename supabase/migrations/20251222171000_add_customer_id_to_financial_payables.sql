ALTER TABLE financial_payables 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN financial_payables.customer_id IS 'Reference to the customer/supplier (Favorecido)';
