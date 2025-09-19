import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription, 
  DialogHeader
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Save, User } from "lucide-react";
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
  const { createCustomer, isCreating } = useCustomers();
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
      
      const result = await createCustomer(customerData);
      
      // Garantir que o cliente tem o formato esperado pelo componente pai
      // (com id, name, document, email, phone)
      const newClient = {
        id: result.id,
        name: result.name,
        document: result.cpf_cnpj || data.document, // Usar o campo cpf_cnpj retornado ou o enviado
        email: result.email || data.email || "",
        phone: result.phone || data.phone || "",
        status: "active"
      };
      
      toast.success("Cliente criado com sucesso!");
      onClientCreated(newClient);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao criar cliente: ${error.message || 'Erro desconhecido'}`); 
      console.error("Erro ao criar cliente:", error);
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
            <DialogTitle>Cadastro de Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente para associar ao contrato.
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
              <Building className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Cadastro de Cliente</h2>
            </div>
            
            <Button 
              variant="ghost" 
              className="gap-1 hover:bg-primary-foreground/10 text-primary-foreground"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              <span>Salvar Cliente</span>
            </Button>
          </div>

          {/* Conteúdo principal */}
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
      </DialogContent>
    </Dialog>
  );
}
