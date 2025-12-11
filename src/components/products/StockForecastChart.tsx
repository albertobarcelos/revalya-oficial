/**
 * Componente de gráfico de previsão de estoque
 * 
 * AIDEV-NOTE: Gráfico de linha mostrando previsão e estoque disponível
 * usando recharts conforme especificado no plano
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ForecastDataPoint {
  date: string;
  previsao: number;
  disponivel: number;
}

interface StockForecastChartProps {
  data?: ForecastDataPoint[];
  height?: number | string;
}

export function StockForecastChart({
  data = [],
  height = '100%'
}: StockForecastChartProps) {
  // Se não houver dados, criar dados vazios para o período
  const chartData = data.length > 0 ? data : [
    { date: '01/11', previsao: 0, disponivel: 0 },
    { date: '15/11', previsao: 0, disponivel: 0 },
    { date: '30/11', previsao: 0, disponivel: 0 }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-body" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} UN
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={typeof height === 'number' ? height : '100%'}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="previsao"
            name="Previsão"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="disponivel"
            name="Disponível"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

