// =====================================================
// RECONCILIATION INDICATORS COMPONENT
// Descrição: Componente de indicadores rápidos para conciliação
// Design: Moderno com gradientes e microinterações
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { ReconciliationIndicators as IndicatorsType } from '@/types/reconciliation';

// AIDEV-NOTE: Componente de indicadores com design ultra moderno, glassmorphism e microinterações profissionais
// Implementa cards com múltiplas camadas de efeitos visuais, animações sofisticadas e barra de resumo

interface ReconciliationIndicatorsProps {
  indicators: IndicatorsType;
  isLoading?: boolean;
}

const ReconciliationIndicators: React.FC<ReconciliationIndicatorsProps> = ({
  indicators,
  loading = false
}) => {
  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // =====================================================
  // CONFIGURAÇÃO DOS CARDS - Design Ultra Moderno
  // =====================================================

  const indicatorCards = [
    {
      id: 'not-reconciled',
      title: 'Não Conciliados',
      value: indicators.notReconciled,
      icon: AlertCircle,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      bgGradient: 'from-rose-50/90 via-pink-50/80 to-red-50/70',
      accentColor: 'text-rose-700',
      shadowColor: 'shadow-rose-100',
      glowColor: 'shadow-rose-200/50',
      trend: 'down' as const,
      description: 'Pendentes de análise',
      isCurrency: false
    },
    {
      id: 'reconciled-month',
      title: 'Conciliados no Mês',
      value: indicators.reconciledThisMonth,
      icon: CheckCircle,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      bgGradient: 'from-emerald-50/90 via-green-50/80 to-teal-50/70',
      accentColor: 'text-emerald-700',
      shadowColor: 'shadow-emerald-100',
      glowColor: 'shadow-emerald-200/50',
      trend: 'up' as const,
      description: 'Processados com sucesso',
      isCurrency: false
    },
    {
      id: 'total-amount',
      title: 'Valor Total',
      value: indicators.totalAmount,
      icon: DollarSign,
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      bgGradient: 'from-blue-50/90 via-indigo-50/80 to-purple-50/70',
      accentColor: 'text-blue-700',
      shadowColor: 'shadow-blue-100',
      glowColor: 'shadow-blue-200/50',
      trend: null,
      description: 'Montante em análise',
      isCurrency: true
    },
    {
      id: 'reconciliation-rate',
      title: 'Taxa de Conciliação',
      value: Math.round((indicators.reconciledThisMonth / (indicators.notReconciled + indicators.reconciledThisMonth)) * 100),
      icon: BarChart3,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      bgGradient: 'from-amber-50/90 via-orange-50/80 to-yellow-50/70',
      accentColor: 'text-amber-700',
      shadowColor: 'shadow-amber-100',
      glowColor: 'shadow-amber-200/50',
      trend: 'up' as const,
      description: 'Eficiência do processo',
      isCurrency: false
    }
  ];

  // =====================================================
  // LOADING STATE - Design Moderno
  // =====================================================

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Loading Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER - Design Moderno e Profissional
  // =====================================================

  return (
    <div className="space-y-3">
      {/* Cards Grid - 2x2 layout com design moderno */}
      <div className="grid grid-cols-2 gap-3">
        {indicatorCards.map((card, index) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? TrendingUp : card.trend === 'down' ? TrendingDown : null;
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              whileHover={{ 
                scale: 1.02,
                y: -2,
                transition: { duration: 0.2 }
              }}
              className="relative group"
            >
              {/* Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} rounded-xl blur-sm opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
              
              <Card className={`relative border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${card.bgGradient} backdrop-blur-sm border border-white/20 ${card.shadowColor} hover:${card.glowColor}`}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {/* Icon and Trend Row */}
                    <div className="flex items-center justify-between">
                      <motion.div 
                        className={`relative p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        whileHover={{ 
                          scale: 1.15,
                          rotate: [0, -8, 8, 0],
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Icon className="h-4 w-4 text-white drop-shadow-sm" />
                        {/* Inner highlight */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent rounded-xl"></div>
                        
                        {/* Pulsing ring effect */}
                        <motion.div
                          className={`absolute inset-0 rounded-xl border-2 border-white/30`}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0, 0.5]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </motion.div>
                      
                      {/* Trend Indicator com animação */}
                      {TrendIcon && (
                        <motion.div
                          className={`p-1.5 rounded-lg ${card.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
                          whileHover={{ scale: 1.2, rotate: 15 }}
                        >
                          <TrendIcon className="h-3 w-3" />
                        </motion.div>
                      )}
                      
                      {/* Sparkle Effect */}
                      {index === 1 && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ 
                            rotate: [0, 360],
                            scale: [0.8, 1.2, 0.8],
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Sparkles className="h-3 w-3 text-yellow-400 opacity-70 drop-shadow-sm" />
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Title */}
                    <p className="text-xs font-semibold text-slate-700 leading-tight">
                      {card.title}
                    </p>
                    
                    {/* Value with Animation */}
                    <motion.p 
                      className={`text-sm font-bold ${card.accentColor} leading-none`}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                    </motion.p>
                    
                    {/* Description */}
                    <p className="text-xs text-slate-500 leading-tight opacity-80">
                      {card.description}
                    </p>
                    
                    {/* Bottom Accent Line */}
                    <motion.div 
                      className={`h-0.5 bg-gradient-to-r ${card.gradient} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: index * 0.1 + 0.4, duration: 0.6 }}
                    ></motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ReconciliationIndicators;