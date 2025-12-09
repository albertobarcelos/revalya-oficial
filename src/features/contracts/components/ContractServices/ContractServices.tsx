/**
 * AIDEV-NOTE: Componente principal de serviços do contrato - VERSÃO REFATORADA
 * Usa hooks e componentes extraídos para melhor organização
 * 
 * @module features/contracts/components/ContractServices/ContractServices
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IMaskInput } from 'react-imask';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Calculator, CreditCard, Clock, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { UseFormReturn } from 'react-hook-form';

// Hooks e serviços existentes
import { useServices } from '@/hooks/useServices';
import { useContractForm } from '@/components/contracts/form/ContractFormProvider';
import { ServiceSelection } from '@/components/contracts/parts/ServiceSelection';

// AIDEV-NOTE: Imports da nova estrutura refatorada
import type { SelectedService, FinancialData, TaxData } from '../../types';
import { 
  DEFAULT_FINANCIAL_DATA, 
  DEFAULT_TAX_DATA,
  DEFAULT_DUE_DATE_DATA,
  DEFAULT_BILLING_DATA,
  DEFAULT_DISCOUNT_DATA,
  DEFAULT_BULK_EDIT_DATA,
  DEFAULT_DEBOUNCE_MS,
  PAYMENT_METHODS,
  CARD_TYPES,
  BILLING_TYPES,
  RECURRENCE_FREQUENCIES,
  isCardPaymentMethod,
  isRecurringCardType,
  isRecurringBillingType
} from '../../constants';
import { 
  calculateDiscount, 
  calculateSubtotal,
  formatCurrencyDisplay,
  parseCurrencyInput
} from '../../utils';

// Hooks customizados
import { useServiceModal } from '../../hooks/useServiceModal';
import { useServiceFormData } from '../../hooks/useServiceFormData';
import { useDraftInputs } from '../../hooks/useDraftInputs';
import { useBulkEdit } from '../../hooks/useBulkEdit';

// Componentes extraídos
import { ServiceTable } from './ServiceTable';
import { EmptyServiceState } from './EmptyServiceState';
import { DiscountField } from './DiscountField';
import { DueDateConfig } from './DueDateConfig';
import { BillingConfig } from './BillingConfig';
import { ServiceTotalDisplay } from './ServiceTotalDisplay';

// Interface para props
interface ContractFormData {
  services?: SelectedService[];
  [key: string]: unknown;
}

interface ContractServicesProps {
  form: UseFormReturn<ContractFormData>;
  contractId?: string;
}

/**
 * Componente principal de gerenciamento de serviços do contrato
 * Versão refatorada com hooks e componentes extraídos
 */
export function ContractServices({ form, contractId }: ContractServicesProps) {
  // ========== CONTEXTO E REFS ==========
  const { pendingServiceChanges, setPendingServiceChanges } = useContractForm();
  const isInternalUpdate = useRef(false);
  const isEditingDueDateData = useRef(false);

  // ========== ESTADOS PRINCIPAIS ==========
  const [selectedServices, setSelectedServices] = React.useState<SelectedService[]>([]);
  const [showServiceModal, setShowServiceModal] = React.useState(false);
  
  // ========== HOOKS CUSTOMIZADOS ==========
  const serviceModal = useServiceModal();
  const formData = useServiceFormData();
  const draftInputs = useDraftInputs();
  const bulkEdit = useBulkEdit<SelectedService>();

  // ========== HOOKS EXTERNOS ==========
  const { services = [], isLoading } = useServices();

  // ========== ESTADOS DE IMPOSTOS (ainda necessário) ==========
  const [taxData, setTaxData] = React.useState<TaxData>(DEFAULT_TAX_DATA);

  // ========== OBSERVADORES DO FORMULÁRIO ==========
  const formServices = form.watch("services") || [];

  // ========== SERVIÇO ATUAL MEMOIZADO ==========
  const currentService = useMemo(() => 
    selectedServices.find(s => s.id === serviceModal.editingServiceId),
    [selectedServices, serviceModal.editingServiceId]
  );

  // ========== EFEITO: CARREGAR SERVIÇOS DO FORMULÁRIO ==========
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    if (formServices.length > 0) {
      const servicesWithTotal = formServices.map(service => ({
        ...service,
        cost_price: service.cost_price ?? 0,
        total: service.total || (service.quantity || 1) * (service.unit_price || service.default_price || 0)
      }));
      setSelectedServices(servicesWithTotal);
    } else {
      setSelectedServices([]);
    }
  }, [formServices]);

  // ========== EFEITO: SINCRONIZAR COM FORMULÁRIO ==========
  useEffect(() => {
    if (selectedServices.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      isInternalUpdate.current = true;
      
      const currentFormServices = form.getValues('services') || [];
      const mergedServices = selectedServices.map(selectedService => {
        const existingFormService = currentFormServices.find(fs => fs.id === selectedService.id);
        
        if (existingFormService) {
          return {
            ...selectedService,
            cost_price: selectedService.cost_price ?? existingFormService.cost_price,
            unit_price: selectedService.unit_price ?? existingFormService.unit_price,
            due_type: selectedService.due_type ?? existingFormService.due_type,
            due_value: selectedService.due_value ?? existingFormService.due_value,
            due_next_month: selectedService.due_next_month ?? existingFormService.due_next_month,
            payment_method: selectedService.payment_method || existingFormService.payment_method || "PIX",
            billing_type: selectedService.billing_type || existingFormService.billing_type || "Único",
            generate_billing: selectedService.generate_billing ?? existingFormService.generate_billing
          };
        }
        return selectedService;
      });
      
      form.setValue("services", mergedServices);
    }, DEFAULT_DEBOUNCE_MS);
    
    return () => clearTimeout(timeoutId);
  }, [selectedServices, form]);

  // ========== EFEITO: CARREGAR DADOS AO ABRIR MODAL ==========
  useEffect(() => {
    if (serviceModal.editingServiceId && serviceModal.isOpen && !serviceModal.isAlreadyLoaded(serviceModal.editingServiceId)) {
      if (currentService) {
        // Carregar dados nos hooks
        formData.loadFromService(currentService);
        draftInputs.loadFromService(currentService);
        
        // Carregar dados de impostos
        if (currentService.nbs_code || currentService.iss_rate || currentService.ir_rate) {
          setTaxData({
            nbs_code: currentService.nbs_code || '',
            deduction_value: currentService.deduction_value || 0,
            calculation_base: currentService.calculation_base || 0,
            iss_rate: currentService.iss_rate || 0,
            iss_deduct: currentService.iss_deduct || false,
            ir_rate: currentService.ir_rate || 0,
            ir_deduct: currentService.ir_deduct || false,
            csll_rate: currentService.csll_rate || 0,
            csll_deduct: currentService.csll_deduct || false,
            inss_rate: currentService.inss_rate || 0,
            inss_deduct: currentService.inss_deduct || false,
            pis_rate: currentService.pis_rate || 0,
            pis_deduct: currentService.pis_deduct || false,
            cofins_rate: currentService.cofins_rate || 0,
            cofins_deduct: currentService.cofins_deduct || false
          });
        }
        
        serviceModal.markAsLoaded(serviceModal.editingServiceId);
      }
    }
  }, [serviceModal.editingServiceId, serviceModal.isOpen, currentService]);

  // ========== HANDLERS ==========
  
  const handleAddServices = useCallback((selectedServiceItems: { id: string; name: string; description?: string; unit_price: number; default_price?: number; quantity?: number }[]) => {
    const newServices: SelectedService[] = selectedServiceItems.map(serviceItem => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      service_id: serviceItem.id,
      name: serviceItem.name,
      description: serviceItem.description,
      unit_price: serviceItem.default_price || 0,
      default_price: serviceItem.default_price || 0,
      quantity: serviceItem.quantity || 1,
      total: (serviceItem.default_price || 0) * (serviceItem.quantity || 1),
      payment_method: DEFAULT_FINANCIAL_DATA.payment_method,
      card_type: '',
      billing_type: DEFAULT_FINANCIAL_DATA.billing_type,
      recurrence_frequency: '',
      installments: 1,
      due_type: DEFAULT_DUE_DATE_DATA.due_type,
      due_value: DEFAULT_DUE_DATE_DATA.due_value,
      due_next_month: false,
      generate_billing: DEFAULT_BILLING_DATA.generate_billing,
      discount_percentage: 0,
      discount_amount: 0
    }));
    
    setSelectedServices(prev => [...prev, ...newServices]);
    setShowServiceModal(false);
    
    toast.success(`${newServices.length} serviço(s) adicionado(s) com sucesso!`, {
      description: `${newServices.map(s => s.name).join(', ')} foram adicionados ao contrato.`
    });
  }, []);

  const handleCreateService = useCallback(() => {
    toast.info('Funcionalidade de criar serviço em desenvolvimento');
  }, []);
  
  const handleRemoveService = useCallback((serviceId: string) => {
    // AIDEV-NOTE: Atualiza estado local
    setSelectedServices(prev => {
      const filtered = prev.filter(s => s.id !== serviceId);
      
      // AIDEV-NOTE: Atualiza formulário IMEDIATAMENTE para evitar problema ao trocar de aba
      // Se não atualizar aqui, o debounce do useEffect pode não completar antes da troca de aba
      isInternalUpdate.current = true;
      form.setValue('services', filtered);
      setTimeout(() => { isInternalUpdate.current = false; }, 100);
      
      return filtered;
    });
    bulkEdit.deselectItem(serviceId);
    toast.success('Serviço removido do contrato');
  }, [bulkEdit, form]);
  
  const handleEditService = useCallback((serviceId: string) => {
    serviceModal.open(serviceId);
  }, [serviceModal]);

  const handleSaveService = useCallback(async () => {
    try {
      const serviceIndex = selectedServices.findIndex(s => s.id === serviceModal.editingServiceId);
      if (serviceIndex === -1) {
        console.error('Serviço não encontrado para atualização');
        return;
      }
      
      const service = selectedServices[serviceIndex];
      
      // Validação
      if (isCardPaymentMethod(formData.financialData.payment_method) && !formData.financialData.card_type) {
        toast.error('Tipo de cartão é obrigatório para pagamento com cartão');
        return;
      }

      // Calcular total
      const unitPrice = draftInputs.getUnitPrice(service);
      const qty = draftInputs.getQuantity(service);
      const subtotal = calculateSubtotal(unitPrice, qty);
      
      let discount = 0;
      if (formData.discountData.discount_type === 'percentage') {
        discount = calculateDiscount(subtotal, 'percentage', formData.discountData.discount_percentage);
      } else {
        discount = calculateDiscount(subtotal, 'fixed', formData.discountData.discount_amount);
      }
      
      const finalTotal = Math.max(0, subtotal - discount);
      
      // Preparar alterações
      const serviceChanges: Partial<SelectedService> = {
        unit_price: unitPrice,
        quantity: qty,
        cost_price: draftInputs.getCostPrice(service) ?? 0,
        discount_percentage: formData.discountData.discount_type === 'percentage' ? formData.discountData.discount_percentage : 0,
        discount_amount: formData.discountData.discount_type === 'fixed' ? formData.discountData.discount_amount : 0,
        ...formData.financialData,
        ...formData.dueDateData,
        generate_billing: formData.billingData.generate_billing,
        ...taxData,
        total: finalTotal
      };

      // Salvar alterações pendentes
      setPendingServiceChanges(prev => ({
        ...prev,
        [serviceModal.editingServiceId]: {
          originalData: service,
          pendingChanges: serviceChanges,
          hasChanges: true,
          timestamp: Date.now()
        }
      }));
      
      // Atualizar estado local
      const updatedServices = [...selectedServices];
      updatedServices[serviceIndex] = {
        ...updatedServices[serviceIndex],
        ...serviceChanges
      };
      
      setSelectedServices(updatedServices);
      
      // Sincronizar com formulário
      isInternalUpdate.current = true;
      form.setValue("services", updatedServices);
      
      // Fechar modal e limpar estados
      serviceModal.close();
      draftInputs.reset();
      
      toast.success('Configurações salvas localmente. O resumo foi atualizado automaticamente.');
      
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  }, [selectedServices, serviceModal, formData, draftInputs, taxData, form, setPendingServiceChanges]);

  const handleBulkSave = useCallback(() => {
    const updatedServices = bulkEdit.applyChanges(selectedServices, s => s.id);
    setSelectedServices(updatedServices);
    bulkEdit.closeModal();
    bulkEdit.deselectAll();
    bulkEdit.resetBulkEditData();
    
    toast.success(`${bulkEdit.selectionCount} serviços atualizados com sucesso!`);
  }, [bulkEdit, selectedServices]);

  // ========== RENDER ==========
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Serviços do Contrato
          {bulkEdit.hasSelection && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {bulkEdit.selectionCount} selecionado{bulkEdit.selectionCount > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {bulkEdit.hasSelection && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={bulkEdit.openModal}
              className="gap-1 border border-border bg-card text-foreground hover:bg-accent transition-all duration-200"
            >
              <Calculator className="h-3.5 w-3.5" />
              Editar em Massa ({bulkEdit.selectionCount})
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
      
      {/* Lista de Serviços ou Estado Vazio */}
      {selectedServices.length === 0 ? (
        <EmptyServiceState onAddService={() => setShowServiceModal(true)} />
      ) : (
        <ServiceTable
          services={selectedServices}
          selectedIds={bulkEdit.selectedIds}
          onSelectService={bulkEdit.toggleItem}
          onSelectAll={() => bulkEdit.toggleAll(selectedServices)}
          onEditService={handleEditService}
          onRemoveService={handleRemoveService}
        />
      )}
      
      {/* Modal de Seleção de Serviços */}
      <ServiceSelection
        open={showServiceModal}
        onOpenChange={setShowServiceModal}
        onServiceSelect={handleAddServices}
        onCreateService={handleCreateService}
        services={services}
        isLoading={isLoading}
        selectedServiceIds={[]}
        singleSelect={false}
      />

      {/* Modal de Edição de Serviço */}
      <Dialog 
        key={`service-modal-${serviceModal.isOpen}-${serviceModal.editingServiceId}`}
        open={serviceModal.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            serviceModal.close();
            draftInputs.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Configuração do Serviço
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes, valores e forma de pagamento do serviço.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes do Serviço</TabsTrigger>
              <TabsTrigger value="financial">Configuração Financeira</TabsTrigger>
            </TabsList>
            
            {/* Aba Detalhes */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Detalhes do Serviço</h3>
                <p className="text-sm text-muted-foreground">Configure os detalhes específicos do serviço</p>
                
                {/* Valor e Quantidade */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Valor e Quantidade</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Valor Unitário */}
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice" className="text-sm font-medium">Valor Unitário</Label>
                      <IMaskInput
                        id="unitPrice"
                        mask={Number}
                        scale={2}
                        thousandsSeparator={'.'}
                        radix={','}
                        mapToRadix={['.']}
                        padFractionalZeros={true}
                        normalizeZeros={true}
                        prefix={'R$ '}
                        value={draftInputs.draftState.unitPrice.input || formatCurrencyDisplay(draftInputs.getUnitPrice(currentService))}
                        unmask={false}
                        onAccept={draftInputs.handleUnitPriceChange}
                        onBlur={draftInputs.handleUnitPriceBlur}
                        onFocus={() => draftInputs.handleUnitPriceFocus(currentService)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="R$ 1.500,00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor cobrado por unidade do serviço
                      </p>
                    </div>
                    
                    {/* Quantidade e Custo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium">Quantidade</Label>
                        <Input 
                          id="quantity"
                          type="text"
                          inputMode="numeric"
                          value={draftInputs.draftState.quantity.input || (currentService?.quantity || '')}
                          onChange={(e) => draftInputs.handleQuantityChange(e.target.value)}
                          onBlur={draftInputs.handleQuantityBlur}
                          onFocus={() => draftInputs.handleQuantityFocus(currentService)}
                          placeholder="Ex: 2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Quantidade de unidades do serviço
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="costPrice" className="text-sm font-medium">Custo Unitário</Label>
                        <IMaskInput
                          id="costPrice"
                          mask={Number}
                          scale={2}
                          thousandsSeparator={'.'}
                          radix={','}
                          mapToRadix={['.']}
                          padFractionalZeros={true}
                          normalizeZeros={true}
                          prefix={'R$ '}
                          value={draftInputs.draftState.costPrice.input || formatCurrencyDisplay(draftInputs.getCostPrice(currentService))}
                          unmask={false}
                          onAccept={draftInputs.handleCostPriceChange}
                          onBlur={draftInputs.handleCostPriceBlur}
                          onFocus={() => draftInputs.handleCostPriceFocus(currentService)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="R$ 800,00"
                        />
                        <p className="text-xs text-muted-foreground">
                          Custo interno do serviço (opcional)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Campo de Desconto */}
                  <DiscountField
                    discountData={formData.discountData}
                    onDiscountChange={(changes) => formData.setDiscountData(prev => ({ ...prev, ...changes }))}
                  />
                  
                  {/* Total Calculado */}
                  <ServiceTotalDisplay
                    unitPrice={draftInputs.getUnitPrice(currentService)}
                    quantity={draftInputs.getQuantity(currentService)}
                    discountData={formData.discountData}
                  />
                </div>
                
                {/* AIDEV-NOTE: Container unificado para vencimento e cobrança */}
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  {/* Configuração de Vencimento */}
                  <DueDateConfig
                    dueDateData={formData.dueDateData}
                    onDueDateChange={(changes) => formData.setDueDateData(prev => ({ ...prev, ...changes }))}
                    onEditStart={() => { isEditingDueDateData.current = true; }}
                    onEditEnd={() => { isEditingDueDateData.current = false; }}
                  />

                  {/* Separador */}
                  <div className="border-t border-border/50" />

                  {/* Configuração de Cobrança */}
                  <BillingConfig
                    billingData={formData.billingData}
                    onBillingChange={(changes) => formData.setBillingData(prev => ({ ...prev, ...changes }))}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Aba Financeira */}
            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configuração Financeira</h3>
                  <p className="text-sm text-muted-foreground">Configure o método de pagamento e faturamento</p>
                </div>
                
                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Método de Pagamento</Label>
                  <Select 
                    value={formData.financialData.payment_method || ""} 
                    onValueChange={(value) => {
                      const newData = { ...formData.financialData, payment_method: value };
                      if (!isCardPaymentMethod(value)) {
                        newData.card_type = '';
                        newData.billing_type = 'Único';
                        newData.recurrence_frequency = '';
                        newData.installments = 1;
                      }
                      formData.setFinancialData(newData);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Tipo de Cartão */}
                {isCardPaymentMethod(formData.financialData.payment_method) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Cartão</Label>
                    <Select 
                      value={formData.financialData.card_type || ""} 
                      onValueChange={(value) => {
                        const newData = { ...formData.financialData, card_type: value };
                        if (isRecurringCardType(value)) {
                          newData.billing_type = 'Mensal';
                          newData.recurrence_frequency = 'Mensal';
                          newData.installments = 1;
                        } else if (value === 'credit') {
                          newData.billing_type = 'Único';
                          newData.recurrence_frequency = '';
                          newData.installments = newData.installments || 2;
                        }
                        formData.setFinancialData(newData);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_TYPES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Tipo de Faturamento */}
                {formData.financialData.payment_method && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Faturamento</Label>
                    <Select 
                      value={formData.financialData.billing_type || ""} 
                      onValueChange={(value) => {
                        const newData = { ...formData.financialData, billing_type: value };
                        if (formData.financialData.payment_method === 'Boleto Bancário' && isRecurringBillingType(value)) {
                          newData.recurrence_frequency = value;
                        }
                        formData.setFinancialData(newData);
                      }}
                      disabled={isCardPaymentMethod(formData.financialData.payment_method) && 
                               (isRecurringCardType(formData.financialData.card_type) || formData.financialData.card_type === 'credit')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TYPES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Frequência de Recorrência */}
                {formData.financialData.payment_method && 
                 isRecurringBillingType(formData.financialData.billing_type) && 
                 !isRecurringCardType(formData.financialData.card_type) &&
                 formData.financialData.card_type !== 'credit' &&
                 formData.financialData.payment_method !== 'Boleto Bancário' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequência de Cobrança</Label>
                    <Select 
                      value={formData.financialData.recurrence_frequency || ""} 
                      onValueChange={(value) => formData.setFinancialData(prev => ({ ...prev, recurrence_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_FREQUENCIES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Número de Parcelas */}
                {((isCardPaymentMethod(formData.financialData.payment_method) && formData.financialData.card_type === 'credit') || 
                  (formData.financialData.payment_method === 'Boleto Bancário' && formData.financialData.billing_type === 'Único') ||
                  (formData.financialData.payment_method && 
                   !isCardPaymentMethod(formData.financialData.payment_method) && 
                   formData.financialData.payment_method !== 'Boleto Bancário' && 
                   formData.financialData.billing_type && 
                   formData.financialData.billing_type !== "Único")) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Número de Parcelas</Label>
                    <Input 
                      type="number" 
                      value={formData.financialData.installments || ""} 
                      onChange={(e) => {
                        const value = e.target.value === "" ? 1 : parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          formData.setFinancialData(prev => ({ ...prev, installments: value }));
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                serviceModal.close();
                draftInputs.reset();
              }}
              className="border-border/50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveService}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição em Massa - TODO: Implementar usando BulkEditModal extraído */}
      {/* Por ora, mantemos a implementação básica */}
      <Dialog open={bulkEdit.isModalOpen} onOpenChange={bulkEdit.closeModal}>
        <DialogContent className="sm:max-w-2xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Edição em Massa - {bulkEdit.selectionCount} Serviço{bulkEdit.selectionCount > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Configure as alterações que serão aplicadas aos serviços selecionados.
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

            <TabsContent value="financial" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Configurações financeiras em massa serão aplicadas aos serviços selecionados.
              </p>
            </TabsContent>

            <TabsContent value="price" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Novo Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bulkEdit.bulkEditData.unit_price || ''}
                  onChange={(e) => bulkEdit.setBulkEditData(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="Ex: 100.00"
                />
              </div>
            </TabsContent>

            <TabsContent value="due-date" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Configurações de vencimento serão aplicadas em massa.
              </p>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Configurações de faturamento serão aplicadas em massa.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={bulkEdit.closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleBulkSave} className="bg-primary hover:bg-primary/90">
              Aplicar Alterações ({bulkEdit.selectionCount} serviço{bulkEdit.selectionCount > 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContractServices;

