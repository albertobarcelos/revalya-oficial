import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChargesDashboard } from "@/components/charges/dashboard/ChargesDashboard";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRightLeft } from "lucide-react";
import { CreateChargeDialog } from "@/components/charges/CreateChargeDialog";
import { ChargesList } from "@/components/charges/ChargesList";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useQueryClient } from "@tanstack/react-query";
import { default as ReconciliationModal } from "@/components/reconciliation/ReconciliationModal";

export default function Charges() {
  // 🛡️ PROTEÇÃO MULTI-TENANT OBRIGATÓRIA
  const { hasAccess, currentTenant, accessError } = useTenantAccessGuard();
  
  // 📍 NAVEGAÇÃO E PARÂMETROS
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  
  // 🎯 ESTADO LOCAL
  const [isCreateChargeDialogOpen, setIsCreateChargeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  
  // AIDEV-NOTE: Refs para evitar operações duplicadas
  const previousTenantIdRef = useRef<string | null>(null);
  const previousActiveTabRef = useRef<string | null>(null);
  
  // 🔍 LOGS DE AUDITORIA OBRIGATÓRIOS - OTIMIZADO
  useEffect(() => {
    // AIDEV-NOTE: Só logar quando realmente houver mudança
    if (currentTenant && (
      previousTenantIdRef.current !== currentTenant.id ||
      previousActiveTabRef.current !== activeTab
    )) {
      console.log(`🏢 [AUDIT] Acessando página de cobranças - Tenant: ${currentTenant.name} (${currentTenant.id})`);
      console.log(`📊 [AUDIT] Aba ativa: ${activeTab}`);
      previousTenantIdRef.current = currentTenant.id;
      previousActiveTabRef.current = activeTab;
    }
  }, [currentTenant, activeTab]);
  
  // 🧹 LIMPEZA DE CACHE AO TROCAR TENANT - OTIMIZADO
  useEffect(() => {
    // AIDEV-NOTE: Só limpar cache quando tenant realmente mudar
    if (currentTenant?.id && previousTenantIdRef.current !== currentTenant.id) {
      console.log(`🧹 [AUDIT] Limpando cache de cobranças para tenant: ${currentTenant.name}`);
      
      // Limpar cache específico de cobranças
      queryClient.removeQueries({ 
        queryKey: ['charges'],
        exact: false 
      });
      
      // Limpar cache de dashboard relacionado
      queryClient.removeQueries({ 
        queryKey: ['dashboard'],
        exact: false 
      });
      
      // Limpar cache de métricas financeiras
      queryClient.removeQueries({ 
        queryKey: ['financial-metrics'],
        exact: false 
      });
      
      // Atualizar referência após limpeza
      previousTenantIdRef.current = currentTenant.id;
    }
  }, [currentTenant?.id, queryClient]);
  
  // 🔒 VALIDAÇÃO CRÍTICA: Verificar correspondência entre tenant_id e slug da URL - OTIMIZADO
  const previousSlugRef = useRef<string | null>(null);
  useEffect(() => {
    // AIDEV-NOTE: Só validar quando houver mudança real
    if (currentTenant && slug && currentTenant.slug !== slug && previousSlugRef.current !== slug) {
      console.error(`🚨 [SECURITY] Mismatch detectado! Tenant slug: ${currentTenant.slug}, URL slug: ${slug}`);
      console.error(`🚨 [SECURITY] Redirecionando para tenant correto...`);
      previousSlugRef.current = slug;
      navigate(`/app/${currentTenant.slug}/cobrancas`, { replace: true });
      return;
    }
    // Atualizar referência mesmo quando não há ação
    if (slug) {
      previousSlugRef.current = slug;
    }
  }, [currentTenant, slug, navigate]);
  
  // 🛡️ GUARD CLAUSE: Verificar acesso antes de renderizar
  // AIDEV-NOTE: Verificação de loading removida - useTenantAccessGuard não retorna isLoading
  // O hook já valida o acesso de forma síncrona baseado no estado do Zustand
  
  if (!hasAccess || accessError) {
    console.error('🚫 [SECURITY] Acesso negado à página de cobranças:', accessError);
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleConciliar = () => {
    // AIDEV-NOTE: Abrindo modal de conciliação em vez de navegar para página separada
    console.log(`🔄 [AUDIT] Abrindo modal de conciliação - Tenant: ${currentTenant?.name}`);
    setIsReconciliationModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1" onClick={handleConciliar}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-sm">Conciliar</span>
            </Button>
          </div>
        </Header>
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="h-full flex flex-col">

            <div className="flex-1 overflow-hidden px-2 sm:px-10">
              <Tabs 
                defaultValue="dashboard" 
                className="h-full flex flex-col"
                onValueChange={(value) => setActiveTab(value)}
              >
                <div className="border-b">
                  <TabsList className="w-auto h-10 bg-transparent p-0">
                    <TabsTrigger 
                      value="dashboard" 
                      className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-10 rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground"
                    >
                      Painel de Cobranças
                    </TabsTrigger>
                    <TabsTrigger 
                      value="list" 
                      className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-10 rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground"
                    >
                      Lista
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="dashboard" className="mt-0 h-full">
                    <ChargesDashboard />
                  </TabsContent>
                  <TabsContent value="list" className="mt-0 h-full">
                    <ChargesList onCreateCharge={() => setIsCreateChargeDialogOpen(true)} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      <CreateChargeDialog
        open={isCreateChargeDialogOpen}
        onOpenChange={setIsCreateChargeDialogOpen}
      />

      <ReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
      />
    </div>
  );
}
