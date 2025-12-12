/**
 * AIDEV-NOTE: Modal para criar faturamento avulso
 * Componente refatorado usando estrutura modular
 * Steps: cliente, produtos/serviços, pagamento, revisão
 */

import { useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Package, CreditCard, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useStandaloneBilling } from '@/hooks/useStandaloneBilling';
import type { CreateStandaloneBillingData } from '@/services/standaloneBillingService';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { useSecureProducts } from '@/hooks/useSecureProducts';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { useToast } from '@/components/ui/use-toast';
import { prepareBillingData } from '@/utils/billing/standalone/billingItemHelpers';
import type { StepConfig } from '@/types/billing/standalone';

// AIDEV-NOTE: Hooks e componentes refatorados
import { useStandaloneBillingForm } from '@/hooks/billing/useStandaloneBillingForm';
import { useCurrencyFormatting } from '@/hooks/billing/useStandaloneBillingForm';
import { StepIndicator } from './standalone/shared/StepIndicator';
import { CustomerStep } from './standalone/steps/CustomerStep';
import { ItemsStep } from './standalone/steps/ItemsStep';
import { PaymentStep } from './standalone/steps/PaymentStep';
import { ReviewStep } from './standalone/steps/ReviewStep';

interface CreateStandaloneBillingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateStandaloneBillingDialog({
  isOpen,
  onClose,
  onSuccess
}: CreateStandaloneBillingDialogProps) {
  const { toast } = useToast();
  const { create, isCreating } = useStandaloneBilling();
  const { customers } = useCustomers({ limit: 100 });
  const { products } = useSecureProducts({ limit: 100 });
  const { locations } = useStorageLocations({ is_active: true });
  const { formatCurrencyInput, parseCurrencyInput } = useCurrencyFormatting();

  // AIDEV-NOTE: Hook principal do formulário
  const form = useStandaloneBillingForm({
    products: products || [],
    onClose,
  });

  // AIDEV-NOTE: Cliente selecionado
  const selectedCustomer = useMemo(() => {
    return form.selectedCustomerOverride || customers.find((c: Customer) => c.id === form.selectedCustomerId) || null;
  }, [customers, form.selectedCustomerId, form.selectedCustomerOverride]);

  // AIDEV-NOTE: Configuração dos steps
  const steps: StepConfig[] = [
    { key: 'customer', label: 'Cliente', icon: <User className="h-4 w-4" /> },
    { key: 'items', label: 'Itens', icon: <Package className="h-4 w-4" /> },
    { key: 'payment', label: 'Pagamento', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'review', label: 'Revisão', icon: <CheckCircle className="h-4 w-4" /> },
  ];

  // AIDEV-NOTE: Handler para fechar modal
  const handleClose = useCallback(() => {
    form.resetForm();
    onClose();
  }, [form, onClose]);

  // AIDEV-NOTE: Handler para mudança de abertura do Dialog
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  // AIDEV-NOTE: Handler para seleção de cliente
  const handleClientSelect = useCallback((client: any) => {
    form.setSelectedCustomerId(client.id as string);
    form.setSelectedCustomerOverride(client as Customer);
    form.setShowClientSearch(false);
  }, [form]);

  // AIDEV-NOTE: Handler para criação de cliente
  const handleClientCreated = useCallback((clientData: { id: string; name: string; document: string; email?: string; phone?: string }) => {
    form.setSelectedCustomerId(clientData.id);
    // AIDEV-NOTE: Converter para Customer com campos mínimos necessários
    form.setSelectedCustomerOverride({
      ...clientData,
      tenant_id: '', // Será preenchido pelo sistema
      active: true,
    } as Customer);
    form.setShowCreateClient(false);
  }, [form]);

  // AIDEV-NOTE: Handler para atualizar item com formatação de preço
  const handleUpdateItem = useCallback((itemId: string, updates: Partial<any>) => {
    form.billingItems.updateItem(itemId, updates);
  }, [form.billingItems]);

  // AIDEV-NOTE: Handler para mudança de input de preço
  const handlePriceInputChange = useCallback((itemId: string, value: string) => {
    form.billingItems.setPriceInputValue(itemId, value);
    const numeric = parseCurrencyInput(value);
    form.billingItems.updateItem(itemId, { unit_price: numeric });
  }, [form.billingItems, parseCurrencyInput]);

  // AIDEV-NOTE: Handler para foco no input de preço
  const handlePriceInputFocus = useCallback((itemId: string) => {
    const item = form.billingItems.items.find(i => i.id === itemId);
    if (item && form.billingItems.priceInputValues[itemId] === undefined && item.unit_price > 0) {
      form.billingItems.setPriceInputValue(itemId, formatCurrencyInput(item.unit_price));
    }
  }, [form.billingItems, formatCurrencyInput]);

  // AIDEV-NOTE: Handler para blur no input de preço
  const handlePriceInputBlur = useCallback((itemId: string, value: string) => {
    const numeric = parseCurrencyInput(value);
    if (numeric > 0) {
      form.billingItems.setPriceInputValue(itemId, formatCurrencyInput(numeric));
    } else {
      form.billingItems.removePriceInputValue(itemId);
    }
  }, [form.billingItems, parseCurrencyInput, formatCurrencyInput]);

  // AIDEV-NOTE: Handler para mudança de input de desconto
  const handleDiscountInputChange = useCallback((itemId: string, value: string) => {
    form.billingItems.setDiscountInputValue(itemId, value);
  }, [form.billingItems]);

  // AIDEV-NOTE: Handler para foco no input de desconto
  const handleDiscountInputFocus = useCallback((itemId: string) => {
    const item = form.billingItems.items.find(i => i.id === itemId);
    if (item && form.billingItems.discountInputValues[itemId] === undefined) {
      if (item.discount_percent && item.discount_percent > 0) {
        form.billingItems.setDiscountInputValue(itemId, `${item.discount_percent}%`);
      } else if (item.discount_amount && item.discount_amount > 0) {
        form.billingItems.setDiscountInputValue(itemId, formatCurrencyInput(item.discount_amount));
      }
    }
  }, [form.billingItems, formatCurrencyInput]);

  // AIDEV-NOTE: Handler para blur no input de desconto
  const handleDiscountInputBlur = useCallback((itemId: string, value: string) => {
    const item = form.billingItems.items.find(i => i.id === itemId);
    if (!item) return;

    // AIDEV-NOTE: Se o valor termina com %, é percentual
    if (value.trim().endsWith('%')) {
      const percent = parseFloat(value.replace('%', '').replace(',', '.')) || 0;
      if (percent > 0) {
        form.billingItems.setDiscountInputValue(itemId, `${percent}%`);
      } else {
        form.billingItems.removeDiscountInputValue(itemId);
      }
    } else {
      // AIDEV-NOTE: É valor fixo
      const numeric = parseCurrencyInput(value);
      if (numeric > 0) {
        form.billingItems.setDiscountInputValue(itemId, formatCurrencyInput(numeric));
      } else {
        form.billingItems.removeDiscountInputValue(itemId);
      }
    }
  }, [form.billingItems, parseCurrencyInput, formatCurrencyInput]);

  // AIDEV-NOTE: Submeter formulário
  const handleSubmit = useCallback(async () => {
    if (!form.validateCurrentStep()) {
      return;
    }

    try {
      const billingData = prepareBillingData(
        form.billingItems.items,
        form.selectedCustomerId,
        form.billDate,
        form.dueDate,
        form.paymentMethod,
        form.description
      );

      // AIDEV-NOTE: tenant_id será preenchido pelo hook useStandaloneBilling
      await create({ ...billingData, tenant_id: '' } as CreateStandaloneBillingData);
      form.resetForm();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar faturamento',
        description: message,
        variant: 'destructive',
      });
    }
  }, [form, create, onSuccess, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Faturamento Avulso
          </DialogTitle>
        </div>

        {/* Steps Indicator */}
        <StepIndicator currentStep={form.currentStep} steps={steps} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {form.currentStep === 'customer' && (
              <CustomerStep
                selectedCustomer={selectedCustomer}
                showClientSearch={form.showClientSearch}
                showCreateClient={form.showCreateClient}
                onShowClientSearch={form.setShowClientSearch}
                onShowCreateClient={form.setShowCreateClient}
                onClientSelect={handleClientSelect}
                onClientCreated={handleClientCreated}
                error={form.errors.customer}
              />
            )}

            {form.currentStep === 'items' && (
              <ItemsStep
                items={form.billingItems.items}
                products={products || []}
                locations={locations || []}
                priceInputValues={form.billingItems.priceInputValues}
                discountInputValues={form.billingItems.discountInputValues}
                showAddItemChooser={form.showAddItemChooser}
                totalAmount={form.billingItems.totalAmount}
                onShowAddItemChooser={form.setShowAddItemChooser}
                onAddItem={form.billingItems.addItem}
                onRemoveItem={form.billingItems.removeItem}
                onUpdateItem={handleUpdateItem}
                onPriceInputChange={handlePriceInputChange}
                onPriceInputFocus={handlePriceInputFocus}
                onPriceInputBlur={handlePriceInputBlur}
                onDiscountInputChange={handleDiscountInputChange}
                onDiscountInputFocus={handleDiscountInputFocus}
                onDiscountInputBlur={handleDiscountInputBlur}
                errors={form.errors}
              />
            )}

            {form.currentStep === 'payment' && (
              <PaymentStep
                billDate={form.billDate}
                items={form.billingItems.items}
                assocOpen={form.paymentAssociation.assocOpen}
                onBillDateChange={form.setBillDate}
                onToggleAssociation={form.paymentAssociation.toggleAssociation}
                onUpdateItem={handleUpdateItem}
                errors={form.errors}
              />
            )}

            {form.currentStep === 'review' && (
              <ReviewStep
                selectedCustomer={selectedCustomer}
                items={form.billingItems.items}
                billDate={form.billDate}
                dueDate={form.dueDate}
                paymentMethod={form.paymentMethod}
                totalAmount={form.billingItems.totalAmount}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={form.currentStep === 'customer' ? handleClose : form.goToPreviousStep}
            disabled={isCreating}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {form.currentStep === 'customer' ? 'Cancelar' : 'Anterior'}
          </Button>

          <div className="flex gap-2">
            {form.currentStep !== 'review' ? (
              <Button
                type="button"
                onClick={form.goToNextStep}
                disabled={isCreating}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isCreating}
              >
                {isCreating ? 'Criando...' : 'Criar Faturamento'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
