/**
 * 🔐 Hook Seguro para Cálculo de Custos do Contrato
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */

import { useMemo } from 'react';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { supabase } from '@/lib/supabase';

interface ContractService {
  contract_service_id: string;
  contract_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_amount: number;
  is_active: boolean;
  tenant_id: string;
  service_name: string;
  service_description: string;
}

interface UseContractCostsReturn {
  totalCosts: number;
  services: ContractService[];
  isLoading: boolean;
  error: string | null;
  hasAccess: boolean;
}

/**
 * Hook para calcular custos totais dos serviços de um contrato
 * @param contractId - ID do contrato
 */
export function useContractCosts(contractId: string | null): UseContractCostsReturn {
  // AIDEV-NOTE: 1ª Camada - Validação de acesso obrigatória
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: 2ª Camada - Query segura com tenant_id
  const query = useSecureTenantQuery(
    ['contract-costs', contractId],
    async (supabase, tenantId) => {
      if (!contractId) {
        throw new Error('Contract ID é obrigatório');
      }

      // AIDEV-NOTE: 4ª Camada - Query com RLS automático
      const { data, error } = await supabase
        .from('vw_contract_services_detailed')
        .select(`
          contract_service_id,
          contract_id,
          service_id,
          quantity,
          unit_price,
          cost_price,
          total_amount,
          is_active,
          tenant_id,
          service_name,
          service_description
        `)
        .eq('contract_id', contractId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        console.error('🚨 [ERROR] useContractCosts - Erro na consulta:', error);
        throw error;
      }

      console.log('🔍 [DEBUG] useContractCosts - Dados retornados:', {
        contractId,
        tenantId,
        dataLength: data?.length || 0,
        data: data?.slice(0, 3) // Primeiros 3 itens para debug
      });

      // AIDEV-NOTE: 5ª Camada - Validação dupla de segurança
      const invalidData = data?.filter(item => item.tenant_id !== tenantId);
      if (invalidData && invalidData.length > 0) {
        console.error('🚨 [SECURITY BREACH] Dados de outro tenant detectados!', invalidData);
        throw new Error('Violação de segurança: Dados não pertencem ao tenant atual');
      }

      console.log('✅ [SUCCESS] useContractCosts - Serviços carregados:', data?.length || 0);
      return data || [];
    },
    {
      enabled: !!contractId && !!currentTenant?.id && hasAccess
    }
  );

  // AIDEV-NOTE: Cálculo dos custos totais usando useMemo para performance
  const totalCosts = useMemo(() => {
    if (!query.data) return 0;

    const costs = query.data.reduce((total, service) => {
      // AIDEV-NOTE: Calcular custo total = cost_price * quantity
      const serviceCost = (service.cost_price || 0) * (service.quantity || 1);
      return total + serviceCost;
    }, 0);

    console.log('💰 [COSTS] useContractCosts - Custos calculados:', {
      contractId,
      totalServices: query.data.length,
      totalCosts: costs,
      services: query.data.map(s => ({
        name: s.service_name,
        quantity: s.quantity,
        cost_price: s.cost_price,
        total_cost: (s.cost_price || 0) * (s.quantity || 1)
      }))
    });

    return costs;
  }, [query.data, contractId]);

  return {
    totalCosts,
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    hasAccess
  };
}