import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContracts } from "@/hooks/useContracts";

interface ContractStatusDropdownProps {
  contractId: string;
  currentStatus: string;
  disabled?: boolean;
}

// AIDEV-NOTE: Componente dropdown para alterar status do contrato diretamente na lista
export function ContractStatusDropdown({ 
  contractId, 
  currentStatus, 
  disabled = false 
}: ContractStatusDropdownProps) {
  const { updateContractStatusMutation } = useContracts();

  // Função para obter a cor e texto do badge baseado no status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { 
          label: "Ativo", 
          className: "bg-success hover:bg-success/90 text-white" 
        };
      case "DRAFT":
        return { 
          label: "Rascunho", 
          className: "border-muted-foreground text-muted-foreground" 
        };
      case "SUSPENDED":
        return { 
          label: "Suspenso", 
          className: "bg-orange-500 hover:bg-orange-600 text-white" 
        };
      case "CANCELED":
        return { 
          label: "Cancelado", 
          className: "bg-destructive hover:bg-destructive/90 text-white" 
        };
      case "EXPIRED":
        return { 
          label: "Expirado", 
          className: "bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
        };
      default:
        return { 
          label: status, 
          className: "" 
        };
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || disabled) return;
    
    try {
      await updateContractStatusMutation.mutateAsync({
        contractId,
        newStatus
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const currentDisplay = getStatusDisplay(currentStatus);

  return (
    <Select 
      value={currentStatus} 
      onValueChange={handleStatusChange}
      disabled={disabled || updateContractStatusMutation.isPending}
    >
      <SelectTrigger className="h-6 w-fit border-0 bg-transparent p-0 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 justify-start gap-1">
        <Badge 
          variant={currentStatus === "DRAFT" ? "outline" : "default"}
          className={currentDisplay.className}
        >
          {currentDisplay.label}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DRAFT">
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            Rascunho
          </Badge>
        </SelectItem>
        <SelectItem value="ACTIVE">
          <Badge className="bg-success hover:bg-success/90 text-white">
            Ativo
          </Badge>
        </SelectItem>
        <SelectItem value="SUSPENDED">
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            Suspenso
          </Badge>
        </SelectItem>
        <SelectItem value="CANCELED">
          <Badge className="bg-destructive hover:bg-destructive/90 text-white">
            Cancelado
          </Badge>
        </SelectItem>
        <SelectItem value="EXPIRED">
          <Badge className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            Expirado
          </Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
