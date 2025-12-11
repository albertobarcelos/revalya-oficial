import React, { useMemo, useCallback } from 'react';
import { useBillingOrder, type BillingOrderErrorType, type BillingOrderError, type BillingOrder } from '@/hooks/useBillingOrder';
import { useStandalonePeriod } from '@/hooks/useStandalonePeriod';
import { type StandaloneBillingPeriod } from '@/services/standaloneBillingService';
import { Button } from '@/components/ui/button';
import { ContractForm } from '@/components/contracts/ContractForm';
import { ContractFormConfig } from '@/components/contracts/types/ContractFormConfig';
import { ContractFormSkeleton } from '@/components/contracts/ContractFormSkeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, FileWarning, UserX, FileX } from 'lucide-react';

// AIDEV-NOTE: Configuração de mensagens de erro amigáveis por tipo
const ERROR_MESSAGES: Record<BillingOrderErrorType, { title: string; description: string; icon: React.ReactNode }> = {
  PERIOD_NOT_FOUND: {
    title: 'Período não encontrado',
    description: 'O período de faturamento solicitado não foi encontrado. Ele pode ter sido removido ou você não tem permissão para acessá-lo.',
    icon: <FileX className="h-5 w-5" />,
  },
  CONTRACT_NOT_FOUND: {
    title: 'Contrato não encontrado',
    description: 'O contrato associado a este período não foi encontrado. Verifique se o contrato ainda existe.',
    icon: <FileWarning className="h-5 w-5" />,
  },
  CUSTOMER_NOT_FOUND: {
    title: 'Cliente não encontrado',
    description: 'O cliente associado a este contrato não foi encontrado. Verifique se o cadastro do cliente está correto.',
    icon: <UserX className="h-5 w-5" />,
  },
  STANDALONE_PERIOD: {
    title: 'Faturamento avulso',
    description: 'Este é um faturamento avulso e será exibido em um formato diferente.',
    icon: <FileWarning className="h-5 w-5" />,
  },
  PERMISSION_DENIED: {
    title: 'Acesso negado',
    description: 'Você não tem permissão para visualizar este período de faturamento.',
    icon: <AlertCircle className="h-5 w-5" />,
  },
  NETWORK_ERROR: {
    title: 'Erro de conexão',
    description: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
    icon: <AlertCircle className="h-5 w-5" />,
  },
  UNKNOWN_ERROR: {
    title: 'Erro inesperado',
    description: 'Ocorreu um erro inesperado ao carregar os dados. Tente novamente ou entre em contato com o suporte.',
    icon: <AlertCircle className="h-5 w-5" />,
  },
};

/**
 * AIDEV-NOTE: Função auxiliar para determinar o tipo de erro
 */
const getErrorType = (error: any): BillingOrderErrorType => {
  // Se é um erro tipado do hook
  if (error?.type && Object.keys(ERROR_MESSAGES).includes(error.type)) {
    return error.type as BillingOrderErrorType;
  }
  
  // Detectar erro de rede
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'NETWORK_ERROR';
  }
  
  // Detectar erro de permissão
  if (error?.message?.includes('permission') || error?.message?.includes('denied') || error?.code === 'PGRST301') {
    return 'PERMISSION_DENIED';
  }
  
  return 'UNKNOWN_ERROR';
};

interface BillingOrderDetailsProps {
  periodId: string;
  /** Indica se é um faturamento avulso (standalone). Se fornecido, busca apenas na tabela correta. */
  isStandalone?: boolean;
  onClose?: () => void;
}

/**
 * AIDEV-NOTE: Componente para exibir detalhes da ordem de faturamento
 * Reutiliza o ContractForm completo, adaptando apenas o necessário
 * 
 * REFATORAÇÃO: Agora recebe isStandalone como prop para evitar busca desnecessária
 * 
 * Lógica:
 * - Se isStandalone = true: busca apenas em standalone_billing_periods
 * - Se isStandalone = false/undefined: busca apenas em contract_billing_periods
 * - Se ordem está faturada (isFrozen = true): mostra dados congelados de contract_billings
 * - Se ordem está pendente (isFrozen = false): mostra dados dinâmicos do contrato
 * - Inclui tratamento de erro específico com opção de retry
 */
export function BillingOrderDetails({ periodId, isStandalone, onClose }: BillingOrderDetailsProps) {
  // AIDEV-NOTE: REFATORAÇÃO - Buscar apenas na tabela correta baseado em isStandalone
  // Se sabemos que é standalone, buscar apenas standalone
  // Se sabemos que é contrato, buscar apenas contract_billing_periods
  // Se não sabemos (undefined), fazer fallback automático (compatibilidade)
  // Isso elimina condições de corrida e queries desnecessárias quando sabemos o tipo
  
  const { data: order, isLoading: orderLoading, error, refetch } = useBillingOrder({ 
    periodId, 
    enabled: isStandalone !== true, // Só buscar se NÃO for standalone (ou undefined para fallback)
    skipStandaloneFallback: isStandalone === false, // AIDEV-NOTE: Só pular fallback se sabemos que NÃO é standalone
  });
  
  // AIDEV-NOTE: Buscar standalone apenas se sabemos que é standalone OU se não sabemos (undefined) para fallback
  const standaloneQuery = useStandalonePeriod((isStandalone === true || isStandalone === undefined) ? periodId : null);
  
  // AIDEV-NOTE: Determinar tipo baseado na prop isStandalone (fonte de verdade)
  // Se isStandalone não foi fornecido (undefined), usar detecção automática como fallback
  const isActuallyStandalone = isStandalone !== undefined 
    ? isStandalone 
    : (order === null && !error && !!standaloneQuery.data);
  
  const isLoading = isActuallyStandalone 
    ? standaloneQuery.isLoading 
    : (orderLoading || (isStandalone === undefined && standaloneQuery.isLoading));

  // AIDEV-NOTE: Callback para tentar novamente
  // AIDEV-NOTE: Refazer apenas a query correta baseado em isActuallyStandalone
  const handleRetry = useCallback(() => {
    console.log('🔄 [BILLING ORDER DETAILS] Tentando novamente...');
    if (isActuallyStandalone) {
      standaloneQuery.refetch();
    } else {
      refetch();
    }
  }, [refetch, standaloneQuery, isActuallyStandalone]);

  // AIDEV-NOTE: Configuração do ContractForm adaptada para ordem de faturamento
  // IMPORTANTE: Este useMemo inclui a lógica do subtitleMessage para evitar
  // chamar hooks condicionalmente (depois de returns antecipados)
  // AIDEV-NOTE: REFATORAÇÃO - Agora usa isActuallyStandalone (baseado na prop ou detecção)
  const config: ContractFormConfig = useMemo(() => {
    // AIDEV-NOTE: Se for standalone, adaptar dados do período standalone
    if (isActuallyStandalone && standaloneQuery.data) {
      const period = standaloneQuery.data as StandaloneBillingPeriod;

      // AIDEV-NOTE: Converter itens do standalone para o formato esperado pelo formulário
      const standaloneItems = period.items || [];
      
      // Separar serviços e produtos
      const services = standaloneItems
        .filter(item => item.service_id && !item.product_id)
        .map(item => ({
          id: item.id,
          service_id: item.service_id,
          name: item.service?.name || item.description || 'Serviço',
          description: item.service?.description || item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_price,
          default_price: item.unit_price,
        }));

      const products = standaloneItems
        .filter(item => item.product_id && !item.service_id)
        .map(item => ({
          id: item.id,
          product_id: item.product_id,
          name: item.product?.name || item.description || 'Produto',
          description: item.product?.description || item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          price: item.unit_price,
          total: item.total_price,
        }));

      return {
        mode: 'view',
        context: 'billing',
        // AIDEV-NOTE: Não há contractId para standalone, mas passamos dados via initialData
        enabledTabs: {
          servico: true,
          produtos: true,
          descontos: false,
          departamentos: false,
          observacoes: true,
          impostos: false,
          recebimentos: false,
        },
        layout: {
          isModal: true,
          fullScreen: true,
          showSidebar: true,
          showHeader: true,
          hideVigenceFields: true,
        },
        callbacks: {
          onCancel: onClose || (() => {}),
          onSuccess: () => {},
        },
        labels: {
          title: period.order_number 
            ? `Ordem de Serviço N° ${period.order_number}`
            : 'Faturamento Avulso',
          subtitle: 'Este é um faturamento avulso. Os dados são somente leitura.',
          fields: {
            contractNumber: 'Nº da Ordem',
            billingDay: 'Data de Faturamento',
          },
        },
        useBillingDatePicker: true,
        fromBilling: true,
        // AIDEV-NOTE: Dados iniciais do período standalone incluindo serviços e produtos
        initialData: {
          contract_number: period.order_number || `AV-${period.id.slice(0, 8)}`,
          customer_id: period.customer_id,
          billing_day: new Date(period.bill_date).getDate(),
          description: period.description || '',
          services: services,
          products: products,
          total_amount: period.amount_planned || 0,
        },
      };
    }

    // AIDEV-NOTE: Se não há order, retornar configuração padrão
    if (!order) {
      return {
        mode: 'view',
        context: 'billing',
        enabledTabs: {
          servico: true,
          produtos: true,
          descontos: false,
          departamentos: false,
          observacoes: false,
          impostos: false,
          recebimentos: true,
        },
        layout: {
          isModal: true,
          fullScreen: true,
          showSidebar: true,
          showHeader: true,
          hideVigenceFields: true,
        },
        callbacks: {
          onCancel: onClose || (() => {}),
          onSuccess: () => {},
        },
        labels: {
          title: 'Ordem de Faturamento',
          subtitle: '',
          fields: {
            contractNumber: 'Nº da Ordem de Faturamento',
            billingDay: 'Previsão de Faturamento',
          },
        },
        useBillingDatePicker: true,
        fromBilling: true,
      };
    }

    // AIDEV-NOTE: Mensagem do subtítulo baseada no estado da ordem
    // Movido para dentro do useMemo para evitar chamar hooks condicionalmente
    const billingOrder = order as BillingOrder;
    const subtitleMessage = billingOrder.isFrozen
      ? "Esta ordem já foi faturada e está congelada. Alterações no contrato não afetarão esta ordem."
      : "Esta ordem está pendente e reflete os dados atuais do contrato. Alterações no contrato serão refletidas aqui até que seja faturada.";

    return {
      mode: 'view', // AIDEV-NOTE: Sempre modo view para ordens (somente leitura)
      context: 'billing',
      contractId: billingOrder.contract_id, // AIDEV-NOTE: Passa contract_id para carregar dados do contrato
      enabledTabs: {
        servico: true, // AIDEV-NOTE: Mostra serviços
        produtos: true, // AIDEV-NOTE: Mostra produtos
        descontos: false, // AIDEV-NOTE: Desabilita abas não relevantes para ordem
        departamentos: false,
        observacoes: false,
        impostos: false,
        recebimentos: true, // AIDEV-NOTE: Mostra histórico de recebimentos
      },
      layout: {
        isModal: true,
        fullScreen: true,
        showSidebar: true, // AIDEV-NOTE: Mostra sidebar com resumo financeiro
        showHeader: true, // AIDEV-NOTE: Mostra header customizado
        hideVigenceFields: true, // AIDEV-NOTE: Oculta campos de vigência na Ordem de Serviço
      },
      callbacks: {
        onCancel: onClose || (() => {}),
        onSuccess: () => {}, // AIDEV-NOTE: Não faz nada pois é modo view
      },
      labels: {
        title: billingOrder.order_number 
          ? `Ordem de Serviço N° ${billingOrder.order_number}`
          : billingOrder.billing_number 
            ? `Ordem de Faturamento N° ${billingOrder.billing_number}`
            : 'Ordem de Faturamento',
        subtitle: subtitleMessage, // AIDEV-NOTE: Subtítulo customizado baseado no estado
        fields: {
          contractNumber: 'Nº da Ordem de Faturamento', // AIDEV-NOTE: Customiza label do campo
          billingDay: 'Previsão de Faturamento', // AIDEV-NOTE: Customiza label do campo
        },
      },
      useBillingDatePicker: true, // AIDEV-NOTE: Usa calendário para Previsão de Faturamento
      fromBilling: true, // AIDEV-NOTE: Indica que veio do faturamento
      // AIDEV-NOTE: Dados iniciais adaptados da ordem
      // Prioriza order_number (número sequencial), depois billing_number, depois contract_number
      initialData: {
        contract_number: billingOrder.order_number || billingOrder.billing_number || billingOrder.contract_number,
        customer_id: billingOrder.customer_id,
      },
    };
  }, [order, onClose, isActuallyStandalone, standaloneQuery.data]);

  if (isLoading) {
    return (
      <div className="h-full">
        <ContractFormSkeleton />
      </div>
    );
  }

  // AIDEV-NOTE: Tratamento de erro específico com UI melhorada e opção de retry
  // AIDEV-NOTE: REFATORAÇÃO - Lógica simplificada baseada em isActuallyStandalone
  // Se isStandalone é undefined, aguardar ambas as queries terminarem antes de mostrar erro
  const shouldShowError = isActuallyStandalone
    ? (standaloneQuery.error || (!standaloneQuery.isLoading && !standaloneQuery.data))
    : (error || (!orderLoading && !order && (isStandalone === false || (!standaloneQuery.isLoading && !standaloneQuery.data))));
  
  if (shouldShowError) {
    // AIDEV-NOTE: Usar erro correto baseado no tipo
    const currentError = isActuallyStandalone ? standaloneQuery.error : error;
    const errorType = getErrorType(currentError);
    const errorConfig = ERROR_MESSAGES[errorType];
    const billingError = currentError as BillingOrderError | null;
    const canRetry = billingError?.canRetry !== false; // Permite retry por padrão

    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {errorConfig.icon}
              </div>
              <div className="flex-1 space-y-2">
                <AlertTitle className="text-sm font-semibold">
                  {errorConfig.title}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {errorConfig.description}
                </AlertDescription>
                {/* AIDEV-NOTE: Mostrar detalhes técnicos apenas em desenvolvimento */}
                {process.env.NODE_ENV === 'development' && currentError?.message && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                    Detalhes: {currentError.message}
                  </p>
                )}
              </div>
            </div>
          </Alert>
          
          {/* AIDEV-NOTE: Botões de ação */}
          <div className="flex gap-2 justify-end">
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            )}
            {canRetry && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* AIDEV-NOTE: Usa o ContractForm completo com configuração adaptada */}
      <div className="flex-1 min-h-0">
        <ContractForm config={config} />
      </div>
    </div>
  );
}
