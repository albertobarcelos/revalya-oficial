import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Calendar,
  Users,
  Target
} from 'lucide-react';
import { useFinancialNotification } from '../../hooks/useFinancialNotification';
import {
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  NotificationStatus,
  FinancialNotification,
  NotificationTemplate,
  NotificationRule,
  UserNotificationSettings
} from '../../services/financialNotificationService';

interface FinancialNotificationManagerProps {
  tenantId: string;
  userId: string;
}

const FinancialNotificationManager: React.FC<FinancialNotificationManagerProps> = ({
  tenantId,
  userId
}) => {
  const {
    loading,
    notifications,
    templates,
    rules,
    userSettings,
    stats,
    searchResults,
    createNotification,
    sendNotification,
    searchNotifications,
    cancelNotification,
    retryNotification,
    createNotificationTemplate,
    getNotificationTemplates,
    createNotificationFromTemplate,
    createNotificationRule,
    processAutomaticRules,
    getUserNotificationSettings,
    updateUserNotificationSettings,
    processScheduledNotifications,
    generateNotificationStats,
    clearResults,
    formatNotificationData,
    validateNotificationData,
    exportNotificationData
  } = useFinancialNotification();

  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'rules' | 'settings' | 'stats'>('notifications');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<FinancialNotification | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    type: '' as NotificationType | '',
    priority: '' as NotificationPriority | '',
    status: '' as NotificationStatus | '',
    search_text: '',
    date_from: '',
    date_to: ''
  });

  // Estados para formulários
  const [notificationForm, setNotificationForm] = useState({
    type: 'PAYMENT_DUE' as NotificationType,
    priority: 'MEDIUM' as NotificationPriority,
    title: '',
    message: '',
    channels: ['EMAIL'] as DeliveryChannel[],
    user_id: '',
    scheduled_for: '',
    expires_at: '',
    data: {}
  });

  const [templateForm, setTemplateForm] = useState({
    type: 'PAYMENT_DUE' as NotificationType,
    name: '',
    title_template: '',
    message_template: '',
    default_channels: ['EMAIL'] as DeliveryChannel[],
    default_priority: 'MEDIUM' as NotificationPriority,
    variables: [
      { name: 'user_name', type: 'STRING' as const, description: 'Nome do usuário', required: true },
      { name: 'amount', type: 'CURRENCY' as const, description: 'Valor', required: false },
      { name: 'due_date', type: 'DATE' as const, description: 'Data de vencimento', required: false }
    ],
    is_active: true
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    type: 'PAYMENT_DUE' as NotificationType,
    template_id: '',
    channels: ['EMAIL'] as DeliveryChannel[],
    priority: 'MEDIUM' as NotificationPriority,
    is_active: true,
    schedule_offset_days: 0,
    schedule_offset_hours: 0,
    conditions: [
      {
        field: 'overdue_payments',
        operator: 'GREATER_THAN' as const,
        value: 0,
        logical_operator: 'AND' as const
      }
    ]
  });

  const [settingsForm, setSettingsForm] = useState<UserNotificationSettings>({
    user_id: userId,
    tenant_id: tenantId,
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'America/Sao_Paulo',
    notification_types: [
      { type: 'PAYMENT_DUE', enabled: true, channels: ['EMAIL', 'SMS'], priority_threshold: 'LOW' },
      { type: 'PAYMENT_OVERDUE', enabled: true, channels: ['EMAIL', 'SMS', 'PUSH'], priority_threshold: 'MEDIUM' },
      { type: 'CONTRACT_EXPIRING', enabled: true, channels: ['EMAIL'], priority_threshold: 'MEDIUM' },
      { type: 'BUDGET_EXCEEDED', enabled: true, channels: ['EMAIL', 'PUSH'], priority_threshold: 'HIGH' },
      { type: 'COMPLIANCE_ALERT', enabled: true, channels: ['EMAIL', 'SMS', 'PUSH'], priority_threshold: 'HIGH' }
    ]
  });

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        searchNotifications({ tenant_id: tenantId, limit: 20 }),
        getNotificationTemplates(tenantId),
        getUserNotificationSettings(userId, tenantId),
        generateNotificationStats(tenantId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      ]);
    };

    loadInitialData();
  }, [tenantId, userId]);

  // Atualizar configurações quando carregadas
  useEffect(() => {
    if (userSettings) {
      setSettingsForm(userSettings);
    }
  }, [userSettings]);

  // Handlers para notificações
  const handleCreateNotification = async () => {
    const validation = validateNotificationData({
      ...notificationForm,
      tenant_id: tenantId
    });

    if (!validation.isValid) {
      alert(`Erros de validação:\n${validation.errors.join('\n')}`);
      return;
    }

    const notification = await createNotification({
      ...notificationForm,
      tenant_id: tenantId,
      status: 'PENDING',
      scheduled_for: notificationForm.scheduled_for ? new Date(notificationForm.scheduled_for) : undefined,
      expires_at: notificationForm.expires_at ? new Date(notificationForm.expires_at) : undefined
    }, userId);

    if (notification) {
      setShowCreateModal(false);
      setNotificationForm({
        type: 'PAYMENT_DUE',
        priority: 'MEDIUM',
        title: '',
        message: '',
        channels: ['EMAIL'],
        user_id: '',
        scheduled_for: '',
        expires_at: '',
        data: {}
      });
    }
  };

  const handleSendNotification = async (notificationId: string) => {
    await sendNotification(notificationId, userId);
  };

  const handleCancelNotification = async (notificationId: string) => {
    await cancelNotification(notificationId, userId);
  };

  const handleRetryNotification = async (notificationId: string) => {
    await retryNotification(notificationId, userId);
  };

  // Handlers para templates
  const handleCreateTemplate = async () => {
    const template = await createNotificationTemplate({
      ...templateForm,
      tenant_id: tenantId
    }, userId);

    if (template) {
      setShowTemplateModal(false);
      setTemplateForm({
        type: 'PAYMENT_DUE',
        name: '',
        title_template: '',
        message_template: '',
        default_channels: ['EMAIL'],
        default_priority: 'MEDIUM',
        variables: [
          { name: 'user_name', type: 'STRING', description: 'Nome do usuário', required: true },
          { name: 'amount', type: 'CURRENCY', description: 'Valor', required: false },
          { name: 'due_date', type: 'DATE', description: 'Data de vencimento', required: false }
        ],
        is_active: true
      });
    }
  };

  // Handlers para regras
  const handleCreateRule = async () => {
    const rule = await createNotificationRule({
      ...ruleForm,
      tenant_id: tenantId
    }, userId);

    if (rule) {
      setShowRuleModal(false);
      setRuleForm({
        name: '',
        description: '',
        type: 'PAYMENT_DUE',
        template_id: '',
        channels: ['EMAIL'],
        priority: 'MEDIUM',
        is_active: true,
        schedule_offset_days: 0,
        schedule_offset_hours: 0,
        conditions: [
          {
            field: 'overdue_payments',
            operator: 'GREATER_THAN',
            value: 0,
            logical_operator: 'AND'
          }
        ]
      });
    }
  };

  // Handlers para configurações
  const handleUpdateSettings = async () => {
    const success = await updateUserNotificationSettings(settingsForm, userId);
    if (success) {
      setShowSettingsModal(false);
    }
  };

  // Handler para busca
  const handleSearch = async () => {
    const filters = {
      tenant_id: tenantId,
      ...(searchFilters.type && { type: searchFilters.type }),
      ...(searchFilters.priority && { priority: searchFilters.priority }),
      ...(searchFilters.status && { status: searchFilters.status }),
      ...(searchFilters.search_text && { search_text: searchFilters.search_text }),
      ...(searchFilters.date_from && { date_from: new Date(searchFilters.date_from) }),
      ...(searchFilters.date_to && { date_to: new Date(searchFilters.date_to) }),
      limit: 50
    };

    await searchNotifications(filters);
  };

  // Handler para processamento automático
  const handleProcessAutomaticRules = async () => {
    await processAutomaticRules(tenantId);
  };

  const handleProcessScheduledNotifications = async () => {
    await processScheduledNotifications();
  };

  // Handler para exportação
  const handleExport = (format: 'csv' | 'json') => {
    exportNotificationData(notifications, format);
  };

  // Função para obter ícone do canal
  const getChannelIcon = (channel: DeliveryChannel) => {
    switch (channel) {
      case 'EMAIL': return <Mail className="w-4 h-4" />;
      case 'SMS': return <MessageSquare className="w-4 h-4" />;
      case 'PUSH': return <Smartphone className="w-4 h-4" />;
      case 'IN_APP': return <Bell className="w-4 h-4" />;
      case 'WEBHOOK': return <Globe className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: NotificationStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'SENT': return <Send className="w-4 h-4" />;
      case 'DELIVERED': return <CheckCircle className="w-4 h-4" />;
      case 'FAILED': return <AlertTriangle className="w-4 h-4" />;
      case 'CANCELLED': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Gerenciador de Notificações Financeiras
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie notificações, templates, regras automáticas e configurações
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleProcessScheduledNotifications}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Processar Agendadas
            </button>
            <button
              onClick={handleProcessAutomaticRules}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Processar Regras
            </button>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Enviadas</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total_sent}</p>
                </div>
                <Send className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Taxa de Entrega</p>
                  <p className="text-2xl font-bold text-green-900">{stats.delivery_rate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Falhas</p>
                  <p className="text-2xl font-bold text-red-900">{stats.total_failed}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-warning/10 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-warning text-sm font-medium">Tempo Médio</p>
                  <p className="text-2xl font-bold text-warning">{stats.average_delivery_time.toFixed(1)}min</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'notifications', label: 'Notificações', icon: Bell },
            { id: 'templates', label: 'Templates', icon: Edit },
            { id: 'rules', label: 'Regras', icon: Target },
            { id: 'settings', label: 'Configurações', icon: Settings },
            { id: 'stats', label: 'Estatísticas', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo das tabs */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Filtros e ações */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Buscar por título ou mensagem..."
                  value={searchFilters.search_text}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, search_text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={searchFilters.type}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, type: e.target.value as NotificationType | '' }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option value="PAYMENT_DUE">Pagamento Vencendo</option>
                <option value="PAYMENT_OVERDUE">Pagamento em Atraso</option>
                <option value="CONTRACT_EXPIRING">Contrato Vencendo</option>
                <option value="BUDGET_EXCEEDED">Orçamento Excedido</option>
                <option value="COMPLIANCE_ALERT">Alerta de Compliance</option>
              </select>
              <select
                value={searchFilters.status}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value as NotificationStatus | '' }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="PENDING">Pendente</option>
                <option value="SENT">Enviada</option>
                <option value="DELIVERED">Entregue</option>
                <option value="FAILED">Falhou</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Notificação
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
              </div>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-gray-600">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notificação</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canais</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criada em</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notifications.map((notification) => {
                      const formatted = formatNotificationData(notification);
                      return (
                        <tr key={notification.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{formatted.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{formatted.message}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">{formatted.typeLabel}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formatted.priorityColor}`}>
                              {formatted.priorityLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formatted.statusColor}`}>
                              {getStatusIcon(notification.status)}
                              <span className="ml-1">{formatted.statusLabel}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {notification.channels.map((channel, index) => (
                                <span key={index} className="inline-flex items-center p-1 rounded bg-gray-100 text-gray-600" title={formatted.channelLabels[index]}>
                                  {getChannelIcon(channel)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatted.createdAt}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {notification.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleSendNotification(notification.id!)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Enviar"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleCancelNotification(notification.id!)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {formatted.canRetry && (
                                <button
                                  onClick={() => handleRetryNotification(notification.id!)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Reenviar"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedNotification(notification)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Templates de Notificação</h2>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.type}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    template.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {template.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Título:</p>
                    <p className="text-sm text-gray-900 truncate">{template.title_template}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Mensagem:</p>
                    <p className="text-sm text-gray-900 truncate">{template.message_template}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4">
                  {template.default_channels.map((channel, index) => (
                    <span key={index} className="inline-flex items-center p-1 rounded bg-gray-100 text-gray-600">
                      {getChannelIcon(channel)}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    Editar
                  </button>
                  <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Configurações de Notificação</h2>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Editar Configurações
            </button>
          </div>

          {userSettings && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Canais Habilitados</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">E-mail</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        userSettings.email_enabled ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {userSettings.email_enabled ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">SMS</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        userSettings.sms_enabled ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {userSettings.sms_enabled ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">Push</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        userSettings.push_enabled ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {userSettings.push_enabled ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Horário Silencioso</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Início:</strong> {userSettings.quiet_hours_start}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Fim:</strong> {userSettings.quiet_hours_end}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Fuso Horário:</strong> {userSettings.timezone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de criação de notificação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Nova Notificação</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value as NotificationType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PAYMENT_DUE">Pagamento Vencendo</option>
                      <option value="PAYMENT_OVERDUE">Pagamento em Atraso</option>
                      <option value="CONTRACT_EXPIRING">Contrato Vencendo</option>
                      <option value="BUDGET_EXCEEDED">Orçamento Excedido</option>
                      <option value="COMPLIANCE_ALERT">Alerta de Compliance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                    <select
                      value={notificationForm.priority}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, priority: e.target.value as NotificationPriority }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Baixa</option>
                      <option value="MEDIUM">Média</option>
                      <option value="HIGH">Alta</option>
                      <option value="CRITICAL">Crítica</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                  <input
                    type="text"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Título da notificação"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Conteúdo da notificação"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Canais de Entrega</label>
                  <div className="flex flex-wrap gap-3">
                    {(['EMAIL', 'SMS', 'PUSH', 'IN_APP'] as DeliveryChannel[]).map(channel => (
                      <label key={channel} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={notificationForm.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotificationForm(prev => ({
                                ...prev,
                                channels: [...prev.channels, channel]
                              }));
                            } else {
                              setNotificationForm(prev => ({
                                ...prev,
                                channels: prev.channels.filter(c => c !== channel)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Agendar para (opcional)</label>
                    <input
                      type="datetime-local"
                      value={notificationForm.scheduled_for}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, scheduled_for: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expira em (opcional)</label>
                    <input
                      type="datetime-local"
                      value={notificationForm.expires_at}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNotification}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Notificação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configurações */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Configurações de Notificação</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Canais de Entrega</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'email_enabled', label: 'E-mail', icon: Mail },
                      { key: 'sms_enabled', label: 'SMS', icon: MessageSquare },
                      { key: 'push_enabled', label: 'Push Notifications', icon: Smartphone },
                      { key: 'in_app_enabled', label: 'Notificações In-App', icon: Bell }
                    ].map(({ key, label, icon: Icon }) => (
                      <label key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settingsForm[key as keyof UserNotificationSettings] as boolean}
                          onChange={(e) => setSettingsForm(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Horário Silencioso</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Início</label>
                      <input
                        type="time"
                        value={settingsForm.quiet_hours_start}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fim</label>
                      <input
                        type="time"
                        value={settingsForm.quiet_hours_end}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateSettings}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialNotificationManager;
