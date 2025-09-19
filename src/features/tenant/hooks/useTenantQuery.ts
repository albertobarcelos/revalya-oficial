import { useTenant } from '@/core/tenant/TenantProvider';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { useSupabase } from '@/hooks/useSupabase';
import { useEffect, useState } from 'react';

/**
 * Hook para acessar o ID do tenant atual e criar consultas filtradas por tenant
 * Esta é uma versão simplificada que usa o novo sistema tenant-simple
 */
export function useTenantQuery() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const tenantContext = useTenant();
  const [error, setError] = useState<Error | null>(null);
  
  // Obter tenant do contexto com verificação de segurança
  const tenantId = tenantContext?.context?.tenant?.id || null;
  const isLoading = tenantContext?.context?.isLoading || false;
  
  // Se houver erro no contexto do tenant, atualizar o estado local
  useEffect(() => {
    if (tenantContext?.context?.error) {
      setError(new Error(tenantContext.context.error));
      
      // Notificar o usuário sobre o erro
      toast({
        title: 'Erro',
        description: `Erro ao carregar dados do tenant: ${tenantContext.context.error}`,
        variant: 'destructive',
      });
    }
  }, [tenantContext?.context?.error, toast]);

  /**
   * Cria uma consulta filtrada por tenant_id
   * @param table Nome da tabela a ser consultada
   * @param selectQuery Query de seleção, padrão é '*'
   * @returns Uma query do Postgrest com filtro de tenant_id aplicado
   */
  const createTenantQuery = (
    table: string, 
    selectQuery: string = '*'
  ) => {
    if (!tenantId) {
      throw new Error('Tentativa de acessar dados sem contexto de tenant inicializado');
    }
    
    // Retornando com tipagem mais genérica para evitar erros
    return supabase
      .from(table)
      .select(selectQuery)
      .eq('tenant_id', tenantId);
  };

  return { 
    tenantId, 
    createTenantQuery, 
    isLoading, 
    error 
  };
}

export default useTenantQuery;
