import { Button } from "@/components/ui/button";
import { UserPlus, Mail } from "lucide-react";

interface InviteEmptyStateProps {
  onInvite?: () => void;
}

export function InviteEmptyState({ onInvite }: InviteEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="bg-warning/10 rounded-full p-4 mb-4">
<Mail className="h-8 w-8 text-warning" />
      </div>
      <h3 className="text-lg font-medium mb-1">Nenhum convite pendente</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-4">
        Não há convites pendentes no momento. Convide novos usuários para colaborar neste tenant.
      </p>
      
      {onInvite && (
        <Button 
          onClick={onInvite}
          className="gap-2"
          variant="outline"
        >
          <UserPlus size={16} />
          Convidar Usuário
        </Button>
      )}
    </div>
  );
}
