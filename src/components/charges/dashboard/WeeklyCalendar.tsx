import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, getWeek, getYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Calendar, Filter, Download, TrendingUp, Loader2 } from 'lucide-react';
import { useCurrentTenant } from '@/hooks/useZustandTenant';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateSafely } from '@/lib/utils';
import { messageService } from '@/services/messageService';
import { useToast } from '@/hooks/use-toast';
import { WeeklyFilters } from './WeeklyFilters';
import { WeeklyMetrics } from './WeeklyMetrics';
import { DayCard } from './DayCard';
import { DayDetailsDialog } from './DayDetailsDialog';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para props do componente WeeklyCalendar
interface WeeklyCalendarProps {
  tenantId: string;
}

// AIDEV-NOTE: Interface para agrupamento de cobranças por dia
interface GroupedCharges {
  [key: string]: Cobranca[];
}

// AIDEV-NOTE: Componente principal do calendário semanal refatorado
export function WeeklyCalendar({ tenantId }: WeeklyCalendarProps) {
  const { currentTenant } = useCurrentTenant();
  const { toast } = useToast();
  
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weekEnd, setWeekEnd] = useState(endOfWeek(new Date(), { weekStartsOn: 0 }));
  const [charges, setCharges] = useState<Cobranca[]>([]);
  const [filteredCharges, setFilteredCharges] = useState<Cobranca[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingWeek, setIsChangingWeek] = useState(false);
  
  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDayCharges, setSelectedDayCharges] = useState<Cobranca[]>([]);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  // Estados de métricas
  const [previousWeekTotal, setPreviousWeekTotal] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);

  // AIDEV-NOTE: Função para agrupar cobranças por dia - Corrigido para usar parseISO e evitar problemas de timezone
  const groupChargesByDay = (charges: Cobranca[]): GroupedCharges => {
    return charges.reduce((acc, charge) => {
      if (!charge.data_vencimento) return acc;
      
      const dayKey = format(parseISO(charge.data_vencimento), 'yyyy-MM-dd');
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(charge);
      
      return acc;
    }, {} as GroupedCharges);
  };

  // AIDEV-NOTE: Função para carregar dados da semana anterior
  const loadPreviousWeekData = useCallback(async (currentCharges: Cobranca[]) => {
    if (!tenantId) return;
    
    try {
      const prevWeekStart = subWeeks(weekStart, 1);
      const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 0 });
      
      const { data, error } = await supabase
        .from('charges')
        .select('valor')
        .eq('tenant_id', tenantId)
        .gte('data_vencimento', format(prevWeekStart, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(prevWeekEnd, 'yyyy-MM-dd'));

      if (error) throw error;
      
      const prevTotal = (data || []).reduce((sum, charge) => sum + (charge.valor || 0), 0);
      const currentTotal = currentCharges.reduce((sum, charge) => sum + (charge.valor || 0), 0);
      
      setPreviousWeekTotal(prevTotal);
      setWeeklyGrowth(prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0);
    } catch (error) {
      console.error('Erro ao carregar dados da semana anterior:', error);
    }
  }, [tenantId, weekStart]);

  // AIDEV-NOTE: Função para carregar dados da semana
  const loadWeekData = useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('charges')
        .select(`
          *,
          customers(*),
          contract:contracts(*)
        `)
        .eq('tenant_id', tenantId)
        .gte('data_vencimento', format(weekStart, 'yyyy-MM-dd'))
        .lte('data_vencimento', format(weekEnd, 'yyyy-MM-dd'))
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      
      const chargesData = data || [];
      setCharges(chargesData);
      await loadPreviousWeekData(chargesData);
    } catch (error) {
      console.error('Erro ao carregar dados da semana:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, weekStart, weekEnd, loadPreviousWeekData]);

  // AIDEV-NOTE: Navegação entre semanas
  const navigateWeek = (direction: 'next' | 'prev') => {
    setIsChangingWeek(true);
    
    setTimeout(() => {
      const newWeekStart = direction === 'next' 
        ? addWeeks(weekStart, 1) 
        : subWeeks(weekStart, 1);
      const newWeekEnd = endOfWeek(newWeekStart, { weekStartsOn: 0 });
      
      setWeekStart(newWeekStart);
      setWeekEnd(newWeekEnd);
      setCurrentDate(newWeekStart);
      
      setTimeout(() => setIsChangingWeek(false), 50);
    }, 150);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
    setWeekEnd(endOfWeek(today, { weekStartsOn: 0 }));
    setCurrentDate(today);
  };

  const goToSpecificWeek = (date: Date) => {
    setWeekStart(startOfWeek(date, { weekStartsOn: 0 }));
    setWeekEnd(endOfWeek(date, { weekStartsOn: 0 }));
    setCurrentDate(date);
  };

  // AIDEV-NOTE: Efeitos para carregamento de dados
  useEffect(() => {
    if (tenantId) loadWeekData();
  }, [weekStart, weekEnd, tenantId, loadWeekData]);

  useEffect(() => {
    setFilteredCharges(charges);
  }, [charges]);

  const groupedCharges = groupChargesByDay(filteredCharges);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-1 flex-1 min-w-0">
          <h2 className="text-xl font-semibold">Calendário de Recebimentos Semanais</h2>
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${format(weekStart, 'yyyy-MM-dd')}`}
              className="flex items-center space-x-4 flex-wrap"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-lg font-medium text-primary capitalize">
                📅 {format(weekStart, 'MMMM yyyy', { locale: ptBR })}
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Semana {getWeek(weekStart)} • {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(weekEnd, 'dd/MM', { locale: ptBR })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <motion.div 
          className="flex items-center space-x-2 flex-wrap gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex space-x-2 flex-wrap gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" />Filtros
              </Button>
            </motion.div>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />Selecionar Semana
                  </Button>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto">
                <CalendarComponent
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) {
                      goToSpecificWeek(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>🏠 Hoje</Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={() => setShowMetrics(!showMetrics)}>
                <TrendingUp className="h-4 w-4 mr-1" />Métricas
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Filtros */}
      {showFilters && (
        <WeeklyFilters
          statusFilter={statusFilter}
          clientFilter={clientFilter}
          minAmount={minAmount}
          maxAmount={maxAmount}
          onStatusChange={setStatusFilter}
          onClientChange={setClientFilter}
          onMinAmountChange={setMinAmount}
          onMaxAmountChange={setMaxAmount}
          charges={charges}
          onFilteredChargesChange={setFilteredCharges}
        />
      )}

      {/* Métricas */}
      {showMetrics && (
        <WeeklyMetrics
          currentWeekTotal={filteredCharges.reduce((sum, charge) => sum + (charge.valor || 0), 0)}
          previousWeekTotal={previousWeekTotal}
          weeklyGrowth={weeklyGrowth}
        />
      )}

      {/* Calendário */}
      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="relative w-full px-4 sm:px-8 lg:px-16 py-6 mb-4 border rounded-xl bg-gradient-to-br from-background/80 to-background/40 shadow-lg backdrop-blur-sm overflow-hidden">
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="flex items-center space-x-3 bg-white/90 px-6 py-3 rounded-full shadow-lg"
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Carregando dados...</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={`week-${format(weekStart, 'yyyy-MM-dd')}`}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-4"
              initial={{ opacity: 0, x: isChangingWeek ? 50 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
            {eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const charges = groupedCharges[dayStr] || [];
              
              // AIDEV-NOTE: Calcular dados agregados para o dia
              const totalValue = charges.reduce((sum, charge) => {
                return sum + (parseFloat(charge.valor?.toString() || '0') || 0);
              }, 0);
              
              const uniqueClients = new Set(charges.map(charge => charge.customer_id)).size;
              
              const paidCharges = charges.filter(charge => {
                const status = charge.status?.toLowerCase() || '';
                return ['received', 'received_in_cash', 'received_pix', 'received_boleto', 'received_card', 'confirmed', 'paid'].includes(status);
              });
              
              const receivedPercentage = charges.length > 0 
                ? (paidCharges.length / charges.length) * 100 
                : 0;
              
              const chargeTypes = charges.reduce((acc, charge) => {
                const type = charge.tipo || 'outros';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {} as { [key: string]: number });
              
              const dayData = {
                date: day,
                charges,
                totalValue,
                uniqueClients,
                receivedPercentage,
                chargeTypes
              };
              
              return (
                <DayCard
                  key={day.toISOString()}
                  dayData={dayData}
                  onDayClick={(date, charges) => {
                    setSelectedDay(date);
                    setSelectedDayCharges(charges);
                    setIsDetailsOpen(true);
                  }}
                  isToday={isToday(day)}
                />
              );
            })}
             </motion.div>
           </AnimatePresence>
          
          {/* Navegação */}
          <motion.div
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              variant="default" 
              size="icon" 
              className="h-12 w-12 rounded-full shadow-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary border-2 border-white/20"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </motion.div>
          
          <motion.div
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button 
              variant="default" 
              size="icon" 
              className="h-12 w-12 rounded-full shadow-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary border-2 border-white/20"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Dialog de detalhes */}
      <DayDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedDay(null);
          setSelectedDayCharges([]);
        }}
        selectedDay={selectedDay}
        charges={selectedDayCharges}
        onSendMessages={async (chargeIds, templateId, customMessage) => {
          // AIDEV-NOTE: Implementação correta do envio de mensagens usando messageService
          console.log('🚀 [WEEKLY-CALENDAR] Iniciando envio de mensagens');
          console.log('📝 [WEEKLY-CALENDAR] Template ID:', templateId);
          console.log('📝 [WEEKLY-CALENDAR] Mensagem customizada:', customMessage ? 'Sim' : 'Não');
          console.log('🎯 [WEEKLY-CALENDAR] Cobranças selecionadas:', chargeIds);
          
          try {
            const result = await messageService.sendBulkMessages(chargeIds, templateId, customMessage);
            
            console.log('✅ [WEEKLY-CALENDAR] Resultado do messageService:', result);
            
            toast({
              title: "Mensagens enviadas com sucesso",
              description: `${result.count} mensagens foram enviadas.`,
              variant: "default",
            });
            
            return result.data;
          } catch (error) {
            console.error('❌ [WEEKLY-CALENDAR] Erro ao enviar mensagens:', error);
            
            toast({
              title: "Erro ao enviar mensagens",
              description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar as mensagens.",
              variant: "destructive",
            });
            
            throw error;
          }
        }}
      />
    </div>
  );
}
