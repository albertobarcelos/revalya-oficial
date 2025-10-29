// =====================================================
// AIDEV-NOTE: LinkToContractModal Component
// =====================================================
// Modal para vincular movimentos selecionados a contratos
// Permite buscar e selecionar contratos existentes
// =====================================================

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Link,
  FileText,
  User,
  Calendar,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ImportedMovement } from '@/types/reconciliation';

// AIDEV-NOTE: Interface para contrato simplificada
interface Contract {
  id: string;
  contractNumber: string;
  customerName: string;
  customerDocument: string;
  status: 'active' | 'inactive' | 'cancelled';
  totalValue: number;
  startDate: string;
  endDate?: string;
  description?: string;
}

interface LinkToContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMovements: ImportedMovement[];
  onConfirm: (contractId: string, observations?: string) => Promise<void>;
  isLoading?: boolean;
}

export function LinkToContractModal({
  isOpen,
  onClose,
  selectedMovements,
  onConfirm,
  isLoading = false
}: LinkToContractModalProps) {
  // =====================================================
  // LOCAL STATE
  // =====================================================
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [observations, setObservations] = useState('');

  // AIDEV-NOTE: Mock de contratos - em produção viria de useContracts()
  const mockContracts: Contract[] = useMemo(() => [
    {
      id: 'CTR-001',
      contractNumber: 'CTR-2024-001',
      customerName: 'João Silva Santos',
      customerDocument: '123.456.789-01',
      status: 'active',
      totalValue: 2500.00,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      description: 'Contrato de prestação de serviços'
    },
    {
      id: 'CTR-002',
      contractNumber: 'CTR-2024-002',
      customerName: 'Maria Oliveira Costa',
      customerDocument: '987.654.321-02',
      status: 'active',
      totalValue: 1800.00,
      startDate: '2024-02-01',
      description: 'Contrato de consultoria'
    },
    {
      id: 'CTR-003',
      contractNumber: 'CTR-2024-003',
      customerName: 'Pedro Almeida Lima',
      customerDocument: '456.789.123-03',
      status: 'active',
      totalValue: 3200.00,
      startDate: '2024-01-15',
      endDate: '2025-01-15',
      description: 'Contrato de desenvolvimento'
    }
  ], []);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const filteredContracts = useMemo(() => {
    if (!searchTerm) return mockContracts;
    
    const term = searchTerm.toLowerCase();
    return mockContracts.filter(contract =>
      contract.contractNumber.toLowerCase().includes(term) ||
      contract.customerName.toLowerCase().includes(term) ||
      contract.customerDocument.includes(term)
    );
  }, [mockContracts, searchTerm]);

  const totalMovementsValue = useMemo(() => {
    return selectedMovements.reduce((sum, movement) => sum + (movement.valor_pago || 0), 0);
  }, [selectedMovements]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleClose = useCallback(() => {
    setSearchTerm('');
    setSelectedContract(null);
    setObservations('');
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!selectedContract) return;
    
    try {
      await onConfirm(selectedContract.id, observations || undefined);
      handleClose();
    } catch (error) {
      console.error('Erro ao vincular contrato:', error);
    }
  }, [selectedContract, observations, onConfirm, handleClose]);

  const handleContractSelect = useCallback((contract: Contract) => {
    setSelectedContract(contract);
  }, []);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Vincular a Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-6">
          {/* AIDEV-NOTE: Resumo dos movimentos selecionados */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedMovements.length} movimento(s) selecionado(s)
                  </span>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  R$ {totalMovementsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* AIDEV-NOTE: Busca de contratos */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar Contrato</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Digite o número do contrato, nome ou documento do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* AIDEV-NOTE: Lista de contratos */}
          <div className="space-y-2">
            <Label>Contratos Disponíveis</Label>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-2">
                <AnimatePresence>
                  {filteredContracts.map((contract) => (
                    <motion.div
                      key={contract.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedContract?.id === contract.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleContractSelect(contract)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {contract.contractNumber}
                                </Badge>
                                <Badge 
                                  variant={contract.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {contract.status === 'active' ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{contract.customerName}</span>
                                <span className="text-muted-foreground">
                                  ({contract.customerDocument})
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                  {contract.endDate && (
                                    <span> - {new Date(contract.endDate).toLocaleDateString('pt-BR')}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  R$ {contract.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                              
                              {contract.description && (
                                <p className="text-xs text-muted-foreground">
                                  {contract.description}
                                </p>
                              )}
                            </div>
                            
                            {selectedContract?.id === contract.id && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredContracts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum contrato encontrado</p>
                    <p className="text-xs">Tente ajustar os termos de busca</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* AIDEV-NOTE: Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações (opcional)</Label>
            <Input
              id="observations"
              placeholder="Adicione observações sobre esta vinculação..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedContract || isLoading}
            className="flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            {isLoading ? 'Vinculando...' : 'Vincular Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}