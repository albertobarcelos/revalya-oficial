import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useContractForm } from "./ContractFormProvider";

interface ContractLoadingManagerProps {
  contractId?: string;
  children: React.ReactNode;
}

export function ContractLoadingManager({ contractId, children }: ContractLoadingManagerProps) {
  // Estado de carregamento local
  const [loadingState, setLoadingState] = useState<'none' | 'partial' | 'complete'>('none');
  
  // Usar apenas o contexto do formulário para evitar conflito de hooks
  const { isLoadingContract, contractData } = useContractForm();

  // Efeito para mostrar indicador refinado de carregamento
  useEffect(() => {
    if (isLoadingContract && contractId) {
      // Mostrar estado de carregamento
      setLoadingState('partial');
      
      // Mostrar discretamente que estamos carregando os dados
      toast.info("Carregando dados do contrato...", { 
        id: "loading-contract",
        duration: 2000
      });
    } else if (!isLoadingContract && contractData) {
      // Carregamento concluído
      setLoadingState('complete');
      
      // Limpar toast de carregamento
      toast.dismiss("loading-contract");
      
      // Limpar estado após um breve momento
      const timeout = setTimeout(() => setLoadingState('none'), 500);
      return () => clearTimeout(timeout);
    } else if (!isLoadingContract && !contractData && contractId) {
      // Falha no carregamento
      setLoadingState('none');
      toast.dismiss("loading-contract");
    }
  }, [isLoadingContract, contractId, contractData]);

  // Função placeholder para compatibilidade com componentes filhos
  const isFieldLoadingFn = (fieldName: string): boolean => {
    return isLoadingContract;
  };

  return (
    <>
      {/* Mostrar indicador de carregamento apenas quando necessário */}
      {loadingState === 'partial' && contractId && (
        <div className="w-full py-1 px-4 flex items-center justify-center bg-primary/5 border-b border-border/30">
          <div className="text-xs py-1 text-center flex items-center gap-1">
            <span className="text-primary font-medium flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Carregando dados do contrato
            </span>
          </div>
        </div>
      )}
      
      {/* Mostrar skeleton completo durante carregamento inicial */}
      {isLoadingContract && contractId ? (
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-slate-700 rounded mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 w-full bg-slate-700 rounded"></div>
              <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="h-32 bg-slate-700 rounded"></div>
              <div className="h-32 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        React.cloneElement(children as React.ReactElement, { 
          contract: contractData, 
          isLoadingContract, 
          isFieldLoading: isFieldLoadingFn 
        })
      )}
    </>
  );
}
