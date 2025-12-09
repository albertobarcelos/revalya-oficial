/**
 * AIDEV-NOTE: Componente para estado vazio de produtos
 * Exibido quando não há produtos no contrato
 * 
 * @module features/contracts/components/ContractProducts/EmptyProductState
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// AIDEV-NOTE: Imagem customizada para estado vazio
const EMPTY_STATE_IMAGE = '/images/contract page/contract_modal/contract_sem_servico_produto.svg';

interface EmptyProductStateProps {
  /** Callback para adicionar produto */
  onAddProduct: () => void;
  /** Desabilitar botão */
  disabled?: boolean;
}

/**
 * Estado vazio quando não há produtos no contrato
 */
export function EmptyProductState({ 
  onAddProduct,
  disabled = false 
}: EmptyProductStateProps) {
  return (
    <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center gap-5">
      {/* Imagem ilustrativa */}
      <img 
        src={EMPTY_STATE_IMAGE} 
        alt="Nenhum produto" 
        className="h-44 w-auto"
      />
      
      {/* Texto */}
      <div className="space-y-1">
        <p className="text-muted-foreground font-medium text-base">
          Nenhum produto adicionado ao contrato
        </p>
        <p className="text-sm text-muted-foreground/80">
          Adicione produtos para calcular o valor total do contrato
        </p>
      </div>
      
      {/* Botão de adicionar */}
      <Button 
        variant="outline" 
        onClick={onAddProduct}
        disabled={disabled}
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
      >
        <Plus className="h-4 w-4" />
        Adicionar Produto
      </Button>
    </div>
  );
}

export default EmptyProductState;

