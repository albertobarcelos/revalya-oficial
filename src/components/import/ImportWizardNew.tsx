import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { importApiService } from '@/services/importApiService';
import { useImportStatus } from '@/hooks/useImportStatus';

// AIDEV-NOTE: Interface para resultado da importação
interface ImportResult {
  jobId: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: any[];
}

// AIDEV-NOTE: Props do componente
interface ImportWizardNewProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
  tenantId: string;
  userId: string;
}

// AIDEV-NOTE: Componente principal do wizard de importação
export function ImportWizardNew({ onComplete, onCancel, tenantId, userId }: ImportWizardNewProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'completed'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // AIDEV-NOTE: Hook para tracking de status
  const {
    status,
    isPolling,
    error: statusError,
    startPolling,
    stopPolling,
    progressPercentage,
    formatTimeRemaining,
    isCompleted,
    isFailed,
    hasErrors
  } = useImportStatus({
    jobId: jobId || undefined,
    autoStart: false,
    onComplete: (finalStatus) => {
      setCurrentStep('completed');
      onComplete?.({
        jobId: finalStatus.jobId,
        totalRecords: finalStatus.totalRecords,
        successCount: finalStatus.successCount,
        errorCount: finalStatus.errorCount,
        errors: finalStatus.errors
      });
    },
    onError: (error) => {
      console.error('❌ Erro no tracking:', error);
    }
  });

  // AIDEV-NOTE: Manipular drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  // AIDEV-NOTE: Validar e selecionar arquivo
  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null);
    
    // Validar tipo de arquivo
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setUploadError('Tipo de arquivo não suportado. Use CSV, XLS ou XLSX.');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    setSelectedFile(file);
  }, []);

  // AIDEV-NOTE: Processar upload do arquivo
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setUploadError(null);
      setCurrentStep('processing');

      const response = await importApiService.uploadFile(selectedFile, tenantId, userId);
      
      if (response.success && response.jobId) {
        setJobId(response.jobId);
        startPolling(response.jobId);
      } else {
        throw new Error(response.error || 'Erro no upload');
      }

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro no upload');
      setCurrentStep('upload');
    }
  }, [selectedFile, tenantId, userId, startPolling]);

  // AIDEV-NOTE: Cancelar processo
  const handleCancel = useCallback(() => {
    stopPolling();
    onCancel?.();
  }, [stopPolling, onCancel]);

  // AIDEV-NOTE: Reiniciar processo
  const handleRestart = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setJobId(null);
    setUploadError(null);
    stopPolling();
  }, [stopPolling]);

  // AIDEV-NOTE: Renderizar step de upload
  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Importar Clientes</h3>
        <p className="text-muted-foreground">
          Selecione um arquivo CSV ou Excel para importar seus clientes
        </p>
      </div>

      {/* AIDEV-NOTE: Área de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <FileText className="mx-auto h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button onClick={() => setSelectedFile(null)} variant="outline" size="sm">
              Remover arquivo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Arraste seu arquivo aqui</p>
              <p className="text-muted-foreground">ou clique para selecionar</p>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              id="file-input"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-input" className="cursor-pointer">
                Selecionar arquivo
              </label>
            </Button>
          </div>
        )}
      </div>

      {/* AIDEV-NOTE: Erro de upload */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* AIDEV-NOTE: Ações */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile}
          className="min-w-[120px]"
        >
          Iniciar Importação
        </Button>
      </div>
    </motion.div>
  );

  // AIDEV-NOTE: Renderizar step de processamento
  const renderProcessingStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <Clock className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />
        <h3 className="text-lg font-semibold mb-2">Processando Importação</h3>
        <p className="text-muted-foreground">
          Aguarde enquanto processamos seu arquivo...
        </p>
      </div>

      {/* AIDEV-NOTE: Barra de progresso */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progresso</span>
          <span>{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* AIDEV-NOTE: Informações do status */}
      {status && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Processados</p>
                  <p className="text-lg font-bold">
                    {status.processedRecords} / {status.totalRecords}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tempo restante</p>
                  <p className="text-lg font-bold">
                    {formatTimeRemaining(status.estimatedTimeRemaining) || '--'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AIDEV-NOTE: Erro de processamento */}
      {statusError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{statusError}</AlertDescription>
        </Alert>
      )}

      {/* AIDEV-NOTE: Ações */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
      </div>
    </motion.div>
  );

  // AIDEV-NOTE: Renderizar step de conclusão
  const renderCompletedStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        {isFailed ? (
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        ) : (
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        )}
        <h3 className="text-lg font-semibold mb-2">
          {isFailed ? 'Importação Falhada' : 'Importação Concluída'}
        </h3>
        <p className="text-muted-foreground">
          {isFailed 
            ? 'Ocorreu um erro durante a importação'
            : 'Seus dados foram importados com sucesso'
          }
        </p>
      </div>

      {/* AIDEV-NOTE: Resumo dos resultados */}
      {status && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Sucessos</p>
                  <p className="text-2xl font-bold text-green-600">{status.successCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{status.errorCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AIDEV-NOTE: Lista de erros */}
      {hasErrors && status && status.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Erros Encontrados</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {status.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-200">
                  <p className="font-medium">Linha {error.row}</p>
                  <p className="text-red-600">{error.error}</p>
                </div>
              ))}
              {status.errors.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... e mais {status.errors.length - 10} erros
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AIDEV-NOTE: Ações */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleRestart}>
          Nova Importação
        </Button>
        <Button onClick={handleCancel}>
          Fechar
        </Button>
      </div>
    </motion.div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'completed' && renderCompletedStep()}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}