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

// Providers de autenticação e tenant
import { AuthProvider } from "@/core/auth/AuthProvider";
import { UnifiedTenantProvider } from "@/core/tenant";

// Hooks para componentes auxiliares
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useAppRecovery } from "@/hooks/useAppRecovery";

// Sistema de sessões multi-tenant
import { TenantSessionManager } from "@/lib/TenantSessionManager";

/**
 * AIDEV-NOTE: Ordem otimizada dos providers para evitar dependências circulares
 * 1. ErrorBoundary (captura erros globais)
 * 2. ThemeProvider (tema global)
 * 3. QueryClientProvider (cache e estado global)
 * 4. SupabaseProvider (cliente Supabase)
 * 5. AuthProvider (autenticação)
 * 6. UnifiedTenantProvider (contexto de tenant)
 * 7. Providers específicos da aplicação
 */
const App = () => {
  useEffect(() => {
    initializeErrorProtection();
    TenantSessionManager.startAutoCleanup();
    console.log('[App] Sistema de limpeza automática de sessões inicializado');
  }, []);

  const IdleTimeoutComponent = () => {
    useIdleTimeout();
    return null;
  };
  
  const AppRecoveryComponent = () => {
    useAppRecovery();
    return null;
  };
  
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="regua-cobranca-theme">
        <QueryClientProvider client={queryClient}>
          <SupabaseProvider>
            <AuthProvider>
              <UnifiedTenantProvider
                useCore={true}
                useFeatures={true}
                useZustand={true}
                onTenantChange={(tenant) => {
                  console.log('[App Migration] Tenant changed:', tenant);
                  if (tenant?.id) {
                    queryClient.invalidateQueries();
                  }
                }}
              >
                <AppInitializationProvider>
                  <TooltipProvider>
                    <SkeletonProvider>
                      <PrimeReactProvider>
                        <PortalProvider>
                          <BrowserRouter
                            future={{
                              v7_startTransition: true,
                              v7_relativeSplatPath: true,
                            }}
                          >
                            <AppRecoveryComponent />
                            <ConnectionStatusIndicator 
                              status={{ 
                                online: true, 
                                lastChecked: null, 
                                reconnectAttempts: 0 
                              }} 
                            />
                            
                            <AppRouter />
                            
                            <Toaster />
                            <Sonner />
                          </BrowserRouter>
                        </PortalProvider>
                      </PrimeReactProvider>
                    </SkeletonProvider>
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
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
