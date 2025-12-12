/**
 * AIDEV-NOTE: Componente para configuração de geração de cobrança
 * Controla se o serviço/produto deve gerar cobrança no faturamento
 * 
 * @module features/contracts/components/ContractServices/BillingConfig
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import type { BillingData } from '../../types';

interface BillingConfigProps {
  /** Dados de cobrança atuais */
  billingData: BillingData;
  /** Callback para atualização dos dados */
  onBillingChange: (data: Partial<BillingData>) => void;
  /** Desabilitar campos */
  disabled?: boolean;
}

/**
 * Configuração de geração de cobrança (sim/não)
 * 
 * @example
 * ```tsx
 * <BillingConfig
 *   billingData={billingData}
 *   onBillingChange={(changes) => setBillingData(prev => ({ ...prev, ...changes }))}
 * />
 * ```
 */
export function BillingConfig({ 
  billingData, 
  onBillingChange,
  disabled = false 
}: BillingConfigProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Gerar cobrança?</h4>
        
        {/* Opções em linha */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <input
              type="radio"
              id="billing_yes"
              name="generate_billing"
              checked={billingData.generate_billing === true}
              onChange={() => onBillingChange({ generate_billing: true })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
              disabled={disabled}
            />
            <Label htmlFor="billing_yes" className="text-sm cursor-pointer">
              Sim
            </Label>
          </div>
          
          <div className="flex items-center space-x-1.5">
            <input
              type="radio"
              id="billing_no"
              name="generate_billing"
              checked={billingData.generate_billing === false}
              onChange={() => onBillingChange({ generate_billing: false })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer"
              disabled={disabled}
            />
            <Label htmlFor="billing_no" className="text-sm cursor-pointer">
              Não
            </Label>
          </div>
        </div>
      </div>
      
      <p className="text-[11px] text-muted-foreground/70">
        {billingData.generate_billing 
          ? 'Este serviço gerará cobrança automática no faturamento'
          : 'Este serviço não gerará cobrança automática'
        }
      </p>
    </div>
  );
}

export default BillingConfig;

