/**
 * Componente de Pré-visualização de Importação
 * 
 * Exibe os dados que serão importados para validação do usuário
 * antes da inserção definitiva no banco de dados.
 * 
 * @module ImportPreview
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Eye,
  Download,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { AsaasCustomer } from '@/types/asaas';

interface ImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AsaasCustomer[];
  source: 'asaas' | 'csv';
  onConfirm: (selectedData: AsaasCustomer[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function ImportPreview({ 
  open, 
  onOpenChange, 
  data, 
  source, 
  onConfirm, 
  onCancel,
  isLoading = false
}: ImportPreviewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // AIDEV-NOTE: Validação dos dados antes da importação
  const validateCustomer = (customer: AsaasCustomer): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validações obrigatórias
    if (!customer.name?.trim()) {
      errors.push('Nome é obrigatório');
    }
    if (!customer.email?.trim()) {
      errors.push('Email é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.push('Email inválido');
    }

    // Validações de aviso
    if (!customer.cpfCnpj?.trim()) {
      warnings.push('CPF/CNPJ não informado');
    }
    if (!customer.phone?.trim()) {
      warnings.push('Telefone não informado');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Memoização das validações
  const validationResults = useMemo(() => {
    return data.map(customer => ({
      customer,
      validation: validateCustomer(customer)
    }));
  }, [data]);

  const validCustomers = validationResults.filter(item => item.validation.isValid);
  const invalidCustomers = validationResults.filter(item => !item.validation.isValid);

  // Inicializar seleção com todos os clientes válidos
  React.useEffect(() => {
    const validIds = new Set(validCustomers.map(item => item.customer.id));
    setSelectedItems(validIds);
  }, [validCustomers]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const validIds = new Set(validCustomers.map(item => item.customer.id));
      setSelectedItems(validIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedItems(newSelected);
    setSelectAll(newSelected.size === validCustomers.length);
  };

  const handleConfirm = () => {
    const selectedData = validCustomers
      .filter(item => selectedItems.has(item.customer.id))
      .map(item => item.customer);
    onConfirm(selectedData);
  };

  const getSourceLabel = () => {
    return source === 'asaas' ? 'Asaas' : 'Planilha CSV';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Eye className="h-5 w-5 text-primary" />
            Pré-visualização da Importação
          </DialogTitle>
          <DialogDescription>
            Revise os dados que serão importados do {getSourceLabel()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{data.length}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Válidos</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{validCustomers.length}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">Com Erros</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{invalidCustomers.length}</p>
            </div>
          </motion.div>

          {/* Controles de Seleção */}
          {validCustomers.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Selecionar todos os válidos ({selectedItems.size} de {validCustomers.length})
                </label>
              </div>
            </div>
          )}

          {/* Tabela de Dados */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-12">
                    <span className="sr-only">Seleção</span>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Problemas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationResults.map((item, index) => (
                  <motion.tr
                    key={item.customer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`${!item.validation.isValid ? 'bg-red-50' : ''}`}
                  >
                    <TableCell>
                      {item.validation.isValid && (
                        <Checkbox
                          checked={selectedItems.has(item.customer.id)}
                          onCheckedChange={(checked) => 
                            handleSelectItem(item.customer.id, checked as boolean)
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.validation.isValid ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.customer.name || '-'}</TableCell>
                    <TableCell>{item.customer.email || '-'}</TableCell>
                    <TableCell>{item.customer.cpfCnpj || '-'}</TableCell>
                    <TableCell>{item.customer.phone || '-'}</TableCell>
                    <TableCell>{item.customer.company || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.validation.errors.map((error, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {error}
                          </div>
                        ))}
                        {item.validation.warnings.map((warning, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-yellow-600">
                            <AlertTriangle className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Alertas */}
          {invalidCustomers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900">
                  {invalidCustomers.length} cliente(s) com problemas
                </span>
              </div>
              <p className="text-sm text-red-700">
                Estes clientes não serão importados devido a erros de validação.
                Corrija os dados e tente novamente.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedItems.size === 0 || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Importando...
              </div>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Importar {selectedItems.size} Cliente(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}