import React from "react";
import { Loader2, FileText, Users, DollarSign } from "lucide-react";
import { useContractForm } from "./ContractFormProvider";

interface ContractEditLoaderProps {
  children: React.ReactNode;
}

export function ContractEditLoader({ children }: ContractEditLoaderProps) {
  const { isLoadingContract, contractData, isEditMode } = useContractForm();

  // Se não estiver em modo de edição ou não estiver carregando, renderizar filhos normalmente
  if (!isEditMode || !isLoadingContract) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Overlay de carregamento */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Carregando Contrato</h3>
              <p className="text-sm text-muted-foreground">Preparando dados para edição...</p>
            </div>
          </div>

          {/* Indicadores de progresso */}
          <div className="space-y-3">
            {/* Dados básicos */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <FileText className="h-3 w-3 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">Dados básicos do contrato</span>
              <div className="ml-auto">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Cliente */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-muted-foreground">Informações do cliente</span>
              <div className="ml-auto">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Serviços */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <DollarSign className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Serviços e valores</span>
              <div className="ml-auto">
                <Loader2 className="h-3 w-3 text-purple-500 animate-spin" />
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Carregando...</span>
              <span>75%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>

          {/* Dica */}
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground text-center">
              ⚡ Carregamento otimizado - todos os dados em uma única consulta
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo (renderizado mas coberto pelo overlay) */}
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
} 
