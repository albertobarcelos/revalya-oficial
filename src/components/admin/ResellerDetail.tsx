import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from '@/components/ui/form';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Link, Copy, UserPlus, Users } from 'lucide-react';
import { sendInviteEmail } from '@/utils/emailUtils';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

interface ResellerInvite {
  invite_id: string;
  email: string;
  status: string;
  created_at: string;
  token?: string;
}

interface ResellerDetails {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  commission_rate: number;
  active: boolean;
}

interface ResellerUser {
  user_id: string;
  email: string;
  created_at: string; // Data de associação
}

const resellerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  commission_rate: z.coerce.number().min(0, 'Comissão não pode ser negativa').max(100, 'Comissão não pode ser maior que 100%'),
  active: z.boolean().default(true),
});

type ResellerFormData = z.infer<typeof resellerSchema>;

export function ResellerDetail({ resellerId }: { resellerId: string }) {
  // AIDEV-NOTE: Hooks principais
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<{email: string, token: string} | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInvitingUser, setIsInvitingUser] = useState(false);

  const form = useForm<ResellerFormData>({
    resolver: zodResolver(resellerSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      commission_rate: 0,
      active: true,
    },
  });

  // AIDEV-NOTE: Consulta direta de detalhes do revendedor (como na página de tenants)
  const {
    data: reseller,
    isLoading: resellerLoading,
    error: resellerError,
    refetch: refetchReseller
  } = useQuery({
    queryKey: ['reseller-details', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('id', resellerId)
        .single();

      if (error) throw error;
      return data as ResellerDetails;
    },
    enabled: !!resellerId
  });

  // AIDEV-NOTE: Consulta direta de convites do revendedor
  const {
    data: invites = [],
    isLoading: invitesLoading,
    refetch: refetchInvites
  } = useQuery({
    queryKey: ['reseller-invites', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reseller_invites_view')
        .select('*')
        .eq('reseller_id', resellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ResellerInvite[];
    },
    enabled: !!resellerId
  });

  // AIDEV-NOTE: Consulta direta de usuários do revendedor
  const {
    data: resellerUsers = [],
    isLoading: usersLoading,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['reseller-users', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reseller_users_with_details', { 
        p_reseller_id: resellerId 
      });
      
      if (error) throw error;
      return (data || []) as ResellerUser[];
    },
    enabled: !!resellerId
  });

  // AIDEV-NOTE: Atualizar formulário quando dados do revendedor carregarem (DEVE estar antes de qualquer return)
  useEffect(() => {
    if (reseller) {
      form.reset({
        name: reseller.name,
        document: reseller.document,
        email: reseller.email,
        phone: reseller.phone || '',
        commission_rate: reseller.commission_rate,
        active: reseller.active,
      });
    }
  }, [reseller, form]);

  // AIDEV-NOTE: Sem bloqueio de acesso - consulta direta como na página de tenants

  // AIDEV-NOTE: CAMADA 5 - Operação segura de reenvio de convite com audit logs
  const handleResendInvite = async (email: string) => {
    try {
      const { data, error } = await supabase
        .rpc('resend_reseller_invite', {
          p_email: email,
          p_reseller_id: resellerId
        });

      if (error) throw error;
      
      // Se a função retornou sucesso e precisa enviar email
      if (data?.success && data?.needs_email) {
        // Salvar os dados do convite para mostrar o link se necessário
        setCurrentInvite({
          email: data.email,
          token: data.token
        });
        
        // Tentar enviar o email
        try {
          const emailResult = await sendInviteEmail(
            data.email,
            data.token,
            data.type
          );
          
          if (!emailResult.success) {
            setShowLinkDialog(true);
            toast({
              title: "Aviso",
              description: "Convite atualizado, mas houve um erro ao enviar o email. Use o link manual.",
              variant: "destructive",
            });
            await refetchInvites();
            return;
          }
        } catch (error) {
          setShowLinkDialog(true);
          toast({
            title: "Aviso",
            description: "Convite atualizado, mas houve um erro ao enviar o email. Use o link manual.",
            variant: "destructive",
          });
          await refetchInvites();
          return;
        }
      }
      
      toast({
        title: "Sucesso",
        description: "Convite reenviado com sucesso",
      });
      await refetchInvites();
      
      // AIDEV-NOTE: Log de auditoria para reenvio de convite
      await supabase.from('audit_logs').insert({
        action: 'RESEND_RESELLER_INVITE',
        resource: `reseller:${resellerId}`,
        metadata: { email, reseller_id: resellerId }
      });
      
    } catch (error: any) {
      console.error('Erro ao reenviar convite:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reenviar convite",
        variant: "destructive",
      });
    }
  };

  const showInviteLink = (email: string, token: string) => {
    setCurrentInvite({ email, token });
    setShowLinkDialog(true);
  };

  const copyLinkToClipboard = () => {
    if (!currentInvite) return;
    
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/reseller/register?token=${currentInvite.token}`;
    
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    });
  };

  // AIDEV-NOTE: Operação segura de convite de usuário com audit logs
  const handleInviteUser = async () => {
    if (!supabase || !resellerId || !inviteEmail) {
      toast({title: "Erro", description: "Email inválido ou dados faltando.", variant: "destructive"});
      return;
    }
    setIsInvitingUser(true);
    try {
      const { error } = await supabase.functions.invoke('invite-reseller-user', {
        body: { reseller_id: resellerId, email: inviteEmail },
      });

      if (error) throw error;

      toast({ title: "Convite enviado!", description: `Usuário ${inviteEmail} convidado para este revendedor.` });
      setInviteEmail('');
      await refetchUsers();
      
      // AIDEV-NOTE: Log de auditoria para convite de usuário
      await supabase.from('audit_logs').insert({
        action: 'INVITE_RESELLER_USER',
        resource: `reseller:${resellerId}`,
        metadata: { email: inviteEmail, reseller_id: resellerId }
      });

    } catch (error: any) {
      console.error("Erro ao convidar usuário:", error);
      let errorMessage = "Não foi possível convidar o usuário.";
      if (error.context && error.context.json) {
        errorMessage = error.context.json.error || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Erro ao convidar", description: errorMessage, variant: "destructive" });
    }
    setIsInvitingUser(false);
  };

  // AIDEV-NOTE: Operação segura de atualização com audit logs e invalidação de cache
  const onSubmit = async (values: ResellerFormData) => {
    try {
      const { error } = await supabase
        .from('resellers')
        .update(values)
        .eq('id', resellerId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Revendedor atualizado com sucesso",
      });
      
      // AIDEV-NOTE: Invalidar cache e recarregar dados
      await queryClient.invalidateQueries({ queryKey: ['reseller-details', resellerId] });
      await refetchReseller();
      
      // AIDEV-NOTE: Log de auditoria para atualização
      await supabase.from('audit_logs').insert({
        action: 'UPDATE_RESELLER',
        resource: `reseller:${resellerId}`,
        metadata: { 
          reseller_id: resellerId,
          updated_fields: Object.keys(values),
          previous_data: reseller
        }
      });
      
    } catch (error: any) {
      console.error('Erro ao atualizar revendedor:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar revendedor",
        variant: "destructive",
      });
    }
  };

  // AIDEV-NOTE: Estados de carregamento e erro
  if (resellerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (resellerError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Erro ao carregar</h3>
          <p className="text-gray-500">Não foi possível carregar os dados do revendedor.</p>
          <Button onClick={() => refetchReseller()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!reseller) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Revendedor não encontrado</h3>
          <p className="text-gray-500">O revendedor solicitado não foi encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Revendedor</CardTitle>
              <CardDescription>Visualize e edite os detalhes do revendedor</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} type="email" />
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
                            <Input {...field} />
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
                            <Input {...field} type="number" min="0" max="100" step="0.01" />
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
                              Determina se o revendedor está ativo no sistema
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
                  </div>
                  
                  <Button type="submit" disabled={resellerLoading || form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Convites Enviados</CardTitle>
              <CardDescription>Gerencie os convites enviados para este revendedor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.invite_id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invite.status === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : invite.status === 'pending' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {invite.status === 'accepted' 
                            ? 'Aceito' 
                            : invite.status === 'pending' 
                              ? 'Pendente'
                              : 'Expirado'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(invite.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => showInviteLink(invite.email, invite.token || '')}
                          title="Obter link de cadastro"
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Link
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvite(invite.email)}
                          disabled={invite.status === 'accepted' || invitesLoading}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reenviar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Revendedor</CardTitle>
              <CardDescription>Gerencie os usuários que têm acesso a este revendedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="invite-email-input">Convidar Novo Usuário</Label>
                <div className="flex w-full max-w-sm items-center space-x-2 mt-2">
                  <Input 
                    type="email" 
                    id="invite-email-input"
                    placeholder="Email do usuário" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInvitingUser || usersLoading}
                  />
                  <Button 
                    type="button" 
                    onClick={handleInviteUser} 
                    disabled={isInvitingUser || !inviteEmail || usersLoading}
                  >
                    {isInvitingUser ? 'Convidando...' : <UserPlus className="h-4 w-4" />}
                    {!isInvitingUser && <span className="ml-2 hidden sm:inline">Convidar</span>}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">O usuário receberá um convite por email para acessar este revendedor.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Usuários Atuais</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['reseller-users', resellerId] });
                    }}
                    disabled={usersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
                
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Carregando usuários...</p>
                    </div>
                  </div>
                ) : resellerUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Adicionado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resellerUsers.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Este revendedor ainda não possui usuários associados. 
                      <br />
                      Use o formulário acima para convidar novos usuários.
                    </p>
                    <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded border">
                      <strong>Debug Info:</strong> Função RPC corrigida e funcionando. 
                      Tabela: resellers_users | ID: {resellerId}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Cadastro</DialogTitle>
            <DialogDescription>
              Compartilhe este link com o usuário para que ele possa se cadastrar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentInvite && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" value={currentInvite.email} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-link">Link de Cadastro</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="invite-link" 
                      value={`${window.location.origin}/reseller/register?token=${currentInvite.token}`} 
                      readOnly 
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={copyLinkToClipboard}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Este link expira em 7 dias a partir da data de reenvio
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Fechar
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
