/**
 * Modal para criar nova movimentação de estoque
 * 
 * AIDEV-NOTE: Modal completo com todos os campos, validações e
 * lógica condicional para transferências conforme especificado no plano
 */

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
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
import { useStockMovements, type CreateStockMovementDTO } from '@/hooks/useStockMovements';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { ProductSearchInput } from './ProductSearchInput';
import { useSecureProducts, type Product } from '@/hooks/useSecureProducts';
import { MOVEMENT_TYPE_OPTIONS, MOVEMENT_REASON_OPTIONS, validateQuantity } from '@/utils/stockUtils';
import { useToast } from '@/components/ui/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface CreateStockMovementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialProductId?: string;
}

export function CreateStockMovementDialog({
  isOpen,
  onClose,
  onSuccess,
  initialProductId
}: CreateStockMovementDialogProps) {
  const { toast } = useToast();
  const { createMovement, isCreating } = useStockMovements();
  const { locations } = useStorageLocations({ is_active: true });
  // AIDEV-NOTE: Buscar produtos - se houver initialProductId, buscar todos para encontrar o produto específico
  const { products } = useSecureProducts({ 
    limit: initialProductId ? 100 : 1 
  });

  const [formData, setFormData] = useState<Partial<CreateStockMovementDTO>>({
    product_id: initialProductId || '',
    storage_location_id: '',
    movement_type: 'ENTRADA',
    movement_reason: 'Ajuste por Inventário',
    movement_date: format(new Date(), 'yyyy-MM-dd'),
    quantity: 0,
    unit_value: 0,
    invoice_number: '',
    operation: '',
    customer_or_supplier: '',
    observation: '',
    origin_storage_location_id: '',
    destination_storage_location_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // AIDEV-NOTE: Buscar produto selecionado
  const selectedProduct = React.useMemo(() => {
    if (!formData.product_id) return null;
    return products.find(p => p.id === formData.product_id) || null;
  }, [formData.product_id, products]);

  // AIDEV-NOTE: Garantir que o product_id seja definido quando initialProductId mudar
  useEffect(() => {
    if (initialProductId && initialProductId !== formData.product_id) {
      setFormData(prev => ({ ...prev, product_id: initialProductId }));
    }
  }, [initialProductId, formData.product_id]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando alterado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleProductChange = useCallback((productId: string | null, product: Product | null) => {
    handleChange('product_id', productId || '');
  }, [handleChange]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      handleChange('movement_date', format(date, 'yyyy-MM-dd'));
    } else {
      setSelectedDate(new Date());
      handleChange('movement_date', format(new Date(), 'yyyy-MM-dd'));
    }
  }, [handleChange]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Produto é obrigatório';
    }

    if (!formData.movement_date) {
      newErrors.movement_date = 'Data é obrigatória';
    }

    if (!validateQuantity(formData.quantity)) {
      newErrors.quantity = 'A "Quantidade" do movimento de estoque deve ser maior que zero.';
    }

    if (!formData.storage_location_id) {
      newErrors.storage_location_id = 'Local de Estoque é obrigatório';
    }

    // Validações para transferência
    if (formData.movement_type === 'TRANSFERENCIA') {
      if (!formData.origin_storage_location_id) {
        newErrors.origin_storage_location_id = 'Local de Origem é obrigatório para transferências';
      }
      if (!formData.destination_storage_location_id) {
        newErrors.destination_storage_location_id = 'Local de Destino é obrigatório para transferências';
      }
      if (formData.origin_storage_location_id === formData.destination_storage_location_id) {
        newErrors.destination_storage_location_id = 'Local de Origem e Destino devem ser diferentes';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const movementData: CreateStockMovementDTO = {
      product_id: formData.product_id!,
      storage_location_id: formData.movement_type === 'TRANSFERENCIA' 
        ? formData.destination_storage_location_id!
        : formData.storage_location_id!,
      movement_type: formData.movement_type!,
      movement_reason: formData.movement_reason || null,
      movement_date: formData.movement_date!,
      quantity: formData.quantity!,
      unit_value: formData.unit_value || 0,
      invoice_number: formData.invoice_number || null,
      operation: formData.operation || null,
      customer_or_supplier: formData.customer_or_supplier || null,
      observation: formData.observation || null,
      origin_storage_location_id: formData.movement_type === 'TRANSFERENCIA' 
        ? formData.origin_storage_location_id || null
        : null,
      destination_storage_location_id: formData.movement_type === 'TRANSFERENCIA'
        ? formData.destination_storage_location_id || null
        : null
    };

    createMovement(movementData, {
      onSuccess: () => {
        toast({
          title: 'Sucesso',
          description: 'Movimentação criada com sucesso!',
        });
        onClose();
        onSuccess?.();
        // Reset form
        setFormData({
          product_id: initialProductId || '',
          storage_location_id: '',
          movement_type: 'ENTRADA',
          movement_reason: 'Ajuste por Inventário',
          movement_date: format(new Date(), 'yyyy-MM-dd'),
          quantity: 0,
          unit_value: 0
        });
        setErrors({});
        setSelectedDate(new Date());
      },
      onError: (error: any) => {
        toast({
          title: 'Erro',
          description: error?.message || 'Erro ao criar movimentação',
          variant: 'destructive',
        });
      }
    } as any);
  }, [formData, createMovement, toast, onClose, onSuccess, initialProductId]);

  const isTransfer = formData.movement_type === 'TRANSFERENCIA';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[calc(100vw-30px)] !w-[calc(100vw-30px)] !h-[calc(100vh-30px)] !left-[15px] !right-[15px] !top-[15px] !bottom-[15px] !translate-x-0 !translate-y-0 p-0 flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-[55px] min-h-[55px] bg-[rgb(244,245,246)] px-6">
          <DialogTitle className="text-[18px] font-normal leading-[18.48px] text-[rgb(0, 0, 0)]" style={{ fontFamily: '"Poppins", sans-serif' }}>
            Novo Movimento de Estoque
          </DialogTitle>
          <DialogDescription className="sr-only">
            Criar nova movimentação de estoque
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-[rgb(91,91,91)] hover:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Produto e Local de Estoque na mesma linha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="product" className="text-label font-medium leading-none">
                  Produto
                </Label>
                {initialProductId || selectedProduct ? (
                  // Se já tem produto selecionado (vindo da tela anterior), mostrar apenas o nome
                  <div className="text-heading-1 font-bold">
                    {selectedProduct?.name || 'Carregando...'}
                  </div>
                ) : (
                  // Se não tem produto, mostrar o campo de busca
                  <>
                    <ProductSearchInput
                      value={formData.product_id || undefined}
                      onValueChange={handleProductChange}
                      placeholder="Selecione o produto"
                    />
                    {selectedProduct && (
                      <div className="text-heading-1 font-bold mt-1">
                        {selectedProduct.name}
                      </div>
                    )}
                  </>
                )}
                {errors.product_id && (
                  <p className="text-body text-destructive">{errors.product_id}</p>
                )}
              </div>

              {/* Local de Estoque (ou Local de Destino para transferências) */}
              {!isTransfer && (
                <div className="space-y-1.5">
                  <Label htmlFor="storage_location_id" className="text-label font-medium leading-none">
                    Local de Estoque
                  </Label>
                  <Select
                    value={formData.storage_location_id || ''}
                    onValueChange={(value) => handleChange('storage_location_id', value)}
                  >
                    <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                      <SelectValue placeholder="Selecione o local de estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.storage_location_id && (
                    <p className="text-body text-destructive">{errors.storage_location_id}</p>
                  )}
                </div>
              )}
            </div>

            {/* Tipo do Movimento e Data na mesma linha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="movement_type" className="text-label font-medium leading-none">
                  Tipo do Movimento de Estoque
                </Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value) => handleChange('movement_type', value)}
                >
                  <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="movement_date" className="text-label font-medium leading-none">
                  Data
                </Label>
                <DatePicker
                  date={selectedDate}
                  setDate={handleDateSelect}
                  className="[&>button]:h-[25px] [&>button]:text-input [&>button]:border-[0.8px] [&>button]:border-[#b9b9b9] [&>button]:focus:border-black [&>button]:rounded-[1.2px]"
                />
                {errors.movement_date && (
                  <p className="text-body text-destructive">{errors.movement_date}</p>
                )}
              </div>
            </div>

            {/* Quantidade e Valor Unitário na mesma linha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-label font-medium leading-none">
                  Quantidade (UN)
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.000001"
                  value={formData.quantity || ''}
                  onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                  placeholder="0,000000"
                  className="h-[25px] text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                />
                {errors.quantity && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2 mt-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-body text-yellow-800">{errors.quantity}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit_value" className="text-label font-medium leading-none">
                  Valor Unitário
                </Label>
                <Input
                  id="unit_value"
                  type="number"
                  step="0.01"
                  value={formData.unit_value || ''}
                  onChange={(e) => handleChange('unit_value', parseFloat(e.target.value) || 0)}
                  placeholder="0,000000"
                  className="h-[25px] text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                />
              </div>
            </div>

            {/* Campos condicionais para transferência */}
            {isTransfer && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="origin_storage_location_id" className="text-label font-medium leading-none">
                    Local de Origem
                  </Label>
                  <Select
                    value={formData.origin_storage_location_id || ''}
                    onValueChange={(value) => handleChange('origin_storage_location_id', value)}
                  >
                    <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                      <SelectValue placeholder="Selecione o local de origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.origin_storage_location_id && (
                    <p className="text-body text-destructive">{errors.origin_storage_location_id}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="destination_storage_location_id" className="text-label font-medium leading-none">
                    Local de Destino
                  </Label>
                  <Select
                    value={formData.destination_storage_location_id || ''}
                    onValueChange={(value) => handleChange('destination_storage_location_id', value)}
                  >
                    <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                      <SelectValue placeholder="Selecione o local de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destination_storage_location_id && (
                    <p className="text-body text-destructive">{errors.destination_storage_location_id}</p>
                  )}
                </div>
              </>
            )}

            {/* Motivo do Movimento */}
            <div className="space-y-1.5">
              <Label htmlFor="movement_reason" className="text-label font-medium leading-none">
                Motivo do Movimento de Estoque
              </Label>
              <Select
                value={formData.movement_reason || ''}
                onValueChange={(value) => handleChange('movement_reason', value)}
              >
                <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_REASON_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div className="space-y-1.5">
              <Label htmlFor="observation" className="text-label font-medium leading-none">
                Observação
              </Label>
              <Textarea
                id="observation"
                value={formData.observation || ''}
                onChange={(e) => handleChange('observation', e.target.value)}
                placeholder="Observações adicionais..."
                rows={4}
                className="text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black rounded-[1.2px]"
              />
            </div>

            {/* Botão Confirmar */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                {isCreating ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

