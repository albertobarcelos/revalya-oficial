import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Users, DollarSign, Clock, CheckCircle, AlertCircle, Send, X, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cobranca } from '@/types/database';
import { BulkMessageDialog } from '../BulkMessageDialog';

// AIDEV-NOTE: Interface para props do componente DayDetailsDialog
// Atualizada para suportar templateId e customMessage no envio de mensagens
interface DayDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: Date | null;
  charges: Cobranca[];
  onSendMessages: (chargeIds: string[], templateId: string, customMessage?: string) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'received'>('all');

  // AIDEV-NOTE: Resetar seleção de cobranças quando a aba mudar
  useEffect(() => {
    setSelectedCharges([]);
  }, [activeTab]);

  const onChargeSelect = (chargeId: string, checked: boolean) => {
    setSelectedCharges(prev => 
      checked ? [...prev, chargeId] : prev.filter(id => id !== chargeId)
    );
  };

  const onSelectAllDay = (charges: Cobranca[], checked: boolean) => {
    setSelectedCharges(checked ? charges.map(c => c.id) : []);
  };

  // AIDEV-NOTE: Handler corrigido para passar templateId e customMessage para onSendMessages
  const handleSendMessages = async (templateId: string, customMessage?: string) => {
    setIsLoadingMessages(true);
    try {
      console.log('🚀 [DAY-DETAILS-DIALOG] Iniciando envio de mensagens');
      console.log('📝 [DAY-DETAILS-DIALOG] Template ID:', templateId);
      console.log('📝 [DAY-DETAILS-DIALOG] Mensagem customizada:', customMessage ? 'Sim' : 'Não');
      console.log('🎯 [DAY-DETAILS-DIALOG] Cobranças selecionadas:', selectedCharges);
      
      await onSendMessages(selectedCharges, templateId, customMessage);
      setIsBulkMessageOpen(false);
      setSelectedCharges([]);
      
      console.log('✅ [DAY-DETAILS-DIALOG] Mensagens enviadas com sucesso');
    } catch (error) {
      console.error('❌ [DAY-DETAILS-DIALOG] Erro ao enviar mensagens:', error);
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
      return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
    });
  };

  // AIDEV-NOTE: Função para formatar tipos de pagamento para exibição amigável
  const formatPaymentType = (type: string): string => {
    if (!type) return 'Não informado';
    
    const typeMap: Record<string, string> = {
      'CREDIT_CARD': 'Cartão de Crédito',
      'CREDIT_CARD_RECURRING': 'Cartão Recorrente',
      'BOLETO': 'Boleto Bancário',
      'PIX': 'PIX',
      'CASH': 'Dinheiro',
      'TRANSFER': 'Transferência',
      'DEBIT_CARD': 'Cartão de Débito',
      // Valores em português (caso já venham formatados)
      'Cartão': 'Cartão de Crédito',
      'Boleto': 'Boleto Bancário',
      'Dinheiro': 'Dinheiro',
      'Transferência': 'Transferência Bancária'
    };
    
    return typeMap[type] || type;
  };

  // AIDEV-NOTE: Função para obter ícone do método de pagamento
  const getPaymentIcon = (type: string) => {
    const normalizedType = type?.toUpperCase() || '';
    
    switch (normalizedType) {
      case 'CREDIT_CARD':
      case 'CREDIT_CARD_RECURRING':
      case 'DEBIT_CARD':
        return <CreditCard className="h-3 w-3" />;
      case 'PIX':
        return <Smartphone className="h-3 w-3" />;
      case 'BOLETO':
        return <Building2 className="h-3 w-3" />;
      case 'CASH':
        return <Banknote className="h-3 w-3" />;
      case 'TRANSFER':
        return <Building2 className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  // AIDEV-NOTE: Função para gerar badge de status - corrigida para incluir todos os status de pagamento
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    
    // Status de pagamento confirmado/recebido
    if (['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(normalizedStatus)) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-100 text-xs font-medium px-2 py-0.5">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }
    
    // Status de atraso
    if (normalizedStatus.includes('overdue') || normalizedStatus.includes('atraso') || normalizedStatus === 'late') {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-100 text-xs font-medium px-2 py-0.5">
          <AlertCircle className="h-3 w-3 mr-1" />
          Atrasado
        </Badge>
      );
    }
    
    // Status pendente (padrão)
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-100 text-xs font-medium px-2 py-0.5">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  // AIDEV-NOTE: Função para gerar badge de tipo de cobrança com formatação adequada e ícones
  const getTypeBadge = (type: string) => {
    const normalizedType = type?.toUpperCase() || '';
    const formattedType = formatPaymentType(type);
    const icon = getPaymentIcon(type);
    
    // Cores específicas para cada tipo de pagamento
    const getTypeColor = (type: string): string => {
      switch (type) {
        case 'CREDIT_CARD':
        case 'CREDIT_CARD_RECURRING':
        case 'DEBIT_CARD':
          return 'bg-purple-50 text-purple-700 border-purple-100';
        case 'PIX':
          return 'bg-green-50 text-green-700 border-green-100';
        case 'BOLETO':
          return 'bg-blue-50 text-blue-700 border-blue-100';
        case 'CASH':
          return 'bg-orange-50 text-orange-700 border-orange-100';
        case 'TRANSFER':
          return 'bg-cyan-50 text-cyan-700 border-cyan-100';
        default:
          return 'bg-gray-50 text-gray-700 border-gray-100';
      }
    };
    
    const colorClass = getTypeColor(normalizedType);
    
    return (
      <Badge className={`${colorClass} text-xs font-medium px-2 py-0.5 flex items-center gap-1`}>
        {icon}
        {formattedType}
      </Badge>
    );
  };

  if (!selectedDay) return null;

  const totalValue = charges.reduce((sum, charge) => sum + (charge.valor || 0), 0);
  const paidValue = charges
    .filter(charge => {
      const status = charge.status?.toLowerCase() || '';
      return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
    })
    .reduce((sum, charge) => sum + (charge.valor || 0), 0);
  
  const uniqueClients = new Set(charges.map(charge => charge.customer_id)).size;
  const receivedPercentage = totalValue > 0 ? (paidValue / totalValue) * 100 : 0;

  // AIDEV-NOTE: Calculando contagens reais das cobranças por status - corrigido para incluir todos os status de pagamento
  const allChargesCount = charges.length;
  const pendingChargesCount = charges.filter(charge => {
    const status = charge.status?.toLowerCase() || '';
    return !['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
  }).length;
  const receivedChargesCount = charges.filter(charge => {
    const status = charge.status?.toLowerCase() || '';
    return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
  }).length;
  
  const selectedDayCharges = charges.filter(charge => 
    selectedCharges.includes(charge.id)
  );
  
  const allDayChargesSelected = charges.length > 0 && 
    charges.every(charge => selectedCharges.includes(charge.id));

  // AIDEV-NOTE: Filtrar cobranças baseado na aba ativa
  const dayCharges = useMemo(() => {
    if (activeTab === 'all') {
      return charges;
    }
    
    if (activeTab === 'pending') {
      return charges.filter(charge => {
        const status = charge.status?.toLowerCase() || '';
        return !['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
      });
    }
    
    if (activeTab === 'received') {
      return charges.filter(charge => {
        const status = charge.status?.toLowerCase() || '';
        return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
      });
    }
    
    return charges;
  }, [charges, activeTab]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] bg-white p-4 flex flex-col overflow-hidden">
          <div className="flex justify-between items-start pb-3 border-b flex-shrink-0">
              <DialogHeader className="p-0 space-y-0">
                <DialogTitle className="text-xl font-bold">
                  Detalhes do dia: {format(selectedDay, "EEEE", { locale: ptBR }).charAt(0).toUpperCase() + format(selectedDay, "EEEE", { locale: ptBR }).slice(1) + format(selectedDay, ", dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <DialogClose className="text-gray-400 hover:text-gray-500 h-4 w-4" />
            </div>
        
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden mt-4">
          {/* Resumo do dia */}
          <div className="grid grid-cols-2 gap-4 mb-4 flex-shrink-0">
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
            <div className="flex justify-end mb-4 flex-shrink-0">
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
          <div className="border-b flex-shrink-0 mb-4">
            <div className="flex space-x-4 -mb-px">
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('all')}
                className={`text-sm font-medium hover:bg-gray-100 rounded-none border-b-2 transition-colors ${
                  activeTab === 'all' 
                    ? 'border-blue-500 text-blue-600 font-semibold' 
                    : 'border-transparent text-gray-600'
                }`}
              >
                Todas ({allChargesCount})
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('pending')}
                className={`text-sm font-medium hover:bg-gray-100 rounded-none border-b-2 transition-colors ${
                  activeTab === 'pending' 
                    ? 'border-blue-500 text-blue-600 font-semibold' 
                    : 'border-transparent text-gray-600'
                }`}
              >
                Pendentes ({pendingChargesCount})
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab('received')}
                className={`text-sm font-medium hover:bg-gray-100 rounded-none border-b-2 transition-colors ${
                  activeTab === 'received' 
                    ? 'border-blue-500 text-blue-600 font-semibold' 
                    : 'border-transparent text-gray-600'
                }`}
              >
                Recebidas ({receivedChargesCount})
              </Button>
            </div>
          </div>

          {/* Lista de cobranças */}
          <ScrollArea className="flex-1 pr-4 min-h-0">
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
                            {/* AIDEV-NOTE: Exibindo o nome correto do serviço/produto da cobrança */}
                            {charge.contract?.services?.[0]?.service?.name || 
                             charge.contract?.services?.[0]?.description ||
                             charge.descricao || 
                             'Serviço não especificado'}
                          </p>
                        </div>
                        <p className="font-bold text-base">
                          {formatCurrency(charge.valor || 0)}
                        </p>
                      </div>
                      
                      <div className="flex gap-1.5 flex-wrap">
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