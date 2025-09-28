import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { DetailedError, BulkInsertResult } from '@/types/bulkInsertTypes';

// AIDEV-NOTE: Componente para exibir progresso de inserção em lote
// Design moderno com animações e feedback visual claro
// Agora suporta erros categorizados e ações contextuais

interface BulkInsertProgressProps {
  isLoading: boolean;
  progress: {
    processed: number;
    total: number;
    percentage: number;
  } | null;
  result: BulkInsertResult | null;
  error: string | null;
  className?: string;
  onRetryError?: (error: DetailedError) => void;
  onIgnoreError?: (error: DetailedError) => void;
  onEditError?: (error: DetailedError) => void;
  onViewErrorDetails?: (error: DetailedError) => void;
  onExportErrors?: () => void;
}

export function BulkInsertProgress({
  isLoading,
  progress,
  result,
  error,
  className = '',
  onRetryError,
  onIgnoreError,
  onEditError,
  onViewErrorDetails,
  onExportErrors
}: BulkInsertProgressProps) {
  if (!isLoading && !progress && !result && !error) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Database className="h-5 w-5 text-blue-500" />
                  </motion.div>
                  Inserindo dados...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Inserção concluída
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Erro na inserção
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-orange-500" />
                  Processando...
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Barra de Progresso */}
            {(isLoading || progress) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {progress?.processed || 0} de {progress?.total || 0} registros
                  </span>
                  <span>{progress?.percentage || 0}%</span>
                </div>
                <Progress 
                  value={progress?.percentage || 0} 
                  className="h-3 bg-gray-200"
                />
              </div>
            )}

            {/* Resultado Final */}
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Total de registros</div>
                    <div className="font-semibold text-lg">{result.totalRecords}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Processados</div>
                    <div className="font-semibold text-lg text-green-600">
                      {result.processedRecords}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={result.success ? "default" : "secondary"}
                      className={result.success ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                    >
                      {result.success ? "Sucesso" : "Parcial"}
                    </Badge>
                    
                    {result.errors.length > 0 && (
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        {result.errors.length} erros
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {result.duration}ms
                  </div>
                </div>

                {/* Resumo de Erros por Categoria */}
                {result.summary && result.errors.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="text-sm font-medium text-gray-800 mb-2">
                      Resumo dos erros:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {result.summary.validationErrors > 0 && (
                        <div className="flex justify-between">
                          <span>Validação:</span>
                          <span className="font-medium">{result.summary.validationErrors}</span>
                        </div>
                      )}
                      {result.summary.duplicateErrors > 0 && (
                        <div className="flex justify-between">
                          <span>Duplicatas:</span>
                          <span className="font-medium">{result.summary.duplicateErrors}</span>
                        </div>
                      )}
                      {result.summary.systemErrors > 0 && (
                        <div className="flex justify-between">
                          <span>Sistema:</span>
                          <span className="font-medium">{result.summary.systemErrors}</span>
                        </div>
                      )}
                      {result.summary.permissionErrors > 0 && (
                        <div className="flex justify-between">
                          <span>Permissão:</span>
                          <span className="font-medium">{result.summary.permissionErrors}</span>
                        </div>
                      )}
                      {result.summary.networkErrors > 0 && (
                        <div className="flex justify-between">
                          <span>Rede:</span>
                          <span className="font-medium">{result.summary.networkErrors}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Erro Geral */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="text-sm font-medium text-red-800 mb-1">
                  Erro na operação:
                </div>
                <div className="text-sm text-red-700">{error}</div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Exibição Detalhada de Erros */}
        {result && result.errors.length > 0 && (
          <div className="mt-4">
            <ErrorDisplay
              errors={result.errors}
              onRetry={onRetryError}
              onIgnore={onIgnoreError}
              onEdit={onEditError}
              onViewDetails={onViewErrorDetails}
              onExportErrors={onExportErrors}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default BulkInsertProgress;