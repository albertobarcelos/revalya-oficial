/**
 * AppRouter - Roteador Principal da Aplicação Multi-Tenant
 * 
 * Implementa a estrutura robusta de roteamento seguindo o fluxo:
 * Login → Portal → /{tenant-slug}/* → SPA Multi-tenant
 * 
 * Camadas de segurança:
 * 1. Autenticação de usuário (Supabase Auth)
 * 2. Validação de tenant por slug
 * 3. Isolamento por aba do navegador
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { TenantAutoLoginRouter } from './TenantAutoLoginRouter';
import { AdminRoutes } from './AdminRoutes';
import { AdminLayout } from '@/components/layouts/AdminLayout';
/**
 * Estrutura de Rotas Robusta Multi-Tenant
 * 
 * Hierarquia:
 * /login                    # Autenticação inicial
 * /meus-aplicativos         # Seleção de tenant
 * /{tenant-slug}/*          # SPA Multi-tenant protegido
 * /admin/*                  # Área administrativa
 */
const ROUTES = {
  // Rotas públicas (não requerem autenticação)
  PUBLIC: {
    LOGIN: '/login',
    REGISTER: '/register', 
    RESET_PASSWORD: '/reset-password',
    REQUEST_UPDATE: '/solicitar',
    INVALID_LINK: '/invalid-link',
  },
  
  // Rotas protegidas (requerem autenticação)
  PROTECTED: {
    PORTAL: '/meus-aplicativos',  // Manter nome original conforme solicitação
    ROOT: '/',
  },
  
  // Rotas administrativas
  ADMIN: {
    ROOT: '/admin',
    USERS: '/admin/users', 
    SETTINGS: '/admin/settings',
  },
  
  // Padrões de rotas de tenant (dinâmicas)
  TENANT: {
    ROOT: (slug: string) => `/${slug}`,
    DASHBOARD: (slug: string) => `/${slug}/dashboard`,
    CONTRACTS: (slug: string) => `/${slug}/contratos`,
    CLIENTS: (slug: string) => `/${slug}/clientes`,
    FINANCIAL: (slug: string) => `/${slug}/financeiro`,
    REPORTS: (slug: string) => `/${slug}/relatorios`,
    SETTINGS: (slug: string) => `/${slug}/configuracoes`,
    ADMIN: (slug: string) => `/${slug}/admin`,
  }
};

// Lazy loading de páginas para otimização de performance
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const RequestUpdate = lazy(() => import('@/pages/RequestUpdate'));
const InvalidLink = lazy(() => import('@/pages/auth/InvalidLink'));
const PortalPage = lazy(() => import('@/pages/portal-selection')); // Renomeado para consistência
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Componente de carregamento para Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

/**
 * Componente principal de roteamento seguindo arquitetura robusta
 * AIDEV-NOTE: Corrigido para usar user_metadata ao invés de localStorage
 * para obter userRole, garantindo consistência com outros componentes
 */
export function AppRouter() {
  const { user, loading } = useSupabase();

  // Loading state durante inicialização
  if (loading) {
    return <LoadingFallback />;
  }

  // AIDEV-NOTE: Obter userRole do user_metadata para consistência
  // com outros componentes que usam a mesma fonte de dados
  const userRole = user?.user_metadata?.user_role || null;
  
  // Debug log para verificar dados do usuário
  console.log('[AppRouter] Debug - User data:', {
    hasUser: !!user,
    userEmail: user?.email,
    userRole,
    userMetadata: user?.user_metadata,
    timestamp: new Date().toISOString()
  });

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ========== ROTAS PÚBLICAS (Não requerem autenticação) ========== */}
        <Route 
          path={ROUTES.PUBLIC.LOGIN} 
          element={!user ? <Login /> : <Navigate to={ROUTES.PROTECTED.PORTAL} replace />} 
        />
        <Route 
          path={ROUTES.PUBLIC.REGISTER} 
          element={!user ? <Register /> : <Navigate to={ROUTES.PROTECTED.PORTAL} replace />} 
        />
        <Route 
          path={ROUTES.PUBLIC.RESET_PASSWORD} 
          element={<ResetPassword />} 
        />
        <Route 
          path={ROUTES.PUBLIC.REQUEST_UPDATE} 
          element={<RequestUpdate />} 
        />
        <Route 
          path={ROUTES.PUBLIC.INVALID_LINK} 
          element={<InvalidLink />} 
        />

        {/* ========== ROTAS PROTEGIDAS (Requerem autenticação) ========== */}
        <Route 
          path={ROUTES.PROTECTED.PORTAL} 
          element={user ? <PortalPage /> : <Navigate to={ROUTES.PUBLIC.LOGIN} replace />} 
        />
        
        {/* ========== ROTAS ADMINISTRATIVAS ========== */}
        <Route 
          path={`${ROUTES.ADMIN.ROOT}/*`} 
          element={user ? (
            <AdminLayout>
              <AdminRoutes userRole={userRole} />
            </AdminLayout>
          ) : <Navigate to={ROUTES.PUBLIC.LOGIN} replace />} 
        />
        
        {/* ========== ROTAS DE TENANT MULTI-TENANT COM AUTO-LOGIN ========== */}
        {/* Rota principal: /{tenant-slug}/* - Sistema Omie-inspired com URLs limpas */}
        <Route 
          path="/:slug/*" 
          element={user ? <TenantAutoLoginRouter /> : <Navigate to={ROUTES.PUBLIC.LOGIN} replace />} 
        />
        
        {/* Rota legada /t/{slug}/* - manter para compatibilidade temporária */}
        <Route 
          path="/t/:slug/*" 
          element={user ? <TenantAutoLoginRouter /> : <Navigate to={ROUTES.PUBLIC.LOGIN} replace />} 
        />
        
        {/* Compatibilidade com /portal (redirect para /meus-aplicativos) */}
        <Route 
          path="/portal" 
          element={<Navigate to={ROUTES.PROTECTED.PORTAL} replace />} 
        />

        {/* ========== ROTAS DE FALLBACK ========== */}
        {/* Rota raiz - redireciona baseado em autenticação */}
        <Route 
          path={ROUTES.PROTECTED.ROOT} 
          element={<Navigate to={user ? ROUTES.PROTECTED.PORTAL : ROUTES.PUBLIC.LOGIN} replace />} 
        />
        
        {/* 404 - Qualquer rota não encontrada */}
        <Route 
          path="*" 
          element={user ? <NotFoundPage /> : <Navigate to={ROUTES.PUBLIC.LOGIN} replace />} 
        />
      </Routes>
    </Suspense>
  );
}
