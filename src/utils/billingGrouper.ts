// AIDEV-NOTE: Utilitário para agrupar serviços e produtos com métodos de pagamento iguais
// Implementa a lógica de juntar cobranças quando as condições de pagamento são idênticas

/**
 * AIDEV-NOTE: Utilitário para agrupamento de serviços e produtos por configuração de pagamento
 * 
 * Este módulo é responsável por agrupar serviços e produtos que possuem configurações
 * de pagamento idênticas, permitindo a criação de cobranças consolidadas.
 * 
 * Funcionalidades principais:
 * - Geração de chave única baseada na configuração de pagamento
 * - Agrupamento de itens com configurações idênticas
 * - Cálculo de valores totais por grupo
 * - Geração de descrições e datas de vencimento
 * 
 * CORREÇÕES IMPLEMENTADAS (2025-01-27):
 * =====================================
 * 
 * PROBLEMA IDENTIFICADO:
 * - Serviços e produtos não estavam sendo agrupados mesmo com configurações idênticas
 * - Causa: Inconsistência nos valores padrão entre serviços e produtos
 * - Serviços: due_days = undefined, due_next_month = undefined
 * - Produtos: due_days = 5, due_next_month = false
 * - Resultado: Chaves de agrupamento diferentes impediam consolidação
 * 
 * SOLUÇÃO IMPLEMENTADA:
 * - Padronização de valores padrão para ambos os tipos:
 *   * due_days: 5 (quando não especificado)
 *   * due_next_month: false (quando não especificado)
 * - Remoção de warnings desnecessários para produtos
 * - Adição de logs para monitorar agrupamento misto (serviços + produtos)
 * 
 * RESULTADO ESPERADO:
 * - Serviços e produtos com configurações equivalentes agora são agrupados
 * - Redução no número de cobranças geradas
 * - Melhor organização financeira para o cliente
 */

export interface PaymentGroup {
  id: string;
  payment_method: string;
  card_type?: string;
  billing_type: string;
  recurrence_frequency?: string;
  installments: number;
  due_date_type: string;
  due_days?: number;
  due_day?: number;
  due_next_month?: boolean;
  items: Array<{
    id: string;
    type: 'service' | 'product';
    name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
  }>;
  total_amount: number;
}

export interface PaymentConfig {
  payment_method: string;
  card_type?: string;
  billing_type: string;
  recurrence_frequency?: string;
  installments: number;
  due_date_type: string;
  due_days?: number;
  due_day?: number;
  due_next_month?: boolean;
}

/**
 * AIDEV-NOTE: Gera uma chave única para agrupar itens com configurações de pagamento EXATAMENTE idênticas
 * Considera todos os campos relevantes para determinar se dois itens podem ser agrupados
 * IMPORTANTE: Só agrupa se TODAS as condições forem exatamente iguais
 */
function generatePaymentKey(config: PaymentConfig): string {
  const {
    payment_method,
    card_type,
    billing_type,
    recurrence_frequency,
    installments,
    due_date_type,
    due_days,
    due_day,
    due_next_month
  } = config;

  // AIDEV-NOTE: Normalizar valores para garantir consistência na comparação
  const normalizedPaymentMethod = payment_method?.toLowerCase() || 'undefined';
  const normalizedCardType = card_type?.toLowerCase() || 'undefined';
  const normalizedBillingType = billing_type?.toLowerCase() || 'undefined';
  const normalizedInstallments = installments || 1;

  // AIDEV-NOTE: Para PIX, boleto e transferência, parcelas sempre devem ser 1
  // Se for diferente de 1, criar chave única para evitar agrupamento incorreto
  if (['pix', 'boleto', 'transferência'].includes(normalizedPaymentMethod) && normalizedInstallments !== 1) {
    return `${normalizedPaymentMethod}-${normalizedCardType}-${normalizedInstallments}-${normalizedBillingType}-unique-${Date.now()}`;
  }

  return [
    normalizedPaymentMethod,
    normalizedCardType,
    normalizedBillingType,
    recurrence_frequency || 'undefined',
    normalizedInstallments,
    due_date_type || 'undefined',
    due_days || 'undefined',
    due_day || 'undefined',
    due_next_month || false
  ].join('|');
}

/**
 * AIDEV-NOTE: Agrupa serviços e produtos por configurações de pagamento EXATAMENTE idênticas
 * REGRA CRÍTICA: Só agrupa se TODAS as condições forem iguais:
 * - Método de pagamento (PIX, Boleto, Cartão, etc.)
 * - Tipo de cartão (se aplicável)
 * - Número de parcelas (PIX à vista ≠ PIX parcelado)
 * - Tipo de faturamento
 * - Todas as demais configurações de vencimento
 * 
 * Exemplo: PIX à vista (1x) NÃO agrupa com PIX parcelado (2x)
 * Retorna grupos onde cada grupo representa uma cobrança única a ser gerada
 */
export function groupItemsByPaymentConfig(
  services: any[] = [],
  products: any[] = []
): PaymentGroup[] {
  const groups = new Map<string, PaymentGroup>();

  // AIDEV-NOTE: Processar serviços - agrupamento apenas com configurações EXATAMENTE idênticas
  services.forEach((service, index) => {
    const config: PaymentConfig = {
      payment_method: service.payment_method || 'Boleto',
      card_type: service.card_type,
      billing_type: service.billing_type || 'Único',
      recurrence_frequency: service.recurrence_frequency,
      installments: service.installments || 1,
      due_date_type: service.due_date_type || 'days_after_billing',
      due_days: service.due_days !== undefined ? service.due_days : 5, // AIDEV-NOTE: Padronizar com produtos
      due_day: service.due_day,
      due_next_month: service.due_next_month || false // AIDEV-NOTE: Padronizar com produtos
    };

    // AIDEV-NOTE: Gerar chave única baseada em TODAS as configurações
    const key = generatePaymentKey(config);
    
    if (!groups.has(key)) {
      groups.set(key, {
        id: `group_${index}`,
        ...config,
        items: [],
        total_amount: 0
      });
    }

    const group = groups.get(key)!;
    const itemTotal = service.total_amount || (service.quantity * service.unit_price);
    
    group.items.push({
      id: service.id || `service_${index}`,
      type: 'service',
      name: service.name || service.description,
      quantity: service.quantity || 1,
      unit_price: service.unit_price || 0,
      total_amount: itemTotal
    });
    
    group.total_amount += itemTotal;
  });

  // AIDEV-NOTE: Processar produtos - usar configurações financeiras salvas no produto
  // IMPORTANTE: Usar EXATAMENTE os mesmos valores padrão que serviços para permitir agrupamento
  products.forEach((product, index) => {
    // AIDEV-NOTE: Usar configurações financeiras do produto ou fallback idêntico aos serviços
    const config: PaymentConfig = {
      payment_method: product.payment_method || 'Boleto',
      card_type: product.card_type,
      billing_type: product.billing_type || 'Único',
      recurrence_frequency: product.recurrence_frequency,
      installments: product.installments || 1,
      due_date_type: product.due_date_type || 'days_after_billing',
      due_days: product.due_days !== undefined ? product.due_days : 5, // AIDEV-NOTE: Idêntico aos serviços
      due_day: product.due_day,
      due_next_month: product.due_next_month || false // AIDEV-NOTE: Idêntico aos serviços
    };
    
    console.log(`💰 Produto ${product.product?.name || product.description}: payment_method=${config.payment_method}, valor=${product.total_amount || (product.quantity * product.unit_price)}`);

    // AIDEV-NOTE: Chave para produtos sempre será a mesma (configuração padrão)
    const key = generatePaymentKey(config);
    
    if (!groups.has(key)) {
      groups.set(key, {
        id: `group_product_${index}`,
        ...config,
        items: [],
        total_amount: 0
      });
    }

    const group = groups.get(key)!;
    const itemTotal = product.total_amount || (product.quantity * product.unit_price);
    
    group.items.push({
      id: product.id || `product_${index}`,
      type: 'product',
      name: product.product?.name || product.name || product.description,
      quantity: product.quantity || 1,
      unit_price: product.unit_price || 0,
      total_amount: itemTotal
    });
    
    group.total_amount += itemTotal;
  });

  // AIDEV-NOTE: Retornar grupos organizados por chave de pagamento
  const result = Array.from(groups.values());
  console.log(`📊 Agrupamento concluído: ${result.length} grupos criados`);
  
  // AIDEV-NOTE: Log detalhado para verificar agrupamento de serviços e produtos
  result.forEach((group, index) => {
    const servicesCount = group.items.filter(item => item.type === 'service').length;
    const productsCount = group.items.filter(item => item.type === 'product').length;
    if (servicesCount > 0 && productsCount > 0) {
      console.log(`✅ Grupo ${index + 1}: ${servicesCount} serviços + ${productsCount} produtos agrupados com sucesso`);
    }
  });
  
  return result;
}

/**
 * AIDEV-NOTE: Gera descrição detalhada para a cobrança agrupada
 * Lista todos os itens incluídos no grupo para transparência
 */
export function generateGroupDescription(
  group: PaymentGroup,
  contractNumber: string,
  referenceMonth: string
): string {
  const itemsDescription = group.items
    .map(item => `${item.name} (${item.quantity}x)`)
    .join(', ');

  return `Faturamento ${referenceMonth} - Contrato ${contractNumber} - ${itemsDescription}`;
}

/**
 * AIDEV-NOTE: Calcula data de vencimento baseada na configuração do grupo
 * Usa a mesma lógica da implementação atual, mas aplicada ao grupo
 */
export function calculateGroupDueDate(
  group: PaymentGroup,
  billingDate: Date = new Date()
): Date {
  if (group.due_date_type === 'days_after_billing') {
    const dueDate = new Date(billingDate);
    dueDate.setDate(dueDate.getDate() + (group.due_days || 5));
    return dueDate;
  } else if (group.due_date_type === 'fixed_day') {
    const dueDate = new Date(billingDate);
    const targetDay = group.due_day || 10;
    
    if (group.due_next_month) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    dueDate.setDate(targetDay);
    
    // Se a data já passou no mês atual e não é próximo mês, vai para o próximo
    if (!group.due_next_month && dueDate < billingDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    return dueDate;
  }
  
  // Fallback: 5 dias após o faturamento
  const dueDate = new Date(billingDate);
  dueDate.setDate(dueDate.getDate() + 5);
  return dueDate;
}

/**
 * AIDEV-NOTE: Mapeia método de pagamento do grupo para tipo de cobrança
 * Mantém compatibilidade com a função existente
 */
export function mapGroupPaymentMethodToChargeType(group: PaymentGroup): string {
  const paymentMethod = group.payment_method;
  
  if (!paymentMethod) return 'BOLETO';
  
  switch (paymentMethod.toLowerCase()) {
    case 'cartão':
      return 'CREDIT_CARD';
    case 'pix':
      return 'PIX';
    case 'transferência':
    case 'bank_transfer':
      return 'BOLETO';
    case 'boleto':
    case 'bank_slip':
      return 'BOLETO';
    case 'dinheiro':
    case 'cash':
      return 'CASH';
    default:
      return 'BOLETO';
  }
}
