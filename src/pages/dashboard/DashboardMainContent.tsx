import { DashboardMetrics as MetricsComponent } from "@/components/dashboard/DashboardMetrics";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { CashFlowProjection } from "@/components/dashboard/CashFlowProjection";
import { OverdueByTimeChart } from "@/components/dashboard/OverdueByTimeChart";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { RecentContracts } from "@/components/dashboard/RecentContracts";
import { PendingTasks } from "@/components/dashboard/PendingTasks";

interface CustomerMinimal { id: string; name?: string | null; company?: string | null; cpf_cnpj?: string | null; created_at: string }
interface ChargeMinimal { id: string; valor: number; customer?: CustomerMinimal | null }

interface DashboardMainContentProps {
  metrics: any;
  cashFlowData: any[];
  recentContracts: any[];
  pendingTasks: any[];
  onShowDetail: (title: string, data: any[]) => void;
}

export function DashboardMainContent({ metrics, cashFlowData, recentContracts, pendingTasks, onShowDetail }: DashboardMainContentProps) {
  return (
    <div className="space-y-6">
      <MetricsComponent metrics={metrics || defaultMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendChart data={metrics?.revenueByMonth || []} dueData={metrics?.revenueByDueDate || []} growth={metrics?.mrrGrowth || 0} />
      </div>

      <div className="w-full mt-6">
        <CashFlowProjection data={cashFlowData || []} days={30} />
      </div>

      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="mb-4 bg-transparent p-0">
          <TabsTrigger value="receivables" className="rounded-none border-b-2 border-transparent py-2 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none">Recebíveis</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-none border-b-2 border-transparent py-2 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none">Inadimplência</TabsTrigger>
          <TabsTrigger value="customer" className="rounded-none border-b-2 border-transparent py-2 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none">Clientes</TabsTrigger>
          <TabsTrigger value="contracts" className="rounded-none border-b-2 border-transparent py-2 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none">Contratos Recentes</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent py-2 text-muted-foreground data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none">Tarefas Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PaymentMethodChart data={metrics?.chargesByPaymentMethod || defaultPaymentMethods} />
            <div className="bg-card rounded-lg border shadow-sm p-6">
              <h3 className="text-base font-medium mb-4 text-foreground">Cobranças por Status</h3>
              <div className="space-y-4">
                {(metrics?.chargesByStatus || defaultStatus).map((statusGroup: any) => {
                  const styles = styleFor(statusGroup.status);
                  return (
                    <div
                      key={statusGroup.status}
                      className="flex items-center justify-between p-3 bg-card rounded-md border border-border hover:border-accent transition-colors cursor-pointer"
                      onClick={() => onShowDetail(labelFor(statusGroup.status), statusGroup.charges)}
                    >
                      <div className="flex items-center">
                        <div className={`mr-3 h-2 w-2 rounded-full ${styles.dot}`}></div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{labelFor(statusGroup.status)}</span>
                          <p className="text-xs text-muted-foreground">{statusGroup.count} cobranças</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${styles.amount}`}>{formatCurrency(statusGroup.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OverdueByTimeChart data={metrics?.overdueByTime || defaultOverdue} />
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="p-4 border-b"><h3 className="text-base font-medium">Maiores Inadimplências</h3></div>
              <div className="p-0 max-h-[250px] overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {metrics?.chargesByStatus.find((s: any) => s.status === 'OVERDUE')?.charges
                      .sort((a: ChargeMinimal, b: ChargeMinimal) => (b.valor || 0) - (a.valor || 0))
                      .slice(0,5)
                      .map((charge: ChargeMinimal) => (
                        <TableRow key={charge.id}>
                          <TableCell className="font-medium text-foreground">
                            {charge.customer?.name || 'Cliente não identificado'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-danger">
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

        <TabsContent value="customer" className="space-y-4">
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 border-b"><h3 className="text-base font-medium text-foreground">Novos Clientes no Período</h3></div>
            <div className="p-0 max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Nome</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground">Empresa</TableHead>
                    <TableHead className="hidden lg:table-cell text-foreground">CPF/CNPJ</TableHead>
                    <TableHead className="text-right text-foreground">Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metrics?.newCustomersList || []).slice(0, 20).map((c: CustomerMinimal) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-foreground">{c.name || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-foreground">{c.company || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-foreground">{c.cpf_cnpj || '—'}</TableCell>
                      <TableCell className="text-right text-foreground">{new Date(c.created_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <RecentContracts contracts={recentContracts} />
        </TabsContent>

        <TabsContent value="tasks">
          <PendingTasks tasks={pendingTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function labelFor(status: string) {
  if (status === 'RECEIVED') return 'Recebidas';
  if (status === 'PENDING') return 'Pendentes';
  if (status === 'OVERDUE') return 'Vencidas';
  if (status === 'CONFIRMED') return 'Confirmadas';
  return status;
}

function styleFor(status: string) {
  switch (status) {
    case 'RECEIVED':
      return { dot: 'bg-success', amount: 'text-success' };
    case 'CONFIRMED':
      return { dot: 'bg-success', amount: 'text-success' };
    case 'PENDING':
      return { dot: 'bg-warning', amount: 'text-warning' };
    case 'OVERDUE':
      return { dot: 'bg-danger', amount: 'text-danger' };
    default:
      return { dot: 'bg-muted', amount: 'text-foreground' };
  }
}

const defaultMetrics = {
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
    { period: '1-15', amount: 0, count: 0 },
    { period: '16-30', amount: 0, count: 0 },
    { period: '31-60', amount: 0, count: 0 },
    { period: '60+', amount: 0, count: 0 }
  ],
  chargesByStatus: [
    { status: 'RECEIVED', count: 0, amount: 0, charges: [] },
    { status: 'PENDING', count: 0, amount: 0, charges: [] },
    { status: 'OVERDUE', count: 0, amount: 0, charges: [] },
    { status: 'CONFIRMED', count: 0, amount: 0, charges: [] }
  ],
  chargesByPriority: [
    { priority: 'high', count: 0, amount: 0 },
    { priority: 'medium', count: 0, amount: 0 },
    { priority: 'low', count: 0, amount: 0 }
  ],
  chargesByPaymentMethod: [
    { method: 'pix', count: 0, amount: 0 },
    { method: 'boleto', count: 0, amount: 0 },
    { method: 'cartao', count: 0, amount: 0 },
    { method: 'outro', count: 0, amount: 0 }
  ]
};

const defaultPaymentMethods = [
  { method: 'pix', count: 0, amount: 0 },
  { method: 'boleto', count: 0, amount: 0 },
  { method: 'cartao', count: 0, amount: 0 },
  { method: 'outro', count: 0, amount: 0 }
];

const defaultStatus = [
  { status: 'RECEIVED', count: 0, amount: 0, charges: [] },
  { status: 'PENDING', count: 0, amount: 0, charges: [] },
  { status: 'OVERDUE', count: 0, amount: 0, charges: [] },
  { status: 'CONFIRMED', count: 0, amount: 0, charges: [] }
];

const defaultOverdue = [
  { period: '1-15', amount: 0, count: 0 },
  { period: '16-30', amount: 0, count: 0 },
  { period: '31-60', amount: 0, count: 0 },
  { period: '60+', amount: 0, count: 0 }
];