import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Users, DollarSign, Clock, CheckCircle, AlertCircle, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cobranca } from '@/types/database';
import { BulkMessageDialog } from '../BulkMessageDialog';

// AIDEV-NOTE: Interface para props do componente DayDetailsDialog
interface DayDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: Date | null;
  charges: Cobranca[];
  onSendMessages: (chargeIds: string[]) => Promise<void>;
}

// AIDEV-NOTE: Componente de diálogo de detalhes do dia extraído para modularização
export function DayDetailsDialog({
  isOpen,
  onClose,
  selectedDay,
  charges,
  onSendMessages,
}: DayDetailsDialogProps) {
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const onChargeSelect = (chargeId: string, checked: boolean) => {
    setSelectedCharges(prev => 
      checked ? [...prev, chargeId] : prev.filter(id => id !== chargeId)
    );
  };

  const onSelectAllDay = (charges: Cobranca[], checked: boolean) => {
    setSelectedCharges(checked ? charges.map(c => c.id) : []);
  };

  const handleSendMessages = async (templateId: string, customMessage?: string) => {
    setIsLoadingMessages(true);
    try {
      await onSendMessages(selectedCharges);
      setIsBulkMessageOpen(false);
      setSelectedCharges([]);
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // AIDEV-NOTE: Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // AIDEV-NOTE: Função para verificar se há cobranças pagas
  const hasPaidCharges = (charges: Cobranca[]) => {
    return charges.some(charge => {
      const status = charge.status?.toLowerCase() || '';
      return ['received', 'received_in_cash', 'confirmed'].includes(status);
    });
  };

  // AIDEV-NOTE: Função para gerar badge de status
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    
    if (['received', 'received_in_cash', 'confirmed'].includes(normalizedStatus)) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-100 text-xs font-medium px-2 py-0.5">
          Pago
        </Badge>
      );
    }
    
    if (normalizedStatus.includes('overdue') || normalizedStatus.includes('atraso')) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-100 text-xs font-medium px-2 py-0.5">
          Atrasado
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-100 text-xs font-medium px-2 py-0.5">
        Pendente
      </Badge>
    );
  };

  // AIDEV-NOTE: Função para gerar badge de tipo de cobrança
  const getTypeBadge = (type: string) => {
    const typeColors: { [key: string]: string } = {
      'boleto': 'bg-blue-50 text-blue-700 border-blue-100',
      'pix': 'bg-purple-50 text-purple-700 border-purple-100',
      'cartao': 'bg-green-50 text-green-700 border-green-100',
      'dinheiro': 'bg-orange-50 text-orange-700 border-orange-100'
    };
    
    const colorClass = typeColors[type?.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-100';
    
    return (
      <Badge className={`${colorClass} text-xs font-medium px-2 py-0.5`}>
        {type || 'N/A'}
      </Badge>
    );
  };

  if (!selectedDay) return null;

  const totalValue = charges.reduce((sum, charge) => sum + (charge.valor || 0), 0);
  const paidValue = charges
    .filter(charge => {
      const status = charge.status?.toLowerCase() || '';
      return ['received', 'received_in_cash', 'confirmed'].includes(status);
    })
    .reduce((sum, charge) => sum + (charge.valor || 0), 0);
  
  const uniqueClients = new Set(charges.map(charge => charge.customer_id)).size;
  const receivedPercentage = totalValue > 0 ? (paidValue / totalValue) * 100 : 0;
  
  const selectedDayCharges = charges.filter(charge => 
    selectedCharges.includes(charge.id)
  );
  
  const allDayChargesSelected = charges.length > 0 && 
    charges.every(charge => selectedCharges.includes(charge.id));

  const dayCharges = charges; // Define dayCharges as charges to fix the reference

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] bg-white p-4">
          <div className="flex justify-between items-start pb-3 border-b">
              <DialogHeader className="p-0 space-y-0">
                <DialogTitle className="text-xl font-bold">
                  Detalhes do dia: {format(selectedDay, "EEEE", { locale: ptBR }).charAt(0).toUpperCase() + format(selectedDay, "EEEE", { locale: ptBR }).slice(1) + format(selectedDay, ", dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <DialogClose className="text-gray-400 hover:text-gray-500 h-4 w-4" />
            </div>
        
        <div className="space-y-4">
          {/* Resumo do dia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="text-base font-medium mb-2">Resumo</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
              <p className="text-sm text-gray-500">{charges.length} cobranças</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="text-base font-medium mb-2">Status de Pagamento</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Recebido:</p>
                  <p className="text-green-600">{formatCurrency(paidValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendente:</p>
                  <p className="text-orange-600">{formatCurrency(totalValue - paidValue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ações em massa */}
          {selectedDayCharges.length > 0 && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setIsBulkMessageOpen(true)}
                disabled={isLoadingMessages}
                size="sm"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoadingMessages ? 'Enviando...' : 'Enviar Mensagem'}
              </Button>
            </div>
          )}

          {/* Abas de status */}
          <div className="border-b">
            <div className="flex space-x-4 -mb-px">
              <Button variant="ghost" className="text-sm font-medium hover:bg-gray-100 rounded-none border-b-2 border-blue-500">Todas (5)</Button>
              <Button variant="ghost" className="text-sm font-medium hover:bg-gray-100 rounded-none">Pendentes (5)</Button>
              <Button variant="ghost" className="text-sm font-medium hover:bg-gray-100 rounded-none">Recebidas (0)</Button>
            </div>
          </div>

          {/* Lista de cobranças */}
          <ScrollArea className="h-[60vh] pr-4">
            {dayCharges.length > 0 ? (
              <div className="space-y-3">
                {dayCharges.map((charge) => (
                  <div 
                    key={charge.id} 
                    className="flex items-center gap-3 py-3 border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedCharges.includes(charge.id)}
                      onCheckedChange={(checked) => 
                        onChargeSelect(charge.id, checked as boolean)
                      }
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="font-medium text-sm">
                            {charge.customers?.name || 'Cliente não informado'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {charge.contract?.name || 'LICENÇA PDV LEGAL'}
                          </p>
                        </div>
                        <p className="font-bold text-base">
                          {formatCurrency(charge.valor || 0)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1.5">
                        {getStatusBadge(charge.status || '')}
                        {getTypeBadge(charge.tipo || '')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma cobrança encontrada para este dia</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
      </Dialog>

      {/* Dialog de mensagem em massa */}
      <BulkMessageDialog
        open={isBulkMessageOpen}
        onOpenChange={setIsBulkMessageOpen}
        selectedCharges={selectedCharges}
        onSendMessages={handleSendMessages}
        isLoading={isLoadingMessages}
      />
    </>
  );
}