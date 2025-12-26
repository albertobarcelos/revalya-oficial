/**
 * Campo de preço de venda com formatação
 * 
 * AIDEV-NOTE: Componente isolado para input de preço com formatação monetária
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { usePriceInput } from '../hooks/usePriceInput';

interface PriceFieldProps {
  isEditMode: boolean;
  priceState: ReturnType<typeof usePriceInput>;
}

export function PriceField({ isEditMode, priceState }: PriceFieldProps) {
  const {
    priceInputValue,
    handlePriceChange,
    handlePriceFocus,
    handlePriceBlur,
  } = priceState;

  return (
    <div>
      <Label htmlFor="price" className="text-sm font-medium">
        Preço de venda <span className="text-destructive">*</span>
      </Label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground pointer-events-none z-10">
          R$
        </span>
        <Input
          id="price"
          name={isEditMode ? "unit_price" : "price"}
          type="text"
          inputMode="decimal"
          value={priceInputValue}
          onChange={(e) => handlePriceChange(e.target.value)}
          onFocus={handlePriceFocus}
          onBlur={handlePriceBlur}
          placeholder="0,00"
          required
          className="pl-10 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          style={{ paddingRight: '10px' }}
        />
      </div>
    </div>
  );
}

