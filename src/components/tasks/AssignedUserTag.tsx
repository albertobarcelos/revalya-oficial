import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTenantAccessGuard, useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';

interface AssignedUserTagProps {
  userId?: string | null;
}

/**
 * Componente: AssignedUserTag
 * Função: Renderiza uma badge com o nome do usuário responsável pela tarefa.
 * Segurança: Respeita o contexto multi-tenant carregando usuários apenas do tenant atual.
 * Estratégia de dados: Tenta carregar via RPC get_tenant_users_v2; se falhar, faz fallback em tenant_users.
 */
export function AssignedUserTag({ userId }: AssignedUserTagProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const tenantId = currentTenant?.id;

  /**
   * Busca segura do usuário responsável a partir da tabela users, restringindo pelo tenant via tabela de junção tenant_users.
   * Por que usar tenant_users? Garante isolamento multi-tenant, filtrando por tenant_id e user_id.
   * Resultado: user (id, name, email) do usuário que pertence ao tenant atual.
   */
  const { data: userRecord, isLoading } = useSecureTenantQuery(
    ['assigned-user', tenantId, userId],
    async (supabase, tId) => {
      if (!userId) return null;

      // Consultar a relação segura via tenant_users -> users
      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          user:user_id (
            id,
            name,
            email
          )
        `)
        .eq('tenant_id', tId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[AssignedUserTag] Erro ao buscar usuário do responsável:', error.message);
        return null;
      }

      // Quando não há correspondência, retorna null para exibir fallback
      return data?.user || null;
    },
    { enabled: hasAccess && !!tenantId && !!userId }
  );

  // Não renderiza caso não haja userId definido
  if (!userId) {
    return null;
  }

  const displayName = userRecord?.name || userRecord?.email;

  return (
    <Badge variant="outline" className="text-xs">
      {isLoading ? 'Carregando responsável…' : (displayName || 'Responsável desconhecido')}
    </Badge>
  );
}

export default AssignedUserTag;