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
import { useCustomers } from '@/hooks/useCustomers';
import { ProductSearchInput } from '@/components/products/ProductSearchInput';
import { useSecureProducts, type Product } from '@/hooks/useSecureProducts';
import { useServices, type Service } from '@/hooks/useServices';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { DatePicker } from '@/components/ui/date-picker';
import { format, addDays } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

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

  // AIDEV-NOTE: Cliente selecionado
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

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
  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      quantity: 1,
      unit_price: 0
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
      if (!dueDate) {
        newErrors.dueDate = 'Data de vencimento é obrigatória';
      }
      if (dueDate < billDate) {
        newErrors.dueDate = 'Data de vencimento deve ser posterior à data de faturamento';
      }
      if (!paymentMethod) {
        newErrors.paymentMethod = 'Método de pagamento é obrigatório';
      }
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
  const handleSubmit = useCallback(async () => {
    if (!validateStep('review')) {
      return;
    }

    try {
      const billingData: CreateStandaloneBillingData = {
        tenant_id: '', // Será preenchido pelo hook
        customer_id: selectedCustomerId,
        contract_id: null, // Opcional: pode buscar contrato do cliente depois
        bill_date: format(billDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        payment_method: paymentMethod,
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
    } catch (error: any) {
      toast({
        title: 'Erro ao criar faturamento',
        description: error?.message || 'Erro desconhecido',
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
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.company ? `- ${customer.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    onClick={handleAddItem}
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
                        <div className="space-y-2">
                          <Label>Produto</Label>
                          <ProductSearchInput
                            value={item.product_id}
                            onValueChange={(productId, product) => {
                              handleUpdateItem(item.id, {
                                product_id: productId || undefined,
                                product,
                                service_id: undefined,
                                service: undefined
                              });
                            }}
                            placeholder="Buscar produto..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Serviço</Label>
                          <Select
                            value={item.service_id || ''}
                            onValueChange={(serviceId) => {
                              const service = services.find(s => s.id === serviceId);
                              handleUpdateItem(item.id, {
                                service_id: serviceId || undefined,
                                service,
                                product_id: undefined,
                                product: undefined
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              {services.map(service => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || ''}
                            onChange={(e) => {
                              handleUpdateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 });
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
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Faturamento *</Label>
                    <DatePicker
                      date={billDate}
                      onDateChange={(date) => {
                        if (date) {
                          setBillDate(date);
                          if (date > dueDate) {
                            setDueDate(addDays(date, 7));
                          }
                        }
                      }}
                    />
                    {errors.billDate && (
                      <p className="text-sm text-red-500">{errors.billDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento *</Label>
                    <DatePicker
                      date={dueDate}
                      onDateChange={(date) => {
                        if (date) setDueDate(date);
                      }}
                      minDate={billDate}
                    />
                    {errors.dueDate && (
                      <p className="text-sm text-red-500">{errors.dueDate}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pagamento *</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="CASH">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <p className="text-sm text-red-500">{errors.paymentMethod}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do faturamento avulso..."
                    rows={3}
                  />
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
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Data de Faturamento:</span> {format(billDate, 'dd/MM/yyyy')}</p>
                      <p><span className="font-medium">Data de Vencimento:</span> {format(dueDate, 'dd/MM/yyyy')}</p>
                      <p><span className="font-medium">Método:</span> {paymentMethod}</p>
                      {description && (
                        <p><span className="font-medium">Descrição:</span> {description}</p>
                      )}
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
      </DialogContent>
    </Dialog>
  );
}

