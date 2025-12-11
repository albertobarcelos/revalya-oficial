/**
 * AIDEV-NOTE: Componente para estado vazio de serviços
 * Exibido quando não há serviços no contrato
 * 
 * @module features/contracts/components/ContractServices/EmptyServiceState
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// AIDEV-NOTE: Imagem customizada para estado vazio
const EMPTY_STATE_IMAGE = '/images/contract page/contract_modal/contract_sem_servico_produto.svg';

interface EmptyServiceStateProps {
  /** Callback para adicionar serviço */
  onAddService: () => void;
  /** Desabilitar botão */
  disabled?: boolean;
}

/**
 * Estado vazio quando não há serviços no contrato
 * 
 * @example
 * ```tsx
 * {services.length === 0 ? (
 *   <EmptyServiceState onAddService={() => setShowModal(true)} />
 * ) : (
 *   <ServiceTable services={services} />
 * )}
 * ```
 */
export function EmptyServiceState({ 
  onAddService,
  disabled = false 
}: EmptyServiceStateProps) {
  return (
    <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center gap-5">
      {/* Imagem ilustrativa */}
      <img 
        src={EMPTY_STATE_IMAGE} 
        alt="Nenhum serviço" 
        className="h-44 w-auto"
      />
      
      {/* Texto */}
      <div className="space-y-1">
        <p className="text-muted-foreground font-medium text-base">
          Nenhum serviço adicionado ao contrato
        </p>
        <p className="text-sm text-muted-foreground/80">
          Adicione serviços para calcular o valor total do contrato
        </p>
      </div>
      
      {/* Botão de adicionar */}
      <Button 
        variant="outline" 
        onClick={onAddService}
        disabled={disabled}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
      >
        <Plus className="h-4 w-4" />
        Adicionar Serviço
      </Button>
    </div>
  );
}

export default EmptyServiceState;

