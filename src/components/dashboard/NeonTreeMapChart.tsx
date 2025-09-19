import React from 'react';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface NeonTreeMapChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
    [key: string]: any;
  }>;
  height?: number;
  colors?: string[];
  showTooltip?: boolean;
  animationDuration?: number;
}

// Função customizada para determinar a cor com base na profundidade e no índice
const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

export function NeonTreeMapChart({
  data,
  height = 300,
  colors = COLORS,
  showTooltip = true,
  animationDuration = 1000
}: NeonTreeMapChartProps) {
  // Renderizador customizado para os itens do TreeMap
  const CustomTreemapContent = (props: any) => {
    const { depth, x, y, width, height, index, name, value, colors, root } = props;

    const itemColor = props.color || colors[index % colors.length];
    
    // Cria um ID único para este gradiente e filtro
    const nameStr = name ? name.toString() : `item-${index}`;
    const gradientId = `treeMapGradient-${nameStr.replace(/\s+/g, '')}-${index}`;
    const filterId = `treeMapGlow-${nameStr.replace(/\s+/g, '')}-${index}`;
    
    return (
      <g>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={itemColor} stopOpacity={0.8} />
            <stop offset="100%" stopColor={itemColor} stopOpacity={0.3} />
          </linearGradient>
          <filter id={filterId} height="200%" width="200%" x="-50%" y="-50%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`url(#${gradientId})`}
          filter={`url(#${filterId})`}
          stroke="#0F172A"
          strokeWidth={1}
          style={{
            cursor: 'pointer',
            transition: 'fill-opacity 300ms',
          }}
          rx={4}
          ry={4}
        />
        
        {/* Texto para o rótulo */}
        {width > 50 && height > 30 ? (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize={12}
            fontWeight="bold"
            filter={`url(#${filterId})`}
          >
            {name}
          </text>
        ) : null}
        
        {/* Texto para o valor */}
        {width > 50 && height > 50 ? (
          <text
            x={x + width / 2}
            y={y + height / 2 + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#E2E8F0"
            fontSize={10}
          >
            {value}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={data}
          dataKey="value"
          aspectRatio={4/3}
          stroke="#0F172A"
          fill="#8B5CF6"
          animationDuration={animationDuration}
          content={<CustomTreemapContent colors={colors} />}
        >
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
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
} 
