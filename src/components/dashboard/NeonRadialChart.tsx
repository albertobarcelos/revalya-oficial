import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface NeonRadialChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  colors?: string[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showTooltip?: boolean;
}

export function NeonRadialChart({
  data,
  colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'],
  height = 240,
  innerRadius = 60,
  outerRadius = 80,
  showTooltip = true
}: NeonRadialChartProps) {
  // Gerando cores alternativas caso os dados tenham mais itens que as cores fornecidas
  const getColor = (index: number) => {
    const itemColor = data[index].color;
    if (itemColor) return itemColor;
    return colors[index % colors.length];
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <defs>
            {colors.map((color, index) => (
              <filter
                key={`glow-${index}`}
                id={`glow-${index}`}
                height="200%"
                width="200%"
                x="-50%"
                y="-50%"
              >
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>
          
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                borderColor: '#1E293B',
                color: '#E2E8F0',
                borderRadius: '4px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: '#E2E8F0' }}
              labelStyle={{ color: '#94A3B8', fontWeight: 'bold', marginBottom: '4px' }}
            />
          )}
          
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColor(index)}
                filter={`url(#glow-${index % colors.length})`}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
} 
