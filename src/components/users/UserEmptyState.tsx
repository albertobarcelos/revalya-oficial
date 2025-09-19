import { Button } from "@/components/ui/button";
import { Users, UserPlus, RefreshCw } from "lucide-react";

interface UserEmptyStateProps {
  isSearching: boolean;
  searchTerm?: string;
  onClear?: () => void;
  onInvite?: () => void;
}

export function UserEmptyState({ isSearching, searchTerm, onClear, onInvite }: UserEmptyStateProps) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="bg-muted/20 rounded-full p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Nenhum resultado encontrado</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-4">
          Não encontramos nenhum usuário correspondente a "{searchTerm}". Tente outro termo ou limpe o filtro.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClear}
          className="gap-2"
        >
          <RefreshCw size={14} />
          Limpar busca
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="bg-primary/10 rounded-full p-4 mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-1">Nenhum usuário encontrado</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-4">
        Este tenant ainda não possui usuários. Convide pessoas para colaborar neste ambiente.
      </p>
      
      {onInvite && (
        <Button 
          onClick={onInvite}
          className="gap-2"
        >
          <UserPlus size={16} />
          Convidar Usuário
        </Button>
      )}
    </div>
  );
}
