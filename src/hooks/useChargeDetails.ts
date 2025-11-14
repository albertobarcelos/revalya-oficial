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
            celular_whatsapp,
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

      // AIDEV-NOTE: Buscar serviços do contrato usando a view vw_contract_services_detailed
      let contractServices = [];
      if (data?.contract?.id) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('vw_contract_services_detailed')
          .select(`
            contract_service_id,
            service_description,
            quantity,
            unit_price,
            is_active,
            service_id,
            service_name
          `)
          .eq('tenant_id', tenantId)
          .eq('contract_id', data.contract.id);

        if (servicesError) {
          console.error('🚨 [ERROR] useChargeDetails - Erro ao buscar serviços:', servicesError);
        } else {
          contractServices = servicesData || [];
        }
      }

      // AIDEV-NOTE: Adicionar serviços aos dados do contrato
      const enrichedData = {
        ...data,
        contract: data?.contract ? {
          ...data.contract,
          contract_services: contractServices.map(service => ({
            id: service.contract_service_id,
            description: service.service_description,
            quantity: service.quantity,
            unit_price: service.unit_price,
            is_active: service.is_active,
            service: {
              id: service.service_id,
              name: service.service_name,
              description: service.service_description
            }
          }))
        } : null
      };

      // AIDEV-NOTE: Log detalhado dos dados para debug (incluindo empresa)
      console.log('🔍 [DEBUG] useChargeDetails - Dados COMPLETOS carregados:', {
        id: enrichedData?.id,
        status: enrichedData?.status,
        valor: enrichedData?.valor,
        data_vencimento: enrichedData?.data_vencimento,
        customer_id: enrichedData?.customer_id,
        customer: {
          id: enrichedData?.customer?.id,
          name: enrichedData?.customer?.name,
          company: enrichedData?.customer?.company, // Nome da empresa vem do campo company do customer
          email: enrichedData?.customer?.email,
          phone: enrichedData?.customer?.phone,
          celular_whatsapp: enrichedData?.customer?.celular_whatsapp,
          cpf_cnpj: enrichedData?.customer?.cpf_cnpj,
          address: enrichedData?.customer?.address,
          city: enrichedData?.customer?.city,
          state: enrichedData?.customer?.state,
          postal_code: enrichedData?.customer?.postal_code
        },
        contract_services_count: contractServices.length,
        tenant_id: enrichedData?.tenant_id,
        created_at: enrichedData?.created_at,
        updated_at: enrichedData?.updated_at
      });

      return enrichedData as Cobranca;
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
