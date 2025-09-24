/**
 * Componente de Pré-visualização de Importação
 * 
 * Exibe os dados que serão importados para validação do usuário
 * antes da inserção definitiva no banco de dados.
 */
import React from 'react';
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
import { Input } from '@/components/ui/input';
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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X as XIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { AsaasCustomer } from '@/types/asaas';

// AIDEV-NOTE: Importação dos hooks customizados para modularização
import { useImportValidation } from '@/hooks/useImportValidation';
import { useImportFilters } from '@/hooks/useImportFilters';
import { useImportPagination } from '@/hooks/useImportPagination';
import { useImportSelection } from '@/hooks/useImportSelection';
import { useImportEditing } from '@/hooks/useImportEditing';
import { getSourceLabel, applyEditsToSelectedData } from '@/utils/importHelpers';

interface ImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AsaasCustomer[];
  source: 'asaas' | 'csv';
  onConfirm: (selectedData: AsaasCustomer[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
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
  // AIDEV-NOTE: Usando hooks customizados para modularização
  const { validationResults, validCustomers, invalidCustomers } = useImportValidation(data);
  const { activeFilter, setActiveFilter, searchTerm, setSearchTerm, filteredData } = useImportFilters(
    validationResults, 
    validCustomers, 
    invalidCustomers
  );
  
  // AIDEV-NOTE: Declarando paginação antes da seleção para evitar TDZ
  const itemsPerPage = 10;
  const { 
    currentPage, 
    totalPages, 
    currentPageData, 
    goToPage, 
    goToPreviousPage, 
    goToNextPage 
  } = useImportPagination(filteredData, itemsPerPage, activeFilter, searchTerm);
  
  const { selectedItems, handleSelectAll, handleSelectAllPage, handleSelectItem, isAllPageSelected, isSomePageSelected } = useImportSelection(validCustomers, currentPageData, open);
  const { 
    editingCell, 
    editingValue, 
    editedData, 
    setEditingValue, 
    startEditing, 
    cancelEditing, 
    saveEdit, 
    getDisplayValue 
  } = useImportEditing();

  const handleConfirm = () => {
    const finalData = applyEditsToSelectedData(data, selectedItems, editedData);
    onConfirm(finalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-7xl max-h-[95vh] w-full p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh] overflow-hidden">
          <DialogHeader className="space-y-3 p-4 sm:p-6 pb-4 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Pré-visualização da Importação
            </DialogTitle>
            <DialogDescription className="text-sm">
                Revise os dados que serão importados do {getSourceLabel(source)}
              </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Estatísticas e Filtros */}
            <div className="p-4 sm:p-6 space-y-4 flex-shrink-0 border-b bg-muted/30">
              {/* Estatísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <motion.div 
                  className="flex items-center gap-2 p-3 bg-background rounded-lg border"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">{data.length}</p>
                  </div>
                </motion.div>

                <motion.div 
                  className={`flex items-center gap-2 p-3 bg-background rounded-lg border cursor-pointer transition-colors ${
                    activeFilter === 'valid' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-muted/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setActiveFilter(activeFilter === 'valid' ? 'all' : 'valid')}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-sm sm:font-medium text-green-900">Válidos</span>
                    </p>
                    <p className="text-lg font-semibold text-green-700">{validCustomers.length}</p>
                  </div>
                </motion.div>

                <motion.div 
                  className={`flex items-center gap-2 p-3 bg-background rounded-lg border cursor-pointer transition-colors ${
                    activeFilter === 'invalid' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-muted/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setActiveFilter(activeFilter === 'invalid' ? 'all' : 'invalid')}
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Com Erros</p>
                    <p className="text-lg font-semibold text-red-700">{invalidCustomers.length}</p>
                  </div>
                </motion.div>
              </div>

              {/* Controles de Seleção */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  {/* AIDEV-NOTE: Checkbox para selecionar todos os válidos globalmente */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-global"
                      checked={selectedItems.size === validCustomers.length && validCustomers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all-global" className="text-sm font-medium cursor-pointer">
                      Selecionar todos os válidos ({selectedItems.size} de {validCustomers.length})
                    </label>
                  </div>

                  {/* AIDEV-NOTE: Checkbox para selecionar todos da página atual */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-page"
                      checked={isAllPageSelected()}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isSomePageSelected();
                        }
                      }}
                      onCheckedChange={handleSelectAllPage}
                    />
                    <label htmlFor="select-all-page" className="text-sm font-medium cursor-pointer">
                      Selecionar página atual
                    </label>
                  </div>
                </div>

                {/* AIDEV-NOTE: Informações de paginação */}
                <div className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
                </div>
              </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full w-full overflow-auto">
                <div className="min-w-[1800px]">
                  <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-12">
                          <span className="sr-only">Seleção</span>
                        </TableHead>
                        <TableHead className="w-16 min-w-[64px] whitespace-nowrap">Status</TableHead>
                        <TableHead className="w-48 min-w-[192px] whitespace-nowrap">Nome</TableHead>
                        <TableHead className="w-48 min-w-[192px] whitespace-nowrap">Email</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">CPF/CNPJ</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Telefone</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Celular</TableHead>
                        <TableHead className="w-48 min-w-[192px] whitespace-nowrap">Empresa</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Endereço</TableHead>
                        <TableHead className="w-16 min-w-[64px] whitespace-nowrap">Número</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Complemento</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Bairro</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Cidade</TableHead>
                        <TableHead className="w-20 min-w-[80px] whitespace-nowrap">Estado</TableHead>
                        <TableHead className="w-24 min-w-[96px] whitespace-nowrap">CEP</TableHead>
                        <TableHead className="w-20 min-w-[80px] whitespace-nowrap">País</TableHead>
                        <TableHead className="w-32 min-w-[128px] whitespace-nowrap">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {currentPageData.map(({ customer, validation }) => (
                      <TableRow key={customer.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectItem(customer.id, checked as boolean)}
                            disabled={!validation.isValid}
                          />
                        </TableCell>
                        <TableCell>
                          {validation.isValid ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Válido</span>
                              <span className="sm:hidden">✓</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Erro</span>
                              <span className="sm:hidden">✗</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Nome com edição inline */}
                        <TableCell className="min-w-[192px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'name' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'name')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'name', getDisplayValue(customer, 'name'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Email com edição inline */}
                        <TableCell className="min-w-[192px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'email' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'email')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'email', getDisplayValue(customer, 'email'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo CPF/CNPJ com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'cpfCnpj' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'cpfCnpj')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'cpfCnpj', getDisplayValue(customer, 'cpfCnpj'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Telefone com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'phone' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'phone')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'phone', getDisplayValue(customer, 'phone'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Celular com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'mobilePhone' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'mobilePhone')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'mobilePhone', getDisplayValue(customer, 'mobilePhone'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Empresa com edição inline */}
                        <TableCell className="min-w-[192px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'company' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'company')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'company', getDisplayValue(customer, 'company'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Endereço com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'address' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'address')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'address', getDisplayValue(customer, 'address'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Número com edição inline */}
                        <TableCell className="min-w-[64px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'addressNumber' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'addressNumber')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'addressNumber', getDisplayValue(customer, 'addressNumber'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Complemento com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'complement' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'complement')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'complement', getDisplayValue(customer, 'complement'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Bairro com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'neighborhood' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'neighborhood')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'neighborhood', getDisplayValue(customer, 'neighborhood'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Cidade com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'city' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'city')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'city', getDisplayValue(customer, 'city'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Estado com edição inline */}
                        <TableCell className="min-w-[80px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'state' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'state')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'state', getDisplayValue(customer, 'state'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo CEP com edição inline */}
                        <TableCell className="min-w-[96px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'postalCode' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'postalCode')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'postalCode', getDisplayValue(customer, 'postalCode'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo País com edição inline */}
                        <TableCell className="min-w-[80px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'country' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'country')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'country', getDisplayValue(customer, 'country'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* AIDEV-NOTE: Campo Observações com edição inline */}
                        <TableCell className="min-w-[128px]">
                          {editingCell?.customerId === customer.id && editingCell?.field === 'observations' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="h-7 text-xs"
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
                                <XIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 group">
                              <span className="truncate">{getDisplayValue(customer, 'observations')}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditing(customer.id, 'observations', getDisplayValue(customer, 'observations'))}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex-shrink-0 border-t p-4">
                {/* AIDEV-NOTE: Controles de Paginação */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* AIDEV-NOTE: Números das páginas */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = i + 1;
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNumber)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}


          </div>

          <Separator />
          
          <DialogFooter className="p-4 sm:p-6 pt-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedItems.size === 0 || isLoading}
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-2" />
                Importar {selectedItems.size} cliente{selectedItems.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}