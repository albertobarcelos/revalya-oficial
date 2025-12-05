/**
 * AIDEV-NOTE: Modal para criar faturamento avulso
 * Componente com steps: cliente, produtos/serviços, pagamento, revisão
 */

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, User, Package, CreditCard, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStandaloneBilling, type CreateStandaloneBillingData } from '@/hooks/useStandaloneBilling';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { ProductSearchInput } from '@/components/products/ProductSearchInput';
import { ServiceSearchInput } from '@/components/services/ServiceSearchInput';
import { useSecureProducts, type Product } from '@/hooks/useSecureProducts';
import { useServices, type Service } from '@/hooks/useServices';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { DatePicker } from '@/components/ui/date-picker';
import { format, addDays } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ClientSearch } from '@/components/contracts/parts/ClientSearch';
import { ClientCreation } from '@/components/contracts/parts/ClientCreation';

interface CreateStandaloneBillingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BillingItem {
  id: string;
  product_id?: string;
  service_id?: string;
  quantity: number;
  unit_price: number;
  storage_location_id?: string;
  description?: string;
  product?: Product;
  service?: Service;
  kind?: 'product' | 'service';
  payment_method?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'CASH';
  item_due_date?: Date;
  card_type?: 'credit' | 'credit_recurring';
  billing_type?: 'Único' | 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  recurrence_frequency?: string;
  installments?: number;
}

type Step = 'customer' | 'items' | 'payment' | 'review';

export function CreateStandaloneBillingDialog({
  isOpen,
  onClose,
  onSuccess
}: CreateStandaloneBillingDialogProps) {
  const { toast } = useToast();
  // AIDEV-NOTE: Hooks sempre executam, mas queries internas podem ser condicionais
  const { create, isCreating } = useStandaloneBilling();
  const { customers } = useCustomers({ limit: 100 });
  const { products } = useSecureProducts({ limit: 100 });
  const { services } = useServices({});
  const { locations } = useStorageLocations({ is_active: true });

  const [currentStep, setCurrentStep] = useState<Step>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 7));
  const [paymentMethod, setPaymentMethod] = useState<string>('BOLETO');
  const [description, setDescription] = useState<string>('');
  const [items, setItems] = useState<BillingItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [selectedCustomerOverride, setSelectedCustomerOverride] = useState<Customer | null>(null);
  const [showAddItemChooser, setShowAddItemChooser] = useState(false);
  const [assocOpen, setAssocOpen] = useState<Record<string, boolean>>({});

  // AIDEV-NOTE: Cliente selecionado
  const selectedCustomer = useMemo(() => {
    return selectedCustomerOverride || customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId, selectedCustomerOverride]);

  // AIDEV-NOTE: Calcular total
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [items]);

  // AIDEV-NOTE: Resetar formulário ao fechar
  const handleClose = useCallback(() => {
    setCurrentStep('customer');
    setSelectedCustomerId('');
    setBillDate(new Date());
    setDueDate(addDays(new Date(), 7));
    setPaymentMethod('BOLETO');
    setDescription('');
    setItems([]);
    setErrors({});
    onClose();
  }, [onClose]);

  // AIDEV-NOTE: Handler para onOpenChange do Dialog (Radix UI)
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  // AIDEV-NOTE: Adicionar item
  const handleAddItem = useCallback((kind: 'product' | 'service') => {
    setItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      quantity: 1,
      unit_price: 0,
      kind
    }]);
  }, []);

  // AIDEV-NOTE: Remover item
  const handleRemoveItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // AIDEV-NOTE: Atualizar item
  const handleUpdateItem = useCallback((itemId: string, updates: Partial<BillingItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    }));
  }, []);

  // AIDEV-NOTE: Validar step atual
  const validateStep = useCallback((step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'customer') {
      if (!selectedCustomerId) {
        newErrors.customer = 'Cliente é obrigatório';
      }
    }

    if (step === 'items') {
      if (items.length === 0) {
        newErrors.items = 'Adicione pelo menos um item (produto ou serviço)';
      }
      items.forEach((item, index) => {
        if (!item.product_id && !item.service_id) {
          newErrors[`item_${index}_type`] = 'Selecione um produto ou serviço';
        }
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = 'Quantidade deve ser maior que zero';
        }
        if (item.unit_price < 0) {
          newErrors[`item_${index}_price`] = 'Preço deve ser maior ou igual a zero';
        }
        // Validar estoque para produtos
        if (item.product_id && item.storage_location_id) {
          const product = products.find(p => p.id === item.product_id);
          // Validação de estoque será feita no backend
        }
      });
    }

    if (step === 'payment') {
      if (!billDate) {
        newErrors.billDate = 'Data de faturamento é obrigatória';
      }
      // Validação leve opcional por item quando associação aberta
      items.forEach((item, index) => {
        if (assocOpen[item.id]) {
          if (!item.payment_method) {
            newErrors[`item_${index}_payment_method`] = 'Meio de pagamento é obrigatório';
          }
          if (!item.item_due_date) {
            newErrors[`item_${index}_due_date`] = 'Data de vencimento do item é obrigatória';
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedCustomerId, items, billDate, dueDate, paymentMethod, products]);

  // AIDEV-NOTE: Navegar para próximo step
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      return;
    }

    const steps: Step[] = ['customer', 'items', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep, validateStep]);

  // AIDEV-NOTE: Navegar para step anterior
  const handlePrevious = useCallback(() => {
    const steps: Step[] = ['customer', 'items', 'payment', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  // AIDEV-NOTE: Submeter formulário
  // Objetivo: garantir que os valores escolhidos no modal (por item)
  // sejam refletidos no período avulso. Se o usuário não associar
  // pagamento por item, usa-se os valores globais.
  const handleSubmit = useCallback(async () => {
    if (!validateStep('review')) {
      return;
    }

    try {
      // AIDEV-NOTE: Derivar método de pagamento efetivo a partir dos itens
      const derivedPaymentMethod = (items.find(i => i.payment_method)?.payment_method || paymentMethod) as string;
      // AIDEV-NOTE: Derivar vencimento efetivo a partir dos itens
      const derivedDueDate = (items.find(i => i.item_due_date)?.item_due_date || dueDate) as Date;

      const billingData: CreateStandaloneBillingData = {
        tenant_id: '', // Será preenchido pelo hook
        customer_id: selectedCustomerId,
        contract_id: null, // Opcional: pode buscar contrato do cliente depois
        bill_date: format(billDate, 'yyyy-MM-dd'),
        due_date: format(derivedDueDate, 'yyyy-MM-dd'),
        payment_method: derivedPaymentMethod,
        description: description || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          storage_location_id: item.storage_location_id,
          description: item.description
        }))
      };

      await create(billingData);
      handleClose();
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar faturamento',
        description: message,
        variant: 'destructive',
      });
    }
  }, [selectedCustomerId, billDate, dueDate, paymentMethod, description, items, validateStep, create, handleClose, onSuccess, toast]);

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'customer', label: 'Cliente', icon: <User className="h-4 w-4" /> },
    { key: 'items', label: 'Itens', icon: <Package className="h-4 w-4" /> },
    { key: 'payment', label: 'Pagamento', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'review', label: 'Revisão', icon: <CheckCircle className="h-4 w-4" /> },
  ];

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
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.key;
              const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2
                      ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : ''}
                      ${isCompleted ? 'border-green-600 bg-green-50 text-green-600' : ''}
                      ${!isActive && !isCompleted ? 'border-gray-300 bg-white text-gray-400' : ''}
                    `}>
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.icon}
                    </div>
                    <span className={`
                      ml-2 text-sm font-medium
                      ${isActive ? 'text-blue-600' : ''}
                      ${isCompleted ? 'text-green-600' : ''}
                      ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                    `}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-4
                      ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {currentStep === 'customer' && (
              <motion.div
                key="customer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente *</Label>
                  <Input
                    id="customer"
                    readOnly
                    value={selectedCustomer ? selectedCustomer.name : ''}
                    placeholder="Selecione um cliente"
                    onClick={() => setShowClientSearch(true)}
                    className="cursor-pointer"
                  />
                  {errors.customer && (
                    <p className="text-sm text-red-500">{errors.customer}</p>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    {selectedCustomer.company && (
                      <p className="text-sm text-gray-600">{selectedCustomer.company}</p>
                    )}
                    {selectedCustomer.email && (
                      <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                    )}
                  </div>
                )}

                <ClientSearch
                  open={showClientSearch}
                  onOpenChange={setShowClientSearch}
                  clients={[]}
                  onClientSelect={(client) => {
                    setSelectedCustomerId(client.id as string);
                    setSelectedCustomerOverride(client as Customer);
                    setShowClientSearch(false);
                  }}
                  onCreateClient={() => {
                    setShowClientSearch(false);
                    setShowCreateClient(true);
                  }}
                />

                <ClientCreation
                  open={showCreateClient}
                  onOpenChange={setShowCreateClient}
                  onClientCreated={(clientData) => {
                    setSelectedCustomerId(clientData.id);
                    setSelectedCustomerOverride(clientData);
                    setShowCreateClient(false);
                  }}
                />
              </motion.div>
            )}

            {currentStep === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Label>Produtos/Serviços *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddItemChooser(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {errors.items && (
                  <p className="text-sm text-red-500">{errors.items}</p>
                )}

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {item.kind === 'product' && (
                          <div className="space-y-2">
                            <Label>Produto</Label>
                            <ProductSearchInput
                              value={item.product_id}
                              onValueChange={(productId, product) => {
                                handleUpdateItem(item.id, {
                                  product_id: productId || undefined,
                                  product,
                                  service_id: undefined,
                                  service: undefined,
                                  unit_price: product?.unit_price ?? 0
                                });
                              }}
                              placeholder="Buscar produto..."
                            />
                          </div>
                        )}

                        {item.kind === 'service' && (
                          <div className="space-y-2">
                            <Label>Serviço</Label>
                            <ServiceSearchInput
                              value={item.service_id}
                              onValueChange={(serviceId, service) => {
                                handleUpdateItem(item.id, {
                                  service_id: serviceId || undefined,
                                  service: service || undefined,
                                  product_id: undefined,
                                  product: undefined,
                                  unit_price: (service?.default_price ?? service?.price ?? 0)
                                });
                              }}
                              placeholder="Buscar serviço..."
                            />
                          </div>
                        )}
                      </div>

                      {item.product_id && (
                        <div className="space-y-2">
                          <Label>Local de Estoque</Label>
                          <Select
                            value={item.storage_location_id || ''}
                            onValueChange={(locationId) => {
                              handleUpdateItem(item.id, { storage_location_id: locationId || undefined });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um local" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map(location => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Quantidade *</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 });
                            }}
                          />
                          {errors[`item_${index}_quantity`] && (
                            <p className="text-xs text-red-500">{errors[`item_${index}_quantity`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Preço Unitário *</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatCurrency(item.unit_price || 0)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const clean = raw.replace(/[^\d,.-]/g, '');
                              let numeric = 0;
                              if (clean.includes(',')) {
                                const parts = clean.split(',');
                                const integerPart = parts[0].replace(/\./g, '');
                                const decimalPart = (parts[1] || '').replace(/[^\d]/g, '').slice(0, 2);
                                numeric = parseFloat(`${integerPart}.${decimalPart}`) || 0;
                              } else {
                                numeric = parseFloat(clean.replace(/\./g, '')) || 0;
                              }
                              handleUpdateItem(item.id, { unit_price: numeric });
                            }}
                          />
                          {errors[`item_${index}_price`] && (
                            <p className="text-xs text-red-500">{errors[`item_${index}_price`]}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Total</Label>
                          <Input
                            type="text"
                            value={formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total:</span>
                      <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label>Data de Faturamento *</Label>
                  <DatePicker
                    date={billDate}
                    setDate={(date) => {
                      setBillDate(date);
                    }}
                  />
                  {errors.billDate && (
                    <p className="text-sm text-red-500">{errors.billDate}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
                  ) : (
                    items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{item.product?.name || item.service?.name || 'Item'}</span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssocOpen(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                              if (!assocOpen[item.id]) {
                                handleUpdateItem(item.id, { billing_type: 'Único' })
                              }
                            }}
                          >
                            Associar Pagamento
                          </Button>
                        </div>

                        {assocOpen[item.id] && (
                          <>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Descrição</Label>
                              <Textarea
                                value={item.description || ''}
                                onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                                rows={1}
                                placeholder="Descrição do pagamento do item"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Meio de Pagamento</Label>
                              <Select
                                value={item.payment_method || ''}
                                onValueChange={(val) => {
                                  const pm = val as BillingItem['payment_method'];
                                  const updates: Partial<BillingItem> = { payment_method: pm, billing_type: 'Único' };
                                  if (pm !== 'CREDIT_CARD') {
                                    updates.card_type = undefined;
                                    updates.recurrence_frequency = undefined;
                                    updates.installments = undefined;
                                  } else {
                                    if (!item.card_type) {
                                      updates.card_type = 'credit';
                                    }
                                  }
                                  handleUpdateItem(item.id, updates);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                  <SelectItem value="PIX">PIX</SelectItem>
                                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                                  <SelectItem value="CASH">Dinheiro</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors[`item_${index}_payment_method`] && (
                                <p className="text-xs text-red-500">{errors[`item_${index}_payment_method`]}</p>
                              )}

                              {item.payment_method === 'CREDIT_CARD' && (
                                <div className="space-y-2">
                                  <Label>Tipo de Cartão</Label>
                                  <Select
                                    value={item.card_type || ''}
                                    onValueChange={(val) => {
                                      const ct = val as BillingItem['card_type'];
                                      const updates: Partial<BillingItem> = { card_type: ct };
                                      if (ct === 'credit_recurring') {
                                        updates.billing_type = 'Mensal';
                                        updates.recurrence_frequency = 'Mensal';
                                        updates.installments = 1;
                                      } else if (ct === 'credit') {
                                        updates.billing_type = 'Único';
                                        updates.recurrence_frequency = '';
                                        updates.installments = (item.installments && item.installments > 0) ? item.installments : 2;
                                      }
                                      handleUpdateItem(item.id, updates);
                                    }}
                                  >
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
                              <div className="space-y-2">
                                <Label>Tipo de Faturamento</Label>
                                <Select
                                  value={item.billing_type || ''}
                                  onValueChange={(val) => {
                                    const bt = val as BillingItem['billing_type'];
                                    const updates: Partial<BillingItem> = { billing_type: bt };
                                    if (item.payment_method === 'BOLETO' && ['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(bt)) {
                                      updates.recurrence_frequency = bt;
                                    } else if (['Mensal', 'Trimestral', 'Semestral', 'Anual'].includes(bt)) {
                                      updates.recurrence_frequency = undefined;
                                    } else if (bt === 'Único') {
                                      updates.recurrence_frequency = '';
                                    }
                                    handleUpdateItem(item.id, updates);
                                  }}
                                  disabled={item.payment_method === 'CREDIT_CARD'}
                                >
                                  <SelectTrigger className={item.payment_method === 'CREDIT_CARD' ? 'opacity-50' : ''}>
                                    <SelectValue placeholder={
                                      item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit_recurring'
                                        ? 'Recorrente (Mensal) - Automático'
                                        : item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit'
                                          ? 'Único - Automático'
                                          : 'Selecione'
                                    } />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Único">Único</SelectItem>
                                    <SelectItem value="Mensal">Mensal</SelectItem>
                                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                                    <SelectItem value="Semestral">Semestral</SelectItem>
                                    <SelectItem value="Anual">Anual</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Data de Vencimento</Label>
                              <DatePicker
                                date={item.item_due_date || undefined}
                                setDate={(date) => {
                                  handleUpdateItem(item.id, { item_due_date: date });
                                }}
                                minDate={billDate}
                              />
                              {errors[`item_${index}_due_date`] && (
                                <p className="text-xs text-red-500">{errors[`item_${index}_due_date`]}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-3">

                            {(item.payment_method &&
                              (item.billing_type === 'Mensal' || item.billing_type === 'Trimestral' || item.billing_type === 'Semestral' || item.billing_type === 'Anual') &&
                              item.card_type !== 'credit_recurring' &&
                              !(item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit') &&
                              item.payment_method !== 'BOLETO') ? (
                              <div className="space-y-2">
                                <Label>Frequência de Cobrança</Label>
                                <Select
                                  value={item.recurrence_frequency || ''}
                                  onValueChange={(val) => handleUpdateItem(item.id, { recurrence_frequency: val })}
                                >
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
                            ) : null}

                            {((item.payment_method === 'CREDIT_CARD' && item.card_type === 'credit') ||
                              (item.payment_method === 'BOLETO' && item.billing_type === 'Único') ||
                              (item.payment_method &&
                                item.payment_method !== 'CREDIT_CARD' &&
                                item.payment_method !== 'BOLETO' &&
                                item.billing_type &&
                                item.billing_type !== 'Único')) ? (
                              <div className="space-y-2">
                                <Label>Número de Parcelas</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={12}
                                  value={item.installments || ''}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, {
                                      installments: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="Ex: 3"
                                />
                              </div>
                            ) : null}
                          </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Cliente</h3>
                    <p>{selectedCustomer?.name}</p>
                    {selectedCustomer?.company && (
                      <p className="text-sm text-gray-600">{selectedCustomer.company}</p>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Itens</h3>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {index + 1}. {item.product?.name || item.service?.name || 'Item sem nome'}
                            {' '}({item.quantity}x {formatCurrency(item.unit_price)})
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Pagamento</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Data de Faturamento:</span> {format(billDate, 'dd/MM/yyyy')}</p>
                      {items.map((item, index) => {
                        const methodLabels: Record<string, string> = {
                          CREDIT_CARD: 'Cartão de Crédito',
                          PIX: 'PIX',
                          BOLETO: 'Boleto Bancário',
                          CASH: 'Dinheiro'
                        };
                        const cardLabels: Record<string, string> = {
                          credit: 'Crédito',
                          credit_recurring: 'Crédito Recorrente'
                        } as const;
                        const itemName = item.product?.name || item.service?.name || `Item ${index + 1}`;
                        const methodKey = item.payment_method ?? (paymentMethod as string);
                        const due = item.item_due_date || dueDate;
                        const installments = item.installments;
                        const billing = item.billing_type || 'Único';
                        const frequency = item.recurrence_frequency || '';
                        return (
                          <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                            <p className="font-medium">{itemName}</p>
                            <p><span className="font-medium">Método:</span> {methodKey ? (methodLabels[methodKey] ?? String(methodKey)) : '—'}</p>
                            {item.payment_method === 'CREDIT_CARD' && (
                              <p><span className="font-medium">Tipo de Cartão:</span> {item.card_type ? cardLabels[item.card_type] || item.card_type : '—'}</p>
                            )}
                            <p><span className="font-medium">Tipo de Faturamento:</span> {billing}</p>
                            {frequency && (
                              <p><span className="font-medium">Frequência:</span> {frequency}</p>
                            )}
                            {installments && installments > 0 && (
                              <p><span className="font-medium">Parcelas:</span> {installments}x</p>
                            )}
                            <p><span className="font-medium">Vencimento:</span> {due ? format(due, 'dd/MM/yyyy') : '—'}</p>
                            {item.description && (
                              <p><span className="font-medium">Descrição:</span> {item.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 'customer' ? handleClose : handlePrevious}
            disabled={isCreating}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 'customer' ? 'Cancelar' : 'Anterior'}
          </Button>

          <div className="flex gap-2">
            {currentStep !== 'review' ? (
              <Button
                type="button"
                onClick={handleNext}
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
        <Dialog open={showAddItemChooser} onOpenChange={setShowAddItemChooser}>
          <DialogContent className="max-w-md">
            <DialogTitle>Adicionar Item</DialogTitle>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button variant="outline" onClick={() => { handleAddItem('product'); setShowAddItemChooser(false); }}>
                Produto
              </Button>
              <Button variant="outline" onClick={() => { handleAddItem('service'); setShowAddItemChooser(false); }}>
                Serviço
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

