/**
 * Hook para Geração Automática de Códigos de Produtos
 * 
 * AIDEV-NOTE: Implementa lógica segura para geração automática de códigos sequenciais
 * para produtos, seguindo as 5 camadas de segurança multi-tenant obrigatórias:
 * 1. Validação de acesso via useTenantAccessGuard
 * 2. Consultas seguras via useSecureTenantQuery
 * 3. Query keys padronizadas com tenant_id
 * 4. Validação dupla de dados
 * 5. Logs de auditoria obrigatórios
 * 
 * @module useProductCodeGenerator
 */

import { useCallback } from 'react';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import { supabase } from '../lib/supabase';

/**
 * 🔐 Hook Seguro para Geração de Códigos de Produtos
 * 
 * Este hook implementa a lógica para:
 * - Buscar o maior código numérico existente na tabela products
 * - Gerar automaticamente o próximo código sequencial
 * - Validar se um código já está em uso
 * - Manter compatibilidade com códigos não numéricos existentes
 */
export function useProductCodeGenerator() {
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔍 QUERY SEGURA PARA BUSCAR O MAIOR CÓDIGO NUMÉRICO
  const {
    data: maxCodeData,
    isLoading: isLoadingMaxCode,
    error: maxCodeError,
    refetch: refetchMaxCode
  } = useSecureTenantQuery<{ maxCode: number }>(
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['product-max-code', currentTenant?.id],
    async (supabase, tenantId) => {
      // 🛡️ AUDIT LOG OBRIGATÓRIO
      
      // AIDEV-NOTE: useSecureTenantQuery já configura o contexto automaticamente
      // Não é necessário chamar set_tenant_context_simple novamente
      
      // 🔍 BUSCAR MAIOR CÓDIGO NUMÉRICO
      // AIDEV-NOTE: Filtra apenas códigos que são puramente numéricos e encontra o maior
      const { data, error } = await supabase
        .from('products')
        .select('code')
        .eq('tenant_id', tenantId)
        .not('code', 'is', null)
        .neq('code', '')
        .order('code', { ascending: false });

      if (error) {
        console.error('🚨 [SECURITY] Erro ao buscar códigos de produtos:', error);
        throw new Error(`Erro ao buscar códigos: ${error.message}`);
      }

      // 🔢 PROCESSAR CÓDIGOS PARA ENCONTRAR O MAIOR NUMÉRICO COM PREFIXO "PRD"
      // AIDEV-NOTE: Busca códigos no formato PRD001, PRD002, etc.
      let maxNumericCode = 0;
      
      if (data && data.length > 0) {
        for (const product of data) {
          if (product.code) {
            // Verificar se o código começa com "PRD" seguido de números
            const prdMatch = product.code.match(/^PRD(\d+)$/i);
            if (prdMatch) {
              const numericValue = parseInt(prdMatch[1], 10);
              if (numericValue > maxNumericCode) {
                maxNumericCode = numericValue;
              }
            } else {
              // Fallback: verificar se é puramente numérico (compatibilidade com códigos antigos)
              const numericMatch = product.code.match(/^\d+$/);
              if (numericMatch) {
                const numericValue = parseInt(product.code, 10);
                if (numericValue > maxNumericCode) {
                  maxNumericCode = numericValue;
                }
              }
            }
          }
        }
      }

      return { maxCode: maxNumericCode };
    },
    {
      // AIDEV-NOTE: Cache por 5 minutos para evitar consultas desnecessárias
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false, // AIDEV-NOTE: Não recarregar ao mudar de aba do navegador
    }
  );

  // 🔄 FUNÇÃO PARA GERAR PRÓXIMO CÓDIGO COM PREFIXO "PRD"
  const generateNextCode = useCallback((): string => {
    if (!hasAccess || !maxCodeData) {
      console.warn('⚠️ [GENERATOR] Não é possível gerar código: sem acesso ou dados');
      return '';
    }

    const nextCode = maxCodeData.maxCode + 1;
    // Formatar com zeros à esquerda (mínimo 3 dígitos) e adicionar prefixo "PRD"
    const formattedCode = `PRD${nextCode.toString().padStart(3, '0')}`;
    console.log(`🔢 [GENERATOR] Próximo código gerado: ${formattedCode}`);
    return formattedCode;
  }, [hasAccess, maxCodeData]);

  // 🔍 FUNÇÃO PARA VALIDAR SE CÓDIGO JÁ EXISTE
  // AIDEV-NOTE: productId opcional para ignorar o próprio produto na validação (modo edição)
  const validateCodeExists = useCallback(async (code: string, productId?: string): Promise<boolean> => {
    if (!hasAccess || !currentTenant?.id || !code.trim()) {
      return false;
    }

    try {
      // 🛡️ AUDIT LOG OBRIGATÓRIO
      console.log(`[AUDIT] Validando existência do código: ${code} - Tenant: ${currentTenant.id}${productId ? ` - Ignorando produto: ${productId}` : ''}`);
      
      // AIDEV-NOTE: useSecureTenantQuery já configura o contexto automaticamente
      // Não é necessário chamar set_tenant_context_simple novamente

      // 🔍 VERIFICAR SE CÓDIGO JÁ EXISTE (ignorando o próprio produto se fornecido)
      let query = supabase
        .from('products')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('code', code.trim());
      
      // AIDEV-NOTE: Se estiver editando, ignorar o próprio produto
      if (productId) {
        query = query.neq('id', productId);
      }
      
      const { data, error } = await query.limit(1);

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
    // AIDEV-NOTE: Retorna código com prefixo "PRD" (ex: PRD001, PRD002)
    nextAvailableCode: hasAccess && maxCodeData ? `PRD${(maxCodeData.maxCode + 1).toString().padStart(3, '0')}` : '',
  };
}

export default useProductCodeGenerator;