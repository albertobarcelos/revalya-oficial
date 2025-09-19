import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '../../contexts/PortalContext';
import { useTenant } from '@/features/tenant';

interface ContextMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Componente para monitorar o estado dos contextos em tempo real
 * Útil para debugging de problemas de perda de contexto
 */
export function ContextMonitor({ enabled = true, position = 'bottom-right' }: ContextMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const location = useLocation();
  
  // Usar os hooks dos contextos diretamente
  const { user } = useSupabase();
  const { 
    portalType, 
    tenantId, 
    resellerId, 
    currentPortal, 
    isLoading: portalLoading 
  } = usePortal();
  const tenantContext = useTenant();
  const currentTenant = tenantContext?.context?.tenant;
  const userTenantRole = currentTenant?.user_role;
  const tenantLoading = tenantContext?.context?.isLoading || false;

  // Atualizar timestamp quando qualquer contexto mudar
  useEffect(() => {
    setLastUpdate(new Date(Date.now()));
  }, [
    user?.id,
    portalType,
    tenantId,
    resellerId,
    currentPortal?.id,
    currentTenant?.id,
    userTenantRole,
    portalLoading,
    tenantLoading,
    location.pathname
  ]);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getStatusColor = () => {
    if (!portalType) return 'bg-warning';
    if (portalLoading || tenantLoading) return 'bg-warning';
    if (!user) return 'bg-danger';
    if (portalType === 'tenant' && !currentTenant) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusText = () => {
    if (!portalType) return 'Loading';
    if (portalLoading || tenantLoading) return 'Loading';
    if (!user) return 'Not Auth';
    if (portalType === 'tenant' && !currentTenant) return 'No Tenant';
    return 'OK';
  };

  const checkLocalStorageConsistency = () => {
    const stored = {
      portalType: localStorage.getItem('portalType'),
      tenantId: localStorage.getItem('tenantId'),
      resellerId: localStorage.getItem('resellerId')
    };
    
    const current = {
      portalType,
      tenantId,
      resellerId
    };
    
    return {
      portalType: stored.portalType === current.portalType,
      tenantId: stored.tenantId === current.tenantId,
      resellerId: stored.resellerId === current.resellerId
    };
  };

  const consistency = checkLocalStorageConsistency();
  const hasInconsistencies = portalType ? (!consistency.portalType || !consistency.tenantId || !consistency.resellerId) : false;

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}>
      {/* Indicador compacto */}
      <div 
        className={`
          ${getStatusColor()} 
          text-white px-2 py-1 rounded cursor-pointer 
          flex items-center gap-2 shadow-lg
          ${hasInconsistencies ? 'ring-2 ring-red-400' : ''}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>{getStatusText()}</span>
        {hasInconsistencies && <span className="text-red-200">⚠️</span>}
      </div>

      {/* Painel expandido */}
      {isExpanded && (
        <div className="mt-2 bg-card border border-border text-card-foreground p-3 rounded shadow-xl max-w-sm overflow-auto max-h-96">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-card-foreground font-bold">Context Monitor</h3>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-card-foreground"
            >
              ✕
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground mb-3">
            Last update: {new Date(lastUpdate).toLocaleTimeString()}
          </div>

          {/* Status geral */}
          <div className="mb-3">
            <div className="text-card-foreground font-semibold mb-1">Status</div>
            <div className={`px-2 py-1 rounded ${getStatusColor()} text-white`}>
              {getStatusText()}
            </div>
          </div>

          {/* Localização */}
          <div className="mb-3">
            <div className="text-card-foreground font-semibold mb-1">Location</div>
            <div className="text-primary">{location.pathname}</div>
          </div>

          {/* Usuário */}
          <div className="mb-3">
            <div className="text-card-foreground font-semibold mb-1">User</div>
            {user ? (
              <div>
                <div>ID: {user.id.substring(0, 8)}...</div>
                <div>Email: {user.email}</div>
                <div>Role: {userTenantRole || 'N/A'}</div>
              </div>
            ) : (
              <div className="text-danger">Not authenticated</div>
            )}
          </div>

          {/* Portal */}
          <div className="mb-3">
            <div className="text-card-foreground font-semibold mb-1">Portal</div>
            <div>Type: {portalType || 'N/A'}</div>
            <div>Tenant ID: {tenantId || 'N/A'}</div>
            <div>Reseller ID: {resellerId || 'N/A'}</div>
            <div>Loading: {portalLoading ? 'Yes' : 'No'}</div>
            {currentPortal && (
              <div className="mt-1">
                <div>Current: {currentPortal.name}</div>
                <div>Slug: {currentPortal.slug}</div>
              </div>
            )}
          </div>

          {/* Tenant */}
          <div className="mb-3">
            <div className="text-white font-semibold mb-1">Tenant</div>
            <div>Loading: {tenantLoading ? 'Yes' : 'No'}</div>
            <div>Role: {userTenantRole || 'N/A'}</div>
            {currentTenant ? (
              <div className="mt-1">
                <div>ID: {currentTenant.id.substring(0, 8)}...</div>
                <div>Name: {currentTenant.name}</div>
                <div>Slug: {currentTenant.slug}</div>
              </div>
            ) : (
              <div className="text-warning">No tenant selected</div>
            )}
          </div>

          {/* Consistência do localStorage */}
          <div className="mb-3">
            <div className="text-white font-semibold mb-1">LocalStorage Sync</div>
            <div className={consistency.portalType ? 'text-green-400' : 'text-red-400'}>
              Portal Type: {consistency.portalType ? '✓' : '✗'}
            </div>
            <div className={consistency.tenantId ? 'text-green-400' : 'text-red-400'}>
              Tenant ID: {consistency.tenantId ? '✓' : '✗'}
            </div>
            <div className={consistency.resellerId ? 'text-green-400' : 'text-red-400'}>
              Reseller ID: {consistency.resellerId ? '✓' : '✗'}
            </div>
          </div>

          {/* Ações de debug */}
          <div className="border-t border-gray-700 pt-2">
            <div className="text-white font-semibold mb-2">Debug Actions</div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => {
                  console.log('=== CONTEXT STATE DUMP ===');
                  console.log('User:', user);
                  console.log('Portal:', { portalType, tenantId, resellerId, currentPortal });
                  console.log('Tenant:', { currentTenant, userTenantRole, tenantLoading });
                  console.log('LocalStorage:', {
                    portalType: localStorage.getItem('portalType'),
                    tenantId: localStorage.getItem('tenantId'),
                    resellerId: localStorage.getItem('resellerId')
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
              >
                Log State
              </button>
              
              <button 
                onClick={() => {
                  localStorage.removeItem('portalType');
                  localStorage.removeItem('tenantId');
                  localStorage.removeItem('resellerId');
                  window.location.reload();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              >
                Clear & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
