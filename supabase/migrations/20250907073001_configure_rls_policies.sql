-- Configuração das políticas RLS para o sistema multi-tenant com isolamento
-- Implementa políticas de acesso para tabelas críticas do sistema

-- Garantir que tenant_access_codes seja acessível apenas via funções RPC (SECURITY DEFINER)
-- ou pela Edge Function utilizando a service role
DROP POLICY IF EXISTS select_own_codes ON public.tenant_access_codes;
DROP POLICY IF EXISTS no_direct_insert ON public.tenant_access_codes;
DROP POLICY IF EXISTS no_direct_update ON public.tenant_access_codes;
DROP POLICY IF EXISTS no_direct_delete ON public.tenant_access_codes;

-- Recrear políticas com configurações mais restritivas
CREATE POLICY admin_select_tenant_access_codes ON public.tenant_access_codes
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.tenant_users
      WHERE role = 'admin' OR role = 'owner'
    )
  );

-- Nenhum acesso direto de escrita, apenas via funções RPC
CREATE POLICY no_direct_insert ON public.tenant_access_codes
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY no_direct_update ON public.tenant_access_codes
  FOR UPDATE
  USING (false);

CREATE POLICY no_direct_delete ON public.tenant_access_codes
  FOR DELETE
  USING (false);

-- Políticas RLS para tabelas multi-tenant
-- Modelo para invoices (exemplo)
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS UUID AS $$
  -- Tenta obter tenant_id da variável de sessão
  SELECT nullif(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS para tabela invoices
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_invoices ON public.invoices;
CREATE POLICY tenant_isolation_invoices ON public.invoices
  FOR ALL
  USING (
    -- Verificação em camadas:
    -- 1. tenant_id da linha corresponde ao contexto atual OU
    -- 2. O usuário tem acesso explícito ao tenant da linha
    (
      tenant_id = public.current_tenant_id() 
      OR 
      (
        auth.uid() IN (
          SELECT user_id FROM public.tenant_users
          WHERE tenant_id = invoices.tenant_id
          AND active = true
        )
      )
    )
  );

-- RLS para tabela customers
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_customers ON public.customers;
CREATE POLICY tenant_isolation_customers ON public.customers
  FOR ALL
  USING (
    (
      tenant_id = public.current_tenant_id() 
      OR 
      (
        auth.uid() IN (
          SELECT user_id FROM public.tenant_users
          WHERE tenant_id = customers.tenant_id
          AND active = true
        )
      )
    )
  );

-- Função para validar token JWT em middleware do BFF
CREATE OR REPLACE FUNCTION public.validate_tenant_token(
  p_token TEXT,
  p_tenant_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_token_version INTEGER;
  v_current_version INTEGER;
BEGIN
  -- Esta função seria chamada pelo BFF/middleware para validar tokens
  -- Na implementação real, a validação do JWT é feita pelo middleware
  -- e esta função só verifica o token_version

  -- Obter user_id do token (simula decodificação do JWT)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extrair versão do token (simula claim do JWT)
  -- Na implementação real, o BFF extrai isso do JWT decodificado
  v_token_version := 1; -- Exemplo
  
  -- Verificar a versão atual do token para este usuário/tenant
  SELECT token_version INTO v_current_version
  FROM public.tenant_users
  WHERE user_id = v_user_id
  AND tenant_id = p_tenant_id
  AND active = true;
  
  IF v_current_version IS NULL THEN
    -- Usuário não tem acesso ou está inativo
    RETURN false;
  END IF;
  
  -- Token é válido se a versão armazenada corresponde à versão atual
  RETURN v_token_version = v_current_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar índices para melhorar performance das políticas RLS
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant ON public.tenant_users (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_active ON public.tenant_users (tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users (role);

-- Índices para tabelas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant ON public.audit_logs (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON public.security_logs (action);

COMMENT ON FUNCTION public.current_tenant_id() IS
'Retorna o ID do tenant atual a partir da variável de sessão app.current_tenant_id.';

COMMENT ON FUNCTION public.validate_tenant_token(TEXT, UUID) IS
'Função para validar token JWT em middleware do BFF, verificando se o token_version do usuário corresponde ao armazenado.';
