import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription, 
  DialogHeader
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Package } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { toast } from "sonner";
import { useServices } from "@/hooks/useServices";
import { useServiceCodeGenerator } from "@/hooks/useServiceCodeGenerator";

// Esquema de validação para o formulário
const serviceFormSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  default_price: z.coerce.number().min(0.01, { message: "O preço deve ser maior que zero" }),
  tax_rate: z.coerce.number().min(0, { message: "A taxa não pode ser negativa" }).max(100, { message: "A taxa não pode ser maior que 100%" }),
  is_active: z.boolean().default(true),
  // Campo de compatibilidade
  unit_price: z.coerce.number().optional(),
  code: z.string().optional(),
  tax_code: z.string().optional(),
  withholding_tax: z.boolean().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceCreated: (service: {
    id: string;
    name: string;
    description?: string | null;
    default_price: number;
    tax_rate: number;
    is_active: boolean;
    code?: string | null;
    tax_code?: string | null;
    created_at: string;
    updated_at: string;
    tenant_id: string;
    unit_price?: number; // Campo de compatibilidade
  }) => void;
}

export function ServiceCreation({ open, onOpenChange, onServiceCreated }: ServiceCreationProps) {
  const { createServiceMutation } = useServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState<string>("");

  // 🔢 HOOK PARA GERAÇÃO AUTOMÁTICA DE CÓDIGOS
  const { 
    generateNextCode, 
    validateCodeExists, 
    refreshMaxCode,
    nextAvailableCode,
    isLoadingMaxCode,
    hasAccess 
  } = useServiceCodeGenerator();



  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      default_price: 0,
      unit_price: 0, // Campo de compatibilidade
      tax_rate: 0,
      is_active: true,
      code: "",
      tax_code: "",
      withholding_tax: false,
    },
  });

  // 🔄 EFEITO PARA RESETAR FORMULÁRIO QUANDO O MODAL FECHAR
  useEffect(() => {
    if (!open) {
      form.reset();
      setCodeError("");
    }
  }, [open, form]);

  // 🔄 EFEITO PARA PREENCHER CÓDIGO AUTOMATICAMENTE QUANDO O MODAL ABRIR
  useEffect(() => {
    if (open && hasAccess && nextAvailableCode && !form.getValues('code')?.trim()) {
      console.log(`🔢 [AUTO-CODE] Preenchendo código automaticamente: ${nextAvailableCode}`);
      form.setValue('code', nextAvailableCode);
      setCodeError("");
    }
  }, [open, hasAccess, nextAvailableCode, form]);
  
  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    setCodeError("");
    
    try {
      // 🔍 VALIDAR CÓDIGO DUPLICADO SE FORNECIDO
      if (data.code && data.code.trim()) {
        console.log(`🔍 [VALIDATION] Validando código: ${data.code}`);
        const codeExists = await validateCodeExists(data.code.trim());
        
        if (codeExists) {
          setCodeError(`O código "${data.code}" já está em uso. Escolha outro código.`);
          toast.error(`Código "${data.code}" já está em uso`);
          setIsSubmitting(false);
          return;
        }
      }

      // Criar o serviço usando a mutation do hook useServices
      const newService = await createServiceMutation.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        default_price: data.unit_price || data.default_price || 0,
        tax_rate: data.tax_rate,
        is_active: data.is_active,
        code: data.code || undefined,
        withholding_tax: data.withholding_tax,
      });
      
      toast.success("Serviço criado com sucesso!");
      
      // 🔄 ATUALIZAR CACHE DO MAIOR CÓDIGO APÓS CRIAÇÃO
      refreshMaxCode();
      
      onServiceCreated({
        id: newService.id,
        name: newService.name,
        description: newService.description || null,
        default_price: newService.default_price,
        tax_rate: newService.tax_rate,
        is_active: newService.is_active,
        code: newService.code,
        tax_code: newService.tax_code,
        created_at: newService.created_at,
        updated_at: newService.updated_at,
        tenant_id: newService.tenant_id,
        unit_price: newService.default_price, // Campo de compatibilidade
      });
      
      form.reset();
      setCodeError("");
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao criar serviço: ${errorMessage}`); 
      console.error("Erro ao criar serviço:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-full h-screen px-0 m-0 bg-transparent border-0 shadow-none" 
        style={{ 
          width: '100vw',
          paddingTop: '139px',
          paddingBottom: '139px',
          backdropFilter: 'none'
        }}
      >
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Cadastro de Serviço</DialogTitle>
            <DialogDescription>
              Cadastre um novo serviço para adicionar ao contrato.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        
        <div className="bg-background/95 backdrop-blur-sm border-y border-border/50 shadow-lg w-full" style={{ maxHeight: 'calc(100vh - 278px)', overflow: 'auto' }}>
          {/* Cabeçalho com seta de voltar */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-primary-foreground/10 text-primary-foreground"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Cadastro de Serviço</h2>
            </div>
            
            <Button 
              variant="ghost" 
              className="gap-1 hover:bg-primary-foreground/10 text-primary-foreground"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              <span>Salvar Serviço</span>
            </Button>
          </div>

          {/* Conteúdo principal */}
          <div className="p-6">
            <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-md p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-medium">Informações do Serviço</h3>
                  <p className="text-muted-foreground">Preencha os dados do serviço para cadastrá-lo no sistema</p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">Nome do Serviço</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Desenvolvimento de Site" 
                              className="bg-background/50"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Nome descritivo do serviço
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
                          <FormLabel className="font-medium">Descrição</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Descreva detalhadamente o serviço" 
                              className="bg-background/50"
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Detalhes adicionais sobre o serviço (opcional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* 🔢 CAMPO DE CÓDIGO COM GERAÇÃO AUTOMÁTICA */}
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium">Código do Serviço</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={isLoadingMaxCode ? "Carregando..." : `Ex: ${nextAvailableCode || "001"}`}
                              className="bg-background/50"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                setCodeError(""); // Limpar erro ao digitar
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            {nextAvailableCode ? 
                              `Próximo código disponível: ${nextAvailableCode}` : 
                              "Código único para identificar o serviço (opcional)"
                            }
                          </FormDescription>
                          {codeError && (
                            <p className="text-sm text-destructive font-medium">{codeError}</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="unit_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Preço Unitário (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0,00"
                                className="bg-background/50"
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
                        name="tax_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Taxa de Imposto (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0,00"
                                className="bg-background/50"
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
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Serviço ativo
                            </FormLabel>
                            <FormDescription>
                              Desative para ocultar este serviço de seleção
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </div>
          
          {/* Rodapé fixo */}
          <div className="sticky bottom-0 bg-background border-t border-border/50 p-4 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
