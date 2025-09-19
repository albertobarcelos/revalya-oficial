import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SparklineChart } from './SparklineChart';
import { cn } from '@/lib/utils';

interface NeonMetricCardProps {
  title: string;
  value: string | number;
  formattedValue: string;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  trendData?: number[];
  type: 'mrr' | 'netValue' | 'ticket' | 'receive' | 'customers';
  onClick?: () => void;
  chartType?: 'line' | 'bar' | 'area';
}

export function NeonMetricCard({
  title,
  value,
  formattedValue,
  description,
  icon,
  trend,
  trendData = [],
  type,
  onClick,
  chartType = 'line'
}: NeonMetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Dados para sparkline
  const sparklineData = trendData.length > 0 
    ? trendData 
    : [50, 55, 48, 60, 58, 63, 65, 62, 67, 70].map(v => 
        trend && trend < 0 ? 100 - v : v
      );

  // Paleta de cores neon harmonizada com o novo tema escuro
  const getCardStyles = () => {
    const styles = {
      mrr: {
        bgColor: 'bg-card',
        border: 'border-border',
        glow: 'bg-primary/20',
        highlight: 'bg-primary/15',
        gradientFrom: '#3B82F6',
        gradientTo: '#60A5FA',
        text: 'text-primary',
        chartColor: '#3B82F6',
        shadowColor: 'rgba(59, 130, 246, 0.3)'
      },
      netValue: {
        bgColor: 'bg-card',
        border: 'border-border',
        glow: 'bg-warning/20',
        highlight: 'bg-warning/15',
        gradientFrom: '#EA580C',
        gradientTo: '#F97316',
        text: 'text-warning',
        chartColor: '#EA580C',
        shadowColor: 'rgba(234, 88, 12, 0.3)'
      },
      ticket: {
        bgColor: 'bg-card',
        border: 'border-border',
        glow: 'bg-accent/20',
        highlight: 'bg-accent/15',
        gradientFrom: '#8B5CF6',
        gradientTo: '#A78BFA',
        text: 'text-accent',
        chartColor: '#8B5CF6',
        shadowColor: 'rgba(139, 92, 246, 0.3)'
      },
      receive: {
        bgColor: 'bg-card',
        border: 'border-border',
        glow: 'bg-success/20',
        highlight: 'bg-success/15',
        gradientFrom: '#22C55E',
        gradientTo: '#4ADE80',
        text: 'text-success',
        chartColor: '#22C55E',
        shadowColor: 'rgba(34, 197, 94, 0.3)'
      },
      customers: {
        bgColor: 'bg-card',
        border: 'border-border',
        glow: 'bg-accent/20',
        highlight: 'bg-accent/15',
        gradientFrom: '#8B5CF6',
        gradientTo: '#C084FC',
        text: 'text-accent',
        chartColor: '#8B5CF6',
        shadowColor: 'rgba(139, 92, 246, 0.3)'
      }
    };

    return styles[type];
  };

  const styles = getCardStyles();
  
  // Determinar cor da tendência
  const trendColor = trend && trend >= 0 
    ? 'text-success'
    : 'text-danger';

  return (
    <Card 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'hover:translate-y-[-3px] cursor-pointer border',
        styles.bgColor,
        styles.border,
        'shadow-lg shadow-black/40 backdrop-blur-sm'
      )}
    >
      {/* Brilho de fundo */}
      <div className={cn(
        'absolute -inset-2 opacity-0 blur-2xl transition-opacity duration-500 z-0',
        styles.glow,
        isHovered ? 'opacity-80' : 'opacity-0'
      )} />
      
      {/* Linha de borda superior com gradiente */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-[2px] z-10',
        'bg-gradient-to-r',
      )}
      style={{
        backgroundImage: `linear-gradient(to right, ${styles.gradientFrom}, ${styles.gradientTo})`,
        boxShadow: `0 0 10px 1px ${styles.shadowColor}`
      }}
      />

      {/* Área de conteúdo */}
      <div className="relative z-10 p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md",
            styles.text,
            styles.highlight
          )}
          style={{
            boxShadow: `0 0 8px ${styles.shadowColor}`
          }}>
            {icon}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col">
            <p className={cn(
              "text-2xl font-bold tracking-tight text-white transition-all duration-300",
              isHovered ? "scale-105 origin-left" : ""
            )}>
              {formattedValue}
            </p>
            
            {description && (
              <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
            )}
          </div>
          
          {/* Área de gráfico e tendência */}
          <div className="pt-3">
            {trend !== undefined && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${trendColor}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
                
                <div className={`w-2 h-2 rounded-full ${trend >= 0 ? 'bg-success' : 'bg-danger'}`}></div>
              </div>
            )}
            
            {/* Área do gráfico com gradiente */}
            <div className="h-16 w-full overflow-hidden">
              <div className="h-full w-full" style={{ 
                filter: `drop-shadow(0 0 8px ${styles.shadowColor})` 
              }}>
                <SparklineChart 
                  data={sparklineData} 
                  color={styles.chartColor}
                  height={64}
                  width={200}
                  lineWidth={2.5}
                  fillOpacity={0.25}
                  showDots={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
