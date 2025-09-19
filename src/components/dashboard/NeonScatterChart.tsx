import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface NeonScatterChartProps {
  data: Array<{
    x: number;
    y: number;
    z?: number;
    [key: string]: any;
  }>;
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  color?: string;
  secondaryColor?: string;
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  name?: string;
}

export function NeonScatterChart({
  data,
  xAxisDataKey = 'x',
  yAxisDataKey = 'y',
  color = '#8B5CF6',
  secondaryColor = '#EC4899',
  height = 300,
  showAxis = true,
  showTooltip = true,
  showGrid = false,
  name = 'Pontos'
}: NeonScatterChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 10, right: 10, left: showAxis ? 30 : 0, bottom: showAxis ? 30 : 0 }}
        >
          <defs>
            <radialGradient id="scatterPointGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.8} />
            </radialGradient>
            <filter id="scatterGlow" height="300%" width="300%" x="-100%" y="-100%">
              <feGaussianBlur stdDeviation="10" result="coloredBlur" />
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
              vertical={true}
              horizontal={true}
            />
          )}
          
          {showAxis && (
            <>
              <XAxis 
                dataKey={xAxisDataKey}
                type="number"
                name="X"
                axisLine={{ stroke: "#1E293B" }}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                dataKey={yAxisDataKey}
                type="number"
                name="Y"
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
              cursor={{ strokeDasharray: '3 3' }}
            />
          )}
          
          <Scatter 
            name={name}
            data={data} 
            fill="url(#scatterPointGradient)"
            filter="url(#scatterGlow)"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fillOpacity={0.8}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
} 
