import React from 'react';
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

interface NeonBarChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  dataKey?: string;
  xAxisDataKey?: string;
  color?: string;
  highlightIndex?: number;
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
}

export function NeonBarChart({
  data,
  dataKey = 'value',
  xAxisDataKey = 'name',
  color = '#8B5CF6',
  highlightIndex,
  height = 240,
  showAxis = false,
  showTooltip = true,
  showGrid = false
}: NeonBarChartProps) {
  // Função para aplicar o efeito de brilho
  const getPath = (x: number, y: number, width: number, height: number) => {
    return `M${x},${y + height}
            C${x + width / 3},${y + height} ${x + width / 2},${y + height / 3} ${x + width / 2}, ${y}
            C${x + width / 2},${y + height / 3} ${x + (2 * width) / 3},${y + height} ${x + width}, ${y + height}
            Z`;
  };

  // Componente personalizado para a barra com o topo arredondado
  const NeonBar = (props: any) => {
    const { fill, x, y, width, height } = props;
    
    return (
      <g filter="url(#barGlow)">
        <path
          d={getPath(x, y, width, height)}
          stroke="none"
          fill={fill}
          fillOpacity={0.9}
        />
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: showAxis ? 20 : 0, bottom: showAxis ? 20 : 0 }}
        >
          <defs>
            <linearGradient id="barColorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.3} />
            </linearGradient>
            <filter id="barGlow" height="200%" width="200%" x="-50%" y="-50%">
              <feGaussianBlur stdDeviation="5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#1E293B"
              vertical={false}
            />
          )}
          
          {showAxis && (
            <>
              <XAxis 
                dataKey={xAxisDataKey}
                axisLine={{ stroke: "#1E293B" }}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                axisLine={{ stroke: "#1E293B" }}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickLine={false}
                width={30}
              />
            </>
          )}
          
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
          
          <Bar 
            dataKey={dataKey} 
            fill="url(#barColorGradient)" 
            shape={<NeonBar />}
            radius={[10, 10, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={highlightIndex === index ? `url(#barColorGradient)` : `url(#barColorGradient)`}
                fillOpacity={highlightIndex === index ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 
