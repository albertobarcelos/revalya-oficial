-- AIDEV-NOTE: Adicionar colunas dedicadas para certificado digital na tabela tenants
-- Isso organiza melhor os dados e facilita queries

-- Coluna para o arquivo do certificado em base64
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS certificate_base64 TEXT;

-- Coluna para a senha do certificado (criptografada em trânsito)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS certificate_password TEXT;

-- Coluna JSONB para metadados do certificado (tipo, validade, emissor, etc.)
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS certificate_info JSONB;

-- Comentários para documentação
COMMENT ON COLUMN public.tenants.certificate_base64 IS 'Arquivo do certificado digital em formato base64 (PFX/P12)';
COMMENT ON COLUMN public.tenants.certificate_password IS 'Senha do certificado digital';
COMMENT ON COLUMN public.tenants.certificate_info IS 'Metadados do certificado: tipo, emitidoPara, emitidoPor, validoDe, validoAte, nome_arquivo, salvo_em';
