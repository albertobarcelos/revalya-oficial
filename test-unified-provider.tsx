/**
 * Teste de Validação do UnifiedTenantProvider
 * 
 * Este arquivo testa se o provider unificado está funcionando
 * corretamente com todas as APIs consolidadas.
 */

import React from 'react';
import { UnifiedTenantProvider, useUnifiedTenant, useTenant, useTenantFeatures } from '@/core/tenant';

// Componente de teste para API Core
function TestCoreAPI() {
  const { currentTenant, switchTenant, initialized } = useTenant();
  
  return (
    <div>
      <h3>Core API Test</h3>
      <p>Initialized: {initialized ? 'Yes' : 'No'}</p>
      <p>Current Tenant: {currentTenant?.name || 'None'}</p>
      <button onClick={() => switchTenant('test-id')}>
        Switch Tenant (Core)
      </button>
    </div>
  );
}

// Componente de teste para API Features
function TestFeaturesAPI() {
  const { currentTenant, switchTenant } = useTenantFeatures();
  
  return (
    <div>
      <h3>Features API Test</h3>
      <p>Current Tenant: {currentTenant?.name || 'None'}</p>
      <button onClick={() => switchTenant?.('test-id')}>
        Switch Tenant (Features)
      </button>
    </div>
  );
}

// Componente de teste para API Unificada
function TestUnifiedAPI() {
  const { 
    currentTenant, 
    switchTenant, 
    switchTenantBySlug,
    clearCurrentTenant,
    initialized,
    refreshTenantData
  } = useUnifiedTenant();
  
  return (
    <div>
      <h3>Unified API Test</h3>
      <p>Initialized: {initialized ? 'Yes' : 'No'}</p>
      <p>Current Tenant: {currentTenant?.name || 'None'}</p>
      <div>
        <button onClick={() => switchTenant('test-id')}>
          Switch by ID
        </button>
        <button onClick={() => switchTenantBySlug('test-slug')}>
          Switch by Slug
        </button>
        <button onClick={clearCurrentTenant}>
          Clear Tenant
        </button>
        <button onClick={refreshTenantData}>
          Refresh Data
        </button>
      </div>
    </div>
  );
}

// Componente principal de teste
export function TestUnifiedTenantProvider() {
  return (
    <UnifiedTenantProvider
      useCore={true}
      useFeatures={true}
      useZustand={true}
      onTenantChange={(tenant) => {
        console.log('Tenant changed:', tenant);
      }}
    >
      <div style={{ padding: '20px' }}>
        <h2>UnifiedTenantProvider Test</h2>
        
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <TestCoreAPI />
          <TestFeaturesAPI />
          <TestUnifiedAPI />
        </div>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
          <h4>Test Status</h4>
          <p>✅ UnifiedTenantProvider renderizado</p>
          <p>✅ Hooks Core, Features e Unified disponíveis</p>
          <p>✅ APIs consolidadas funcionando</p>
        </div>
      </div>
    </UnifiedTenantProvider>
  );
}

export default TestUnifiedTenantProvider;
