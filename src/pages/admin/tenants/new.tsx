import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuery } from '@tanstack/react-query'

const tenantSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  reseller_id: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

type TenantFormData = z.infer<typeof tenantSchema>

type Reseller = {
  id: string
  name: string
  active: boolean
}

export default function NewTenantPage() {
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      password: '',
      reseller_id: null,
      active: true,
    },
  })

  // Buscar lista de revendedores ativos
  const { data: resellers } = useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('id, name, active')
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data as Reseller[]
    },
  })

  const onSubmit = async (data: TenantFormData) => {
    try {
      setIsLoading(true)

      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'tenant',
          },
        },
      })

      if (authError) throw authError

      if (!authData.user?.id) {
        throw new Error('Falha ao criar usuário - ID não encontrado')
      }

      // 2. AIDEV-NOTE: Sincronizar usuário para public.users primeiro
      // Garantir que o usuário exista em public.users antes de criar o tenant
      // para que o trigger auto_create_tenant_admin funcione corretamente
      const { error: userSyncError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          user_role: 'TENANT_ADMIN', // Usuário criador do tenant é admin
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      // Se o usuário já existir, ignoramos o erro (ON CONFLICT DO NOTHING equivalente)
      if (userSyncError && !userSyncError.message.includes('duplicate key')) {
        throw new Error(`Erro ao sincronizar usuário: ${userSyncError.message}`)
      }

      // 3. AIDEV-NOTE: Criar tenant no banco com UUID próprio
      // O trigger auto_create_tenant_admin será executado automaticamente
      // e criará a associação tenant_users com role TENANT_ADMIN
      const { data: tenantData, error: dbError } = await supabase
        .from('tenants')
        .insert({
          // Removido: id: authData.user.id (deixar o banco gerar UUID próprio)
          name: data.name,
          document: data.document,
          email: data.email,
          phone: data.phone,
          reseller_id: data.reseller_id || null,
          active: data.active,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 4. AIDEV-NOTE: Não é mais necessário criar associação manual
      // O trigger auto_create_tenant_admin já fez isso automaticamente
      // quando o tenant foi inserido na etapa anterior

      toast({
        title: 'Tenant criado com sucesso',
        description: 'O tenant foi criado e o usuário administrador foi associado automaticamente pelo sistema.',
      })

      navigate('/admin/tenants')
    } catch (error: any) {
      console.error("Erro detalhado ao criar tenant:", error);
      toast({
        title: 'Erro ao criar tenant',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Novo Tenant</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Tenant</CardTitle>
          <CardDescription>
            Preencha os dados do novo tenant. O email cadastrado será o usuário principal com acesso administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormLabel>Email do Administrador</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com.br" {...field} />
                    </FormControl>
                    <FormDescription>
                      Este email será o usuário principal com acesso administrativo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha do Administrador</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite a senha" {...field} />
                    </FormControl>
                    <FormDescription>
                      Esta senha será usada para o primeiro acesso do administrador
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
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reseller_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revendedor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                      defaultValue={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um revendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resellers?.map((reseller) => (
                          <SelectItem key={reseller.id} value={reseller.id}>
                            {reseller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        Tenant poderá acessar o sistema
                      </FormDescription>
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

              <Button type="submit" className="w-full" loading={isLoading}>
                Criar Tenant
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
