// AIDEV-NOTE: Componente modular para badge de status
// Responsabilidade única: exibição visual de status de conexão

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { STATUS_LABELS } from '../constants';

interface StatusBadgeProps {
  status: ConnectionStatus;
  isActive: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  isActive,
  showIcon = true,
  size = 'md',
  className = ''
}: StatusBadgeProps) {
  // AIDEV-NOTE: Determinar variante do badge baseado no status
  const getBadgeVariant = () => {
    if (!isActive) return 'secondary';
    
    switch (status) {
      case 'connected':
        return 'default'; // Verde
      case 'connecting':
        return 'outline'; // Neutro
      case 'disconnected':
      default:
        return 'destructive'; // Vermelho
    }
  };

  // AIDEV-NOTE: Determinar ícone baseado no status
  const getStatusIcon = () => {
    if (!showIcon) return null;
    
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    if (!isActive) {
      return <WifiOff className={`${iconSize} mr-1`} />;
    }
    
    switch (status) {
      case 'connected':
        return <Wifi className={`${iconSize} mr-1 text-green-600`} />;
      case 'connecting':
        return <Loader2 className={`${iconSize} mr-1 animate-spin text-blue-600`} />;
      case 'disconnected':
      default:
        return <AlertCircle className={`${iconSize} mr-1 text-red-600`} />;
    }
  };

  // AIDEV-NOTE: Determinar texto do status
  const getStatusText = () => {
    if (!isActive) return STATUS_LABELS.INACTIVE;
    
    return STATUS_LABELS[status.toUpperCase() as keyof typeof STATUS_LABELS] || STATUS_LABELS.DISCONNECTED;
  };

  // AIDEV-NOTE: Determinar classes de tamanho
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-3 py-2';
      case 'md':
      default:
        return 'text-xs px-2.5 py-1.5';
    }
  };

  return (
    <Badge 
      variant={getBadgeVariant()} 
      className={`inline-flex items-center ${getSizeClasses()} ${className}`}
    >
      {getStatusIcon()}
      {getStatusText()}
    </Badge>
  );
}