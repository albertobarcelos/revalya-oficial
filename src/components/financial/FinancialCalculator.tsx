import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  Download,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useFinancialCalculation,
  InterestCalculationParams,
  AmortizationParams,
  ContractAdjustmentParams,
  PaymentSimulationParams,
  CashFlowEntry
} from '../../hooks/useFinancialCalculation';

type CalculatorTab = 'interest' | 'amortization' | 'adjustment' | 'payment' | 'metrics' | 'future-value' | 'present-value';

interface FinancialCalculatorProps {
  className?: string;
  defaultTab?: CalculatorTab;
}

/**
 * Componente de calculadora financeira completa
 * Oferece interface para todos os tipos de cálculos financeiros
 */
export const FinancialCalculator: React.FC<FinancialCalculatorProps> = ({
  className = '',
  defaultTab = 'interest'
}) => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>(defaultTab);
  const [cashFlows, setCashFlows] = useState<CashFlowEntry[]>([]);
  
  const {
    // Estados de carregamento
    isCalculatingInterest,
    isGeneratingAmortization,
    isCalculatingAdjustment,
    isSimulatingPayment,
    isCalculatingMetrics,
    isCalculatingFutureValue,
    isCalculatingPresentValue,
    
    // Resultados
    interestResult,
    amortizationTable,
    adjustmentResult,
    paymentSimulation,
    financialMetrics,
    futureValue,
    presentValue,
    
    // Funções
    calculateInterest,
    generateAmortizationTable,
    calculateContractAdjustment,
    simulatePayment,
    calculateFinancialMetrics,
    calculateFutureValue,
    calculatePresentValue,
    
    // Utilitários
    clearResults,
    exportAmortizationToCSV,
    exportCalculationReport
  } = useFinancialCalculation();

  const tabs = [
    { id: 'interest', label: 'Juros', icon: Calculator },
    { id: 'amortization', label: 'Amortização', icon: BarChart3 },
    { id: 'adjustment', label: 'Reajuste', icon: TrendingUp },
    { id: 'payment', label: 'Pagamento', icon: DollarSign },
    { id: 'metrics', label: 'Métricas', icon: BarChart3 },
    { id: 'future-value', label: 'Valor Futuro', icon: Calendar },
    { id: 'present-value', label: 'Valor Presente', icon: Calendar }
  ] as const;

  // Formulários para cada tipo de cálculo
  const [interestForm, setInterestForm] = useState<InterestCalculationParams>({
    principal: 10000,
    rate: 1.5,
    period: 12,
    periodType: 'MONTHLY',
    compoundType: 'COMPOUND',
    gracePeriod: 0
  });

  const [amortizationForm, setAmortizationForm] = useState<AmortizationParams>({
    principal: 100000,
    annualRate: 12,
    periods: 24,
    paymentType: 'PRICE',
    gracePeriod: 0,
    firstPaymentDate: new Date()
  });

  const [adjustmentForm, setAdjustmentForm] = useState<ContractAdjustmentParams>({
    originalValue: 5000,
    adjustmentIndex: 'IPCA',
    baseDate: new Date(),
    adjustmentDate: new Date(),
    adjustmentType: 'ANNUAL'
  });

  const [paymentForm, setPaymentForm] = useState<PaymentSimulationParams>({
    totalAmount: 1000,
    paymentDate: new Date(),
    dueDate: new Date(),
    interestRate: 2,
    fineRate: 2,
    discountRate: 5,
    discountDays: 10,
    gracePeriod: 5
  });

  const [futureValueForm, setFutureValueForm] = useState({
    presentValue: 10000,
    rate: 1.5,
    periods: 12,
    periodType: 'MONTHLY' as 'MONTHLY' | 'YEARLY'
  });

  const [presentValueForm, setPresentValueForm] = useState({
    futureValue: 15000,
    rate: 1.5,
    periods: 12,
    periodType: 'MONTHLY' as 'MONTHLY' | 'YEARLY'
  });

  const [metricsForm, setMetricsForm] = useState({
    discountRate: 10
  });

  // Handlers para submissão dos formulários
  const handleInterestCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    await calculateInterest(interestForm);
  };

  const handleAmortizationGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateAmortizationTable(amortizationForm);
  };

  const handleAdjustmentCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    await calculateContractAdjustment(adjustmentForm);
  };

  const handlePaymentSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    await simulatePayment(paymentForm);
  };

  const handleMetricsCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashFlows.length === 0) {
      alert('Adicione pelo menos um fluxo de caixa.');
      return;
    }
    await calculateFinancialMetrics(cashFlows, metricsForm.discountRate);
  };

  const handleFutureValueCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    await calculateFutureValue(
      futureValueForm.presentValue,
      futureValueForm.rate,
      futureValueForm.periods,
      futureValueForm.periodType
    );
  };

  const handlePresentValueCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    await calculatePresentValue(
      presentValueForm.futureValue,
      presentValueForm.rate,
      presentValueForm.periods,
      presentValueForm.periodType
    );
  };

  // Função para adicionar fluxo de caixa
  const addCashFlow = () => {
    setCashFlows([...cashFlows, {
      date: new Date(),
      amount: 0,
      description: '',
      type: 'INFLOW'
    }]);
  };

  // Função para remover fluxo de caixa
  const removeCashFlow = (index: number) => {
    setCashFlows(cashFlows.filter((_, i) => i !== index));
  };

  // Função para exportar CSV
  const handleExportCSV = () => {
    const csvContent = exportAmortizationToCSV();
    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `amortizacao_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
      link.click();
    }
  };

  // Função para exportar relatório
  const handleExportReport = () => {
    const report = exportCalculationReport();
    if (report) {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_financeiro_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
      link.click();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Calculadora Financeira
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearResults}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Limpar</span>
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CalculatorTab)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Cálculo de Juros */}
        {activeTab === 'interest' && (
          <div className="space-y-6">
            <form onSubmit={handleInterestCalculation} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Principal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={interestForm.principal}
                  onChange={(e) => setInterestForm({ ...interestForm, principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Juros (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={interestForm.rate}
                  onChange={(e) => setInterestForm({ ...interestForm, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período
                </label>
                <input
                  type="number"
                  value={interestForm.period}
                  onChange={(e) => setInterestForm({ ...interestForm, period: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Período
                </label>
                <select
                  value={interestForm.periodType}
                  onChange={(e) => setInterestForm({ ...interestForm, periodType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DAILY">Diário</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Juros
                </label>
                <select
                  value={interestForm.compoundType}
                  onChange={(e) => setInterestForm({ ...interestForm, compoundType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SIMPLE">Simples</option>
                  <option value="COMPOUND">Compostos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carência (dias)
                </label>
                <input
                  type="number"
                  value={interestForm.gracePeriod || 0}
                  onChange={(e) => setInterestForm({ ...interestForm, gracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isCalculatingInterest}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCalculatingInterest ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  <span>{isCalculatingInterest ? 'Calculando...' : 'Calcular Juros'}</span>
                </button>
              </div>
            </form>

            {/* Resultado dos Juros */}
            {interestResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-medium text-green-800">Resultado do Cálculo</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-green-600">Principal</p>
                    <p className="text-lg font-semibold text-green-800">
                      R$ {interestResult.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Juros</p>
                    <p className="text-lg font-semibold text-green-800">
                      R$ {interestResult.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Total</p>
                    <p className="text-lg font-semibold text-green-800">
                      R$ {interestResult.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Taxa Efetiva</p>
                    <p className="text-lg font-semibold text-green-800">
                      {interestResult.effectiveRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabela de Amortização */}
        {activeTab === 'amortization' && (
          <div className="space-y-6">
            <form onSubmit={handleAmortizationGeneration} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Principal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amortizationForm.principal}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, principal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa Anual (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amortizationForm.annualRate}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, annualRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  value={amortizationForm.periods}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, periods: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sistema de Amortização
                </label>
                <select
                  value={amortizationForm.paymentType}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, paymentType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRICE">Tabela Price</option>
                  <option value="SAC">SAC</option>
                  <option value="AMERICAN">Americano</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carência (meses)
                </label>
                <input
                  type="number"
                  value={amortizationForm.gracePeriod || 0}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, gracePeriod: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Primeiro Pagamento
                </label>
                <input
                  type="date"
                  value={format(amortizationForm.firstPaymentDate || new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setAmortizationForm({ ...amortizationForm, firstPaymentDate: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isGeneratingAmortization}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeneratingAmortization ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  <span>{isGeneratingAmortization ? 'Gerando...' : 'Gerar Tabela'}</span>
                </button>
              </div>
            </form>

            {/* Resultado da Amortização */}
            {amortizationTable && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Tabela de Amortização</h3>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar CSV</span>
                  </button>
                </div>

                {/* Resumo */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-blue-800 mb-3">Resumo</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Total de Pagamentos</p>
                      <p className="text-lg font-semibold text-blue-800">
                        R$ {amortizationTable.summary.totalPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Total de Juros</p>
                      <p className="text-lg font-semibold text-blue-800">
                        R$ {amortizationTable.summary.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Principal</p>
                      <p className="text-lg font-semibold text-blue-800">
                        R$ {amortizationTable.summary.totalPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Taxa Efetiva</p>
                      <p className="text-lg font-semibold text-blue-800">
                        {amortizationTable.summary.effectiveRate.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parcela
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pagamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Principal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Juros
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {amortizationTable.installments.slice(0, 10).map((installment) => (
                        <tr key={installment.installment}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {installment.installment}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(installment.date, 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {installment.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {installment.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {installment.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {installment.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {amortizationTable.installments.length > 10 && (
                    <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                      Mostrando 10 de {amortizationTable.installments.length} parcelas. Exporte para ver todas.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Outros tabs seriam implementados de forma similar... */}
        {activeTab !== 'interest' && activeTab !== 'amortization' && (
          <div className="text-center py-12">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Funcionalidade em Desenvolvimento
            </h3>
            <p className="text-gray-500">
              Esta funcionalidade será implementada em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialCalculator;
