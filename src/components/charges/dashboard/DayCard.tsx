import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para dados agrupados por dia
interface DayData {
  date: Date;
  charges: Cobranca[];
  totalValue: number;
  uniqueClients: number;
  receivedPercentage: number;
  chargeTypes: { [key: string]: number };
}

// AIDEV-NOTE: Interface para props do componente DayCard
interface DayCardProps {
  dayData: DayData;
  onDayClick: (date: Date, charges: Cobranca[]) => void;
  isToday: boolean;
}

// AIDEV-NOTE: Componente de cartão do dia extraído para modularização
export function DayCard({ dayData, onDayClick, isToday }: DayCardProps) {
  
  // AIDEV-NOTE: Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // AIDEV-NOTE: Função para determinar cor do progresso
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // AIDEV-NOTE: Função para verificar se há cobranças pagas - corrigida para incluir todos os status de pagamento
  const hasPaidCharges = (charges: Cobranca[]) => {
    return charges.some(charge => {
      const status = charge.status?.toLowerCase() || '';
      return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
    });
  };

  // AIDEV-NOTE: Função para gerar badge de status - corrigida para incluir todos os status de pagamento
  const getStatusBadge = (charges: Cobranca[]) => {
    const paidCount = charges.filter(charge => {
      const status = charge.status?.toLowerCase() || '';
      return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
    }).length;
    
    const overdueCount = charges.filter(charge => {
      const status = charge.status?.toLowerCase() || '';
      return status.includes('overdue') || status.includes('atraso') || status === 'late';
    }).length;

    if (paidCount === charges.length && charges.length > 0) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completo</Badge>;
    }
    if (overdueCount > 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Atrasado</Badge>;
    }
    if (charges.length > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Sem cobranças</Badge>;
  };

  // AIDEV-NOTE: Função para formatar tipos de pagamento para exibição amigável
  const formatPaymentType = (type: string): string => {
    if (!type) return 'Outros';
    
    const typeMap: Record<string, string> = {
      'CREDIT_CARD': 'Cartão de Crédito',
      'CREDIT_CARD_RECURRING': 'Cartão Recorrente',
      'BOLETO': 'Boleto Bancário',
      'PIX': 'PIX',
      'CASH': 'Dinheiro',
      'TRANSFER': 'Transferência',
      'DEBIT_CARD': 'Cartão de Débito',
      // Valores em português (caso já venham formatados)
      'cartao': 'Cartão',
      'boleto': 'Boleto',
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'transferencia': 'Transferência'
    };
    
    return typeMap[type] || type;
  };

  // AIDEV-NOTE: Função para gerar badge de tipo de cobrança com formatação adequada
  const getTypeBadges = (chargeTypes: { [key: string]: number }) => {
    return Object.entries(chargeTypes)
      .filter(([_, count]) => count > 0)
      .slice(0, 2) // Mostrar apenas os 2 primeiros tipos
      .map(([type, count]) => {
        // AIDEV-NOTE: Aplicar formatação antes de exibir
        const formattedType = formatPaymentType(type);
        
        const typeColors: { [key: string]: string } = {
          'boleto': 'bg-blue-100 text-blue-800 border-blue-200',
          'pix': 'bg-purple-100 text-purple-800 border-purple-200',
          'cartao': 'bg-green-100 text-green-800 border-green-200',
          'dinheiro': 'bg-orange-100 text-orange-800 border-orange-200',
          'transferencia': 'bg-cyan-100 text-cyan-800 border-cyan-200'
        };
        
        const colorClass = typeColors[type.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
        
        return (
          <Badge key={type} className={`${colorClass} text-xs`}>
            {formattedType} ({count})
          </Badge>
        );
      });
  };

  const dayName = format(dayData.date, 'EEE', { locale: ptBR });
  const dayNumber = format(dayData.date, 'd');
  const hasCharges = dayData.charges.length > 0;

  return (
    <Card 
      className={`group cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-xl ${
        isToday ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white' : 'hover:bg-gradient-to-br hover:from-gray-50 hover:to-white'
      } ${hasCharges ? 'border-l-4 border-l-blue-500' : ''}`}
      onClick={() => onDayClick(dayData.date, dayData.charges)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Cabeçalho do dia */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 group-hover:transform group-hover:translate-y-[-2px] transition-transform">
              <Calendar className="h-4 w-4 text-gray-500 group-hover:text-blue-500 transition-colors" />
              <div>
                <p className="font-semibold text-sm capitalize group-hover:text-blue-600 transition-colors">{dayName}</p>
                <p className="text-lg font-bold group-hover:text-blue-700 transition-colors">{dayNumber}</p>
              </div>
            </div>
          {isToday && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              Hoje
            </Badge>
          )}
        </div>

        {hasCharges ? (
          <>
            {/* Valor total */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-xl font-bold text-green-600 group-hover:text-green-700 group-hover:scale-105 transition-all">
                {formatCurrency(dayData.totalValue)}
              </p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                <Users className="h-3 w-3 text-gray-500 group-hover:text-blue-500 transition-colors" />
                <span className="group-hover:font-medium transition-all">{dayData.uniqueClients} clientes</span>
              </div>
              <div className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                <TrendingUp className="h-3 w-3 text-gray-500 group-hover:text-blue-500 transition-colors" />
                <span className="group-hover:font-medium transition-all">{dayData.receivedPercentage.toFixed(0)}% recebido</span>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2 group-hover:bg-gray-300 transition-colors">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 transform group-hover:scale-x-105 origin-left ${
                    getProgressColor(dayData.receivedPercentage)
                  }`}
                  style={{ width: `${Math.min(dayData.receivedPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Status e tipos */}
            <div className="space-y-2 group-hover:transform group-hover:translate-y-[-1px] transition-transform">
              <div className="group-hover:transform group-hover:scale-105 transition-transform origin-left">
                {getStatusBadge(dayData.charges)}
              </div>
              <div className="flex flex-wrap gap-1 group-hover:gap-2 transition-all">
                {getTypeBadges(dayData.chargeTypes)}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 group-hover:transform group-hover:scale-105 transition-transform">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2 group-hover:text-gray-400 transition-colors animate-pulse" />
            <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">Nenhuma cobrança</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}