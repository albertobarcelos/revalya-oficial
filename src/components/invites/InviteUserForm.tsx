import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupabase } from '@/hooks/useSupabase';
import { inviteService } from '@/services/inviteService';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  role: z.enum(['TENANT_USER', 'TENANT_ADMIN'], {
    required_error: 'Por favor, selecione um papel',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteUserFormProps {
  tenantId: string;
  onSuccess?: () => void;
}

export function InviteUserForm({ tenantId, onSuccess }: InviteUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'TENANT_USER',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const { data, error } = await inviteService.createInvite(
        supabase,
        tenantId,
        values.email,
        values.role
      );

      if (error) {
        throw error;
      }

      toast({
        title: 'Convite enviado',
        description: `Um convite foi enviado para ${values.email}.`,
      });

      form.reset();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: 'Erro ao enviar convite',
        description: error.message || 'Não foi possível enviar o convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormLabel>Papel</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="TENANT_USER">Usuário</SelectItem>
                  <SelectItem value="TENANT_ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Administradores podem gerenciar usuários e configurações do tenant.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar Convite'}
        </Button>
      </form>
    </Form>
  );
}
