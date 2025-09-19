import React from "react";
import { ArrowLeft, Save, FileText, CheckCircle, Sparkles, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContractFormHeaderProps {
  onBack?: () => void;
  title?: string;
  contractNumber?: string;
  mode?: "create" | "edit" | "view";
  className?: string;
}

export function ContractFormHeader({ 
  onBack, 
  title = "Novo Contrato",
  contractNumber,
  mode = "create",
  className 
}: ContractFormHeaderProps) {
  // Gerar número do contrato se não existir (para novos contratos)
  const displayNumber = contractNumber || `${new Date().getFullYear()}${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  
  const getTitle = () => {
    return `Contrato de Serviço N° ${displayNumber}`;
  };

  const getSubtitle = () => {
    if (mode === "create") {
      return "Criando novo contrato de prestação de serviços";
    } else if (mode === "edit") {
      return "Editando contrato existente";
    } else {
      return "Visualizando detalhes do contrato";
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-r from-primary via-primary/85 to-primary/60",
      "border-b border-white/10",
      className
    )}>
      {/* Efeito de brilho sutil */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
      
      <div className="relative flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                {getTitle()}
                {mode === "create" && <Sparkles className="h-4 w-4 text-yellow-300/80" />}
              </h1>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {getSubtitle()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
            <CheckCircle className="h-3 w-3 text-success/70" />
            <span className="text-xs text-white/90 font-medium">Sistema Ativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
