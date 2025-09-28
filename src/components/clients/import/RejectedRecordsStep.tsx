/**
 * Componente para exibir registros rejeitados durante a importação
 * Permite correção e re-importação dos registros com erro
 * 
 * @module RejectedRecordsStep
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Edit3, 
  RefreshCw, 
  Download, 
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import type { RejectedRecord } from '@/types/import';

interface RejectedRecordsStepProps {
  rejectedRecords: RejectedRecord[];
  onCorrectRecord: (recordIndex: number, correctedData: Record<string, any>) => void;
  onRetryImport: () => void;
  onGoBack: () => void;
  onExportRejected: () => void;
}

export function RejectedRecordsStep({
  rejectedRecords,
  onCorrectRecord,
  onRetryImport,
  onGoBack,
  onExportRejected
}: RejectedRecordsStepProps) {
  const [editingRecord, setEditingRecord] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});

  // AIDEV-NOTE: Estatísticas dos registros rejeitados
  const stats = useMemo(() => {
    const total = rejectedRecords.length;
    const fixable = rejectedRecords.filter(r => r.canBeFixed).length;
    const critical = total - fixable;

    return { total, fixable, critical };
  }, [rejectedRecords]);

  // AIDEV-NOTE: Agrupar erros por tipo
  const errorGroups = useMemo(() => {
    const groups: Record<string, RejectedRecord[]> = {};
    
    rejectedRecords.forEach(record => {
      const errorType = record.errorMessage.split(':')[0] || 'Erro desconhecido';
      if (!groups[errorType]) {
        groups[errorType] = [];
      }
      groups[errorType].push(record);
    });

    return groups;
  }, [rejectedRecords]);

  const handleEditRecord = (record: RejectedRecord, index: number) => {
    setEditingRecord(index);
    setEditData({ ...record.data });
  };

  const handleSaveCorrection = () => {
    if (editingRecord !== null) {
      onCorrectRecord(editingRecord, editData);
      setEditingRecord(null);
      setEditData({});
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditData({});
  };

  const getErrorSeverity = (error: string): 'error' | 'warning' => {
    const criticalErrors = ['CPF/CNPJ', 'duplicado', 'obrigatório'];
    return criticalErrors.some(critical => error.toLowerCase().includes(critical.toLowerCase())) 
      ? 'error' 
      : 'warning';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* AIDEV-NOTE: Cabeçalho com estatísticas */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-orange-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Registros Rejeitados
            </h2>
            <p className="text-gray-600">
              Alguns registros não puderam ser importados
            </p>
          </div>
        </div>

        {/* AIDEV-NOTE: Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Card className="border-orange-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Rejeitados</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.fixable}</div>
              <div className="text-sm text-gray-600">Podem ser Corrigidos</div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-600">Erros Críticos</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AIDEV-NOTE: Resumo por tipo de erro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumo dos Erros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {Object.entries(errorGroups).map(([errorType, records]) => (
              <div key={errorType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={getErrorSeverity(errorType) === 'error' ? 'destructive' : 'secondary'}>
                    {records.length}
                  </Badge>
                  <span className="font-medium">{errorType}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {records.length} registro{records.length > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AIDEV-NOTE: Lista de registros rejeitados */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Rejeitados</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {rejectedRecords.map((record, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* AIDEV-NOTE: Cabeçalho do registro */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Linha {record.rowNumber}</Badge>
                      <Badge 
                        variant={getErrorSeverity(record.errorMessage) === 'error' ? 'destructive' : 'secondary'}
                      >
                        {getErrorSeverity(record.errorMessage) === 'error' ? (
                          <XCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {record.errorMessage}
                      </Badge>
                    </div>
                    
                    {record.canBeFixed && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRecord(record, index)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Corrigir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Corrigir Registro - Linha {record.rowNumber}</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800">
                                <strong>Erro:</strong> {record.errorMessage}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(record.data).map(([key, value]) => (
                                <div key={key} className="space-y-2">
                                  <Label htmlFor={key} className="capitalize">
                                    {key.replace('_', ' ')}
                                  </Label>
                                  {key === 'observations' ? (
                                    <Textarea
                                      id={key}
                                      value={editData[key] || ''}
                                      onChange={(e) => setEditData(prev => ({
                                        ...prev,
                                        [key]: e.target.value
                                      }))}
                                      // className={record.field === key ? 'border-red-300' : ''}
                                    />
                                  ) : (
                                    <Input
                                      id={key}
                                      value={editData[key] || ''}
                                      onChange={(e) => setEditData(prev => ({
                                        ...prev,
                                        [key]: e.target.value
                                      }))}
                                      // className={record.field === key ? 'border-red-300' : ''}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={handleCancelEdit}>
                                Cancelar
                              </Button>
                              <Button onClick={handleSaveCorrection}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Salvar Correção
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* AIDEV-NOTE: Dados do registro */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(record.data).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">
                          {key.replace('_', ' ')}:
                        </span>
                        <span 
                                  // className={record.field === key ? 'text-red-600 font-medium' : ''}
                                >
                          {value || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AIDEV-NOTE: Ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <Button variant="outline" onClick={onExportRejected}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Rejeitados
          </Button>
        </div>

        <div className="flex gap-3">
          <Button onClick={onRetryImport} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    </motion.div>
  );
}