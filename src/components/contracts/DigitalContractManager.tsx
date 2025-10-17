import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Eye,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Send,
  RefreshCw,
  BarChart3,
  Filter,
  Copy,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDigitalContract } from '../../hooks/useDigitalContract';
import {
  DigitalContract,
  ContractStatus,
  ContractType,
  ContractSignature,
  BillingCycle,
  PaymentMethod,
  SignerRole,
  SignatureType
} from '../../services/digitalContractService';

interface DigitalContractManagerProps {
  tenantId: string;
  userId: string;
  className?: string;
}

interface ContractFormData {
  title: string;
  description: string;
  contract_type: ContractType;
  contractor_id: string;
  contractee_id: string;
  start_date: string;
  end_date: string;
  total_value: string;
  currency: string;
  billing_cycle: BillingCycle;
  payment_method: PaymentMethod;
  due_days: string;
  auto_renewal: boolean;
  renewal_notice_days: string;
}

interface SignerFormData {
  signer_name: string;
  signer_email: string;
  signer_role: SignerRole;
  signature_type: SignatureType;
}

interface SearchFilters {
  status?: ContractStatus;
  contract_type?: ContractType;
  search_term: string;
  start_date: string;
  end_date: string;
}

const DigitalContractManager: React.FC<DigitalContractManagerProps> = ({
  tenantId,
  userId,
  className = ''
}) => {
  const {
    // Estados
    isCreating,
    isUpdating,
    isSearching,
    isInitiatingSignature,
    isGeneratingAnalytics,
    contracts,
    analytics,
    searchResults,
    lastError,
    
    // Funções
    createContract,
    searchContracts,
    generateContractAnalytics,
    initiateSignatureProcess,
    processPendingRenewals,
    
    // Utilitários
    formatContractNumber,
    formatContractStatus,
    formatContractType,
    isContractExpiringSoon,
    clearError
  } = useDigitalContract();

  // Estados locais
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<DigitalContract | null>(null);
  const [contractForm, setContractForm] = useState<ContractFormData>({
    title: '',
    description: '',
    contract_type: 'SERVICE_AGREEMENT',
    contractor_id: '',
    contractee_id: '',
    start_date: '',
    end_date: '',
    total_value: '',
    currency: 'BRL',
    billing_cycle: 'MONTHLY',
    payment_method: 'PIX',
    due_days: '30',
    auto_renewal: false,
    renewal_notice_days: '30'
  });
  const [signers, setSigners] = useState<SignerFormData[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    search_term: '',
    start_date: '',
    end_date: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, [tenantId]);

  const loadInitialData = async () => {
    await Promise.all([
      searchContracts({ tenant_id: tenantId, limit: 50 }),
      generateContractAnalytics(tenantId)
    ]);
  };

  const handleCreateContract = async () => {
    try {
      const contractData: Omit<DigitalContract, 'id' | 'created_at' | 'version' | 'signatures'> = {
        tenant_id: tenantId,
        contract_number: '', // Será gerado automaticamente
        title: contractForm.title,
        description: contractForm.description,
        contract_type: contractForm.contract_type,
        contractor_id: contractForm.contractor_id,
        contractee_id: contractForm.contractee_id,
        start_date: new Date(contractForm.start_date),
        end_date: contractForm.end_date ? new Date(contractForm.end_date) : undefined,
        status: 'DRAFT',
        total_value: parseFloat(contractForm.total_value) || 0,
        currency: contractForm.currency,
        payment_terms: {
          billing_cycle: contractForm.billing_cycle,
          payment_method: contractForm.payment_method,
          due_days: parseInt(contractForm.due_days) || 30
        },
        auto_renewal: contractForm.auto_renewal,
        renewal_notice_days: contractForm.auto_renewal ? parseInt(contractForm.renewal_notice_days) : undefined,
        signatures: [],
        created_by: userId
      };

      const contractId = await createContract(contractData);
      
      if (contractId) {
        setShowCreateDialog(false);
        resetContractForm();
        await loadInitialData();
      }
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
    }
  };

  const handleInitiateSignature = async () => {
    if (!selectedContract || signers.length === 0) {
      return;
    }

    try {
      const signersData = signers.map(signer => ({
        signer_name: signer.signer_name,
        signer_email: signer.signer_email,
        signer_role: signer.signer_role,
        signature_type: signer.signature_type
      }));

      const result = await initiateSignatureProcess(
        selectedContract.id!,
        signersData,
        'clicksign',
        userId
      );

      if (result) {
        setShowSignatureDialog(false);
        setSigners([]);
        await loadInitialData();
      }
    } catch (error) {
      console.error('Erro ao iniciar assinatura:', error);
    }
  };

  const handleSearch = async () => {
    const filters: any = {
      tenant_id: tenantId,
      limit: 50
    };

    if (searchFilters.status) filters.status = searchFilters.status;
    if (searchFilters.contract_type) filters.contract_type = searchFilters.contract_type;
    if (searchFilters.search_term) filters.search_term = searchFilters.search_term;
    if (searchFilters.start_date) filters.start_date = new Date(searchFilters.start_date);
    if (searchFilters.end_date) filters.end_date = new Date(searchFilters.end_date);

    await searchContracts(filters);
  };

  const addSigner = () => {
    setSigners([...signers, {
      signer_name: '',
      signer_email: '',
      signer_role: 'CONTRACTEE',
      signature_type: 'ELECTRONIC'
    }]);
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof SignerFormData, value: string) => {
    const updatedSigners = [...signers];
    updatedSigners[index] = { ...updatedSigners[index], [field]: value };
    setSigners(updatedSigners);
  };

  const resetContractForm = () => {
    setContractForm({
      title: '',
      description: '',
      contract_type: 'SERVICE_AGREEMENT',
      contractor_id: '',
      contractee_id: '',
      start_date: '',
      end_date: '',
      total_value: '',
      currency: 'BRL',
      billing_cycle: 'MONTHLY',
      payment_method: 'PIX',
      due_days: '30',
      auto_renewal: false,
      renewal_notice_days: '30'
    });
  };

  const getStatusColor = (status: ContractStatus) => {
    const colors = {
      'DRAFT': 'bg-muted text-muted-foreground',
      'PENDING_REVIEW': 'bg-warning/10 text-warning',
      'PENDING_SIGNATURE': 'bg-primary/10 text-primary',
      'ACTIVE': 'bg-success/10 text-success',
      'SUSPENDED': 'bg-warning/10 text-warning',
      'TERMINATED': 'bg-danger/10 text-danger',
      'EXPIRED': 'bg-danger/10 text-danger',
      'CANCELLED': 'bg-muted text-muted-foreground'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'PENDING_SIGNATURE':
        return <Clock className="h-4 w-4 text-primary" />;
      case 'EXPIRED':
      case 'TERMINATED':
        return <XCircle className="h-4 w-4 text-danger" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contratos Digitais</h2>
          <p className="text-gray-600">Gerencie contratos, assinaturas e renovações</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => processPendingRenewals()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Processar Renovações
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Contrato</DialogTitle>
                <DialogDescription>
                  Preencha as informações do contrato
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={contractForm.title}
                      onChange={(e) => setContractForm({...contractForm, title: e.target.value})}
                      placeholder="Título do contrato"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contract_type">Tipo *</Label>
                    <Select
                      value={contractForm.contract_type}
                      onValueChange={(value: ContractType) => 
                        setContractForm({...contractForm, contract_type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERVICE_AGREEMENT">Acordo de Serviços</SelectItem>
                        <SelectItem value="SOFTWARE_LICENSE">Licença de Software</SelectItem>
                        <SelectItem value="MAINTENANCE_CONTRACT">Contrato de Manutenção</SelectItem>
                        <SelectItem value="CONSULTING_AGREEMENT">Acordo de Consultoria</SelectItem>
                        <SelectItem value="SUBSCRIPTION_CONTRACT">Contrato de Assinatura</SelectItem>
                        <SelectItem value="PARTNERSHIP_AGREEMENT">Acordo de Parceria</SelectItem>
                        <SelectItem value="NDA">Acordo de Confidencialidade</SelectItem>
                        <SelectItem value="EMPLOYMENT_CONTRACT">Contrato de Trabalho</SelectItem>
                        <SelectItem value="CUSTOM">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={contractForm.description}
                    onChange={(e) => setContractForm({...contractForm, description: e.target.value})}
                    placeholder="Descrição do contrato"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractor_id">ID Contratante *</Label>
                    <Input
                      id="contractor_id"
                      value={contractForm.contractor_id}
                      onChange={(e) => setContractForm({...contractForm, contractor_id: e.target.value})}
                      placeholder="ID do contratante"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractee_id">ID Contratado *</Label>
                    <Input
                      id="contractee_id"
                      value={contractForm.contractee_id}
                      onChange={(e) => setContractForm({...contractForm, contractee_id: e.target.value})}
                      placeholder="ID do contratado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Data de Início *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm({...contractForm, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Data de Fim</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={contractForm.end_date}
                      onChange={(e) => setContractForm({...contractForm, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="total_value">Valor Total</Label>
                    <Input
                      id="total_value"
                      type="number"
                      step="0.01"
                      value={contractForm.total_value}
                      onChange={(e) => setContractForm({...contractForm, total_value: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Moeda</Label>
                    <Select
                      value={contractForm.currency}
                      onValueChange={(value) => setContractForm({...contractForm, currency: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (BRL)</SelectItem>
                        <SelectItem value="USD">Dólar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due_days">Prazo Pagamento (dias)</Label>
                    <Input
                      id="due_days"
                      type="number"
                      value={contractForm.due_days}
                      onChange={(e) => setContractForm({...contractForm, due_days: e.target.value})}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
                    <Select
                      value={contractForm.billing_cycle}
                      onValueChange={(value: BillingCycle) => 
                        setContractForm({...contractForm, billing_cycle: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                        <SelectItem value="Único">Único</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_method">Método de Pagamento</Label>
                    <Select
                      value={contractForm.payment_method}
                      onValueChange={(value: PaymentMethod) => 
                        setContractForm({...contractForm, payment_method: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Transferência Bancária</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                        <SelectItem value="CREDIT_CARD_RECURRING">Cartão de Crédito Recorrente</SelectItem>
                        <SelectItem value="BOLETO">Boleto</SelectItem>
                        <SelectItem value="CHECK">Cheque</SelectItem>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_renewal"
                    checked={contractForm.auto_renewal}
                    onChange={(e) => setContractForm({...contractForm, auto_renewal: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="auto_renewal">Renovação Automática</Label>
                </div>

                {contractForm.auto_renewal && (
                  <div>
                    <Label htmlFor="renewal_notice_days">Aviso de Renovação (dias)</Label>
                    <Input
                      id="renewal_notice_days"
                      type="number"
                      value={contractForm.renewal_notice_days}
                      onChange={(e) => setContractForm({...contractForm, renewal_notice_days: e.target.value})}
                      placeholder="30"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateContract} disabled={isCreating}>
                  {isCreating ? 'Criando...' : 'Criar Contrato'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Erro */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lastError}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Fechar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_contracts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{analytics.active_contracts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aguardando Assinatura</CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{analytics.pending_signatures}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expirando em Breve</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{analytics.expiring_soon}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contratos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Contratos Recentes</CardTitle>
              <CardDescription>Últimos contratos criados ou modificados</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length > 0 ? (
                <div className="space-y-4">
                  {contracts.slice(0, 5).map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(contract.status)}
                        </div>
                        <div>
                          <p className="font-medium">{contract.title}</p>
                          <p className="text-sm text-gray-600">
                            {formatContractNumber(contract.contract_number)} • {formatContractType(contract.contract_type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(contract.status)}>
                          {formatContractStatus(contract.status)}
                        </Badge>
                        {isContractExpiringSoon(contract) && (
                          <Badge variant="outline" className="text-warning border-warning">
                            Expirando
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhum contrato encontrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contracts" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Busca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search_term">Buscar</Label>
                  <Input
                    id="search_term"
                    placeholder="Título ou número do contrato"
                    value={searchFilters.search_term}
                    onChange={(e) => setSearchFilters({...searchFilters, search_term: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="filter_status">Status</Label>
                  <Select
                    value={searchFilters.status || ''}
                    onValueChange={(value: ContractStatus | '') => 
                      setSearchFilters({...searchFilters, status: value || undefined})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      <SelectItem value="PENDING_REVIEW">Aguardando Revisão</SelectItem>
                      <SelectItem value="PENDING_SIGNATURE">Aguardando Assinatura</SelectItem>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                      <SelectItem value="TERMINATED">Encerrado</SelectItem>
                      <SelectItem value="EXPIRED">Expirado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter_type">Tipo</Label>
                  <Select
                    value={searchFilters.contract_type || ''}
                    onValueChange={(value: ContractType | '') => 
                      setSearchFilters({...searchFilters, contract_type: value || undefined})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="SERVICE_AGREEMENT">Acordo de Serviços</SelectItem>
                      <SelectItem value="SOFTWARE_LICENSE">Licença de Software</SelectItem>
                      <SelectItem value="MAINTENANCE_CONTRACT">Contrato de Manutenção</SelectItem>
                      <SelectItem value="CONSULTING_AGREEMENT">Acordo de Consultoria</SelectItem>
                      <SelectItem value="SUBSCRIPTION_CONTRACT">Contrato de Assinatura</SelectItem>
                      <SelectItem value="PARTNERSHIP_AGREEMENT">Acordo de Parceria</SelectItem>
                      <SelectItem value="NDA">Acordo de Confidencialidade</SelectItem>
                      <SelectItem value="EMPLOYMENT_CONTRACT">Contrato de Trabalho</SelectItem>
                      <SelectItem value="CUSTOM">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start_date_filter">Data Início</Label>
                  <Input
                    id="start_date_filter"
                    type="date"
                    value={searchFilters.start_date}
                    onChange={(e) => setSearchFilters({...searchFilters, start_date: e.target.value})}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Contratos */}
          <Card>
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>
                {searchResults ? `${searchResults.total} contratos encontrados` : 'Lista de contratos'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data Início</TableHead>
                      <TableHead>Data Fim</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono text-sm">
                          {formatContractNumber(contract.contract_number)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.title}</p>
                            {contract.description && (
                              <p className="text-sm text-gray-600 truncate max-w-xs">
                                {contract.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatContractType(contract.contract_type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(contract.status)}>
                              {formatContractStatus(contract.status)}
                            </Badge>
                            {isContractExpiringSoon(contract) && (
                              <Badge variant="outline" className="text-warning border-warning">
                                Expirando
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contract.total_value > 0 && (
                            <span className="font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: contract.currency
                              }).format(contract.total_value)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {contract.end_date ? 
                            format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR }) : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {contract.status === 'PENDING_SIGNATURE' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setShowSignatureDialog(true);
                                }}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum contrato encontrado</p>
                  <p className="text-sm text-gray-400">Crie um novo contrato ou ajuste os filtros de busca</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <div className="space-y-6">
              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(analytics.total_value)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(analytics.average_contract_value)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Assinatura</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.signature_completion_rate.toFixed(1)}%
                    </div>
                    <Progress value={analytics.signature_completion_rate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Renovação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.renewal_rate.toFixed(1)}%
                    </div>
                    <Progress value={analytics.renewal_rate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição por Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.contracts_by_status).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(status as ContractStatus)}>
                            {formatContractStatus(status as ContractStatus)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{count} contratos</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(count / analytics.total_contracts) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.contracts_by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatContractType(type as ContractType)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{count} contratos</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-success h-2 rounded-full"
                              style={{
                                width: `${(count / analytics.total_contracts) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Carregando analytics...</p>
                <Button
                  onClick={() => generateContractAnalytics(tenantId)}
                  disabled={isGeneratingAnalytics}
                  className="mt-4"
                >
                  {isGeneratingAnalytics ? 'Gerando...' : 'Gerar Analytics'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Assinatura */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Iniciar Processo de Assinatura</DialogTitle>
            <DialogDescription>
              Configure os signatários para o contrato: {selectedContract?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Signatários</h4>
              <Button onClick={addSigner} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Signatário
              </Button>
            </div>

            {signers.map((signer, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={signer.signer_name}
                    onChange={(e) => updateSigner(index, 'signer_name', e.target.value)}
                    placeholder="Nome do signatário"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={signer.signer_email}
                    onChange={(e) => updateSigner(index, 'signer_email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Papel</Label>
                  <Select
                    value={signer.signer_role}
                    onValueChange={(value: SignerRole) => updateSigner(index, 'signer_role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRACTOR">Contratante</SelectItem>
                      <SelectItem value="CONTRACTEE">Contratado</SelectItem>
                      <SelectItem value="WITNESS">Testemunha</SelectItem>
                      <SelectItem value="LEGAL_REPRESENTATIVE">Representante Legal</SelectItem>
                      <SelectItem value="GUARANTOR">Fiador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSigner(index)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {signers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum signatário adicionado</p>
                <p className="text-sm">Adicione pelo menos um signatário para continuar</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInitiateSignature}
              disabled={isInitiatingSignature || signers.length === 0}
            >
              {isInitiatingSignature ? 'Iniciando...' : 'Iniciar Assinatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalContractManager;
