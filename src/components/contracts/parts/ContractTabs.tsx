import React from "react";
import { useFormContext } from "react-hook-form";
import { 
  FileText, 
  Package, 
  Percent, 
  Building2, 
  Info, 
  Users, 
  UserCog, 
  MessageSquare, 
  Truck 
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { ContractFormValues } from "../schema/ContractFormSchema";
import { ContractServices } from "./ContractServices";

interface ContractTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  services: any[];
  compact?: boolean;
}

export function ContractTabs({ activeTab, setActiveTab, services, compact = false }: ContractTabsProps) {
  const form = useFormContext<ContractFormValues>();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className={compact ? "mb-1.5" : "mb-3"}>
        {!compact && (
          <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
            Detalhes do Contrato
          </h2>
        )}
        <TabsList className={`w-full grid ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'} gap-1 bg-transparent p-0`}>
          <TabsTrigger 
            value="servico" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Serviço</span>
          </TabsTrigger>
          <TabsTrigger 
            value="produtos" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Produtos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="descontos" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Percent className="h-4 w-4" />
            <span className="text-xs font-medium">Descontos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="departamentos" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Departamentos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="informacoes" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Info className="h-4 w-4" />
            <span className="text-xs font-medium">Informações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="limite" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Limite Cliente</span>
          </TabsTrigger>
          <TabsTrigger 
            value="vendedor" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <UserCog className="h-4 w-4" />
            <span className="text-xs font-medium">Vendedor</span>
          </TabsTrigger>
          <TabsTrigger 
            value="observacoes" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">Observações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="faturamento" 
            className="rounded-lg border border-border/50 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all duration-200 flex flex-col items-center py-2 gap-1 hover:bg-muted/50 text-xs"
          >
            <Truck className="h-4 w-4" />
            <span className="text-xs font-medium">Faturamento</span>
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="servico" className="mt-4">
        <ContractServices services={services} />
      </TabsContent>
      
      <TabsContent value="produtos" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Produtos em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="descontos" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Descontos Personalizados em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="departamentos" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Departamentos em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="informacoes" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Informações Adicionais em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="limite" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Limite para o Cliente em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="vendedor" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Vendedor e Conta Fiscal em desenvolvimento.
        </div>
      </TabsContent>
      
      <TabsContent value="observacoes" className="mt-4">
        <FormField
          control={form.control}
          name="internal_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações Internas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione observações internas sobre este contrato..."
                  className="resize-none h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Estas observações são apenas para uso interno e não serão visíveis para o cliente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
      
      <TabsContent value="faturamento" className="mt-4">
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade de Faturamento e Transporte em desenvolvimento.
        </div>
      </TabsContent>
    </Tabs>
  );
}
