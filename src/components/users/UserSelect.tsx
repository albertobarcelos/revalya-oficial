import React, { useMemo } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Loader2, User as UserIcon } from 'lucide-react';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

/**
 * Componente UserSelect
 * Seleciona um usuário do tenant atual para atribuição de tarefas (assigned_to).
 * - Usa RPC get_tenant_users_v2 com fallback em tenant_users.
 * - Valida acesso ao tenant via useTenantAccessGuard.
 */
export interface UserSelectProps {
  value?: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  inModal?: boolean; // Somente para consistência de API; Select não exige tratamento especial
  disabled?: boolean;
}

interface TenantUserOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export function UserSelect({ value, onChange, placeholder = 'Selecione um usuário', disabled = false }: UserSelectProps) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const tenantId = currentTenant?.id;

  // Query segura multi-tenant para listar usuários do tenant
  const { data: users = [], isLoading, error } = useSecureTenantQuery<TenantUserOption[]>(
    ['tenant_users', 'list'],
    async (supabase, tenantId) => {
      // Tentar RPC moderna
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_tenant_users_v2', { tenant_id_param: tenantId });

      if (!rpcError && Array.isArray(rpcData)) {
        // Mapear resultados da RPC para opções
        return rpcData.map((item: any) => ({
          id: item.user_id || item.id,
          name: item.user_name || item.name || item.user?.name || item.email || 'Usuário',
          email: item.user_email || item.email || item.user?.email,
          role: item.role || item.user_role,
        })) as TenantUserOption[];
      }

      // Fallback para tenant_users com join em users
      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          id,
          role,
          user:user_id (
            id,
            email,
            name
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.user?.id,
        name: item.user?.name || item.user?.email || 'Usuário',
        email: item.user?.email,
        role: item.role,
      })) as TenantUserOption[];
    },
    {
      enabled: !!tenantId && hasAccess,
    }
  );

  const options = useMemo(() => users, [users]);

  const isDisabled = disabled || !hasAccess || !tenantId || isLoading;

  return (
    <div className="space-y-2">
      <Select
        value={value || ''}
        onValueChange={(val) => onChange(val)}
        disabled={isDisabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={isLoading ? 'Carregando usuários...' : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : error ? (
            <div className="p-2 text-sm text-destructive">Erro ao carregar usuários</div>
          ) : options.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">Nenhum usuário encontrado</div>
          ) : (
            options.map((u) => (
              <SelectItem key={u.id} value={u.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span>{u.name}</span>
                  {u.email ? <span className="text-muted-foreground">({u.email})</span> : null}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default UserSelect;