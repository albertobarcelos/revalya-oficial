'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useCNPJBackgroundOptional } from '@/providers/CNPJBackgroundProvider';

// AIDEV-NOTE: Componente para mostrar status de consultas CNPJ em background
// Exibe indicadores visuais do progresso das consultas

interface CNPJStatusIndicatorProps {
  customerId?: string;
  showDetails?: boolean;
  className?: string;
}

interface ConsultaStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export function CNPJStatusIndicator({ 
  customerId, 
  showDetails = false,
  className = '' 
}: CNPJStatusIndicatorProps) {
  const cnpjBackground = useCNPJBackgroundOptional();
  const [consultaStatus, setConsultaStatus] = useState<ConsultaStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // AIDEV-NOTE: Verifica status da consulta se customerId for fornecido
  const checkStatus = async () => {
    if (!customerId || !cnpjBackground) return;
    
    setIsChecking(true);
    try {
      const status = await cnpjBackground.checkConsultaStatus(customerId);
      setConsultaStatus(status);
    } catch (error) {
      console.error('Erro ao verificar status da consulta:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // AIDEV-NOTE: Verifica status automaticamente e a cada 10 segundos
  useEffect(() => {
    if (customerId) {
      checkStatus();
      
      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [customerId, cnpjBackground]);

  // AIDEV-NOTE: Renderiza indicador de status global se não houver customerId
  if (!customerId) {
    if (!cnpjBackground) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={cnpjBackground.isProcessing ? "default" : "secondary"}
              className={`flex items-center gap-1 ${className}`}
            >
              {cnpjBackground.isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processando CNPJ
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  CNPJ Inativo
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {cnpjBackground.isProcessing 
                ? 'Processamento automático de CNPJ ativo'
                : 'Processamento automático de CNPJ inativo'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // AIDEV-NOTE: Renderiza status específico da consulta
  if (isChecking) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  if (!consultaStatus) {
    return null; // Nenhuma consulta pendente
  }

  // AIDEV-NOTE: Determina ícone e cor baseado no status
  const getStatusConfig = () => {
    switch (consultaStatus.status) {
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          variant: 'secondary' as const,
          text: 'Aguardando',
          description: 'Consulta CNPJ na fila de processamento'
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          variant: 'default' as const,
          text: 'Processando',
          description: 'Consultando dados do CNPJ'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          variant: 'default' as const,
          text: 'Concluído',
          description: 'Dados do CNPJ atualizados com sucesso'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          variant: 'destructive' as const,
          text: 'Falhou',
          description: consultaStatus.error_message || 'Erro ao consultar CNPJ'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          variant: 'secondary' as const,
          text: 'Desconhecido',
          description: 'Status desconhecido'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={statusConfig.variant}
              className="flex items-center gap-1"
            >
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{statusConfig.description}</p>
              {showDetails && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Tentativas: {consultaStatus.attempts}/3
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criado: {new Date(consultaStatus.created_at).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* AIDEV-NOTE: Botão para reprocessar se falhou */}
      {consultaStatus.status === 'failed' && cnpjBackground && (
        <Button
          size="sm"
          variant="outline"
          onClick={cnpjBackground.forceReprocessFailed}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
