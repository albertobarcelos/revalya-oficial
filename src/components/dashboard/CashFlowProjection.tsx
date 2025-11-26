import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CashFlowProjection as CashFlowData } from '@/types/models/dashboard';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CashFlowProjectionProps {
  data: CashFlowData[];
  days?: number;
}

export function CashFlowProjection({ data, days = 30 }: CashFlowProjectionProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(days);
  
  // Garantir que temos dados para mostrar - criar dados simulados se necessário
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      // Criar dados simulados para os próximos 90 dias
      const simulatedData: CashFlowData[] = [];
      const today = new Date();
      
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        simulatedData.push({
          date: date.toISOString().split('T')[0],
          inflow: 0,
          outflow: 0,
          balance: 0
        });
      }
      
      return simulatedData;
    }
    
    return data;
  }, [data]);
  
  // Filtrar dados pelo período selecionado
  const filteredData = useMemo(() => {
    return processedData.slice(0, selectedPeriod);
  }, [processedData, selectedPeriod]);
  
  // Calcular totais para o período selecionado
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      acc.inflow += item.inflow;
      acc.outflow += item.outflow;
      return acc;
    }, { inflow: 0, outflow: 0 });
  }, [filteredData]);
  
  // Calcular o valor final do saldo no final do período
  const finalBalance = filteredData.length > 0 
    ? filteredData[filteredData.length - 1].balance
    : 0;
  
  // Calcular o valor máximo para definir o domínio do eixo Y
  const maxValue = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return 1000; // Valor padrão se não houver dados
    }
    
    const values = filteredData.map(item => Math.max(item.inflow || 0, item.outflow || 0, item.balance || 0))
      .filter(value => isFinite(value));
    
    return values.length > 0 ? Math.max(...values) : 1000;
  }, [filteredData]);
  
  const minValue = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return 0; // Valor padrão se não houver dados
    }
    
    const values = filteredData.map(item => Math.min(0, item.balance || 0))
      .filter(value => isFinite(value));
    
    return values.length > 0 ? Math.min(...values) : 0;
  }, [filteredData]);
  
  const yDomain = [minValue * 1.1, maxValue * 1.1]; // Adiciona 10% de margem
  
  // Dados para o gráfico com saída negativa para visualização abaixo do zero
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item,
      outflowPlot: -Math.abs(item.outflow || 0)
    }));
  }, [filteredData]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3 dark:bg-gray-800">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-body text-emerald-600 font-medium mt-1 flex justify-between">
            <span>Entrada:</span> <span className="ml-2">{formatCurrency(payload[0]?.payload?.inflow || 0)}</span>
          </p>
          <p className="text-body text-red-500 font-medium flex justify-between">
            <span>Saída:</span> <span className="ml-2">{formatCurrency(payload[0]?.payload?.outflow || 0)}</span>
          </p>
          <p className="text-body font-medium mt-1 border-t pt-1 flex justify-between text-blue-500">
            <span>Saldo:</span> <span className="ml-2">{formatCurrency(payload[0]?.payload?.balance || 0)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-md border border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Projeção de Fluxo de Caixa ({selectedPeriod} dias)
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  {selectedPeriod} dias
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedPeriod(7)}>
                  Próximos 7 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod(15)}>
                  Próximos 15 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod(30)}>
                  Próximos 30 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod(60)}>
                  Próximos 60 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPeriod(90)}>
                  Próximos 90 dias
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Resumo dos valores */}
        <div className="grid grid-cols-3 gap-4 mt-2 text-body">
          <div className="flex flex-col">
            <span className="text-gray-500">Total a Receber</span>
            <span className="font-medium text-emerald-600">{formatCurrency(totals.inflow)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Total de Saídas</span>
            <span className="font-medium text-red-500">{formatCurrency(totals.outflow)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Saldo Final</span>
            <span className={`font-medium ${finalBalance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(finalBalance)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 15,
                right: 15,
                left: 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value, true)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={65}
                domain={yDomain}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={0} 
                stroke="#666" 
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.8}
              />
              
              <Area
                type="monotone"
                dataKey="inflow"
                name="Entrada"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInflow)"
                activeDot={{ r: 6, strokeWidth: 1 }}
              />
              
              <Area
                type="monotone"
                dataKey="outflowPlot"
                name="Saída"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOutflow)"
                activeDot={{ r: 6, strokeWidth: 1 }}
              />
              
              <Line
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 1 }}
                activeDot={{ r: 6, strokeWidth: 1 }}
              />
              
              <Legend 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
