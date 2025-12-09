/**
 * AIDEV-NOTE: Componente para configuração de vencimento
 * Usado em ContractServices e ContractProducts
 * 
 * @module features/contracts/components/ContractServices/DueDateConfig
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { DueDateData, DueType } from '../../types';
import { DUE_TYPES, LIMITS } from '../../constants';

interface DueDateConfigProps {
  /** Dados de vencimento atuais */
  dueDateData: DueDateData;
  /** Callback para atualização dos dados */
  onDueDateChange: (data: Partial<DueDateData>) => void;
  /** Callback quando inicia edição (para controle de sincronização) */
  onEditStart?: () => void;
  /** Callback quando termina edição */
  onEditEnd?: () => void;
  /** Desabilitar campos */
  disabled?: boolean;
}

/**
 * Configuração de tipo de vencimento (dias após faturamento ou dia fixo)
 * 
 * @example
 * ```tsx
 * <DueDateConfig
 *   dueDateData={dueDateData}
 *   onDueDateChange={(changes) => setDueDateData(prev => ({ ...prev, ...changes }))}
 *   onEditStart={() => setIsEditing(true)}
 *   onEditEnd={() => setIsEditing(false)}
 * />
 * ```
 */
export function DueDateConfig({ 
  dueDateData, 
  onDueDateChange,
  onEditStart,
  onEditEnd,
  disabled = false 
}: DueDateConfigProps) {
  // Handler para mudança de tipo
  const handleTypeChange = (value: DueType) => {
    onEditStart?.();
    onDueDateChange({ due_type: value });
    setTimeout(() => onEditEnd?.(), 100);
  };

  // Handler para mudança de valor (dias ou dia do mês)
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEditStart?.();
    
    if (value === '') {
      onDueDateChange({ due_value: undefined });
    } else {
      const numValue = parseInt(value, 10);
      const max = dueDateData.due_type === 'fixed_day' 
        ? LIMITS.MAX_DAY_OF_MONTH 
        : LIMITS.MAX_DAYS_AFTER_BILLING;
      
      if (!isNaN(numValue) && numValue >= LIMITS.MIN_DAY_OF_MONTH && numValue <= max) {
        onDueDateChange({ due_value: numValue });
      }
    }
  };

  // Handler para blur do campo de valor
  const handleValueBlur = () => {
    // Aplica valor padrão se campo vazio
    if (!dueDateData.due_value) {
      onDueDateChange({ due_value: LIMITS.MIN_DAY_OF_MONTH });
    }
    onEditEnd?.();
  };

  // Handler para checkbox de próximo mês
  const handleNextMonthChange = (checked: boolean) => {
    onEditStart?.();
    onDueDateChange({ due_next_month: checked });
    setTimeout(() => onEditEnd?.(), 100);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-foreground">Tipo de Vencimento</h4>
      
      {/* Layout em grid para compactar */}
      <div className="grid grid-cols-2 gap-3">
        {/* Seletor do tipo de vencimento */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select 
            value={dueDateData.due_type} 
            onValueChange={handleTypeChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {DUE_TYPES.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Campo de valor (dias ou dia do mês) */}
        <div className="space-y-1.5">
          <Label htmlFor="dueValue" className="text-xs text-muted-foreground">
            {dueDateData.due_type === 'fixed_day' ? 'Dia do mês' : 'Nº de dias'}
          </Label>
          <Input 
            id="dueValue"
            type="number"
            min={dueDateData.due_type === 'fixed_day' ? LIMITS.MIN_DAY_OF_MONTH : LIMITS.MIN_DAYS_AFTER_BILLING}
            max={dueDateData.due_type === 'fixed_day' ? LIMITS.MAX_DAY_OF_MONTH : LIMITS.MAX_DAYS_AFTER_BILLING}
            value={dueDateData.due_value ?? ''}
            onChange={handleValueChange}
            onBlur={handleValueBlur}
            placeholder={dueDateData.due_type === 'fixed_day' ? 'Ex: 10' : 'Ex: 5'}
            disabled={disabled}
            className="h-9"
          />
        </div>
      </div>
      
      {/* Checkbox próximo mês - só aparece para dia fixo */}
      {dueDateData.due_type === 'fixed_day' && (
        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="dueNextMonth"
            checked={dueDateData.due_next_month}
            onCheckedChange={handleNextMonthChange}
            disabled={disabled}
          />
          <Label htmlFor="dueNextMonth" className="text-xs text-muted-foreground cursor-pointer">
            Iniciar cobrança no próximo mês
          </Label>
        </div>
      )}
      
      {/* Texto explicativo compacto */}
      <p className="text-[11px] text-muted-foreground/70 leading-tight">
        {dueDateData.due_type === 'days_after_billing' 
          ? `Vencimento: ${dueDateData.due_value || '_'} dias após o faturamento`
          : dueDateData.due_next_month 
            ? `Vencimento: dia ${dueDateData.due_value || '_'} do próximo mês`
            : `Vencimento: dia ${dueDateData.due_value || '_'} do mês atual`
        }
      </p>
    </div>
  );
}

export default DueDateConfig;

