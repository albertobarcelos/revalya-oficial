/**
 * Componente para a etapa de preview dos dados mapeados
 * 
 * @module DataPreviewStep
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Download,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProcessedRecord } from '@/types/import';
import { SYSTEM_FIELDS } from '@/types/import';

interface DataPreviewStepProps {
  processedRecords: ProcessedRecord[];
  validRecords: ProcessedRecord[];
  invalidRecords: ProcessedRecord[];
  onToggleSelection: (recordId: string) => void;
  onSelectAllValid: () => void;
  onDeselectAll: () => void;
  onBack: () => void;
  onNext: () => void;
  selectedCount: number;
  isImporting?: boolean;
  importProgress?: {
    current: number;
    total: number;
    status: string;
  };
}

export function DataPreviewStep({
  processedRecords,
  validRecords,
  invalidRecords,
  onToggleSelection,
  onSelectAllValid,
  onDeselectAll,
  onBack,
  onNext,
  selectedCount,
  isImporting = false,
  importProgress
}: DataPreviewStepProps) {
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const [editingCell, setEditingCell] = useState<{ recordId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // AIDEV-NOTE: Iniciar edição de célula
  const startEditing = (recordId: string, field: string, currentValue: string) => {
    setEditingCell({ recordId, field });
    setEditingValue(currentValue || '');
  };

  // AIDEV-NOTE: Cancelar edição
  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  // AIDEV-NOTE: Salvar edição (implementação simplificada)
  const saveEdit = () => {
    // TODO: Implementar lógica de salvamento
    console.log('Salvando edição:', editingCell, editingValue);
    setEditingCell(null);
    setEditingValue('');
  };

  // AIDEV-NOTE: Filtrar registros para exibição
  const displayRecords = showInvalidOnly ? invalidRecords : processedRecords;

  // AIDEV-NOTE: Obter campos mapeados para exibição
  const mappedFields = SYSTEM_FIELDS.filter(field => 
    processedRecords.some(record => 
      record.mappedData[field.key] !== undefined && 
      record.mappedData[field.key] !== null &&
      record.mappedData[field.key] !== ''
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Preview dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Revise os dados mapeados e corrija eventuais problemas antes da importação
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{processedRecords.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Válidos</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{validRecords.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Com Erros</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{invalidRecords.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Selecionados</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{selectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAllValid}
          >
            Selecionar Todos Válidos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
          >
            Desselecionar Todos
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-invalid"
            checked={showInvalidOnly}
            onCheckedChange={setShowInvalidOnly}
          />
          <label htmlFor="show-invalid" className="text-sm">
            Mostrar apenas registros com erro
          </label>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dados Mapeados ({displayRecords.length} registros)
          </CardTitle>
          <CardDescription>
            Clique em qualquer célula para editar. Registros com erro são destacados em vermelho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCount === validRecords.length && validRecords.length > 0}
                      onCheckedChange={(checked) => 
                        checked ? onSelectAllValid() : onDeselectAll()
                      }
                    />
                  </TableHead>
                  <TableHead className="w-16">Status</TableHead>
                  {mappedFields.map(field => (
                    <TableHead key={field.key} className="min-w-[150px]">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`${
                      !record.validation.isValid 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : record.selected 
                          ? 'bg-blue-50 dark:bg-blue-950/20'
                          : ''
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={record.selected}
                        onCheckedChange={() => onToggleSelection(record.id)}
                        disabled={!record.validation.isValid}
                      />
                    </TableCell>
                    <TableCell>
                      {record.validation.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600">
                            {record.validation.errors.length} erro(s)
                          </span>
                        </div>
                      )}
                    </TableCell>
                    {mappedFields.map(field => {
                      const value = record.mappedData[field.key] || '';
                      const isEditing = editingCell?.recordId === record.id && 
                                       editingCell?.field === field.key;
                      const hasError = record.validation.errors.some(e => e.field === field.key);
                      
                      return (
                        <TableCell 
                          key={field.key}
                          className={`${hasError ? 'bg-red-100 dark:bg-red-900/30' : ''}`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={saveEdit}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={cancelEditing}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => startEditing(record.id, field.key, value)}
                            >
                              <span className="text-sm truncate flex-1">
                                {value || (
                                  <span className="text-muted-foreground italic">
                                    Vazio
                                  </span>
                                )}
                              </span>
                              <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                          {hasError && (
                            <div className="text-xs text-red-600 mt-1">
                              {record.validation.errors
                                .filter(e => e.field === field.key)
                                .map(e => e.message)
                                .join(', ')}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isImporting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <motion.div
          animate={isImporting ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Button 
            onClick={onNext}
            disabled={selectedCount === 0 || isImporting}
            className="min-w-[180px] relative overflow-hidden"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {importProgress?.status || 'Importando...'}
                  </span>
                  {importProgress && (
                    <span className="text-xs opacity-80">
                      {importProgress.current} de {importProgress.total}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Importar ({selectedCount})
              </>
            )}
            
            {/* Progress bar overlay */}
            {isImporting && importProgress && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-primary/30 rounded-b"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(importProgress.current / importProgress.total) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}