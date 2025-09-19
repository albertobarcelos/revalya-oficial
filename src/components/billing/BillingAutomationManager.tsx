import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Play,
  RefreshCw,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  Eye
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBillingAutomation } from '@/hooks/useBillingAutomation';
import type { BillingProcessingOptions } from '@/services/billingAutomationService';

interface BillingAutomationManagerProps {
  tenantId: string;
  onBillingGenerated?: (count: number) => void;
  onReportGenerated?: (report: any) => void;
}

/**
 * Componente para gerenciar automação de faturamento
 * Permite gerar cobranças recorrentes, aplicar regras financeiras e monitorar resultados
 */
export function BillingAutomationManager({
  tenantId,
  onBillingGenerated,
  onReportGenerated
}: BillingAutomationManagerProps) {
  const {
    isGenerating,
    isApplyingInterest,
    isProcessingDiscount,
    isGeneratingReport,
    isScheduling,
    lastGenerationResult,
    lastInterestResult,
    lastReport,
    lastScheduleResult,
    error,
    generateRecurringBillings,
    applyInterestAndFines,
    generateBillingReport,
    scheduleAutomaticProcessing,
    clearResults
  } = useBillingAutomation();

  // Estados do formulário
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [referenceDate, setReferenceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [autoIntegrate, setAutoIntegrate] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(5);
  const [processingDay, setProcessingDay] = useState(1);
  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Limpar resultados ao montar o componente
  useEffect(() => {
    clearResults();
  }, [clearResults]);

  // Callback quando faturamentos são gerados
  useEffect(() => {
    if (lastGenerationResult?.success && onBillingGenerated) {
      onBillingGenerated(lastGenerationResult.generated_count);
    }
  }, [lastGenerationResult, onBillingGenerated]);

  // Callback quando relatório é gerado
  useEffect(() => {
    if (lastReport && onReportGenerated) {
      onReportGenerated(lastReport);
    }
  }, [lastReport, onReportGenerated]);

  /**
   * Executa geração de faturamentos
   */
  const handleGenerateBillings = async () => {
    const options: BillingProcessingOptions = {
      tenant_id: tenantId,
      contract_ids: selectedContracts.length > 0 ? selectedContracts : undefined,
      reference_date: new Date(referenceDate),
      auto_integrate: autoIntegrate,
      force_regenerate: forceRegenerate,
      dry_run: dryRun
    };

    await generateRecurringBillings(options);
  };

  /**
   * Executa aplicação de juros e multas
   */
  const handleApplyInterest = async () => {
    await applyInterestAndFines(tenantId, gracePeriodDays);
  };

  /**
   * Gera relatório de faturamento
   */
  const handleGenerateReport = async () => {
    await generateBillingReport(
      tenantId,
      new Date(reportStartDate),
      new Date(reportEndDate)
    );
  };

  /**
   * Agenda processamento automático
   */
  const handleScheduleProcessing = async () => {
    await scheduleAutomaticProcessing(tenantId, processingDay);
  };

  /**
   * Renderiza estatísticas do último resultado
   */
  const renderGenerationStats = () => {
    if (!lastGenerationResult) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Gerados</p>
                <p className="text-2xl font-bold text-green-600">
                  {lastGenerationResult.generated_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Erros</p>
                <p className="text-2xl font-bold text-red-600">
                  {lastGenerationResult.errors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Valor Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {lastGenerationResult.billings
                    .reduce((sum, b) => sum + b.net_amount, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renderiza estatísticas de juros e multas
   */
  const renderInterestStats = () => {
    if (!lastInterestResult) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Atualizados</p>
                <p className="text-2xl font-bold text-orange-600">
                  {lastInterestResult.updated_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Juros</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {lastInterestResult.total_interest.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Multas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {lastInterestResult.total_fines.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  /**
   * Renderiza resumo do relatório
   */
  const renderReportSummary = () => {
    if (!lastReport) return null;

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-xl font-bold">{lastReport.total_billings}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Pagos</p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {lastReport.paid_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Pendentes</p>
                  <p className="text-xl font-bold text-yellow-600">
                    R$ {lastReport.pending_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Vencidos</p>
                  <p className="text-xl font-bold text-red-600">
                    R$ {lastReport.overdue_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico por status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(lastReport.by_status).map(([status, data]: [string, any]) => {
                const percentage = (data.amount / lastReport.total_amount) * 100;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{status}</Badge>
                      <span className="text-sm">{data.count} faturamentos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={percentage} className="w-20" />
                      <span className="text-sm font-medium">
                        R$ {data.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automação de Faturamento</h2>
          <p className="text-muted-foreground">
            Gerencie cobranças recorrentes, aplique regras financeiras e monitore resultados
          </p>
        </div>
        <Button
          variant="outline"
          onClick={clearResults}
          disabled={isGenerating || isApplyingInterest || isGeneratingReport}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpar Resultados
        </Button>
      </div>

      {/* Alertas de erro */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs principais */}
      <Tabs defaultValue="generation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generation">Geração</TabsTrigger>
          <TabsTrigger value="interest">Juros & Multas</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="schedule">Agendamento</TabsTrigger>
        </TabsList>

        {/* Tab: Geração de Faturamentos */}
        <TabsContent value="generation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Gerar Faturamentos Recorrentes</span>
              </CardTitle>
              <CardDescription>
                Configure e execute a geração automática de faturamentos para contratos ativos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceDate">Data de Referência</Label>
                  <Input
                    id="referenceDate"
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Período de Carência (dias)</Label>
                  <Input
                    id="gracePeriod"
                    type="number"
                    min="0"
                    max="30"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoIntegrate"
                    checked={autoIntegrate}
                    onCheckedChange={(checked) => setAutoIntegrate(checked as boolean)}
                  />
                  <Label htmlFor="autoIntegrate">
                    Integrar automaticamente com gateway de pagamento
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="forceRegenerate"
                    checked={forceRegenerate}
                    onCheckedChange={(checked) => setForceRegenerate(checked as boolean)}
                  />
                  <Label htmlFor="forceRegenerate">
                    Forçar regeneração (substituir faturamentos existentes)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dryRun"
                    checked={dryRun}
                    onCheckedChange={(checked) => setDryRun(checked as boolean)}
                  />
                  <Label htmlFor="dryRun">
                    Modo de simulação (não salvar no banco)
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="flex space-x-2">
                <Button
                  onClick={handleGenerateBillings}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {dryRun ? 'Simular Geração' : 'Gerar Faturamentos'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setDryRun(!dryRun)}
                  disabled={isGenerating}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {dryRun ? 'Modo Real' : 'Modo Simulação'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas de geração */}
          {renderGenerationStats()}

          {/* Lista de erros */}
          {lastGenerationResult?.errors && lastGenerationResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Erros na Geração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lastGenerationResult.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Contrato {error.contract_id}:</strong> {error.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Juros e Multas */}
        <TabsContent value="interest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Aplicar Juros e Multas</span>
              </CardTitle>
              <CardDescription>
                Aplique automaticamente juros e multas para cobranças vencidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gracePeriodInterest">Período de Carência (dias)</Label>
                  <Input
                    id="gracePeriodInterest"
                    type="number"
                    min="0"
                    max="30"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Cobranças vencidas há mais de {gracePeriodDays} dias terão juros e multas aplicados
                  </p>
                </div>
              </div>

              <Button
                onClick={handleApplyInterest}
                disabled={isApplyingInterest}
                className="w-full"
              >
                {isApplyingInterest ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Aplicar Juros e Multas
              </Button>
            </CardContent>
          </Card>

          {/* Estatísticas de juros */}
          {renderInterestStats()}
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Relatórios de Faturamento</span>
              </CardTitle>
              <CardDescription>
                Gere relatórios detalhados sobre o desempenho do faturamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportStartDate">Data Inicial</Label>
                  <Input
                    id="reportStartDate"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportEndDate">Data Final</Label>
                  <Input
                    id="reportEndDate"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="flex-1"
                >
                  {isGeneratingReport ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Gerar Relatório
                </Button>

                {lastReport && (
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumo do relatório */}
          {renderReportSummary()}
        </TabsContent>

        {/* Tab: Agendamento */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Agendamento Automático</span>
              </CardTitle>
              <CardDescription>
                Configure o processamento automático de faturamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="processingDay">Dia do Processamento</Label>
                  <Select
                    value={processingDay.toString()}
                    onValueChange={(value) => setProcessingDay(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Faturamentos serão gerados automaticamente no dia {processingDay} de cada mês
                  </p>
                </div>
              </div>

              <Button
                onClick={handleScheduleProcessing}
                disabled={isScheduling}
                className="w-full"
              >
                {isScheduling ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Agendar Processamento
              </Button>

              {lastScheduleResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Próximo processamento agendado para:{' '}
                    <strong>
                      {format(lastScheduleResult.next_run, 'dd/MM/yyyy', { locale: ptBR })}
                    </strong>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BillingAutomationManager;
