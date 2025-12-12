/**
 * AIDEV-NOTE: Tipos e interfaces para faturamento avulso (standalone billing)
 * Extraído de CreateStandaloneBillingDialog.tsx para melhor organização
 */

import type { Product } from '@/hooks/useSecureProducts';
import type { Service } from '@/hooks/useServices';

/**
 * Tipo de step do wizard de faturamento avulso
 */
export type StandaloneBillingStep = 'customer' | 'items' | 'payment' | 'review';

/**
 * Item de faturamento (produto ou serviço)
 */
export interface BillingItem {
  id: string;
  product_id?: string;
  service_id?: string;
  quantity: number;
  unit_price: number;
  storage_location_id?: string;
  description?: string;
  product?: Product;
  service?: Service;
  kind?: 'product' | 'service';
  payment_method?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH';
  item_due_date?: Date;
  card_type?: 'credit' | 'credit_recurring';
  billing_type?: 'Único' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  recurrence_frequency?: string;
  installments?: number;
  is_custom?: boolean; // AIDEV-NOTE: Flag para identificar serviço personalizado (digitado manualmente)
  custom_name?: string; // AIDEV-NOTE: Nome do serviço personalizado
  custom_description?: string; // AIDEV-NOTE: Descrição do serviço personalizado
  discount_percent?: number; // AIDEV-NOTE: Desconto em percentual (0-100)
  discount_amount?: number; // AIDEV-NOTE: Desconto em valor fixo
}

/**
 * Configuração de um step do wizard
 */
export interface StepConfig {
  key: StandaloneBillingStep;
  label: string;
  icon: React.ReactNode;
}

/**
 * Estado de associação de pagamento por item
 */
export interface PaymentAssociationState {
  [itemId: string]: boolean;
}

/**
 * Valores de input de preço (para formatação durante digitação)
 */
export interface PriceInputValues {
  [itemId: string]: string;
}

/**
 * Erros de validação do formulário
 */
export interface BillingFormErrors {
  [key: string]: string;
}
