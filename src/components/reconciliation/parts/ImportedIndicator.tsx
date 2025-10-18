// =====================================================
// IMPORTED INDICATOR COMPONENT
// Descrição: Componente para indicar se um movimento foi processado/importado
// Responsabilidade: Mostrar visualmente se o movimento virou uma cobrança ativa
// =====================================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

// AIDEV-NOTE: Interface para props do componente ImportedIndicator
interface ImportedIndicatorProps {
  /** ID da cobrança gerada (se existir) */
  chargeId?: string | null;
  /** Data/hora da importação (se existir) */
  importedAt?: string | null;
  /** Classe CSS adicional */
  className?: string;
}

// AIDEV-NOTE: Componente dedicado para mostrar status de processamento
// Separado do StatusBadge para clareza e responsabilidade única
// Mostra se o movimento foi convertido em cobrança ativa no sistema
export function ImportedIndicator({ 
  chargeId, 
  importedAt, 
  className = '' 
}: ImportedIndicatorProps) {
  
  // AIDEV-NOTE: Lógica para determinar se foi processado
  // Ambos chargeId e importedAt devem existir para considerar processado
  const isProcessed = Boolean(chargeId && importedAt);
  
  if (isProcessed) {
    return (
      <Badge 
        variant="outline" 
        className={`bg-green-50 text-green-700 border-green-200 hover:bg-green-100 ${className}`}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Processado
      </Badge>
    );
  }
  
  // AIDEV-NOTE: Estado não processado - aguardando processamento
  return (
    <Badge 
      variant="outline" 
      className={`bg-slate-50 text-slate-600 border-slate-200 ${className}`}
    >
      <Clock className="h-3 w-3 mr-1" />
      Aguardando
    </Badge>
  );
}

export default ImportedIndicator;