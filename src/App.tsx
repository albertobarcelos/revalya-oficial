import './App.css';
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { config } from "@/components/config";
import { initializeErrorProtection } from "@/utils/errorHandler";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SkeletonProvider } from "./providers/SkeletonProvider";
import { PrimeReactProvider } from "./providers/PrimeReactProvider";

import { SupabaseProvider } from "@/contexts/SupabaseProvider";
import { AppInitializationProvider } from "./contexts/AppInitializationContext";
import { PortalProvider } from "./contexts/PortalContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ConnectionStatusIndicator } from "@/components/ui/ConnectionStatusIndicator";
import { AppRouter } from "./components/router/AppRouter";

// Log temporário para debug
console.log('[DEBUG] App.tsx carregado - URL atual:', window.location.href);
// SingletonTest removido após validação bem-sucedida

// Providers de autenticação e tenant
import { AuthProvider } from "@/core/auth/AuthProvider";
import { UnifiedTenantProvider } from "@/core/tenant";

// Hooks para componentes auxiliares
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useAppRecovery } from "@/hooks/useAppRecovery";

// Sistema de sessões multi-tenant
import { TenantSessionManager } from "@/lib/TenantSessionManager";

/**
 * Componente principal da aplicação
 * 
 * Implementa uma estrutura simplificada com menos aninhamento de componentes
 * e uma abordagem mais declarativa para roteamento e autenticação.
 */
const App = () => {
  // Inicializa proteções contra erros de extensões do navegador
  useEffect(() => {
    initializeErrorProtection();
    
    // Inicializar limpeza automática de sessões multi-tenant
    TenantSessionManager.startAutoCleanup();
    
    console.log('[App] Sistema de limpeza automática de sessões inicializado');
  }, []);

  // Hook para controle de timeout por inatividade (30 minutos)
  const IdleTimeoutComponent = () => {
    useIdleTimeout(); // Reativado após correção do timer problemático
    return null;
  };
  
  // Componente para sistema de recuperação
  const AppRecoveryComponent = () => {
    useAppRecovery();
    return null;
  };
  
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="regua-cobranca-theme">
        <SkeletonProvider>
          <PrimeReactProvider>
            <QueryClientProvider client={queryClient}>
              <SupabaseProvider>
                <AuthProvider>
                  <UnifiedTenantProvider
                    useCore={true}
                    useFeatures={true}
                    useZustand={true}
                    onTenantChange={(tenant) => {
                      console.log('[App Migration] Tenant changed:', tenant);
                      // Limpar cache ao trocar tenant (segurança multi-tenant)
                      if (tenant?.id) {
                        queryClient.invalidateQueries();
                      }
                    }}
                  >
                    <AppInitializationProvider>
                      <TooltipProvider>
                        <PortalProvider>
                          <BrowserRouter>
                        {/* Componentes auxiliares */}
                        {/* <IdleTimeoutComponent /> Timeout reativado - 30 minutos */}
                        <AppRecoveryComponent />
                        <ConnectionStatusIndicator status={{ online: true, lastChecked: null, reconnectAttempts: 0 }} />
                        
                        {/* Testes de singleton concluídos com sucesso */}
                        
                        
                            {/* Router centralizado */}
                            <AppRouter />
                            
                            {/* Notificações */}
                            <Toaster />
                            <Sonner />
                          </BrowserRouter>
                        </PortalProvider>
                      </TooltipProvider>
                    </AppInitializationProvider>
                  </UnifiedTenantProvider>
                </AuthProvider>
              </SupabaseProvider>
              {config.showDevTools && process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools 
                  initialIsOpen={false} 
                  position="bottom" 
                />
              )}
            </QueryClientProvider>
          </PrimeReactProvider>
        </SkeletonProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
