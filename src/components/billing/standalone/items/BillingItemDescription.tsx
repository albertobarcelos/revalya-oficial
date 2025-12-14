/**
 * AIDEV-NOTE: Campo de descrição reutilizável para produtos e serviços
 * Extraído de CreateStandaloneBillingDialog.tsx
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BillingItem } from '@/types/billing/standalone';

interface BillingItemDescriptionProps {
  item: BillingItem;
  onDescriptionChange: (description: string) => void;
}

/**
 * Campo de descrição para produtos e serviços
 * Não aparece para serviços personalizados (já tem descrição no bloco)
 */
export function BillingItemDescription({
  item,
  onDescriptionChange,
}: BillingItemDescriptionProps) {
  // AIDEV-NOTE: Não renderizar se for serviço personalizado
  if (item.is_custom) {
    return null;
  }

  // AIDEV-NOTE: Não renderizar se não houver produto ou serviço
  if (!item.product && !item.service) {
    return null;
  }

  // AIDEV-NOTE: Descrição original do cadastro (não alterável)
  const originalDescription = item.service?.description || item.product?.description || '';
  // AIDEV-NOTE: Descrição customizada para este faturamento (editável)
  // Se não houver descrição customizada (undefined, null ou vazia), usar a original como valor inicial
  const hasCustomDescription = item.description !== undefined && 
                               item.description !== null && 
                               item.description.trim() !== '';
  const currentValue = hasCustomDescription ? item.description : originalDescription;

  return (
    <div className="space-y-2">
      <Label>Descrição</Label>
      <Textarea
        value={currentValue}
        onChange={(e) => {
          // AIDEV-NOTE: Sempre salvar a descrição editada em item.description
          // Isso permite personalizar a descrição apenas para este faturamento
          // sem alterar a descrição original do cadastro
          onDescriptionChange(e.target.value);
        }}
        placeholder={
          item.service 
            ? originalDescription || "Digite a descrição do serviço para este faturamento"
            : originalDescription || "Digite a descrição do produto para este faturamento"
        }
        rows={3}
        className=""
      />
      {originalDescription && (
        <p className="text-xs text-muted-foreground">
          {hasCustomDescription && item.description !== originalDescription 
            ? "✓ Descrição personalizada para este faturamento. A descrição original do cadastro não será alterada."
            : "Descrição do cadastro. Você pode editar acima para personalizar apenas este faturamento."
          }
        </p>
      )}
    </div>
  );
}
