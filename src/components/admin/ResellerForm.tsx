import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

const resellerSchema = z.object({
  name: z.string().min(1, 'Nome da empresa é obrigatório'),
  document: z.string().min(14, 'CNPJ inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  active: z.boolean(),
  commission_rate: z.number().min(0).max(100).default(0),
})

type ResellerFormData = z.infer<typeof resellerSchema>

type ResellerFormProps = {
  reseller?: {
    id: string
    name: string
    document: string
    email: string
    phone: string
    active: boolean
    commission_rate: number
  } | null
  onSuccess: () => void
}

export function ResellerForm({ reseller, onSuccess }: ResellerFormProps) {
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
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ResellerFormData>({
    resolver: zodResolver(resellerSchema),
    defaultValues: {
      name: reseller?.name || '',
      document: reseller?.document || '',
      email: reseller?.email || '',
      phone: reseller?.phone || '',
      active: reseller?.active ?? true,
      commission_rate: reseller?.commission_rate || 0,
    },
  })

  // AIDEV-NOTE: CAMADA 2 - Função de submit segura com validação de acesso e audit logs
  const onSubmit = async (data: ResellerFormData) => {
    // AIDEV-NOTE: CAMADA 3 - Validação adicional de acesso antes da operação
    if (!hasAccess) {
      toast({
        title: 'Erro de Acesso',
        description: 'Você não tem permissão para realizar esta operação',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true)
      const isUpdate = !!reseller;
      let result;

      // Se for edição, atualiza o revendedor
      if (isUpdate) {
        const { data: updateResult, error } = await supabase
          .from('resellers')
          .update({
            name: data.name,
            document: data.document,
            phone: data.phone,
            active: data.active,
            commission_rate: data.commission_rate,
          })
          .eq('id', reseller.id)
          .select()
          .single();

        if (error) throw error;
        result = updateResult;

        toast({
          title: 'Revendedor atualizado com sucesso',
        });
      } 
      // Se for novo cadastro
      else {
        const { data: insertResult, error: resellerError } = await supabase
          .from('resellers')
          .insert({
            name: data.name,
            document: data.document,
            email: data.email,
            phone: data.phone,
            active: data.active,
            commission_rate: data.commission_rate,
          })
          .select()
          .single();

        if (resellerError) throw resellerError;
        result = insertResult;

        toast({
          title: 'Revendedor cadastrado com sucesso',
        });
      }

      // AIDEV-NOTE: CAMADA 4 - Log de auditoria para operações de revendedor
      await supabase.from('audit_logs').insert({
        action: isUpdate ? 'UPDATE_RESELLER' : 'CREATE_RESELLER',
        resource: `reseller:${result.id}`,
        metadata: {
          reseller_id: result.id,
          reseller_name: data.name,
          operation_type: isUpdate ? 'update' : 'create',
          previous_data: isUpdate ? reseller : null,
          new_data: data
        }
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar revendedor:', error);
      toast({
        title: 'Erro ao salvar revendedor',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
                <Input placeholder="Empresa LTDA" {...field} />
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
                <Input 
                  type="email" 
                  placeholder="contato@empresa.com.br" 
                  {...field}
                  disabled={!!reseller} // Desabilita edição de email
                />
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
          name="commission_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taxa de Comissão (%)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.01"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === 'true')}
                defaultValue={field.value ? 'true' : 'false'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !hasAccess}
        >
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </Form>
  )
}
