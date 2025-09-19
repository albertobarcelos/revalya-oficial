import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EditUserRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  tenantId: string;
  onSuccess: () => void;
}

export function EditUserRoleDialog({ isOpen, onClose, user, tenantId, onSuccess }: EditUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLastAdmin, setIsLastAdmin] = useState(false);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  // Verificar se é o último administrador
  useEffect(() => {
    const checkIfLastAdmin = async () => {
      if (user.role === "TENANT_ADMIN") {
        try {
          // Extrair tenant_id do ID do usuário (isso assume que você pode extrair ou já tem essa informação)
          const { data: tenantUser } = await supabase
            .from("tenant_users")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
            
          if (tenantUser) {
            const { data: admins, error } = await supabase
              .from("tenant_users")
              .select("id")
              .eq("tenant_id", tenantUser.tenant_id)
              .eq("role", "TENANT_ADMIN");
              
            if (error) throw error;
            
            // Se só tem um admin, está tentando editar ele
            setIsLastAdmin(admins && admins.length === 1);
          }
        } catch (error) {
          console.error("Erro ao verificar administradores:", error);
        }
      }
    };
    
    if (isOpen && user.role === "TENANT_ADMIN") {
      checkIfLastAdmin();
    }
  }, [isOpen, user, supabase]);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
  };

  const handleSubmit = async () => {
    if (selectedRole === user.role) {
      onClose();
      return;
    }
    
    // Impedir rebaixamento do último administrador
    if (isLastAdmin && selectedRole !== "TENANT_ADMIN") {
      toast({
        title: "Operação não permitida",
        description: "Não é possível rebaixar o último administrador do tenant.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Tentar usar a nova função RPC
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('update_tenant_user_role_v2', {
          tenant_id_param: tenantId,
          user_id_param: user.id,
          new_role: selectedRole
        });
        
      if (rpcError) {
        console.warn("Erro na RPC update_tenant_user_role_v2:", rpcError);
        throw rpcError;
      }
      
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.message || "Não foi possível atualizar a função");
      }
      
      // Se RPC funcionou
      if (rpcResult && rpcResult.success) {
        toast({
          title: "Função atualizada",
          description: `A função do usuário foi atualizada para ${getRoleName(selectedRole)}.`,
        });
        
        onSuccess();
        onClose();
        return;
      }
      
      // Fallback para o método anterior (apenas se for necessário)
      if (!rpcResult || !rpcResult.success) {
        const { error } = await supabase
          .from("tenant_users")
          .update({ role: selectedRole })
          .eq("id", user.id);
  
        if (error) throw error;
      }

      toast({
        title: "Função atualizada",
        description: `A função do usuário foi atualizada para ${getRoleName(selectedRole)}.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar função:", error);
      toast({
        title: "Erro ao atualizar função",
        description: error.message || "Não foi possível atualizar a função do usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "TENANT_ADMIN":
        return "Administrador";
      case "TENANT_USER":
        return "Operador";
      case "ANALYST":
        return "Analista";
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Função do Usuário</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Usuário</Label>
            <div className="col-span-3 font-medium">
              {user.name || user.email}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Função
            </Label>
            <div className="col-span-3">
              <Select
                value={selectedRole}
                onValueChange={handleRoleChange}
                disabled={isSubmitting || (isLastAdmin && user.role === "TENANT_ADMIN")}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TENANT_ADMIN">Administrador</SelectItem>
                  <SelectItem value="TENANT_USER">Operador</SelectItem>
                  <SelectItem value="ANALYST">Analista</SelectItem>
                </SelectContent>
              </Select>
              {isLastAdmin && user.role === "TENANT_ADMIN" && (
                <p className="text-xs text-warning mt-1">
                  Este é o último administrador e não pode ser rebaixado.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
