import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  role: z.enum(["TENANT_USER", "TENANT_ADMIN", "ANALYST"], {
    required_error: "Por favor, selecione uma função",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

export function InviteUserDialog({ isOpen, onClose, tenantId, onSuccess }: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "TENANT_USER",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Verificar se o usuário já existe
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", values.email)
        .single();
        
      if (userError && userError.code !== "PGRST116") {
        throw userError;
      }
      
      // Verificar se já existe um convite pendente para este email neste tenant
      const { data: existingInvite, error: inviteError } = await supabase
        .from("tenant_invites")
        .select("id")
        .eq("email", values.email)
        .eq("tenant_id", tenantId)
        .eq("status", "PENDING");
        
      if (inviteError) {
        throw inviteError;
      }
      
      if (existingInvite && existingInvite.length > 0) {
        toast({
          title: "Convite já existe",
          description: "Já existe um convite pendente para este email.",
          variant: "destructive",
        });
        return;
      }
      
      // Criar o convite
      const { error } = await supabase.from("tenant_invites").insert({
        tenant_id: tenantId,
        email: values.email,
        role: values.role,
        status: "PENDING",
        // Aqui poderia haver um código para gerar um token único para o convite
      });
      
      if (error) throw error;
      
      // Em um sistema real, aqui seria enviado um email com o link de convite
      
      toast({
        title: "Convite enviado",
        description: `Um convite foi enviado para ${values.email}.`,
      });
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast({
        title: "Erro ao enviar convite",
        description: "Não foi possível enviar o convite. Tente novamente.",
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
          <DialogTitle>Convidar Usuário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario@exemplo.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Um convite será enviado para este email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TENANT_USER">Operador</SelectItem>
                        <SelectItem value="TENANT_ADMIN">Administrador</SelectItem>
                        <SelectItem value="ANALYST">Analista</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Administradores podem gerenciar usuários e configurações do tenant.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
