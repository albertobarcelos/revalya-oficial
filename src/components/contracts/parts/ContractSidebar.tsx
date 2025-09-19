import React from "react";
import { useFormContext } from "react-hook-form";
import { ArrowRight, Wallet, DollarSign, PiggyBank, Save, X, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useSupabase } from '@/hooks/useSupabase';

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
import { Separator } from "@/components/ui/separator";

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
  onSave?: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isViewMode?: boolean;
  onEditRequest?: () => void;
  contractId?: string;
}

export function ContractSidebar({ totalValues, compact = false, onSave, onCancel, isSubmitting = false, isViewMode, onEditRequest, contractId }: ContractSidebarProps) {
  const form = useFormContext<ContractFormValues>();
  const billingType = form.watch("billing_type");
  const [searchParams] = useSearchParams();
  const { supabase } = useSupabase();
  const [isBilling, setIsBilling] = React.useState(false);
  
  // AIDEV-NOTE: Verificar se o contrato veio do kanban de faturamento
  const fromBilling = searchParams.get('from') === 'billing';
  
  // AIDEV-NOTE: Função para processar o faturamento do contrato
  const handleBilling = async () => {
    if (!contractId) {
      toast.error('ID do contrato não encontrado');
      return;
    }
    
    setIsBilling(true);
    
    try {
      // AIDEV-NOTE: Não é mais necessário atualizar o campo 'billed' do contrato
      // pois agora controlamos o status através da existência de registros na tabela charges
      
      toast.success('Contrato faturado com sucesso!');
      
      // Redirecionar de volta para o kanban após 1 segundo
      setTimeout(() => {
        window.history.back();
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao faturar contrato:', error);
      toast.error('Erro ao processar faturamento');
    } finally {
      setIsBilling(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* A funcionalidade foi movida para a sidebar esquerda */}
      {/* Resumo do Contrato */}
      <div className={compact ? "mb-2" : "mb-6"}>
        <h2 className={compact ? "text-xs font-medium mb-1.5 flex items-center gap-1 text-primary" : "text-lg font-medium mb-4 flex items-center gap-2 text-primary"}>
          <div className={compact ? "w-2 h-2 bg-gradient-to-r from-success to-success/80 rounded-full" : "w-3 h-3 bg-gradient-to-r from-success to-success/80 rounded-full"}></div>
          Resumo do Contrato
        </h2>
        
        {/* Card de Valores */}
        <div className={compact ? "bg-gradient-to-br from-card to-card/80 border border-border/50 p-3 shadow-lg rounded-xl mb-2" : "bg-gradient-to-br from-card to-card/80 rounded-xl border border-border/50 p-6 shadow-lg mb-4 relative overflow-hidden"}>
          {!compact && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full -translate-y-10 translate-x-10" />
          )}
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-success to-success/80 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold">Valores do Contrato</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(totalValues.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descontos:</span>
                <span className="text-success font-medium">- {formatCurrency(totalValues.discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Impostos:</span>
                <span className="font-medium">{formatCurrency(totalValues.tax)}</span>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-3"></div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-primary bg-primary/10 px-3 py-1 rounded-lg">{formatCurrency(totalValues.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AIDEV-NOTE: Botão de Faturar - aparece apenas quando vem do kanban de faturamento */}
      {isViewMode && fromBilling && (
        <div className="mb-4">
          <Button 
            onClick={handleBilling}
            disabled={isBilling}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isBilling ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                <span>Faturar Contrato</span>
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Ao faturar, será gerada uma cobrança automaticamente.
          </p>
        </div>
      )}

      
      {/* Botão de Finalizar no final da sidebar - botões de ação foram movidos para a sidebar esquerda */}
      {!compact && !onCancel && (
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
