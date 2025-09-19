import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface NeonAreaChartProps {
  data: Array<{
    [key: string]: any;
  }>;
  dataKey: string;
  xAxisDataKey?: string;
  gradientColors?: {
    start: string;
    end: string;
  };
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
}

export function NeonAreaChart({
  data,
  dataKey,
  xAxisDataKey = 'name',
  gradientColors = {
    start: '#8B5CF6',
    end: '#EC4899'
  },
  height = 240,
  showAxis = false,
  showTooltip = true,
  showGrid = false
}: NeonAreaChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: showAxis ? 20 : 0, bottom: showAxis ? 20 : 0 }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientColors.start} stopOpacity={0.8} />
              <stop offset="100%" stopColor={gradientColors.end} stopOpacity={0.2} />
            </linearGradient>
            <filter id="glow" height="300%" width="300%" x="-100%" y="-100%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
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
          
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={gradientColors.start}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#areaGradient)"
            filter="url(#glow)"
            activeDot={{ 
              r: 6, 
              strokeWidth: 0,
              fill: gradientColors.start,
              filter: "url(#glow)"
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 
