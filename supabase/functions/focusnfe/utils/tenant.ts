/**
 * Utilitários para validação e verificação de tenant
 * AIDEV-NOTE: Lógica de tenant centralizada
 */

import type { Environment } from "../types.ts";
import { createSupabaseClient } from "./supabase.ts";

/**
 * Verifica se tenant tem integração FocusNFe ativa
 */
export async function checkTenantIntegration(
  tenantId: string,
  environment: Environment = 'producao'
): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('is_active, environment')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'focusnfe')
    .eq('is_active', true)
    .maybeSingle();
  
  if (error) {
    console.error('[checkTenantIntegration] Erro:', {
      tenant_id: tenantId,
      error: error.message
    });
    return false;
  }
  
  if (!data) {
    console.log('[checkTenantIntegration] Integração não encontrada ou inativa:', {
      tenant_id: tenantId
    });
    return false;
  }
  
  const configEnvironment = data.environment?.toLowerCase();
  if (configEnvironment && configEnvironment !== environment) {
    console.warn('[checkTenantIntegration] Ambiente não corresponde:', {
      esperado: environment,
      configurado: configEnvironment,
      tenant_id: tenantId
    });
  }
  
  const isActive = data.is_active === true;
  console.log('[checkTenantIntegration] Resultado:', {
    tenant_id: tenantId,
    is_active: isActive,
    environment: configEnvironment
  });
  
  return isActive;
}

/**
 * Busca dados da empresa do tenant
 * AIDEV-NOTE: Inclui colunas dedicadas do certificado digital
 */
export async function getTenantCompanyData(tenantId: string): Promise<any | null> {
  const supabase = createSupabaseClient();
  
  // AIDEV-NOTE: Buscar company_data + colunas do certificado
  const { data, error } = await supabase
    .from('tenants')
    .select('company_data, certificate_base64, certificate_password, certificate_info')
    .eq('id', tenantId)
    .maybeSingle();
  
  if (error || !data) {
    console.error('[getTenantCompanyData] Erro:', error);
    return null;
  }
  
  // AIDEV-NOTE: Mesclar dados do certificado com company_data
  // As colunas dedicadas têm prioridade sobre o company_data
  const companyData = data.company_data || {};
  
  // AIDEV-NOTE: Adicionar certificado das colunas dedicadas se existir
  if (data.certificate_base64 || data.certificate_password) {
    companyData.arquivo_certificado_base64 = data.certificate_base64;
    companyData.senha_certificado = data.certificate_password;
    
    console.log('[getTenantCompanyData] Certificado encontrado nas colunas dedicadas');
  }
  
  return companyData;
}

