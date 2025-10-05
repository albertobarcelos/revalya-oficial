import { motion } from 'framer-motion';
import { FileText, RefreshCw, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ReconciliationHeaderIndicators from '../ReconciliationHeaderIndicators';

// AIDEV-NOTE: Interface para props do header do modal de conciliação
interface ReconciliationModalHeaderProps {
  currentTenant?: {
    name: string;
  };
  refreshData: () => void;
  handleExport: () => void;
  onClose: () => void;
  isLoading: boolean;
  isExporting: boolean;
  indicators?: any; // TODO: Tipar adequadamente quando disponível
}

// AIDEV-NOTE: Componente extraído do header do ReconciliationModal
// Responsável por renderizar título, descrição, botões de ação e indicadores
export default function ReconciliationModalHeader({
  currentTenant,
  refreshData,
  handleExport,
  onClose,
  isLoading,
  isExporting,
  indicators
}: ReconciliationModalHeaderProps) {
  return (
    <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText className="h-6 w-6 text-primary" />
          </motion.div>
          <div>
            <DialogTitle className="text-xl font-semibold">
              Conciliação Financeira
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {currentTenant?.name} • Sistema de conciliação de contas a receber
            </DialogDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className={`h-4 w-4 ${isExporting ? 'animate-spin' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* INDICADORES MINIMALISTAS NO HEADER */}
      <div className="mt-4 pt-4 border-t border-border/30">
        {indicators && (
          <ReconciliationHeaderIndicators 
            indicators={indicators} 
            isLoading={isLoading}
          />
        )}
      </div>
    </DialogHeader>
  );
}