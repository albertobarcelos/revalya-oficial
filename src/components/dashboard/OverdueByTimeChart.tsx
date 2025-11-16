import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface OverdueByTimeChartProps {
  data: {
    period: string;
    amount: number;
    count: number;
  }[];
}

export function OverdueByTimeChart({ data }: OverdueByTimeChartProps) {
  // Verificar se temos dados para mostrar
  const hasData = useMemo(() => {
    return data && data.some(item => item.amount > 0 || item.count > 0);
  }, [data]);

  // Ordenar os dados por período
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { period: "1-15", amount: 0, count: 0 },
        { period: "16-30", amount: 0, count: 0 },
        { period: "31-60", amount: 0, count: 0 },
        { period: "60+", amount: 0, count: 0 }
      ];
    }
    
    // Criar uma função para ordenar os períodos de forma lógica
    const periodOrder = { "1-15": 1, "16-30": 2, "31-60": 3, "60+": 4 };
    
    return [...data].sort((a, b) => {
      return (periodOrder[a.period as keyof typeof periodOrder] || 999) - 
             (periodOrder[b.period as keyof typeof periodOrder] || 999);
    });
  }, [data]);
  
  // Converter os períodos para nomes mais legíveis
  const formatPeriod = (period: string) => {
    switch (period) {
      case '1-15': return 'Até 15 dias';
      case '16-30': return '16-30 dias';
      case '31-60': return '31-60 dias';
      case '60+': return 'Acima de 60 dias';
      default: return period;
    }
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md rounded-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <p className="font-medium">{formatPeriod(payload[0].payload.period)}</p>
          <p className="text-body text-gray-500 dark:text-gray-300">Valor: {formatCurrency(payload[0].value)}</p>
          <p className="text-body text-gray-500 dark:text-gray-300">Cobranças: {payload[0].payload.count}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Inadimplência por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] flex items-center justify-center">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatPeriod}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value, true)}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="amount" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]}
                  barSize={35}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6">
              <p className="text-body text-muted-foreground">Não há dados de inadimplência para exibir</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
