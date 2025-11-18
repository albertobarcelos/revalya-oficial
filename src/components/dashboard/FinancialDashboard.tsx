import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  Shield,
  Bell,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  CreditCard,
  Target,
  Zap,
  Eye,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import FinancialCalculator from '../financial/FinancialCalculator';
import DigitalContractManager from '../contracts/DigitalContractManager';
import FinancialAuditManager from '../audit/FinancialAuditManager';
import FinancialReportManager from '../reports/FinancialReportManager';
import FinancialNotificationManager from '../notifications/FinancialNotificationManager';
import { useFinancialCalculation } from '../../hooks/useFinancialCalculation';
import { useDigitalContract } from '../../hooks/useDigitalContract';
import { useFinancialAudit } from '../../hooks/useFinancialAudit';
import { useFinancialReport } from '../../hooks/useFinancialReport';
import { useFinancialNotification } from '../../hooks/useFinancialNotification';

interface FinancialDashboardProps {
  tenantId: string;
  userId: string;
}

type DashboardModule = 'overview' | 'calculator' | 'contracts' | 'audit' | 'reports' | 'notifications';

interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  complianceScore: number;
  auditAlerts: number;
  notificationsSent: number;
  reportsGenerated: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
}

interface RecentActivity {
  id: string;
  type: 'contract' | 'payment' | 'audit' | 'report' | 'notification';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ tenantId, userId }) => {
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalContracts: 0,
    activeContracts: 0,
    expiringContracts: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
    complianceScore: 0,
    auditAlerts: 0,
    notificationsSent: 0,
    reportsGenerated: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Hooks dos módulos
  const { calculateInterest } = useFinancialCalculation();
  const { searchContracts, contractAnalytics } = useDigitalContract();
  const { generateComplianceReport } = useFinancialAudit();
  const { generateReport } = useFinancialReport();
  const { generateNotificationStats } = useFinancialNotification();

  // Carregar dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Simular carregamento de dados (substituir por chamadas reais)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados simulados - substituir por dados reais
        setDashboardStats({
          totalContracts: 156,
          activeContracts: 142,
          expiringContracts: 8,
          totalRevenue: 2450000,
          monthlyRevenue: 185000,
          pendingPayments: 12,
          overduePayments: 3,
          complianceScore: 94,
          auditAlerts: 2,
          notificationsSent: 1247,
          reportsGenerated: 23
        });

        setRecentActivities([
          {
            id: '1',
            type: 'contract',
            title: 'Novo contrato assinado',
            description: 'Contrato #2024-001 foi assinado digitalmente',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            status: 'success'
          },
          {
            id: '2',
            type: 'payment',
            title: 'Pagamento em atraso',
            description: 'Fatura #INV-2024-045 está 5 dias em atraso',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            status: 'warning'
          },
          {
            id: '3',
            type: 'audit',
            title: 'Verificação de integridade',
            description: 'Auditoria automática detectou inconsistência',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            status: 'error'
          },
          {
            id: '4',
            type: 'report',
            title: 'Relatório gerado',
            description: 'Demonstrativo de resultados Q4 2024',
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
            status: 'info'
          },
          {
            id: '5',
            type: 'notification',
            title: 'Notificação enviada',
            description: '15 lembretes de vencimento enviados',
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            status: 'success'
          }
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [tenantId, userId]);

  // Ações rápidas
  const quickActions: QuickAction[] = [
    {
      id: 'new-contract',
      title: 'Novo Contrato',
      description: 'Criar um novo contrato digital',
      icon: FileText,
      color: 'bg-blue-500',
      action: () => setActiveModule('contracts')
    },
    {
      id: 'calculate-interest',
      title: 'Calcular Juros',
      description: 'Realizar cálculos financeiros',
      icon: Calculator,
      color: 'bg-green-500',
      action: () => setActiveModule('calculator')
    },
    {
      id: 'generate-report',
      title: 'Gerar Relatório',
      description: 'Criar relatório financeiro',
      icon: BarChart3,
      color: 'bg-purple-500',
      action: () => setActiveModule('reports')
    },
    {
      id: 'audit-check',
      title: 'Verificação de Auditoria',
      description: 'Executar verificações de compliance',
      icon: Shield,
      color: 'bg-orange-500',
      action: () => setActiveModule('audit')
    },
    {
      id: 'send-notification',
      title: 'Enviar Notificação',
      description: 'Criar e enviar notificação',
      icon: Bell,
      color: 'bg-red-500',
      action: () => setActiveModule('notifications')
    },
    {
      id: 'view-analytics',
      title: 'Ver Análises',
      description: 'Visualizar métricas e KPIs',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      action: () => {}
    }
  ];

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar tempo relativo
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Agora mesmo';
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d atrás`;
    }
  };

  // Função para obter ícone da atividade
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'contract': return FileText;
      case 'payment': return CreditCard;
      case 'audit': return Shield;
      case 'report': return BarChart3;
      case 'notification': return Bell;
      default: return Activity;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success': return 'text-success-foreground bg-success/10';
      case 'warning': return 'text-warning-foreground bg-warning/10';
      case 'error': return 'text-danger-foreground bg-danger/10';
      case 'info': return 'text-primary-foreground bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Renderizar módulo ativo
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'calculator':
        return <FinancialCalculator />;
      case 'contracts':
        return <DigitalContractManager tenantId={tenantId} userId={userId} />;
      case 'audit':
        return <FinancialAuditManager tenantId={tenantId} userId={userId} />;
      case 'reports':
        return <FinancialReportManager tenantId={tenantId} userId={userId} />;
      case 'notifications':
        return <FinancialNotificationManager tenantId={tenantId} userId={userId} />;
      default:
        return renderOverview();
    }
  };

  // Renderizar visão geral
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label font-medium text-muted-foreground">Contratos Ativos</p>
              <p className="text-heading-1 font-bold text-card-foreground">{dashboardStats.activeContracts}</p>
              <p className="text-xs text-muted-foreground">de {dashboardStats.totalContracts} total</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label font-medium text-muted-foreground">Receita Mensal</p>
              <p className="text-heading-1 font-bold text-card-foreground">{formatCurrency(dashboardStats.monthlyRevenue)}</p>
              <p className="text-xs text-success">+12% vs mês anterior</p>
            </div>
            <div className="p-3 bg-success/10 rounded-full">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label font-medium text-muted-foreground">Score de Compliance</p>
              <p className="text-heading-1 font-bold text-card-foreground">{dashboardStats.complianceScore}%</p>
              <p className="text-xs text-success">Excelente</p>
            </div>
            <div className="p-3 bg-success/10 rounded-full">
              <Shield className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label font-medium text-muted-foreground">Pagamentos Pendentes</p>
              <p className="text-heading-1 font-bold text-card-foreground">{dashboardStats.pendingPayments}</p>
              <p className="text-xs text-danger">{dashboardStats.overduePayments} em atraso</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-full">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {(dashboardStats.auditAlerts > 0 || dashboardStats.overduePayments > 0 || dashboardStats.expiringContracts > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertas Importantes
          </h3>
          <div className="space-y-3">
            {dashboardStats.auditAlerts > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-body font-medium text-red-900">
                      {dashboardStats.auditAlerts} alerta(s) de auditoria
                    </p>
                    <p className="text-xs text-red-600">Requer atenção imediata</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule('audit')}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Verificar
                </button>
              </div>
            )}
            
            {dashboardStats.overduePayments > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-body font-medium text-yellow-900">
                      {dashboardStats.overduePayments} pagamento(s) em atraso
                    </p>
                    <p className="text-xs text-yellow-600">Ação necessária</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule('notifications')}
                  className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Notificar
                </button>
              </div>
            )}
            
            {dashboardStats.expiringContracts > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-body font-medium text-blue-900">
                      {dashboardStats.expiringContracts} contrato(s) vencendo em 30 dias
                    </p>
                    <p className="text-xs text-blue-600">Renovação necessária</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule('contracts')}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Gerenciar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 ${action.color} rounded-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Atividades recentes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          Atividades Recentes
        </h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-body font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas de performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Distribuição de Contratos
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-gray-600">Ativos</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                </div>
                <span className="text-body font-medium text-gray-900">91%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-gray-600">Vencendo</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '5%' }}></div>
                </div>
                <span className="text-body font-medium text-gray-900">5%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-gray-600">Vencidos</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: '4%' }}></div>
                </div>
                <span className="text-body font-medium text-gray-900">4%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Performance do Sistema
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Notificações Entregues</span>
                <span className="text-sm font-medium text-gray-900">98.5%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-body text-gray-600">Tempo de Resposta</span>
                <span className="text-body font-medium text-gray-900">1.2s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-body text-gray-600">Disponibilidade</span>
                <span className="text-body font-medium text-gray-900">99.9%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SupaGuard Financial</h1>
                  <p className="text-sm text-gray-500">Sistema Integrado de Gestão Financeira</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-body text-gray-600">
                <Users className="w-4 h-4" />
                <span>Tenant: {tenantId}</span>
              </div>
              <div className="flex items-center gap-2 text-body text-gray-600">
                <Target className="w-4 h-4" />
                <span>User: {userId}</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'calculator', label: 'Calculadora', icon: Calculator },
              { id: 'contracts', label: 'Contratos', icon: FileText },
              { id: 'audit', label: 'Auditoria', icon: Shield },
              { id: 'reports', label: 'Relatórios', icon: PieChart },
              { id: 'notifications', label: 'Notificações', icon: Bell }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id as DashboardModule)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-body transition-colors ${
                    activeModule === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveModule()}
      </main>
    </div>
  );
};

export default FinancialDashboard;
