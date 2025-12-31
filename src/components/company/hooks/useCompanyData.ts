/**
 * Hook para gerenciar dados da empresa
 * AIDEV-NOTE: Lógica de negócio separada do componente
 */

import { useSecureTenantQuery } from "@/hooks/templates/useSecureTenantQuery";
import { supabase } from "@/lib/supabase";
import type { CompanyDataForm } from "../schemas";

export interface CompanyDataResponse {
  company_data: any;
}

/**
 * Hook para buscar dados da empresa do tenant
 * AIDEV-NOTE: Busca apenas company_data para evitar erro 400
 */
export function useCompanyData(tenantId: string | undefined) {
  return useSecureTenantQuery<CompanyDataResponse | null>(
    ['company-data', tenantId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Buscar apenas company_data para evitar erro 400
      // O campo logo pode não existir na tabela tenants
      const { data, error } = await supabase
        .from('tenants')
        .select('company_data')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('[useCompanyData] Erro ao buscar dados:', error);
        throw error;
      }

      return {
        company_data: data?.company_data || null,
      } as CompanyDataResponse;
    },
    {
      enabled: !!tenantId
    }
  );
}

/**
 * Hook para salvar dados da empresa
 * AIDEV-NOTE: Sincroniza automaticamente com Focus NFe se integração estiver ativa
 */
export function useSaveCompanyData() {
  const saveCompanyData = async (
    tenantId: string,
    formData: CompanyDataForm
  ): Promise<void> => {
    // AIDEV-NOTE: Estruturar dados no formato JSONB esperado
    const companyDataToSave = {
      cnpj: formData.cnpj.replace(/\D/g, ""),
      razao_social: formData.razao_social,
      nome_fantasia: formData.nome_fantasia || null,
      inscricao_estadual: formData.inscricao_estadual || null,
      inscricao_municipal: formData.inscricao_municipal || null,
      endereco: {
        logradouro: formData.logradouro,
        numero: formData.numero,
        complemento: formData.complemento || null,
        bairro: formData.bairro,
        cidade: formData.cidade,
        uf: formData.uf,
        cep: formData.cep.replace(/\D/g, ""),
      },
      contato: {
        ddd: formData.ddd,
        telefone: formData.telefone,
        ddd_telefone2: formData.ddd_telefone2 || null,
        telefone2: formData.telefone2 || null,
        ddd_fax: formData.ddd_fax || null,
        fax: formData.fax || null,
        email: formData.email || null,
        website: formData.website || null,
      },
      fiscal: {
        data_abertura: formData.data_abertura || null,
        tipo_atividade: formData.tipo_atividade || null,
        regime_tributario: formData.regime_tributario || null,
        cnae_principal: formData.cnae_principal || null,
        receita_bruta_12_meses: formData.receita_bruta_12_meses || null,
      },
    };

    // AIDEV-NOTE: Salvar no banco primeiro
    const { error } = await supabase
      .from('tenants')
      .update({ company_data: companyDataToSave })
      .eq('id', tenantId);

    if (error) throw error;
    
    // AIDEV-NOTE: Sincronizar com Focus NFe se integração estiver ativa
    try {
      const { getFocusNFeConfig } = await import('@/services/focusnfeCityService');
      const focusNFeConfig = await getFocusNFeConfig(tenantId);
      
      if (focusNFeConfig?.is_active && formData.cnpj && formData.razao_social) {
        // AIDEV-NOTE: Obter token de autenticação do usuário
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn('[useSaveCompanyData] Usuário não autenticado, pulando sincronização Focus NFe');
          return;
        }
        
        // AIDEV-NOTE: Sincronizar empresa no Focus NFe (criar ou atualizar)
        const syncResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas/update`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'x-tenant-id': tenantId,
            },
            body: JSON.stringify({
              company_data: companyDataToSave,
              environment: focusNFeConfig.environment || 'producao'
            })
          }
        );
        
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
          console.log('[useSaveCompanyData] Empresa sincronizada com Focus NFe:', syncResult.message);
        } else {
          console.warn('[useSaveCompanyData] Aviso ao sincronizar com Focus NFe:', syncResult.error);
          // Não falha o salvamento, apenas loga o aviso
        }
      }
    } catch (error) {
      console.error('[useSaveCompanyData] Erro ao sincronizar com Focus NFe:', error);
      // Não falha o salvamento, apenas loga o erro
    }
  };

  return { saveCompanyData };
}

/**
 * Mapeia dados do banco para o formulário
 */
export function mapCompanyDataToForm(data: any): Partial<CompanyDataForm> {
  return {
    cnpj: data.cnpj || "",
    razao_social: data.razao_social || "",
    nome_fantasia: data.nome_fantasia || "",
    ddd: data.contato?.ddd || "",
    telefone: data.contato?.telefone || "",
    logradouro: data.endereco?.logradouro || "",
    numero: data.endereco?.numero || "",
    complemento: data.endereco?.complemento || "",
    bairro: data.endereco?.bairro || "",
    cidade: data.endereco?.cidade || "",
    uf: data.endereco?.uf || "",
    cep: data.endereco?.cep || "",
    ddd_telefone2: data.contato?.ddd_telefone2 || "",
    telefone2: data.contato?.telefone2 || "",
    ddd_fax: data.contato?.ddd_fax || "",
    fax: data.contato?.fax || "",
    email: data.contato?.email || "",
    website: data.contato?.website || "",
    data_abertura: data.fiscal?.data_abertura || "",
    inscricao_estadual: data.inscricao_estadual || "",
    inscricao_municipal: data.inscricao_municipal || "",
    tipo_atividade: data.fiscal?.tipo_atividade || "",
    regime_tributario: data.fiscal?.regime_tributario || "",
    cnae_principal: data.fiscal?.cnae_principal || "",
    receita_bruta_12_meses: data.fiscal?.receita_bruta_12_meses || "",
  };
}

