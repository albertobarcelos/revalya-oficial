import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContracts } from "@/hooks/useContracts";
import { useServices } from "@/hooks/useServices";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  service_id: z.string({
    required_error: "Selecione um serviço",
  }),
  description: z.string().optional(),
  quantity: z.coerce
    .number()
    .min(0.01, "Quantidade deve ser maior que zero"),
  unit_price: z.coerce
    .number()
    .min(0, "Preço unitário não pode ser negativo"),
  discount_percentage: z.coerce
    .number()
    .min(0, "Desconto não pode ser negativo")
    .max(1, "Desconto não pode ser maior que 100%"),
  tax_rate: z.coerce
    .number()
    .min(0, "Taxa de imposto não pode ser negativa")
    .max(100, "Taxa de imposto não pode ser maior que 100%"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddServiceFormProps {
  contractId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddServiceForm({ contractId, onSuccess, onCancel }: AddServiceFormProps) {
  const { data: servicesData, isLoading: isLoadingServices } = useServices();
  const services = servicesData?.data || [];
  const { addContractService, addContractServiceMutation } = useContracts();
  
  const [selectedService, setSelectedService] = useState<any>(null);
  const isPending = addContractServiceMutation.isPending;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 0,
    },
  });
  
  // Atualizar campos quando um serviço é selecionado
  useEffect(() => {
    if (selectedService) {
      form.setValue("unit_price", selectedService.default_price);
      form.setValue("tax_rate", selectedService.tax_rate);
      if (selectedService.description) {
        form.setValue("description", selectedService.description);
      }
    }
  }, [selectedService, form]);
  
  const handleServiceChange = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    setSelectedService(service);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Preparar os dados do serviço para o contrato
      const serviceData = {
        service_id: data.service_id,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unit_price,
        discount_percentage: data.discount_percentage,
        tax_rate: data.tax_rate,
      };
      
      // Chamar a função para adicionar o serviço ao contrato
      await addContractService({ 
        contractId, 
        serviceData 
      });
      
      // Fechar o diálogo e recarregar os dados
      onSuccess();
    } catch (error) {
      // O erro já é tratado no hook useContracts
      console.error("Erro ao adicionar serviço:", error);
    }
  };
  
  // Calcular valores para prévia
  const watchQuantity = form.watch("quantity") || 0;
  const watchUnitPrice = form.watch("unit_price") || 0;
  const watchDiscountPercentage = form.watch("discount_percentage") || 0;
  const watchTaxRate = form.watch("tax_rate") || 0;
  
  const subtotal = watchQuantity * watchUnitPrice;
  const discountAmount = subtotal * watchDiscountPercentage;
  const afterDiscountAmount = subtotal - discountAmount;
  const taxAmount = afterDiscountAmount * (watchTaxRate / 100);
  const totalAmount = afterDiscountAmount + taxAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="service_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serviço</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleServiceChange(value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingServices ? (
                    <SelectItem value="loading" disabled>
                      Carregando serviços...
                    </SelectItem>
                  ) : services && services.length > 0 ? (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {formatCurrency(service.default_price)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      Nenhum serviço cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Selecione um serviço da sua lista de serviços
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrição personalizada do serviço para este contrato"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Deixe em branco para usar a descrição padrão do serviço
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço Unitário</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discount_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desconto (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="1"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Digite como decimal: 0.1 = 10%
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="tax_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa de Imposto (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="100"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="mt-6 rounded-md border p-4">
          <h4 className="mb-2 text-sm font-medium">Resumo de Valores</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto ({(watchDiscountPercentage * 100).toFixed(2)}%):</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base para impostos:</span>
              <span>{formatCurrency(afterDiscountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impostos ({watchTaxRate.toFixed(2)}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 font-medium">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Adicionando..." : "Adicionar Serviço"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
