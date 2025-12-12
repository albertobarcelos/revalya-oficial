-- AIDEV-NOTE: Remover trigger que tenta atualizar updated_at em tenant_invites
-- A tabela não tem esse campo, então o trigger causa erro ao atualizar convites
-- Este trigger foi criado acidentalmente e não é necessário para esta tabela

DROP TRIGGER IF EXISTS set_timestamp_tenant_invites ON tenant_invites;

-- AIDEV-NOTE: Comentário explicativo
COMMENT ON TRIGGER set_timestamp_tenant_invites ON tenant_invites IS 
  'Trigger removido: tabela tenant_invites não possui campo updated_at';

