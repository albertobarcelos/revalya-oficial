/**
 * Componente de exemplo que demonstra como usar o Zustand para gerenciamento de estado
 * 
 * Este componente não está conectado à aplicação, é apenas um exemplo de como
 * usar o Zustand em vez do Context API para evitar re-renderizações desnecessárias.
 */

import React from 'react';
import { useZustandAuth, useAuthenticationStatus, useUserId } from '@/hooks/useZustandAuth';
import { useZustandTenant, useCurrentTenant, useTenantLoading } from '@/hooks/useZustandTenant';

/**
 * Componente que usa apenas o status de autenticação
 * 
 * Este componente só será re-renderizado quando o status de autenticação mudar,
 * não quando outros detalhes do usuário mudarem.
 */
const AuthStatus = () => {
  // Seleciona apenas o status de autenticação
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  
  console.log('AuthStatus renderizado');
  
  if (isLoading) return <div>Verificando autenticação...</div>;
  
  return (
    <div className="p-4 bg-gray-100 mb-4 rounded">
      <h3 className="font-bold">Status de Autenticação</h3>
      <p>{isAuthenticated ? '✅ Autenticado' : '❌ Não autenticado'}</p>
    </div>
  );
};

/**
 * Componente que usa apenas o ID do usuário
 * 
 * Este componente só será re-renderizado quando o ID do usuário mudar.
 */
const UserIdDisplay = () => {
  // Seleciona apenas o ID do usuário
  const userId = useUserId();
  
  console.log('UserIdDisplay renderizado');
  
  return (
    <div className="p-4 bg-gray-100 mb-4 rounded">
      <h3 className="font-bold">ID do Usuário</h3>
      <p>{userId || 'Nenhum usuário'}</p>
    </div>
  );
};

/**
 * Componente que usa apenas o tenant atual
 * 
 * Este componente só será re-renderizado quando o tenant atual mudar.
 */
const CurrentTenantDisplay = () => {
  // Seleciona apenas o tenant atual
  const tenant = useCurrentTenant();
  
  console.log('CurrentTenantDisplay renderizado');
  
  if (!tenant) return <div>Nenhum tenant selecionado</div>;
  
  return (
    <div className="p-4 bg-gray-100 mb-4 rounded">
      <h3 className="font-bold">Tenant Atual</h3>
      <p>Nome: {tenant.name}</p>
      <p>Slug: {tenant.slug}</p>
      <p>Status: {tenant.active ? '✅ Ativo' : '❌ Inativo'}</p>
    </div>
  );
};

/**
 * Componente que usa apenas o status de loading do tenant
 */
const TenantLoadingIndicator = () => {
  // Seleciona apenas o status de loading
  const isLoading = useTenantLoading();
  
  console.log('TenantLoadingIndicator renderizado');
  
  if (!isLoading) return null;
  
  return (
    <div className="p-4 bg-yellow-100 mb-4 rounded">
      Carregando tenants...
    </div>
  );
};

/**
 * Componente principal que demonstra a utilização do Zustand
 */
export default function ZustandExample() {
  // Hook completo de autenticação
  const { user, isAuthenticated } = useZustandAuth();
  
  // Hook completo de tenant
  const { 
    availableTenants,
    switchToTenant,
    activeTenants
  } = useZustandTenant();
  
  console.log('ZustandExample renderizado');
  
  const handleSwitchTenant = (tenantId: string) => {
    switchToTenant(tenantId).catch(err => {
      alert(err.message);
    });
  };
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exemplo de Zustand</h1>
      
      {/* Componentes que usam seletores específicos */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Componentes com Seletores Específicos</h2>
        <p className="mb-4 text-gray-600">
          Estes componentes só serão re-renderizados quando as partes específicas
          do estado que eles usam forem alteradas.
        </p>
        
        <AuthStatus />
        <UserIdDisplay />
        <CurrentTenantDisplay />
        <TenantLoadingIndicator />
      </div>
      
      {/* Seção de gerenciamento de autenticação */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Autenticação</h2>
        
        {isAuthenticated ? (
          <div>
            <p>Logado como: {user?.email}</p>
            <button 
              className="px-4 py-2 bg-red-500 text-white rounded mt-2"
              // Em um caso real, isso seria uma chamada ao supabase.auth.signOut()
              onClick={() => alert('Implementar signOut aqui')}
            >
              Sair
            </button>
          </div>
        ) : (
          <div>
            <p>Você não está autenticado</p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded mt-2"
              // Em um caso real, isso redirecionaria para a página de login
              onClick={() => alert('Implementar redirecionamento para login aqui')}
            >
              Entrar
            </button>
          </div>
        )}
      </div>
      
      {/* Seção de gerenciamento de tenant */}
      {isAuthenticated && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Tenants</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTenants.map(tenant => (
              <div 
                key={tenant.id}
                className={`p-4 border rounded ${
                  tenant.active 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <h3 className="font-bold">{tenant.name}</h3>
                <p className="text-sm text-gray-600">Slug: {tenant.slug}</p>
                <p className="text-sm mb-2">
                  Status: {tenant.active ? '✅ Ativo' : '❌ Inativo'}
                </p>
                
                <button
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
                  onClick={() => handleSwitchTenant(tenant.id)}
                  disabled={!tenant.active}
                >
                  Selecionar
                </button>
              </div>
            ))}
          </div>
          
          {availableTenants.length === 0 && (
            <p>Nenhum tenant disponível.</p>
          )}
          
          <div className="mt-4">
            <h3 className="font-semibold">Tenants Ativos: {activeTenants.length}</h3>
          </div>
        </div>
      )}
      
      <div className="bg-blue-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Sobre Zustand e Re-renderizações</h2>
        <p className="text-sm">
          Abra o console do navegador para ver mensagens de log que mostram
          quais componentes são re-renderizados quando o estado muda.
          Cada componente que usa um seletor específico só é re-renderizado
          quando a parte do estado que ele usa é alterada.
        </p>
      </div>
    </div>
  );
}
