/**
 * AIDEV-NOTE: Hook para gerenciar dados do formulário de serviço
 * Centraliza estado e lógica de carregamento/reset de dados
 * 
 * @module features/contracts/hooks/useServiceFormData
 */

import { useState, useCallback } from 'react';
import type { 
  FinancialData, 
  TaxData, 
  DueDateData, 
  BillingData, 
  DiscountData,
  SelectedService 
} from '../types';
import {
  DEFAULT_FINANCIAL_DATA,
  DEFAULT_TAX_DATA,
  DEFAULT_DUE_DATE_DATA,
  DEFAULT_BILLING_DATA,
  DEFAULT_DISCOUNT_DATA
} from '../constants';

interface UseServiceFormDataReturn {
  // Estados de dados
  financialData: FinancialData;
  setFinancialData: React.Dispatch<React.SetStateAction<FinancialData>>;
  taxData: TaxData;
  setTaxData: React.Dispatch<React.SetStateAction<TaxData>>;
  dueDateData: DueDateData;
  setDueDateData: React.Dispatch<React.SetStateAction<DueDateData>>;
  billingData: BillingData;
  setBillingData: React.Dispatch<React.SetStateAction<BillingData>>;
  discountData: DiscountData;
  setDiscountData: React.Dispatch<React.SetStateAction<DiscountData>>;
  
  // Funções de controle
  loadFromService: (service: SelectedService) => void;
  reset: () => void;
  
  // Getters para dados consolidados
  getAllData: () => {
    financial: FinancialData;
    tax: TaxData;
    dueDate: DueDateData;
    billing: BillingData;
    discount: DiscountData;
  };
}

/**
 * Hook para gerenciar todos os dados do formulário de edição de serviço
 * 
 * @returns Objeto com estados, setters e funções de controle
 * 
 * @example
 * ```tsx
 * const {
 *   financialData,
 *   setFinancialData,
 *   loadFromService,
 *   reset
 * } = useServiceFormData();
 * 
 * // Carregar dados de um serviço
 * useEffect(() => {
 *   if (currentService) {
 *     loadFromService(currentService);
 *   }
 * }, [currentService]);
 * 
 * // Resetar ao fechar modal
 * const handleClose = () => {
 *   reset();
 *   closeModal();
 * };
 * ```
 */
export function useServiceFormData(): UseServiceFormDataReturn {
  // Estados de dados do formulário
  const [financialData, setFinancialData] = useState<FinancialData>(DEFAULT_FINANCIAL_DATA);
  const [taxData, setTaxData] = useState<TaxData>(DEFAULT_TAX_DATA);
  const [dueDateData, setDueDateData] = useState<DueDateData>(DEFAULT_DUE_DATE_DATA);
  const [billingData, setBillingData] = useState<BillingData>(DEFAULT_BILLING_DATA);
  const [discountData, setDiscountData] = useState<DiscountData>(DEFAULT_DISCOUNT_DATA);

  /**
   * Carrega dados de um serviço existente para o formulário
   */
  const loadFromService = useCallback((service: SelectedService) => {
    // Carregar dados financeiros se existirem
    if (service.payment_method || service.billing_type) {
      setFinancialData({
        payment_method: service.payment_method || DEFAULT_FINANCIAL_DATA.payment_method,
        card_type: service.card_type || '',
        billing_type: service.billing_type || DEFAULT_FINANCIAL_DATA.billing_type,
        recurrence_frequency: service.recurrence_frequency || '',
        installments: service.installments || 1
      });
    }

    // Carregar dados de vencimento se existirem
    if (service.due_type || service.due_value !== undefined) {
      setDueDateData({
        due_type: service.due_type ?? DEFAULT_DUE_DATE_DATA.due_type,
        due_value: service.due_value ?? DEFAULT_DUE_DATE_DATA.due_value,
        due_next_month: service.due_next_month ?? false
      });
    }

    // Carregar dados de cobrança se existirem
    if (service.generate_billing !== undefined) {
      setBillingData({ generate_billing: service.generate_billing });
    }

    // Carregar dados de desconto
    const discountPercentage = service.discount_percentage || 0;
    const discountAmount = service.discount_amount || 0;
    const discountType = discountPercentage > 0 ? 'percentage' : (discountAmount > 0 ? 'fixed' : 'percentage');
    
    setDiscountData({
      discount_type: discountType,
      discount_value: discountType === 'percentage' ? discountPercentage : discountAmount,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount
    });

    // Carregar dados de impostos se existirem
    if (service.nbs_code || service.iss_rate || service.ir_rate) {
      setTaxData({
        nbs_code: service.nbs_code || '',
        deduction_value: service.deduction_value || 0,
        calculation_base: service.calculation_base || 0,
        iss_rate: service.iss_rate || 0,
        iss_deduct: service.iss_deduct || false,
        ir_rate: service.ir_rate || 0,
        ir_deduct: service.ir_deduct || false,
        csll_rate: service.csll_rate || 0,
        csll_deduct: service.csll_deduct || false,
        inss_rate: service.inss_rate || 0,
        inss_deduct: service.inss_deduct || false,
        pis_rate: service.pis_rate || 0,
        pis_deduct: service.pis_deduct || false,
        cofins_rate: service.cofins_rate || 0,
        cofins_deduct: service.cofins_deduct || false
      });
    }
  }, []);

  /**
   * Reseta todos os dados para valores padrão
   */
  const reset = useCallback(() => {
    setFinancialData(DEFAULT_FINANCIAL_DATA);
    setTaxData(DEFAULT_TAX_DATA);
    setDueDateData(DEFAULT_DUE_DATE_DATA);
    setBillingData(DEFAULT_BILLING_DATA);
    setDiscountData(DEFAULT_DISCOUNT_DATA);
  }, []);

  /**
   * Retorna todos os dados consolidados
   */
  const getAllData = useCallback(() => ({
    financial: financialData,
    tax: taxData,
    dueDate: dueDateData,
    billing: billingData,
    discount: discountData
  }), [financialData, taxData, dueDateData, billingData, discountData]);

  return {
    // Estados
    financialData,
    setFinancialData,
    taxData,
    setTaxData,
    dueDateData,
    setDueDateData,
    billingData,
    setBillingData,
    discountData,
    setDiscountData,
    
    // Funções
    loadFromService,
    reset,
    getAllData
  };
}

