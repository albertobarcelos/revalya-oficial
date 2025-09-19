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

const resellerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  commission_rate: z.number().min(0).max(100),
  active: z.boolean().default(true),
})

type ResellerFormData = z.infer<typeof resellerSchema>

export default function NewResellerPage() {
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ResellerFormData>({
    resolver: zodResolver(resellerSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      commission_rate: 10,
      active: true,
    },
  })

  const onSubmit = async (data: ResellerFormData) => {
    try {
      setIsLoading(true)

      // Criar revendedor e gerar convite
      const { data: result, error: createError } = await supabase
        .rpc('create_reseller_with_invite', {
          p_name: data.name,
          p_document: data.document,
          p_email: data.email,
          p_phone: data.phone,
          p_commission_rate: data.commission_rate,
          p_active: data.active
        })

      if (createError) throw createError
      if (!result.success) throw new Error(result.error || 'Erro ao criar revendedor')

      // Enviar email de convite usando o Supabase Auth
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/reseller/register?token=${result.token}`,
          data: {
            role: 'reseller',
            reseller_id: result.reseller_id
          }
        }
      })

      if (inviteError) {
        // Se falhar o envio do email, ainda mantemos o revendedor criado
        // mas avisamos o usuário
        toast({
          title: 'Revendedor criado com sucesso',
          description: 'Porém houve um erro ao enviar o email de convite. O convite pode ser reenviado depois.',
          variant: 'warning',
        })
      } else {
        toast({
          title: 'Revendedor criado com sucesso',
          description: 'Um email será enviado para o revendedor definir sua senha.',
        })
      }

      navigate('/admin/resellers')
    } catch (error: any) {
      console.error('Erro ao criar revendedor:', error)
      toast({
        title: 'Erro ao criar revendedor',
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
          <Button variant="ghost" onClick={() => navigate('/admin/resellers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Novo Revendedor</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Revendedor</CardTitle>
          <CardDescription>
            Preencha os dados do novo revendedor. Um email será enviado para ele definir sua senha.
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
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Comissão (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={100} 
                        step={0.1}
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <FormDescription>
                        Revendedor poderá acessar o sistema e cadastrar tenants
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
                Criar Revendedor
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 
