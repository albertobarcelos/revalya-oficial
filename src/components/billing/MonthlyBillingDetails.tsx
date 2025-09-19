import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Package, Wrench, CreditCard, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyBillingDetailsProps {
  contractId: string;
  onClose?: () => void;
}

interface BillingItem {
  id: string;
  type: 'service' | 'product';
  description: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method?: string;
  billing_type?: string;
  due_date?: string;
  tax_rate?: number;
  tax_amount?: number;
}

interface MonthlyBillingData {
  items: BillingItem[];
  total_amount: number;
  total_tax: number;
  net_amount: number;
  contract_info: {
    contract_number: string;
    customer_name: string;
    billing_day: number;
  };
}

/**
 * Componente que exibe os detalhes de faturamento mensal de um contrato
 * Mostra serviços e produtos que serão faturados no mês atual
 */
export function MonthlyBillingDetails({ contractId, onClose }: MonthlyBillingDetailsProps) {
  const [billingData, setBillingData] = useState<MonthlyBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca os dados de faturamento mensal do contrato
   */
  useEffect(() => {
    const fetchMonthlyBillingData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados do contrato com serviços e produtos
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select(`
            id,
            contract_number,
            billing_day,
            customers!inner(
              id,
              name
            ),
            contract_services(
              id,
              description,
              quantity,
              unit_price,
              total_amount,
              payment_method,
              billing_type,
              tax_rate,
              tax_amount,
              is_active
            ),
            contract_products(
              id,
              description,
              quantity,
              unit_price,
              total_amount,
              payment_method,
              billing_type,
              tax_rate,
              tax_amount,
              is_active
            )
          `)
          .eq('id', contractId)
          .single();

        if (contractError) {
          throw new Error(`Erro ao buscar contrato: ${contractError.message}`);
        }

        if (!contractData) {
          throw new Error('Contrato não encontrado');
        }

        // Processar serviços ativos
        const services: BillingItem[] = (contractData.contract_services || [])
          .filter((service: any) => service.is_active)
          .map((service: any) => ({
            id: service.id,
            type: 'service' as const,
            description: service.description || 'Serviço sem descrição',
            quantity: service.quantity || 1,
            unit_price: service.unit_price || 0,
            total_amount: service.total_amount || 0,
            payment_method: service.payment_method,
            billing_type: service.billing_type,
            tax_rate: service.tax_rate || 0,
            tax_amount: service.tax_amount || 0
          }));

        // Processar produtos ativos
        const products: BillingItem[] = (contractData.contract_products || [])
          .filter((product: any) => product.is_active)
          .map((product: any) => ({
            id: product.id,
            type: 'product' as const,
            description: product.description || 'Produto sem descrição',
            quantity: product.quantity || 1,
            unit_price: product.unit_price || 0,
            total_amount: product.total_amount || 0,
            payment_method: product.payment_method,
            billing_type: product.billing_type,
            tax_rate: product.tax_rate || 0,
            tax_amount: product.tax_amount || 0
          }));

        // Combinar serviços e produtos
        const allItems = [...services, ...products];

        // Calcular totais
        const total_amount = allItems.reduce((sum, item) => sum + item.total_amount, 0);
        const total_tax = allItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
        const net_amount = total_amount - total_tax;

        // Calcular data de vencimento baseada no billing_day
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const dueDate = new Date(currentYear, currentMonth, contractData.billing_day);
        
        // Se o dia já passou no mês atual, usar o próximo mês
        if (dueDate < currentDate) {
          dueDate.setMonth(currentMonth + 1);
        }

        setBillingData({
          items: allItems.map(item => ({
            ...item,
            due_date: dueDate.toISOString()
          })),
          total_amount,
          total_tax,
          net_amount,
          contract_info: {
            contract_number: contractData.contract_number,
            customer_name: contractData.customers?.name || 'Cliente não informado',
            billing_day: contractData.billing_day
          }
        });
      } catch (err) {
        console.error('Erro ao buscar dados de faturamento:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchMonthlyBillingData();
    }
  }, [contractId]);

  /**
   * Formata valores monetários
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

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
      {/* Cabeçalho com informações do contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Faturamento Mensal - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Contrato</p>
              <p className="font-medium">{billingData.contract_info.contract_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium">{billingData.contract_info.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vencimento</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Dia {billingData.contract_info.billing_day}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens a Faturar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingData.items.map((item, index) => (
              <div key={item.id}>
                <div className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.type === 'service' ? (
                        <Wrench className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Package className="h-4 w-4 text-green-500" />
                      )}
                      <Badge variant={item.type === 'service' ? 'default' : 'secondary'}>
                        {item.type === 'service' ? 'Serviço' : 'Produto'}
                      </Badge>
                    </div>
                    
                    <h4 className="font-medium mb-1">{item.description}</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
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
                  
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(item.total_amount)}
                    </p>
                    {item.due_date && (
                      <p className="text-sm text-gray-500">
                        Venc: {format(new Date(item.due_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                
                {index < billingData.items.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(billingData.total_amount)}</span>
            </div>
            
            {billingData.total_tax > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Impostos:</span>
                <span className="font-medium">-{formatCurrency(billingData.total_tax)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total Líquido:</span>
              <span className="text-primary">{formatCurrency(billingData.net_amount)}</span>
            </div>
            
            <div className="text-sm text-gray-500 text-center mt-4">
              {billingData.items.length} {billingData.items.length === 1 ? 'item' : 'itens'} para faturamento
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}