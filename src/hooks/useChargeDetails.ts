/**
 * 🔐 Hook Seguro para Detalhes de Cobrança
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */

import { useToast } from '@/components/ui/use-toast';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { Cobranca } from '@/types';

export function useChargeDetails(chargeId: string | null) {
  const { toast } = useToast();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  const {
    data: chargeDetails,
    isLoading,
    error,
    refetch: refreshChargeDetails
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['charge-details', chargeId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Validação crítica - chargeId deve existir
      if (!chargeId) {
        throw new Error('ID da cobrança é obrigatório');
      }

      console.log('🔍 [DEBUG] useChargeDetails - Iniciando busca segura:', { 
        chargeId, 
        tenantId,
        currentTenant: currentTenant?.name 
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      const { data, error } = await supabase
        .from('charges')
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            phone,
            company,
            cpf_cnpj,
            address,
            postal_code,
            address_number,
            complement,
            neighborhood,
            city,
            state,
            country,
            additional_info
          ),
          contract:contracts(
            id,
            contract_number,
            contract_services(
              id,
              description,
              quantity,
              unit_price,
              is_active,
              service:services(
                id,
                name,
                description
              )
            ),
            contract_products(
              id,
              description,
              quantity,
              unit_price,
              is_active,
              product:products(
                id,
                name,
                description
              )
            )
          )
        `)
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .eq('id', chargeId)
        .single();

      if (error) {
        console.error('🚨 [ERROR] useChargeDetails - Erro na consulta:', error);
        throw error;
      }

      // AIDEV-NOTE: Validação dupla de segurança - dados devem pertencer ao tenant
      if (data?.tenant_id !== tenantId) {
        console.error('🚨 [SECURITY BREACH] Dados não pertencem ao tenant atual!', {
          dataTenantId: data?.tenant_id,
          currentTenantId: tenantId
        });
        throw new Error('Violação de segurança: Dados não pertencem ao tenant atual');
      }

      // AIDEV-NOTE: Log detalhado dos dados para debug (incluindo empresa)
      console.log('🔍 [DEBUG] useChargeDetails - Dados COMPLETOS carregados:', {
        id: data?.id,
        status: data?.status,
        valor: data?.valor,
        data_vencimento: data?.data_vencimento,
        customer_id: data?.customer_id,
        customer: {
          id: data?.customer?.id,
          name: data?.customer?.name,
          company: data?.customer?.company, // Nome da empresa vem do campo company do customer
          email: data?.customer?.email,
          phone: data?.customer?.phone,
          cpf_cnpj: data?.customer?.cpf_cnpj,
          address: data?.customer?.address,
          city: data?.customer?.city,
          state: data?.customer?.state,
          postal_code: data?.customer?.postal_code
        },
        tenant_id: data?.tenant_id,
        created_at: data?.created_at,
        updated_at: data?.updated_at
      });

      return data as Cobranca;
    },
    {
      // Só executa se chargeId existir e tiver acesso
      enabled: !!chargeId && hasAccess,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false
    }
  );

  // AIDEV-NOTE: Tratamento de erro com toast
  if (error && chargeId) {
    console.error("🚨 [ERROR] useChargeDetails - Erro ao carregar:", error);
    toast({
      title: "Erro ao carregar detalhes",
      description: "Não foi possível carregar os detalhes da cobrança.",
      variant: "destructive"
    });
  }

  // AIDEV-NOTE: Tratamento de erro de acesso
  if (!hasAccess && chargeId) {
    console.error("🚨 [ACCESS DENIED] useChargeDetails:", accessError);
    toast({
      title: "Acesso negado",
      description: accessError || "Você não tem permissão para acessar esta cobrança.",
      variant: "destructive"
    });
  }

  return {
    chargeDetails: chargeDetails || null,
    isLoading,
    refreshChargeDetails,
    hasAccess,
    accessError
  };
}