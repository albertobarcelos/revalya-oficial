/**
 * AIDEV-NOTE: Hook principal para gerenciamento do formulário de faturamento avulso
 * Orquestra todos os outros hooks e gerencia o estado principal
 */

import { useState, useCallback, useMemo } from 'react';
import { addDays } from 'date-fns';
import type { StandaloneBillingStep, BillingFormErrors } from '@/types/billing/standalone';
import type { Customer } from '@/hooks/useCustomers';
import { useBillingItems } from './useBillingItems';
import { usePaymentAssociation } from './usePaymentAssociation';
import { useBillingValidation } from './useBillingValidation';
import type { Product } from '@/hooks/useSecureProducts';

interface UseStandaloneBillingFormParams {
  products: Product[];
  onClose?: () => void;
}

/**
 * Hook principal para gerenciamento do formulário de faturamento avulso
 */
export function useStandaloneBillingForm({ products, onClose }: UseStandaloneBillingFormParams = { products: [] }) {
  // AIDEV-NOTE: Estado principal do formulário
  const [currentStep, setCurrentStep] = useState<StandaloneBillingStep>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerOverride, setSelectedCustomerOverride] = useState<Customer | null>(null);
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 7));
  const [paymentMethod, setPaymentMethod] = useState<string>('BOLETO');
  const [description, setDescription] = useState<string>('');
  const [errors, setErrors] = useState<BillingFormErrors>({});
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showAddItemChooser, setShowAddItemChooser] = useState(false);

  // AIDEV-NOTE: Hooks especializados
  const billingItems = useBillingItems();
  const paymentAssociation = usePaymentAssociation();

  // AIDEV-NOTE: Validação
  const validation = useBillingValidation({
    selectedCustomerId,
    items: billingItems.items,
    billDate,
    dueDate,
    paymentMethod,
    products,
    assocOpen: paymentAssociation.assocOpen,
  });

  /**
   * AIDEV-NOTE: Resetar formulário completo
   */
  const resetForm = useCallback(() => {
    setCurrentStep('customer');
    setSelectedCustomerId('');
    setSelectedCustomerOverride(null);
    setBillDate(new Date());
    setDueDate(addDays(new Date(), 7));
    setPaymentMethod('BOLETO');
    setDescription('');
    setErrors({});
    setShowClientSearch(false);
    setShowCreateClient(false);
    setShowAddItemChooser(false);
    billingItems.clearItems();
    paymentAssociation.clearAll();
  }, [billingItems, paymentAssociation]);

  /**
   * AIDEV-NOTE: Navegar para próximo step
   */
  const goToNextStep = useCallback(() => {
    const errors = validation.validateStep(currentStep);
    setErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return false;
    }

    const steps: StandaloneBillingStep[] = ['customer', 'items', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      return true;
    }
    return false;
  }, [currentStep, validation]);

  /**
   * AIDEV-NOTE: Navegar para step anterior
   */
  const goToPreviousStep = useCallback(() => {
    const steps: StandaloneBillingStep[] = ['customer', 'items', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      return true;
    }
    return false;
  }, [currentStep]);

  /**
   * AIDEV-NOTE: Ir para step específico
   */
  const goToStep = useCallback((step: StandaloneBillingStep) => {
    setCurrentStep(step);
  }, []);

  /**
   * AIDEV-NOTE: Validar step atual e retornar se é válido
   */
  const validateCurrentStep = useCallback((): boolean => {
    const errors = validation.validateStep(currentStep);
    setErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStep, validation]);

  return {
    // Estado
    currentStep,
    selectedCustomerId,
    selectedCustomerOverride,
    billDate,
    dueDate,
    paymentMethod,
    description,
    errors,
    showClientSearch,
    showCreateClient,
    showAddItemChooser,

    // Setters
    setCurrentStep,
    setSelectedCustomerId,
    setSelectedCustomerOverride,
    setBillDate,
    setDueDate,
    setPaymentMethod,
    setDescription,
    setErrors,
    setShowClientSearch,
    setShowCreateClient,
    setShowAddItemChooser,

    // Hooks especializados
    billingItems,
    paymentAssociation,
    validation,

    // Funções
    resetForm,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    validateCurrentStep,
  };
}
