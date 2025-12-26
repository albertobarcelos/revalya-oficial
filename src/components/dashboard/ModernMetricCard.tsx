import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { SparklineChart } from './SparklineChart';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ModernMetricCardProps {
  title: string;
  value: string | number;
  formattedValue: string;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  trendData?: number[];
  type: 'mrr' | 'netValue' | 'ticket' | 'receive' | 'customers';
  onClick?: () => void;
}

export function ModernMetricCard({
  title,
  value,
  formattedValue,
  description,
  icon,
  trend,
  trendData = [],
  type,
  onClick
}: ModernMetricCardProps) {
  const { theme } = useTheme();
  // AIDEV-NOTE: Converte tema do ThemeProvider para boolean isDark
  // Se for 'system', detecta do sistema operacional
  const isDark = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  }, [theme]);
  const [isHovered, setIsHovered] = useState(false);

  // Gerar dados para sparkline se não fornecidos
  const sparklineData = trendData.length > 0 
    ? trendData 
    : [50, 55, 48, 60, 58, 63, 65, 62, 67, 70].map(v => 
        trend && trend < 0 ? 100 - v : v
      );

  // Cores estáticas para cada tipo de cartão com cores de texto mais vibrantes
  const typeColors = {
    mrr: {
      bg: isDark ? '#0A1D3E' : '#EFF6FF',
      bgHover: isDark ? '#0E2A59' : '#DBEAFE',
      border: isDark ? '#2D7FEA' : '#BFDBFE',
      glow: isDark ? '45, 127, 234' : '59, 130, 246',
      icon: isDark ? '#63B3FF' : '#2563EB',
      iconHover: isDark ? '#3B82F6' : '#1D4ED8',
      text: isDark ? '#93C5FD' : '#2563EB',
      valueText: isDark ? '#63B3FF' : '#2563EB',
      valueGlow: isDark ? '45, 127, 234' : '59, 130, 246',
      chart: isDark ? '#63B3FF' : '#2563EB'
    },
    netValue: {
      bg: isDark ? '#271800' : '#FFFBEB',
      bgHover: isDark ? '#362100' : '#FEF3C7',
      border: isDark ? '#F59E0B' : '#FDE68A',
      glow: isDark ? '245, 158, 11' : '217, 119, 6',
      icon: isDark ? '#FBBF24' : '#D97706',
      iconHover: isDark ? '#F59E0B' : '#B45309',
      text: isDark ? '#FCD34D' : '#B45309',
      valueText: isDark ? '#FBBF24' : '#B45309',
      valueGlow: isDark ? '245, 158, 11' : '217, 119, 6',
      chart: isDark ? '#FBBF24' : '#D97706'
    },
    ticket: {
      bg: isDark ? '#1E0A3C' : '#FAF5FF',
      bgHover: isDark ? '#2E1065' : '#F3E8FF',
      border: isDark ? '#8B5CF6' : '#E9D5FF',
      glow: isDark ? '139, 92, 246' : '126, 34, 206',
      icon: isDark ? '#A78BFA' : '#7C3AED',
      iconHover: isDark ? '#8B5CF6' : '#6D28D9',
      text: isDark ? '#C4B5FD' : '#6D28D9',
      valueText: isDark ? '#A78BFA' : '#7C3AED',
      valueGlow: isDark ? '139, 92, 246' : '126, 34, 206',
      chart: isDark ? '#A78BFA' : '#7C3AED'
    },
    receive: {
      bg: isDark ? '#042F2E' : '#ECFDF5',
      bgHover: isDark ? '#064E3B' : '#D1FAE5',
      border: isDark ? '#10B981' : '#A7F3D0',
      glow: isDark ? '16, 185, 129' : '5, 150, 105',
      icon: isDark ? '#34D399' : '#059669',
      iconHover: isDark ? '#10B981' : '#047857',
      text: isDark ? '#6EE7B7' : '#047857',
      valueText: isDark ? '#34D399' : '#059669',
      valueGlow: isDark ? '16, 185, 129' : '5, 150, 105',
      chart: isDark ? '#34D399' : '#059669'
    },
    customers: {
      bg: isDark ? '#2A0B37' : '#FDF4FF',
      bgHover: isDark ? '#4A044E' : '#FAE8FF',
      border: isDark ? '#D946EF' : '#F5D0FE',
      glow: isDark ? '217, 70, 239' : '192, 38, 211',
      icon: isDark ? '#E879F9' : '#C026D3',
      iconHover: isDark ? '#D946EF' : '#A21CAF',
      text: isDark ? '#F0ABFC' : '#A21CAF',
      valueText: isDark ? '#E879F9' : '#C026D3',
      valueGlow: isDark ? '217, 70, 239' : '192, 38, 211',
      chart: isDark ? '#E879F9' : '#C026D3'
    }
  };

  const colors = typeColors[type];
  
  const trendColor = trend && trend >= 0 
    ? (isDark ? 'text-success' : 'text-success')
        : (isDark ? 'text-danger' : 'text-danger');

  // Determinar se a tendência é positiva ou negativa para estilização
  const isTrendPositive = trend === undefined || trend >= 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Card 
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-xl rounded-lg border-2"
            style={{
              backgroundColor: isHovered ? colors.bgHover : colors.bg,
              borderColor: colors.border,
              boxShadow: isDark ? `0 0 25px 0 rgba(${colors.glow}, ${isHovered ? 0.4 : 0.15})` : ''
            }}
          >
            {/* Efeito de brilho superior */}
            <div 
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                background: isDark 
                  ? `radial-gradient(circle at 30% 20%, rgba(${colors.glow}, 0.35), transparent 70%)`
                  : '',
                opacity: isHovered ? 0.7 : 0.3
              }}
            />
            
            {/* Borda brilhante superior */}
            <div 
              className="absolute top-0 left-5 right-5 h-px"
              style={{
                background: isDark 
                  ? `linear-gradient(90deg, transparent, rgba(${colors.glow}, 0.6), transparent)`
                  : ''
              }}
            />
            
            {/* Conteúdo do Card */}
            <div className="relative z-10 p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 
                  className="text-body font-bold transition-colors"
                  style={{ 
                    color: colors.text,
                    textShadow: isDark ? `0 0 8px rgba(${colors.glow}, 0.5)` : ''
                  }}
                >
                  {title}
                </h3>
                
                <div 
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shadow-lg"
                  style={{ 
                    backgroundColor: isHovered ? colors.iconHover : 'rgba(' + colors.glow + ', 0.2)',
                    color: isHovered ? '#fff' : colors.icon,
                    boxShadow: isDark && isHovered ? `0 0 15px 0 rgba(${colors.glow}, 0.6)` : ''
                  }}
                >
                  {icon}
                </div>
              </div>
              
              <div className="space-y-2">
                <p 
                  className={`text-heading-1 font-bold tracking-tight transition-all duration-300 ${isHovered ? 'scale-105 origin-left' : ''}`}
                  style={{ 
                    color: colors.valueText,
                    textShadow: isDark 
                      ? `0 0 8px rgba(${colors.valueGlow}, 0.7), 0 0 15px rgba(${colors.valueGlow}, 0.4)` 
                      : '',
                    letterSpacing: '0.01em'
                  }}
                >
                  {formattedValue}
                </p>
                
                {description && (
                  <p
                    className="text-xs font-medium opacity-90"
                    style={{ 
                      color: colors.text,
                      textShadow: isDark ? `0 0 5px rgba(${colors.glow}, 0.3)` : ''
                    }}
                  >
                    {description}
                  </p>
                )}
                
                {trend !== undefined && (
                  <div className="flex items-end space-x-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className={`text-xs font-bold ${trendColor}`}
                        style={{ 
                          textShadow: isDark ? '0 0 5px rgba(0, 0, 0, 0.5)' : '' 
                        }}
                      >
                        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                      </span>
                      
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className={`${trendColor} ${!isTrendPositive ? 'rotate-180' : ''} transition-transform duration-500`}
                        style={{ 
                          filter: isDark ? 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))' : '' 
                        }}
                      >
                        <path 
                          d="M13 7L18.5 12.5L13 18M5.5 12.5H18" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                      </svg>
                    </div>
                    
                    <div className="h-10 flex-grow overflow-hidden transition-opacity" style={{ opacity: isHovered ? 1 : 0.8 }}>
                      <SparklineChart 
                        data={sparklineData} 
                        color={colors.chart}
                        height={40}
                        width={70}
                        fillOpacity={0.4}
                        showDots={isHovered}
                        lineWidth={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-2 max-w-xs">
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend !== undefined && (
            <p className="text-xs mt-1">
              <span className={trendColor}>{trend > 0 ? 'Crescimento' : 'Queda'} de {Math.abs(trend).toFixed(1)}%</span>
              {trend > 0 ? ' em relação ao período anterior.' : ' em relação ao período anterior.'}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
