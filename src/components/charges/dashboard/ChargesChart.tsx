import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupedCharges } from './ChargesDashboard';

interface ChargesChartProps {
  groupedCharges: GroupedCharges;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const getBarColor = (color: string) => {
  // Cores do tema usando variáveis CSS
  const colorMap: Record<string, string> = {
    'success': 'hsl(var(--success))', // Verde
    'warning': 'hsl(var(--warning))', // Amarelo
    'warning-600': 'hsl(var(--warning))', // Laranja amarelado
    'danger': 'hsl(var(--danger))',   // Vermelho
    'destructive': 'hsl(var(--destructive))', // Vermelho forte
    'primary': 'hsl(var(--primary))', // Azul primário
    'accent': 'hsl(var(--accent))'    // Roxo
  };

  return colorMap[color] || `hsl(var(--${color}))`;
};

export function ChargesChart({ groupedCharges }: ChargesChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(groupedCharges).map(([key, group]) => {
      const totalValue = group.charges.reduce((sum, charge) => sum + (Number(charge.valor) || 0), 0);
      return {
        name: group.label,
        value: totalValue,
        count: group.charges.length,
        color: group.color.replace('bg-', '')
      };
    });
  }, [groupedCharges]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Valor total: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Quantidade: {data.count} cobranças
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="py-3 sm:py-6">
        <CardTitle className="text-base sm:text-lg">Distribuição de Cobranças</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="h-48 sm:h-64 md:h-72 lg:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              barSize={window.innerWidth < 640 ? 15 : 20}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="name"
                tick={{ fill: 'currentColor', fontSize: window.innerWidth < 640 ? 10 : 12 }}
                tickLine={{ stroke: 'currentColor' }}
                axisLine={{ stroke: 'currentColor' }}
                height={50}
                interval={0}
                angle={window.innerWidth < 768 ? -45 : 0}
                textAnchor={window.innerWidth < 768 ? "end" : "middle"}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (window.innerWidth < 640) {
                    // Formato abreviado para telas pequenas (ex: 10k em vez de R$ 10.000,00)
                    if (value >= 1000) {
                      return `${Math.round(value / 1000)}k`;
                    }
                    return value.toString();
                  }
                  return formatCurrency(value);
                }}
                tick={{ fill: 'currentColor', fontSize: window.innerWidth < 640 ? 10 : 12 }}
                tickLine={{ stroke: 'currentColor' }}
                axisLine={{ stroke: 'currentColor' }}
                width={window.innerWidth < 640 ? 40 : 60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={index}
                    fill={getBarColor(entry.color)}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
