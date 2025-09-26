/**
 * Componente da etapa de Importação
 * Microserviço separado para inserção de dados no Supabase
 * 
 * @module ImportingStep
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Users,
  Clock,
  Database,
  ArrowLeft,
  X
} from 'lucide-react';
import { importService, type ImportResult, type ImportProgress } from '@/services/importService';

interface ImportingStepProps {
  selectedRecords: any[];
  onImportComplete: (result: ImportResult) => void;
  onBack: () => void;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'error' | 'partial';

export function ImportingStep({ 
  selectedRecords, 
  onImportComplete, 
  onBack,
  onClose 
}: ImportingStepProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<string>('');
  const [retryAttempts, setRetryAttempts] = useState(0);
  const maxRetries = 3;

  // AIDEV-NOTE: Calcular duração em tempo real
  useEffect(() => {
    if (startTime && status === 'importing') {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
          setDuration(`${minutes}m ${seconds % 60}s`);
        } else {
          setDuration(`${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, status]);

  // AIDEV-NOTE: Preparar dados para importação
  const prepareDataForImport = () => {
    return selectedRecords.map(record => record.mappedData);
  };

  // AIDEV-NOTE: Executar importação
  const executeImport = async (attempt: number = 1) => {
    try {
      setStatus('importing');
      setStartTime(new Date());
      setRetryAttempts(attempt - 1);
      
      const dataToImport = prepareDataForImport();
      
      console.log('🔍 [ImportingStep] Iniciando importação de', dataToImport.length, 'registros');
      
      const importResult = await importService.importCustomers(
        dataToImport,
        (progressData: ImportProgress) => {
          setProgress(progressData);
        }
      );
      
      setResult(importResult);
      
      // AIDEV-NOTE: Determinar status final baseado no resultado
      if (importResult.errors.length === 0) {
        setStatus('success');
      } else if (importResult.success.length === 0) {
        setStatus('error');
      } else {
        setStatus('partial');
      }
      
      // AIDEV-NOTE: Notificar componente pai
      onImportComplete(importResult);
      
    } catch (error) {
      console.error('❌ [ImportingStep] Erro na importação:', error);
      
      // AIDEV-NOTE: Tentar novamente se não excedeu o limite
      if (attempt < maxRetries) {
        console.log(`🔄 [ImportingStep] Tentativa ${attempt + 1} de ${maxRetries}`);
        setTimeout(() => executeImport(attempt + 1), 2000);
      } else {
        setStatus('error');
        setResult({
          success: [],
          errors: [{
            record: {},
            error: error instanceof Error ? error.message : 'Erro desconhecido na importação'
          }],
          total: selectedRecords.length
        });
      }
    }
  };

  // AIDEV-NOTE: Iniciar importação automaticamente
  useEffect(() => {
    if (selectedRecords.length > 0 && status === 'idle') {
      executeImport();
    }
  }, [selectedRecords]);

  // AIDEV-NOTE: Calcular porcentagem de progresso
  const getProgressPercentage = () => {
    if (!progress || progress.current === 0) return 0;
    return Math.round((progress.current / selectedRecords.length) * 100);
  };

  // AIDEV-NOTE: Obter cor do status
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'partial': return 'text-yellow-600';
      case 'importing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // AIDEV-NOTE: Obter ícone do status
  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'importing': return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default: return <Download className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2"
        >
          {getStatusIcon()}
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {status === 'importing' && 'Importando Clientes...'}
            {status === 'success' && 'Importação Concluída!'}
            {status === 'error' && 'Erro na Importação'}
            {status === 'partial' && 'Importação Parcial'}
            {status === 'idle' && 'Preparando Importação...'}
          </h2>
        </motion.div>
        
        <p className="text-muted-foreground">
          {status === 'importing' && `Processando ${selectedRecords.length} registros selecionados`}
          {status === 'success' && 'Todos os clientes foram importados com sucesso'}
          {status === 'error' && 'Ocorreu um erro durante a importação'}
          {status === 'partial' && 'Alguns clientes foram importados com sucesso'}
          {status === 'idle' && 'Iniciando processo de importação...'}
        </p>
      </div>

      {/* Progress Section */}
      {(status === 'importing' || progress) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className={`h-4 w-4 ${status === 'importing' ? 'animate-spin' : ''}`} />
                Progresso da Importação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Registros processados</span>
                  <span>{progress?.current || 0} de {selectedRecords.length}</span>
                </div>
                <Progress 
                  value={getProgressPercentage()} 
                  className="h-3"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getProgressPercentage()}% concluído</span>
                  {duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{duration}</span>
                    </div>
                  )}
                </div>
              </div>

              {progress?.status && (
                <div className="text-sm text-muted-foreground">
                  Status: {progress.status}
                </div>
              )}

              {progress?.currentRecord && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Processando: </span>
                  <span className="font-medium">{progress.currentRecord.name}</span>
                </div>
              )}

              {retryAttempts > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tentativa {retryAttempts + 1} de {maxRetries}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Sucessos</p>
                    <p className="text-2xl font-bold text-green-700">{result.success.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-red-600 font-medium">Erros</p>
                    <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total</p>
                    <p className="text-2xl font-bold text-blue-700">{result.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Details */}
          {result.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Erros Encontrados ({result.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-800">
                            {error.record.name || 'Registro sem nome'}
                          </p>
                          <p className="text-xs text-red-600 mt-1">{error.error}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... e mais {result.errors.length - 5} erros
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-between pt-4 border-t"
      >
        <Button
          variant="outline"
          onClick={onBack}
          disabled={status === 'importing'}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          {status === 'error' && retryAttempts < maxRetries && (
            <Button
              variant="outline"
              onClick={() => executeImport(retryAttempts + 2)}
              disabled={status === 'importing'}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
          
          <Button
            onClick={onClose}
            disabled={status === 'importing'}
            className="flex items-center gap-2"
            variant={status === 'success' ? 'default' : 'outline'}
          >
            {status === 'importing' ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Fechar
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}