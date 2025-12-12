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
      
      // AIDEV-NOTE: Obter o ID do usuário atual para o campo invited_by
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      
      // AIDEV-NOTE: Verificar se o usuário já existe (opcional - não crítico)
      // Esta verificação pode falhar devido a RLS, mas não impede a criação do convite
      try {
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("email", values.email)
          .single();
        
        // Se o usuário já existe, apenas logamos (não é erro)
        if (existingUser && !userError) {
          console.log('Usuário já existe na plataforma:', values.email);
        }
      } catch (checkError: any) {
        // AIDEV-NOTE: Erro 406 ou outros erros de RLS não impedem a criação do convite
        // Apenas logamos o erro mas continuamos o fluxo
        if (checkError?.code !== "PGRST116") {
          console.warn('Não foi possível verificar se usuário existe (não crítico):', checkError?.message || checkError);
        }
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
      
      // AIDEV-NOTE: Buscar informações do tenant para o email
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();
      
      if (tenantError) {
        console.warn('Erro ao buscar informações do tenant:', tenantError);
      }
      
      // AIDEV-NOTE: Gerar token único para o convite
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
      
      // AIDEV-NOTE: Criar o convite incluindo o campo invited_by obrigatório
      // Tentar incluir token e expires_at, mas se a tabela não tiver esses campos, usar apenas o básico
      const inviteData: any = {
        tenant_id: tenantId,
        email: values.email,
        role: values.role,
        status: "PENDING",
        invited_by: user.id, // AIDEV-NOTE: Campo obrigatório - ID do usuário que está enviando o convite
      };
      
      // AIDEV-NOTE: Tentar adicionar token e expires_at (podem não existir na tabela)
      try {
        inviteData.token = token;
        inviteData.expires_at = expiresAt.toISOString();
      } catch (e) {
        console.warn('Campos token/expires_at podem não estar disponíveis na tabela');
      }
      
      const { data: newInvite, error } = await supabase
        .from("tenant_invites")
        .insert(inviteData)
        .select()
        .single();
      
      if (error) throw error;
      
      // AIDEV-NOTE: Se o convite não tiver token, usar o ID como token
      const inviteToken = newInvite?.token || newInvite?.id || token;
      
      // AIDEV-NOTE: Enviar email de convite usando edge function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invite-email', {
          body: {
            email: values.email,
            token: inviteToken,
            type: 'tenant',
            tenantName: tenant?.name || 'o tenant',
            inviterName: user.email || 'um administrador',
          },
        });
        
        if (emailError) {
          console.error('Erro ao enviar email de convite:', {
            error: emailError,
            message: emailError.message,
            context: emailError.context,
            status: emailError.status,
          });
          
          // AIDEV-NOTE: Não bloqueia o fluxo, mas avisa o usuário
          // O convite foi criado com sucesso, apenas o email falhou
          toast({
            title: "Convite criado",
            description: `Convite criado com sucesso, mas houve um erro ao enviar o email automaticamente. Você pode reenviar o email depois usando o botão "Reenviar".`,
            variant: "default",
          });
        } else {
          console.log('Email enviado com sucesso:', emailData);
          toast({
            title: "Convite enviado",
            description: `Um convite foi enviado para ${values.email}.`,
          });
        }
      } catch (emailErr: any) {
        console.error('Erro ao chamar função de envio de email:', {
          error: emailErr,
          message: emailErr.message,
          stack: emailErr.stack,
        });
        
        // AIDEV-NOTE: Não bloqueia o fluxo - o convite foi criado
        toast({
          title: "Convite criado",
          description: `Convite criado com sucesso. O email não foi enviado automaticamente (${emailErr.message || 'erro desconhecido'}). Você pode reenviar depois.`,
          variant: "default",
        });
      }
      
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
