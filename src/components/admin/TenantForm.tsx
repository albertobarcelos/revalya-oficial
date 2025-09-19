import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { ColorPicker } from '@/components/ui/color-picker'

const tenantFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  active: z.boolean().default(true),
  branding: z.object({
    primary_color: z.string(),
    secondary_color: z.string(),
    logo_url: z.string().nullable(),
  }),
  settings: z.record(z.any()).default({}),
})

type TenantFormData = z.infer<typeof tenantFormSchema>

interface TenantFormProps {
  initialData?: Partial<TenantFormData>
  onSuccess?: () => void
  onCancel?: () => void
}

export function TenantForm({ initialData, onSuccess, onCancel }: TenantFormProps) {
  // AIDEV-NOTE: CAMADA 1 - Validação de acesso global para admin
  const { hasAccess, isLoading: accessLoading } = useTenantAccessGuard({
    requireTenant: false,
    requiredRole: 'ADMIN'
  });

  // AIDEV-NOTE: Bloqueio imediato se acesso negado
  if (!accessLoading && !hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Acesso Negado</h3>
          <p className="text-gray-500">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      active: true,
      branding: {
        primary_color: '#00B4D8',
        secondary_color: '#0077B6',
        logo_url: null,
      },
      settings: {},
      ...initialData,
    },
  })

  // AIDEV-NOTE: CAMADA 2 - Mutation segura com audit logs e validação de acesso
  const mutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      // AIDEV-NOTE: Validação adicional de acesso antes da operação
      if (!hasAccess) {
        throw new Error('Acesso negado para esta operação');
      }

      // Gera o slug baseado no nome
      const slug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      let result;
      const isUpdate = !!initialData?.id;
      
      if (isUpdate) {
        const { data: updateResult, error } = await supabase
          .from('tenants')
          .update({ ...data, slug })
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        result = updateResult;
      } else {
        const { data: insertResult, error } = await supabase
          .from('tenants')
          .insert([{ ...data, slug }])
          .select()
          .single();
          
        if (error) throw error;
        result = insertResult;
      }

      // AIDEV-NOTE: CAMADA 3 - Log de auditoria para operações de tenant
      await supabase.from('audit_logs').insert({
        action: isUpdate ? 'UPDATE_TENANT' : 'CREATE_TENANT',
        resource: `tenant:${result.id}`,
        metadata: {
          tenant_id: result.id,
          tenant_name: data.name,
          operation_type: isUpdate ? 'update' : 'create',
          previous_data: isUpdate ? initialData : null
        }
      });

      return result;
    },
    onSuccess: (result) => {
      // AIDEV-NOTE: CAMADA 4 - Invalidação segura de cache
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-details', result?.id] });
      
      toast({
        title: initialData ? 'Tenant atualizado' : 'Tenant criado',
        description: initialData
          ? 'O tenant foi atualizado com sucesso'
          : 'O tenant foi criado com sucesso',
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Erro ao salvar tenant:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o tenant',
        variant: 'destructive',
      });
    },
  })

  // AIDEV-NOTE: CAMADA 5 - Validação final antes do submit
  const onSubmit = (data: TenantFormData) => {
    if (!hasAccess) {
      toast({
        title: 'Erro de Acesso',
        description: 'Você não tem permissão para realizar esta operação',
        variant: 'destructive',
      });
      return;
    }
    mutation.mutate(data);
  }

  // AIDEV-NOTE: Estado de carregamento durante validação de acesso
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Nome da empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="00.000.000/0000-00" {...field} />
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
                <Input type="email" placeholder="email@empresa.com.br" {...field} />
              </FormControl>
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
                <Input placeholder="(00) 00000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Determina se o tenant está ativo e pode acessar o sistema
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personalização da Marca</h3>
          
          <FormField
            control={form.control}
            name="branding.primary_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor Primária</FormLabel>
                <FormControl>
                  <ColorPicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="branding.secondary_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor Secundária</FormLabel>
                <FormControl>
                  <ColorPicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            loading={mutation.isPending}
            disabled={!hasAccess || mutation.isPending}
          >
            {initialData ? 'Atualizar' : 'Criar'} Tenant
          </Button>
        </div>
      </form>
    </Form>
  )
}
