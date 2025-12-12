import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { logDebug, logError } from "@/lib/logger";
import { useEffect } from "react";
import type { Profile } from "@/types/models/profile";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(50, "O nome deve ter no máximo 50 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z
    .string()
    .min(10, "Telefone inválido")
    .max(15, "Telefone inválido")
    .optional()
    .nullable(),
  company_name: z
    .string()
    .max(100, "O nome da empresa deve ter no máximo 100 caracteres")
    .optional()
    .nullable(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  profile: Partial<Profile>;
  onSave: (data: ProfileFormValues) => Promise<void>; // Agora retorna Promise
  isLoading: boolean;
}

export function ProfileForm({ profile, onSave, isLoading }: ProfileFormProps) {
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      company_name: profile.company_name || "",
    },
  });

  // Atualiza os valores do formulário quando o perfil mudar
  useEffect(() => {
    console.log("Atualizando valores do formulário:", profile);
    form.reset({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      company_name: profile.company_name || "",
    });
  }, [profile, form]);

  /**
   * handleSubmit
   * Função responsável por persistir alterações do perfil do usuário.
   * - Atualiza os campos primários (name, phone, updated_at) na tabela public.users
   * - Persiste company_name dentro do campo JSONB users.metadata.company_name
   * Observação: a coluna company_name não existe em public.users, por isso usamos metadata.
   */
  const handleSubmit = async (data: ProfileFormValues) => {
    try {
      logDebug("Atualizando perfil", "ProfileForm", data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      // Buscar metadata atual para preservar outras chaves
      const { data: currentProfile, error: fetchError } = await supabase
        .from('users')
        .select('metadata')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newMetadata = {
        ...(currentProfile?.metadata || {}),
        company_name: data.company_name ?? null,
      };

      const { error } = await supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone,
          metadata: newMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // AIDEV-NOTE: onSave agora é async e pode incluir o salvamento do avatar
      await onSave(data);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
      });
    } catch (error: any) {
      logError("Erro ao atualizar perfil", "ProfileForm", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar o perfil",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input {...field} className="text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  {...field}
                  type="email" 
                  className="text-foreground bg-muted"
                  readOnly
                />
              </FormControl>
              <FormDescription>
                Este é o email associado à sua conta
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} className="text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa</FormLabel>
              <FormControl>
                <Input {...field} className="text-foreground" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline" 
            onClick={async () => {
              const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
              let redirectUrl = 'http://localhost:8080/reset-password';
              try {
                const u = new URL(baseUrl);
                if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
                  u.protocol = 'http:';
                  u.port = '8080';
                }
                u.pathname = '/reset-password';
                redirectUrl = u.toString();
              } catch {}
              const { error } = await supabase.auth.resetPasswordForEmail(profile.email || '', {
                redirectTo: redirectUrl,
              });
              if (!error) {
                toast({
                  title: "Email enviado",
                  description: "Verifique seu email para alterar a senha",
                });
              }
            }}
          >
            Alterar Senha
          </Button>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}
