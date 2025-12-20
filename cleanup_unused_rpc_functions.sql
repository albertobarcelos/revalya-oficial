-- AIDEV-NOTE: Limpeza de funções RPC não utilizadas identificadas na auditoria
-- Executar este script no Supabase Dashboard > SQL Editor
-- Removendo apenas as funções confirmadas como não utilizadas no código frontend

-- ✅ FUNÇÕES SEGURAS PARA REMOÇÃO:

-- 1. Função original set_tenant_context (substituída por versões mais seguras)
DROP FUNCTION IF EXISTS set_tenant_context(uuid);

-- 2. Função set_tenant_context_safe (não encontrada em uso)
DROP FUNCTION IF EXISTS set_tenant_context_safe(uuid, uuid);

-- 3. Função set_tenant_context_session (não encontrada em uso)
DROP FUNCTION IF EXISTS set_tenant_context_session(uuid, uuid);

-- 4. Funções admin duplicadas/alternativas não utilizadas
DROP FUNCTION IF EXISTS admin_get_tenants_alternate();
DROP FUNCTION IF EXISTS admin_get_tenants_safe();
DROP FUNCTION IF EXISTS admin_get_tenant_pending_invites(text);

-- ✅ CONFIRMAÇÃO: As seguintes funções FORAM MANTIDAS (estão em uso):
-- - set_tenant_context_simple (usada pelo SecurityMiddleware)
-- - set_tenant_context_flexible (usada em apiAuth.ts, ContractFormActions.tsx, etc.)
-- - set_tenant_context_flexible_boolean (dependência interna da flexible)

-- AIDEV-NOTE: Esta limpeza remove 6 funções desnecessárias, mantendo apenas as 3 essenciais
-- Resultado: Banco mais limpo e organizado, sem impacto na funcionalidade