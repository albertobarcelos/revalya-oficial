/**
 * Serviço para verificar integração de cidades com FocusNFe
 * AIDEV-NOTE: Valida se a cidade tem suporte para emissão de NFS-e
 */

import { supabase } from "@/lib/supabase";

export interface CityIntegrationStatus {
  cidade: string;
  uf: string;
  codigo_ibge?: string;
  disponivel: boolean;
  modelo_integracao?: string;
  mensagem?: string;
}

/**
 * AIDEV-NOTE: Verifica se a cidade tem integração disponível com FocusNFe
 * Por enquanto, retorna status baseado em lista conhecida
 * Em produção, pode consultar API do FocusNFe ou tabela de referência
 */
export async function checkCityIntegration(
  cidade: string,
  uf: string
): Promise<CityIntegrationStatus> {
  try {
    // AIDEV-NOTE: Normalizar nome da cidade para comparação
    const cidadeNormalizada = cidade.toLowerCase().trim();
    const ufNormalizada = uf.toUpperCase().trim();

    // AIDEV-NOTE: Lista de cidades conhecidas com integração (exemplo)
    // Em produção, isso deve vir de uma tabela ou API
    const cidadesComIntegracao: Record<string, { modelo: string; codigo_ibge?: string }> = {
      'nova olimpia-mt': { modelo: 'fisslex', codigo_ibge: '5106238' },
      'são paulo-sp': { modelo: 'fisslex', codigo_ibge: '3550308' },
      'rio de janeiro-rj': { modelo: 'fisslex', codigo_ibge: '3304557' },
      'belo horizonte-mg': { modelo: 'fisslex', codigo_ibge: '3106200' },
    };

    const chave = `${cidadeNormalizada}-${ufNormalizada}`;
    const integracao = cidadesComIntegracao[chave];

    if (integracao) {
      return {
        cidade,
        uf: ufNormalizada,
        codigo_ibge: integracao.codigo_ibge,
        disponivel: true,
        modelo_integracao: integracao.modelo,
        mensagem: 'Integração disponível',
      };
    }

    // AIDEV-NOTE: Se não encontrou na lista, retorna como indisponível
    // Em produção, pode fazer consulta na API do FocusNFe
    return {
      cidade,
      uf: ufNormalizada,
      disponivel: false,
      mensagem: 'Indisponível no momento, entre em contato com o suporte para verificarmos o status da integração.',
    };
  } catch (error) {
    console.error('[checkCityIntegration] Erro:', error);
    return {
      cidade,
      uf,
      disponivel: false,
      mensagem: 'Erro ao verificar integração. Tente novamente.',
    };
  }
}

/**
 * AIDEV-NOTE: Buscar configuração do FocusNFe para o tenant
 * Usa tenant_integrations seguindo padrão do sistema
 * Prioriza integração ativa, se houver múltiplas, pega a mais recente
 */
export async function getFocusNFeConfig(tenantId: string) {
  try {
    // AIDEV-NOTE: Configurar contexto de tenant antes da query
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Buscar todas as integrações FocusNFe do tenant
    // Ordenar por is_active DESC (ativas primeiro) e updated_at DESC (mais recentes primeiro)
    const { data: allIntegrations, error: listError } = await supabase
      .from('tenant_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'focusnfe')
      .order('updated_at', { ascending: false }); // Mais recentes primeiro

    if (listError) throw listError;

    // AIDEV-NOTE: Se não encontrou nenhuma, retornar null
    if (!allIntegrations || allIntegrations.length === 0) {
      return null;
    }

    // AIDEV-NOTE: Priorizar integração ativa, se houver múltiplas
    // Se não houver ativa, pegar a mais recente (já ordenada por updated_at DESC)
    // Ordenar manualmente: ativas primeiro, depois por updated_at
    const sortedIntegrations = [...allIntegrations].sort((a, b) => {
      // Primeiro: ativas antes de inativas
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      // Segundo: mais recentes primeiro
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    const selectedIntegration = sortedIntegrations[0];

    // AIDEV-NOTE: Converter formato de tenant_integrations para compatibilidade
    return {
      id: selectedIntegration.id,
      tenant_id: selectedIntegration.tenant_id,
      provider: 'focusnfe', // Mantido para compatibilidade
      is_active: selectedIntegration.is_active,
      environment: selectedIntegration.environment || 'homologacao',
      settings: selectedIntegration.config || {},
      created_at: selectedIntegration.created_at,
      updated_at: selectedIntegration.updated_at,
    };
  } catch (error) {
    console.error('[getFocusNFeConfig] Erro:', error);
    return null;
  }
}

/**
 * AIDEV-NOTE: Salvar configuração do FocusNFe
 * Padrão único: não salva api_key (chave está nos secrets do Supabase)
 * Usa tenant_integrations seguindo padrão do sistema
 * CRÍTICO: Garante apenas UMA integração por tipo por tenant - SEMPRE atualiza existente, NUNCA cria duplicata
 */
export async function saveFocusNFeConfig(
  tenantId: string,
  config: {
    // api_key removido - chave única está nos secrets do Supabase
    environment: 'homologacao' | 'producao';
    is_active?: boolean;
    settings?: Record<string, any>;
  }
) {
  try {
    // AIDEV-NOTE: Configurar contexto de tenant antes das operações
    await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });

    // AIDEV-NOTE: Obter sessão do usuário para created_by
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // AIDEV-NOTE: CRÍTICO - Buscar TODAS as integrações FocusNFe do tenant
    // Garantir que existe apenas UMA por tipo por tenant
    const { data: allIntegrations, error: listError } = await supabase
      .from('tenant_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'focusnfe');

    if (listError) throw listError;

    // AIDEV-NOTE: Preparar dados para config (JSONB)
    // Preservar configurações existentes e mesclar com novas
    const existingConfig = allIntegrations && allIntegrations.length > 0 
      ? (allIntegrations[0].config || {}) 
      : {};
    
    const configData = {
      ...existingConfig,
      ...(config.settings || {}),
      // Não salvar api_key - está nos secrets
    };

    // AIDEV-NOTE: Se já existe pelo menos uma integração, SEMPRE atualizar a primeira
    // Se houver múltiplas, consolidar em uma única (atualizar a mais recente e deletar as outras)
    if (allIntegrations && allIntegrations.length > 0) {
      // Ordenar: ativas primeiro, depois por updated_at DESC
      const sortedIntegrations = [...allIntegrations].sort((a, b) => {
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      const integrationToUpdate = sortedIntegrations[0];
      const integrationsToDelete = sortedIntegrations.slice(1);

      // AIDEV-NOTE: Atualizar a integração principal
      const { data: updatedData, error: updateError } = await supabase
        .from('tenant_integrations')
        .update({
          environment: config.environment,
          is_active: config.is_active !== undefined ? config.is_active : integrationToUpdate.is_active,
          config: configData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationToUpdate.id)
        .eq('tenant_id', tenantId) // AIDEV-NOTE: Filtro adicional de segurança
        .select()
        .single();

      if (updateError) throw updateError;

      // AIDEV-NOTE: CRÍTICO - Deletar integrações duplicadas se houver
      if (integrationsToDelete.length > 0) {
        const idsToDelete = integrationsToDelete.map(integration => integration.id);
        const { error: deleteError } = await supabase
          .from('tenant_integrations')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('integration_type', 'focusnfe')
          .in('id', idsToDelete);

        if (deleteError) {
          console.warn('[saveFocusNFeConfig] Erro ao deletar integrações duplicadas:', deleteError);
          // Não falhar a operação principal por causa disso, mas logar o erro
        } else {
          console.log(`[saveFocusNFeConfig] ${integrationsToDelete.length} integração(ões) duplicada(s) removida(s)`);
        }
      }

      // AIDEV-NOTE: Converter formato para compatibilidade
      return {
        id: updatedData.id,
        tenant_id: updatedData.tenant_id,
        provider: 'focusnfe',
        is_active: updatedData.is_active,
        environment: updatedData.environment,
        settings: updatedData.config || {},
        created_at: updatedData.created_at,
        updated_at: updatedData.updated_at,
      };
    } else {
      // AIDEV-NOTE: Apenas criar nova se NÃO existir NENHUMA integração
      const { data: newData, error: insertError } = await supabase
        .from('tenant_integrations')
        .insert({
          tenant_id: tenantId,
          integration_type: 'focusnfe',
          is_active: config.is_active !== undefined ? config.is_active : true,
          environment: config.environment,
          config: configData,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // AIDEV-NOTE: Converter formato para compatibilidade
      return {
        id: newData.id,
        tenant_id: newData.tenant_id,
        provider: 'focusnfe',
        is_active: newData.is_active,
        environment: newData.environment,
        settings: newData.config || {},
        created_at: newData.created_at,
        updated_at: newData.updated_at,
      };
    }
  } catch (error) {
    console.error('[saveFocusNFeConfig] Erro:', error);
    throw error;
  }
}

