// =====================================================
// AIDEV-NOTE: BulkActionsDropdown Component
// =====================================================
// Componente para ações em lote na reconciliação
// Permite executar ações múltiplas em movimentos selecionados
// =====================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronDown, 
  FileText, 
  Link, 
  X, 
  Download,
  CheckCircle2 
} from 'lucide-react';
import { ReconciliationAction } from '@/types/reconciliation';

interface BulkActionsDropdownProps {
  selectedCount: number;
  onBulkAction: (action: ReconciliationAction) => void;
  disabled?: boolean;
}

export function BulkActionsDropdown({ 
  selectedCount, 
  onBulkAction, 
  disabled = false 
}: BulkActionsDropdownProps) {
  
  // AIDEV-NOTE: Não renderizar se não há itens selecionados
  if (selectedCount === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="flex items-center gap-2"
        >
          Ações em Lote
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* AIDEV-NOTE: Ações de importação */}
        <DropdownMenuItem 
          onClick={() => onBulkAction(ReconciliationAction.IMPORT_TO_CHARGE)}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Importar para Cobranças
          <span className="ml-auto text-xs text-muted-foreground">
            ({selectedCount})
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onBulkAction(ReconciliationAction.LINK_TO_CONTRACT)}
          className="flex items-center gap-2"
        >
          <Link className="h-4 w-4" />
          Vincular a Contratos
          <span className="ml-auto text-xs text-muted-foreground">
            ({selectedCount})
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* AIDEV-NOTE: Ações de status */}
        <DropdownMenuItem 
          onClick={() => onBulkAction(ReconciliationAction.MARK_AS_RECONCILED)}
          className="flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Marcar como Reconciliado
          <span className="ml-auto text-xs text-muted-foreground">
            ({selectedCount})
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* AIDEV-NOTE: Ações de exportação */}
        <DropdownMenuItem 
          onClick={() => onBulkAction(ReconciliationAction.EXPORT)}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar Selecionados
          <span className="ml-auto text-xs text-muted-foreground">
            ({selectedCount})
          </span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* AIDEV-NOTE: Ação de exclusão */}
        <DropdownMenuItem 
          onClick={() => onBulkAction(ReconciliationAction.IGNORE)}
          className="flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <X className="h-4 w-4" />
          Ignorar Selecionados
          <span className="ml-auto text-xs text-muted-foreground">
            ({selectedCount})
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}