/**
 * Componente de debug temporário para verificar o estado do tenant
 * 
 * AIDEV-NOTE: Este componente deve ser removido após resolver o problema
 */

import React, { useEffect } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

// AIDEV-NOTE: Componente de debug temporário para diagnosticar problemas de acesso
// Exibe o estado do tenant e logs detalhados no console
export const TenantDebugPanel: React.FC = () => {
  const tenantState = useZustandTenant();
  const accessGuard = useTenantAccessGuard();

  useEffect(() => {
    console.log('🔍 [DEBUG] TenantDebugPanel - Estado completo:', {
      tenantState: {
        currentTenant: tenantState.currentTenant,
        availableTenants: tenantState.availableTenants,
        hasLoaded: tenantState.hasLoaded,
        isLoading: tenantState.isLoading,
        error: tenantState.error,
      },
      accessGuard: {
        hasAccess: accessGuard.hasAccess,
        accessError: accessGuard.accessError,
        isLoading: accessGuard.isLoading,
      },
      url: window.location.href,
      pathname: window.location.pathname,
    });
  }, [tenantState, accessGuard]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      border: '1px solid #333',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#ffd700' }}>🔍 Debug Panel</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>URL:</strong> {window.location.pathname}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Current Tenant:</strong> {tenantState.currentTenant?.name || 'null'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Has Access:</strong> {accessGuard.hasAccess ? '✅' : '❌'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Access Error:</strong> {accessGuard.accessError || 'none'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Tenant Loading:</strong> {tenantState.isLoading ? '⏳' : '✅'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Guard Loading:</strong> {accessGuard.isLoading ? '⏳' : '✅'}
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Available Tenants:</strong> {tenantState.availableTenants?.length || 0}
      </div>
      
      {tenantState.error && (
        <div style={{ color: '#ff6b6b', marginTop: '8px' }}>
          <strong>Error:</strong> {tenantState.error}
        </div>
      )}
    </div>
  );
};