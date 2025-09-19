import React, { useState } from 'react';
import { 
  Wallet, 
  Clock, 
  Tag, 
  Users,
  DollarSign,
  BarChart3,
  LineChart,
  PieChart,
  Activity
} from 'lucide-react';
import { NeonMetricCard } from './NeonMetricCard';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface NeonMetricsCardsProps {
  metrics: {
    mrrTotal: number;
    mrrGrowth: number;
    avgTicket: number;
    avgDaysToReceive: number;
    newCustomers: number;
    totalReceivable: number;
    netMonthlyValue: number;
    revenueByMonth?: Array<{month: string; value: number}>;
  };
}

export function NeonMetricsCards({ metrics }: NeonMetricsCardsProps) {
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [activeMetric, setActiveMetric] = useState<{
    title: string;
    description: string;
    value: number;
    trendData?: number[];
    details?: any;
  } | null>(null);

  // Extrair dados de tendência dos últimos meses
  const getTrendData = () => {
    if (metrics.revenueByMonth && metrics.revenueByMonth.length > 0) {
      return metrics.revenueByMonth.map(item => item.value);
    }
    return [];
  };

  const trendData = getTrendData();

  const handleCardClick = (metricData: any) => {
    setActiveMetric(metricData);
    setShowDetailDialog(true);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-6">
        <NeonMetricCard
          title="MRR"
          value={metrics.mrrTotal}
          formattedValue={formatCurrency(metrics.mrrTotal)}
          description="Receita mensal recorrente"
          icon={<Activity className="h-5 w-5" />}
          trend={metrics.mrrGrowth}
          trendData={trendData}
          type="mrr"
          onClick={() => handleCardClick({
            title: "Receita Mensal Recorrente (MRR)",
            description: "O valor total de receita recorrente mensalmente.",
            value: metrics.mrrTotal,
            trendData: trendData,
            details: {
              growth: metrics.mrrGrowth,
              trend: "Últimos 6 meses"
            }
          })}
        />

        <NeonMetricCard
          title="Valor Líquido"
          value={metrics.netMonthlyValue || 0}
          formattedValue={formatCurrency(metrics.netMonthlyValue || 0)}
          description="MRR - MRC (Líquido)"
          icon={<DollarSign className="h-5 w-5" />}
          type="netValue"
          onClick={() => handleCardClick({
            title: "Valor Mensal Líquido",
            description: "Valor líquido após custos recorrentes.",
            value: metrics.netMonthlyValue || 0,
            details: {
              mrr: metrics.mrrTotal,
              mrc: metrics.mrrTotal - (metrics.netMonthlyValue || 0)
            }
          })}
          chartType="area"
        />

        <NeonMetricCard
          title="Ticket Médio"
          value={metrics.avgTicket}
          formattedValue={formatCurrency(metrics.avgTicket)}
          description="Valor médio por cobrança"
          icon={<Tag className="h-5 w-5" />}
          type="ticket"
          onClick={() => handleCardClick({
            title: "Ticket Médio",
            description: "Valor médio das cobranças no período.",
            value: metrics.avgTicket,
            details: {
              period: "Últimos 30 dias"
            }
          })}
          chartType="bar"
        />

        <NeonMetricCard
          title="Tempo de Recebimento"
          value={metrics.avgDaysToReceive}
          formattedValue={`${metrics.avgDaysToReceive.toFixed(1)} dias`}
          description="Prazo médio para receber"
          icon={<Clock className="h-5 w-5" />}
          type="receive"
          onClick={() => handleCardClick({
            title: "Prazo Médio de Recebimento",
            description: "Tempo entre emissão e pagamento.",
            value: metrics.avgDaysToReceive,
            details: {
              period: "Últimos 60 dias"
            }
          })}
        />
        
        <NeonMetricCard
          title="Novos Clientes"
          value={metrics.newCustomers}
          formattedValue={metrics.newCustomers.toString()}
          description="Novos clientes no período"
          icon={<Users className="h-5 w-5" />}
          type="customers"
          onClick={() => handleCardClick({
            title: "Novos Clientes",
            description: "Clientes cadastrados no período.",
            value: metrics.newCustomers,
            details: {
              period: "Este mês"
            }
          })}
          chartType="line"
        />
      </div>

      {/* Modal de detalhes */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md bg-[#0F172A] border-[#1E293B] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{activeMetric?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {activeMetric?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400">Valor atual</span>
              <span className="text-xl font-bold text-white">
                {typeof activeMetric?.value === 'number' && 
                 !isNaN(activeMetric?.value) ? (
                  activeMetric?.title.includes("Tempo") || activeMetric?.title.includes("Prazo") ? 
                    `${activeMetric.value.toFixed(1)} dias` : 
                    activeMetric?.title.includes("Clientes") ?
                      activeMetric.value.toString() :
                      formatCurrency(activeMetric.value)
                ) : 'N/A'}
              </span>
            </div>
            
            {activeMetric?.trendData && activeMetric.trendData.length > 0 && (
              <div className="mt-4 pb-4 border-b border-[#1E293B]">
                <h4 className="text-sm font-medium mb-2 text-gray-300">Tendência dos últimos meses</h4>
                <div className="h-40 w-full bg-[#111525] rounded-md p-3">
                  {/* Aqui você integraria um gráfico maior da biblioteca Recharts ou similar */}
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <span>Gráfico detalhado seria renderizado aqui</span>
                  </div>
                </div>
              </div>
            )}
            
            {activeMetric?.details && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-gray-300">Detalhes adicionais</h4>
                <div className="space-y-2">
                  {Object.entries(activeMetric.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-[#111525] p-2 rounded">
                      <span className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium text-white">
                        {typeof value === 'number' && !key.includes('period') && !key.includes('trend') ? 
                          formatCurrency(value as number) : 
                          value as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
