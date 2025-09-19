import React, { useEffect, useState } from 'react';
import { useZustandTenant } from '@/hooks/useZustandTenant';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

// AIDEV-NOTE: Componente para testar especificamente o problema de acesso negado
// Força a verificação de acesso e mostra logs detalhados
export const AccessTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const tenantState = useZustandTenant();
  const accessGuard = useTenantAccessGuard();

  useEffect(() => {
    const runAccessTest = () => {
      const timestamp = new Date().toLocaleTimeString();
      const result = {
        timestamp,
        url: window.location.href,
        pathname: window.location.pathname,
        tenantFromUrl: window.location.pathname.split('/')[2], // Extrai o slug do tenant da URL
        currentTenant: tenantState.currentTenant,
        availableTenants: tenantState.availableTenants,
        hasAccess: accessGuard.hasAccess,
        accessError: accessGuard.accessError,
        tenantLoading: tenantState.isLoading,
        guardLoading: accessGuard.isLoading,
        hasLoaded: tenantState.hasLoaded,
        error: tenantState.error,
      };

      console.log('🧪 [ACCESS TEST]', result);
      
      setTestResults(prev => [result, ...prev.slice(0, 4)]); // Mantém apenas os 5 últimos
    };

    // Executa o teste imediatamente e depois a cada 2 segundos
    runAccessTest();
    const interval = setInterval(runAccessTest, 2000);

    return () => clearInterval(interval);
  }, [tenantState, accessGuard]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#0f172a',
      color: '#e2e8f0',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '11px',
      maxWidth: '500px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 9999,
      border: '1px solid #334155',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8' }}>🧪 Access Test Results</h4>
      
      {testResults.map((result, index) => (
        <div key={index} style={{
          marginBottom: '12px',
          padding: '8px',
          background: index === 0 ? '#1e293b' : '#0f172a',
          border: '1px solid #334155',
          borderRadius: '4px'
        }}>
          <div style={{ color: '#fbbf24', marginBottom: '4px' }}>
            {result.timestamp} - Test #{testResults.length - index}
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>URL Tenant:</strong> {result.tenantFromUrl}
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>Current Tenant:</strong> {result.currentTenant?.slug || 'null'}
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>Has Access:</strong> 
            <span style={{ color: result.hasAccess ? '#10b981' : '#ef4444' }}>
              {result.hasAccess ? ' ✅ YES' : ' ❌ NO'}
            </span>
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>Access Error:</strong> 
            <span style={{ color: result.accessError ? '#ef4444' : '#10b981' }}>
              {result.accessError || 'none'}
            </span>
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>States:</strong> 
            T:{result.tenantLoading ? '⏳' : '✅'} 
            G:{result.guardLoading ? '⏳' : '✅'} 
            L:{result.hasLoaded ? '✅' : '❌'}
          </div>
          
          <div style={{ marginBottom: '2px' }}>
            <strong>Available:</strong> {result.availableTenants?.length || 0} tenants
          </div>
          
          {result.error && (
            <div style={{ color: '#ef4444', marginTop: '4px', fontSize: '10px' }}>
              <strong>Error:</strong> {result.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};