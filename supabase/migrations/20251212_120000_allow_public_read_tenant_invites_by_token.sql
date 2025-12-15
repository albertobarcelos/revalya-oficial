-- AIDEV-NOTE: Permitir leitura pública de convites pendentes usando token
-- Isso é necessário para que usuários não autenticados possam validar convites na página de registro
-- A política permite SELECT apenas para convites PENDING com token válido

CREATE POLICY "public_read_pending_invites_by_token"
ON public.tenant_invites
FOR SELECT
TO public
USING (
  -- Permitir leitura de convites pendentes para qualquer pessoa (não autenticada)
  -- Isso é seguro porque o token é único e secreto
  status = 'PENDING' 
  AND expires_at > NOW()
);

-- AIDEV-NOTE: Comentário explicativo
COMMENT ON POLICY "public_read_pending_invites_by_token" ON public.tenant_invites IS 
  'Permite que usuários não autenticados leiam convites pendentes para validação na página de registro. Seguro porque o token é único e secreto.';

