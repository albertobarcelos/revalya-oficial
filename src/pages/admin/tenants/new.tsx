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

      // AIDEV-NOTE: Obter o ID do usuário atual (admin que está criando o tenant)
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // 1. AIDEV-NOTE: Criar tenant no banco primeiro (sem criar usuário ainda)
      const { data: tenantData, error: dbError } = await supabase
        .from('tenants')
        .insert({
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

      if (!tenantData?.id) {
        throw new Error('Falha ao criar tenant - ID não encontrado')
      }

      // 2. AIDEV-NOTE: Criar convite para o administrador do tenant
      // O usuário receberá um email para criar a conta ou fazer login
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      const { data: inviteData, error: inviteError } = await supabase
        .from('tenant_invites')
        .insert({
          tenant_id: tenantData.id,
          email: data.email,
          role: 'TENANT_ADMIN', // Administrador do tenant
          status: 'PENDING',
          invited_by: currentUser.id,
          token: token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (inviteError) {
        // Se falhar ao criar convite, tentar excluir o tenant criado
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        throw new Error(`Erro ao criar convite: ${inviteError.message}`)
      }

      // 3. AIDEV-NOTE: Enviar email de convite para o administrador
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
          body: {
            email: data.email,
            token: token,
            type: 'tenant',
            tenantName: data.name,
            inviterName: currentUser.email || 'Administrador do sistema',
          },
        });

        if (emailError) {
          console.warn('Erro ao enviar email de convite (não crítico):', emailError);
          // Não bloqueia o fluxo - email é opcional
          toast({
            title: 'Tenant criado',
            description: 'O tenant foi criado, mas houve um erro ao enviar o email. O convite pode ser reenviado depois.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Tenant criado com sucesso',
            description: `O tenant foi criado e um convite foi enviado para ${data.email}. O administrador receberá um email para criar a conta ou fazer login.`,
          });
        }
      } catch (emailErr: any) {
        console.warn('Erro ao chamar função de envio de email:', emailErr);
        toast({
          title: 'Tenant criado',
          description: 'O tenant foi criado, mas houve um erro ao enviar o email. O convite pode ser reenviado depois.',
          variant: 'default',
        });
      }

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
            Preencha os dados do novo tenant. Um convite será enviado para o email do administrador para criar a conta ou fazer login.
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
                      Um convite será enviado para este email. O administrador poderá criar a conta ou fazer login se já tiver uma.
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
