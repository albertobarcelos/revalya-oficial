import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface NeonLineChartProps {
  data: Array<{
    [key: string]: any;
  }>;
  dataKey: string;
  xAxisDataKey?: string;
  color?: string;
  secondaryColor?: string;
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  strokeWidth?: number;
}

export function NeonLineChart({
  data,
  dataKey,
  xAxisDataKey = 'name',
  color = '#8B5CF6',
  secondaryColor = '#EC4899',
  height = 240,
  showAxis = false,
  showTooltip = true,
  showGrid = false,
  strokeWidth = 2
}: NeonLineChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: showAxis ? 20 : 0, bottom: showAxis ? 20 : 0 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
            <filter id="lineGlow" height="300%" width="300%" x="-100%" y="-100%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
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
          
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="url(#lineGradient)"
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={{ 
              r: 8, 
              strokeWidth: 0,
              fill: color,
              filter: "url(#lineGlow)"
            }}
            filter="url(#lineGlow)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 
