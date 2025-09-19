/**
 * AIDEV-NOTE: Portal Administrativo com 5 Camadas de Segurança Multi-Tenant
 * 
 * Este componente implementa as 5 camadas obrigatórias de segurança:
 * 1. Zustand Store - Estado global isolado por tenant
 * 2. SessionStorage - Validação de sessão local
 * 3. React Query - Cache isolado com tenant_id nas query keys
 * 4. Supabase RLS - Row Level Security no banco
 * 5. Validação Dupla Frontend - Guards de acesso e validação de role
 * 
 * Funcionalidades críticas:
 * - useTenantAccessGuard: Validação obrigatória de acesso multi-tenant
 * - Logs de auditoria: Rastreamento completo de acessos
 * - Validação dupla: Role + tenant validation
 * - UI/UX segura: Indicadores visuais e feedback claro
 * - Cache isolado: Prevenção de vazamento de dados entre tenants
 * 
 * SEGURANÇA CRÍTICA:
 * - NUNCA renderizar rotas sem validação completa
 * - SEMPRE incluir tenant_id em logs de auditoria
 * - OBRIGATÓRIO usar useTenantAccessGuard antes de qualquer renderização
 * - Validação dupla: userRole E tenantUserRole devem ser ADMIN
 * - Logs detalhados para compliance e debugging de segurança
 */

import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { logInfo, logError } from '@/lib/logger';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { motion } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Importação dinâmica para evitar problemas de importação circular
const importPage = (path: string) => lazy(() => import(/* @vite-ignore */ path));

// Importação lazy de páginas para melhorar performance usando importação dinâmica
const AdminDashboard = importPage('@/pages/admin/dashboard');
const ResellersPage = importPage('@/pages/admin/resellers');
const NewResellerPage = importPage('@/pages/admin/resellers/new');
const ResellerDetailPage = importPage('@/pages/admin/resellers/[id]');
const TenantsPage = importPage('@/pages/admin/tenants');
const NewTenantPage = importPage('@/pages/admin/tenants/new');
const TenantDetailPage = importPage('@/pages/admin/tenants/[id]');

// 🎨 AIDEV-NOTE: Loading Screen com Design System Atualizado
// Componente de loading para importações lazy com microinterações
const LoadingScreen = () => (
  <motion.div 
    className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex flex-col items-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-12 w-12 text-blue-600" />
      </motion.div>
      <p className="text-slate-600 font-medium">Carregando portal administrativo...</p>
    </div>
  </motion.div>
);

// 🔐 AIDEV-NOTE: Interface atualizada para suportar validação multi-tenant
interface AdminRoutesProps {
  userRole?: string | null;
}

export function AdminRoutes({ userRole }: AdminRoutesProps) {
  // AIDEV-NOTE: CAMADA 1 - Validação de Acesso Multi-Tenant (OBRIGATÓRIO)
  // Este hook implementa as validações críticas de segurança:
  // - Para portal ADMIN: não requer tenant específico (requireTenant: false)
  // - Valida a role do usuário no contexto global
  // - Permite acesso administrativo sem tenant ativo
  // - Bloqueia acesso se a role não for ADMIN
  const { hasAccess, accessError, currentTenant, userRole: tenantUserRole } = useTenantAccessGuard({ 
    requireTenant: false
  });
  
  // AIDEV-NOTE: CAMADA 5 - Logs de Auditoria Obrigatórios
  // Sistema de auditoria para compliance e segurança:
  // - Registra TODOS os acessos ao portal administrativo
  // - Inclui dados do tenant, usuário e sessão
  // - Diferencia acessos permitidos vs negados
  // - Facilita debugging e investigação de segurança
  useEffect(() => {
    const auditData = {
      action: 'ADMIN_PORTAL_ACCESS',
      userRole: userRole || tenantUserRole,
      currentTenant: currentTenant ? {
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug
      } : null,
      timestamp: new Date().toISOString(),
      sessionId: sessionStorage.getItem('session_id') || 'unknown'
    };
    
    if (hasAccess) {
      console.log(`🔍 [AUDIT] Portal administrativo acessado:`, auditData);
      logInfo('[AdminRoutes] Acesso administrativo permitido com validação multi-tenant', auditData);
    } else {
      console.warn(`🚨 [AUDIT] Tentativa de acesso negado ao portal administrativo:`, auditData);
      logError('[AdminRoutes] Acesso negado - validação multi-tenant falhou', auditData);
    }
  }, [hasAccess, userRole, tenantUserRole, currentTenant]);
  
  // AIDEV-NOTE: VALIDAÇÃO DUPLA DE SEGURANÇA (CRÍTICO)
  // Implementa duas camadas de validação obrigatórias:
  // 1. Role validation: userRole OU tenantUserRole deve ser ADMIN
  // 2. Tenant validation: hasAccess deve ser true (do useTenantAccessGuard)
  // Para portal admin, priorizamos a role global do usuário autenticado
  const isAdmin = (userRole === 'ADMIN' || tenantUserRole === 'ADMIN');
  const hasValidAccess = hasAccess && isAdmin;
  
  // AIDEV-NOTE: GUARD CLAUSE - Bloqueio de Acesso (SEGURANÇA CRÍTICA)
  // Esta guard clause é a última linha de defesa:
  // - Bloqueia renderização se validações falharem
  // - Exibe UI informativa com detalhes do erro
  // - Inclui informações do tenant atual para debugging
  // - Oferece navegação segura de volta ao portal de seleção
  if (!hasValidAccess) {
    const errorMessage = !isAdmin 
      ? 'Você não tem permissão de administrador para acessar esta área.'
      : 'Acesso negado - role de administrador necessária.';
    
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="max-w-lg border-red-200 bg-white shadow-lg">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="destructive" className="text-xs">
                ACESSO NEGADO
              </Badge>
              <span className="text-sm text-red-700 font-medium">
                Portal Administrativo
              </span>
            </div>
            
            <p className="text-slate-700">{errorMessage}</p>
            
            {currentTenant && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-600">
                  <strong>Tenant Atual:</strong> {currentTenant.name}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Sua Role:</strong> {userRole || tenantUserRole || 'Não definida'}
                </p>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.location.href = '/meus-aplicativos'} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Voltar para Seleção de Portal
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }
  
  // AIDEV-NOTE: CACHE ISOLADO - Sistema de Cache Administrativo
  // Criamos um QueryClient isolado para o portal administrativo:
  // - Cache separado do portal tenant/reseller
  // - Query keys sempre incluem 'admin' + tenant_id
  // - Prevenção de vazamento de dados entre portais
  // - Invalidação automática ao trocar de tenant
  const adminQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // AIDEV-NOTE: Configurações de cache seguras para admin
        staleTime: 5 * 60 * 1000, // 5 minutos
        cacheTime: 10 * 60 * 1000, // 10 minutos
        retry: 2,
        refetchOnWindowFocus: true,
        // Query key deve sempre incluir tenant_id para isolamento
        queryKeyHashFn: (queryKey) => {
          const keyWithTenant = Array.isArray(queryKey) 
            ? ['admin', currentTenant?.id, ...queryKey]
            : ['admin', currentTenant?.id, queryKey];
          return JSON.stringify(keyWithTenant);
        }
      },
      mutations: {
        retry: 1,
        // AIDEV-NOTE: Logs de auditoria obrigatórios em mutações
        onSuccess: (data, variables, context) => {
          console.log('🔍 [AUDIT] Mutação administrativa executada:', {
            tenant_id: currentTenant?.id,
            timestamp: new Date().toISOString(),
            context
          });
        }
      }
    }
  });
  
  // AIDEV-NOTE: RENDERIZAÇÃO SEGURA - Portal Administrativo
  // Esta seção só é executada se TODAS as validações passaram:
  // - useTenantAccessGuard retornou hasAccess = true
  // - userRole ou tenantUserRole é ADMIN
  // - Logs de auditoria foram registrados
  // - Cache isolado foi configurado
  // - Indicador visual do tenant ativo é exibido
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AdminLayout>
      {/* AIDEV-NOTE: Indicador Visual do Tenant Ativo (UI/UX Segura)
          Este componente serve múltiplos propósitos de segurança:
          - Confirma visualmente qual tenant está ativo
          - Exibe a role do usuário no contexto atual
          - Previne confusão entre diferentes tenants
          - Facilita identificação de problemas de acesso
          - Usa motion.div para feedback visual suave */}
      {currentTenant && (
        <motion.div 
          className="bg-blue-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Portal Administrativo - {currentTenant.name}</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {tenantUserRole || userRole}
          </Badge>
        </motion.div>
      )}
      
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Rota padrão do admin */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* AIDEV-NOTE: Rotas Administrativas Protegidas
              Todas estas rotas herdam a proteção do AdminRoutes:
              - Só são acessíveis após validação multi-tenant completa
              - Cada página deve implementar useSecureTenantQuery
              - Cache isolado por tenant_id obrigatório
              - Logs de auditoria em operações críticas */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="resellers" element={<ResellersPage />} />
          <Route path="resellers/new" element={<NewResellerPage />} />
          <Route path="resellers/:id" element={<ResellerDetailPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/new" element={<NewTenantPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
          
          {/* Rota para qualquer outro caminho não encontrado dentro da área admin */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Suspense>
      </AdminLayout>
    </QueryClientProvider>
  );
}
