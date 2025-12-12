/**
 * AIDEV-NOTE: Funções auxiliares para manipulação de itens de faturamento
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import type { BillingItem } from '@/types/billing/standalone';
import { format } from 'date-fns';
import type { CreateStandaloneBillingData } from '@/services/standaloneBillingService';
import { formatCurrency } from '@/lib/utils';

// AIDEV-NOTE: Tipo para item de faturamento na API (sem tenant_id)
export type BillingItemApiFormat = CreateStandaloneBillingData['items'][0];

/**
 * Converte item de faturamento para formato de API
 */
export function convertBillingItemToApiFormat(
  item: BillingItem,
  defaultDueDate: Date
): BillingItemApiFormat {
  // AIDEV-NOTE: Para serviços personalizados, usar custom_name e custom_description
  let itemDescription = item.description;
  
  if (item.is_custom) {
    // AIDEV-NOTE: Montar descrição do serviço personalizado
    const customParts = [];
    if (item.custom_name) {
      customParts.push(`Serviço Personalizado: ${item.custom_name}`);
    }
    if (item.custom_description) {
      customParts.push(item.custom_description);
    }
    itemDescription = customParts.join('\n\n');
  } else if (item.service?.description) {
    // AIDEV-NOTE: Usar descrição do serviço se não houver descrição customizada
    itemDescription = item.description || item.service.description;
  } else if (item.product?.description) {
    // AIDEV-NOTE: Usar descrição do produto se não houver descrição customizada
    itemDescription = item.description || item.product.description;
  }

  // AIDEV-NOTE: Adicionar informação de desconto na descrição se houver
  if (item.discount_percent && item.discount_percent > 0) {
    const discountAmount = ((item.quantity || 0) * (item.unit_price || 0) * item.discount_percent) / 100;
    itemDescription = (itemDescription || '') + `\n\nDesconto: ${item.discount_percent}% (${formatCurrency(discountAmount)})`;
  } else if (item.discount_amount && item.discount_amount > 0) {
    itemDescription = (itemDescription || '') + `\n\nDesconto: ${formatCurrency(item.discount_amount)}`;
  }
  
  return {
    product_id: item.is_custom ? undefined : item.product_id,
    service_id: item.is_custom ? undefined : item.service_id, // AIDEV-NOTE: Serviço personalizado não tem service_id
    quantity: item.quantity,
    unit_price: item.unit_price,
    storage_location_id: item.storage_location_id,
    description: itemDescription,
  };
}

/**
 * Obtém nome do item para exibição
 */
export function getItemDisplayName(item: BillingItem, index: number): string {
  if (item.is_custom) {
    return item.custom_name || 'Serviço Personalizado';
  }
  return item.product?.name || item.service?.name || `Item ${index + 1}`;
}

/**
 * Prepara dados de faturamento para submissão
 * Retorna dados sem tenant_id (será preenchido pelo hook)
 */
export function prepareBillingData(
  items: BillingItem[],
  selectedCustomerId: string,
  billDate: Date,
  dueDate: Date,
  paymentMethod: string,
  description: string
): Omit<CreateStandaloneBillingData, 'tenant_id'> {
  // AIDEV-NOTE: Derivar método de pagamento efetivo a partir dos itens
  const derivedPaymentMethod = (items.find(i => i.payment_method)?.payment_method || paymentMethod) as string;
  // AIDEV-NOTE: Derivar vencimento efetivo a partir dos itens
  const derivedDueDate = (items.find(i => i.item_due_date)?.item_due_date || dueDate) as Date;

  return {
    customer_id: selectedCustomerId,
    contract_id: null, // Opcional: pode buscar contrato do cliente depois
    bill_date: format(billDate, 'yyyy-MM-dd'),
    due_date: format(derivedDueDate, 'yyyy-MM-dd'),
    payment_method: derivedPaymentMethod,
    description: description || undefined,
    items: items.map(item => convertBillingItemToApiFormat(item, dueDate)),
  };
}
