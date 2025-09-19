import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/hooks/useSupabase';
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from '@/components/users/UserManagement'

// Schema de validação para o formulário de edição do tenant
const tenantSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  document: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().optional(),
  active: z.boolean(),
})

type TenantFormValues = z.infer<typeof tenantSchema>

export default function TenantDetailPage() {
  const { id: tenantId } = useParams()
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      active: true,
    },
  })

  // Buscar dados do tenant
  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId || '')
        .single()
      if (error) throw error
      return data
    },
    enabled: !!tenantId,
  })

  // AIDEV-NOTE: Atualizar o formulário quando os dados do tenant forem carregados
  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name || '',
        document: tenant.document || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        active: tenant.active ?? true,
      })
    }
  }, [tenant, form])



  // Mutação para atualizar o tenant
  const mutation = useMutation({
    mutationFn: async (values: TenantFormValues) => {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: values.name,
          document: values.document,
          email: values.email,
          phone: values.phone,
          active: values.active,
        })
        .eq('id', tenantId || '')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast({
        title: 'Tenant atualizado',
        description: 'As informações do tenant foram salvas com sucesso.',
      })
      setIsEditing(false)
    },
    onError: (error) => {
      console.error('Erro ao atualizar tenant:', error)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (values: TenantFormValues) => {
    mutation.mutate(values)
  }



  if (isLoadingTenant) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">Tenant não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/admin/tenants')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">Gerenciar informações e usuários do tenant.</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? 'outline' : 'default'}>
          {isEditing ? 'Cancelar Edição' : 'Editar Tenant'}
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Tenant</CardTitle>
              <CardDescription>
                {isEditing ? 'Edite os detalhes do tenant abaixo.' : 'Visualize os detalhes do tenant.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Campos do formulário permanecem os mesmos */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing || mutation.isPending} />
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
                        <FormLabel>Documento (CNPJ)</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing || mutation.isPending} />
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
                          <Input type="email" {...field} disabled={!isEditing || mutation.isPending} />
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
                          <Input {...field} disabled={!isEditing || mutation.isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativo</FormLabel>
                          <FormDescription>
                            Controla se o tenant está ativo no sistema.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isEditing || mutation.isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
                      {mutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          {/* AIDEV-NOTE: Usando o componente UserManagement para gerenciar usuários do tenant */}
          <UserManagement tenantId={tenantId || ''} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
