/**
 * AIDEV-NOTE: Hook para gerenciar estados de rascunho de inputs
 * Usado para campos de valor/quantidade que só são salvos ao confirmar
 * 
 * @module features/contracts/hooks/useDraftInputs
 */

import { useState, useCallback } from 'react';
import type { SelectedService } from '../types';
import { parseCurrencyInput, parseIntegerInput } from '../utils';

interface DraftState {
  unitPrice: { input: string; draft: number | null };
  costPrice: { input: string; draft: number | null };
  quantity: { input: string; draft: number | null };
}

interface UseDraftInputsReturn {
  // Estados de rascunho
  draftState: DraftState;
  
  // Handlers de input
  handleUnitPriceChange: (masked: string) => void;
  handleUnitPriceBlur: () => void;
  handleUnitPriceFocus: (currentService: SelectedService | undefined) => void;
  
  handleCostPriceChange: (masked: string) => void;
  handleCostPriceBlur: () => void;
  handleCostPriceFocus: (currentService: SelectedService | undefined) => void;
  
  handleQuantityChange: (value: string) => void;
  handleQuantityBlur: () => void;
  handleQuantityFocus: (currentService: SelectedService | undefined) => void;
  
  // Getters para valores atuais
  getUnitPrice: (currentService: SelectedService | undefined) => number;
  getCostPrice: (currentService: SelectedService | undefined) => number | null;
  getQuantity: (currentService: SelectedService | undefined) => number;
  
  // Reset
  reset: () => void;
  
  // Carregar valores de um serviço
  loadFromService: (service: SelectedService) => void;
}

const DEFAULT_DRAFT_STATE: DraftState = {
  unitPrice: { input: '', draft: null },
  costPrice: { input: '', draft: null },
  quantity: { input: '', draft: null }
};

/**
 * Hook para gerenciar estados de rascunho de inputs de valor
 * Permite edição sem salvar imediatamente, com confirmação posterior
 * 
 * @returns Objeto com estados, handlers e funções de controle
 * 
 * @example
 * ```tsx
 * const {
 *   draftState,
 *   handleUnitPriceChange,
 *   handleUnitPriceBlur,
 *   handleUnitPriceFocus,
 *   getUnitPrice,
 *   reset
 * } = useDraftInputs();
 * 
 * // Input de valor
 * <IMaskInput
 *   value={draftState.unitPrice.input || formatCurrency(getUnitPrice(currentService))}
 *   onAccept={handleUnitPriceChange}
 *   onBlur={handleUnitPriceBlur}
 *   onFocus={() => handleUnitPriceFocus(currentService)}
 * />
 * ```
 */
export function useDraftInputs(): UseDraftInputsReturn {
  const [draftState, setDraftState] = useState<DraftState>(DEFAULT_DRAFT_STATE);

  // === UNIT PRICE ===
  const handleUnitPriceChange = useCallback((masked: string) => {
    const inputValue = String(masked);
    const numericValue = parseCurrencyInput(inputValue);
    
    setDraftState(prev => ({
      ...prev,
      unitPrice: { input: inputValue, draft: numericValue }
    }));
  }, []);

  const handleUnitPriceBlur = useCallback(() => {
    setDraftState(prev => ({
      ...prev,
      unitPrice: { ...prev.unitPrice, input: '' }
    }));
  }, []);

  const handleUnitPriceFocus = useCallback((currentService: SelectedService | undefined) => {
    const baseValue = 
      draftState.unitPrice.draft ?? 
      currentService?.unit_price ?? 
      currentService?.default_price ?? 
      null;
    
    const formatted = typeof baseValue === 'number' && baseValue > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue)
      : '';
    
    setDraftState(prev => ({
      ...prev,
      unitPrice: { 
        input: formatted, 
        draft: typeof baseValue === 'number' ? baseValue : null 
      }
    }));
  }, [draftState.unitPrice.draft]);

  // === COST PRICE ===
  const handleCostPriceChange = useCallback((masked: string) => {
    const inputValue = String(masked);
    const numericValue = parseCurrencyInput(inputValue);
    
    setDraftState(prev => ({
      ...prev,
      costPrice: { input: inputValue, draft: numericValue }
    }));
  }, []);

  const handleCostPriceBlur = useCallback(() => {
    setDraftState(prev => ({
      ...prev,
      costPrice: { ...prev.costPrice, input: '' }
    }));
  }, []);

  const handleCostPriceFocus = useCallback((currentService: SelectedService | undefined) => {
    const baseValue = draftState.costPrice.draft ?? currentService?.cost_price ?? null;
    
    const formatted = typeof baseValue === 'number' && baseValue > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseValue)
      : '';
    
    setDraftState(prev => ({
      ...prev,
      costPrice: { 
        input: formatted, 
        draft: typeof baseValue === 'number' ? baseValue : null 
      }
    }));
  }, [draftState.costPrice.draft]);

  // === QUANTITY ===
  const handleQuantityChange = useCallback((value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    const newValue = sanitizedValue === '' ? null : parseIntegerInput(sanitizedValue, 1);
    
    setDraftState(prev => ({
      ...prev,
      quantity: { 
        input: sanitizedValue, 
        draft: newValue && !isNaN(newValue) ? Math.max(1, newValue) : null 
      }
    }));
  }, []);

  const handleQuantityBlur = useCallback(() => {
    setDraftState(prev => ({
      ...prev,
      quantity: { ...prev.quantity, input: '' }
    }));
  }, []);

  const handleQuantityFocus = useCallback((currentService: SelectedService | undefined) => {
    const value = currentService?.quantity ?? 1;
    
    setDraftState(prev => ({
      ...prev,
      quantity: { 
        input: value === 0 ? '' : value.toString(), 
        draft: typeof value === 'number' ? value : null 
      }
    }));
  }, []);

  // === GETTERS ===
  const getUnitPrice = useCallback((currentService: SelectedService | undefined): number => {
    return draftState.unitPrice.draft ?? 
           currentService?.unit_price ?? 
           currentService?.default_price ?? 
           0;
  }, [draftState.unitPrice.draft]);

  const getCostPrice = useCallback((currentService: SelectedService | undefined): number | null => {
    return draftState.costPrice.draft ?? currentService?.cost_price ?? null;
  }, [draftState.costPrice.draft]);

  const getQuantity = useCallback((currentService: SelectedService | undefined): number => {
    return draftState.quantity.draft ?? currentService?.quantity ?? 1;
  }, [draftState.quantity.draft]);

  // === RESET ===
  const reset = useCallback(() => {
    setDraftState(DEFAULT_DRAFT_STATE);
  }, []);

  // === LOAD FROM SERVICE ===
  const loadFromService = useCallback((service: SelectedService) => {
    setDraftState({
      unitPrice: {
        input: '',
        draft: typeof service.unit_price === 'number'
          ? service.unit_price
          : (typeof service.default_price === 'number' ? service.default_price : null)
      },
      costPrice: {
        input: '',
        draft: service.cost_price !== undefined && service.cost_price !== null
          ? service.cost_price
          : null
      },
      quantity: {
        input: '',
        draft: typeof service.quantity === 'number' ? service.quantity : 1
      }
    });
  }, []);

  return {
    draftState,
    
    handleUnitPriceChange,
    handleUnitPriceBlur,
    handleUnitPriceFocus,
    
    handleCostPriceChange,
    handleCostPriceBlur,
    handleCostPriceFocus,
    
    handleQuantityChange,
    handleQuantityBlur,
    handleQuantityFocus,
    
    getUnitPrice,
    getCostPrice,
    getQuantity,
    
    reset,
    loadFromService
  };
}

