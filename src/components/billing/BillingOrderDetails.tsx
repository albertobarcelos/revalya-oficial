import React, { useMemo } from 'react';
import { useBillingOrder, type BillingOrder } from '@/hooks/useBillingOrder';
import { ContractForm } from '@/components/contracts/ContractForm';
import { ContractFormConfig } from '@/components/contracts/types/ContractFormConfig';
import { ContractFormSkeleton } from '@/components/contracts/ContractFormSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BillingOrderDetailsProps {
  periodId: string;
  onClose?: () => void;
}

/**
 * AIDEV-NOTE: Componente para exibir detalhes da ordem de faturamento
 * Reutiliza o ContractForm completo, adaptando apenas o necessário
 * 
 * Lógica:
 * - Se ordem está faturada (isFrozen = true): mostra dados congelados de contract_billings
 * - Se ordem está pendente (isFrozen = false): mostra dados dinâmicos do contrato
 */
export function BillingOrderDetails({ periodId, onClose }: BillingOrderDetailsProps) {
  const { data: order, isLoading, error } = useBillingOrder({ periodId });

  // AIDEV-NOTE: Configuração do ContractForm adaptada para ordem de faturamento
  const config: ContractFormConfig = useMemo(() => {
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
          hideVigenceFields: true, // AIDEV-NOTE: Oculta campos de vigência na Ordem de Serviço
        },
        callbacks: {
          onCancel: onClose || (() => {}),
          onSuccess: () => {},
        },
        labels: {
          title: 'Ordem de Faturamento',
          fields: {
            contractNumber: 'Nº da Ordem de Faturamento', // AIDEV-NOTE: Customiza label do campo
            billingDay: 'Previsão de Faturamento', // AIDEV-NOTE: Customiza label do campo
          },
        },
        useBillingDatePicker: true, // AIDEV-NOTE: Usa calendário para Previsão de Faturamento
        fromBilling: true,
      };
    }

    return {
      mode: 'view', // AIDEV-NOTE: Sempre modo view para ordens (somente leitura)
      context: 'billing',
      contractId: order.contract_id, // AIDEV-NOTE: Passa contract_id para carregar dados do contrato
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
        title: order.order_number 
          ? `Ordem de Serviço N° ${order.order_number}`
          : order.billing_number 
            ? `Ordem de Faturamento N° ${order.billing_number}`
            : 'Ordem de Faturamento',
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
        contract_number: order.order_number || order.billing_number || order.contract_number,
        customer_id: order.customer_id,
      },
    };
  }, [order, onClose]);

  if (isLoading) {
    return (
      <div className="h-full">
        <ContractFormSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error?.message || 'Erro ao carregar ordem de faturamento'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // AIDEV-NOTE: Mensagem do subtítulo baseada no estado da ordem
  const subtitleMessage = order.isFrozen
    ? "Esta ordem já foi faturada e está congelada. Alterações no contrato não afetarão esta ordem."
    : "Esta ordem está pendente e reflete os dados atuais do contrato. Alterações no contrato serão refletidas aqui até que seja faturada.";

  // AIDEV-NOTE: Atualizar config com subtítulo customizado
  const configWithSubtitle = useMemo(() => ({
    ...config,
    labels: {
      ...config.labels,
      subtitle: subtitleMessage, // AIDEV-NOTE: Adiciona subtítulo customizado
    },
  }), [config, subtitleMessage]);

  return (
    <div className="h-full flex flex-col">
      {/* AIDEV-NOTE: Usa o ContractForm completo com configuração adaptada */}
      <div className="flex-1 min-h-0">
        <ContractForm config={configWithSubtitle} />
      </div>
    </div>
  );
}
