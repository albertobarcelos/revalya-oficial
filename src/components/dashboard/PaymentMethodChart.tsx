import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface PaymentMethodChartProps {
  data: {
    method: string;
    count: number;
    amount: number;
  }[];
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  // Verificar se temos dados para mostrar
  const hasData = useMemo(() => {
    return data && data.some(item => item.amount > 0 || item.count > 0);
  }, [data]);

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { name: 'PIX', value: 0, color: '#10b981' },
        { name: 'Boleto', value: 0, color: '#3b82f6' },
        { name: 'Cartão', value: 0, color: '#8b5cf6' },
        { name: 'Outro', value: 0, color: '#f97316' }
      ];
    }
    
    return data.map(item => {
      let name = 'Outro';
      let color = '#f97316';
      
      if (item.method === 'pix') {
        name = 'PIX';
        color = '#10b981';
      } else if (item.method === 'boleto') {
        name = 'Boleto';
        color = '#3b82f6';
      } else if (item.method === 'cartao') {
        name = 'Cartão';
        color = '#8b5cf6';
      }
      
      return {
        name,
        value: item.amount,
        color,
        count: item.count
      };
    });
  }, [data]);
  
  const total = useMemo(() => {
    return formattedData.reduce((acc, item) => acc + item.value, 0);
  }, [formattedData]);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Valor: {formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Cobranças: {data.count}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            {((data.value / total) * 100).toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Métodos de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] flex items-center justify-center">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={1}
                >
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6">
              <p className="text-sm text-muted-foreground">Não há dados de métodos de pagamento para exibir</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
