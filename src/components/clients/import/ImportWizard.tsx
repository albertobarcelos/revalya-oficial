/**
 * Componente principal do Wizard de Importação
 * 
 * @module ImportWizard
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin,
  Eye,
  Download,
  CheckCircle2
} from 'lucide-react';
import { useImportWizard } from '@/hooks/useImportWizard';
import { FieldMappingStep } from './FieldMappingStep';
import { MappingConfirmationStep } from './MappingConfirmationStep';
import { DataPreviewStep } from './DataPreviewStep';
import { ImportingStep } from './ImportingStep';
import { RejectedRecordsStep } from './RejectedRecordsStep'; // AIDEV-NOTE: Importar novo componente
import type { AsaasCustomer } from '@/types/asaas';
import type { RejectedRecord } from '@/types/import'; // AIDEV-NOTE: Importar tipo RejectedRecord

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'csv' | 'asaas';
  data: any[];
  onSuccess: (result: any) => void;
  isImporting?: boolean;
  importProgress?: {
    current: number;
    total: number;
    status: string;
  };
}

// AIDEV-NOTE: Função utilitária para gerar CSV de registros rejeitados
const generateRejectedRecordsCSV = (rejectedRecords: RejectedRecord[]): string => {
  if (rejectedRecords.length === 0) return '';
  
  // AIDEV-NOTE: Cabeçalhos do CSV
  const headers = ['Linha', 'Erro', 'Pode ser Corrigido', ...Object.keys(rejectedRecords[0].data)];
  
  // AIDEV-NOTE: Converter registros para linhas CSV
  const rows = rejectedRecords.map(record => [
    record.rowNumber.toString(),
    record.errorMessage,
    record.canBeFixed ? 'Sim' : 'Não',
    ...Object.values(record.data).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '')
    )
  ]);
  
  // AIDEV-NOTE: Combinar cabeçalhos e linhas
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

// AIDEV-NOTE: Função utilitária para download de CSV
const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export function ImportWizard({
  open,
  onOpenChange,
  sourceType,
  data,
  onSuccess,
  isImporting = false,
  importProgress
}: ImportWizardProps) {
  const {
    importState,
    config,
    selectedRecords,
    mappingProgress,
    canProceedToPreview,
    fullSourceData,
    initializeSourceData,
    updateFieldMapping,
    processAllRecords,
    toggleRecordSelection,
    selectAllValid,
    deselectAll,
    goToStep,
    resetWizard,
    setConfig,
    setRejectedRecords // AIDEV-NOTE: Adicionar função para definir registros rejeitados
  } = useImportWizard();

  // AIDEV-NOTE: Inicializar dados quando o modal abre
  React.useEffect(() => {
    if (open && data.length > 0) {
      console.log('🔍 [DEBUG][ImportWizard] Dados recebidos:', {
        sourceType,
        dataLength: data.length,
        firstRecord: data[0],
        hasIdField: data[0]?.id ? 'SIM' : 'NÃO',
        idValue: data[0]?.id
      });
      initializeSourceData(data, sourceType);
    }
  }, [open, data, sourceType, initializeSourceData]);

  // AIDEV-NOTE: Resetar quando o modal fecha
  React.useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open, resetWizard]);

  // AIDEV-NOTE: Calcular progresso do wizard
  const getStepProgress = () => {
    switch (importState.step) {
      case 'mapping':
        return 25;
      case 'confirmation':
        return 50;
      case 'preview':
        return 75;
      case 'importing':
        return 100;
      default:
        return 0;
    }
  };

  // AIDEV-NOTE: Obter ícone da etapa atual
  const getStepIcon = (step: string) => {
    switch (step) {
      case 'mapping':
        return <MapPin className="h-4 w-4" />;
      case 'confirmation':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'preview':
        return <Eye className="h-4 w-4" />;
      case 'importing':
        return <Download className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // AIDEV-NOTE: Handlers das etapas
  const handleMappingNext = () => {
    // AIDEV-NOTE: Nova lógica - ir para confirmação em vez de processar diretamente
    goToStep('confirmation');
  };

  const handleConfirmationBack = () => {
    goToStep('mapping');
  };

  const handleConfirmationNext = async () => {
    // AIDEV-NOTE: Processar todos os dados após confirmação do mapeamento
    await processAllRecords();
  };

  const handlePreviewBack = () => {
    goToStep('confirmation');
  };

  const handlePreviewNext = () => {
    // AIDEV-NOTE: Ir para o step de importação em vez de chamar onImportComplete diretamente
    goToStep('importing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getStepIcon(importState.step)}
            Assistente de Importação
          </DialogTitle>
          <DialogDescription>
            Importe clientes do {sourceType === 'asaas' ? 'Asaas' : 'arquivo CSV'} em 4 etapas simples
          </DialogDescription>
          
          {/* Progress Bar */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between mt-4">
              {[
                { key: 'mapping', label: 'Mapeamento', icon: MapPin },
                { key: 'confirmation', label: 'Confirmação', icon: CheckCircle2 },
                { key: 'preview', label: 'Preview', icon: Eye },
                { key: 'importing', label: 'Importação', icon: Download }
              ].map((step, index) => {
                const isActive = importState.step === step.key;
                const isCompleted = getStepProgress() > (index + 1) * 25;
                const Icon = step.icon;
                
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                      ${isActive 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : isCompleted
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-muted-foreground bg-muted text-muted-foreground'
                      }
                    `}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge 
                      variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {step.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-1">
          <AnimatePresence mode="wait">
            {importState.step === 'mapping' && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <FieldMappingStep
                  sourceData={importState.sourceData}
                  fieldMappings={importState.fieldMappings}
                  onUpdateMapping={updateFieldMapping}
                  onNext={handleMappingNext}
                  canProceed={canProceedToPreview}
                  mappingProgress={mappingProgress}
                  fullSourceData={fullSourceData}
                />
              </motion.div>
            )}

            {importState.step === 'confirmation' && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <MappingConfirmationStep
                  fieldMappings={importState.fieldMappings}
                  totalRecords={fullSourceData.length}
                  onConfirm={handleConfirmationNext}
                  onBack={handleConfirmationBack}
                  isProcessing={importState.isProcessing}
                />
              </motion.div>
            )}

            {importState.step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <DataPreviewStep
                  processedRecords={importState.processedRecords}
                  validRecords={importState.validRecords}
                  invalidRecords={importState.invalidRecords}
                  fieldMappings={importState.fieldMappings} // AIDEV-NOTE: Passar fieldMappings para DataPreviewStep
                  onToggleSelection={toggleRecordSelection}
                  onSelectAllValid={selectAllValid}
                  onDeselectAll={deselectAll}
                  onBack={handlePreviewBack}
                  onNext={handlePreviewNext}
                  selectedCount={selectedRecords.length}
                  isImporting={isImporting}
                  importProgress={importProgress}
                />
              </motion.div>
            )}

            {importState.step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ImportingStep
                  selectedRecords={selectedRecords}
                  fieldMappings={importState.fieldMappings}
                  onImportComplete={onSuccess}
                  onBack={() => goToStep('preview')}
                  onClose={() => onOpenChange(false)}
                  onRejectedRecords={setRejectedRecords} // AIDEV-NOTE: Passar função para lidar com registros rejeitados
                />
              </motion.div>
            )}

            {importState.step === 'rejected' && (
              <motion.div
                key="rejected"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <RejectedRecordsStep
                  rejectedRecords={importState.rejectedRecords || []}
                  onCorrectRecord={(recordIndex, correctedData) => {
                    // AIDEV-NOTE: Implementar correção de registro
                    const updatedRejectedRecords = [...(importState.rejectedRecords || [])];
                    if (updatedRejectedRecords[recordIndex]) {
                      updatedRejectedRecords[recordIndex] = {
                        ...updatedRejectedRecords[recordIndex],
                        data: correctedData,
                        canBeFixed: false // AIDEV-NOTE: Marcar como corrigido
                      };
                      
                      // AIDEV-NOTE: Atualizar estado com registros corrigidos
                      setImportState(prev => ({
                        ...prev,
                        rejectedRecords: updatedRejectedRecords
                      }));
                    }
                  }}
                  onRetryImport={() => {
                    // AIDEV-NOTE: Filtrar apenas registros corrigidos e voltar para importação
                    const correctedRecords = (importState.rejectedRecords || [])
                      .filter(record => !record.canBeFixed)
                      .map(record => record.data);
                    
                    if (correctedRecords.length > 0) {
                      // AIDEV-NOTE: Atualizar selectedRecords com registros corrigidos
                      setSelectedRecords(correctedRecords);
                      goToStep('importing');
                    }
                  }}
                  onGoBack={() => goToStep('preview')}
                  onExportRejected={() => {
                    // AIDEV-NOTE: Implementar exportação de registros rejeitados para CSV
                    const csvContent = generateRejectedRecordsCSV(importState.rejectedRecords || []);
                    downloadCSV(csvContent, 'registros-rejeitados.csv');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}