import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// AIDEV-NOTE: Interface para dados de métricas semanais
interface WeeklyMetricsData {
  currentWeekTotal: number;
  previousWeekTotal: number;
  growth: number;
}

// AIDEV-NOTE: Interface para props do componente WeeklyMetrics
interface WeeklyMetricsProps {
  metricsData: WeeklyMetricsData;
  isLoading: boolean;
}

// AIDEV-NOTE: Componente de métricas semanais extraído para modularização
export function WeeklyMetrics({ metricsData, isLoading }: WeeklyMetricsProps) {
  
  // AIDEV-NOTE: Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // AIDEV-NOTE: Função para determinar cor e ícone do crescimento
  const getGrowthDisplay = (growth: number) => {
    if (growth > 0) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: <TrendingUp className="h-4 w-4" />,
        text: `+${growth.toFixed(1)}%`
      };
    } else if (growth < 0) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: <TrendingDown className="h-4 w-4" />,
        text: `${growth.toFixed(1)}%`
      };
    } else {
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        icon: <Minus className="h-4 w-4" />,
        text: '0%'
      };
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Comparação Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const growthDisplay = getGrowthDisplay(metricsData.growth);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Comparação Semanal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Semana Atual */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">Semana Atual</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(metricsData.currentWeekTotal)}
            </p>
          </div>
          
          {/* Semana Anterior */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">Semana Anterior</p>
            <p className="text-2xl font-bold text-gray-700">
              {formatCurrency(metricsData.previousWeekTotal)}
            </p>
          </div>
          
          {/* Crescimento */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">Crescimento</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${growthDisplay.color} ${growthDisplay.bgColor} border-0`}
              >
                <div className="flex items-center gap-1">
                  {growthDisplay.icon}
                  <span className="font-semibold">{growthDisplay.text}</span>
                </div>
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}