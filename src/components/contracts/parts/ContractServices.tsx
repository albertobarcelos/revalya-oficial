import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Package, Search, MoreHorizontal, Calculator, Copy, Trash2, FileText, CreditCard, Clock, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useServices } from '@/hooks/useServices';
import { useContracts } from '@/hooks/useContracts';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ServiceSelection } from './ServiceSelection';

// Interfaces
interface ContractServicesProps {
  form: any;
  contractId?: string;
}

interface SelectedService {
  id: string;
  service_id?: string;
  name: string;
  description?: string;
  unit_price: number; // Mudança de 'price' para 'unit_price'
  default_price?: number; // Campo de compatibilidade
  quantity: number;
  total: number;
  // Campos financeiros
  payment_method?: string;
  card_type?: string;
  billing_type?: string;
  recurrence_frequency?: string;
  installments?: number;
  // Campos de vencimento - AIDEV-NOTE: Novos campos para controlar data de vencimento das cobranças
  due_date_type?: 'days_after_billing' | 'fixed_day'; // Tipo de vencimento
  due_days?: number; // Número de dias após faturamento
  due_day?: number; // Dia fixo do mês (1-31)
  due_next_month?: boolean; // Se vencimento é no próximo mês
  // Campo de cobrança - AIDEV-NOTE: Controla se o serviço gera cobrança no faturamento
  generate_billing?: boolean; // Se deve gerar cobrança no faturamento
  // Campos de impostos
  nbs_code?: string;
  deduction_value?: number;
  calculation_base?: number;
  iss_rate?: number;
  iss_deduct?: boolean;
  ir_rate?: number;
  ir_deduct?: boolean;
  csll_rate?: number;
  csll_deduct?: boolean;
  inss_rate?: number;
  inss_deduct?: boolean;
  pis_rate?: number;
  pis_deduct?: boolean;
  cofins_rate?: number;
  cofins_deduct?: boolean;
}

interface FinancialData {
  payment_method: string;
  card_type: string;
  billing_type: string;
  recurrence_frequency: string;
  installments: number;
}

interface TaxData {
  nbs_code: string;
  deduction_value: number;
  calculation_base: number;
  iss_rate: number;
  iss_deduct: boolean;
  ir_rate: number;
  ir_deduct: boolean;
  csll_rate: number;
  csll_deduct: boolean;
  inss_rate: number;
  inss_deduct: boolean;
  pis_rate: number;
  pis_deduct: boolean;
  cofins_rate: number;
  cofins_deduct: boolean;
}

export function ContractServices({ form, contractId }: ContractServicesProps) {
  // Ref para controlar atualizações internas e evitar loop infinito
  const isInternalUpdate = React.useRef(false);
  
  // Estados
  const [selectedServices, setSelectedServices] = React.useState<SelectedService[]>([]);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Estados para o modal de impostos e retenções
  const [showTaxModal, setShowTaxModal] = React.useState(false);
  const [editingServiceId, setEditingServiceId] = React.useState<string>("");
  
  // Estados para configuração financeira
  const [financialData, setFinancialData] = React.useState<FinancialData>({
    payment_method: "PIX", // AIDEV-NOTE: Valor padrão válido para evitar erro de validação
    card_type: "",
    billing_type: "Único", // AIDEV-NOTE: Valor padrão válido para evitar erro de validação
    recurrence_frequency: "",
    installments: 1
  });
  
  const [taxData, setTaxData] = React.useState<TaxData>({
    nbs_code: "",
    deduction_value: 0,
    calculation_base: 0,
    iss_rate: 0,
    iss_deduct: false,
    ir_rate: 0,
    ir_deduct: false,
    csll_rate: 0,
    csll_deduct: false,
    inss_rate: 0,
    inss_deduct: false,
    pis_rate: 0,
    pis_deduct: false,
    cofins_rate: 0,
    cofins_deduct: false
  });
  
  // Estados para configuração de vencimento - AIDEV-NOTE: Controla os campos de vencimento do serviço
  const [dueDateData, setDueDateData] = React.useState({
    due_date_type: 'days_after_billing' as 'days_after_billing' | 'fixed_day',
    due_days: 5,
    due_day: 10,
    due_next_month: false
  });

  // Estado para configuração de cobrança - AIDEV-NOTE: Controla se o serviço gera cobrança no faturamento
  const [billingData, setBillingData] = React.useState({
    generate_billing: true // Padrão: sim, gerar cobrança
  });

  // AIDEV-NOTE: Estados para seleção em massa de serviços
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = React.useState(false);
  
  // AIDEV-NOTE: Estados para edição em massa
  const [bulkEditData, setBulkEditData] = React.useState({
    // Configurações financeiras
    payment_method: '',
    card_type: '',
    billing_type: '',
    recurrence_frequency: '',
    installments: 1,
    // Valor unitário
    unit_price: '',
    // Configurações de vencimento
    due_date_type: 'days_after_billing' as 'days_after_billing' | 'fixed_day',
    due_days: 5,
    due_day: 10,
    due_next_month: false,
    // Geração de faturamento
    generate_billing: true
  });

  // AIDEV-NOTE: Função para mapear payment_method para o formato do banco
  const mapPaymentMethod = React.useCallback((paymentMethod: string | null): string | null => {
    if (!paymentMethod) return null;
    
    const mapping: Record<string, string> = {
      'card': 'Cartão',
      'pix': 'PIX',
      'bank_transfer': 'Transferência',
      'bank_slip': 'Boleto',
      // Valores já em português (caso venham assim)
      'Cartão': 'Cartão',
      'PIX': 'PIX',
      'Transferência': 'Transferência',
      'Boleto': 'Boleto'
    };
    
    return mapping[paymentMethod] || null;
  }, []);
  
  // Hook para buscar serviços
  const { services = [], isLoading } = useServices();
  
  // Hook para operações de contrato - AIDEV-NOTE: Usado para atualizar serviços no banco
  const { updateContractServiceMutation } = useContracts();
  
  // Log para depuração
  React.useEffect(() => {
    console.log('🔍 ContractServices: Hook useServices retornou:', {
      services: services?.length || 0,
      isLoading,
      firstService: services?.[0]
    });
  }, [services, isLoading]);
  
  // Observar mudanças nos serviços do formulário
  const formServices = form.watch("services") || [];
  
  // Carregar serviços existentes do formulário quando houver mudanças
  React.useEffect(() => {
    // Evitar loop infinito - se a atualização veio de dentro do componente, ignorar
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    console.log('🔄 ContractServices: Detectada mudança nos serviços do formulário:', formServices.length);
    
    if (formServices.length > 0) {
      // Garantir que cada serviço tenha o campo 'total' calculado
      const servicesWithTotal = formServices.map(service => ({
        ...service,
        total: service.total || (service.quantity || 1) * (service.unit_price || service.default_price || 0)
      }));
      
      console.log('✅ ContractServices: Carregando serviços no estado local:', servicesWithTotal);
      setSelectedServices(servicesWithTotal);
    } else {
      console.log('📝 ContractServices: Nenhum serviço encontrado no formulário');
      setSelectedServices([]);
    }
  }, [formServices]);
  
  // AIDEV-NOTE: Função modificada para processar múltiplos serviços selecionados
  const handleAddServices = (selectedServiceItems: any[]) => {
    console.log('🔄 Adicionando múltiplos serviços:', selectedServiceItems);
    
    const newServices: SelectedService[] = selectedServiceItems.map(serviceItem => ({
      id: `temp-${Date.now()}-${Math.random()}`, // ID único para cada serviço
      service_id: serviceItem.id,
      name: serviceItem.name,
      description: serviceItem.description,
      unit_price: serviceItem.default_price || 0,
      default_price: serviceItem.default_price || 0,
      quantity: serviceItem.quantity || 1, // Usar quantidade do ServiceSelection
      total: (serviceItem.default_price || 0) * (serviceItem.quantity || 1),
      // AIDEV-NOTE: Campos financeiros com valores padrão válidos para evitar erro de validação
      payment_method: "PIX", // Valor padrão válido
      card_type: "",
      billing_type: "Único", // Valor padrão válido
      recurrence_frequency: "", // Não obrigatório para billing_type "Único"
      installments: 1,
      // Campo de cobrança padrão - AIDEV-NOTE: Por padrão, gerar cobrança no faturamento
      generate_billing: billingData.generate_billing,
      // Campos de impostos padrão
      discount_percentage: 0,
      tax_rate: 0,
      is_active: true
    }));
    
    setSelectedServices(prev => [...prev, ...newServices]);
    setShowServiceModal(false);
    
    // Mostrar toast de sucesso
    toast.success(`${newServices.length} serviço(s) adicionado(s) com sucesso!`, {
      description: `${newServices.map(s => s.name).join(', ')} foram adicionados ao contrato.`
    });
  };

  // AIDEV-NOTE: Função para criar novo serviço (callback do ServiceSelection)
  const handleCreateService = () => {
    // Implementar lógica para criar novo serviço se necessário
    console.log('Criar novo serviço solicitado');
    toast.info('Funcionalidade de criar serviço em desenvolvimento');
  };
  
  // Função para remover serviço
  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };
  
  // Função para abrir o modal de impostos e retenções
  const handleEditTaxes = (serviceId: string) => {
    const service = selectedServices.find(s => s.id === serviceId);
    if (!service) return;
    
    console.log('=== ABRINDO MODAL DE CONFIGURAÇÃO FINANCEIRA ===');
    console.log('Serviço selecionado:', service);
    console.log('Dados financeiros existentes no serviço:', {
      payment_method: service.payment_method,
      card_type: service.card_type,
      billing_type: service.billing_type,
      recurrence_frequency: service.recurrence_frequency,
      installments: service.installments
    });
    
    setEditingServiceId(serviceId);
    
    // Carregar dados existentes ou manter vazios para forçar seleção
    const newFinancialData: FinancialData = {
      payment_method: service.payment_method || "", // AIDEV-NOTE: Manter vazio se não houver valor
      card_type: service.card_type || "",
      billing_type: service.billing_type || "",
      recurrence_frequency: service.recurrence_frequency || "", // AIDEV-NOTE: Manter vazio para forçar seleção
      installments: service.installments || 1
    };
    
    // Carregar dados financeiros existentes ou usar valores padrão
    console.log('🔍 Carregando dados financeiros do serviço:', {
      payment_method: service.payment_method,
      card_type: service.card_type,
      billing_type: service.billing_type,
      recurrence_frequency: service.recurrence_frequency
    });
    
    // AIDEV-NOTE: Sempre usar os dados do serviço (já mapeados pelo useContractEdit)
    setFinancialData(newFinancialData);
    
    // AIDEV-NOTE: Carrega dados de cobrança do serviço para edição (preservar valor existente)
    setBillingData({
      generate_billing: service.generate_billing ?? false
    });
    
    // AIDEV-NOTE: Carrega dados de vencimento do serviço para edição (preservar valores existentes)
    // Buscar dados de vencimento do serviço no estado atual (selectedServices)
    const currentService = selectedServices.find(s => s.id === serviceId);
    
    setDueDateData({
      due_date_type: currentService?.due_date_type || service.due_date_type || 'days_after_billing',
      due_days: currentService?.due_days !== undefined && currentService?.due_days !== null 
        ? currentService.due_days 
        : (service.due_days !== undefined && service.due_days !== null ? service.due_days : 5),
      due_day: currentService?.due_day !== undefined && currentService?.due_day !== null 
        ? currentService.due_day 
        : (service.due_day !== undefined && service.due_day !== null ? service.due_day : 10),
      due_next_month: currentService?.due_next_month !== undefined && currentService?.due_next_month !== null 
        ? currentService.due_next_month 
        : (service.due_next_month !== undefined && service.due_next_month !== null ? service.due_next_month : false)
    });
    
    setShowTaxModal(true);
  };
  
  // Função para salvar os dados dos impostos e financeiros
  const handleSaveTaxes = async () => {
    try {
      // Encontrar o serviço que está sendo editado
      const serviceIndex = selectedServices.findIndex(s => s.id === editingServiceId);
      if (serviceIndex === -1) {
        console.error('Serviço não encontrado para atualização');
        return;
      }
      
      const currentService = selectedServices[serviceIndex];
      
      // Preparar dados para atualização no banco - AIDEV-NOTE: Inclui dados financeiros e de vencimento
      const updatedServiceData = {
        ...currentService,
        // Dados financeiros
        payment_method: financialData.payment_method || null,
        card_type: financialData.card_type || null,
        billing_type: financialData.billing_type || null,
        recurrence_frequency: financialData.recurrence_frequency || null,
        installments: financialData.installments || 1,
        // Dados de vencimento - AIDEV-NOTE: Configurações de vencimento do serviço
        due_date_type: dueDateData.due_date_type,
        due_days: dueDateData.due_days,
        due_day: dueDateData.due_day,
        due_next_month: dueDateData.due_next_month,
        // Dados de cobrança - AIDEV-NOTE: Configuração se gera cobrança no faturamento
        generate_billing: billingData.generate_billing,
        // Manter outros dados do serviço
        ...taxData
      };
      
      console.log('=== DADOS PREPARADOS PARA ATUALIZAÇÃO ===');
      console.log('Dados do serviço atualizado:', updatedServiceData);
      
      // Atualizar no banco de dados se o serviço já existe no contrato (tem um ID real no banco)
      // Verificar se o serviço já foi salvo no banco (não é apenas um serviço temporário)
      console.log('Verificando serviço para atualização:', {
        id: currentService.id,
        service_id: currentService.service_id,
        contractId,
        isTemp: currentService.id.startsWith('temp-')
      });
      
      if (contractId && currentService.service_id && !currentService.id.startsWith('temp-')) {
        // Se o serviço já existe no banco, atualizar usando o hook useContracts
        console.log('Atualizando serviço no banco de dados...');
        
        // Mapear payment_method e validar card_type
        const mappedPaymentMethod = mapPaymentMethod(financialData.payment_method);
        // AIDEV-NOTE: Garantir que card_type seja NULL quando payment_method não for 'Cartão'
        // e que seja obrigatório quando for 'Cartão' (conforme constraint do banco)
        const validatedCardType = mappedPaymentMethod === 'Cartão' 
          ? (financialData.card_type || null) 
          : null;
        
        // AIDEV-NOTE: Validar se card_type é obrigatório quando payment_method é 'Cartão'
        if (mappedPaymentMethod === 'Cartão' && !financialData.card_type) {
          toast.error('Erro de validação', {
            description: 'Quando o método de pagamento é Cartão, o tipo de cartão é obrigatório.'
          });
          return;
        }
        
        console.log('🔄 Mapeamento de dados financeiros:', {
          original: { payment_method: financialData.payment_method, card_type: financialData.card_type },
          mapped: { payment_method: mappedPaymentMethod, card_type: validatedCardType }
        });

        // AIDEV-NOTE: Usa o hook updateContractServiceMutation para salvar no banco
        // Corrigindo estrutura de dados para evitar erro PGRST116
        await updateContractServiceMutation.mutateAsync({
          id: currentService.id, // ID deve estar no nível raiz, não dentro de serviceData
          // Manter dados básicos do serviço
          description: currentService.description,
          quantity: currentService.quantity,
          unit_price: currentService.unit_price,
          discount_percentage: currentService.discount_percentage || 0,
          tax_rate: currentService.tax_rate || 0,
          // Dados financeiros mapeados
          payment_method: mappedPaymentMethod,
          card_type: validatedCardType,
          billing_type: financialData.billing_type || null,
          recurrence_frequency: financialData.recurrence_frequency || null,
          installments: financialData.installments || 1,
          // Dados de vencimento
          due_date_type: dueDateData.due_date_type,
          due_days: dueDateData.due_days,
          due_day: dueDateData.due_day,
          due_next_month: dueDateData.due_next_month,
          // AIDEV-NOTE: Campo de cobrança - corrige erro PGRST204 ao incluir generate_billing
          generate_billing: billingData.generate_billing
        });
        
        console.log('Serviço atualizado com sucesso no banco!');
      } else if (contractId && currentService.service_id) {
        // Se é um serviço temporário, mas precisa ser salvo no banco
        console.log('Serviço temporário - configurações financeiras serão salvas quando o contrato for salvo');
      } else {
        console.log('Serviço não atende aos critérios para atualização no banco');
      }
      
      // Atualizar no estado local - AIDEV-NOTE: Usar valores originais do formulário no estado local
      const updatedServices = [...selectedServices];
      updatedServices[serviceIndex] = {
        ...updatedServices[serviceIndex],
        // Incluir campos financeiros diretamente no objeto do serviço (valores originais do formulário)
        payment_method: financialData.payment_method,
        card_type: financialData.card_type,
        billing_type: financialData.billing_type,
        recurrence_frequency: financialData.recurrence_frequency,
        installments: financialData.installments,
        // Incluir dados de vencimento - AIDEV-NOTE: Salva configurações de vencimento no serviço
        due_date_type: dueDateData.due_date_type,
        due_days: dueDateData.due_days,
        due_day: dueDateData.due_day,
        due_next_month: dueDateData.due_next_month,
        // AIDEV-NOTE: Campo de cobrança - incluir no estado local
        generate_billing: billingData.generate_billing,
        ...taxData
      };
      
      setSelectedServices(updatedServices);
      setShowTaxModal(false);
      setEditingServiceId("");
    } catch (error) {
      console.error('Erro ao salvar configurações financeiras:', error);
      // Toast de erro já é exibido pelo mutation
    }
  };

  // AIDEV-NOTE: Funções para controle de seleção em massa
  const handleSelectService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServiceIds(prev => [...prev, serviceId]);
    } else {
      setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServiceIds(selectedServices.map(service => service.id));
    } else {
      setSelectedServiceIds([]);
    }
  };

  const handleBulkEdit = () => {
    if (selectedServiceIds.length === 0) {
      toast.error('Nenhum serviço selecionado', {
        description: 'Selecione pelo menos um serviço para editar em massa.'
      });
      return;
    }
    setShowBulkEditModal(true);
  };

  const handleBulkSave = async () => {
    try {
      // AIDEV-NOTE: Atualizar serviços selecionados com os dados em massa APENAS NO FRONTEND
      // A persistência no banco acontecerá quando o usuário clicar em "Salvar no contrato"
      
      // Validar dados antes de aplicar
      const servicesToUpdate = selectedServices.filter(service => 
        selectedServiceIds.includes(service.id)
      );

      // AIDEV-NOTE: Validar payment_method/card_type para todos os serviços selecionados
      for (const service of servicesToUpdate) {
        const mappedPaymentMethod = bulkEditData.payment_method ? mapPaymentMethod(bulkEditData.payment_method) : service.payment_method;
        const validatedCardType = mappedPaymentMethod === 'Cartão' 
          ? (bulkEditData.card_type || service.card_type || null) 
          : null;
        
        if (mappedPaymentMethod === 'Cartão' && !validatedCardType) {
          throw new Error(`Quando o método de pagamento é Cartão, o tipo de cartão é obrigatório para o serviço "${service.description}".`);
        }
      }

      // Atualizar estado local apenas
      const updatedServices = selectedServices.map(service => {
        if (selectedServiceIds.includes(service.id)) {
          // AIDEV-NOTE: Garantir que unit_price seja tratado como string para operações de replace
          const unitPriceValue = bulkEditData.unit_price;
          const hasUnitPrice = unitPriceValue && unitPriceValue !== 0 && unitPriceValue !== '';
          
          let parsedUnitPrice = 0;
          if (hasUnitPrice) {
            // Converter para string se for número, depois aplicar replace
            const unitPriceStr = typeof unitPriceValue === 'string' ? unitPriceValue : String(unitPriceValue);
            parsedUnitPrice = parseFloat(unitPriceStr.replace(/[^\d,.-]/g, '').replace(',', '.'));
          }
          
          return {
            ...service,
            // Aplicar apenas campos que foram preenchidos
            ...(bulkEditData.payment_method && { payment_method: bulkEditData.payment_method }),
            ...(bulkEditData.card_type && { card_type: bulkEditData.card_type }),
            ...(bulkEditData.billing_type && { billing_type: bulkEditData.billing_type }),
            ...(bulkEditData.recurrence_frequency && { recurrence_frequency: bulkEditData.recurrence_frequency }),
            ...(bulkEditData.installments > 1 && { installments: bulkEditData.installments }),
            ...(hasUnitPrice && { 
              unit_price: parsedUnitPrice,
              total_amount: service.quantity * parsedUnitPrice
            }),
            // Configurações de vencimento
            due_date_type: bulkEditData.due_date_type,
            due_days: bulkEditData.due_days,
            due_day: bulkEditData.due_day,
            due_next_month: bulkEditData.due_next_month,
            // Geração de faturamento
            generate_billing: bulkEditData.generate_billing
          };
        }
        return service;
      });

      setSelectedServices(updatedServices);
      setShowBulkEditModal(false);
      setSelectedServiceIds([]);
      
      // Resetar dados do formulário de edição em massa
      setBulkEditData({
        payment_method: '',
        card_type: '',
        billing_type: '',
        recurrence_frequency: '',
        installments: 1,
        unit_price: '',
        due_date_type: 'days_after_billing',
        due_days: 5,
        due_day: 10,
        due_next_month: false,
        generate_billing: true
      });

      toast.success('Alterações aplicadas com sucesso!', {
        description: `${selectedServiceIds.length} serviços foram atualizados. Clique em "Salvar no contrato" para persistir as alterações.`
      });
    } catch (error) {
      console.error('Erro ao atualizar serviços em massa:', error);
      toast.error('Erro ao aplicar alterações', {
        description: 'Ocorreu um erro ao aplicar as alterações em massa.'
      });
    }
  };
  
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Atualizar o formState quando os serviços selecionados mudarem
  React.useEffect(() => {
    // Marcar como atualização interna para evitar loop infinito
    isInternalUpdate.current = true;
    
    // AIDEV-NOTE: Preservar dados de vencimento existentes ao sincronizar com o formulário
    const currentFormServices = form.getValues('services') || [];
    
    // Mesclar dados existentes do formulário com selectedServices para preservar configurações
    const mergedServices = selectedServices.map(selectedService => {
      const existingFormService = currentFormServices.find(fs => fs.id === selectedService.id);
      
      // AIDEV-NOTE: Priorizar alterações da edição em massa sobre dados existentes do formulário
      if (existingFormService) {
        console.log('🔄 Sincronizando dados para serviço:', selectedService.id, {
          // Dados de vencimento: priorizar selectedService (edição em massa)
          due_date_type: selectedService.due_date_type || existingFormService.due_date_type,
          due_days: selectedService.due_days !== undefined ? selectedService.due_days : existingFormService.due_days,
          due_day: selectedService.due_day !== undefined ? selectedService.due_day : existingFormService.due_day,
          due_next_month: selectedService.due_next_month !== undefined ? selectedService.due_next_month : existingFormService.due_next_month
        });
        
        return {
          ...selectedService,
          // AIDEV-NOTE: Para dados de vencimento, priorizar selectedService (edição em massa) sobre formulário
          due_date_type: selectedService.due_date_type || existingFormService.due_date_type,
          due_days: selectedService.due_days !== undefined ? selectedService.due_days : existingFormService.due_days,
          due_day: selectedService.due_day !== undefined ? selectedService.due_day : existingFormService.due_day,
          due_next_month: selectedService.due_next_month !== undefined ? selectedService.due_next_month : existingFormService.due_next_month,
          // AIDEV-NOTE: Priorizar valores válidos (não vazios) entre selectedService e formulário
          // Usar valores padrão válidos quando ambos estão vazios
          payment_method: selectedService.payment_method || existingFormService.payment_method || "PIX",
          card_type: selectedService.card_type || existingFormService.card_type || "",
          billing_type: selectedService.billing_type || existingFormService.billing_type || "Único",
          recurrence_frequency: selectedService.recurrence_frequency || existingFormService.recurrence_frequency || "",
          installments: selectedService.installments || existingFormService.installments || 1,
          // AIDEV-NOTE: Preservar configuração de geração de cobrança do formulário
          generate_billing: selectedService.generate_billing !== undefined ? selectedService.generate_billing : existingFormService.generate_billing
        };
      }
      
      return selectedService;
    });
    
    form.setValue("services", mergedServices);
  }, [selectedServices, form]);

  // AIDEV-NOTE: Sincronizar dueDateData com selectedServices quando campos de vencimento são alterados na edição normal
  React.useEffect(() => {
    if (selectedServices.length > 0 && editingServiceId) {
      // Atualizar o serviço atual nos selectedServices com os dados de vencimento
      const updatedServices = selectedServices.map(service => {
        if (service.id === editingServiceId) {
          console.log('🔄 Sincronizando dueDateData para serviço:', service.id, dueDateData);
          return {
            ...service,
            due_date_type: dueDateData.due_date_type,
            due_days: dueDateData.due_days,
            due_day: dueDateData.due_day,
            due_next_month: dueDateData.due_next_month
          };
        }
        return service;
      });
      
      setSelectedServices(updatedServices);
    }
   }, [dueDateData, editingServiceId]);

  // AIDEV-NOTE: Sincronizar billingData com selectedServices quando configuração de cobrança é alterada na edição normal
  React.useEffect(() => {
    if (selectedServices.length > 0 && editingServiceId) {
      // Atualizar o serviço atual nos selectedServices com os dados de cobrança
      const updatedServices = selectedServices.map(service => {
        if (service.id === editingServiceId) {
          console.log('🔄 Sincronizando billingData para serviço:', service.id, billingData);
          return {
            ...service,
            generate_billing: billingData.generate_billing
          };
        }
        return service;
      });
      
      setSelectedServices(updatedServices);
    }
   }, [billingData, editingServiceId]);

  // AIDEV-NOTE: Sincronizar financialData com selectedServices quando dados financeiros são alterados na edição normal
  React.useEffect(() => {
    if (selectedServices.length > 0 && editingServiceId) {
      // Atualizar o serviço atual nos selectedServices com os dados financeiros
      const updatedServices = selectedServices.map(service => {
        if (service.id === editingServiceId) {
          console.log('🔄 Sincronizando financialData para serviço:', service.id, financialData);
          return {
            ...service,
            payment_method: financialData.payment_method,
            card_type: financialData.card_type,
            billing_type: financialData.billing_type,
            recurrence_frequency: financialData.recurrence_frequency,
            installments: financialData.installments
          };
        }
        return service;
      });
      
      setSelectedServices(updatedServices);
    }
  }, [financialData, editingServiceId]);

  // AIDEV-NOTE: Sincronizar taxData com selectedServices quando dados de impostos são alterados na edição normal
  React.useEffect(() => {
    if (selectedServices.length > 0 && editingServiceId) {
      // Atualizar o serviço atual nos selectedServices com os dados de impostos
      const updatedServices = selectedServices.map(service => {
        if (service.id === editingServiceId) {
          console.log('🔄 Sincronizando taxData para serviço:', service.id, taxData);
          return {
            ...service,
            nbs_code: taxData.nbs_code,
            deduction_value: taxData.deduction_value,
            calculation_base: taxData.calculation_base,
            iss_rate: taxData.iss_rate,
            iss_deduct: taxData.iss_deduct,
            ir_rate: taxData.ir_rate,
            ir_deduct: taxData.ir_deduct,
            csll_rate: taxData.csll_rate,
            csll_deduct: taxData.csll_deduct,
            inss_rate: taxData.inss_rate,
            inss_deduct: taxData.inss_deduct,
            pis_rate: taxData.pis_rate,
            pis_deduct: taxData.pis_deduct,
            cofins_rate: taxData.cofins_rate,
            cofins_deduct: taxData.cofins_deduct
          };
        }
        return service;
      });
      
      setSelectedServices(updatedServices);
    }
  }, [taxData, editingServiceId]);
   
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Serviços do Contrato
          {selectedServiceIds.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {selectedServiceIds.length} selecionado{selectedServiceIds.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {selectedServiceIds.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBulkEdit}
              className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all duration-200"
            >
              <Calculator className="h-3.5 w-3.5" />
              Editar em Massa ({selectedServiceIds.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowServiceModal(true)}
            className="gap-1 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Serviço
          </Button>
        </div>
      </div>
      
      {selectedServices.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Nenhum serviço adicionado ao contrato</p>
            <p className="text-xs text-muted-foreground">Adicione serviços para calcular o valor total do contrato</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowServiceModal(true)}
            className="mt-2 gap-1 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Serviço
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedServiceIds.length === selectedServices.length && selectedServices.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-border/50"
                  />
                </TableHead>
                <TableHead className="font-medium text-muted-foreground text-xs">Serviço</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground text-xs">Valor Unitário</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground text-xs">Quantidade</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground text-xs">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedServices.map((service) => (
                <TableRow key={service.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Checkbox
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => handleSelectService(service.id)}

                    />
                  </TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(service.unit_price || service.default_price || 0)}</TableCell>
                  <TableCell className="text-right">{service.quantity}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(service.total)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="w-48 border-border/50"
                      >
                        <DropdownMenuItem 
                          className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" 
                          onClick={() => handleEditTaxes(service.id)}
                        >
                          <Calculator className="h-4 w-4" />
                          <span>Impostos e Retenções</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
                          <span>Duplicar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive gap-2 focus:text-destructive hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer" 
                          onClick={() => handleRemoveService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Remover</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* AIDEV-NOTE: Modal substituído pelo componente ServiceSelection para seleção múltipla */}
      <ServiceSelection
        open={showServiceModal}
        onOpenChange={setShowServiceModal}
        onServiceSelect={handleAddServices}
        onCreateService={handleCreateService}
        services={services}
        isLoading={isLoading}
        selectedServiceIds={[]} // Sempre começar vazio para nova seleção
        singleSelect={false} // Permitir seleção múltipla
      />

      {/* Modal para Impostos e Retenções */}
      <Dialog 
        key={`service-tax-modal-${showTaxModal}-${editingServiceId}`}
        open={showTaxModal} 
        onOpenChange={(open) => {
          setShowTaxModal(open);
          if (!open) {
            // Reset states when closing
            setEditingServiceId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Impostos e Retenções do Item
            </DialogTitle>
            <DialogDescription>
              Configure os impostos e retenções para o serviço selecionado.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detalhes do Serviço</TabsTrigger>
              <TabsTrigger value="financial">Configuração Financeira</TabsTrigger>
              <TabsTrigger value="taxes">Impostos e Retenções</TabsTrigger>
              <TabsTrigger value="transparency">Lei da Transparência</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              {/* AIDEV-NOTE: Seção de configuração de detalhes do serviço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Detalhes do Serviço</h3>
                <p className="text-sm text-muted-foreground">Configure os detalhes específicos do serviço</p>
                
                {/* AIDEV-NOTE: Campos de valor e quantidade do serviço */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Valor e Quantidade</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Campo de Valor Unitário */}
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice" className="text-sm font-medium">Valor Unitário</Label>
                      <Input 
                        id="unitPrice"
                        type="text"
                        inputMode="decimal"
                        value={(() => {
                          const currentService = selectedServices.find(s => s.id === editingServiceId);
                          const value = currentService?.unit_price ?? currentService?.default_price ?? '';
                          return value === 0 ? '' : value.toString();
                        })()}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Permite apenas números, vírgula e ponto
                          const sanitizedValue = inputValue.replace(/[^0-9.,]/g, '').replace(',', '.');
                          const newValue = sanitizedValue === '' ? 0 : parseFloat(sanitizedValue);
                          
                          setSelectedServices(prev => 
                            prev.map(service => 
                              service.id === editingServiceId 
                                ? { 
                                    ...service, 
                                    unit_price: isNaN(newValue) ? 0 : newValue,
                                    total: (isNaN(newValue) ? 0 : newValue) * (service.quantity || 1)
                                  }
                                : service
                            )
                          );
                        }}
                        placeholder="Ex: 1500.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor cobrado por unidade do serviço
                      </p>
                    </div>
                    
                    {/* Campo de Quantidade */}
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium">Quantidade</Label>
                      <Input 
                        id="quantity"
                        type="text"
                        inputMode="numeric"
                        value={(() => {
                          const currentService = selectedServices.find(s => s.id === editingServiceId);
                          const value = currentService?.quantity ?? '';
                          return value === 0 ? '' : value.toString();
                        })()}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Permite apenas números inteiros
                          const sanitizedValue = inputValue.replace(/[^0-9]/g, '');
                          const newValue = sanitizedValue === '' ? 1 : parseInt(sanitizedValue);
                          
                          setSelectedServices(prev => 
                            prev.map(service => 
                              service.id === editingServiceId 
                                ? { 
                                    ...service, 
                                    quantity: isNaN(newValue) ? 1 : Math.max(1, newValue),
                                    total: (service.unit_price || service.default_price || 0) * (isNaN(newValue) ? 1 : Math.max(1, newValue))
                                  }
                                : service
                            )
                          );
                        }}
                        placeholder="Ex: 2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantidade de unidades do serviço
                      </p>
                    </div>
                  </div>
                  
                  {/* Exibição do Total Calculado */}
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total do Serviço:</span>
                      <span className="text-lg font-semibold text-primary">
                        {(() => {
                          const currentService = selectedServices.find(s => s.id === editingServiceId);
                          return formatCurrency(currentService?.total || 0);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Configuração de Vencimento */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Tipo de Vencimento</h4>
                  
                  {/* Seletor do tipo de vencimento */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Como será calculado o vencimento?</Label>
                    <Select 
                      value={dueDateData.due_date_type} 
                      onValueChange={(value: 'days_after_billing' | 'fixed_day') => 
                        setDueDateData(prev => ({ ...prev, due_date_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de vencimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days_after_billing">Número de dias após faturar</SelectItem>
                        <SelectItem value="fixed_day">Fixar Dia do Mês (1 a 31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Campo condicional: Número de dias */}
                  {dueDateData.due_date_type === 'days_after_billing' && (
                    <div className="space-y-2">
                      <Label htmlFor="dueDays" className="text-sm font-medium">Número de dias</Label>
                      <Input 
                        id="dueDays"
                        type="number"
                        min={1}
                        max={365}
                        value={dueDateData.due_days || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // AIDEV-NOTE: Permite campo vazio durante edição, mas aplica valor mínimo 1 quando há conteúdo
                          if (value === '') {
                            setDueDateData(prev => ({ ...prev, due_days: undefined }));
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 1) {
                              setDueDateData(prev => ({ ...prev, due_days: numValue }));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // AIDEV-NOTE: Aplica valor padrão 1 quando o usuário sai do campo vazio
                          if (!dueDateData.due_days) {
                            setDueDateData(prev => ({ ...prev, due_days: 1 }));
                          }
                        }}
                        placeholder="Ex: 5 dias após o faturamento"
                      />
                      <p className="text-xs text-muted-foreground">
                        O vencimento será {dueDateData.due_days} dias após a data de faturamento do contrato
                      </p>
                    </div>
                  )}
                  
                  {/* Campos condicionais: Dia fixo do mês */}
                  {dueDateData.due_date_type === 'fixed_day' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dueDay" className="text-sm font-medium">Dia do Mês</Label>
                        <Input 
                          id="dueDay"
                          type="number"
                          min={1}
                          max={31}
                          value={dueDateData.due_day}
                          onChange={(e) => setDueDateData(prev => ({ 
                            ...prev, 
                            due_day: parseInt(e.target.value) || 1 
                          }))}
                          placeholder="Ex: 10 (dia 10 de cada mês)"
                        />
                        <p className="text-xs text-muted-foreground">
                          O vencimento será sempre no dia {dueDateData.due_day} do mês
                        </p>
                      </div>
                      
                      {/* Checkbox para próximo mês */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dueNextMonth"
                          checked={dueDateData.due_next_month}
                          onCheckedChange={(checked) => setDueDateData(prev => ({ 
                            ...prev, 
                            due_next_month: !!checked 
                          }))}
                        />
                        <Label htmlFor="dueNextMonth" className="text-sm font-medium">
                          Próximo mês
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dueDateData.due_next_month 
                          ? `O vencimento começará no próximo mês (dia ${dueDateData.due_day})` 
                          : `O vencimento começará no mês atual (dia ${dueDateData.due_day})`
                        }
                      </p>
                    </div>
                  )}

                  {/* Configuração de Cobrança - AIDEV-NOTE: Campo para controlar se gera cobrança no faturamento */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Gerar cobrança no faturamento?</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="billing_yes"
                          name="generate_billing"
                          checked={billingData.generate_billing === true}
                          onChange={() => setBillingData(prev => ({ ...prev, generate_billing: true }))}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <Label htmlFor="billing_yes" className="text-sm">
                          Sim
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="billing_no"
                          name="generate_billing"
                          checked={billingData.generate_billing === false}
                          onChange={() => setBillingData(prev => ({ ...prev, generate_billing: false }))}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <Label htmlFor="billing_no" className="text-sm">
                          Não
                        </Label>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Define se este serviço deve gerar cobrança automática no faturamento
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configuração Financeira</h3>
                  <p className="text-sm text-muted-foreground">Configure o método de pagamento e faturamento para este serviço</p>
                </div>
                
                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Método de Pagamento</Label>
                  <Select value={financialData.payment_method || ""} onValueChange={(value) => {
                    // AIDEV-NOTE: Resetar card_type quando payment_method não for 'Cartão' para evitar travamento do billing_type
                    const newFinancialData = { ...financialData, payment_method: value };
                    
                    if (value !== 'Cartão') {
                      // Resetar card_type e liberar billing_type para outros métodos de pagamento
                      newFinancialData.card_type = '';
                      // Resetar billing_type para 'Único' como padrão para métodos não-cartão
                      newFinancialData.billing_type = 'Único';
                      newFinancialData.recurrence_frequency = '';
                      newFinancialData.installments = 1;
                    }
                    
                    setFinancialData(newFinancialData);
                  }}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o método" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Cartão">Cartão</SelectItem>
                         <SelectItem value="PIX">PIX</SelectItem>
                         <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                         <SelectItem value="Boleto Bancário">Boleto Bancário</SelectItem>
                       </SelectContent>
                     </Select>
                </div>
                
                {/* Tipo de Cartão */}
                {financialData.payment_method === 'Cartão' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tipo de Cartão</Label>
                      <Select value={financialData.card_type || ""} onValueChange={(value) => {
                        // AIDEV-NOTE: Implementação das regras específicas para ambos os tipos de cartão
                        const newFinancialData = { ...financialData, card_type: value };
                        
                        if (value === 'credit_recurring') {
                          // Para credit_recurring: definir automaticamente como Mensal e resetar parcelas para 1
                          newFinancialData.billing_type = 'Mensal';
                          newFinancialData.recurrence_frequency = 'Mensal';
                          newFinancialData.installments = 1;
                        } else if (value === 'credit') {
                          // Para credit simples: definir automaticamente como Único (pagamento único)
                          newFinancialData.billing_type = 'Único';
                          newFinancialData.recurrence_frequency = '';
                          // Manter parcelas existentes ou definir padrão de 2 se não houver
                          newFinancialData.installments = newFinancialData.installments || 2;
                        }
                        
                        setFinancialData(newFinancialData);
                      }}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o tipo" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="credit">Crédito</SelectItem>
                         <SelectItem value="credit_recurring">Crédito Recorrente</SelectItem>
                       </SelectContent>
                     </Select>
                    </div>
                  )}
                
                {/* Tipo de Faturamento - só aparece após escolher método de pagamento */}
                {financialData.payment_method && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Faturamento</Label>
                    <Select 
                      value={financialData.billing_type || ""} 
                      onValueChange={(value) => {
                        const newData = { ...financialData, billing_type: value };
                        
                        // AIDEV-NOTE: Para Boleto Bancário recorrente, definir recurrence_frequency automaticamente
                        if (financialData.payment_method === 'Boleto Bancário' && 
                            ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(value)) {
                          newData.recurrence_frequency = value;
                        }
                        
                        setFinancialData(newData);
                      }}
                      disabled={financialData.payment_method === 'Cartão' && (financialData.card_type === 'credit_recurring' || financialData.card_type === 'credit')}
                    >
                      <SelectTrigger className={(financialData.payment_method === 'Cartão' && (financialData.card_type === 'credit_recurring' || financialData.card_type === 'credit')) ? 'opacity-50' : ''}>
                        <SelectValue placeholder={
                          financialData.payment_method === 'Cartão' && financialData.card_type === 'credit_recurring'
                            ? "Recorrente (Mensal) - Automático"
                            : financialData.payment_method === 'Cartão' && financialData.card_type === 'credit'
                            ? "Único - Automático"
                            : "Selecione o tipo"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Único">Único</SelectItem>
                        <SelectItem value="Mensal">Recorrente (Mensal)</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    {financialData.payment_method === 'Cartão' && financialData.card_type === 'credit_recurring' && (
                      <span className="text-xs text-muted-foreground">
                        Para cartão de crédito recorrente, o tipo é automaticamente definido como Recorrente (Mensal)
                      </span>
                    )}
                    {financialData.payment_method === 'Cartão' && financialData.card_type === 'credit' && (
                      <span className="text-xs text-muted-foreground">
                        Para cartão de crédito, o tipo é automaticamente definido como Único
                      </span>
                    )}
                  </div>
                )}
                
                {/* Frequência de Recorrência - só aparece após escolher método de pagamento e tipo de faturamento, mas não para credit_recurring nem para credit nem para Boleto Bancário */}
                {financialData.payment_method && 
                 (financialData.billing_type === "Mensal" || financialData.billing_type === "Trimestral" || financialData.billing_type === "Semestral" || financialData.billing_type === "Anual") && 
                 financialData.card_type !== 'credit_recurring' && 
                 !(financialData.payment_method === 'Cartão' && financialData.card_type === 'credit') &&
                 financialData.payment_method !== 'Boleto Bancário' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequência de Cobrança</Label>
                    <Select value={financialData.recurrence_frequency || ""} onValueChange={(value) => setFinancialData(prev => ({ ...prev, recurrence_frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Número de Parcelas - para cartão só aparece para crédito (não recorrente), para outros métodos após escolher faturamento, e para Boleto Bancário quando tipo for Único */}
                {((financialData.payment_method === 'Cartão' && financialData.card_type === 'credit') || 
                  (financialData.payment_method === 'Boleto Bancário' && financialData.billing_type === 'Único') ||
                  (financialData.payment_method && financialData.payment_method !== 'Cartão' && financialData.payment_method !== 'Boleto Bancário' && financialData.billing_type && financialData.billing_type !== "Único")) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Número de Parcelas</Label>
                    <Input 
                      type="number" 
                      value={financialData.installments || ""} 
                      onChange={(e) => {
                        // AIDEV-NOTE: Permite que o usuário apague completamente o campo e digite qualquer valor
                        const inputValue = e.target.value;
                        if (inputValue === "") {
                          setFinancialData(prev => ({ ...prev, installments: null }));
                        } else {
                          const value = parseInt(inputValue);
                          if (!isNaN(value) && value > 0) {
                            setFinancialData(prev => ({ ...prev, installments: value }));
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // AIDEV-NOTE: Se o campo estiver vazio ao perder o foco, define valor padrão como 1
                        if (!financialData.installments || financialData.installments < 1) {
                          setFinancialData(prev => ({ ...prev, installments: 1 }));
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      Número de parcelas para pagamento
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="taxes" className="space-y-4">
              <div className="space-y-4">
                {/* Código NBS */}
                <div className="space-y-2">
                  <Label htmlFor="nbsCode" className="text-sm font-medium">Código NBS</Label>
                  <Input 
                    id="nbsCode"
                    value={taxData.nbs_code}
                    onChange={(e) => setTaxData(prev => ({ ...prev, nbs_code: e.target.value }))}
                    placeholder="Digite o código NBS"
                  />
                </div>
                
                {/* Valor da Dedução e Base de Cálculo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deductionValue" className="text-sm font-medium">Valor da Dedução (US$)</Label>
                    <Input 
                      id="deductionValue"
                      type="number"
                      step="0.01"
                      value={taxData.deduction_value}
                      onChange={(e) => setTaxData(prev => ({ ...prev, deduction_value: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calculationBase" className="text-sm font-medium">Base de Cálculo do Serviço</Label>
                    <Input 
                      id="calculationBase"
                      type="number"
                      step="0.01"
                      value={taxData.calculation_base}
                      onChange={(e) => setTaxData(prev => ({ ...prev, calculation_base: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                
                {/* Impostos */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Impostos</h4>
                  
                  {/* ISS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">ISS (Imposto Sobre Serviços)</h5>
                      <Checkbox
                        checked={taxData.iss_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, iss_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="iss_rate">Alíquota (%)</Label>
                        <Input
                          id="iss_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.iss_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, iss_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="iss_value">Valor</Label>
                        <Input
                          id="iss_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.iss_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* IR */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">IR (Imposto de Renda)</h5>
                      <Checkbox
                        checked={taxData.ir_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, ir_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ir_rate">Alíquota (%)</Label>
                        <Input
                          id="ir_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.ir_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, ir_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ir_value">Valor</Label>
                        <Input
                          id="ir_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.ir_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* CSLL */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">CSLL (Contribuição Social sobre o Lucro Líquido)</h5>
                      <Checkbox
                        checked={taxData.csll_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, csll_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="csll_rate">Alíquota (%)</Label>
                        <Input
                          id="csll_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.csll_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, csll_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="csll_value">Valor</Label>
                        <Input
                          id="csll_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.csll_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* INSS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">INSS (Instituto Nacional do Seguro Social)</h5>
                      <Checkbox
                        checked={taxData.inss_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, inss_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="inss_rate">Alíquota (%)</Label>
                        <Input
                          id="inss_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.inss_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, inss_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inss_value">Valor</Label>
                        <Input
                          id="inss_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.inss_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* PIS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">PIS (Programa de Integração Social)</h5>
                      <Checkbox
                        checked={taxData.pis_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, pis_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pis_rate">Alíquota (%)</Label>
                        <Input
                          id="pis_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.pis_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, pis_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pis_value">Valor</Label>
                        <Input
                          id="pis_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.pis_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* COFINS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">COFINS (Contribuição para o Financiamento da Seguridade Social)</h5>
                      <Checkbox
                        checked={taxData.cofins_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, cofins_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cofins_rate">Alíquota (%)</Label>
                        <Input
                          id="cofins_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.cofins_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, cofins_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cofins_value">Valor</Label>
                        <Input
                          id="cofins_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.cofins_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="transparency" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Lei da Transparência</h3>
                <p className="text-sm text-muted-foreground">Informações sobre a carga tributária incidente sobre este serviço</p>
                
                {/* Resumo dos Tributos */}
                <div className="bg-primary/10 dark:bg-primary/10 p-4 rounded-lg border border-primary/20 dark:border-primary/20">
          <h4 className="font-medium text-primary dark:text-primary mb-3">Resumo dos Tributos Federais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>IR (Imposto de Renda):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.ir_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSLL (Contribuição Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.csll_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>INSS (Previdência Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.inss_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PIS (Programa de Integração Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.pis_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COFINS (Contribuição para Financiamento da Seguridade Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.cofins_rate) / 100)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <h4 className="font-medium text-primary dark:text-primary mb-2">Tributos Municipais</h4>
                    <div className="flex justify-between text-sm">
                      <span>ISS (Imposto Sobre Serviços):</span>
                      <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.iss_rate) / 100)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Aproximado de Tributos:</span>
                      <span className="text-primary dark:text-primary">
                        {formatCurrency(
                          (taxData.calculation_base * (taxData.ir_rate + taxData.csll_rate + taxData.inss_rate + taxData.pis_rate + taxData.cofins_rate + taxData.iss_rate)) / 100
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span className="text-sm text-muted-foreground">Percentual da Carga Tributária:</span>
                      <span className="font-medium">
                        {((taxData.ir_rate + taxData.csll_rate + taxData.inss_rate + taxData.pis_rate + taxData.cofins_rate + taxData.iss_rate)).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <h4 className="font-medium text-primary dark:text-primary mb-2">Informações Importantes</h4>
            <div className="text-xs text-primary/80 dark:text-primary/80 space-y-1">
                      <p>• Os valores apresentados são aproximados e podem variar conforme a legislação vigente.</p>
                      <p>• Esta informação é fornecida em cumprimento à Lei nº 12.741/2012 (Lei da Transparência).</p>
                      <p>• Os tributos podem estar sujeitos a regimes especiais de tributação.</p>
                      <p>• Para informações precisas, consulte sempre um contador ou advogado tributarista.</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-primary/70 dark:text-primary/70">
                      <strong>Fonte:</strong> Receita Federal do Brasil e legislação tributária vigente.<br/>
                      Esta informação tem caráter meramente educativo e informativo.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowTaxModal(false)}
              className="border-border/50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTaxes}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição em Massa */}
      <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
        <DialogContent className="sm:max-w-2xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Edição em Massa - {selectedServiceIds.length} Serviço{selectedServiceIds.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Configure as alterações que serão aplicadas aos serviços selecionados. Deixe em branco os campos que não deseja alterar.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="financial" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="price" className="gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Valor
              </TabsTrigger>
              <TabsTrigger value="due-date" className="gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Vencimento
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-1">
                <Clock className="h-3.5 w-3.5" />
                Faturamento
              </TabsTrigger>
            </TabsList>

            {/* Aba Configurações Financeiras */}
            <TabsContent value="financial" className="space-y-4 mt-4">
              {/* AIDEV-NOTE: Implementação das mesmas restrições da edição normal */}
              <div className="space-y-4">
                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-payment-method">Método de Pagamento</Label>
                  <Select 
                    value={bulkEditData.payment_method} 
                    onValueChange={(value) => setBulkEditData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                      <SelectItem value="Boleto Bancário">Boleto Bancário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Cartão - só aparece quando método é Cartão */}
                {bulkEditData.payment_method === 'Cartão' && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-card-type">Tipo de Cartão</Label>
                    <Select 
                      value={bulkEditData.card_type} 
                      onValueChange={(value) => {
                        // AIDEV-NOTE: Implementação das regras específicas para ambos os tipos de cartão (igual à edição normal)
                        const newBulkEditData = { ...bulkEditData, card_type: value };
                        
                        if (value === 'credit_recurring') {
                          // Para credit_recurring: definir automaticamente como Mensal e resetar parcelas para 1
                          newBulkEditData.billing_type = 'Mensal';
                          newBulkEditData.recurrence_frequency = 'Mensal';
                          newBulkEditData.installments = 1;
                        } else if (value === 'credit') {
                          // Para credit simples: definir automaticamente como Único (pagamento único)
                          newBulkEditData.billing_type = 'Único';
                          newBulkEditData.recurrence_frequency = '';
                          // Manter parcelas existentes ou definir padrão de 2 se não houver
                          newBulkEditData.installments = newBulkEditData.installments || 2;
                        }
                        
                        setBulkEditData(newBulkEditData);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Crédito</SelectItem>
                        <SelectItem value="credit_recurring">Crédito Recorrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tipo de Faturamento - só aparece após escolher método de pagamento */}
                {bulkEditData.payment_method && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-billing-type">Tipo de Faturamento</Label>
                    <Select 
                      value={bulkEditData.billing_type} 
                      onValueChange={(value) => {
                        const newData = { ...bulkEditData, billing_type: value };
                        
                        // AIDEV-NOTE: Para Boleto Bancário recorrente, definir recurrence_frequency automaticamente
                        if (bulkEditData.payment_method === 'Boleto Bancário' && 
                            ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(value)) {
                          newData.recurrence_frequency = value;
                        }
                        
                        setBulkEditData(newData);
                      }}
                      disabled={bulkEditData.card_type === 'credit_recurring' || bulkEditData.card_type === 'credit'}
                    >
                      <SelectTrigger className={`${(bulkEditData.card_type === 'credit_recurring' || bulkEditData.card_type === 'credit') ? 'opacity-50' : ''}`}>
                        <SelectValue placeholder={
                          bulkEditData.card_type === 'credit_recurring'
                            ? "Recorrente (Mensal) - Automático"
                            : bulkEditData.card_type === 'credit'
                            ? "Único - Automático"
                            : "Selecionar tipo"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Único">Único</SelectItem>
                        <SelectItem value="Mensal">Recorrente (Mensal)</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                    {bulkEditData.card_type === 'credit_recurring' && (
                      <span className="text-xs text-muted-foreground">
                        Para cartão de crédito recorrente, o tipo é automaticamente definido como Recorrente (Mensal)
                      </span>
                    )}
                    {bulkEditData.card_type === 'credit' && (
                      <span className="text-xs text-muted-foreground">
                        Para cartão de crédito, o tipo é automaticamente definido como Único
                      </span>
                    )}
                  </div>
                )}

                {/* Frequência de Recorrência - só aparece após escolher método de pagamento e tipo de faturamento, mas não para credit_recurring nem para credit nem para Boleto Bancário */}
                {bulkEditData.payment_method && 
                 (bulkEditData.billing_type === "Mensal" || bulkEditData.billing_type === "Trimestral" || bulkEditData.billing_type === "Semestral" || bulkEditData.billing_type === "Anual") && 
                 bulkEditData.card_type !== 'credit_recurring' && 
                 !(bulkEditData.payment_method === 'Cartão' && bulkEditData.card_type === 'credit') &&
                 bulkEditData.payment_method !== 'Boleto Bancário' && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-recurrence">Frequência de Cobrança</Label>
                    <Select 
                      value={bulkEditData.recurrence_frequency} 
                      onValueChange={(value) => setBulkEditData(prev => ({ ...prev, recurrence_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Número de Parcelas - para cartão só aparece para crédito (não recorrente), para outros métodos após escolher faturamento, e para Boleto Bancário quando tipo for Único */}
                {((bulkEditData.payment_method === 'Cartão' && bulkEditData.card_type === 'credit') || 
                  (bulkEditData.payment_method === 'Boleto Bancário' && bulkEditData.billing_type === 'Único') ||
                  (bulkEditData.payment_method && bulkEditData.payment_method !== 'Cartão' && bulkEditData.payment_method !== 'Boleto Bancário' && bulkEditData.billing_type && bulkEditData.billing_type !== "Único")) && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-installments">Número de Parcelas</Label>
                    <Input
                      id="bulk-installments"
                      type="number"
                      min="1"
                      max="12"
                      value={bulkEditData.installments || ''}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, installments: parseInt(e.target.value) || 0 }))}
                      placeholder="Ex: 3"
                    />
                    {bulkEditData.payment_method === 'Cartão' && bulkEditData.card_type === 'credit' && (
                      <span className="text-xs text-muted-foreground">
                        Para cartão de crédito, você pode parcelar em até 12x
                      </span>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Aba Valor */}
            <TabsContent value="price" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-unit-price">Novo Valor Unitário</Label>
                  <Input
                    id="bulk-unit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkEditData.unit_price || ''}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="Ex: 100.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para não alterar o valor dos serviços selecionados.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Aba Tipo de Vencimento */}
            <TabsContent value="due-date" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-due-date-type">Tipo de Vencimento</Label>
                  <Select 
                    value={bulkEditData.due_date_type} 
                    onValueChange={(value) => setBulkEditData(prev => ({ ...prev, due_date_type: value as 'days_after_billing' | 'fixed_day' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days_after_billing">Dias após faturamento</SelectItem>
                      <SelectItem value="fixed_day">Dia fixo do mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkEditData.due_date_type === 'days_after_billing' && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-due-days">Dias após faturamento</Label>
                    <Input
                      id="bulk-due-days"
                      type="number"
                      min="1"
                      max="365"
                      value={bulkEditData.due_days || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // AIDEV-NOTE: Permite campo vazio durante edição para facilitar digitação
                        if (value === '') {
                          setBulkEditData(prev => ({ ...prev, due_days: undefined }));
                        } else {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue) && numValue >= 1) {
                            setBulkEditData(prev => ({ ...prev, due_days: numValue }));
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // AIDEV-NOTE: Aplica valor padrão 1 quando o usuário sai do campo vazio
                        if (!bulkEditData.due_days) {
                          setBulkEditData(prev => ({ ...prev, due_days: 1 }));
                        }
                      }}
                      placeholder="Ex: 30"
                    />
                  </div>
                )}

                {bulkEditData.due_date_type === 'fixed_day' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-due-day">Dia do mês</Label>
                      <Input
                        id="bulk-due-day"
                        type="number"
                        min="1"
                        max="31"
                        value={bulkEditData.due_day || ''}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, due_day: parseInt(e.target.value) || 1 }))}
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Próximo mês</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id="bulk-due-next-month"
                          checked={bulkEditData.due_next_month || false}
                          onCheckedChange={(checked) => setBulkEditData(prev => ({ ...prev, due_next_month: checked as boolean }))}
                        />
                        <Label htmlFor="bulk-due-next-month" className="text-sm">
                          Vencimento no próximo mês
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Aba Geração de Faturamento */}
            <TabsContent value="billing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Configuração de Faturamento</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulk-generate-billing-true"
                        checked={bulkEditData.generate_billing === true}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkEditData(prev => ({ ...prev, generate_billing: true }));
                          }
                        }}
                      />
                      <Label htmlFor="bulk-generate-billing-true" className="text-sm">
                        Gerar faturamento automaticamente
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulk-generate-billing-false"
                        checked={bulkEditData.generate_billing === false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkEditData(prev => ({ ...prev, generate_billing: false }));
                          }
                        }}
                      />
                      <Label htmlFor="bulk-generate-billing-false" className="text-sm">
                        Não gerar faturamento automaticamente
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulk-generate-billing-unchanged"
                        checked={bulkEditData.generate_billing === undefined}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkEditData(prev => ({ ...prev, generate_billing: undefined }));
                          }
                        }}
                      />
                      <Label htmlFor="bulk-generate-billing-unchanged" className="text-sm">
                        Não alterar configuração atual
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escolha se os serviços selecionados devem gerar faturamento automaticamente ou não.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkEditModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkSave}
              className="bg-primary hover:bg-primary/90"
            >
              Aplicar Alterações ({selectedServiceIds.length} serviço{selectedServiceIds.length > 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
