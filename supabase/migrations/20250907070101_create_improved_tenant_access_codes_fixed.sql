-- Criar tabela de códigos de acesso ao tenant melhorada
-- Esta tabela armazena códigos de uso único para acesso seguro aos tenants

CREATE TABLE IF NOT EXISTS public.tenant_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT
);

-- Índice para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_tenant_access_codes_code ON public.tenant_access_codes (code);

-- Índice para busca por tenant_id e user_id
CREATE INDEX IF NOT EXISTS idx_tenant_access_codes_tenant_user ON public.tenant_access_codes (tenant_id, user_id);

-- Índices para performance de validação e limpeza
CREATE INDEX IF NOT EXISTS idx_tenant_access_codes_expires_at ON public.tenant_access_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_tenant_access_codes_used_at ON public.tenant_access_codes (used_at);

-- Políticas de RLS para tenant_access_codes
ALTER TABLE public.tenant_access_codes ENABLE ROW LEVEL SECURITY;

-- Apenas o usuário que criou o código pode ver seus próprios códigos
CREATE POLICY select_own_codes ON public.tenant_access_codes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Ninguém pode inserir diretamente - isso será feito pela função RPC
CREATE POLICY no_direct_insert ON public.tenant_access_codes 
  FOR INSERT 
  WITH CHECK (false);

-- Ninguém pode atualizar diretamente - isso será feito pela função RPC
CREATE POLICY no_direct_update ON public.tenant_access_codes 
  FOR UPDATE 
  USING (false);

-- Ninguém pode deletar - limpeza será feita por job programado
CREATE POLICY no_direct_delete ON public.tenant_access_codes 
  FOR DELETE 
  USING (false);

-- Adicionar coluna de token_version na tabela tenant_users para revogação
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- Função para gerar código de acesso com alta entropia (128+ bits)
CREATE OR REPLACE FUNCTION public.generate_tenant_access_code(
  p_tenant_id UUID,
  p_expiration_minutes INTEGER DEFAULT 5
)
RETURNS JSON AS $$
DECLARE
  v_code TEXT;
  v_user_id UUID;
  v_tenant_exists BOOLEAN;
  v_has_access BOOLEAN;
  v_tenant_slug TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_ip_address TEXT;
  v_user_agent TEXT;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;

  -- Verificar se o tenant existe e está ativo
  SELECT EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE id = p_tenant_id AND active = true
  ) INTO v_tenant_exists;
  
  IF NOT v_tenant_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Tenant não encontrado ou inativo'
    );
  END IF;
  
  -- Verificar se o usuário tem acesso ao tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id AND tenant_id = p_tenant_id
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    -- Registrar tentativa de acesso não autorizado
    INSERT INTO public.security_logs (
      user_id,
      action,
      details,
      ip_address
    ) VALUES (
      v_user_id,
      'UNAUTHORIZED_TENANT_ACCESS_ATTEMPT',
      json_build_object('tenant_id', p_tenant_id),
      inet_client_addr()::TEXT
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não tem acesso a este tenant'
    );
  END IF;
  
  -- Obter slug do tenant
  SELECT slug INTO v_tenant_slug FROM public.tenants WHERE id = p_tenant_id;
  
  -- Gerar código com alta entropia (32 caracteres hexadecimais = 128 bits)
  v_code := encode(gen_random_bytes(16), 'hex');
  
  -- Definir prazo de expiração
  v_expires_at := now() + (p_expiration_minutes || ' minutes')::INTERVAL;
  
  -- Capturar informações de auditoria
  v_ip_address := inet_client_addr()::TEXT;
  v_user_agent := current_setting('request.headers', true)::json->>('user-agent');
  
  -- Inserir o código na tabela
  INSERT INTO public.tenant_access_codes (
    code,
    user_id,
    tenant_id,
    expires_at,
    ip_address,
    user_agent
  ) VALUES (
    v_code,
    v_user_id,
    p_tenant_id,
    v_expires_at,
    v_ip_address,
    v_user_agent
  );
  
  -- Registrar geração do código no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'TENANT_ACCESS_CODE_GENERATED',
    json_build_object(
      'code_prefix', left(v_code, 8),
      'expires_at', v_expires_at
    )
  );
  
  -- Retornar o código e informações
  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'tenant_id', p_tenant_id,
    'tenant_slug', v_tenant_slug,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários da função para documentação
COMMENT ON FUNCTION public.generate_tenant_access_code(UUID, INTEGER) IS 
'Gera um código de uso único para acesso a um tenant específico. O código tem alta entropia (128+ bits) e expira após o tempo especificado em minutos. Verifica se o usuário está autenticado e tem acesso ao tenant.';

-- Criação manual do job de limpeza
-- Em vez de usar pg_cron, vamos criar uma função que pode ser chamada regularmente por um cron externo
CREATE OR REPLACE FUNCTION public.cleanup_expired_tenant_codes()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.tenant_access_codes 
    WHERE 
      (expires_at < NOW() AND used_at IS NULL) OR 
      (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
