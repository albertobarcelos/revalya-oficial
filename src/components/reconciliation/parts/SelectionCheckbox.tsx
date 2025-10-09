// =====================================================
// AIDEV-NOTE: SelectionCheckbox Component
// =====================================================
// Componente extraído de ReconciliationTable.tsx para gerenciar
// interações de seleção (individual e "selecionar todos")
// Centraliza a lógica de checkbox com estados visuais consistentes
// =====================================================

import { Checkbox } from '@/components/ui/checkbox';
import { SelectionCheckboxProps } from '../types/table-parts';

export function SelectionCheckbox({ 
  checked, 
  onChange, 
  type = 'individual',
  disabled = false,
  className = '',
  'aria-label': ariaLabel
}: SelectionCheckboxProps) {
  
  // AIDEV-NOTE: Handler para mudanças de estado do checkbox
  const handleCheckedChange = (checkedState: boolean) => {
    if (!disabled) {
      onChange(checkedState);
    }
  };

  // AIDEV-NOTE: Classes CSS baseadas no tipo de checkbox
  const getCheckboxClasses = () => {
    const baseClasses = 'transition-colors duration-200';
    
    switch (type) {
      case 'selectAll':
        return `${baseClasses} border-2 ${className}`;
      case 'individual':
      default:
        return `${baseClasses} ${className}`;
    }
  };

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={handleCheckedChange}
      disabled={disabled}
      className={getCheckboxClasses()}
      aria-label={ariaLabel || (type === 'selectAll' ? 'Selecionar todos' : 'Selecionar item')}
    />
  );
}