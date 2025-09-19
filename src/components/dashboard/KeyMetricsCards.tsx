import React, { useMemo } from 'react';
import { 
  Wallet, 
  Clock, 
  Tag, 
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DashboardMetrics } from "@/types/models/dashboard";
import { cn } from '@/lib/utils';

interface KeyMetricsCardsProps {
  metrics: DashboardMetrics;
}

export function KeyMetricsCards({ metrics }: KeyMetricsCardsProps) {
  // Garantir que o objeto metrics está completo
  const safeMetrics = useMemo(() => {
    // Valores padrão para todas as propriedades para evitar erros
    const defaults = {
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalReceivable: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      newCustomers: 0,
      newCustomersList: [],
      mrrTotal: 0,
      mrcTotal: 0,
      netMonthlyValue: 0,
      mrrGrowth: 0,
      avgTicket: 0,
      avgDaysToReceive: 0
    };
    
    // Mesclar os valores padrão com os valores reais
    return { ...defaults, ...metrics };
  }, [metrics]);

  // Helper function to determine trend arrow and color
  const getTrendProps = (value: number) => {
    const isPositive = value >= 0;
    
    return {
      TrendIcon: isPositive ? TrendingUp : TrendingDown,
      trendColor: isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
      bgColor: isPositive ? 'bg-emerald-500/10 dark:bg-emerald-400/10' : 'bg-rose-500/10 dark:bg-rose-400/10',
      borderColor: isPositive ? 'border-emerald-500/20 dark:border-emerald-400/20' : 'border-rose-500/20 dark:border-rose-400/20',
      glowColor: isPositive ? 'shadow-emerald-500/10 dark:shadow-emerald-400/20' : 'shadow-rose-500/10 dark:shadow-rose-400/20'
    };
  };
  
  const metricCards = [
    {
      title: "MRR",
      subtitle: "Receita Mensal Recorrente",
      value: formatCurrency(safeMetrics.mrrTotal),
      change: safeMetrics.mrrGrowth,
      icon: Wallet,
      color: "blue",
      colorHex: "#3B82F6", // blue-500
      backgroundColor: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900/60",
      textColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-700 dark:text-blue-300",
      lightAccent: "bg-blue-500/10",
      darkAccent: "bg-blue-400/10",
      borderColor: "border-blue-500/50 dark:border-blue-400/30",
      iconColor: "text-blue-500 dark:text-blue-400",
      sideColor: "bg-blue-500 dark:bg-blue-600",
      hoverAccent: "group-hover:bg-blue-500/[0.08] dark:group-hover:bg-blue-400/[0.06]",
      iconBgClass: "bg-blue-100/50 dark:bg-blue-500/10"
    },
    {
      title: "Valor Líquido",
      subtitle: "Receita Mensal Total",
      value: formatCurrency(safeMetrics.netMonthlyValue),
      change: safeMetrics.mrrGrowth, 
      icon: DollarSign,
      color: "emerald",
      colorHex: "#10B981", // emerald-500
      backgroundColor: "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900/60",
      textColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      lightAccent: "bg-emerald-500/10",
      darkAccent: "bg-emerald-400/10",
      borderColor: "border-emerald-500/50 dark:border-emerald-400/30",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      sideColor: "bg-emerald-500 dark:bg-emerald-600",
      hoverAccent: "group-hover:bg-emerald-500/[0.08] dark:group-hover:bg-emerald-400/[0.06]",
      iconBgClass: "bg-emerald-100/50 dark:bg-emerald-500/10"
    },
    {
      title: "Ticket Médio",
      subtitle: "Valor Médio por Cliente",
      value: formatCurrency(safeMetrics.avgTicket),
      change: 0,
      icon: Tag,
      color: "purple",
      colorHex: "#8B5CF6", // purple-500
      backgroundColor: "bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900/60",
      textColor: "text-purple-600 dark:text-purple-400",
      valueColor: "text-purple-700 dark:text-purple-300",
      lightAccent: "bg-purple-500/10",
      darkAccent: "bg-purple-400/10",
      borderColor: "border-purple-500/50 dark:border-purple-400/30",
      iconColor: "text-purple-500 dark:text-purple-400",
      sideColor: "bg-purple-500 dark:bg-purple-600",
      hoverAccent: "group-hover:bg-purple-500/[0.08] dark:group-hover:bg-purple-400/[0.06]",
      iconBgClass: "bg-purple-100/50 dark:bg-purple-500/10"
    },
    {
      title: "Prazo",
      subtitle: "Dias para Recebimento",
      value: `${formatNumber(safeMetrics.avgDaysToReceive)} dias`,
      change: 0,
      icon: Clock,
      color: "amber",
      colorHex: "#F59E0B", // amber-500
      backgroundColor: "bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900/60",
      textColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
      lightAccent: "bg-amber-500/10",
      darkAccent: "bg-amber-400/10",
      borderColor: "border-amber-500/50 dark:border-amber-400/30",
      iconColor: "text-amber-500 dark:text-amber-400",
      sideColor: "bg-amber-500 dark:bg-amber-600",
      hoverAccent: "group-hover:bg-amber-500/[0.08] dark:group-hover:bg-amber-400/[0.06]",
      iconBgClass: "bg-amber-100/50 dark:bg-amber-500/10"
    },
    {
      title: "Novos Clientes",
      subtitle: "Aquisições do Período",
      value: formatNumber(safeMetrics.newCustomers),
      change: 0,
      icon: Users,
      color: "rose",
      colorHex: "#F43F5E", // rose-500
      backgroundColor: "bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-900/60",
      textColor: "text-rose-600 dark:text-rose-400",
      valueColor: "text-rose-700 dark:text-rose-300",
      lightAccent: "bg-rose-500/10",
      darkAccent: "bg-rose-400/10",
      borderColor: "border-rose-500/50 dark:border-rose-400/30",
      iconColor: "text-rose-500 dark:text-rose-400",
      sideColor: "bg-rose-500 dark:bg-rose-600",
      hoverAccent: "group-hover:bg-rose-500/[0.08] dark:group-hover:bg-rose-400/[0.06]",
      iconBgClass: "bg-rose-100/50 dark:bg-rose-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
      {metricCards.map((card, idx) => {
        const { TrendIcon, trendColor, bgColor, borderColor, glowColor } = getTrendProps(card.change);
        
        // Dynamic style variables
        const dynamicStyles = {
          '--card-color': card.colorHex,
        } as React.CSSProperties;
        
        return (
          <div 
            key={idx}
            style={dynamicStyles}
            className={cn(
              // Base card styling - clean, premium look
              "group relative overflow-hidden rounded-xl",
              
              // Premium shadow and glass effects
              "bg-white dark:bg-slate-900",
              "shadow-lg hover:shadow-xl",
              "border border-gray-100 dark:border-gray-800",
              
              // Hover effects
              "hover:border-gray-200 dark:hover:border-gray-700",
              "transition duration-300 ease-out",
              
              // Other dimensions
              "flex flex-col",
              "cursor-pointer"
            )}
          >
            {/* Elemento lateral colorido */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5",
              card.sideColor
            )} />
            
            {/* Background gradient with subtle accent */}
            <div 
              className={cn(
                "absolute inset-0 transition-opacity duration-300", 
                card.backgroundColor,
                "opacity-100 group-hover:opacity-100"
              )}
            />
            
            {/* Card header with icon and description */}
            <div className="px-5 pt-5 pb-2 z-10">
              <div className="flex items-start">
                {/* Icon with colored background */}
                <div className={cn(
                  "flex items-center justify-center",
                  "h-10 w-10 rounded-full",
                  card.iconBgClass,
                  "transition-all duration-300 group-hover:scale-110"
                )}>
                  <card.icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                
                {/* Title and subtitle next to the icon */}
                <div className="ml-3">
                  <h3 className={cn(
                    "text-base font-semibold", 
                    card.textColor,
                    "transition-colors"
                  )}>
                    {card.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {card.subtitle}
                  </p>
                </div>
                
                {/* Trend indicator positioned absolute */}
                {card.change !== 0 && (
                  <div className={cn(
                    "absolute top-5 right-5 z-10",
                    "flex items-center gap-1",
                    "px-2.5 py-1.5 rounded-full",
                    bgColor,
                    "border", borderColor,
                    "shadow-sm", glowColor,
                    "transition-all duration-300 group-hover:scale-110",
                    "text-xs font-medium", trendColor
                  )}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Value display - large and prominent */}
            <div className="px-5 pb-5 mt-auto z-10">
              <p className={cn(
                "text-3xl font-bold",
                card.valueColor,
                "tracking-tight transition-all duration-300",
                "group-hover:translate-y-[-2px]"
              )}>
                {card.value}
              </p>
            </div>
            
            {/* Hover interaction element */}
            <div className={cn(
              "absolute bottom-4 right-4 z-10",
              "flex items-center justify-center",
              "h-6 w-6 rounded-full",
              "bg-white/80 dark:bg-slate-800/80",
              "shadow-sm",
              "border border-gray-100 dark:border-gray-700",
              "opacity-0 group-hover:opacity-100 transition-all duration-300",
              "translate-x-2 group-hover:translate-x-0"
            )}>
              <ArrowRight className={cn("h-3 w-3", card.iconColor)} />
            </div>
            
            {/* Interactive hover state background */}
            <div className={cn(
              "absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              card.hoverAccent
            )} />
            
            {/* Decorative elements for visual interest */}
            <div className="absolute h-24 w-24 rounded-full right-[-10px] top-[-10px] opacity-0 group-hover:opacity-30 transition-opacity duration-700 blur-xl" 
                 style={{background: `radial-gradient(circle, var(--card-color) 0%, transparent 70%)`}} />
          </div>
        );
      })}
    </div>
  );
}
