/**
 * Router com Auto-Login Multi-Tenant inspirado na Omie
 * 
 * Permite acesso direto via URL limpa (/{tenant-slug}/dashboard) 
 * sem necessidade de códigos na URL, usando refresh tokens armazenados.
 */

import { Suspense, lazy } from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import { useTenantAutoLogin } from '@/hooks/useTenantAutoLogin';

/**
 * Componente de Loading simples
 */
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg">Carregando...</div>
  </div>
);

// Lazy loading de páginas com proteção automática
const Dashboard = lazy(() => import('../../pages/Dashboard'));
const Contracts = lazy(() => import('../../pages/Contracts'));
const Clients = lazy(() => import('../../pages/Clients'));
const Customers = lazy(() => import('../../pages/Customers'));
const Charges = lazy(() => import('../../pages/Charges'));
const Invoices = lazy(() => import('../../pages/Invoices'));
const Notifications = lazy(() => import('../../pages/Notifications'));
const Settings = lazy(() => import('../../pages/Settings'));
const Templates = lazy(() => import('../../pages/Templates'));
const Profile = lazy(() => import('../../pages/Profile'));
const Integrations = lazy(() => import('../../pages/Integrations'));
const Invites = lazy(() => import('../../pages/Invites'));
const UpdateValues = lazy(() => import('../../pages/UpdateValues'));
const ServicesPage = lazy(() => import('../../pages/services'));
const ProductsPage = lazy(() => import('../../pages/products'));
const MessageHistoryPage = lazy(() => import('../../pages/messages/history'));
const TenantUsersPage = lazy(() => import('../../pages/tenant/users'));
const ExamplesPage = lazy(() => import('../../pages/dashboard/examples'));
const FaturamentoKanban = lazy(() => import('../../pages/FaturamentoKanban'));
const Recebimentos = lazy(() => import('../../pages/Recebimentos'));
const ContractSettings = lazy(() => import('../../pages/ContractSettings'));
const Tasks = lazy(() => import('../../pages/Tasks'));
const NotFound = lazy(() => import('../../pages/NotFound'));

/**
 * Router principal com auto-login de tenant
 * AIDEV-NOTE: Evita renderização condicional que causa erro de hooks
 * Sempre renderiza as rotas, mas controla acesso via contexto
 */
export function TenantAutoLoginRouter() {
  const { slug } = useParams<{ slug: string }>();
  const { isValidating, hasValidSession, tenantData } = useTenantAutoLogin(slug);

  // AIDEV-NOTE: Sempre renderizar rotas para evitar mudanças na ordem de hooks
  // O controle de acesso é feito dentro de cada página via useTenantAccessGuard
  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* Mostrar loading overlay se ainda validando */}
      {isValidating && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <LoadingFallback />
        </div>
      )}
      
      <Routes>
        {/* ========== ROTA RAIZ DO TENANT ========== */}
        <Route path="/" element={<Navigate to={`/${slug}/dashboard`} replace />} />
        
        {/* ========== ROTAS PRINCIPAIS ========== */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="contratos" element={<Contracts />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="customers" element={<Customers />} />
        <Route path="cobrancas" element={<Charges />} />
        <Route path="invoices" element={<Invoices />} />
        
        {/* ========== ROTAS DE GESTÃO ========== */}
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="templates" element={<Templates />} />
        <Route path="profile" element={<Profile />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="invites" element={<Invites />} />
        <Route path="update-values" element={<UpdateValues />} />
        
        {/* ========== ROTAS DE PRODUTOS E SERVIÇOS ========== */}
        <Route path="services" element={<ServicesPage />} />
        <Route path="products" element={<ProductsPage />} />
        
        {/* ========== ROTAS FINANCEIRAS ========== */}
        <Route path="financeiro" element={<FaturamentoKanban />} />
        <Route path="faturamento" element={<FaturamentoKanban />} />
        <Route path="faturamento-kanban" element={<FaturamentoKanban />} />
        <Route path="recebimentos" element={<Recebimentos />} />
        
        {/* ========== ROTAS DE COMUNICAÇÃO ========== */}
        <Route path="messages/history" element={<MessageHistoryPage />} />
        
        {/* ========== ROTAS ADMINISTRATIVAS DO TENANT ========== */}
        <Route path="users" element={<TenantUsersPage />} />
        <Route path="admin" element={<TenantUsersPage />} />
        
        {/* ========== ROTAS AUXILIARES ========== */}
        <Route path="dashboard/examples" element={<ExamplesPage />} />
        <Route path="contract-settings" element={<ContractSettings />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="relatorios" element={<Dashboard />} />
        
        {/* ========== ROTA 404 PARA TENANT ========== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// Re-exportar hook para uso em outros componentes
export { useTenantAutoLogin, useCreateTenantSession } from '@/hooks/useTenantAutoLogin';
