/**
 * Hook para Geração Automática de Códigos de Serviços
 * 
 * AIDEV-NOTE: Implementa lógica segura para geração automática de códigos sequenciais
 * para serviços, seguindo as 5 camadas de segurança multi-tenant obrigatórias:
 * 1. Validação de acesso via useTenantAccessGuard
 * 2. Consultas seguras via useSecureTenantQuery
 * 3. Query keys padronizadas com tenant_id
 * 4. Validação dupla de dados
 * 5. Logs de auditoria obrigatórios
 * 
 * @module useServiceCodeGenerator
 */

import { useCallback } from 'react';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { supabase } from '../lib/supabase';

/**
 * 🔐 Hook Seguro para Geração de Códigos de Serviços
 * 
 * Este hook implementa a lógica para:
 * - Buscar o maior código numérico existente na tabela services
 * - Gerar automaticamente o próximo código sequencial
 * - Validar se um código já está em uso
 * - Manter compatibilidade com códigos não numéricos existentes
 */
export function useServiceCodeGenerator() {
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔍 QUERY SEGURA PARA BUSCAR O MAIOR CÓDIGO NUMÉRICO
  const {
    data: maxCodeData,
    isLoading: isLoadingMaxCode,
    error: maxCodeError,
    refetch: refetchMaxCode
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['service-max-code', currentTenant?.id],
    async (supabase, tenantId) => {
      // 🛡️ AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Buscando maior código de serviço - Tenant: ${tenantId}`);
      
      // 🛡️ CONFIGURAR CONTEXTO DO TENANT
      const { error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId
      });
      
      if (contextError) {
        console.warn('⚠️ [CONTEXT] Aviso ao configurar contexto:', contextError);
      }
      
      // 🔍 BUSCAR MAIOR CÓDIGO NUMÉRICO
      // AIDEV-NOTE: Filtra apenas códigos que são puramente numéricos e encontra o maior
      const { data, error } = await supabase
        .from('services')
        .select('code')
        .eq('tenant_id', tenantId)
        .not('code', 'is', null)
        .neq('code', '')
        .order('code', { ascending: false });

      if (error) {
        console.error('🚨 [SECURITY] Erro ao buscar códigos de serviços:', error);
        throw new Error(`Erro ao buscar códigos: ${error.message}`);
      }

      // 🔢 PROCESSAR CÓDIGOS PARA ENCONTRAR O MAIOR NUMÉRICO
      let maxNumericCode = 0;
      
      if (data && data.length > 0) {
        for (const service of data) {
          if (service.code) {
            // Verificar se o código é puramente numérico
            const numericMatch = service.code.match(/^\d+$/);
            if (numericMatch) {
              const numericValue = parseInt(service.code, 10);
              if (numericValue > maxNumericCode) {
                maxNumericCode = numericValue;
              }
            }
          }
        }
      }

      console.log(`✅ [AUDIT] Maior código numérico encontrado: ${maxNumericCode}`);
      return { maxCode: maxNumericCode };
    },
    {
      // AIDEV-NOTE: Cache por 5 minutos para evitar consultas desnecessárias
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // 🔄 FUNÇÃO PARA GERAR PRÓXIMO CÓDIGO
  const generateNextCode = useCallback((): string => {
    if (!hasAccess || !maxCodeData) {
      console.warn('⚠️ [GENERATOR] Não é possível gerar código: sem acesso ou dados');
      return '';
    }

    const nextCode = maxCodeData.maxCode + 1;
    // Formatar com zeros à esquerda (mínimo 3 dígitos)
    const formattedCode = nextCode.toString().padStart(3, '0');
    console.log(`🔢 [GENERATOR] Próximo código gerado: ${formattedCode}`);
    return formattedCode;
  }, [hasAccess, maxCodeData]);

  // 🔍 FUNÇÃO PARA VALIDAR SE CÓDIGO JÁ EXISTE
  const validateCodeExists = useCallback(async (code: string): Promise<boolean> => {
    if (!hasAccess || !currentTenant?.id || !code.trim()) {
      return false;
    }

    try {
      // 🛡️ AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Validando existência do código: ${code} - Tenant: ${currentTenant.id}`);
      
      // 🛡️ CONFIGURAR CONTEXTO DO TENANT
      const { error: contextError } = await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id
      });
      
      if (contextError) {
        console.warn('⚠️ [CONTEXT] Aviso ao configurar contexto:', contextError);
      }

      // 🔍 VERIFICAR SE CÓDIGO JÁ EXISTE
      const { data, error } = await supabase
        .from('services')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('code', code.trim())
        .limit(1);

      if (error) {
        console.error('🚨 [SECURITY] Erro ao validar código:', error);
        return false;
      }

      const exists = data && data.length > 0;
      console.log(`✅ [AUDIT] Código ${code} ${exists ? 'já existe' : 'está disponível'}`);
      return exists;
    } catch (error) {
      console.error('🚨 [ERROR] Erro na validação do código:', error);
      return false;
    }
  }, [hasAccess, currentTenant?.id]);

  // 🔄 FUNÇÃO PARA ATUALIZAR CACHE DO MAIOR CÓDIGO
  const refreshMaxCode = useCallback(() => {
    if (hasAccess) {
      console.log('🔄 [REFRESH] Atualizando cache do maior código');
      refetchMaxCode();
    }
  }, [hasAccess, refetchMaxCode]);

  return {
    // 🛡️ DADOS DE SEGURANÇA
    hasAccess,
    accessError,
    
    // 📊 DADOS DO MAIOR CÓDIGO
    maxCode: maxCodeData?.maxCode || 0,
    isLoadingMaxCode,
    maxCodeError,
    
    // 🔧 FUNÇÕES UTILITÁRIAS
    generateNextCode,
    validateCodeExists,
    refreshMaxCode,
    
    // 📈 INFORMAÇÕES ADICIONAIS
    nextAvailableCode: hasAccess && maxCodeData ? (maxCodeData.maxCode + 1).toString().padStart(3, '0') : '',
  };
}

export default useServiceCodeGenerator;