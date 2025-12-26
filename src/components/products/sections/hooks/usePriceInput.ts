/**
 * Hook para gerenciar input de preço com formatação
 * 
 * AIDEV-NOTE: Isola lógica de formatação e parsing de valores monetários
 */

import { useState, useEffect, useCallback } from 'react';
import { formatPriceWithThousands, parsePriceInput } from '../utils/priceUtils';

interface UsePriceInputProps {
  formData: any;
  isEditMode: boolean;
  onChange: (e: any) => void;
}

export function usePriceInput({ formData, isEditMode, onChange }: UsePriceInputProps) {
  const [priceInputValue, setPriceInputValue] = useState<string>('');
  const [isPriceFocused, setIsPriceFocused] = useState(false);

  // AIDEV-NOTE: Sincronizar valor do formData com o estado local quando não está em foco
  useEffect(() => {
    if (!isPriceFocused) {
      const currentValue = isEditMode ? (formData as any).unit_price : (formData as any).price;
      if (currentValue || currentValue === 0) {
        const numValue = typeof currentValue === 'number' 
          ? currentValue
          : parseFloat(currentValue || '0');
        setPriceInputValue(formatPriceWithThousands(numValue));
      } else {
        setPriceInputValue('');
      }
    }
  }, [formData, isEditMode, isPriceFocused]);

  // AIDEV-NOTE: Handler para mudança de preço
  const handlePriceChange = useCallback((inputValue: string) => {
    setPriceInputValue(inputValue);
    
    const parsed = parsePriceInput(inputValue);
    const fieldName = isEditMode ? "unit_price" : "price";
    
    if (parsed !== null) {
      onChange({
        target: { name: fieldName, value: parsed }
      } as any);
    } else if (inputValue.trim() === '') {
      onChange({
        target: { name: fieldName, value: null }
      } as any);
    }
  }, [isEditMode, onChange]);

  // AIDEV-NOTE: Handler para foco no campo de preço
  const handlePriceFocus = useCallback(() => {
    setIsPriceFocused(true);
    const currentValue = isEditMode ? (formData as any).unit_price : (formData as any).price;
    if (currentValue || currentValue === 0) {
      const numValue = typeof currentValue === 'number' ? currentValue : parseFloat(currentValue || '0');
      const formatted = numValue.toFixed(2).replace('.', ',');
      setPriceInputValue(formatted);
    }
  }, [formData, isEditMode]);

  // AIDEV-NOTE: Handler para blur no campo de preço
  const handlePriceBlur = useCallback(() => {
    setIsPriceFocused(false);
    const parsed = parsePriceInput(priceInputValue);
    const fieldName = isEditMode ? "unit_price" : "price";
    
    if (parsed !== null) {
      const formatted = formatPriceWithThousands(parsed);
      setPriceInputValue(formatted);
      onChange({
        target: { name: fieldName, value: parsed }
      } as any);
    } else {
      setPriceInputValue('');
      onChange({
        target: { name: fieldName, value: null }
      } as any);
    }
  }, [priceInputValue, isEditMode, onChange]);

  return {
    priceInputValue,
    isPriceFocused,
    handlePriceChange,
    handlePriceFocus,
    handlePriceBlur,
  };
}

