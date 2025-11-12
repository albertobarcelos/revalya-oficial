/**
 * 🔐 Componente Seguro para Detalhes do Faturamento Mensal
 * 
 * AIDEV-NOTE: Componente refatorado para seguir diretrizes de segurança multi-tenant.
 * Corrige inconsistências na exibição de dados implementando isolamento completo entre tenants.
 * 
 * Este componente agora:
 * - Usa useSecureMonthlyBilling para consultas seguras
 * - Implementa validação de acesso multi-tenant
 * - Garante isolamento de dados por tenant_id
 * - Inclui logs de auditoria obrigatórios
 * - Previne vazamento de dados entre tenants
 */

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  CalendarDays, 
  Clock, 
  CreditCard, 
  Package, 
  Wrench,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSecureMonthlyBilling } from '@/hooks/useSecureMonthlyBilling';

interface MonthlyBillingDetailsProps {
  contractId: string;
  onClose?: () => void;
}

export function MonthlyBillingDetails({ contractId, onClose }: MonthlyBillingDetailsProps) {
  // AIDEV-NOTE: Hook seguro que implementa as 5 camadas de segurança multi-tenant
  const { billingData, isLoading: loading, error, refetch } = useSecureMonthlyBilling({
    contractId,
    enabled: !!contractId
  });

  // AIDEV-NOTE: Debug log para verificar dados recebidos
  console.log('🔍 [BILLING MODAL DEBUG] Estado do componente:', {
    contractId,
    hasContractId: !!contractId,
    loading,
    hasBillingData: !!billingData,
    hasError: !!error,
    errorMessage: error?.message,
    billingDataKeys: billingData ? Object.keys(billingData) : null,
    itemsCount: billingData?.items?.length || 0
  });

  // AIDEV-NOTE: Log adicional quando dados mudam
  useEffect(() => {
    console.log('🔄 [BILLING MODAL DEBUG] Dados de faturamento atualizados:', {
      contractId,
      billingData: billingData ? {
        contractInfo: billingData.contractInfo,
        itemsCount: billingData.items?.length || 0,
        totalAmount: billingData.totalAmount,
        dueDate: billingData.dueDate
      } : null,
      loading,
      error: error?.message
    });
  }, [billingData, loading, error, contractId]);

  // 🔍 DEBUG: Log temporário para verificar dados recebidos no componente
  React.useEffect(() => {
    if (billingData?.items) {
      console.log('🔍 [DEBUG] Dados recebidos no componente:', billingData.items.map(item => ({
        id: item.id,
        type: item.type,
        description: item.description,
        generate_billing: item.generate_billing,
        generate_billing_type: typeof item.generate_billing
      })));
    }
  }, [billingData]);

  /**
   * Formata valor monetário para exibição
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  /**
   * Formata método de pagamento para exibição
   */
  const formatPaymentMethod = (method?: string) => {
    if (!method) return 'Não informado';
    
    const methods: Record<string, string> = {
      'Cartão': 'Cartão de Crédito',
      'PIX': 'PIX',
      'Boleto': 'Boleto Bancário',
      'Transferência': 'Transferência Bancária',
      'Dinheiro': 'Dinheiro'
    };
    
    return methods[method] || method;
  };

  /**
   * Formata tipo de faturamento para exibição
   */
  const formatBillingType = (type?: string) => {
    if (!type) return 'Não informado';
    
    const types: Record<string, string> = {
      'Mensal': 'Mensal',
      'Trimestral': 'Trimestral',
      'Semestral': 'Semestral',
      'Anual': 'Anual',
      'Único': 'Pagamento Único'
    };
    
    return types[type] || type;
  };

  /**
   * getItemAccent
   * Define classes utilitárias para acentos de cor nos itens (serviço/produto)
   * com foco em um visual profissional e clean: barra vertical de 2px,
   * badge com tom suave e ícone em fundo leve.
   */
  const getItemAccent = (type: 'service' | 'product') => {
    if (type === 'service') {
      return {
        bar: 'bg-blue-500',
        iconBg: 'bg-blue-50 text-blue-600',
        badge: 'bg-green-50 text-green-700',
        price: 'text-blue-700'
      };
    }
    return {
      bar: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600',
      badge: 'bg-green-50 text-green-700',
      price: 'text-emerald-700'
    };
  };

  // 🔄 ESTADO DE CARREGAMENTO
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🚨 ESTADO DE ERRO
  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button 
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 📭 ESTADO VAZIO
  if (!billingData || billingData.items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">Nenhum item para faturamento</p>
            <p className="text-sm mt-1">Este contrato não possui serviços ou produtos ativos para o mês atual.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📋 Cabeçalho com informações do contrato */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5 text-gray-700" />
            Faturamento Mensal - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Contrato</p>
              <p className="text-sm font-medium text-gray-900">{billingData.contract_info.contract_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cliente</p>
              <p className="text-sm font-medium text-gray-900">{billingData.contract_info.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vencimento</p>
              <p className="text-sm font-medium flex items-center gap-1 text-gray-900">
                <Clock className="h-4 w-4 text-gray-700" />
                Dia {billingData.contract_info.billing_day}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📝 Lista de itens */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900">Itens a Faturar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {billingData.items.map((item, index) => {
              const accent = getItemAccent(item.type as 'service' | 'product');
              return (
                <div key={item.id}>
                  {/* Linha do item com layout compacto e badge de cobrança alinhada ao preço */}
                  <div className="group relative p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    {/* Barra de acento à esquerda */}
                    <div className={`absolute left-0 top-0 h-full w-[2px] ${accent.bar} rounded-l-lg`} />

                    <div className="flex items-start justify-between gap-4">
                      {/* Bloco esquerdo: ícone, tipo e descrição */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`h-7 w-7 flex items-center justify-center rounded-md ${accent.iconBg}`}>
                            {item.type === 'service' ? (
                              <Wrench className="h-4 w-4" />
                            ) : (
                              <Package className="h-4 w-4" />
                            )}
                          </div>
                          <Badge variant={item.type === 'service' ? 'default' : 'secondary'} className="text-xs">
                            {item.type === 'service' ? 'Serviço' : 'Produto'}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-900">{item.description}</h4>

                        {/* Metadados em grade compacta */}
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Quantidade:</span> {item.quantity}
                          </div>
                          <div>
                            <span className="font-medium">Valor Unit.:</span> {formatCurrency(item.unit_price)}
                          </div>
                          <div>
                            <span className="font-medium">Pagamento:</span> {formatPaymentMethod(item.payment_method)}
                          </div>
                          <div>
                            <span className="font-medium">Tipo:</span> {formatBillingType(item.billing_type)}
                          </div>
                        </div>

                        {item.tax_amount && item.tax_amount > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Impostos:</span> {formatCurrency(item.tax_amount)} ({item.tax_rate}%)
                          </div>
                        )}
                      </div>

                      {/* Bloco direito: preço e badge de cobrança */}
                      <div className="flex flex-col items-end min-w-[180px]">
                        <p className={`text-lg font-bold ${accent.price}`}>{formatCurrency(item.total_amount)}</p>
                        {item.due_date && (
                          <p className="text-xs text-gray-500">Venc: {format(new Date(item.due_date), 'dd/MM/yyyy')}</p>
                        )}
                        <div className="mt-2">
                          {item.generate_billing ? (
                            <motion.div
                              initial={{ opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${accent.badge}`}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Cobrança Automática
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium"
                            >
                              <XCircle className="h-3 w-3" />
                              Cobrança Manual
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < billingData.items.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 💰 Resumo financeiro */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CreditCard className="h-5 w-5 text-gray-700" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(billingData.total_amount)}</span>
            </div>
            
            {billingData.total_tax > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Impostos:</span>
                <span className="font-medium">-{formatCurrency(billingData.total_tax)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total Líquido:</span>
              <span className="text-primary">{formatCurrency(billingData.net_amount)}</span>
            </div>
            
            <div className="text-xs text-gray-500 text-center mt-4">
              {billingData.items.length} {billingData.items.length === 1 ? 'item' : 'itens'} para faturamento
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}