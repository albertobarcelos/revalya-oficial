import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractService } from "@/types/models/contract";
import { X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface ServiceRowEditorProps {
  service: ContractService;
  onSave: (service: ContractService) => void;
  onCancel: () => void;
}

export function ServiceRowEditor({ service, onSave, onCancel }: ServiceRowEditorProps) {
  const [editedService, setEditedService] = useState<Partial<ContractService>>(service);
  const [isSaving, setIsSaving] = useState(false);

  // Atualiza o estado local quando o serviço muda
  useEffect(() => {
    setEditedService(service);
  }, [service]);

  const handleChange = (field: keyof ContractService, value: any) => {
    setEditedService(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      onSave({
        ...service,
        ...editedService,
        // Garante que os valores numéricos sejam números
        quantity: Number(editedService.quantity) || 0,
        unit_price: Number(editedService.unit_price) || 0,
        discount_percentage: Number(editedService.discount_percentage) || 0,
        discount_amount: Number(editedService.discount_amount) || 0,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotal = () => {
    const quantity = Number(editedService.quantity) || 0;
    const unitPrice = Number(editedService.unit_price) || 0;
    let discountPercentage = Number(editedService.discount_percentage) || 0;
    const discountAmount = Number(editedService.discount_amount) || 0;
    const taxRate = Number(editedService.tax_rate) || 0;
    
    // AIDEV-NOTE: CORREÇÃO - O banco salva discount_percentage como decimal (0.10 para 10%)
    // Se o valor for <= 1, está em decimal, usar diretamente
    // Se o valor for > 1, está em percentual (dados antigos), converter para decimal
    if (discountPercentage > 1) {
      discountPercentage = discountPercentage / 100;
    }
    
    const subtotal = quantity * unitPrice;
    const discount = (subtotal * discountPercentage) + discountAmount; // AIDEV-NOTE: Usar decimal diretamente (não dividir por 100)
    const totalAfterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = totalAfterDiscount * (taxRate / 100);
    const total = totalAfterDiscount + taxAmount;
    
    return {
      subtotal,
      discount,
      taxAmount,
      total
    };
  };

  const { total } = calculateTotal();

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={7} className="p-0">
        <div className="p-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">
                Serviço
              </label>
              <div className="p-2 bg-muted/30 rounded-md">
                <div className="font-medium">{service.service?.name || service.description}</div>
                {service.description && service.description !== service.service?.name && (
                  <div className="text-sm text-muted-foreground">{service.description}</div>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Quantidade
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={editedService.quantity || ''}
                onChange={(e) => handleChange('quantity', e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Preço Unitário
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editedService.unit_price || ''}
                  onChange={(e) => handleChange('unit_price', e.target.value)}
                  className="w-full pl-8"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Desconto (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editedService.discount_percentage || ''}
                onChange={(e) => handleChange('discount_percentage', e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 mr-1" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t flex justify-end items-center gap-6">
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground ml-2">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
