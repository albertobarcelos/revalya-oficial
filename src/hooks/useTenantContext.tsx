/**
 * Hook para gerenciar contexto de tenant
 * 
 * Fornece uma interface simplificada para acessar e gerenciar o tenant atual.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SimpleTenant } from '@/core/tenant/models';
import { logInfo, logError } from '@/lib/logger';

export interface UseTenantContextReturn {
  tenant: SimpleTenant | null;
  isLoading: boolean;
  error: Error | null;
  switchTenant: (slug: string) => Promise<boolean>;
}

export function useTenantContext(slug?: string): UseTenantContextReturn {
  const params = useParams();
  const tenantSlug = slug || params.slug;
  
  const [tenant, setTenant] = useState<SimpleTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Efeito para carregar tenant pelo token que já foi validado pelo TenantRouter
  useEffect(() => {
    const loadTenant = async () => {
      if (!tenantSlug) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[useTenantContext] Carregando tenant a partir do token:', tenantSlug);
        
        // Obter dados do tenant a partir do sessionStorage (já validado pelo TenantRouter)
        const tenantData = sessionStorage.getItem('tenant_token');
        const tenantToken = tenantData ? JSON.parse(tenantData) : null;
        
        if (tenantToken && tenantToken.tenant_slug === tenantSlug) {
          // Criar objeto tenant a partir do token
          const tenantData: SimpleTenant = {
            id: tenantToken.tenant_id,
            slug: tenantToken.tenant_slug,
            name: tenantToken.tenant_slug, // Temporário, será atualizado depois
            active: true
          };
          
          console.log('[useTenantContext] Tenant carregado do token:', tenantData);
          setTenant(tenantData);
          setError(null);
        } else {
          console.warn('[useTenantContext] Token de tenant não encontrado ou não corresponde:', {
            tokenSlug: tenantToken?.tenant_slug,
            expectedSlug: tenantSlug
          });
          setTenant(null);
        }
        
        setIsLoading(false);
      } catch (err) {
        logError('[useTenantContext] Erro ao carregar tenant:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [tenantSlug]);

  // Função para trocar de tenant (simplificada)
  const switchTenant = async (slug: string): Promise<boolean> => {
    try {
      // Por enquanto, apenas retorna false pois a troca será implementada depois
      logInfo('[useTenantContext] Troca de tenant será implementada em versão futura:', { slug });
      return false;
    } catch (err) {
      logError('[useTenantContext] Erro ao trocar tenant:', err);
      setError(err as Error);
      return false;
    }
  };

  return {
    tenant,
    isLoading,
    error,
    switchTenant
  };
}
