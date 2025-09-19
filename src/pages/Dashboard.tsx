import { useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Calendar, Download, TrendingUp } from "lucide-react";
import { formatCurrency, formatCpfCnpj } from "@/lib/utils";
import { formatInstallmentDisplay, getInstallmentBadgeVariant } from "@/utils/installmentUtils";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { RecentContracts } from "@/components/dashboard/RecentContracts"; // Adicionar se necessário
import { PendingTasks } from "@/components/dashboard/PendingTasks";
import { useSecureTenantQuery, useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useParams, useNavigate } from "react-router-dom";

// Novos componentes
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { CashFlowProjection } from "@/components/dashboard/CashFlowProjection";
import { OverdueByTimeChart } from "@/components/dashboard/OverdueByTimeChart";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { KeyMetricsCards } from "@/components/dashboard/KeyMetricsCards";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlowProjection'] });
      queryClient.removeQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.removeQueries({ queryKey: ['cashFlowProjection'] });
    }
  }, [currentTenant?.id, queryClient]);

  // 🔐 BUSCAR DADOS DE MÉTRICAS - USANDO HOOK SEGURO MULTI-TENANT
  const { data: dashboardMetrics, isLoading: isLoadingMetrics, error: metricsError } = useSecureTenantQuery(
    ['dashboard-metrics'],
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
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-sm">Exportar</span>
            </Button>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
            />
          </div>
        </Header>
        <div className="flex flex-col h-full p-4 overflow-auto">
          {isLoadingMetrics || isLoadingCashFlow ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Cards de métricas principais - Layout original restaurado */}
              <DashboardMetrics metrics={dashboardMetrics || {
                totalPaid: 0,
                totalPending: 0,
                totalOverdue: 0,
                totalReceivable: 0,
                paidCount: 0,
                pendingCount: 0,
                overdueCount: 0,
                newCustomers: 0,
                newCustomersList: [],
                mrrTotal: 0,
                mrcTotal: 0,
                netMonthlyValue: 0,
                mrrGrowth: 0,
                avgTicket: 0,
                avgDaysToReceive: 0,
                revenueByMonth: [],
                revenueByDueDate: [],
                overdueByTime: [
                  { period: "1-15", amount: 0, count: 0 },
                  { period: "16-30", amount: 0, count: 0 },
                  { period: "31-60", amount: 0, count: 0 },
                  { period: "60+", amount: 0, count: 0 }
                ],
                chargesByStatus: [
                  { status: "RECEIVED", count: 0, amount: 0, charges: [] },
                  { status: "PENDING", count: 0, amount: 0, charges: [] },
                  { status: "OVERDUE", count: 0, amount: 0, charges: [] },
                  { status: "CONFIRMED", count: 0, amount: 0, charges: [] }
                ],
                chargesByPriority: [
                  { priority: "high", count: 0, amount: 0 },
                  { priority: "medium", count: 0, amount: 0 },
                  { priority: "low", count: 0, amount: 0 }
                ],
                chargesByPaymentMethod: [
                  { method: "pix", count: 0, amount: 0 },
                  { method: "boleto", count: 0, amount: 0 },
                  { method: "cartao", count: 0, amount: 0 },
                  { method: "outro", count: 0, amount: 0 }
                ]
              }} />

              {/* Gráficos principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tendência de receita - sempre exibir */}
                <RevenueTrendChart 
                  data={dashboardMetrics?.revenueByMonth || []}
                  dueData={dashboardMetrics?.revenueByDueDate || []}
                  growth={dashboardMetrics?.mrrGrowth || 0}
                />
              </div>
              
              {/* Projeção de fluxo de caixa em uma linha separada - sempre exibir */}
              <div className="w-full mt-6">
                <CashFlowProjection data={cashFlowData || []} days={30} />
              </div>

              {/* Tabs para diferentes visualizações */}
              <Tabs defaultValue="receivables" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="receivables">Recebíveis</TabsTrigger>
                  <TabsTrigger value="overdue">Inadimplência</TabsTrigger>
                  <TabsTrigger value="customer">Clientes</TabsTrigger>
                  <TabsTrigger value="contracts">Contratos Recentes</TabsTrigger>
                  <TabsTrigger value="tasks">Tarefas Pendentes</TabsTrigger>
                </TabsList>
                
                {/* Recebíveis */}
                <TabsContent value="receivables" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Distribuição por métodos de pagamento - sempre exibir */}
                    <PaymentMethodChart data={dashboardMetrics?.chargesByPaymentMethod || [
                      { method: "pix", count: 0, amount: 0 },
                      { method: "boleto", count: 0, amount: 0 },
                      { method: "cartao", count: 0, amount: 0 },
                      { method: "outro", count: 0, amount: 0 }
                    ]} />
                    
                    {/* Cobranças por período - sempre exibir */}
                    <div className="bg-card rounded-lg border shadow-sm p-6">
                      <h3 className="text-base font-medium mb-4">Cobranças por Status</h3>
                      <div className="space-y-4">
                        {(dashboardMetrics?.chargesByStatus || [
                          { status: "RECEIVED", count: 0, amount: 0, charges: [] },
                          { status: "PENDING", count: 0, amount: 0, charges: [] },
                          { status: "OVERDUE", count: 0, amount: 0, charges: [] },
                          { status: "CONFIRMED", count: 0, amount: 0, charges: [] }
                        ]).map((statusGroup) => (
                          <div 
                            key={statusGroup.status}
                            className="flex items-center justify-between p-3 bg-background rounded-md hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => handleShowDetail(`Cobranças ${statusGroup.status === 'RECEIVED' ? 'Recebidas' : statusGroup.status === 'PENDING' ? 'Pendentes' : 'Vencidas'}`, statusGroup.charges)}
                          >
                            <div>
                              <span className="text-sm font-medium">
                                {statusGroup.status === 'RECEIVED' ? 'Recebidas' : 
                                 statusGroup.status === 'PENDING' ? 'Pendentes' : 
                                 statusGroup.status === 'OVERDUE' ? 'Vencidas' : 
                                 statusGroup.status === 'CONFIRMED' ? 'Confirmadas' : statusGroup.status}
                              </span>
                              <p className="text-xs text-muted-foreground">{statusGroup.count} cobranças</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">{formatCurrency(statusGroup.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Inadimplência */}
                <TabsContent value="overdue" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inadimplência por tempo - sempre exibir */}
                    <OverdueByTimeChart data={dashboardMetrics?.overdueByTime || [
                      { period: "1-15", amount: 0, count: 0 },
                      { period: "16-30", amount: 0, count: 0 },
                      { period: "31-60", amount: 0, count: 0 },
                      { period: "60+", amount: 0, count: 0 }
                    ]} />
                    
                    {/* Lista de inadimplentes */}
                    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="text-base font-medium">Maiores Inadimplências</h3>
                      </div>
                      <div className="p-0 max-h-[250px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboardMetrics?.chargesByStatus
                              .find(s => s.status === 'OVERDUE')?.charges
                              .sort((a, b) => (b.valor || 0) - (a.valor || 0))
                              .slice(0, 5)
                              .map((charge) => (
                                <TableRow key={charge.id}>
                                  <TableCell className="font-medium">
                                    {charge.customer?.name || "Cliente não identificado"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(charge.valor)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Clientes */}
                <TabsContent value="customer" className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Novos clientes */}
                    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="text-base font-medium">Novos Clientes (Últimos {dashboardMetrics?.newCustomersList?.length || 0})</h3>
                      </div>
                      <div className="p-0 max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Empresa</TableHead>
                              <TableHead>CPF/CNPJ</TableHead>
                              <TableHead className="text-right">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(dashboardMetrics?.newCustomersList || []).slice(0, 5)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((customer) => (
                                <TableRow key={customer.id}>
                                  <TableCell className="font-medium">
                                    {customer.name || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {customer.company || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {formatCpfCnpj(customer.cpf_cnpj)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {format(new Date(customer.created_at), 'dd/MM/yyyy')}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="contracts">
                  <RecentContracts contracts={[]} />
                </TabsContent>
                
                <TabsContent value="tasks">
                  <PendingTasks tasks={[]} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
      {/* Modal para exibir detalhes */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
            <DialogDescription>
              Detalhes das cobranças selecionadas
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailData.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      {charge.customer?.name || "Cliente não identificado"}
                    </TableCell>
                    <TableCell>{formatCurrency(charge.valor)}</TableCell>
                    <TableCell>
                      {format(new Date(charge.data_vencimento), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInstallmentBadgeVariant(charge.descricao)} className="text-xs">
                        {formatInstallmentDisplay(charge.descricao)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        charge.status === 'RECEIVED' ? 'bg-success/10 text-success' :
                        charge.status === 'PENDING' ? 'bg-primary/10 text-primary' :
                        charge.status === 'OVERDUE' ? 'bg-danger/10 text-danger' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {charge.status === 'RECEIVED' ? 'Recebido' :
                         charge.status === 'PENDING' ? 'Pendente' :
                         charge.status === 'OVERDUE' ? 'Vencido' :
                         charge.status === 'CONFIRMED' ? 'Confirmado' : charge.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
