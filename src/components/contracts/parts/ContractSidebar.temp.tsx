import React from "react";
import { useFormContext } from "react-hook-form";
import { CreditCard, Calendar, Receipt, ArrowRight, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { formatCurrency } from "@/lib/utils";
import { ContractFormValues } from "../schema/ContractFormSchema";

interface ContractSidebarProps {
  totalValues: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  compact?: boolean;
}

export function ContractSidebar({ totalValues, compact = false }: ContractSidebarProps) {
  const form = useFormContext<ContractFormValues>();
  const billingType = form.watch("billing_type");

  return (
    <div className="h-full flex flex-col">
      {/* Resumo do Contrato */}
      <div className={compact ? "mb-2" : "mb-6"}>
        <h2 className={compact ? "text-xs font-medium mb-1.5 flex items-center gap-1 text-primary" : "text-lg font-medium mb-4 flex items-center gap-2 text-primary"}>
          <span className={compact ? "inline-block h-1 w-1 rounded-full bg-primary" : "inline-block h-2 w-2 rounded-full bg-primary"}></span>
          Resumo do Contrato
        </h2>
        
        {/* Card de Valores */}
        <div className={compact ? "bg-card border border-border/50 p-2 shadow-sm mb-2" : "bg-card rounded-xl border border-border/50 p-5 shadow-sm mb-4"}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Valores do Contrato</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(totalValues.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Descontos:</span>
              <span className="text-green-600">- {formatCurrency(totalValues.discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Impostos:</span>
              <span>{formatCurrency(totalValues.tax)}</span>
            </div>
            <div className="h-px w-full bg-border/50 my-2"></div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(totalValues.total)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Configurações de Faturamento */}
      <div className={compact ? "mb-2" : "mb-6"}>
        <h2 className={compact ? "text-xs font-medium mb-1.5 flex items-center gap-1 text-primary" : "text-lg font-medium mb-4 flex items-center gap-2 text-primary"}>
          <span className={compact ? "inline-block h-1 w-1 rounded-full bg-primary" : "inline-block h-2 w-2 rounded-full bg-primary"}></span>
          Configurações de Faturamento
        </h2>
        
        <div className={compact ? "bg-card border border-border/50 p-2 shadow-sm space-y-2" : "bg-card rounded-xl border border-border/50 p-5 shadow-sm space-y-4"}>
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <FormLabel className="text-sm font-medium m-0">Número de Parcelas</FormLabel>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    className="bg-background/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Quantidade de parcelas para faturamento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {!compact && (
            <FormField
              control={form.control}
              name="anticipate_weekends"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Antecipar Finais de Semana
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Antecipar vencimentos para sexta-feira
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>
      </div>
      
      {/* Informações Adicionais - apenas mostrar se não estiver no modo compacto */}
      {!compact && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
            Informações Adicionais
          </h2>
          
          <div className="bg-card rounded-xl border border-border/50 p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="h-3.5 w-3.5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-medium">Documentos Anexos</p>
                <p className="text-xs text-muted-foreground">Você poderá adicionar documentos após a criação do contrato.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Receipt className="h-3.5 w-3.5 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-medium">Faturamentos</p>
                <p className="text-xs text-muted-foreground">Os faturamentos serão gerados automaticamente após a criação do contrato.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão de Finalizar - apenas mostrar se não estiver no modo compacto */}
      {!compact && (
        <div className="mt-auto">
          <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
            <span>Finalizar Contrato</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Ao finalizar, o contrato será enviado para aprovação interna.
          </p>
        </div>
      )}
    </div>
  );
}
