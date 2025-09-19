/**
 * Hook de proteção universal contra vazamento de dados entre tenants
 * 
 * Este hook garante que:
 * 1. O tenant atual corresponde ao slug da URL
 * 2. Cache é limpo ao detectar troca de tenant
 * 3. Redirecionamento automático em caso de inconsistência
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from './useTenantContext';
import { SecurityLogger } from '@/utils/tenantSecurityMonitor';

interface TenantGuardOptions {
  /** Se deve redirecionar automaticamente em caso de inconsistência */
  autoRedirect?: boolean;
  /** Callback chamado quando há inconsistência de tenant */
  onTenantMismatch?: (expectedSlug: string, currentTenant: string | null) => void;
  /** Se deve limpar cache ao detectar troca de tenant */
  clearCacheOnSwitch?: boolean;
}

export function useTenantGuard(options: TenantGuardOptions = {}) {
  const {
    autoRedirect = true,
    onTenantMismatch,
    clearCacheOnSwitch = true
  } = options;

  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, isLoading } = useTenantContext();
  
  // Ref para rastrear o tenant anterior
  const previousTenantRef = useRef<string | null>(null);

  // Função para limpar cache do tenant
  const clearTenantCache = useCallback(() => {
    console.log('[TenantGuard] Limpando cache do React Query...');
    queryClient.clear();
    SecurityLogger.logCacheViolation(tenant?.id || 'unknown', {
      action: 'cache_cleared_on_tenant_switch',
      previousTenant: previousTenantRef.current,
      currentTenant: tenant?.slug
    });
  }, [queryClient, tenant?.id, tenant?.slug]);

  useEffect(() => {
    // Aguardar carregamento do contexto
    if (isLoading) return;

    // Verificar se há slug na URL
    if (!urlSlug) {
      console.warn('[TenantGuard] Slug não encontrado na URL');
      return;
    }

    // Verificar correspondência entre tenant e slug
    const currentTenantSlug = tenant?.slug;
    const isValidTenant = currentTenantSlug === urlSlug;

    // Log de segurança
    console.log('[TenantGuard] Validação de tenant:', {
      urlSlug: urlSlug,
      tenantSlug: currentTenantSlug,
      isValid: isValidTenant,
      tenantId: tenant?.id
    });

    // Verificar se há inconsistência entre URL e tenant atual
    if (currentTenantSlug && urlSlug !== currentTenantSlug) {
      console.warn(`[TenantGuard] Inconsistência detectada: URL=${urlSlug}, Tenant=${currentTenantSlug}`);
      
      // Registrar evento de segurança
      SecurityLogger.logTenantMismatch(urlSlug, currentTenantSlug, {
        url: window.location.href,
        previousTenant: previousTenantRef.current
      });
      
      // Limpar cache para evitar dados cross-tenant
      if (clearCacheOnSwitch) {
        clearTenantCache();
      }

      // Chamar callback personalizado se fornecido
      if (onTenantMismatch) {
        onTenantMismatch(urlSlug, currentTenantSlug);
      }

      // Redirecionar se habilitado
      if (autoRedirect) {
        navigate('/portal');
        return;
      }
    }

    // Detectar troca de tenant
    if (previousTenantRef.current && previousTenantRef.current !== currentTenantSlug) {
      console.log('[TenantGuard] Troca de tenant detectada:', {
        previous: previousTenantRef.current,
        current: currentTenantSlug
      });
      
      // Limpar cache para evitar dados cross-tenant
      if (clearCacheOnSwitch) {
        clearTenantCache();
      }
    }

    // Atualizar referência do tenant anterior para detectar mudanças
    previousTenantRef.current = currentTenantSlug;
  }, [urlSlug, tenant?.slug, navigate, clearTenantCache, onTenantMismatch, autoRedirect, clearCacheOnSwitch]);

  return {
    isValidTenant: tenant?.slug === urlSlug,
    currentTenant: tenant,
    expectedSlug: urlSlug,
    isLoading
  };
}

/**
 * Hook simplificado que força redirecionamento em caso de inconsistência
 */
export function useRequireTenant(requiredSlug?: string) {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = requiredSlug || slug;
  
  return useTenantGuard({
    autoRedirect: true,
    clearCacheOnSwitch: true,
    onTenantMismatch: (expected, current) => {
      console.error('[RequireTenant] Acesso negado - tenant inválido:', {
        expected,
        current,
        timestamp: new Date().toISOString()
      });
    }
  });
}
