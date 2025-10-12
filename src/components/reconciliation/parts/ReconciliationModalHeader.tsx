import { motion } from 'framer-motion';
import { FileText, RefreshCw, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import ReconciliationHeaderIndicators from '../ReconciliationHeaderIndicators';
import { AsaasImportDialog } from './AsaasImportDialog';

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
  onImportComplete?: () => void; // Callback para atualizar dados após importação
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
  indicators,
  onImportComplete
}: ReconciliationModalHeaderProps) {
  // AIDEV-NOTE: Loading state robusto para o header
  if (isLoading && !indicators) {
    return (
      <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        {/* Skeleton para indicadores */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="relative">
                <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/30">
                  <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-12 sm:w-16 h-3 sm:h-4" />
                    <Skeleton className="w-8 sm:w-12 h-2 sm:h-3 hidden sm:block" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogHeader>
    );
  }

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
          {/* AIDEV-NOTE: Botão de importação ASAAS */}
          <AsaasImportDialog 
            onImportComplete={() => {
              refreshData();
              onImportComplete?.();
            }}
          />
          
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