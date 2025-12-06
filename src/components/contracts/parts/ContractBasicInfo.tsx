import React, { useState, useEffect } from "react";
import { format, isAfter, isBefore, addDays, isToday as isTodayDate, isSameDay, parseISO, Locale } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pt } from 'date-fns/locale';
import { Calendar, CreditCard, Users, CalendarIcon, Search, Loader2, AlertCircle, Clock, CalendarClock, ChevronLeft, ChevronRight, FileText, Paperclip } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PopoverClose } from "@radix-ui/react-popover";
import { toast } from "sonner";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverContentModal,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ClientSearch } from "./ClientSearch";
import { ClientCreation } from "./ClientCreation";
import { ContractFormValues } from "../schema/ContractFormSchema";
import { FieldSkeleton } from "./FieldSkeleton";
import { useContractForm } from "../form/ContractFormProvider";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import type { Customer } from "@/types/database";

interface ContractBasicInfoProps {
  customers: any[];
  onClientCreated: (clientId: string) => void;
  isFieldLoading?: (fieldName: string) => boolean;
  /** Se deve ocultar os campos de vigência (Vigência Inicial e Vigência Final) */
  hideVigenceFields?: boolean;
  /** Label customizado para o campo "Nº do Contrato" */
  contractNumberLabel?: string;
  /** Label customizado para o campo "Dia de Faturamento" */
  billingDayLabel?: string;
  /** Se deve usar calendário para "Previsão de Faturamento" em vez de campo numérico */
  useBillingDatePicker?: boolean;
}

export function ContractBasicInfo({ 
  customers, 
  onClientCreated, 
  isFieldLoading = () => false,
  hideVigenceFields = false,
  contractNumberLabel,
  billingDayLabel,
  useBillingDatePicker = false
}: ContractBasicInfoProps) {
  const form = useFormContext<ContractFormValues>();
  const { contractData, isLoadingContract } = useContractForm(); // AIDEV-NOTE: Acessar dados do contrato do contexto
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [openInitialDatePicker, setOpenInitialDatePicker] = useState(false);
  const [openFinalDatePicker, setOpenFinalDatePicker] = useState(false);
  const [openBillingDatePicker, setOpenBillingDatePicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  
  // Observar mudanças nas datas para validação em tempo real
  const initialDate = useWatch({ control: form.control, name: 'initial_date' });
  const finalDate = useWatch({ control: form.control, name: 'final_date' });
  const customerId = useWatch({ control: form.control, name: 'customer_id' });
  
  // AIDEV-NOTE: Log para monitorar mudanças no contractData
  useEffect(() => {
    console.log('📊 ContractBasicInfo - Estado do contractData:', {
      isLoadingContract,
      contractData,
      hasCustomer: !!contractData?.customer,
      customerFromContract: contractData?.customer
    });
  }, [contractData, isLoadingContract]);
  
  // AIDEV-NOTE: Log removido para evitar execução excessiva
  // O log anterior estava sendo executado a cada mudança de contractData/isLoadingContract
  // Substituído por logs condicionais apenas quando necessário para debug específico
  
  // Configuração de localização e funções auxiliares
  const locale: Locale = ptBR || pt;
  
  const getMinDate = () => new Date();

  // Função para formatar a data de forma amigável
  // AIDEV-NOTE: Corrigido problema de timezone - usar parseISO para strings de data
  const formatDate = (date: Date | string | null | undefined, formatStr = 'PPP') => {
    if (!date) return '';
    
    // Se for string, usar parseISO para evitar problemas de timezone
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: ptBR });
  };

  // AIDEV-NOTE: Efeito para sincronizar cliente selecionado quando customer_id mudar
  useEffect(() => {
    // AIDEV-NOTE: Log de debug removido para evitar execução excessiva
    // Logs condicionais apenas para casos específicos de debug

    if (!customerId) {
      setSelectedClient(null);
      return;
    }
    
    // Se já temos o cliente selecionado e o ID bate, não precisa fazer nada
    if (selectedClient && selectedClient.id === customerId) {
      return;
    }
    
    // Primeiro, verifica se temos dados do cliente no contexto do contrato (modo edição)
    if (contractData?.customer && contractData.customer.id === customerId) {
      // Log condicional apenas quando encontra cliente no contractData
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Usando cliente do contractData:', contractData.customer);
      }
      setSelectedClient(contractData.customer);
      return;
    }
    
    // Procura o cliente no array customers (para casos onde o cliente está na primeira página)
    const foundClient = customers.find(c => c.id === customerId) as Customer | undefined;
    if (foundClient) {
      console.log('✅ Cliente encontrado no array customers:', foundClient);
      setSelectedClient(foundClient);
    } else {
      console.log('❌ Cliente não encontrado no array customers');
    }
    // Se não encontrou, mantém o selectedClient atual (caso de paginação)
  }, [customerId, customers, selectedClient, contractData?.customer]);

  // Efeito para validar data final não pode ser anterior à data inicial
  useEffect(() => {
    if (!initialDate || !finalDate) return;
    
    const startDate = new Date(initialDate);
    const endDate = new Date(finalDate);
    
    if (isBefore(endDate, startDate)) {
      form.setError('final_date', {
        type: 'manual',
        message: 'A data final deve ser posterior à data inicial'
      });
    } else if (form.formState.errors.final_date?.message === 'A data final deve ser posterior à data inicial') {
      form.clearErrors('final_date');
    }
  }, [initialDate, finalDate, form]);

  return (
    <div className="space-y-4">
      {/* Primeira linha: Cliente, Nº do Contrato e Dia de Faturamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cliente */}
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => {
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Cliente
                  {isFieldLoading("customer_id") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("customer_id")} />
                  <Input
                    placeholder="Selecione um cliente"
                    value={selectedClient?.name || ""}
                    readOnly
                    className="cursor-pointer bg-background/50 border-border/50 transition-colors pr-16"
                    onClick={() => setShowClientSearch(true)}
                    disabled={isFieldLoading("customer_id")}
                  />
                  {/* AIDEV-NOTE: Debug do selectedClient */}
                  {console.log('🎯 Campo Cliente - Debug:', {
                    selectedClient,
                    selectedClientName: selectedClient?.name,
                    customerId,
                    contractCustomer: contractData?.customer,
                    displayValue: selectedClient?.name || ""
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full aspect-square text-muted-foreground hover:text-primary"
                    onClick={() => setShowClientSearch(true)}
                    disabled={isFieldLoading("customer_id")}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {selectedClient?.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-0 h-full aspect-square text-muted-foreground hover:text-primary"
                      onClick={() => setShowEditClient(true)}
                      disabled={isFieldLoading("customer_id")}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
                
                {/* Modal de pesquisa de cliente */}
                <ClientSearch
                  open={showClientSearch}
                  onOpenChange={setShowClientSearch}
                  clients={customers}
                  onClientSelect={(client) => {
                    form.setValue("customer_id", client.id);
                    setSelectedClient(client);
                    setShowClientSearch(false);
                  }}
                  onCreateClient={() => {
                    setShowClientSearch(false);
                    setShowCreateClient(true);
                  }}
                />
                
                {/* Modal de criação de cliente */}
                <ClientCreation
                  open={showCreateClient}
                  onOpenChange={setShowCreateClient}
                  onClientCreated={(clientData) => {
                    onClientCreated(clientData.id);
                    form.setValue("customer_id", clientData.id);
                  }}
                />
                {selectedClient && (
                  <EditClientDialog
                    customer={selectedClient}
                    open={showEditClient}
                    onOpenChange={setShowEditClient}
                    onSuccess={() => {
                      // Após edição, manter o cliente selecionado e fechar o modal
                      setShowEditClient(false);
                    }}
                  />
                )}
              </FormItem>
            );
          }}
        />

        {/* Número do Contrato */}
        <FormField
          control={form.control}
          name="contract_number"
          render={({ field }) => {
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {contractNumberLabel || "Nº do Contrato"}
                  {isFieldLoading("contract_number") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("contract_number")} />
                  <Input
                    placeholder="Gerado automaticamente"
                    className="font-mono text-center bg-background/50 border-border/50 transition-colors"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </div>
                <FormDescription className="text-xs text-center">
                  Deixe vazio para gerar automaticamente
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Dia de Faturamento / Previsão de Faturamento */}
        <FormField
          control={form.control}
          name="billing_day"
          render={({ field }) => {
            // AIDEV-NOTE: Converter billing_day (número) para Date quando usar date picker
            const billingDate = useBillingDatePicker && field.value 
              ? new Date(new Date().getFullYear(), new Date().getMonth(), field.value)
              : null;
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {billingDayLabel || (useBillingDatePicker ? "Previsão de Faturamento" : "Dia de Faturamento")}
                  {isFieldLoading("billing_day") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("billing_day")} />
                  {useBillingDatePicker ? (
                    // AIDEV-NOTE: Calendário para escolher data completa
                    <Popover open={openBillingDatePicker} onOpenChange={setOpenBillingDatePicker}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal group transition-all duration-200 h-auto py-3",
                              !billingDate && "text-muted-foreground",
                              billingDate && "border-primary/30 bg-primary/5 hover:bg-primary/10"
                            )}
                            disabled={isFieldLoading("billing_day")}
                            type="button"
                          >
                            <div className="flex flex-col items-start w-full">
                              {billingDate ? (
                                <span className="font-medium text-foreground text-sm">
                                  {formatDate(billingDate, 'dd \'de\' MMMM \'de\' yyyy')}
                                </span>
                              ) : (
                                <span>Selecione a data de faturamento</span>
                              )}
                            </div>
                            <CalendarIcon className={cn(
                              "ml-auto h-4 w-4 transition-colors flex-shrink-0",
                              billingDate ? "text-primary" : "text-muted-foreground",
                              "group-hover:text-primary"
                            )} />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContentModal className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start">
                        <div className="p-3">
                          <div className="flex items-center justify-between px-2 pb-3 border-b border-border/30">
                            <h4 className="font-medium text-sm text-foreground/90">Selecione a data de faturamento</h4>
                            {billingDate && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                                onClick={() => {
                                  field.onChange(null);
                                  setOpenBillingDatePicker(false);
                                }}
                              >
                                Limpar
                              </Button>
                            )}
                          </div>
                          <div className="relative z-10">
                            <CalendarComponent
                              mode="single"
                              selected={billingDate || undefined}
                              onSelect={(date) => {
                                if (date) {
                                  // AIDEV-NOTE: Extrair apenas o dia do mês para manter compatibilidade com billing_day
                                  const day = date.getDate();
                                  field.onChange(day);
                                  setOpenBillingDatePicker(false);
                                }
                              }}
                              locale={locale}
                              classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-medium",
                                nav: "space-x-1 flex items-center",
                                nav_button: cn(
                                  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  "disabled:pointer-events-none disabled:opacity-50",
                                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                                  "h-7 w-7"
                                ),
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: cn(
                                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
                                  "hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200",
                                  "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                                  "cursor-pointer select-none"
                                ),
                                day_range_end: "day-range-end",
                                day_selected: cn(
                                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                  "focus:bg-primary focus:text-primary-foreground",
                                  "shadow-md ring-2 ring-primary/20 scale-105"
                                ),
                                day_today: cn(
                                  "bg-accent text-accent-foreground font-semibold",
                                  "ring-2 ring-primary/30"
                                ),
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground hover:scale-100",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                              }}
                              components={{
                                IconLeft: ({ ...props }) => (
                                  <ChevronLeft className="h-4 w-4" />
                                ),
                                IconRight: ({ ...props }) => (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              }}
                            />
                          </div>
                        </div>
                      </PopoverContentModal>
                    </Popover>
                  ) : (
                    // AIDEV-NOTE: Campo numérico tradicional (1-31)
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Ex: 15"
                      className="text-center font-semibold bg-background/50 border-border/50 transition-colors"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseInt(value) : '');
                      }}
                    />
                  )}
                </div>
                <FormDescription className="text-xs text-center">
                  {useBillingDatePicker 
                    ? "Selecione a data prevista para faturamento"
                    : "Dia do mês para vencimento"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      {/* Segunda linha: Tipo de Faturamento ou Número de Parcelas */}
      <div className="grid grid-cols-1 gap-4">
        {hideVigenceFields ? (
          // AIDEV-NOTE: Na Ordem de Serviço, mostra "Número de Parcelas" em vez de "Tipo de Faturamento"
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Número de Parcelas
                  {isFieldLoading("installments") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("installments")} />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ex: 1 (À Vista) ou 12 (12x)"
                    className="text-center font-semibold bg-background/50 border-border/50 transition-colors"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseInt(value) : 1);
                    }}
                  />
                </div>
                <FormDescription className="text-xs text-center">
                  {field.value === 1 || !field.value 
                    ? "À Vista (pagamento único)" 
                    : `${field.value}x parcelas`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          // AIDEV-NOTE: Na tela de Contratos, mantém "Tipo de Faturamento"
          <FormField
            control={form.control}
            name="billing_type"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Tipo de Faturamento
                  {isFieldLoading("billing_type") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("billing_type")} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {[
                      { value: "Mensal", label: "Mensal", icon: "📅", description: "Todo mês" },
                      { value: "Trimestral", label: "Trimestral", icon: "📊", description: "A cada 3 meses" },
                      { value: "Semestral", label: "Semestral", icon: "📈", description: "A cada 6 meses" },
                      { value: "Anual", label: "Anual", icon: "🎯", description: "Uma vez por ano" },
                      { value: "Único", label: "Único", icon: "💎", description: "Pagamento único" },
                    ].map((option, index) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        disabled={isFieldLoading("billing_type")}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all duration-200 text-left billing-type-card",
                          "hover:scale-105 hover:shadow-md",
                          field.value === option.value
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border hover:border-primary/50 bg-card hover:bg-primary/5"
                        )}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{option.icon}</span>
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Terceira linha: Vigências */}
      {!hideVigenceFields && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vigência Inicial */}
        <FormField
          control={form.control}
          name="initial_date"
          render={({ field }) => {
            const isError = !!form.formState.errors.initial_date;
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Vigência Inicial
                  {isFieldLoading("initial_date") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("initial_date")} />
                  <Popover open={openInitialDatePicker} onOpenChange={setOpenInitialDatePicker}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal group transition-all duration-200 h-auto py-3",
                            !field.value && "text-muted-foreground",
                            field.value && "border-primary/30 bg-primary/5 hover:bg-primary/10",
                            isError ? "border-destructive" : "hover:border-primary/50"
                          )}
                          disabled={isFieldLoading("initial_date")}
                          type="button"
                        >
                          <div className="flex flex-col items-start w-full">
                            {field.value ? (
                              <>
                                <span className="font-medium text-foreground text-sm">
                                  {formatDate(field.value, 'dd \'de\' MMMM \'de\' yyyy, EEEE')}
                                </span>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  {isTodayDate(new Date(field.value)) ? 'Hoje' : 'Data de início do contrato'}
                                </span>
                              </>
                            ) : (
                              <span>Selecione a vigência inicial</span>
                            )}
                          </div>
                          <CalendarIcon className={cn(
                            "ml-auto h-4 w-4 transition-colors flex-shrink-0",
                            field.value ? "text-primary" : "text-muted-foreground",
                            isError ? "text-destructive" : "group-hover:text-primary"
                          )} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContentModal className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start" onInteractOutside={(e) => {
                      // Impede que o popover feche ao interagir com o calendário ou botões de atalho
                      const target = e.target as HTMLElement;
                      if (target.closest('.rdp') || 
                          target.closest('[data-radix-popper-content-wrapper]') ||
                          target.closest('button[type="button"]') ||
                          target.closest('.grid.grid-cols-1.sm\\:grid-cols-2')) {
                        e.preventDefault();
                      }
                    }}>
                      <div className="p-3">
                        <div className="flex items-center justify-between px-2 pb-3 border-b border-border/30">
                          <h4 className="font-medium text-sm text-foreground/90">Selecione a data inicial</h4>
                          {field.value && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                              onClick={() => {
                                form.setValue('initial_date', null);
                                form.trigger('initial_date');
                                setOpenInitialDatePicker(false);
                              }}
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                        <div className="relative z-10">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setOpenInitialDatePicker(false);
                                
                                // Se houver data final e for anterior à nova data inicial, limpa a data final
                                if (finalDate && date > new Date(finalDate)) {
                                  form.setValue('final_date', null);
                                }
                              }
                            }}
                            locale={locale}
                            classNames={{
                              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-medium",
                              nav: "space-x-1 flex items-center",
                              nav_button: cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                "disabled:pointer-events-none disabled:opacity-50",
                                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                                "h-7 w-7"
                              ),
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                              row: "flex w-full mt-2",
                              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                              day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
                                "hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200",
                                "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                                "cursor-pointer select-none"
                              ),
                              day_range_end: "day-range-end",
                              day_selected: cn(
                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                "focus:bg-primary focus:text-primary-foreground",
                                "shadow-md ring-2 ring-primary/20 scale-105"
                              ),
                              day_today: cn(
                                "bg-accent text-accent-foreground font-semibold",
                                "ring-2 ring-primary/30"
                              ),
                              day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                              day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground hover:scale-100",
                              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                              day_hidden: "invisible",
                            }}
                            components={{
                              IconLeft: ({ ...props }) => (
                                <ChevronLeft className="h-4 w-4" />
                              ),
                              IconRight: ({ ...props }) => (
                                <ChevronRight className="h-4 w-4" />
                              )
                            }}
                          />
                        </div>
                        <div className="px-2 pt-3 border-t border-border/30">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8 hover:bg-accent/50 transition-colors"
                            onClick={() => {
                              const today = getMinDate();
                              form.setValue('initial_date', today);
                              form.trigger('initial_date');
                              setOpenInitialDatePicker(false);
                            }}
                          >
                            <Clock className="h-3.5 w-3.5 mr-2" />
                            Usar data de hoje
                          </Button>
                        </div>
                      </div>
                    </PopoverContentModal>
                  </Popover>
                </div>
                {isError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {form.formState.errors.initial_date?.message as string}
                  </p>
                )}
              </FormItem>
            );
          }}
        />
      
        {/* Vigência Final */}
        <FormField
          control={form.control}
          name="final_date"
          render={({ field }) => {
            const initialDate = form.watch('initial_date');
            const minDate = initialDate ? new Date(initialDate) : getMinDate();
            const isError = !!form.formState.errors.final_date;
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Vigência Final
                  {isFieldLoading("final_date") && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </FormLabel>
                <div className="relative">
                  <FieldSkeleton visible={isFieldLoading("final_date")} />
                  <Popover open={openFinalDatePicker} onOpenChange={setOpenFinalDatePicker}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal group transition-all duration-200 h-auto py-3",
                            !field.value && "text-muted-foreground",
                            field.value && "border-primary/30 bg-primary/5 hover:bg-primary/10",
                            isError ? "border-destructive" : "hover:border-primary/50",
                            !initialDate ? "opacity-70 cursor-not-allowed" : ""
                          )}
                          disabled={isFieldLoading("final_date") || !initialDate}
                          type="button"
                        >
                          <div className="flex flex-col items-start w-full">
                            {field.value ? (
                              <>
                                <span className="font-medium text-foreground text-sm">
                                  {formatDate(field.value, 'dd \'de\' MMMM \'de\' yyyy, EEEE')}
                                </span>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  Data de término do contrato
                                </span>
                              </>
                            ) : (
                              <span>
                                {initialDate ? 'Selecione a vigência final' : 'Primeiro selecione a vigência inicial'}
                              </span>
                            )}
                          </div>
                          <CalendarIcon className={cn(
                            "ml-auto h-4 w-4 transition-colors flex-shrink-0",
                            field.value ? "text-primary" : "text-muted-foreground",
                            isError ? "text-destructive" : "group-hover:text-primary"
                          )} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContentModal className="w-auto p-0 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="start" onInteractOutside={(e) => {
                      // Impede que o popover feche ao interagir com o calendário ou botões de atalho
                      const target = e.target as HTMLElement;
                      if (target.closest('.rdp') || 
                          target.closest('[data-radix-popper-content-wrapper]') ||
                          target.closest('button[type="button"]') ||
                          target.closest('.grid.grid-cols-1.sm\\:grid-cols-2') ||
                          target.closest('.space-y-3') ||
                          target.textContent?.includes('30 dias') ||
                          target.textContent?.includes('1 ano')) {
                        e.preventDefault();
                      }
                    }}>
                      <div className="p-3">
                        <div className="flex items-center justify-between px-2 pb-3 border-b border-border/30">
                          <h4 className="font-medium text-sm text-foreground/90">
                            {initialDate 
                              ? `A partir de ${formatDate(initialDate, 'PPP')}`
                              : 'Selecione a data final'}
                          </h4>
                          {field.value && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                              onClick={() => {
                                form.setValue('final_date', null);
                                form.trigger('final_date');
                                setOpenFinalDatePicker(false);
                              }}
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                        <div className="relative z-10">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setOpenFinalDatePicker(false);
                              }
                            }}
                            disabled={(date) => {
                              // Desabilita datas anteriores à data inicial
                              if (!initialDate) return true;
                              return isBefore(date, new Date(initialDate));
                            }}
                            locale={locale}
                            className="rounded-md border"
                            classNames={{
                              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                              month: "space-y-4",
                              caption: "flex justify-center pt-1 relative items-center",
                              caption_label: "text-sm font-medium",
                              nav: "space-x-1 flex items-center",
                              nav_button: cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                "disabled:pointer-events-none disabled:opacity-50",
                                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                                "h-7 w-7"
                              ),
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse space-y-1",
                              head_row: "flex",
                              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                              row: "flex w-full mt-2",
                              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                              day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
                                "hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-200",
                                "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                                "cursor-pointer select-none"
                              ),
                              day_range_end: "day-range-end",
                              day_selected: cn(
                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                "focus:bg-primary focus:text-primary-foreground",
                                "shadow-md ring-2 ring-primary/20 scale-105"
                              ),
                              day_today: cn(
                                "bg-accent text-accent-foreground font-semibold",
                                "ring-2 ring-primary/30"
                              ),
                              day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                              day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground hover:scale-100",
                              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                              day_hidden: "invisible",
                            }}
                            components={{
                              IconLeft: ({ ...props }) => (
                                <ChevronLeft className="h-4 w-4" />
                              ),
                              IconRight: ({ ...props }) => (
                                <ChevronRight className="h-4 w-4" />
                              )
                            }}
                          />
                        </div>
                        {initialDate && (
                          <div className="px-2 pt-3 border-t border-border/30 space-y-3">
                            <div className="text-xs text-muted-foreground text-center">
                              <span className="font-medium">Período:</span> {formatDate(initialDate, 'd MMM')} - {field.value ? formatDate(field.value, 'd MMM yyyy') : '?'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 hover:bg-accent/50 transition-colors border-border/50"
                                onClick={() => {
                                  const start = initialDate ? new Date(initialDate) : null;
                                  if (start && !isNaN(start.getTime())) {
                                    const endDate = addDays(start, 30);
                                    form.setValue('final_date', endDate);
                                    form.trigger('final_date');
                                    setOpenFinalDatePicker(false);
                                  } else {
                                    toast.error('Selecione uma vigência inicial válida antes de usar o atalho.');
                                  }
                                }}
                              >
                                30 dias
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 hover:bg-accent/50 transition-colors border-border/50"
                                onClick={() => {
                                  const start = initialDate ? new Date(initialDate) : null;
                                  if (start && !isNaN(start.getTime())) {
                                    const endDate = addDays(start, 365);
                                    form.setValue('final_date', endDate);
                                    form.trigger('final_date');
                                    setOpenFinalDatePicker(false);
                                  } else {
                                    toast.error('Selecione uma vigência inicial válida antes de usar o atalho.');
                                  }
                                }}
                              >
                                1 ano
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContentModal>
                  </Popover>
                </div>
                {isError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {form.formState.errors.final_date?.message as string}
                  </p>
                )}
              </FormItem>
            );
          }}
        />
      </div>
      )}
    </div>
  );
}
