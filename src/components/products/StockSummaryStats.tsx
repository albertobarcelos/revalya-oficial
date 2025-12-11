/**
 * Componente de estatísticas resumidas de estoque
 * 
 * AIDEV-NOTE: Cards com previsões e estoque disponível
 * conforme especificado no plano
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Package } from 'lucide-react';
import { formatStockQuantity } from '@/utils/stockUtils';

interface StockSummaryStatsProps {
  outboundForecast?: number; // Previsão de Saída
  inboundForecast?: number; // Previsão de Entrada
  availableStock?: number; // Estoque disponível até o momento
  unit?: string; // Unidade de medida
}

export function StockSummaryStats({
  outboundForecast = 0,
  inboundForecast = 0,
  availableStock = 0,
  unit = 'UN'
}: StockSummaryStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Previsão de Saída */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1">
                Previsão de Saída
              </p>
              <p className="text-heading-1 font-bold">
                {formatStockQuantity(outboundForecast, unit)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previsão de Entrada */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1">
                Previsão de Entrada
              </p>
              <p className="text-heading-1 font-bold">
                {formatStockQuantity(inboundForecast, unit)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estoque disponível até o momento - Destaque maior */}
      <Card className="border-2 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground mb-1">
                Estoque disponível até o momento
              </p>
              <p className="text-heading-1 font-bold text-blue-600">
                {formatStockQuantity(availableStock, unit)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

