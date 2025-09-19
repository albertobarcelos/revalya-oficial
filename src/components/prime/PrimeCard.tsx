/**
 * Componente Card padronizado usando PrimeReact
 * Substitui os cards do Shadcn UI com design consistente
 */

import React from 'react';
import { Card as PrimeCard, CardProps as PrimeCardProps } from 'primereact/card';
import { Panel, PanelProps } from 'primereact/panel';
import { Skeleton } from 'primereact/skeleton';
import { Badge } from 'primereact/badge';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos base
interface BaseCardProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  size?: 'small' | 'normal' | 'large';
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Card simples
interface CardProps extends Omit<PrimeCardProps, 'className'>, BaseCardProps {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  actions?: CardAction[];
  badge?: {
    value: string | number;
    severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  };
  tag?: {
    value: string;
    severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
    icon?: string;
  };
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

// Ações do card
export interface CardAction {
  label: string;
  icon?: string;
  onClick: () => void;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  disabled?: boolean;
  tooltip?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>((
  {
    variant = 'default',
    size = 'normal',
    loading = false,
    title,
    subtitle,
    footer,
    actions = [],
    badge,
    tag,
    hoverable = false,
    clickable = false,
    onClick,
    className,
    children,
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();

  // Classes baseadas na variante
  const getVariantClasses = () => {
    const variants = {
      default: 'border border-border bg-card',
      outlined: 'border-2 border-border bg-card',
      elevated: 'shadow-lg border-0 bg-card',
      filled: 'border-0 bg-muted'
    };
    return variants[variant];
  };

  // Classes baseadas no tamanho
  const getSizeClasses = () => {
    const sizes = {
      small: 'p-3',
      normal: 'p-4',
      large: 'p-6'
    };
    return sizes[size];
  };

  // Classes de interação
  const getInteractionClasses = () => {
    return cn({
      'hover:shadow-md hover:-translate-y-1 transition-all duration-200': hoverable,
      'cursor-pointer': clickable || onClick,
      'hover:bg-muted/50': clickable || onClick
    });
  };

  // Header customizado
  const renderHeader = () => {
    if (!title && !subtitle && !badge && !tag) return undefined;

    return (
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-card-foreground mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {badge && (
            <Badge
              value={badge.value}
              severity={badge.severity}
              size="large"
            />
          )}
          {tag && (
            <Tag
              value={tag.value}
              severity={tag.severity}
              icon={tag.icon}
            />
          )}
        </div>
      </div>
    );
  };

  // Footer customizado
  const renderFooter = () => {
    if (!footer && actions.length === 0) return undefined;

    return (
      <div className="mt-4">
        {footer && (
          <div className="mb-3">
            {footer}
          </div>
        )}
        
        {actions.length > 0 && (
          <div className="flex gap-2 justify-end">
            {actions.map((action, index) => (
              <Button
                key={index}
                label={action.label}
                icon={action.icon}
                severity={action.severity}
                size="small"
                onClick={action.onClick}
                disabled={action.disabled}
                tooltip={action.tooltip}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className={cn(
        'rounded-lg',
        getVariantClasses(),
        getSizeClasses(),
        className
      )}>
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton width="60%" height="1.5rem" />
              <Skeleton width="40%" height="1rem" />
            </div>
            <Skeleton width="3rem" height="1.5rem" borderRadius="16px" />
          </div>
          <Skeleton width="100%" height="4rem" />
          <div className="flex gap-2 justify-end">
            <Skeleton width="5rem" height="2rem" borderRadius="6px" />
            <Skeleton width="5rem" height="2rem" borderRadius="6px" />
          </div>
        </div>
      </div>
    );
  }

  const cardClasses = cn(
    'rounded-lg transition-all duration-200',
    getVariantClasses(),
    getSizeClasses(),
    getInteractionClasses(),
    className
  );

  return (
    <PrimeCard
      ref={ref}
      header={renderHeader()}
      footer={renderFooter()}
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </PrimeCard>
  );
});

Card.displayName = 'Card';

// Card de métricas
interface MetricCardProps extends BaseCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  onClick?: () => void;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>((
  {
    title,
    value,
    subtitle,
    icon,
    trend,
    color = 'blue',
    loading = false,
    className,
    onClick,
    ...props
  },
  ref
) => {
  const colorClasses = {
    blue: 'border-primary/20 bg-primary/5',
    green: 'border-success/20 bg-success/5',
    red: 'border-danger/20 bg-danger/5',
    yellow: 'border-warning/20 bg-warning/5',
    purple: 'border-accent/20 bg-accent/5',
    gray: 'border-border bg-muted'
  };

  const iconColorClasses = {
    blue: 'text-primary',
    green: 'text-success',
    red: 'text-danger',
    yellow: 'text-warning',
    purple: 'text-accent',
    gray: 'text-gray-600 dark:text-gray-400'
  };

  if (loading) {
    return (
      <div className={cn(
        'p-4 rounded-lg border',
        colorClasses[color],
        className
      )}>
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="2rem" height="2rem" borderRadius="50%" />
          </div>
          <Skeleton width="80%" height="2rem" />
          <Skeleton width="40%" height="0.875rem" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'p-4 rounded-lg border transition-all duration-200',
        colorClasses[color],
        {
          'cursor-pointer hover:shadow-md hover:-translate-y-1': onClick
        },
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </h3>
        {icon && (
          <i className={cn('text-xl', icon, iconColorClasses[color])} />
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </p>
        
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
        
        {trend && (
          <div className="flex items-center gap-1">
            <i className={cn(
              'text-sm',
              trend.isPositive ? 'pi pi-arrow-up text-green-600' : 'pi pi-arrow-down text-red-600'
            )} />
            <span className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {Math.abs(trend.value)}%
            </span>
            {trend.label && (
              <span className="text-sm text-gray-500">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

// Card expansível
interface ExpandableCardProps extends BaseCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  defaultExpanded?: boolean;
  toggleable?: boolean;
  actions?: CardAction[];
}

const ExpandableCard = React.forwardRef<HTMLDivElement, ExpandableCardProps>((
  {
    title,
    subtitle,
    icon,
    defaultExpanded = false,
    toggleable = true,
    actions = [],
    loading = false,
    className,
    children,
    ...props
  },
  ref
) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const headerTemplate = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {icon && <i className={cn('text-lg', icon)} />}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {actions.length > 0 && (
        <div className="flex gap-1">
          {actions.map((action, index) => (
            <Button
              key={index}
              icon={action.icon}
              severity={action.severity}
              size="small"
              text
              onClick={action.onClick}
              disabled={action.disabled}
              tooltip={action.tooltip}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={cn('border rounded-lg', className)}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton width="1.5rem" height="1.5rem" borderRadius="50%" />
            <div className="space-y-1 flex-1">
              <Skeleton width="40%" height="1rem" />
              <Skeleton width="60%" height="0.875rem" />
            </div>
          </div>
        </div>
        <div className="p-4">
          <Skeleton width="100%" height="4rem" />
        </div>
      </div>
    );
  }

  return (
    <Panel
      ref={ref}
      header={headerTemplate}
      collapsed={!expanded}
      onToggle={(e) => setExpanded(e.value)}
      toggleable={toggleable}
      className={cn('border rounded-lg', className)}
      {...props}
    >
      {children}
    </Panel>
  );
});

ExpandableCard.displayName = 'ExpandableCard';

// Utilitários para cards
export const cardUtils = {
  /**
   * Cria ações comuns para cards
   */
  createActions: {
    edit: (onClick: () => void): CardAction => ({
      label: 'Editar',
      icon: 'pi pi-pencil',
      onClick,
      severity: 'warning',
      tooltip: 'Editar'
    }),
    delete: (onClick: () => void): CardAction => ({
      label: 'Excluir',
      icon: 'pi pi-trash',
      onClick,
      severity: 'danger',
      tooltip: 'Excluir'
    }),
    view: (onClick: () => void): CardAction => ({
      label: 'Visualizar',
      icon: 'pi pi-eye',
      onClick,
      severity: 'info',
      tooltip: 'Visualizar'
    }),
    duplicate: (onClick: () => void): CardAction => ({
      label: 'Duplicar',
      icon: 'pi pi-copy',
      onClick,
      severity: 'secondary',
      tooltip: 'Duplicar'
    })
  },

  /**
   * Formatadores para métricas
   */
  formatters: {
    currency: (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value),
    
    percentage: (value: number) => `${value.toFixed(1)}%`,
    
    number: (value: number) => value.toLocaleString('pt-BR'),
    
    compact: (value: number) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toString();
    }
  },

  /**
   * Calcula tendência
   */
  calculateTrend: (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  }
};

export {
  Card,
  MetricCard,
  ExpandableCard
};

export type {
  CardProps,
  MetricCardProps,
  ExpandableCardProps
};
