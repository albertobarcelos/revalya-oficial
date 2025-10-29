// =====================================================
// COMPONENT: AsaasImportDialog
// Descrição: Modal para importação ativa de cobranças ASAAS
// =====================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAsaasImport, type AsaasImportParams } from '@/hooks/useAsaasImport';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// AIDEV-NOTE: Interface para props do componente
interface AsaasImportDialogProps {
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

// AIDEV-NOTE: Componente principal do diálogo
export function AsaasImportDialog({ trigger, onImportComplete }: AsaasImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => 
    format(subDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() => 
    format(new Date(), 'yyyy-MM-dd')
  );
  const [limit, setLimit] = useState(100);

  const {
    isImporting,
    hasAccess,
    importCharges,
    lastImportResult,
    isSuccess,
    isError,
    reset
  } = useAsaasImport();

  // AIDEV-NOTE: Handler para executar importação
  const handleImport = () => {
    const params: AsaasImportParams = {
      startDate,
      endDate,
      limit
    };

    importCharges(params);
  };

  // AIDEV-NOTE: Handler para fechar diálogo
  const handleClose = () => {
    setIsOpen(false);
    reset();
    onImportComplete?.();
  };

  // AIDEV-NOTE: Calcular período em dias
  const periodDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  if (!hasAccess) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Importar ASAAS
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Importar Cobranças ASAAS
          </DialogTitle>
          <DialogDescription>
            Importe cobranças diretamente do ASAAS para a reconciliação.
            O sistema evita duplicações baseado no ID externo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AIDEV-NOTE: Formulário de filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filtros de Importação
              </CardTitle>
              <CardDescription>
                Configure o período e limite para importação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data Inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isImporting}
                    max={endDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data Final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isImporting}
                    min={startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Limite de Registros</Label>
                <Input
                  id="limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Math.min(1000, parseInt(e.target.value) || 100)))}
                  disabled={isImporting}
                  min={1}
                  max={1000}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 1000 registros por importação
                </p>
              </div>

              {/* AIDEV-NOTE: Informações do período */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">Período:</span> {periodDays} dia{periodDays !== 1 ? 's' : ''}
                </div>
                {periodDays > 90 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Período muito longo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AIDEV-NOTE: Resultado da última importação */}
          {(isSuccess || isError) && lastImportResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Card className={isSuccess ? "border-green-200" : "border-red-200"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Resultado da Importação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastImportResult.success && lastImportResult.summary && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {lastImportResult.summary.total_imported ?? 0}
                        </div>
                        <div className="text-sm text-green-700">Novos</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {lastImportResult.summary.total_updated ?? 0}
                        </div>
                        <div className="text-sm text-orange-700">Atualizados</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {lastImportResult.summary.total_skipped ?? 0}
                        </div>
                        <div className="text-sm text-blue-700">Já existiam</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {lastImportResult.summary.total_errors ?? 0}
                        </div>
                        <div className="text-sm text-red-700">Erros</div>
                      </div>
                    </div>
                  )}

                  {/* AIDEV-NOTE: Resumo detalhado das operações */}
                  {lastImportResult.success && lastImportResult.summary && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">Resumo da Operação:</div>
                        <div className="space-y-1">
                          <div>• Total processado: {lastImportResult.summary.total_processed ?? 0} registros</div>
                          {(lastImportResult.summary.total_updated ?? 0) > 0 && (
                            <div className="text-orange-700">
                              • {lastImportResult.summary.total_updated} registros foram atualizados com novos dados
                            </div>
                          )}
                          {(lastImportResult.summary.total_imported ?? 0) > 0 && (
                            <div className="text-green-700">
                              • {lastImportResult.summary.total_imported} novos registros foram inseridos
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {lastImportResult.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{lastImportResult.error}</p>
                    </div>
                  )}

                  {(lastImportResult.summary?.errors?.length > 0 || lastImportResult.errors?.length > 0) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Detalhes dos Erros:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {(lastImportResult.summary?.errors || lastImportResult.errors || []).map((error, index) => (
                          <div key={index} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                            {typeof error === 'string' ? error : JSON.stringify(error)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AIDEV-NOTE: Botões de ação */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              {isSuccess || isError ? 'Fechar' : 'Cancelar'}
            </Button>
            
            <Button
              onClick={handleImport}
              disabled={isImporting || periodDays > 90}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importar Cobranças
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}