-- AIDEV-NOTE: Criar bucket Storage para documentos fiscais
-- Armazena XML, PDF/DANFE e Recibos gerados

-- Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fiscal-documents',
  'fiscal-documents',
  false, -- Privado (requer autenticação)
  52428800, -- 50MB limite por arquivo
  ARRAY['application/xml', 'application/pdf', 'text/xml']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Usuários autenticados do tenant podem ler seus próprios documentos
CREATE POLICY "Usuários podem ler documentos fiscais do próprio tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fiscal-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM tenants 
    WHERE id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Usuários autenticados do tenant podem fazer upload de documentos fiscais
CREATE POLICY "Usuários podem fazer upload de documentos fiscais do próprio tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fiscal-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM tenants 
    WHERE id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Usuários autenticados do tenant podem deletar seus próprios documentos
CREATE POLICY "Usuários podem deletar documentos fiscais do próprio tenant"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fiscal-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM tenants 
    WHERE id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
);

