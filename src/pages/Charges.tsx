import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChargesDashboard } from "@/components/charges/dashboard/ChargesDashboard";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Plus, ArrowRightLeft } from "lucide-react";
import { CreateChargeDialog } from "@/components/charges/CreateChargeDialog";
import { ChargesCompanyList } from "@/components/charges/ChargesCompanyList";
import { ChargesList } from "@/components/charges/ChargesList";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { default as ReconciliationModal } from "@/components/reconciliation/ReconciliationModal";

export default function Charges() {
  // 🛡️ PROTEÇÃO MULTI-TENANT OBRIGATÓRIA
  const { hasAccess, isLoading: accessLoading, currentTenant, accessError } = useTenantAccessGuard();
  
  // 📍 NAVEGAÇÃO E PARÂMETROS
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  
  // 🎯 ESTADO LOCAL
  const [isCreateChargeDialogOpen, setIsCreateChargeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  
  // 🔍 LOGS DE AUDITORIA OBRIGATÓRIOS
  useEffect(() => {
    if (currentTenant) {
      console.log(`🏢 [AUDIT] Acessando página de cobranças - Tenant: ${currentTenant.name} (${currentTenant.id})`);
      console.log(`📊 [AUDIT] Aba ativa: ${activeTab}`);
    }
  }, [currentTenant, activeTab]);
  
  // 🧹 LIMPEZA DE CACHE AO TROCAR TENANT
  useEffect(() => {
    if (currentTenant?.id) {
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
    }
  }, [currentTenant?.id, queryClient]);
  
  // 🔒 VALIDAÇÃO CRÍTICA: Verificar correspondência entre tenant_id e slug da URL
  useEffect(() => {
    if (currentTenant && slug && currentTenant.slug !== slug) {
      console.error(`🚨 [SECURITY] Mismatch detectado! Tenant slug: ${currentTenant.slug}, URL slug: ${slug}`);
      console.error(`🚨 [SECURITY] Redirecionando para tenant correto...`);
      navigate(`/app/${currentTenant.slug}/cobrancas`, { replace: true });
      return;
    }
  }, [currentTenant, slug, navigate]);
  
  // 🛡️ GUARD CLAUSE: Verificar acesso antes de renderizar
  if (accessLoading) {
    console.log('⏳ [AUDIT] Verificando acesso à página de cobranças...');
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
      </div>
    );
  }
  
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
            {activeTab !== "dashboard" && (
              <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between border-b pb-3 px-2 sm:px-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Cobranças</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gerencie todas as suas cobranças em um só lugar
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="gap-1 text-white text-sm w-full sm:w-auto py-1.5" onClick={() => setIsCreateChargeDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Nova Cobrança
                  </Button>
                </div>
              </div>
            )}

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
                    <TabsTrigger 
                      value="company" 
                      className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-10 rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground"
                    >
                      Empresa
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="dashboard" className="mt-0 h-full">
                    <ChargesDashboard />
                  </TabsContent>
                  <TabsContent value="list" className="mt-0 h-full">
                    <ChargesList />
                  </TabsContent>
                  <TabsContent value="company" className="mt-0 h-full">
                    <ChargesCompanyList />
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
