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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft, Users, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Schema de validação para o formulário de edição do tenant
const tenantSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  document: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().optional(),
  active: z.boolean(),
})

type TenantFormValues = z.infer<typeof tenantSchema>

// Tipo para os dados da tabela tenant_users, incluindo dados do usuário relacionado
type TenantUser = {
  id: string; // ID da relação tenant_user
  tenant_id: string;
  user_id: string;
  role: string; // Papel do usuário NESTE tenant (TENANT_USER, TENANT_ADMIN)
  created_at: string;
  users: { // Dados do usuário relacionado (da tabela users)
    id: string;
    email: string;
    // Inclua outros campos de users se necessário
  } | null; // Pode ser null se a relação falhar ou user for deletado
}

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
    onSuccess: (data) => {
      if (data) {
        form.reset({
          name: data.name,
          document: data.document || '',
          email: data.email,
          phone: data.phone || '',
          active: data.active,
        })
      }
    }
  })

  // Buscar usuários do tenant via tabela tenant_users
  const { data: tenantUsers, isLoading: isLoadingUsers } = useQuery<TenantUser[]>({
    queryKey: ['tenantUsers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users') // Busca na tabela de junção
        .select(`
          id,
          tenant_id,
          user_id,
          role, 
          created_at,
          users ( 
            id,
            email
          )
        `)
        .eq('tenant_id', tenantId || '') // Filtra pelo tenant_id
      if (error) {
        console.error("Erro ao buscar usuários do tenant (tenant_users):", error);
        throw error;
      }
      return data || []; // Retorna array vazio se data for null
    },
    enabled: !!tenantId,
  })

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

  // Usa o 'role' da tabela tenant_users
  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'TENANT_ADMIN':
        return <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/10">Administrador</Badge>;
      case 'TENANT_USER':
        return <Badge variant="outline" className="bg-muted text-muted-foreground hover:bg-muted">Usuário</Badge>;
      default:
        return <Badge variant="outline">{role || 'Papel não definido'}</Badge>;
    }
  };

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
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Tenant</CardTitle>
              <CardDescription>
                Lista de usuários com acesso a este tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Carregando usuários...</span>
                </div>
              ) : tenantUsers?.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">Nenhum usuário encontrado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Este tenant ainda não possui usuários associados.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Papel no Tenant</TableHead>
                        <TableHead>Data de Acesso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantUsers?.map((tu) => (
                        <TableRow key={tu.id}> {/* Usa o ID da relação tenant_user */}
                          <TableCell>{tu.users?.email ?? 'Email não disponível'}</TableCell>
                          <TableCell>{getRoleBadge(tu.role)}</TableCell> 
                          <TableCell>
                            {new Date(tu.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
