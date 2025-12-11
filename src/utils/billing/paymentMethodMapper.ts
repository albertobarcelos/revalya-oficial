// AIDEV-NOTE: Mapeamento de métodos de pagamento para tipos de cobrança
// Constraint do banco: tipo in ('BOLETO', 'PIX', 'CREDIT_CARD', 'CASH')

/**
 * Tipos de cobrança aceitos pelo banco de dados
 */
export type ChargeType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH';

/**
 * Métodos de pagamento normalizados
 */
export type PaymentMethod =
  | 'boleto'
  | 'pix'
  | 'cartão'
  | 'credit_card'
  | 'transferência'
  | 'bank_transfer'
  | 'dinheiro'
  | 'cash'
  | 'bank_slip';

/**
 * Mapeia método de pagamento para o tipo de cobrança aceito pelo banco
 *
 * @param paymentMethod - Método de pagamento do serviço/produto
 * @param cardType - Tipo do cartão (não utilizado, mantido para compatibilidade)
 * @param installments - Número de parcelas (não utilizado, mantido para compatibilidade)
 * @returns Tipo de cobrança válido para o banco
 */
export function mapPaymentMethodToChargeType(
  paymentMethod: string | null,
  cardType?: string | null,
  installments?: number | null
): ChargeType {
  if (!paymentMethod) return 'BOLETO'; // Default fallback

  const normalizedMethod = paymentMethod.toLowerCase().trim();

  switch (normalizedMethod) {
    case 'cartão':
    case 'credit_card':
    case 'cartao':
      // Para parcelamento, ainda usamos CREDIT_CARD (constraint não permite INSTALLMENT)
      return 'CREDIT_CARD';

    case 'pix':
      return 'PIX';

    case 'transferência':
    case 'transferencia':
    case 'bank_transfer':
      // Transferência será tratada como BOLETO (constraint não permite TRANSFER)
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

/**
 * Obtém o label amigável para exibição do tipo de cobrança
 *
 * @param chargeType - Tipo de cobrança do banco
 * @returns Label amigável em português
 */
export function getChargeTypeLabel(chargeType: ChargeType): string {
  const labels: Record<ChargeType, string> = {
    BOLETO: 'Boleto',
    PIX: 'PIX',
    CREDIT_CARD: 'Cartão de Crédito',
    CASH: 'Dinheiro',
  };

  return labels[chargeType] || 'Boleto';
}

/**
 * Obtém o ícone associado ao tipo de cobrança
 *
 * @param chargeType - Tipo de cobrança
 * @returns Nome do ícone Lucide
 */
export function getChargeTypeIcon(chargeType: ChargeType): string {
  const icons: Record<ChargeType, string> = {
    BOLETO: 'FileText',
    PIX: 'QrCode',
    CREDIT_CARD: 'CreditCard',
    CASH: 'Banknote',
  };

  return icons[chargeType] || 'FileText';
}
