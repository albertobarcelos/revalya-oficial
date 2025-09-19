import React, { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Edit, Trash2, Search, AlertCircle, PlusCircle } from 'lucide-react'
import { useServices } from '@/hooks/useServices'
import { Service } from '@/types/service'
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// Estilos de animação inline para evitar problemas de import
const animationStyles = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
  }
  
  @keyframes pulse-soft {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
  
  .animate-pulse-soft {
    animation: pulse-soft 1.5s ease-in-out infinite;
  }
  
  .transition-smooth {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .highlight-error {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    border-color: rgb(239, 68, 68);
  }
`

// AIDEV-NOTE: Schema de validação corrigido com TODOS os campos obrigatórios do banco
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres",
  }),
  description: z.string().optional(),
  code: z.string().min(1, {
    message: "Código do serviço é obrigatório",
  }),
  default_price: z.coerce
    .number()
    .min(0.01, "Valor do serviço é obrigatório e deve ser maior que zero"),
  // AIDEV-NOTE: Campos obrigatórios no banco que estavam faltando - CORRIGIDO: são opcionais no banco
  municipality_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  lc_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  // AIDEV-NOTE: Campos opcionais
  tax_code: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  tax_rate: z.coerce
    .number()
    .min(0, "Taxa não pode ser negativa")
    .max(100, "Taxa não pode ser maior que 100%")
    .optional()
    .or(z.literal(""))
    .transform(val => val === "" || val === null || val === undefined ? undefined : val),
  withholding_tax: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  initialValues?: Partial<Service>;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  onDuplicateError?: (isDuplicate: boolean) => void; // Nova prop para comunicar erro de duplicação
}

function ServiceForm({ initialValues, onSubmit, onCancel, isSubmitting, onDuplicateError }: ServiceFormProps) {
  console.log('🔍 [DEBUG] ServiceForm renderizado com:', { initialValues, isSubmitting });
  
  const { checkDuplicateCode } = useServices();
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      code: initialValues?.code || "",
      default_price: initialValues?.default_price || 0,
      municipality_code: initialValues?.municipality_code || "",
      lc_code: initialValues?.lc_code || "",
      tax_code: initialValues?.tax_code || "",
      tax_rate: initialValues?.tax_rate || 0,
      withholding_tax: initialValues?.withholding_tax || false,
      is_active: initialValues?.is_active ?? true,
    },
  });

  console.log('🔍 [DEBUG] Form state:', {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    values: form.getValues()
  });

  // AIDEV-NOTE: Função para verificar código duplicado com debounce
  const checkCodeDuplicate = useCallback(async (code: string) => {
    if (!code?.trim()) {
      setCodeError(null);
      onDuplicateError?.(false);
      return;
    }

    setIsCheckingCode(true);
    try {
      const isDuplicate = await checkDuplicateCode(code, initialValues?.id);
      if (isDuplicate) {
        const errorMsg = "Este código já existe. Escolha outro código.";
        setCodeError(errorMsg);
        form.setError('code', { message: errorMsg });
        onDuplicateError?.(true);
      } else {
        setCodeError(null);
        form.clearErrors('code');
        onDuplicateError?.(false);
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      setCodeError(null);
      onDuplicateError?.(false);
    } finally {
      setIsCheckingCode(false);
    }
  }, [checkDuplicateCode, initialValues?.id]);

  // AIDEV-NOTE: Função para lidar com clique no botão Salvar - com validação de código duplicado
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 [DEBUG] Botão Salvar clicado!');
    
    // Verificar código duplicado antes de submeter
    const currentCode = form.getValues('code');
    if (currentCode?.trim()) {
      await checkCodeDuplicate(currentCode);
      if (codeError) {
        // Fazer o input tremer e definir erro no formulário
        const codeInput = document.querySelector('input[name="code"]') as HTMLInputElement;
        if (codeInput) {
          codeInput.classList.add('animate-shake', 'border-red-500', 'bg-red-50');
          setTimeout(() => {
            codeInput.classList.remove('animate-shake');
          }, 600);
        }
        
        // Definir erro específico no campo código
        form.setError('code', {
          type: 'manual',
          message: codeError
        });
        
        return; // Não submeter o formulário
      }
    }
    
    // Usar handleSubmit ao invés de trigger para validação adequada apenas dos campos obrigatórios
    form.handleSubmit(
      (values) => {
        console.log('🔍 [DEBUG] Formulário válido - valores:', values);
        onSubmit(values);
      },
      (errors) => {
        console.log('🔍 [DEBUG] Formulário inválido - erros:', errors);
      }
    )();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <Form {...form}>
        <form className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço *</FormLabel>
              <FormControl>
                <Input placeholder="Nome do serviço" {...field} />
              </FormControl>
              <FormDescription>
                Nome do serviço que aparecerá em contratos e faturamentos (obrigatório)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Serviço *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Código interno" 
                      {...field} 
                      value={field.value || ""} 
                      name="code"
                      className={cn(
                        "transition-all duration-200",
                        codeError && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                      )}
                      onBlur={(e) => {
                        field.onBlur();
                        if (e.target.value?.trim()) {
                          checkCodeDuplicate(e.target.value);
                        }
                      }}
                    />
                    {isCheckingCode && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Código interno para referência (obrigatório)
                </FormDescription>
                {codeError && (
                  <div className="text-sm text-red-600 font-medium animate-pulse">
                    {codeError}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="default_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Serviço *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Valor padrão para este serviço (obrigatório)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* AIDEV-NOTE: Campos obrigatórios adicionais do banco */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="municipality_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Município</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 3550308" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Código IBGE do município (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lc_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código LC</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 123" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Código da Lista de Serviços (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tax_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Imposto (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: ISS" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Código para identificação do imposto
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
                    placeholder="0,00"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Taxa de imposto aplicada ao serviço (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="withholding_tax"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Retenção de Imposto
                </FormLabel>
                <FormDescription>
                  Marque se este serviço possui retenção de imposto
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
                  placeholder="Descreva o serviço"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Descrição detalhada do serviço
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Serviço Ativo
                </FormLabel>
                <FormDescription>
                  Desative para ocultar este serviço da lista de serviços disponíveis
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveClick}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : initialValues?.id ? "Atualizar Serviço" : "Criar Serviço"}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}

/**
 * Componente para gerenciar serviços de contratos com layout responsivo
 * Permite criar, editar e visualizar serviços disponíveis
 */
export function ServicesManager() {
  // AIDEV-NOTE: Log crítico para verificar se o componente está sendo renderizado
  console.log('🚨 TESTE CRÍTICO: ServicesManager INICIADO!');
  console.log('🔍 [DEBUG] Window location:', window.location.href);
  console.log('🔍 [DEBUG] Document title:', document.title);
  
  const { data: servicesData, isLoading, createServiceMutation, updateServiceMutation } = useServices();
  const services = servicesData?.data || [];
  const [isCreating, setIsCreating] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [hasDuplicateError, setHasDuplicateError] = useState(false); // Estado para controlar erro de duplicação

  console.log('🔍 [DEBUG] Estado atual:', { 
    servicesCount: services?.length, 
    isLoading, 
    isCreating, 
    editingService: editingService?.id,
    hasDuplicateError
  });
  
  const handleCreateService = (values: FormValues) => {
    console.log('🔍 [DEBUG] handleCreateService chamada com valores:', values);
    
    // Se há erro de duplicação, não prosseguir
    if (hasDuplicateError) {
      console.log('🔍 [DEBUG] Bloqueando criação devido a código duplicado');
      return;
    }
    
    const serviceData = {
      name: values.name,
      description: values.description,
      code: values.code,
      default_price: values.default_price,
      tax_rate: values.tax_rate || 0,
      tax_code: values.tax_code,
      municipality_code: values.municipality_code,
      lc_code: values.lc_code,
      withholding_tax: values.withholding_tax,
      is_active: values.is_active
    };
    
    createServiceMutation.mutate(serviceData, {
      onSuccess: () => {
        console.log('✅ [SUCCESS] Serviço criado com sucesso');
        setIsCreating(false);
        setHasDuplicateError(false);
      },
      onError: (error: any) => {
        console.error('🚨 [ERROR] Erro ao criar serviço:', error);
        
        // AIDEV-NOTE: Tratamento específico para código duplicado
        if (error?.message?.includes('duplicate key value violates unique constraint "services_tenant_id_code_key"')) {
          // Não fechar o popup, apenas mostrar erro no campo
          // O form já tem o erro setado pela validação anterior
          console.log('🔍 [DEBUG] Código duplicado detectado - mantendo popup aberto');
          setHasDuplicateError(true);
          return;
        }
        
        // Para outros erros, fechar o popup
        setIsCreating(false);
        setHasDuplicateError(false);
      }
    });
  };
  
  const handleUpdateService = (values: FormValues) => {
    console.log('🔍 [DEBUG] handleUpdateService chamada com valores:', values);
    console.log('🔍 [DEBUG] editingService:', editingService);
    
    if (!editingService) {
      console.error('🚨 [ERROR] editingService é null!');
      return;
    }
    
    console.log('🔍 [DEBUG] Iniciando mutation para atualizar serviço:', editingService.id);
    
    updateServiceMutation.mutate(
      { 
        id: editingService.id, 
        serviceData: values 
      }, 
      {
        onSuccess: (data) => {
          console.log('✅ [SUCCESS] Serviço atualizado com sucesso:', data);
          setEditingService(null);
        },
        onError: (error) => {
          console.error('🚨 [ERROR] Erro ao atualizar serviço:', error);
        }
      }
    );
  };
  
  const handleEditService = (service: Service) => {
    console.log('🔍 [DEBUG] handleEditService chamado com:', service);
    setEditingService(service);
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header responsivo */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">Serviços</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie os serviços disponíveis para contratos
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Novo Serviço</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Catálogo de Serviços</CardTitle>
          <CardDescription className="text-sm">
            Serviços que podem ser adicionados a contratos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <span className="text-sm md:text-base">Carregando serviços...</span>
            </div>
          ) : !services || services.length === 0 ? (
            <div className="rounded-md border p-6 md:p-8 text-center mx-4 md:mx-0">
              <p className="text-base md:text-lg font-medium">Nenhum serviço cadastrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie serviços para adicionar aos seus contratos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nome</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">Código</TableHead>
                    <TableHead className="text-right min-w-[120px]">Preço</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[100px]">Município</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[80px]">LC</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[140px]">Imposto</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="min-w-[200px]">
                        <div>
                          <span className="font-medium text-sm md:text-base">{service.name}</span>
                          {service.description && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate max-w-[180px] md:max-w-xs mt-1">
                              {service.description}
                            </p>
                          )}
                          {/* Mostrar código em telas pequenas */}
                          <div className="sm:hidden mt-1">
                            {service.code && (
                              <span className="text-xs text-muted-foreground">Código: {service.code}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{service.code || "-"}</TableCell>
                      <TableCell className="text-right text-sm md:text-base font-medium">
                        {formatCurrency(service.default_price)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {service.municipality_code || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {service.lc_code || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {service.tax_rate > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="outline" className="text-xs">{service.tax_rate.toFixed(2)}%</Badge>
                            {service.tax_code && (
                              <span className="text-xs text-muted-foreground">
                                {service.tax_code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem imposto</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {service.is_active ? (
                            <Badge className="bg-green-500 text-white hover:bg-green-600 text-xs">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inativo</Badge>
                          )}
                          {/* Mostrar imposto em telas pequenas */}
                          <div className="md:hidden">
                            {service.tax_rate > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {service.tax_rate.toFixed(2)}% {service.tax_code && `(${service.tax_code})`}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditService(service)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para criar serviço */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Serviço</DialogTitle>
            <DialogDescription>
              Adicione um novo serviço ao catálogo
            </DialogDescription>
          </DialogHeader>
          <ServiceForm
            key={`create-${isCreating}`} // Force re-render para limpar o formulário
            onSubmit={handleCreateService}
            onCancel={() => {
              setIsCreating(false);
              setHasDuplicateError(false);
            }}
            isSubmitting={createServiceMutation.isPending}
            onDuplicateError={setHasDuplicateError}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog para editar serviço */}
      <Dialog open={!!editingService} onOpenChange={(open) => {
        console.log('🔍 [DEBUG] Dialog onOpenChange:', { open, editingService: editingService?.id });
        if (!open) setEditingService(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Atualize as informações do serviço
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <ServiceForm
              key={`edit-${editingService.id}`} // Force re-render com dados corretos
              initialValues={editingService}
              onSubmit={handleUpdateService}
              onCancel={() => {
                console.log('🔍 [DEBUG] Cancel clicado no ServiceForm');
                setEditingService(null);
              }}
              isSubmitting={updateServiceMutation.isPending}
              onDuplicateError={() => {}} // Para edição, não precisamos controlar o estado
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
