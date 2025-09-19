import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { ServiceSelection } from "./parts/ServiceSelection";
import { useServices } from "@/hooks/useServices";
import { Service, ServiceSelectionItem } from "@/types/services";

const serviceFormSchema = z.object({
  name: z.string().min(1, "O nome do serviço é obrigatório"),
  description: z.string().optional(),
  default_price: z.number().min(0.01, "O preço unitário deve ser maior que zero"),
  tax_rate: z.number().min(0).max(100, "A taxa de imposto deve estar entre 0 e 100"),
  quantity: z.number().min(0.01, "A quantidade deve ser maior que zero"),
  unit_price: z.number().optional(),
  contract_id: z.string().min(1, "O ID do contrato é obrigatório"),
  is_active: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface InlineServiceFormProps {
  contractId: string;
  onAddService: (values: ServiceFormValues) => void;
  onCancel: () => void;
}

export function InlineServiceForm({ contractId, onAddService, onCancel }: InlineServiceFormProps) {
  const [isSelectingExisting, setIsSelectingExisting] = useState(false);
  
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      default_price: 0,
      unit_price: 0,
      tax_rate: 0,
      quantity: 1,
      contract_id: contractId,
      is_active: true,
    },
  });

  const handleSelectService = (service: any) => {
    form.setValue('name', service.name);
    form.setValue('description', service.description || '');
    form.setValue('default_price', service.default_price);
    form.setValue('unit_price', service.default_price);
    form.setValue('tax_rate', service.tax_rate || 0);
    setIsSelectingExisting(false);
  };

  const onSubmit = (data: ServiceFormValues) => {
    // Garantir que todos os campos obrigatórios estejam presentes
    const serviceData = {
      name: data.name,
      description: data.description || '',
      default_price: data.default_price || 0,
      unit_price: data.unit_price || data.default_price || 0,
      tax_rate: data.tax_rate || 0,
      quantity: data.quantity || 1,
      is_active: data.is_active !== undefined ? data.is_active : true,
      contract_id: data.contract_id || contractId,
    };
    
    onAddService(serviceData);
    form.reset();
  };

  // Hook para buscar serviços existentes
  const { data: servicesData, isLoading: isLoadingServices } = useServices();
  const existingServices = servicesData?.data || [];
  
  if (isSelectingExisting) {
    return (
      <div className="p-4 border border-dashed rounded-md mb-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Selecionar serviço existente</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSelectingExisting(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ServiceSelection 
          open={isSelectingExisting}
          onOpenChange={setIsSelectingExisting}
          services={existingServices}
          onServiceSelect={handleSelectService}
          onCreateService={() => {
            setIsSelectingExisting(false);
            // Limpa o formulário para um novo serviço
            form.reset({
              name: "",
              description: "",
              default_price: 0,
              unit_price: 0,
              tax_rate: 0,
              quantity: 1,
              contract_id: contractId,
              is_active: true,
            });
          }}
          isLoading={isLoadingServices}
        />
      </div>
    );
  }

  return (
    <div className="p-4 border border-dashed rounded-md mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium">Adicionar novo serviço</h4>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Serviço</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Digite o nome do serviço"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0.01"
            {...form.register('quantity', { valueAsNumber: true })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="unit_price">Preço Unitário (R$)</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            min="0"
            {...form.register('unit_price', { valueAsNumber: true })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tax_rate">Taxa de Imposto (%)</Label>
          <Input
            id="tax_rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...form.register('tax_rate', { valueAsNumber: true })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Descrição (Opcional)</Label>
          <Input
            id="description"
            {...form.register('description')}
            placeholder="Descrição detalhada do serviço"
          />
        </div>
        
        <div className="flex items-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            className="mt-6"
            onClick={() => setIsSelectingExisting(true)}
          >
            Selecionar Existente
          </Button>
          
          <Button 
            type="button" 
            className="mt-6"
            onClick={form.handleSubmit(onSubmit)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Serviço
          </Button>
        </div>
      </div>
    </div>
  );
}
