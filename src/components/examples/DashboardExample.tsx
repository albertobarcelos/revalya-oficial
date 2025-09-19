import React, { useState, useEffect } from 'react';
import {
  Page,
  PrimeCard,
  MetricCard,
  PrimeDataTable,
  PrimeButton,
  IconButton,
  Select,
  useToast,
  layoutUtils,
  primeUtils,
  type PageHeaderConfig,
  type ExtendedMenuItem,
  type DataTableColumn,
  type DataTableAction
} from '@/components/prime';

// Tipos para os dados do dashboard
interface DashboardMetrics {
  totalContracts: {
    value: number;
    trend: number;
    previousValue: number;
  };
  activeContracts: {
    value: number;
    trend: number;
    previousValue: number;
  };
  monthlyRevenue: {
    value: number;
    trend: number;
    previousValue: number;
  };
  pendingPayments: {
    value: number;
    trend: number;
    previousValue: number;
  };
}

interface RecentContract {
  id: string;
  contractNumber: string;
  clientName: string;
  type: 'service' | 'product' | 'subscription';
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  value: number;
  startDate: string;
  endDate?: string;
  paymentMethod: 'cash' | 'card' | 'pix' | 'bank_transfer';
}

interface PendingTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignee: string;
  category: 'contract' | 'payment' | 'client' | 'system';
}

// Dados mockados
const mockMetrics: DashboardMetrics = {
  totalContracts: {
    value: 1247,
    trend: 12.5,
    previousValue: 1108
  },
  activeContracts: {
    value: 892,
    trend: 8.3,
    previousValue: 824
  },
  monthlyRevenue: {
    value: 485750.00,
    trend: -3.2,
    previousValue: 501890.00
  },
  pendingPayments: {
    value: 23450.00,
    trend: -15.7,
    previousValue: 27820.00
  }
};

const mockRecentContracts: RecentContract[] = [
  {
    id: '1',
    contractNumber: 'CT-2024-001',
    clientName: 'João Silva',
    type: 'service',
    status: 'active',
    value: 2500.00,
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    paymentMethod: 'pix'
  },
  {
    id: '2',
    contractNumber: 'CT-2024-002',
    clientName: 'Empresa ABC Ltda',
    type: 'subscription',
    status: 'pending',
    value: 8900.00,
    startDate: '2024-01-20',
    paymentMethod: 'bank_transfer'
  },
  {
    id: '3',
    contractNumber: 'CT-2024-003',
    clientName: 'Maria Santos',
    type: 'product',
    status: 'active',
    value: 1200.00,
    startDate: '2024-01-18',
    endDate: '2024-02-18',
    paymentMethod: 'card'
  },
  {
    id: '4',
    contractNumber: 'CT-2024-004',
    clientName: 'Tech Solutions Inc',
    type: 'service',
    status: 'expired',
    value: 15000.00,
    startDate: '2023-12-01',
    endDate: '2024-01-01',
    paymentMethod: 'bank_transfer'
  },
  {
    id: '5',
    contractNumber: 'CT-2024-005',
    clientName: 'Ana Costa',
    type: 'subscription',
    status: 'active',
    value: 450.00,
    startDate: '2024-01-22',
    paymentMethod: 'pix'
  }
];

const mockPendingTasks: PendingTask[] = [
  {
    id: '1',
    title: 'Renovar contrato CT-2023-089',
    description: 'Contrato expira em 3 dias',
    priority: 'urgent',
    dueDate: '2024-01-25',
    assignee: 'João Silva',
    category: 'contract'
  },
  {
    id: '2',
    title: 'Processar pagamento pendente',
    description: 'Pagamento de R$ 2.500,00 aguardando confirmação',
    priority: 'high',
    dueDate: '2024-01-26',
    assignee: 'Maria Santos',
    category: 'payment'
  },
  {
    id: '3',
    title: 'Atualizar dados do cliente',
    description: 'Cliente solicitou atualização de endereço',
    priority: 'medium',
    dueDate: '2024-01-28',
    assignee: 'Pedro Costa',
    category: 'client'
  },
  {
    id: '4',
    title: 'Backup do sistema',
    description: 'Executar backup semanal do banco de dados',
    priority: 'low',
    dueDate: '2024-01-30',
    assignee: 'Sistema',
    category: 'system'
  }
];

// Componente principal
export const DashboardExample: React.FC = () => {
  const toast = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics>(mockMetrics);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>(mockRecentContracts);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>(mockPendingTasks);
  const [loading, setLoading] = useState(false);

  // Configuração do cabeçalho da página
  const headerConfig: PageHeaderConfig = {
    title: 'Dashboard',
    subtitle: 'Visão Geral do Sistema',
    description: 'Acompanhe as principais métricas e atividades do seu negócio em tempo real.',
    breadcrumb: [
      { label: 'Dashboard', icon: 'pi pi-home' }
    ],
    actions: layoutUtils.createHeaderActions(
      <Select
        name="period"
        value={selectedPeriod}
        onChange={(e) => setSelectedPeriod(e.target.value)}
        options={[
          { label: 'Últimos 7 dias', value: '7d' },
          { label: 'Últimos 30 dias', value: '30d' },
          { label: 'Últimos 90 dias', value: '90d' },
          { label: 'Último ano', value: '1y' }
        ]}
        placeholder="Período"
        className="w-40"
      />,
      <IconButton
        icon="pi pi-refresh"
        variant="outline"
        onClick={() => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            toast.success('Dados atualizados!');
          }, 1000);
        }}
        tooltip="Atualizar dados"
        loading={loading}
      />,
      <PrimeButton
        variant="primary"
        icon="pi pi-plus"
        onClick={() => toast.info('Redirecionando para novo contrato...')}
      >
        Novo Contrato
      </PrimeButton>
    )
  };

  // Itens do menu lateral
  const sidebarItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Dashboard', 'pi pi-home', '/dashboard', { badge: 'Atual' }),
    layoutUtils.createMenuGroup('Contratos', [
      layoutUtils.createMenuItem('Listar Contratos', 'pi pi-list', '/contracts'),
      layoutUtils.createMenuItem('Novo Contrato', 'pi pi-plus', '/contracts/new'),
      layoutUtils.createMenuItem('Modelos', 'pi pi-copy', '/contracts/templates'),
      layoutUtils.createMenuItem('Relatórios', 'pi pi-chart-line', '/contracts/reports')
    ], 'pi pi-file'),
    layoutUtils.createMenuGroup('Clientes', [
      layoutUtils.createMenuItem('Listar Clientes', 'pi pi-users', '/clients'),
      layoutUtils.createMenuItem('Novo Cliente', 'pi pi-user-plus', '/clients/new'),
      layoutUtils.createMenuItem('Importar', 'pi pi-upload', '/clients/import')
    ], 'pi pi-users'),
    layoutUtils.createMenuGroup('Financeiro', [
      layoutUtils.createMenuItem('Faturamento', 'pi pi-dollar', '/financial/billing'),
      layoutUtils.createMenuItem('Pagamentos', 'pi pi-credit-card', '/financial/payments'),
      layoutUtils.createMenuItem('Relatórios', 'pi pi-chart-bar', '/financial/reports')
    ], 'pi pi-wallet'),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings')
  ];

  // Itens do menu superior
  const topNavItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Dashboard', 'pi pi-home', '/dashboard'),
    layoutUtils.createMenuItem('Contratos', 'pi pi-file', '/contracts'),
    layoutUtils.createMenuItem('Clientes', 'pi pi-users', '/clients'),
    layoutUtils.createMenuItem('Financeiro', 'pi pi-dollar', '/financial')
  ];

  // Menu do usuário
  const userMenuItems: ExtendedMenuItem[] = [
    layoutUtils.createMenuItem('Perfil', 'pi pi-user', '/profile'),
    layoutUtils.createMenuItem('Notificações', 'pi pi-bell', '/notifications', { badge: '3' }),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings'),
    { separator: true },
    layoutUtils.createMenuItem('Ajuda', 'pi pi-question-circle', '/help'),
    layoutUtils.createMenuItem('Sair', 'pi pi-sign-out', '/logout')
  ];

  // Configuração das colunas da tabela de contratos
  const contractColumns: DataTableColumn<RecentContract>[] = [
    primeUtils.dataTable.createColumn('contractNumber', 'Contrato', {
      sortable: true,
      render: (value, row) => (
        <div className="font-medium text-blue-600 dark:text-blue-400">
          {value}
        </div>
      )
    }),
    primeUtils.dataTable.createColumn('clientName', 'Cliente', { sortable: true }),
    primeUtils.dataTable.createColumn('type', 'Tipo', {
      render: (value) => {
        const typeLabels = {
          service: 'Serviço',
          product: 'Produto',
          subscription: 'Assinatura'
        };
        return typeLabels[value as keyof typeof typeLabels];
      }
    }),
    primeUtils.dataTable.createColumn('status', 'Status', {
      render: (value) => {
        const statusConfig = {
          active: { label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
          pending: { label: 'Pendente', color: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning' },
          expired: { label: 'Expirado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
          cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground' }
        };
        const config = statusConfig[value as keyof typeof statusConfig];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    }),
    primeUtils.dataTable.createColumn('value', 'Valor', {
      sortable: true,
      render: (value) => primeUtils.formatters.currency(value)
    }),
    primeUtils.dataTable.createColumn('startDate', 'Início', {
      sortable: true,
      render: (value) => primeUtils.formatters.date(value)
    })
  ];

  // Ações da tabela de contratos
  const contractActions: DataTableAction<RecentContract>[] = [
    primeUtils.dataTable.createAction('Visualizar', 'pi pi-eye', (row) => {
      toast.info(`Visualizando contrato ${row.contractNumber}`);
    }),
    primeUtils.dataTable.createAction('Editar', 'pi pi-pencil', (row) => {
      toast.info(`Editando contrato ${row.contractNumber}`);
    }),
    primeUtils.dataTable.createAction('Renovar', 'pi pi-refresh', (row) => {
      toast.success(`Renovando contrato ${row.contractNumber}`);
    }, { condition: (row) => row.status === 'expired' })
  ];

  // Configuração das colunas da tabela de tarefas
  const taskColumns: DataTableColumn<PendingTask>[] = [
    primeUtils.dataTable.createColumn('title', 'Tarefa', { sortable: true }),
    primeUtils.dataTable.createColumn('priority', 'Prioridade', {
      render: (value) => {
        const priorityConfig = {
          low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
          medium: { label: 'Média', color: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning' },
          high: { label: 'Alta', color: 'bg-warning/20 text-warning dark:bg-warning/30 dark:text-warning' },
          urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
        };
        const config = priorityConfig[value as keyof typeof priorityConfig];
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    }),
    primeUtils.dataTable.createColumn('dueDate', 'Prazo', {
      sortable: true,
      render: (value) => primeUtils.formatters.date(value)
    }),
    primeUtils.dataTable.createColumn('assignee', 'Responsável', { sortable: true })
  ];

  // Ações da tabela de tarefas
  const taskActions: DataTableAction<PendingTask>[] = [
    primeUtils.dataTable.createAction('Concluir', 'pi pi-check', (row) => {
      setPendingTasks(prev => prev.filter(task => task.id !== row.id));
      toast.success(`Tarefa "${row.title}" concluída!`);
    }),
    primeUtils.dataTable.createAction('Editar', 'pi pi-pencil', (row) => {
      toast.info(`Editando tarefa "${row.title}"`);
    })
  ];

  return (
    <Page
      header={headerConfig}
      layout={layoutUtils.configs.dashboard}
      sidebarItems={sidebarItems}
      topNavItems={topNavItems}
      userMenuItems={userMenuItems}
      notifications={3}
      onNotificationClick={() => toast.info('Você tem 3 notificações pendentes')}
    >
      <div className="space-y-6">
        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total de Contratos"
            value={metrics.totalContracts.value}
            trend={metrics.totalContracts.trend}
            previousValue={metrics.totalContracts.previousValue}
            icon="pi pi-file"
            color="blue"
            formatter={primeUtils.formatters.number}
          />
          
          <MetricCard
            title="Contratos Ativos"
            value={metrics.activeContracts.value}
            trend={metrics.activeContracts.trend}
            previousValue={metrics.activeContracts.previousValue}
            icon="pi pi-check-circle"
            color="green"
            formatter={primeUtils.formatters.number}
          />
          
          <MetricCard
            title="Receita Mensal"
            value={metrics.monthlyRevenue.value}
            trend={metrics.monthlyRevenue.trend}
            previousValue={metrics.monthlyRevenue.previousValue}
            icon="pi pi-dollar"
            color="purple"
            formatter={primeUtils.formatters.currency}
          />
          
          <MetricCard
            title="Pagamentos Pendentes"
            value={metrics.pendingPayments.value}
            trend={metrics.pendingPayments.trend}
            previousValue={metrics.pendingPayments.previousValue}
            icon="pi pi-clock"
            color="orange"
            formatter={primeUtils.formatters.currency}
          />
        </div>

        {/* Gráficos e tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contratos recentes */}
          <div className="lg:col-span-2">
            <PrimeCard
              title="Contratos Recentes"
              subtitle="Últimos contratos criados"
              actions={
                <PrimeButton
                  variant="outline"
                  size="sm"
                  icon="pi pi-external-link"
                  onClick={() => toast.info('Redirecionando para lista completa...')}
                >
                  Ver Todos
                </PrimeButton>
              }
            >
              <PrimeDataTable
                data={recentContracts}
                columns={contractColumns}
                actions={contractActions}
                searchable
                exportable
                paginator
                rows={5}
                emptyMessage="Nenhum contrato encontrado"
              />
            </PrimeCard>
          </div>

          {/* Tarefas pendentes */}
          <div>
            <PrimeCard
              title="Tarefas Pendentes"
              subtitle={`${pendingTasks.length} tarefas`}
              badge={pendingTasks.filter(t => t.priority === 'urgent').length > 0 ? 'Urgente' : undefined}
              badgeColor="red"
            >
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {task.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {primeUtils.formatters.date(task.dueDate)}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {task.assignee}
                        </span>
                      </div>
                    </div>
                    <IconButton
                      icon="pi pi-check"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
                        toast.success('Tarefa concluída!');
                      }}
                      tooltip="Marcar como concluída"
                    />
                  </div>
                ))}
                
                {pendingTasks.length > 5 && (
                  <PrimeButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => toast.info('Redirecionando para lista completa...')}
                  >
                    Ver todas as {pendingTasks.length} tarefas
                  </PrimeButton>
                )}
              </div>
            </PrimeCard>
          </div>
        </div>

        {/* Ações rápidas */}
        <PrimeCard
          title="Ações Rápidas"
          subtitle="Acesse rapidamente as funcionalidades mais utilizadas"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-plus"
              onClick={() => toast.info('Criando novo contrato...')}
            >
              Novo Contrato
            </PrimeButton>
            
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-user-plus"
              onClick={() => toast.info('Cadastrando novo cliente...')}
            >
              Novo Cliente
            </PrimeButton>
            
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-dollar"
              onClick={() => toast.info('Abrindo faturamento...')}
            >
              Faturamento
            </PrimeButton>
            
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-chart-bar"
              onClick={() => toast.info('Gerando relatório...')}
            >
              Relatórios
            </PrimeButton>
            
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-upload"
              onClick={() => toast.info('Importando dados...')}
            >
              Importar
            </PrimeButton>
            
            <PrimeButton
              variant="outline"
              className="h-20 flex-col"
              icon="pi pi-cog"
              onClick={() => toast.info('Abrindo configurações...')}
            >
              Configurações
            </PrimeButton>
          </div>
        </PrimeCard>
      </div>
    </Page>
  );
};

export default DashboardExample;
