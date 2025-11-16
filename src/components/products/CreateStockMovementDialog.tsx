/**
 * Modal para criar nova movimentação de estoque
 * 
 * AIDEV-NOTE: Modal completo com todos os campos, validações e
 * lógica condicional para transferências conforme especificado no plano
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  const { products } = useSecureProducts({ limit: 1 });

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

  const selectedProduct = products.find(p => p.id === formData.product_id) || null;

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Novo Movimento de Estoque</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Produto (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <ProductSearchInput
                value={formData.product_id || undefined}
                onValueChange={handleProductChange}
                placeholder="Selecione o produto"
                disabled={!!initialProductId}
              />
              {errors.product_id && (
                <p className="text-body text-destructive">{errors.product_id}</p>
              )}
            </div>

            {/* Tipo do Movimento */}
            <div className="space-y-2">
              <Label htmlFor="movement_type">Tipo do Movimento de Estoque</Label>
              <Select
                value={formData.movement_type}
                onValueChange={(value) => handleChange('movement_type', value)}
              >
                <SelectTrigger>
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

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="movement_date">Data</Label>
              <DatePicker
                date={selectedDate}
                setDate={handleDateSelect}
              />
              {errors.movement_date && (
                <p className="text-body text-destructive">{errors.movement_date}</p>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade (UN)</Label>
              <Input
                id="quantity"
                type="number"
                step="0.000001"
                value={formData.quantity || ''}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                placeholder="0,000000"
              />
              {errors.quantity && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-body text-yellow-800">{errors.quantity}</p>
                </div>
              )}
            </div>

            {/* Valor Unitário */}
            <div className="space-y-2">
              <Label htmlFor="unit_value">Valor Unitário</Label>
              <Input
                id="unit_value"
                type="number"
                step="0.01"
                value={formData.unit_value || ''}
                onChange={(e) => handleChange('unit_value', parseFloat(e.target.value) || 0)}
                placeholder="0,000000"
              />
            </div>

            {/* Local de Estoque (ou Local de Destino para transferências) */}
            {!isTransfer && (
              <div className="space-y-2">
                <Label htmlFor="storage_location_id">Local de Estoque</Label>
                <Select
                  value={formData.storage_location_id || ''}
                  onValueChange={(value) => handleChange('storage_location_id', value)}
                >
                  <SelectTrigger>
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

            {/* Campos condicionais para transferência */}
            {isTransfer && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="origin_storage_location_id">Local de Origem</Label>
                  <Select
                    value={formData.origin_storage_location_id || ''}
                    onValueChange={(value) => handleChange('origin_storage_location_id', value)}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="destination_storage_location_id">Local de Destino</Label>
                  <Select
                    value={formData.destination_storage_location_id || ''}
                    onValueChange={(value) => handleChange('destination_storage_location_id', value)}
                  >
                    <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="movement_reason">Motivo do Movimento de Estoque</Label>
              <Select
                value={formData.movement_reason || ''}
                onValueChange={(value) => handleChange('movement_reason', value)}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="observation">Observação</Label>
              <Textarea
                id="observation"
                value={formData.observation || ''}
                onChange={(e) => handleChange('observation', e.target.value)}
                placeholder="Observações adicionais..."
                rows={4}
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

