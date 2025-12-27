import React from "react";
import { ArrowLeft, User, Sparkles, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClientDialogHeaderProps {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  mode?: "create" | "edit" | "view";
  className?: string;
  onClose?: () => void;
}

export function ClientDialogHeader({ 
  onBack, 
  title,
  subtitle,
  mode = "create",
  className,
  onClose
}: ClientDialogHeaderProps) {
  
  const getTitle = () => {
    if (title) return title;
    return mode === "create" ? "Novo Cliente" : "Editar Cliente";
  };

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    if (mode === "create") {
      return "Preencha os dados para criar um novo cliente";
    } else if (mode === "edit") {
      return "Atualize as informações do cliente";
    } else {
      return "Visualizando detalhes do cliente";
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
      
      <div className="relative flex items-center justify-between p-4 z-10">
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
            <div className="p-2 bg-white/10 rounded-lg">
              {mode === "create" ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <UserCog className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                {getTitle()}
                {mode === "create" && <Sparkles className="h-4 w-4 text-yellow-300/80" />}
              </h1>
              <p className="text-xs text-white/70 flex items-center gap-1">
                {getSubtitle()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Close button if needed, though Dialog usually has one. 
            We might need to hide the default Dialog close button and add a custom one here if we want it in the header.
            For now, let's rely on the Dialog's default close or add one here if strictly following the contract style.
            The contract style has a back button. Dialogs usually have an X.
        */}
      </div>
    </div>
  );
}
