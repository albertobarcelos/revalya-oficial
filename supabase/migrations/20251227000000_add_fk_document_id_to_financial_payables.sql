ALTER TABLE financial_payables
ADD CONSTRAINT financial_payables_document_id_fkey
FOREIGN KEY (document_id)
REFERENCES financial_documents(id)
ON DELETE SET NULL;
