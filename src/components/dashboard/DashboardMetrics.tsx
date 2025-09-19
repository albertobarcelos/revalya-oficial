import React from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DashboardMetrics as DashboardMetricsType } from "@/types/models/dashboard";
import { cn } from '@/lib/utils';

// AIDEV-NOTE: Componente DashboardMetrics - Cards de métricas principais do dashboard
// Propósito: Exibir as principais métricas financeiras em cards coloridos e animados
// Baseado no layout original com cores vibrantes e microinterações

interface DashboardMetricsProps {
  metrics: DashboardMetricsType;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: number;
  count?: number;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
  formatter?: (value: number) => string;
  trend?: number;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  count, 
  icon, 
  color, 
  formatter = formatCurrency,
  trend,
  delay = 0
}) => {
  const colorClasses = {
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    yellow: 'from-amber-500 to-amber-600 shadow-amber-500/25',
    red: 'from-red-500 to-red-600 shadow-red-500/25',
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/25',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/25'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg transition-all duration-300 hover:shadow-xl",
        colorClasses[color]
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-2 -left-2 h-16 w-16 rounded-full bg-white/5" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/90">{title}</h3>
              {count !== undefined && (
                <p className="text-xs text-white/70">{count} itens</p>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
              trend >= 0 ? "bg-white/20 text-white" : "bg-red-500/20 text-red-100"
            )}>
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3 rotate-180" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <motion.p 
            className="text-2xl font-bold text-white"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.2 }}
          >
            {formatter(value)}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ 
  metrics, 
  className 
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* AIDEV-NOTE: Grid principal de métricas - layout responsivo com 5 cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pago para vencer */}
        <MetricCard
          title="Pago para vencer"
          value={metrics.totalPaid}
          count={metrics.paidCount}
          icon={<Wallet className="h-5 w-5" />}
          color="green"
          delay={0}
        />
        
        {/* Pago para vencer (duplicado conforme layout original) */}
        <MetricCard
          title="Pago para vencer"
          value={metrics.totalPaid}
          count={metrics.paidCount}
          icon={<DollarSign className="h-5 w-5" />}
          color="yellow"
          delay={0.1}
        />
        
        {/* Pago para vencer (terceiro card) */}
        <MetricCard
          title="Pago para vencer"
          value={metrics.totalPaid}
          count={metrics.paidCount}
          icon={<Target className="h-5 w-5" />}
          color="yellow"
          delay={0.2}
        />
        
        {/* Vencido */}
        <MetricCard
          title="Vencido"
          value={metrics.totalOverdue}
          count={metrics.overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
          delay={0.3}
        />
        
        {/* Recebidos */}
        <MetricCard
          title="Recebidos"
          value={metrics.totalReceivable}
          count={metrics.paidCount}
          icon={<TrendingUp className="h-5 w-5" />}
          color="red"
          delay={0.4}
        />
      </div>
      
      {/* AIDEV-NOTE: Segunda linha de métricas - MRR e outras métricas importantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita de Referência */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Receita de Referência</h3>
            <Calendar className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{formatCurrency(metrics.mrrTotal)}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">MRR Growth:</span>
              <span className={cn(
                "font-medium",
                metrics.mrrGrowth >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {metrics.mrrGrowth >= 0 ? '+' : ''}{metrics.mrrGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
        
        {/* Novos Clientes */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Novos Clientes</h3>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{formatNumber(metrics.newCustomers)}</p>
            <p className="text-sm text-slate-400">Este mês</p>
          </div>
        </motion.div>
        
        {/* Ticket Médio */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Ticket Médio</h3>
            <Target className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{formatCurrency(metrics.avgTicket)}</p>
            <p className="text-sm text-slate-400">Por cobrança</p>
          </div>
        </motion.div>
        
        {/* Dias para Receber */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">Dias p/ Receber</h3>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold">{Math.round(metrics.avgDaysToReceive)}</p>
            <p className="text-sm text-slate-400">Média em dias</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardMetrics;