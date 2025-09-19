import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface NeonRadarChartProps {
  data: Array<{
    subject: string;
    value: number;
    fullMark?: number;
    [key: string]: any;
  }>;
  dataKey?: string;
  color?: string;
  secondaryColor?: string;
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  fillOpacity?: number;
  name?: string;
  strokeWidth?: number;
}

export function NeonRadarChart({
  data,
  dataKey = 'value',
  color = '#8B5CF6',
  secondaryColor = '#EC4899',
  height = 300,
  showAxis = true,
  showTooltip = true,
  fillOpacity = 0.4,
  name = 'Radar',
  strokeWidth = 2
}: NeonRadarChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="65%" 
          data={data}
        >
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.8} />
            </linearGradient>
            <filter id="radarGlow" height="300%" width="300%" x="-100%" y="-100%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <PolarGrid 
            stroke="#1E293B" 
            strokeDasharray="3 3"
          />
          
          {showAxis && (
            <>
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: "#94A3B8", fontSize: 10 }} 
              />
              <PolarRadiusAxis 
                tick={{ fill: "#94A3B8", fontSize: 10 }} 
                stroke="#1E293B"
                axisLine={false}
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
          
          <Radar 
            name={name}
            dataKey={dataKey}
            stroke="url(#radarGradient)"
            strokeWidth={strokeWidth}
            fill="url(#radarGradient)"
            fillOpacity={fillOpacity}
            filter="url(#radarGlow)"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
} 
