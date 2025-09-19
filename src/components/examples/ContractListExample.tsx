import React, { useState, useEffect } from 'react';
import {
  Page,
  PrimeCard,
  PrimeDataTable,
  PrimeButton,
  IconButton,
  Input,
  Select,
  MultiSelect,
  DatePicker,
  useToast,
  useConfirmDialog,
  layoutUtils,
  primeUtils,
  type PageHeaderConfig,
  type ExtendedMenuItem,
  type DataTableColumn,
  type DataTableAction
} from '@/components/prime';

// Tipos para os dados de contrato
interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  type: 'service' | 'product' | 'subscription';
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'draft';
  value: number;
  startDate: string;
  endDate?: string;
  paymentMethod: 'cash' | 'card' | 'pix' | 'bank_transfer';
  billingType: 'unique' | 'recurring' | 'installments';
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ContractFilters {
  search: string;
  status: string[];
  type: string[];
  paymentMethod: string[];
  billingType: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  valueRange: {
    min?: number;
    max?: number;
  };
}

// Dados mockados
const mockContracts: Contract[] = [
  {
    id: '1',
    contractNumber: 'CT-2024-001',
    clientName: 'João Silva',
    clientEmail: 'joao.silva@email.com',
    clientPhone: '(11) 99999-9999',
    type: 'service',
    status: 'active',
    value: 2500.00,
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    paymentMethod: 'pix',
    billingType: 'recurring',
    description: 'Serviços de consultoria em TI',
    tags: ['consultoria', 'ti', 'mensal'],
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    createdBy: 'Admin'
  },
  {
    id: '2',
    contractNumber: 'CT-2024-002',
    clientName: 'Empresa ABC Ltda',
    clientEmail: 'contato@empresaabc.com',
    clientPhone: '(11) 88888-8888',
    type: 'subscription',
    status: 'pending',
    value: 8900.00,
    startDate: '2024-01-20',
    paymentMethod: 'bank_transfer',
    billingType: 'recurring',
    description: 'Assinatura de software empresarial',
    tags: ['software', 'empresarial', 'anual'],
    createdAt: '2024-01-18T09:15:00Z',
    updatedAt: '2024-01-20T11:45:00Z',
    createdBy: 'Vendedor 1'
  },
  {
    id: '3',
    contractNumber: 'CT-2024-003',
    clientName: 'Maria Santos',
    clientEmail: 'maria.santos@email.com',
    clientPhone: '(11) 77777-7777',
    type: 'product',
    status: 'active',
    value: 1200.00,
    startDate: '2024-01-18',
    endDate: '2024-02-18',
    paymentMethod: 'card',
    billingType: 'unique',
    description: 'Venda de equipamentos de informática',
    tags: ['equipamentos', 'hardware', 'único'],
    createdAt: '2024-01-16T16:20:00Z',
    updatedAt: '2024-01-18T08:10:00Z',
    createdBy: 'Vendedor 2'
  },
  {
    id: '4',
    contractNumber: 'CT-2024-004',
    clientName: 'Tech Solutions Inc',
    clientEmail: 'contact@techsolutions.com',
    clientPhone: '(11) 66666-6666',
    type: 'service',
    status: 'expired',
    value: 15000.00,
    startDate: '2023-12-01',
    endDate: '2024-01-01',
    paymentMethod: 'bank_transfer',
    billingType: 'installments',
    description: 'Desenvolvimento de sistema customizado',
    tags: ['desenvolvimento', 'sistema', 'customizado'],
    createdAt: '2023-11-25T14:00:00Z',
    updatedAt: '2024-01-01T23:59:59Z',
    createdBy: 'Admin'
  },
  {
    id: '5',
    contractNumber: 'CT-2024-005',
    clientName: 'Ana Costa',
    clientEmail: 'ana.costa@email.com',
    clientPhone: '(11) 55555-5555',
    type: 'subscription',
    status: 'active',
    value: 450.00,
    startDate: '2024-01-22',
    paymentMethod: 'pix',
    billingType: 'recurring',
    description: 'Assinatura de plataforma de marketing',
    tags: ['marketing', 'plataforma', 'mensal'],
    createdAt: '2024-01-20T13:30:00Z',
    updatedAt: '2024-01-22T10:15:00Z',
    createdBy: 'Vendedor 1'
  },
  {
    id: '6',
    contractNumber: 'CT-2024-006',
    clientName: 'Pedro Oliveira',
    clientEmail: 'pedro.oliveira@email.com',
    clientPhone: '(11) 44444-4444',
    type: 'service',
    status: 'draft',
    value: 3200.00,
    startDate: '2024-02-01',
    endDate: '2024-08-01',
    paymentMethod: 'card',
    billingType: 'installments',
    description: 'Serviços de design gráfico',
    tags: ['design', 'gráfico', 'semestral'],
    createdAt: '2024-01-23T11:45:00Z',
    updatedAt: '2024-01-23T11:45:00Z',
    createdBy: 'Designer 1'
  },
  {
    id: '7',
    contractNumber: 'CT-2024-007',
    clientName: 'Startup XYZ',
    clientEmail: 'hello@startupxyz.com',
    clientPhone: '(11) 33333-3333',
    type: 'subscription',
    status: 'cancelled',
    value: 1800.00,
    startDate: '2024-01-10',
    endDate: '2024-01-20',
    paymentMethod: 'pix',
    billingType: 'recurring',
    description: 'Assinatura de ferramentas de desenvolvimento',
    tags: ['desenvolvimento', 'ferramentas', 'cancelado'],
    createdAt: '2024-01-08T09:00:00Z',
    updatedAt: '2024-01-20T17:30:00Z',
    createdBy: 'Vendedor 2'
  }
];

// Componente principal
export const ContractListExample: React.FC = () => {
  const toast = useToast();
  const confirmDialog = useConfirmDialog();
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>(mockContracts);
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ContractFilters>({
    search: '',
    status: [],
    type: [],
    paymentMethod: [],
    billingType: [],
    dateRange: {},
    valueRange: {}
  });

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...contracts];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(contract => 
        contract.contractNumber.toLowerCase().includes(searchLower) ||
        contract.clientName.toLowerCase().includes(searchLower) ||
        contract.clientEmail.toLowerCase().includes(searchLower) ||
        contract.description.toLowerCase().includes(searchLower) ||
        contract.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filtros de seleção múltipla
    if (filters.status.length > 0) {
      filtered = filtered.filter(contract => filters.status.includes(contract.status));
    }

    if (filters.type.length > 0) {
      filtered = filtered.filter(contract => filters.type.includes(contract.type));
    }

    if (filters.paymentMethod.length > 0) {
      filtered = filtered.filter(contract => filters.paymentMethod.includes(contract.paymentMethod));
    }

    if (filters.billingType.length > 0) {
      filtered = filtered.filter(contract => filters.billingType.includes(contract.billingType));
    }

    // Filtro de data
    if (filters.dateRange.start) {
      filtered = filtered.filter(contract => contract.startDate >= filters.dateRange.start!);
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(contract => contract.startDate <= filters.dateRange.end!);
    }

    // Filtro de valor
    if (filters.valueRange.min !== undefined) {
      filtered = filtered.filter(contract => contract.value >= filters.valueRange.min!);
    }

    if (filters.valueRange.max !== undefined) {
      filtered = filtered.filter(contract => contract.value <= filters.valueRange.max!);
    }

    setFilteredContracts(filtered);
  }, [contracts, filters]);

  // Configuração do cabeçalho da página
  const headerConfig: PageHeaderConfig = {
    title: 'Contratos',
    subtitle: `${filteredContracts.length} contratos encontrados`,
    description: 'Gerencie todos os contratos do sistema com filtros avançados e ações em lote.',
    breadcrumb: [
      { label: 'Dashboard', icon: 'pi pi-home', url: '/dashboard' },
      { label: 'Contratos', icon: 'pi pi-file' }
    ],
    actions: layoutUtils.createHeaderActions(
      <PrimeButton
        variant="outline"
        icon="pi pi-filter"
        onClick={() => {
          setFilters({
            search: '',
            status: [],
            type: [],
            paymentMethod: [],
            billingType: [],
            dateRange: {},
            valueRange: {}
          });
          toast.info('Filtros limpos!');
        }}
      >
        Limpar Filtros
      </PrimeButton>,
      <PrimeButton
        variant="outline"
        icon="pi pi-download"
        onClick={() => {
          toast.success('Exportando contratos...');
        }}
      >
        Exportar
      </PrimeButton>,
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
    layoutUtils.createMenuItem('Dashboard', 'pi pi-home', '/dashboard'),
    layoutUtils.createMenuGroup('Contratos', [
      layoutUtils.createMenuItem('Listar Contratos', 'pi pi-list', '/contracts', { badge: 'Atual' }),
      layoutUtils.createMenuItem('Novo Contrato', 'pi pi-plus', '/contracts/new'),
      layoutUtils.createMenuItem('Modelos', 'pi pi-copy', '/contracts/templates'),
      layoutUtils.createMenuItem('Relatórios', 'pi pi-chart-line', '/contracts/reports')
    ], 'pi pi-file'),
    layoutUtils.createMenuGroup('Clientes', [
      layoutUtils.createMenuItem('Listar Clientes', 'pi pi-users', '/clients'),
      layoutUtils.createMenuItem('Novo Cliente', 'pi pi-user-plus', '/clients/new')
    ], 'pi pi-users'),
    layoutUtils.createMenuItem('Financeiro', 'pi pi-wallet', '/financial'),
    layoutUtils.createMenuItem('Configurações', 'pi pi-cog', '/settings')
  ];

  // Configuração das colunas
  const columns: DataTableColumn<Contract>[] = [
    primeUtils.dataTable.createColumn('contractNumber', 'Contrato', {
      sortable: true,
      frozen: true,
      render: (value, row) => (
        <div className="font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
             onClick={() => toast.info(`Visualizando contrato ${value}`)}>
          {value}
        </div>
      )
    }),
    primeUtils.dataTable.createColumn('clientName', 'Cliente', {
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.clientEmail}</div>
        </div>
      )
    }),
    primeUtils.dataTable.createColumn('type', 'Tipo', {
      sortable: true,
      render: (value) => {
        const typeConfig = {
          service: { label: 'Serviço', icon: 'pi pi-cog', color: 'text-blue-600' },
          product: { label: 'Produto', icon: 'pi pi-box', color: 'text-green-600' },
          subscription: { label: 'Assinatura', icon: 'pi pi-refresh', color: 'text-purple-600' }
        };
        const config = typeConfig[value as keyof typeof typeConfig];
        return (
          <div className="flex items-center gap-2">
            <i className={`${config.icon} ${config.color}`}></i>
            <span>{config.label}</span>
          </div>
        );
      }
    }),
    primeUtils.dataTable.createColumn('status', 'Status', {
      sortable: true,
      render: (value) => {
        const statusConfig = {
          active: { label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
          pending: { label: 'Pendente', color: 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning' },
          expired: { label: 'Expirado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
          cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground' },
          draft: { label: 'Rascunho', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
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
      render: (value) => (
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {primeUtils.formatters.currency(value)}
        </div>
      )
    }),
    primeUtils.dataTable.createColumn('billingType', 'Faturamento', {
      render: (value) => {
        const billingLabels = {
          unique: 'Único',
          recurring: 'Recorrente',
          installments: 'Parcelado'
        };
        return billingLabels[value as keyof typeof billingLabels];
      }
    }),
    primeUtils.dataTable.createColumn('startDate', 'Início', {
      sortable: true,
      render: (value) => primeUtils.formatters.date(value)
    }),
    primeUtils.dataTable.createColumn('endDate', 'Fim', {
      sortable: true,
      render: (value) => value ? primeUtils.formatters.date(value) : '-'
    }),
    primeUtils.dataTable.createColumn('tags', 'Tags', {
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 2).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
              {tag}
            </span>
          ))}
          {value.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded">
              +{value.length - 2}
            </span>
          )}
        </div>
      )
    })
  ];

  // Ações da tabela
  const actions: DataTableAction<Contract>[] = [
    primeUtils.dataTable.createAction('Visualizar', 'pi pi-eye', (row) => {
      toast.info(`Visualizando contrato ${row.contractNumber}`);
    }),
    primeUtils.dataTable.createAction('Editar', 'pi pi-pencil', (row) => {
      toast.info(`Editando contrato ${row.contractNumber}`);
    }),
    primeUtils.dataTable.createAction('Duplicar', 'pi pi-copy', (row) => {
      toast.success(`Duplicando contrato ${row.contractNumber}`);
    }),
    primeUtils.dataTable.createAction('Renovar', 'pi pi-refresh', (row) => {
      confirmDialog({
        message: `Deseja renovar o contrato ${row.contractNumber}?`,
        header: 'Confirmar Renovação',
        icon: 'pi pi-refresh',
        acceptLabel: 'Renovar',
        rejectLabel: 'Cancelar',
        onAccept: () => {
          toast.success(`Contrato ${row.contractNumber} renovado!`);
        }
      });
    }, { condition: (row) => row.status === 'expired' }),
    primeUtils.dataTable.createAction('Cancelar', 'pi pi-times', (row) => {
      confirmDialog({
        message: `Deseja cancelar o contrato ${row.contractNumber}? Esta ação não pode ser desfeita.`,
        header: 'Confirmar Cancelamento',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Cancelar Contrato',
        rejectLabel: 'Manter',
        severity: 'danger',
        onAccept: () => {
          setContracts(prev => prev.map(c => 
            c.id === row.id ? { ...c, status: 'cancelled' as const } : c
          ));
          toast.success(`Contrato ${row.contractNumber} cancelado!`);
        }
      });
    }, { condition: (row) => ['active', 'pending'].includes(row.status) }),
    primeUtils.dataTable.createAction('Excluir', 'pi pi-trash', (row) => {
      confirmDialog({
        message: `Deseja excluir permanentemente o contrato ${row.contractNumber}? Esta ação não pode ser desfeita.`,
        header: 'Confirmar Exclusão',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Excluir',
        rejectLabel: 'Cancelar',
        severity: 'danger',
        onAccept: () => {
          setContracts(prev => prev.filter(c => c.id !== row.id));
          toast.success(`Contrato ${row.contractNumber} excluído!`);
        }
      });
    }, { condition: (row) => row.status === 'draft' })
  ];

  // Ações em lote
  const handleBulkAction = (action: string) => {
    if (selectedContracts.length === 0) {
      toast.warn('Selecione pelo menos um contrato');
      return;
    }

    const contractNumbers = selectedContracts.map(c => c.contractNumber).join(', ');

    switch (action) {
      case 'export':
        toast.success(`Exportando ${selectedContracts.length} contratos...`);
        break;
      case 'cancel':
        confirmDialog({
          message: `Deseja cancelar ${selectedContracts.length} contratos selecionados?`,
          header: 'Cancelar Contratos',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Cancelar Contratos',
          rejectLabel: 'Manter',
          severity: 'danger',
          onAccept: () => {
            setContracts(prev => prev.map(c => 
              selectedContracts.some(sc => sc.id === c.id) 
                ? { ...c, status: 'cancelled' as const } 
                : c
            ));
            setSelectedContracts([]);
            toast.success(`${selectedContracts.length} contratos cancelados!`);
          }
        });
        break;
      case 'delete':
        confirmDialog({
          message: `Deseja excluir permanentemente ${selectedContracts.length} contratos selecionados?`,
          header: 'Excluir Contratos',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Excluir',
          rejectLabel: 'Cancelar',
          severity: 'danger',
          onAccept: () => {
            const selectedIds = selectedContracts.map(c => c.id);
            setContracts(prev => prev.filter(c => !selectedIds.includes(c.id)));
            setSelectedContracts([]);
            toast.success(`${selectedContracts.length} contratos excluídos!`);
          }
        });
        break;
    }
  };

  return (
    <Page
      header={headerConfig}
      layout={layoutUtils.configs.form}
      sidebarItems={sidebarItems}
    >
      <div className="space-y-6">
        {/* Filtros */}
        <PrimeCard title="Filtros" collapsible>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Input
              name="search"
              label="Buscar"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Contrato, cliente, email..."
              icon="pi pi-search"
            />

            <MultiSelect
              name="status"
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { label: 'Ativo', value: 'active' },
                { label: 'Pendente', value: 'pending' },
                { label: 'Expirado', value: 'expired' },
                { label: 'Cancelado', value: 'cancelled' },
                { label: 'Rascunho', value: 'draft' }
              ]}
              placeholder="Todos os status"
            />

            <MultiSelect
              name="type"
              label="Tipo"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              options={[
                { label: 'Serviço', value: 'service' },
                { label: 'Produto', value: 'product' },
                { label: 'Assinatura', value: 'subscription' }
              ]}
              placeholder="Todos os tipos"
            />

            <MultiSelect
              name="paymentMethod"
              label="Pagamento"
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
              options={[
                { label: 'Dinheiro', value: 'cash' },
                { label: 'Cartão', value: 'card' },
                { label: 'PIX', value: 'pix' },
                { label: 'Transferência', value: 'bank_transfer' }
              ]}
              placeholder="Todos os métodos"
            />

            <DatePicker
              name="startDate"
              label="Data Início"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              placeholder="Data inicial"
            />

            <DatePicker
              name="endDate"
              label="Data Fim"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              placeholder="Data final"
            />

            <Input
              name="minValue"
              label="Valor Mínimo"
              type="number"
              value={filters.valueRange.min?.toString() || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                valueRange: { ...prev.valueRange, min: e.target.value ? Number(e.target.value) : undefined }
              }))}
              placeholder="R$ 0,00"
            />

            <Input
              name="maxValue"
              label="Valor Máximo"
              type="number"
              value={filters.valueRange.max?.toString() || ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                valueRange: { ...prev.valueRange, max: e.target.value ? Number(e.target.value) : undefined }
              }))}
              placeholder="R$ 999.999,99"
            />
          </div>
        </PrimeCard>

        {/* Ações em lote */}
        {selectedContracts.length > 0 && (
          <PrimeCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedContracts.length} contrato(s) selecionado(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PrimeButton
                  variant="outline"
                  size="sm"
                  icon="pi pi-download"
                  onClick={() => handleBulkAction('export')}
                >
                  Exportar
                </PrimeButton>
                <PrimeButton
                  variant="outline"
                  size="sm"
                  icon="pi pi-times"
                  onClick={() => handleBulkAction('cancel')}
                >
                  Cancelar
                </PrimeButton>
                <PrimeButton
                  variant="danger"
                  size="sm"
                  icon="pi pi-trash"
                  onClick={() => handleBulkAction('delete')}
                >
                  Excluir
                </PrimeButton>
                <IconButton
                  icon="pi pi-times"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContracts([])}
                  tooltip="Limpar seleção"
                />
              </div>
            </div>
          </PrimeCard>
        )}

        {/* Tabela de contratos */}
        <PrimeCard>
          <PrimeDataTable
            data={filteredContracts}
            columns={columns}
            actions={actions}
            selectable
            selectedRows={selectedContracts}
            onSelectionChange={setSelectedContracts}
            searchable={false} // Usando filtro customizado
            exportable
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            loading={loading}
            emptyMessage="Nenhum contrato encontrado"
            globalFilterFields={['contractNumber', 'clientName', 'clientEmail', 'description']}
            sortField="createdAt"
            sortOrder={-1}
            responsiveLayout="scroll"
          />
        </PrimeCard>
      </div>
    </Page>
  );
};

export default ContractListExample;
