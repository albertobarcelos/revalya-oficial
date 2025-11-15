import { useEffect, useState } from 'react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useCharges } from '@/hooks/useCharges';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery'; // AIDEV-NOTE: Hook seguro para validação multi-tenant
import { ChargeGroup } from './ChargeGroup';
import { BulkMessageDialog } from '../BulkMessageDialog';
import { WeeklyCalendar } from './WeeklyCalendar';
import { ChargeDetailDrawer } from '../ChargeDetailDrawer';
import { OverdueFilter } from './OverdueFilter';
import { ChargeGroupList } from './ChargeGroupList';


import { ChargeFilters } from './ChargeFilters';
import type { Cobranca } from '@/types/database';
import { Search, Bell, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { processMessageTags } from '@/utils/messageUtils';
import { messageService } from '@/services/messageService';

// AIDEV-NOTE: Interface para agrupamento de cobranças por categoria
interface GroupedCharges {
  [key: string]: {
    charges: Cobranca[];
    color: string;
    label: string;
    daysUntilDue: number;
  };
}

// AIDEV-NOTE: Componente principal do Dashboard de Cobranças refatorado para clean code
export function ChargesDashboard() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard(); // AIDEV-NOTE: Hook seguro para validação multi-tenant
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Validação crítica de segurança - bloquear acesso se não autorizado
  useEffect(() => {
    if (!hasAccess && accessError) {
      console.error('🚨 [SECURITY] Acesso negado ao ChargesDashboard:', accessError);
      toast({
        title: "Acesso Negado",
        description: accessError,
        variant: "destructive"
      });
      return;
    }
  }, [hasAccess, accessError, toast]);
  
  // Estados principais
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [overdueDays, setOverdueDays] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Cobranca | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weekEnd, setWeekEnd] = useState(() => endOfWeek(new Date(), { weekStartsOn: 0 }));

  // AIDEV-NOTE: Usar o hook seguro para garantir consistência e segurança
  const { data: chargesData, isLoading, refetch } = useCharges({
    page: 1,
    limit: 1000
    // Sem filtro de status para carregar todas as cobranças
  });

  // AIDEV-NOTE: Validação dupla de segurança - verificar se todos os dados pertencem ao tenant correto
  useEffect(() => {
    // AIDEV-NOTE: chargesData já é o array de charges (não um objeto com propriedade charges)
    if (chargesData && Array.isArray(chargesData) && currentTenant?.id && hasAccess) {
      const invalidCharges = chargesData.filter(charge => charge.tenant_id !== currentTenant.id);
      if (invalidCharges.length > 0) {
        console.error('🚨 [SECURITY VIOLATION] Cobranças não pertencem ao tenant atual:', {
          currentTenantId: currentTenant.id,
          invalidCharges: invalidCharges.map(c => ({ id: c.id, tenant_id: c.tenant_id }))
        });
        toast({
          title: "Erro de Segurança",
          description: "Dados não autorizados detectados. Recarregando...",
          variant: "destructive"
        });
        refetch();
      }
    }
  }, [chargesData, currentTenant?.id, hasAccess, toast, refetch]);

  // AIDEV-NOTE: Estados para filtros de data dos cards específicos
  const [paidFilter, setPaidFilter] = useState(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    return {
      startDate,
      endDate
    };
  });

  const [overdueFilter, setOverdueFilter] = useState('current'); // 'previous', 'current', '90days'

  // AIDEV-NOTE: Função para agrupar cobranças seguindo a mesma lógica da aba Lista
  const groupCharges = (charges: Cobranca[] | undefined): GroupedCharges => {
    const groups: GroupedCharges = {
      paid: { charges: [], color: 'bg-emerald-600', label: 'Pagas', daysUntilDue: -2 },
      sevenDays: { charges: [], color: 'bg-green-500', label: '7 dias para vencer', daysUntilDue: 7 },
      threeDays: { charges: [], color: 'bg-yellow-500', label: '3 dias para vencer', daysUntilDue: 3 },
      oneDay: { charges: [], color: 'bg-yellow-600', label: '1 dia para vencer', daysUntilDue: 1 },
      today: { charges: [], color: 'bg-red-500', label: 'Vence HOJE', daysUntilDue: 0 },
      overdue: { charges: [], color: 'bg-red-700', label: 'Vencidos', daysUntilDue: -1 },
    };

    if (!charges) return groups;

    const todayStr = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });

    charges.forEach(charge => {
      // Filtro para cobranças PAGAS
      if (['RECEIVED', 'RECEIVED_IN_CASH', 'RECEIVED_PIX', 'RECEIVED_BOLETO', 'RECEIVED_CARD', 'CONFIRMED', 'PAID'].includes(charge.status)) {
        // AIDEV-NOTE: Verificar se data_pagamento existe antes de filtrar
        if (!charge.data_pagamento) {
          return; // Se não tem data de pagamento, não incluir no grupo "Pagas"
        }
        
        // AIDEV-NOTE: data_pagamento vem como string no formato "YYYY-MM-DD" (tipo date do PostgreSQL)
        // Comparar usando strings YYYY-MM-DD para evitar problemas de timezone
        const paymentDateStr = String(charge.data_pagamento).trim(); // Garantir que é string e remover espaços
        
        // Extrair apenas a parte da data (YYYY-MM-DD) caso venha com hora
        const paymentDateOnly = paymentDateStr.split('T')[0].split(' ')[0];
        
        // Normalizar datas do filtro para formato YYYY-MM-DD
        const startDateStr = format(paidFilter.startDate, 'yyyy-MM-dd');
        const endDateStr = format(paidFilter.endDate, 'yyyy-MM-dd');
        
        // AIDEV-NOTE: Comparar strings YYYY-MM-DD diretamente (mais confiável que Date)
        // Isso evita problemas de timezone e garante comparação precisa
        if (paymentDateOnly >= startDateStr && paymentDateOnly <= endDateStr) {
          groups.paid.charges.push(charge);
        }
        return;
      }
      
      // AIDEV-NOTE: Aceitar todos os tipos de cobrança (PIX, BOLETO, CREDIT_CARD, CASH) para os cards de vencimento
      // Removido filtro restritivo que estava impedindo cobranças PIX de aparecerem nos cards
      
      const dueDateStr = charge.data_vencimento;
      const dueDate = parseISO(dueDateStr + 'T00:00:00');
      const today = parseISO(todayStr + 'T00:00:00');
      
      // Filtro para cobranças VENCIDAS
      if (dueDateStr < todayStr) {
        const diffDays = Math.ceil(Math.abs(today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let shouldInclude = false;
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));

        switch (overdueFilter) {
          case 'previous':
            shouldInclude = dueDate >= firstDayOfPrevMonth && dueDate <= lastDayOfPrevMonth;
            break;
          case 'current':
            shouldInclude = dueDate >= firstDayOfMonth && dueDate <= lastDayOfMonth;
            break;
          case '90days':
            shouldInclude = dueDate >= ninetyDaysAgo && dueDate <= today;
            break;
        }

        if (shouldInclude) {
          groups.overdue.charges.push(charge);
        }
      } else if (dueDateStr === todayStr) {
        groups.today.charges.push(charge);
      } else {
        const diffDays = Math.ceil(Math.abs(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          groups.oneDay.charges.push(charge);
        } else if (diffDays <= 3) {
          groups.threeDays.charges.push(charge);
        } else if (diffDays <= 7) {
          groups.sevenDays.charges.push(charge);
        }
      }
    });

    return groups;
  };

  // AIDEV-NOTE: Hook useCharges retorna dados diretamente, não em .data
  const groupedCharges = groupCharges(chargesData);

  // AIDEV-NOTE: Handlers para interação com cobranças
  const handleGroupClick = (groupKey: string) => {
    setSelectedGroup(groupKey);
    setSelectedCharges([]);
  };

  const handleChargeSelect = (chargeId: string, checked: boolean) => {
    setSelectedCharges(prev =>
      checked ? [...prev, chargeId] : prev.filter(id => id !== chargeId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selectedGroup) return;
    const groupCharges = groupedCharges[selectedGroup].charges;
    setSelectedCharges(checked ? groupCharges.map(c => c.id) : []);
  };

  const handleViewCharge = (charge: Cobranca) => {
    setSelectedCharge(charge);
    setIsDetailDrawerOpen(true);
  };

  // AIDEV-NOTE: Handler para envio de mensagens em massa - corrigido para usar messageService
  const handleSendMessages = async (templateId: string, customMessage?: string) => {
    if (selectedCharges.length === 0) {
      toast({
        title: "Nenhuma cobrança selecionada",
        description: "Selecione pelo menos uma cobrança para enviar mensagens.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      console.log('🚀 [CHARGES-DASHBOARD] Iniciando envio de mensagens via messageService');
      console.log('📝 [CHARGES-DASHBOARD] Template ID:', templateId);
      console.log('📝 [CHARGES-DASHBOARD] Mensagem customizada:', customMessage ? 'Sim' : 'Não');
      console.log('🎯 [CHARGES-DASHBOARD] Cobranças selecionadas:', selectedCharges);

      // AIDEV-NOTE: Usar messageService.sendBulkMessages que chama a Edge Function corretamente
      const result = await messageService.sendBulkMessages(selectedCharges, templateId, customMessage);
      
      console.log('✅ [CHARGES-DASHBOARD] Resultado do messageService:', result);

      // AIDEV-NOTE: Invalidar cache de contagem de mensagens após envio bem-sucedido
      // Isso garante que o ícone de contagem seja atualizado imediatamente
      console.log('🔄 [CHARGES-DASHBOARD] Invalidando cache de contagem de mensagens...');
      
      // Invalidar todas as queries de message-counts que podem incluir os chargeIds enviados
      await queryClient.invalidateQueries({
        queryKey: ['message-counts'],
        exact: false, // Invalidar todas as queries que começam com 'message-counts'
      });

      // Invalidar também o histórico de mensagens por cobrança
      await queryClient.invalidateQueries({
        queryKey: ['message-history-by-charge'],
        exact: false,
      });

      // Invalidar histórico geral de mensagens
      await queryClient.invalidateQueries({
        queryKey: ['message-history'],
        exact: false,
      });

      // AIDEV-NOTE: Forçar refetch imediato das queries de message-counts
      // Isso garante que os dados sejam atualizados mesmo com staleTime
      await queryClient.refetchQueries({
        queryKey: ['message-counts'],
        exact: false,
      });

      console.log('✅ [CHARGES-DASHBOARD] Cache invalidado e refetch executado com sucesso');

      // Limpar seleção após o envio
      setSelectedCharges([]);
      setIsMessageDialogOpen(false);

      toast({
        title: "Mensagens enviadas com sucesso",
        description: `${result.count} mensagens foram enviadas.`,
        variant: "default",
      });
      
      return result.data;
    } catch (error) {
      console.error('❌ [CHARGES-DASHBOARD] Erro ao enviar mensagens:', error);
      console.error('❌ [CHARGES-DASHBOARD] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      
      toast({
        title: "Erro ao enviar mensagens",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar as mensagens.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [CHARGES-DASHBOARD] Finalizando processo de envio');
      setIsSending(false);
    }
  };

  // AIDEV-NOTE: Renderização principal do dashboard - Layout com scroll adequado e espaçamento otimizado
  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Container principal com scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Grupos de cobranças - MOVIDO PARA CIMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(groupedCharges).map(([key, group]) => (
            <ChargeGroup
              key={key}
              groupKey={key}
              group={group}
              isSelected={selectedGroup === key}
              onClick={() => handleGroupClick(key)}
              dateRange={key === 'paid' ? paidFilter : undefined}
              onDateRangeChange={key === 'paid' ? (range) => setPaidFilter(range) : undefined}
            />
          ))}
        </div>

        {/* Calendário semanal - MOVIDO PARA BAIXO com container limitado */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-2 sm:p-3 md:p-4">
            <WeeklyCalendar 
              initialCharges={chargesData || []} 
              tenantId={currentTenant?.id || ''}
              onWeekChange={(start, end) => {
                setWeekStart(start);
                setWeekEnd(end);
              }}
            />
          </div>
        </div>
      </div>

      {/* AIDEV-NOTE: Lista de cobranças do grupo selecionado - Componente separado */}
      <ChargeGroupList
        selectedGroup={selectedGroup}
        groupedCharges={groupedCharges}
        selectedCharges={selectedCharges}
        overdueFilter={overdueFilter}
        allCharges={chargesData} // AIDEV-NOTE: Passar todas as cobranças para detectar relacionadas
        onClose={() => setSelectedGroup(null)}
        onChargeSelect={handleChargeSelect}
        onSelectAll={handleSelectAll}
        onViewCharge={handleViewCharge}
        onSendMessages={() => setIsMessageDialogOpen(true)}
        onOverdueFilterChange={setOverdueFilter}
      />

      {/* Diálogos */}
      <BulkMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        onSendMessages={handleSendMessages}
        isLoading={isSending}
        selectedCharges={selectedCharges}
      />

      <ChargeDetailDrawer
        charge={selectedCharge}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onRefresh={() => {}}
      />
    </div>
   );
 }
