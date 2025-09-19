import React from 'react';
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface NeonFunnelChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
    [key: string]: any;
  }>;
  dataKey?: string;
  nameKey?: string;
  height?: number;
  colors?: string[];
  showTooltip?: boolean;
  showLabels?: boolean;
  gradientEnabled?: boolean;
  isAnimationActive?: boolean;
}

export function NeonFunnelChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
  showTooltip = true,
  showLabels = true,
  gradientEnabled = true,
  isAnimationActive = true
}: NeonFunnelChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <defs>
            {data.map((entry, index) => {
              const color = entry.color || colors[index % colors.length];
              return (
                <React.Fragment key={`gradient-${index}`}>
                  <linearGradient id={`funnelGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.3} />
                  </linearGradient>
                  <filter id={`funnelGlow-${index}`} height="200%" width="200%" x="-50%" y="-50%">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </React.Fragment>
              );
            })}
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
          
          <Funnel
            dataKey={dataKey}
            nameKey={nameKey}
            data={data}
            isAnimationActive={isAnimationActive}
            animationDuration={800}
          >
            {showLabels && (
              <LabelList 
                position="right"
                fill="#E2E8F0"
                stroke="none"
                dataKey={nameKey}
                fontSize={12}
              />
            )}
            
            {data.map((entry, index) => {
              const color = entry.color || colors[index % colors.length];
              return (
                <Cell 
                  key={`cell-${index}`}
                  fill={gradientEnabled ? `url(#funnelGradient-${index})` : color}
                  filter={`url(#funnelGlow-${index})`}
                />
              );
            })}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
} 
