/**
 * Inicializador de tenant para resolver problemas de sincronização de contexto
 * 
 * Este script adiciona uma marca ao documento para evitar recarregamentos cíclicos
 * quando estamos carregando um tenant diretamente pela URL
 */

// Verifica se estamos em uma rota de tenant e marca como inicializado
export function markTenantInitialized(): void {
  try {
    // Padrão para detectar rotas de tenant: /:slug/*
    const tenantRouteRegex = /^\/[a-zA-Z0-9_-]+\/.+$/;
    const isInTenantRoute = tenantRouteRegex.test(window.location.pathname);
    
    // Se estamos em uma rota de tenant, marcar como inicializado
    if (isInTenantRoute && !document.body.classList.contains('tenant-initialized')) {
      console.log('[TenantInitializer] Marcando tenant como inicializado para:', window.location.pathname);
      document.body.classList.add('tenant-initialized');
      
      // Verificar se temos tenant no localStorage
      const tenantId = localStorage.getItem('tenantId');
      const portalType = localStorage.getItem('portalType');
      
      if (!tenantId || portalType !== 'tenant') {
        console.log('[TenantInitializer] Dados de tenant ausentes no localStorage, pode ser necessário recarregar');
      } else {
        console.log('[TenantInitializer] Dados de tenant encontrados no localStorage:', {
          tenantId,
          portalType
        });
      }
    }
  } catch (error) {
    console.error('[TenantInitializer] Erro ao inicializar tenant:', error);
  }
}

// Adicionar automaticamente ao carregamento
export function setupTenantInitializer(): void {
  if (typeof window !== 'undefined') {
    // Executar imediatamente
    markTenantInitialized();
    
    // Adicionar listener para mudanças de rota
    window.addEventListener('popstate', () => {
      markTenantInitialized();
    });
  }
}
