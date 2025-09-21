// =====================================================
// RECONCILIATION HEADER INDICATORS COMPONENT - MCP 21st
// Descrição: Indicadores premium para header do modal
// Design: Sofisticado, elegante, padrões MCP 21st
// =====================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ReconciliationIndicators as IndicatorsType } from '@/types/reconciliation';

// AIDEV-NOTE: Componente premium seguindo padrões MCP 21st
// Design sofisticado com microinterações, glassmorphism e hierarquia visual clara

interface ReconciliationHeaderIndicatorsProps {
  indicators: IndicatorsType;
  isLoading?: boolean;
}

const ReconciliationHeaderIndicators: React.FC<ReconciliationHeaderIndicatorsProps> = ({
  indicators,
  isLoading = false
}) => {
  // AIDEV-NOTE: Verificação de segurança para evitar erros quando indicators é undefined/null
  if (!indicators) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-500">Carregando indicadores...</div>
      </div>
    );
  }
  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const formatCurrency = (value: number | undefined | null): string => {
    // AIDEV-NOTE: Verificação de segurança para valores undefined/null
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0,00';
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number | undefined | null): string => {
    // AIDEV-NOTE: Verificação de segurança para valores undefined/null
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatCompactNumber = (value: number | undefined | null): string => {
    // AIDEV-NOTE: Verificação de segurança para valores undefined/null
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // =====================================================
  // CONFIGURAÇÃO DOS INDICADORES - MCP 21st Design
  // =====================================================

  // AIDEV-NOTE: Verificações de segurança para cálculos dos indicadores
  const safeNotReconciled = indicators.notReconciled || 0;
  const safeReconciledThisMonth = indicators.reconciledThisMonth || 0;
  const safeTotalValue = indicators.totalValue || 0;
  
  const reconciliationRate = Math.round((safeReconciledThisMonth / (safeNotReconciled + safeReconciledThisMonth)) * 100) || 0;
  const isGoodRate = reconciliationRate >= 80;

  const headerIndicators = [
    {
      id: 'not-reconciled',
      label: 'Pendentes',
      value: safeNotReconciled,
      displayValue: formatCompactNumber(safeNotReconciled),
      icon: AlertCircle,
      gradient: 'from-red-500/20 via-red-400/10 to-red-300/5',
      iconColor: 'text-red-500',
      textColor: 'text-red-700',
      labelColor: 'text-red-600/70',
      glowColor: 'shadow-red-500/20',
      borderColor: 'border-red-200/50',
      trend: 'down',
      priority: 'high'
    },
    {
      id: 'reconciled-month',
      label: 'Conciliados',
      value: safeReconciledThisMonth,
      displayValue: formatCompactNumber(safeReconciledThisMonth),
      icon: CheckCircle,
      gradient: 'from-emerald-500/20 via-emerald-400/10 to-emerald-300/5',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-700',
      labelColor: 'text-emerald-600/70',
      glowColor: 'shadow-emerald-500/20',
      borderColor: 'border-emerald-200/50',
      trend: 'up',
      priority: 'high'
    },
    {
      id: 'total-amount',
      label: 'Valor Total',
      value: indicators.totalAmount || 0,
      displayValue: formatCurrency(indicators.totalAmount || 0),
      icon: DollarSign,
      gradient: 'from-blue-500/20 via-blue-400/10 to-blue-300/5',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-700',
      labelColor: 'text-blue-600/70',
      glowColor: 'shadow-blue-500/20',
      borderColor: 'border-blue-200/50',
      trend: 'neutral',
      priority: 'medium'
    },
    {
      id: 'reconciliation-rate',
      label: 'Taxa de Sucesso',
      value: reconciliationRate,
      displayValue: `${reconciliationRate}%`,
      icon: BarChart3,
      gradient: isGoodRate 
        ? 'from-violet-500/20 via-violet-400/10 to-violet-300/5'
        : 'from-amber-500/20 via-amber-400/10 to-amber-300/5',
      iconColor: isGoodRate ? 'text-violet-500' : 'text-amber-500',
      textColor: isGoodRate ? 'text-violet-700' : 'text-amber-700',
      labelColor: isGoodRate ? 'text-violet-600/70' : 'text-amber-600/70',
      glowColor: isGoodRate ? 'shadow-violet-500/20' : 'shadow-amber-500/20',
      borderColor: isGoodRate ? 'border-violet-200/50' : 'border-amber-200/50',
      trend: isGoodRate ? 'up' : 'down',
      priority: 'high'
    }
  ];

  // =====================================================
  // ANIMATION VARIANTS - MCP 21st
  // =====================================================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: -20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.8
      }
    }
  };

  const hoverVariants = {
    hover: {
      scale: 1.03,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15
      }
    }
  };

  // =====================================================
  // LOADING STATE - Premium
  // =====================================================

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center gap-2 sm:gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[1, 2, 3, 4].map((index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            className="relative group"
          >
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/30" />
            
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse rounded-xl sm:rounded-2xl" />
            
            <div className="relative px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-300/60 rounded-full animate-pulse" />
              <div className="space-y-1.5">
                <div className="w-12 sm:w-16 h-3 sm:h-4 bg-gray-300/60 rounded animate-pulse" />
                <div className="w-8 sm:w-12 h-2 sm:h-3 bg-gray-200/60 rounded animate-pulse hidden sm:block" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // =====================================================
  // RENDER - MCP 21st Premium Design
  // =====================================================

  return (
    <motion.div 
      className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {headerIndicators.map((indicator, index) => {
          const Icon = indicator.icon;
          const TrendIcon = indicator.trend === 'up' ? TrendingUp : 
                           indicator.trend === 'down' ? TrendingDown : null;
          
          return (
            <motion.div
              key={indicator.id}
              variants={cardVariants}
              whileHover="hover"
              className="relative group cursor-default"
            >
              {/* Glow Effect */}
              <motion.div 
                className={`absolute -inset-0.5 bg-gradient-to-r ${indicator.gradient} rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                variants={hoverVariants}
              />
              
              {/* Main Card */}
               <motion.div
                 className={`
                   relative px-3 py-2 sm:px-4 sm:py-3 
                   bg-gradient-to-br from-white/80 via-white/60 to-white/40
                   backdrop-blur-xl rounded-xl sm:rounded-2xl
                   border ${indicator.borderColor}
                   ${indicator.glowColor} shadow-sm
                   group-hover:shadow-lg group-hover:${indicator.glowColor}
                   transition-all duration-300
                   min-w-0 flex-shrink-0
                 `}
                 variants={hoverVariants}
               >
                {/* Priority Indicator */}
                {indicator.priority === 'high' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse" />
                )}
                
                <div className="flex items-center gap-2 sm:gap-3">
                   {/* Icon Container */}
                   <motion.div 
                     className={`
                       relative p-1.5 sm:p-2 rounded-lg sm:rounded-xl
                       bg-gradient-to-br ${indicator.gradient}
                       border ${indicator.borderColor}
                     `}
                     whileHover={{ rotate: 5 }}
                     transition={{ type: "spring", stiffness: 400 }}
                   >
                     <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${indicator.iconColor}`} />
                    
                    {/* Icon Glow */}
                    <div className={`absolute inset-0 ${indicator.iconColor} opacity-20 blur-sm rounded-xl`} />
                  </motion.div>
                  
                  {/* Content */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                       <motion.span 
                         className={`text-xs sm:text-sm font-bold ${indicator.textColor} leading-none`}
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ delay: index * 0.1 + 0.2 }}
                       >
                         {indicator.displayValue}
                       </motion.span>
                       
                       {/* Trend Indicator */}
                       {TrendIcon && (
                         <motion.div
                           initial={{ scale: 0, rotate: -180 }}
                           animate={{ scale: 1, rotate: 0 }}
                           transition={{ 
                             delay: index * 0.1 + 0.3,
                             type: "spring",
                             stiffness: 400 
                           }}
                         >
                           <TrendIcon className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${indicator.iconColor}`} />
                         </motion.div>
                       )}
                     </div>
                     
                     <motion.span 
                       className={`text-xs ${indicator.labelColor} leading-none mt-0.5 font-medium hidden sm:block`}
                       initial={{ opacity: 0, y: 5 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: index * 0.1 + 0.25 }}
                     >
                       {indicator.label}
                     </motion.span>
                  </div>
                </div>
                
                {/* Subtle Pattern Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent rounded-2xl pointer-events-none" />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReconciliationHeaderIndicators;