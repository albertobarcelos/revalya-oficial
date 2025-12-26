-- AIDEV-NOTE: Migration para adicionar coluna company_data JSONB na tabela tenants
-- Esta coluna armazena todos os dados fiscais e de empresa necessários para emissão de notas fiscais
-- Decisão: Usar JSONB ao invés de tabela separada para evitar JOINs e manter dados do tenant juntos

-- Adicionar coluna company_data JSONB
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS company_data JSONB DEFAULT '{}';

-- Criar índice GIN para consultas eficientes no JSONB
-- O índice GIN permite buscas rápidas em campos JSONB
-- AIDEV-NOTE: IF NOT EXISTS garante idempotência - pode ser executado múltiplas vezes sem erro
CREATE INDEX IF NOT EXISTS idx_tenants_company_data_gin 
ON tenants USING GIN (company_data);

-- Comentário na coluna para documentação
COMMENT ON COLUMN tenants.company_data IS 
'Dados fiscais e de empresa para emissão de notas fiscais. Estrutura JSONB: {
  "cnpj": "string (obrigatório)",
  "razao_social": "string (obrigatório)",
  "nome_fantasia": "string (opcional)",
  "inscricao_estadual": "string (obrigatório para NFe)",
  "inscricao_municipal": "string (obrigatório para NFSe)",
  "endereco": {
    "logradouro": "string (obrigatório)",
    "numero": "string (obrigatório)",
    "complemento": "string (opcional)",
    "bairro": "string (obrigatório)",
    "cidade": "string (obrigatório)",
    "uf": "string (obrigatório, 2 caracteres)",
    "cep": "string (obrigatório, formato: 00000-000)"
  },
  "contato": {
    "telefone": "string (opcional)",
    "email": "string (opcional mas recomendado)"
  },
  "fiscal": {
    "regime_tributario": "simples_nacional|lucro_presumido|lucro_real",
    "cnae_principal": "string (opcional)"
  }
}';

-- AIDEV-NOTE: Função auxiliar para validar se dados da empresa estão completos
-- Útil para verificar antes de permitir emissão de notas fiscais
CREATE OR REPLACE FUNCTION validate_tenant_company_data(p_tenant_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  missing_fields TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_data JSONB;
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Buscar company_data do tenant
  SELECT company_data INTO v_company_data
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- Se não existe company_data ou está vazio
  IF v_company_data IS NULL OR v_company_data = '{}'::jsonb THEN
    RETURN QUERY SELECT false, ARRAY['company_data']::TEXT[];
    RETURN;
  END IF;
  
  -- Validar campos obrigatórios
  IF v_company_data->>'cnpj' IS NULL OR v_company_data->>'cnpj' = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'cnpj');
  END IF;
  
  IF v_company_data->>'razao_social' IS NULL OR v_company_data->>'razao_social' = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'razao_social');
  END IF;
  
  IF v_company_data->'endereco' IS NULL THEN
    v_missing_fields := array_append(v_missing_fields, 'endereco');
  ELSE
    -- Validar campos obrigatórios do endereço
    IF v_company_data->'endereco'->>'logradouro' IS NULL OR v_company_data->'endereco'->>'logradouro' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.logradouro');
    END IF;
    
    IF v_company_data->'endereco'->>'numero' IS NULL OR v_company_data->'endereco'->>'numero' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.numero');
    END IF;
    
    IF v_company_data->'endereco'->>'bairro' IS NULL OR v_company_data->'endereco'->>'bairro' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.bairro');
    END IF;
    
    IF v_company_data->'endereco'->>'cidade' IS NULL OR v_company_data->'endereco'->>'cidade' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.cidade');
    END IF;
    
    IF v_company_data->'endereco'->>'uf' IS NULL OR v_company_data->'endereco'->>'uf' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.uf');
    END IF;
    
    IF v_company_data->'endereco'->>'cep' IS NULL OR v_company_data->'endereco'->>'cep' = '' THEN
      v_missing_fields := array_append(v_missing_fields, 'endereco.cep');
    END IF;
  END IF;
  
  -- Retornar resultado
  IF array_length(v_missing_fields, 1) > 0 THEN
    RETURN QUERY SELECT false, v_missing_fields;
  ELSE
    RETURN QUERY SELECT true, ARRAY[]::TEXT[];
  END IF;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION validate_tenant_company_data(UUID) IS 
'Valida se os dados da empresa (company_data) estão completos para emissão de notas fiscais. 
Retorna is_valid (boolean) e missing_fields (array de campos faltantes).';

-- AIDEV-NOTE: Exemplos de uso da coluna company_data

-- Exemplo 1: Inserir/Atualizar dados da empresa
/*
UPDATE tenants 
SET company_data = jsonb_build_object(
  'cnpj', '12.345.678/0001-90',
  'razao_social', 'Empresa Exemplo LTDA',
  'nome_fantasia', 'Empresa Exemplo',
  'inscricao_estadual', '123.456.789.012',
  'inscricao_municipal', '123456',
  'endereco', jsonb_build_object(
    'logradouro', 'Rua Exemplo',
    'numero', '123',
    'complemento', 'Sala 45',
    'bairro', 'Centro',
    'cidade', 'São Paulo',
    'uf', 'SP',
    'cep', '01234-567'
  ),
  'contato', jsonb_build_object(
    'telefone', '(11) 1234-5678',
    'email', 'contato@empresa.com.br'
  ),
  'fiscal', jsonb_build_object(
    'regime_tributario', 'simples_nacional',
    'cnae_principal', '62.01-5-00'
  )
)
WHERE id = 'tenant-uuid';
*/

-- Exemplo 2: Consultar CNPJ do tenant
/*
SELECT 
  id,
  name,
  company_data->>'cnpj' as cnpj,
  company_data->>'razao_social' as razao_social
FROM tenants
WHERE id = 'tenant-uuid';
*/

-- Exemplo 3: Consultar endereço completo
/*
SELECT 
  id,
  name,
  company_data->'endereco' as endereco
FROM tenants
WHERE id = 'tenant-uuid';
*/

-- Exemplo 4: Validar dados antes de emitir nota
/*
SELECT * FROM validate_tenant_company_data('tenant-uuid');
-- Retorna: is_valid, missing_fields
*/

