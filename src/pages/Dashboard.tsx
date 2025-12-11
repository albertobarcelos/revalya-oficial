import { useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DetailDialog } from "@/pages/dashboard/DetailDialog";
import { format } from "date-fns";
import { useContracts } from "@/hooks/useContracts";
import { PendingTasks } from "@/components/dashboard/PendingTasks";
import { useSecureTasks } from "@/hooks/useSecureTasks";
import { useSecureTenantQuery, useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useParams, useNavigate } from "react-router-dom";

// Novos componentes
import { HeaderControls } from "@/pages/dashboard/HeaderControls";
import { DashboardMainContent } from "@/pages/dashboard/DashboardMainContent";

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 🛡️ PROTEÇÃO CRÍTICA CONTRA VAZAMENTO DE DADOS ENTRE TENANTS
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailTitle, setDetailTitle] = useState("");
  const { toast } = useToast();

  // 🚨 FORÇA LIMPEZA COMPLETA DO CACHE AO TROCAR TENANT
  useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🧹 [CACHE] Limpando cache dashboard para tenant: ${currentTenant.name} (${currentTenant.id})`);
      // Corrigir chave para coincidir com a usada na query
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlowProjection'] });
      queryClient.removeQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.removeQueries({ queryKey: ['cashFlowProjection'] });
    }
  }, [currentTenant.id, currentTenant.name, queryClient]);

  // 🔐 BUSCAR DADOS DE MÉTRICAS - USANDO HOOK SEGURO MULTI-TENANT
  const { data: dashboardMetrics, isLoading: isLoadingMetrics, error: metricsError } = useSecureTenantQuery(
    [
      'dashboard-metrics',
      format(dateRange?.from ?? new Date(), 'yyyy-MM-dd'),
      format(dateRange?.to ?? new Date(), 'yyyy-MM-dd')
    ],
    async (supabase, tenantId) => {
      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      if (!tenantId) {
        throw new Error('❌ ERRO CRÍTICO: tenant_id não fornecido para métricas do dashboard');
      }
      
      if (currentTenant?.slug !== slug) {
        throw new Error(`❌ ERRO DE SEGURANÇA: Slug do tenant (${currentTenant?.slug}) não corresponde à URL (${slug})`);
      }
      
      // 📊 [AUDIT] Log de acesso às métricas do dashboard
      console.log(`📊 [AUDIT] Buscando métricas do dashboard para tenant: ${currentTenant?.name} (${tenantId})`, {
        dateRange,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      return await dashboardService.getDashboardMetrics(tenantId, dateRange);
    },
    {
      enabled: hasAccess && currentTenant?.slug === slug,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    }
  );

  // 🔐 BUSCAR DADOS DE PROJEÇÃO DE FLUXO DE CAIXA - USANDO HOOK SEGURO MULTI-TENANT
  const { data: cashFlowData, isLoading: isLoadingCashFlow } = useSecureTenantQuery(
    ['cashFlowProjection'],
    async (supabase, tenantId) => {
      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
      if (!tenantId) {
        throw new Error('❌ ERRO CRÍTICO: tenant_id não fornecido para projeção de fluxo de caixa');
      }
      
      if (currentTenant?.slug !== slug) {
        throw new Error(`❌ ERRO DE SEGURANÇA: Slug do tenant (${currentTenant?.slug}) não corresponde à URL (${slug})`);
      }
      
      // 💰 [AUDIT] Log de acesso à projeção de fluxo de caixa
      console.log(`💰 [AUDIT] Buscando projeção de fluxo de caixa para tenant: ${currentTenant?.name} (${tenantId})`, {
        days: 90,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      return await dashboardService.getCashFlowProjection(tenantId, 90);
    },
    {
      enabled: hasAccess && currentTenant?.slug === slug,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    }
  );

  // 🔍 DEBUG: Log do estado do tenant na página
  console.log(`🔍 [DEBUG] Dashboard Page - Tenant:`, {
    hasAccess,
    accessError,
    currentTenant,
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    tenantSlug: currentTenant?.slug,
    urlSlug: slug,
    slugMatch: currentTenant?.slug === slug
  });

  // 🚨 TRATAMENTO DE ERROS DE SEGURANÇA
  useEffect(() => {
    if (metricsError) {
      const errorMessage = metricsError.message || 'Erro desconhecido';
      
      // 🛡️ Detectar violações de segurança
      if (errorMessage.includes('ERRO DE SEGURANÇA') || errorMessage.includes('ERRO CRÍTICO')) {
        console.error('🚨 [SECURITY] Violação de segurança detectada no Dashboard:', {
          error: errorMessage,
          tenant: currentTenant?.name,
          tenantId: currentTenant?.id,
          slug,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        
        toast({
          title: "⚠️ Erro de Segurança",
          description: "Acesso negado. Verifique suas permissões.",
          variant: "destructive",
        });
        
        // Redirecionar para página segura
        navigate('/dashboard');
        return;
      }
      
      // 📊 Log de outros erros
      console.error('📊 [ERROR] Erro ao carregar dados do dashboard:', {
        error: errorMessage,
        tenant: currentTenant?.name,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as métricas do dashboard.",
        variant: "destructive",
      });
    }
  }, [metricsError, currentTenant, slug, toast, navigate]);

  // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o tenant corresponde ao slug da URL
  if (currentTenant && currentTenant.slug !== slug) {
    console.error(`🚨 [SECURITY BREACH] Tenant slug não corresponde à URL!`, {
      currentTenantSlug: currentTenant.slug,
      urlSlug: slug,
      currentTenantName: currentTenant.name,
      currentTenantId: currentTenant.id
    });
    
    // Forçar redirecionamento para o portal
    console.log(`🔄 [REDIRECT] Redirecionando para portal devido a incompatibilidade de tenant`);
    window.location.href = `/meus-aplicativos`;
    return null;
  }

  // 🚨 GUARD CLAUSE CRÍTICO - IMPEDE RENDERIZAÇÃO SEM ACESSO VÁLIDO
  if (!hasAccess) {
    console.log(`🚨 [DEBUG] Acesso negado - hasAccess: ${hasAccess}, accessError: ${accessError}`);
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header />
          <div className="flex flex-col h-full p-4 overflow-auto">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // AUDIT LOG: Página renderizada com sucesso
  console.log(` [AUDIT] Página Dashboard renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  // 🔐 FUNÇÃO SEGURA PARA EXPORTAR MÉTRICAS
  const handleExport = async () => {
    // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA
    if (!currentTenant?.id) {
      console.error('🚨 [SECURITY] Tentativa de exportação sem tenant válido:', {
        currentTenant,
        slug,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      toast({
        title: "⚠️ Erro de Segurança",
        description: "Tenant não encontrado ou inválido",
        variant: "destructive",
      });
      return;
    }

    // 🛡️ Verificar correspondência entre tenant e slug
    if (currentTenant.slug !== slug) {
      console.error('🚨 [SECURITY] Tentativa de exportação com slug incorreto:', {
        tenantSlug: currentTenant.slug,
        urlSlug: slug,
        tenantId: currentTenant.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      toast({
        title: "⚠️ Erro de Segurança",
        description: "Acesso negado. Slug do tenant não corresponde.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 📤 [AUDIT] Log de exportação de métricas
      console.log('📤 [AUDIT] Iniciando exportação de métricas:', {
        tenant: currentTenant.name,
        tenantId: currentTenant.id,
        dateRange,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      const blob = await dashboardService.exportMetrics(currentTenant.id, dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metricas-${dateRange.from?.toISOString().split("T")[0]}-${
        dateRange.to?.toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // ✅ [AUDIT] Log de sucesso na exportação
      console.log('✅ [AUDIT] Exportação de métricas concluída com sucesso:', {
        tenant: currentTenant.name,
        tenantId: currentTenant.id,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "✅ Exportação concluída",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      // 🚨 [AUDIT] Log de erro na exportação
      console.error('🚨 [AUDIT] Erro ao exportar dados:', {
        error: error.message,
        tenant: currentTenant.name,
        tenantId: currentTenant.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      toast({
        title: "❌ Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Contratos recentes (Top 5 por criação)
  const { contracts: recentContracts, isLoading: isLoadingRecentContracts } = useContracts({
    limit: 5,
    page: 1,
  });

  const { tasks: pendingTasks } = useSecureTasks({ status: 'pending', limit: 10 });

  const handleShowDetail = (title: string, data: any[]) => {
    setDetailTitle(title);
    setDetailData(data);
    setShowDetail(true);
  };

  // AIDEV-NOTE: Removida função duplicada - usando utilitária do utils.ts

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header>
          <HeaderControls
            dateRange={dateRange}
            onDateChange={(range) => setDateRange(range as DateRange)}
            onExportCsv={handleExport}
            onExportExcel={async () => {
              try {
                const blob = await dashboardService.exportMetricsExcel(currentTenant.id, dateRange);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `metricas-${dateRange.from?.toISOString().split("T")[0]}-${dateRange.to?.toISOString().split("T")[0]}.xls`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast({ title: "✅ Exportação concluída", description: "Arquivo Excel gerado com cores." });
              } catch (error) {
                toast({ title: "❌ Erro na exportação", description: "Não foi possível gerar o Excel.", variant: "destructive" });
              }
            }}
          />
        </Header>
        <div className="flex flex-col h-full p-4 overflow-auto">
          {isLoadingMetrics || isLoadingCashFlow ? (
            <DashboardSkeleton />
          ) : (
            <DashboardMainContent
              metrics={dashboardMetrics}
              cashFlowData={cashFlowData || []}
              recentContracts={recentContracts}
              pendingTasks={pendingTasks as never[]}
              onShowDetail={handleShowDetail}
            />
          )}
        </div>
      </div>
      <DetailDialog open={showDetail} onOpenChange={setShowDetail} title={detailTitle} data={detailData as any[]} />
    </div>
  );
}
