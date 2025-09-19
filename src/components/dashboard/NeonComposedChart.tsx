import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DataSeriesConfig {
  type: 'line' | 'area' | 'bar';
  dataKey: string;
  name?: string;
  color: string;
  strokeWidth?: number;
  fillOpacity?: number;
  stackId?: string;
}

interface NeonComposedChartProps {
  data: Array<{
    [key: string]: any;
  }>;
  xAxisDataKey?: string;
  series: DataSeriesConfig[];
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
}

export function NeonComposedChart({
  data,
  xAxisDataKey = 'name',
  series,
  height = 300,
  showAxis = true,
  showTooltip = true,
  showLegend = true,
  showGrid = false
}: NeonComposedChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: showAxis ? 30 : 0, bottom: showAxis ? 30 : 0 }}
        >
          <defs>
            {series.map((serie, index) => (
              <React.Fragment key={`gradient-${index}`}>
                <linearGradient id={`color-${serie.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={serie.color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={serie.color} stopOpacity={0.2} />
                </linearGradient>
                <filter id={`glow-${serie.dataKey}`} height="300%" width="300%" x="-100%" y="-100%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </React.Fragment>
            ))}
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
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ color: '#94A3B8', fontSize: 12 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          
          {series.map((serie, index) => {
            if (serie.type === 'area') {
              return (
                <Area
                  key={`serie-${index}`}
                  type="monotone"
                  dataKey={serie.dataKey}
                  name={serie.name || serie.dataKey}
                  stroke={serie.color}
                  fill={`url(#color-${serie.dataKey})`}
                  strokeWidth={serie.strokeWidth || 2}
                  fillOpacity={serie.fillOpacity || 0.6}
                  stackId={serie.stackId}
                  filter={`url(#glow-${serie.dataKey})`}
                />
              );
            } else if (serie.type === 'line') {
              return (
                <Line
                  key={`serie-${index}`}
                  type="monotone"
                  dataKey={serie.dataKey}
                  name={serie.name || serie.dataKey}
                  stroke={serie.color}
                  strokeWidth={serie.strokeWidth || 2}
                  dot={false}
                  activeDot={{ r: 8, strokeWidth: 0, fill: serie.color }}
                  filter={`url(#glow-${serie.dataKey})`}
                />
              );
            } else {
              return (
                <Bar
                  key={`serie-${index}`}
                  dataKey={serie.dataKey}
                  name={serie.name || serie.dataKey}
                  fill={`url(#color-${serie.dataKey})`}
                  fillOpacity={serie.fillOpacity || 0.8}
                  stackId={serie.stackId}
                  filter={`url(#glow-${serie.dataKey})`}
                  radius={[4, 4, 0, 0]}
                />
              );
            }
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
} 
