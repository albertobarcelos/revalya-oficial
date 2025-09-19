import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Button
} from '@/components/ui/button';
import {
  Badge
} from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Progress
} from '@/components/ui/progress';
import {
  Separator
} from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  Zap,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { useChargeIntegration } from '@/hooks/useChargeIntegration';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ChargeIntegrationManagerProps {
  tenantId: string;
  billingId?: string;
  onChargeCreated?: (externalId: string, paymentUrl: string) => void;
  onSyncCompleted?: (updatedCount: number) => void;
  className?: string;
}

interface IntegrationStats {
  total_billings: number;
  with_external_id: number;
  pending_sync: number;
  pending_cancellations: number;
  sync_success_rate: number;
}

interface GatewayOption {
  code: string;
  name: string;
  available: boolean;
}

/**
 * Componente para gerenciar integração de cobranças com gateways de pagamento
 * Permite criar, sincronizar e monitorar cobranças externas
 */
export function ChargeIntegrationManager({
  tenantId,
  billingId,
  onChargeCreated,
  onSyncCompleted,
  className
}: ChargeIntegrationManagerProps) {
  const {
    createExternalCharge,
    syncChargeStatuses,
    processPendingCancellations,
    updateOverdueCharges,
    getIntegrationStats,
    isCreating,
    isSyncing,
    isCancelling,
    isUpdatingOverdue,
    lastResult,
    error
  } = useChargeIntegration();

  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [forceRecreate, setForceRecreate] = useState(false);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [syncLimit, setSyncLimit] = useState(50);

  // Gateways disponíveis (pode ser carregado dinamicamente)
  const availableGateways: GatewayOption[] = [
    { code: 'ASAAS', name: 'Asaas', available: true },
    { code: 'ITAU', name: 'Itaú', available: true },
    { code: 'PAGSEGURO', name: 'PagSeguro', available: false },
    { code: 'MERCADOPAGO', name: 'Mercado Pago', available: false }
  ];

  // Carregar estatísticas ao montar o componente
  useEffect(() => {
    loadStats();
  }, [tenantId]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const statsData = await getIntegrationStats(tenantId);
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleCreateCharge = async () => {
    if (!billingId || !selectedGateway) return;

    const result = await createExternalCharge(billingId, selectedGateway, forceRecreate);
    
    if (result.success && result.external_id && result.payment_url) {
      onChargeCreated?.(result.external_id, result.payment_url);
      setShowCreateDialog(false);
      await loadStats(); // Recarregar estatísticas
    }
  };

  const handleSyncCharges = async () => {
    const result = await syncChargeStatuses(tenantId, syncLimit);
    
    if (result.success) {
      onSyncCompleted?.(result.updated_count);
      await loadStats(); // Recarregar estatísticas
    }
  };

  const handleProcessCancellations = async () => {
    await processPendingCancellations(tenantId);
    await loadStats(); // Recarregar estatísticas
  };

  const handleUpdateOverdue = async () => {
    await updateOverdueCharges(tenantId);
    await loadStats(); // Recarregar estatísticas
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SYNCED':
        return <Badge variant="default" className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" />Sincronizado</Badge>;
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        </TabsList>

        {/* Aba de Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Faturamentos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Faturamentos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? '...' : stats?.total_billings || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Faturamentos cadastrados
                </p>
              </CardContent>
            </Card>

            {/* Com Integração Externa */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Com Integração</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? '...' : stats?.with_external_id || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Integrados com gateway
                </p>
              </CardContent>
            </Card>

            {/* Taxa de Sucesso */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? '...' : formatPercentage(stats?.sync_success_rate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sincronização bem-sucedida
                </p>
                {stats && (
                  <Progress 
                    value={stats.sync_success_rate} 
                    className="mt-2" 
                  />
                )}
              </CardContent>
            </Card>

            {/* Pendências */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendências</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingStats ? '...' : (stats?.pending_sync || 0) + (stats?.pending_cancellations || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sync: {stats?.pending_sync || 0} | Cancel: {stats?.pending_cancellations || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {stats && (stats.pending_sync > 0 || stats.pending_cancellations > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Existem {stats.pending_sync} cobranças pendentes de sincronização e {stats.pending_cancellations} cancelamentos pendentes.
                Execute as ações necessárias na aba "Ações".
              </AlertDescription>
            </Alert>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Aba de Ações */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Criar Cobrança Externa */}
            {billingId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Criar Cobrança Externa
                  </CardTitle>
                  <CardDescription>
                    Cria uma cobrança no gateway de pagamento selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={isCreating}>
                        {isCreating ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Criar Cobrança
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Cobrança Externa</DialogTitle>
                        <DialogDescription>
                          Selecione o gateway de pagamento para criar a cobrança externa.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Gateway de Pagamento</label>
                          <Select value={selectedGateway} onValueChange={setSelectedGateway}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um gateway" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableGateways.map((gateway) => (
                                <SelectItem 
                                  key={gateway.code} 
                                  value={gateway.code}
                                  disabled={!gateway.available}
                                >
                                  {gateway.name} {!gateway.available && '(Indisponível)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="force-recreate"
                            checked={forceRecreate}
                            onChange={(e) => setForceRecreate(e.target.checked)}
                          />
                          <label htmlFor="force-recreate" className="text-sm">
                            Forçar recriação (se já existir)
                          </label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleCreateCharge}
                          disabled={!selectedGateway || isCreating}
                        >
                          {isCreating ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          )}
                          Criar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {/* Sincronizar Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Status
                </CardTitle>
                <CardDescription>
                  Atualiza o status das cobranças com os gateways de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Limite de cobranças</label>
                  <Select value={syncLimit.toString()} onValueChange={(value) => setSyncLimit(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 cobranças</SelectItem>
                      <SelectItem value="50">50 cobranças</SelectItem>
                      <SelectItem value="100">100 cobranças</SelectItem>
                      <SelectItem value="200">200 cobranças</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSyncCharges}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar
                </Button>
              </CardContent>
            </Card>

            {/* Processar Cancelamentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Processar Cancelamentos
                </CardTitle>
                <CardDescription>
                  Processa cancelamentos pendentes nos gateways
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={handleProcessCancellations}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Processar Cancelamentos
                </Button>
              </CardContent>
            </Card>

            {/* Atualizar Vencidas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Atualizar Vencidas
                </CardTitle>
                <CardDescription>
                  Marca cobranças vencidas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleUpdateOverdue}
                  disabled={isUpdatingOverdue}
                >
                  {isUpdatingOverdue ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Vencidas
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Monitoramento */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Status da Integração</CardTitle>
                <CardDescription>
                  Monitoramento em tempo real das integrações
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadStats}
                disabled={isLoadingStats}
              >
                {isLoadingStats ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Taxa de Integração</span>
                        <span className="text-sm font-medium">
                          {formatPercentage((stats.with_external_id / Math.max(stats.total_billings, 1)) * 100)}
                        </span>
                      </div>
                      <Progress 
                        value={(stats.with_external_id / Math.max(stats.total_billings, 1)) * 100} 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Taxa de Sincronização</span>
                        <span className="text-sm font-medium">
                          {formatPercentage(stats.sync_success_rate)}
                        </span>
                      </div>
                      <Progress value={stats.sync_success_rate} />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{stats.total_billings}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats.with_external_id}</div>
                      <div className="text-xs text-muted-foreground">Integrados</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{stats.pending_sync}</div>
                      <div className="text-xs text-muted-foreground">Pendente Sync</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-destructive">{stats.pending_cancellations}</div>
                      <div className="text-xs text-muted-foreground">Cancelamentos</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultado da Última Operação */}
          {lastResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Última Operação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(lastResult.success ? 'SYNCED' : 'FAILED')}
                  </div>
                  
                  {'updated_count' in lastResult && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Atualizados</span>
                      <span className="text-sm font-medium">{lastResult.updated_count}</span>
                    </div>
                  )}
                  
                  {'cancelled_count' in lastResult && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cancelados</span>
                      <span className="text-sm font-medium">{lastResult.cancelled_count}</span>
                    </div>
                  )}
                  
                  {'external_id' in lastResult && lastResult.external_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ID Externo</span>
                      <span className="text-sm font-mono">{lastResult.external_id}</span>
                    </div>
                  )}
                  
                  {'errors' in lastResult && lastResult.errors.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm text-muted-foreground">Erros ({lastResult.errors.length})</span>
                      <div className="mt-2 space-y-1">
                        {lastResult.errors.slice(0, 3).map((error, index) => (
                          <div key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                            {error.error}
                          </div>
                        ))}
                        {lastResult.errors.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            ... e mais {lastResult.errors.length - 3} erros
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ChargeIntegrationManager;
