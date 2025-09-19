import React from "react";
import { ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CancelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function CancelButton({ onClick, disabled = false, className = "" }: CancelButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200
              ${disabled 
                ? 'text-muted-foreground/50 cursor-not-allowed' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              ${className}`}
            aria-label="Voltar à lista"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Voltar</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Voltar à lista de contratos</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
