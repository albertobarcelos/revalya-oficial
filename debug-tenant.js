// Script para debug do problema de tenant
console.log('=== DEBUG TENANT ===');
console.log('URL atual:', window.location.pathname);
console.log('URL completa:', window.location.href);

// Extrair slug da URL
const pathSegments = window.location.pathname.split('/').filter(segment => segment);
console.log('Segmentos da URL:', pathSegments);

const slug = pathSegments[0];
console.log('Slug extraído:', slug);

// Verificar se é uma rota válida de tenant
const isValidTenantRoute = slug && 
  slug !== 'login' && 
  slug !== 'admin' && 
  slug !== 'meus-aplicativos';

console.log('É rota válida de tenant?', isValidTenantRoute);

// Verificar sessionStorage
const tenantContext = sessionStorage.getItem('tenant_context');
console.log('Contexto no sessionStorage:', tenantContext);

// Verificar Zustand store (se disponível)
if (window.__ZUSTAND_STORE__) {
  console.log('Estado do Zustand:', window.__ZUSTAND_STORE__);
}

console.log('=== FIM DEBUG ===');