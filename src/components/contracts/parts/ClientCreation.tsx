import React, { useState } from "react";
import { 
  Dialog, 
  DialogTitle,
  DialogDescription, 
  DialogHeader
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BillingDialogContent } from "@/components/billing/kanban/BillingDialogContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, User, X } from "lucide-react";
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
import { useCustomers } from "@/hooks/useCustomers";

// Esquema de validação para o formulário
const clientFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  document: z.string().min(11, { message: "Documento deve ter pelo menos 11 caracteres" }),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal("")),
  phone: z.string().min(10, { message: "Telefone deve ter pelo menos 10 dígitos" }).optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientData: { id: string; name: string; document: string; email?: string; phone?: string }) => void;
}

export function ClientCreation({ open, onOpenChange, onClientCreated }: ClientCreationProps) {
  const { createCustomerAsync, isCreating } = useCustomers();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      document: "",
      email: "",
      phone: "",
    },
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Criar o cliente usando a mutation existente no hook useCustomers
      // AIDEV-NOTE: Mapeando campos do formulário para a estrutura do banco
      const customerData = {
        name: data.name,
        cpf_cnpj: data.document,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company: "", // Campo opcional
        address: "", // Campos de endereço são opcionais neste formulário simplificado
        address_number: "", // AIDEV-NOTE: Campo correto do banco
        complement: "",
        neighborhood: "", // AIDEV-NOTE: Campo correto em vez de province
        postal_code: "", // AIDEV-NOTE: Campo correto em vez de postalCode
        city: "",
        state: ""
      };
      
      // AIDEV-NOTE: Usando mutateAsync para obter o resultado diretamente
      const result = await createCustomerAsync(customerData);
      
      // AIDEV-NOTE: Validar se o resultado existe antes de acessar propriedades
      if (!result || !result.id) {
        throw new Error('Cliente criado mas não foi possível obter os dados retornados');
      }
      
      // Garantir que o cliente tem o formato esperado pelo componente pai
      // (com id, name, document, email, phone)
      const newClient = {
        id: result.id,
        name: result.name,
        document: result.cpf_cnpj?.toString() || data.document, // Usar o campo cpf_cnpj retornado ou o enviado
        email: result.email || data.email || "",
        phone: result.phone || data.phone || "",
        status: "active"
      };
      
      // AIDEV-NOTE: Fechar modal antes de chamar callback para garantir ordem correta
      form.reset();
      onOpenChange(false);
      
      // AIDEV-NOTE: Chamar callback após fechar modal para que o componente pai possa selecionar o cliente
      onClientCreated(newClient);
    } catch (error: any) {
      toast.error(`Erro ao criar cliente: ${error.message || 'Erro desconhecido'}`); 
      console.error("Erro ao criar cliente:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      {/* AIDEV-NOTE: Modal 20% menor que o padrão (98vw -> 78vw, 95vh -> 76vh) */}
      <BillingDialogContent 
        className="p-0 m-0 border-0 w-[78vw] max-w-[78vw] h-[76vh] max-h-[76vh]"
      >
        <DialogPrimitive.Title className="sr-only">
          Cadastro de Cliente
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Cadastre um novo cliente para associar ao contrato.
        </DialogPrimitive.Description>
        
        {/* AIDEV-NOTE: Container principal com estrutura flex */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* Cabeçalho com seta de voltar */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
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
              <Building className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium text-primary-foreground">Cadastro de Cliente</h2>
            </div>
            
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-primary-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>

          {/* Conteúdo principal com scroll */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            <div className="p-6">
              <div className="max-w-4xl mx-auto bg-card border border-border/50 rounded-md p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">Informações do Cliente</h3>
                    <p className="text-muted-foreground">Preencha os dados do cliente para cadastrá-lo no sistema</p>
                  </div>
                </div>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Nome / Razão Social</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nome completo ou razão social" 
                                className="bg-background/50"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Nome completo ou razão social do cliente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">CPF / CNPJ</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                                className="bg-background/50"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              CPF para pessoa física ou CNPJ para pessoa jurídica
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="email@cliente.com" 
                                className="bg-background/50"
                                type="email"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Email principal para contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Telefone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(00) 00000-0000" 
                                className="bg-background/50"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Telefone principal para contato
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-4">
                        Os campos com * são obrigatórios. Após criar o cliente, você poderá adicionar mais informações no cadastro completo.
                      </p>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => onOpenChange(false)}
                          disabled={isSubmitting}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </BillingDialogContent>
    </Dialog>
  );
}
