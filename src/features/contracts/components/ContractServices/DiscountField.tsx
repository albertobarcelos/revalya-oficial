/**
 * AIDEV-NOTE: Componente reutilizável para campo de desconto
 * Usado em ContractServices e ContractProducts
 * 
 * @module features/contracts/components/ContractServices/DiscountField
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DiscountData, DiscountType } from '../../types';
import { DISCOUNT_TYPES } from '../../constants';

interface DiscountFieldProps {
  /** Dados de desconto atuais */
  discountData: DiscountData;
  /** Callback para atualização dos dados */
  onDiscountChange: (data: Partial<DiscountData>) => void;
  /** Desabilitar campos */
  disabled?: boolean;
}

/**
 * Campo de desconto com seleção de tipo (percentual ou valor fixo)
 * 
 * @example
 * ```tsx
 * <DiscountField
 *   discountData={discountData}
 *   onDiscountChange={(changes) => setDiscountData(prev => ({ ...prev, ...changes }))}
 * />
 * ```
 */
export function DiscountField({ 
  discountData, 
  onDiscountChange,
  disabled = false 
}: DiscountFieldProps) {
  // AIDEV-NOTE: Estado local para controle do input - evita problemas de digitação
  const [inputValue, setInputValue] = useState('');
  
  // Sincronizar valor externo com input local
  useEffect(() => {
    if (discountData.discount_type === 'percentage') {
      setInputValue(discountData.discount_percentage > 0 ? discountData.discount_percentage.toString() : '');
    } else {
      setInputValue(discountData.discount_amount > 0 ? discountData.discount_amount.toString().replace('.', ',') : '');
    }
  }, [discountData.discount_type]); // Só reseta quando muda o tipo

  // Handler para mudança de tipo de desconto
  const handleTypeChange = (value: DiscountType) => {
    setInputValue('');
    onDiscountChange({ 
      discount_type: value, 
      discount_value: 0,
      discount_percentage: 0,
      discount_amount: 0
    });
  };

  // Handler para mudança de valor percentual
  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    
    const value = parseFloat(rawValue) || 0;
    const safeValue = Math.min(100, Math.max(0, value));
    
    onDiscountChange({ 
      discount_percentage: safeValue,
      discount_value: safeValue,
      discount_amount: 0 // Zera o valor fixo quando usa percentual
    });
  };

  // Handler para mudança de valor fixo
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    
    // Permitir apenas números, vírgula e ponto
    const sanitized = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
    const numericValue = parseFloat(sanitized) || 0;
    
    onDiscountChange({ 
      discount_amount: numericValue,
      discount_value: numericValue,
      discount_percentage: 0 // Zera o percentual quando usa valor fixo
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
      {/* Seletor de tipo de desconto */}
      <div className="space-y-2">
        <Label htmlFor="discountType" className="text-sm font-medium">
          Tipo de Desconto
        </Label>
        <Select 
          value={discountData.discount_type} 
          onValueChange={handleTypeChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {DISCOUNT_TYPES.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecione como aplicar o desconto
        </p>
      </div>
      
      {/* Campo de valor do desconto */}
      <div className="space-y-2">
        <Label htmlFor="discountValue" className="text-sm font-medium">
          {discountData.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
        </Label>
        
        {discountData.discount_type === 'percentage' ? (
          <Input 
            id="discountValue"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={inputValue}
            onChange={handlePercentageChange}
            placeholder="Ex: 10"
            disabled={disabled}
          />
        ) : (
          <Input
            id="discountValue"
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleAmountChange}
            placeholder="Ex: 100,00"
            disabled={disabled}
          />
        )}
        
        <p className="text-xs text-muted-foreground">
          {discountData.discount_type === 'percentage' 
            ? 'Percentual de desconto a ser aplicado'
            : 'Valor fixo de desconto a ser aplicado'}
        </p>
      </div>
    </div>
  );
}

export default DiscountField;

