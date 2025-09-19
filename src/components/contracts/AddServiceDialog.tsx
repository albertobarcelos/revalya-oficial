import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Service, CreateServiceDTO, ServiceSelectionItem } from "@/types/services";
import { useTenant } from '@/core/tenant/UnifiedTenantProvider';
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/components/ui/use-toast";
import { ServiceSelection } from "./parts/ServiceSelection";
import { ServiceCreation } from "./parts/ServiceCreation";

const serviceFormSchema = z.object({
  name: z.string().min(1, "O nome do serviço é obrigatório"),
  description: z.string().optional(),
  default_price: z.number().min(0.01, "O preço unitário deve ser maior que zero"),
  tax_rate: z.number().min(0).max(100, "A taxa de imposto deve estar entre 0 e 100"),
  quantity: z.number().min(0.01, "A quantidade deve ser maior que zero"),
  // Campo de compatibilidade
  unit_price: z.number().optional(),
  contract_id: z.string().min(1, "O ID do contrato é obrigatório"),
  is_active: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface AddServiceDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService: (values: ServiceFormValues & { contract_id: string }) => void;
  defaultValues?: Partial<ServiceFormValues>;
  contractId?: string;
}

// Adaptador para converter Service para ServiceSelectionItem
const toServiceSelectionItem = (service: Service): ServiceSelectionItem => ({
  id: service.id,
  name: service.name,
  description: service.description || null,
  default_price: service.default_price,
  tax_rate: service.tax_rate,
  is_active: service.is_active,
  created_at: service.created_at,
  tenant_id: service.tenant_id
});

// Adaptador para converter CreateServiceDTO para o formato esperado pelo hook
const toServiceDTO = (data: Omit<CreateServiceDTO, 'tenant_id'>): Omit<Service, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> => ({
  name: data.name,
  description: data.description,
  default_price: data.default_price,
  tax_rate: data.tax_rate,
  is_active: data.is_active,
  code: data.code,
  tax_code: data.withholding_tax ? '1' : undefined
});

export function AddServiceDialog({
  children,
  open,
  onOpenChange,
  onAddService,
  defaultValues = {},
  contractId = ''
}: AddServiceDialogProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      default_price: 0,
      unit_price: 0,
      tax_rate: 0,
      quantity: 1,
      contract_id: contractId || "",
      is_active: true,
      ...defaultValues,
    },
  });
  
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [showServiceCreation, setShowServiceCreation] = useState(false);
  const { data: servicesData, createServiceMutation } = useServices();
  const availableServices = servicesData?.data || [];
  const { toast } = useToast();
  const { currentTenant } = useTenant() || {};
  
  // Converter serviços para o formato esperado pelo ServiceSelection
  const servicesForSelection = availableServices.map(toServiceSelectionItem);

  const handleServiceSelect = (service: ServiceSelectionItem) => {
    form.setValue("name", service.name);
    form.setValue("description", service.description || "");
    form.setValue("default_price", service.default_price);
    form.setValue("unit_price", service.default_price); // Campo de compatibilidade
    form.setValue("tax_rate", service.tax_rate);
    setShowServiceSelection(false);
  };

  const handleCreateService = async (serviceData: Omit<CreateServiceDTO, "tenant_id">) => {
    try {
      const serviceToCreate = toServiceDTO({
        ...serviceData,
        is_active: true,
      });
      
      // O tenant_id será adicionado pelo hook useServices

      const newService = await createServiceMutation.mutateAsync(serviceToCreate);

      // Preenche o formulário com o novo serviço
      form.setValue("name", newService.name);
      form.setValue("description", newService.description || "");
      form.setValue("default_price", newService.default_price);
      form.setValue("unit_price", newService.default_price); // Campo de compatibilidade
      form.setValue("tax_rate", newService.tax_rate);

      setShowServiceCreation(false);

      toast({
        title: "Serviço criado com sucesso!",
        description: `${newService.name} foi adicionado aos seus serviços.`,
      });

      return newService;
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      toast({
        title: "Erro ao criar serviço",
        description: "Ocorreu um erro ao tentar criar o serviço. Por favor, tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onSubmit = (values: ServiceFormValues) => {
    if (!contractId) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o serviço. O contrato não foi encontrado.",
        variant: "destructive",
      });
      return;
    }

    const serviceData = {
      ...values,
      contract_id: contractId,
    };
    
    onAddService(serviceData);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Serviço</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviço</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setShowServiceSelection(true)}
                >
                  Selecionar existente
                </Button>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nome do serviço" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Descrição (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <FormLabel>Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tax_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa de Imposto (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Adicionar Serviço</Button>
            </div>
          </form>
        </Form>

        {/* Diálogo de seleção de serviço */}
        <ServiceSelection
          open={showServiceSelection}
          onOpenChange={setShowServiceSelection}
          onServiceSelect={handleServiceSelect}
          onCreateService={() => {
            setShowServiceSelection(false);
            setShowServiceCreation(true);
          }}
          services={servicesForSelection}
        />

        {/* Diálogo de criação de serviço */}
        <ServiceCreation
          open={showServiceCreation}
          onOpenChange={setShowServiceCreation}
          onServiceCreated={handleCreateService}
        />
      </DialogContent>
    </Dialog>
  );
}
