import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Users, Mails } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserList } from "@/components/users/UserList";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { InviteEmptyState } from "@/components/users/InviteEmptyState";
// AIDEV-NOTE: Substituindo useSupabase por hooks de segurança multi-tenant
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { useSupabase } from '@/hooks/useSupabase';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UserManagementProps {
  tenantId: string;
}

export function UserManagement({ tenantId }: UserManagementProps) {
  // AIDEV-NOTE: Verificar se o usuário é ADMIN global para permitir acesso sem tenant ativo
  const { user } = useSupabase();
  
  // AIDEV-NOTE: Query para verificar role do usuário na tabela public.users
  const { data: userRoleData } = useQuery({
    queryKey: ['user-role-admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_role')
          .eq('id', user.id)
          .single();

        if (error) {
          // Fallback para metadados em caso de erro
          const fallbackRole = user.app_metadata?.user_role || user.user_metadata?.user_role || user.user_metadata?.role;
          return { user_role: fallbackRole };
        }

        return data;
      } catch (error) {
        // Fallback para metadados em caso de erro
        const fallbackRole = user.app_metadata?.user_role || user.user_metadata?.user_role || user.user_metadata?.role;
        return { user_role: fallbackRole };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1
  });

  const userRole = userRoleData?.user_role || user?.user_metadata?.user_role || user?.user_metadata?.role;
  const isGlobalAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // AIDEV-NOTE: Implementando hooks de segurança multi-tenant
  // Se for ADMIN global, não requer tenant ativo no contexto
  const { hasAccess: hasTenantAccess } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Lógica de acesso combinada: ADMIN global OU acesso ao tenant
  const hasAccess = useMemo(() => {
    // Se for ADMIN global, permite acesso mesmo sem tenant ativo no contexto
    if (isGlobalAdmin) {
      return true;
    }
    // Caso contrário, usa a validação normal de tenant
    return hasTenantAccess;
  }, [isGlobalAdmin, hasTenantAccess]);
  
  // AIDEV-NOTE: Query segura para buscar convites pendentes
  // AIDEV-NOTE: Para ADMIN global, usar query direta sem validação de tenant no contexto
  const { 
    data: invites = [], 
    isLoading: isLoadingInvites, 
    refetch: refetchInvites 
  } = useQuery({
    queryKey: ['tenant_invites', 'pending', tenantId],
    queryFn: async () => {
      // AIDEV-NOTE: ADMIN global pode acessar diretamente, outros precisam de validação
      if (isGlobalAdmin) {
        // Query direta para ADMIN global
        const { data, error } = await supabase
          .from('tenant_invites')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'PENDING');
          
        if (error) throw error;
        return data || [];
      }
      
      // Para não-ADMINs, usar o hook seguro com validação de tenant
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_tenant_pending_invites_v2', { tenant_id_param: tenantId });
        
      if (!rpcError && rpcData) {
        return rpcData;
      }
      
      console.warn("Falha ao usar RPC para buscar convites:", rpcError);
      
      // Fallback para o método original
      const { data, error } = await supabase
        .from('tenant_invites')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && hasAccess
  }) as { data: any[]; isLoading: boolean; refetch: () => void };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  
  // AIDEV-NOTE: Função para reenviar convite usando hooks seguros
  const handleResendInvite = async (inviteId: string) => {
    // AIDEV-NOTE: ADMIN global pode acessar mesmo sem tenant ativo no contexto
    if (!hasAccess) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para realizar esta ação.",
        variant: "destructive",
      });
      return;
    }

    try {
      // AIDEV-NOTE: Se for ADMIN global, fazer reenvio direto sem RPC
      if (isGlobalAdmin) {
        // Buscar informações do convite
        const { data: invite, error: inviteError } = await supabase
          .from('tenant_invites')
          .select('*, tenant:tenants(name)')
          .eq('id', inviteId)
          .single();
        
        if (inviteError || !invite) {
          throw new Error('Convite não encontrado');
        }
        
        // Verificar se o convite está pendente
        if (invite.status !== 'PENDING') {
          throw new Error('Apenas convites pendentes podem ser reenviados');
        }
        
        // Obter token do convite (ou usar ID se não tiver token)
        const inviteToken = invite.token || invite.id;
        
        // Buscar informações do usuário que está reenviando
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }
        
        // Enviar email de convite
        const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
          body: {
            email: invite.email,
            token: inviteToken,
            type: 'tenant',
            tenantName: (invite.tenant as any)?.name || 'o tenant',
            inviterName: user.email || 'um administrador',
          },
        });
        
        if (emailError) {
          console.error('Erro ao enviar email:', emailError);
          throw new Error('Erro ao enviar email de convite');
        }
        
        // AIDEV-NOTE: Convite atualizado implicitamente pelo envio de email
        // Não há necessidade de atualizar campos que não existem na tabela
        
        refetchInvites();
        
        toast({
          title: "Convite reenviado",
          description: "O convite foi reenviado com sucesso.",
        });
        return;
      }
      
      // AIDEV-NOTE: Para não-ADMINs, usar a RPC que valida permissões
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('resend_tenant_invite_v2', { invite_id_param: inviteId });
      
      if (rpcError) {
        console.warn("Erro na RPC resend_tenant_invite_v2:", rpcError);
        throw rpcError;
      }
      
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.message || "Não foi possível reenviar o convite");
      }
      
      // Se RPC funcionou
      if (rpcResult && rpcResult.success) {
        refetchInvites();
        
        toast({
          title: "Convite reenviado",
          description: "O convite foi reenviado com sucesso.",
        });
        return;
      }
      
      // Fallback para o método original
      // AIDEV-NOTE: Apenas atualizar created_at para "refrescar" o convite
      const { error } = await supabase
        .from('tenant_invites')
        .update({ 
          created_at: new Date().toISOString()
        })
        .eq('id', inviteId)
        .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação adicional de tenant
        
      if (error) throw error;
      
      refetchInvites();
      
      toast({
        title: "Convite reenviado",
        description: "O convite foi reenviado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao reenviar convite:', error);
      toast({
        title: "Erro ao reenviar convite",
        description: error.message || "Não foi possível reenviar o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // AIDEV-NOTE: Função para cancelar convite usando hooks seguros
  const handleCancelInvite = async (inviteId: string) => {
    // AIDEV-NOTE: ADMIN global pode acessar mesmo sem tenant ativo no contexto
    if (!hasAccess) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para realizar esta ação.",
        variant: "destructive",
      });
      return;
    }

    try {
      // AIDEV-NOTE: Se for ADMIN global, fazer cancelamento direto sem RPC
      if (isGlobalAdmin) {
        // Verificar se o convite existe e está pendente
        const { data: invite, error: inviteError } = await supabase
          .from('tenant_invites')
          .select('id, status, tenant_id')
          .eq('id', inviteId)
          .single();
        
        if (inviteError || !invite) {
          throw new Error('Convite não encontrado');
        }
        
        // Verificar se o convite pertence ao tenant correto
        if (invite.tenant_id !== tenantId) {
          throw new Error('Convite não pertence a este tenant');
        }
        
        // Verificar se o convite está pendente
        if (invite.status !== 'PENDING') {
          throw new Error('Apenas convites pendentes podem ser cancelados');
        }
        
        // AIDEV-NOTE: Usar DELETE em vez de UPDATE para evitar problemas com trigger que tenta acessar updated_at
        // Esta é a mesma abordagem usada pelo inviteService.cancelInvite
        const { error: deleteError } = await supabase
          .from('tenant_invites')
          .delete()
          .eq('id', inviteId)
          .eq('tenant_id', tenantId);
        
        if (deleteError) {
          throw deleteError;
        }
        
        refetchInvites();
        
        toast({
          title: "Convite cancelado",
          description: "O convite foi cancelado com sucesso.",
        });
        return;
      }
      
      // AIDEV-NOTE: Para não-ADMINs, usar a RPC que valida permissões
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('cancel_tenant_invite_v2', { invite_id_param: inviteId });
      
      if (rpcError) {
        console.warn("Erro na RPC cancel_tenant_invite_v2:", rpcError);
        throw rpcError;
      }
      
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.message || "Não foi possível cancelar o convite");
      }
      
      // Se RPC funcionou
      if (rpcResult && rpcResult.success) {
        refetchInvites();
        
        toast({
          title: "Convite cancelado",
          description: "O convite foi cancelado com sucesso.",
        });
        return;
      }
      
      // Fallback para o método original
      const { error } = await supabase
        .from('tenant_invites')
        .update({ status: 'CANCELLED' })
        .eq('id', inviteId)
        .eq('tenant_id', tenantId); // AIDEV-NOTE: Validação adicional de tenant
        
      if (error) throw error;
      
      refetchInvites();
      
      toast({
        title: "Convite cancelado",
        description: "O convite foi cancelado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao cancelar convite:', error);
      toast({
        title: "Erro ao cancelar convite",
        description: error.message || "Não foi possível cancelar o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleInviteSuccess = () => {
    // AIDEV-NOTE: Atualizar a lista de convites usando refetch seguro
    refetchInvites();
    setIsDialogOpen(false);
  };
  
  const openInviteDialog = () => {
    setIsDialogOpen(true);
  };
  
  // AIDEV-NOTE: Verificação de acesso obrigatória
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar o gerenciamento de usuários.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuários
        </CardTitle>
        <CardDescription>
          Gerencie os usuários do sistema e envie convites para novos usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="users" onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <Mails className="h-4 w-4" />
                <span>Convites</span>
                {invites.length > 0 && (
                  <Badge className="ml-1 bg-warning/10 text-warning" variant="outline">
                    {invites.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openInviteDialog}
            >
              <span className="mr-2">+</span> Convidar Usuário
            </Button>
          </div>
          
          <TabsContent value="users" className="m-0 mt-2">
            {/* Lista de usuários integrada com o Supabase */}
            <UserList tenantId={tenantId} onInviteUser={openInviteDialog} />
          </TabsContent>
          
          <TabsContent value="invites" className="m-0 mt-2">
            {/* Lista de convites pendentes */}
            <div className="border rounded-md overflow-hidden">
              <div className="bg-muted/10 grid grid-cols-4 gap-4 p-4 font-medium text-sm border-b">
                <div>Email</div>
                <div>Data do Convite</div>
                <div>Status</div>
                <div className="text-right">Ações</div>
              </div>
              
              {isLoadingInvites ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
                  <span className="text-muted-foreground">Carregando convites...</span>
                </div>
              ) : invites.length === 0 ? (
                <InviteEmptyState onInvite={openInviteDialog} />
              ) : (
                <div className="divide-y">
                  {invites.map((invite) => (
                    <div key={invite.id} className="grid grid-cols-4 gap-4 p-4 items-center text-sm hover:bg-muted/5 transition-colors">
                      <div className="text-muted-foreground font-medium">
                        {invite.email}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        <span className="text-xs block text-muted-foreground/70">
                          {new Date(invite.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div>
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          Pendente
                        </Badge>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleResendInvite(invite.id)}
                          className="hover:text-primary transition-colors"
                        >
                          Reenviar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog para convidar usuário */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite para um novo usuário se juntar ao seu tenant.
            </DialogDescription>
          </DialogHeader>
          <InviteUserDialog 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)} 
            tenantId={tenantId} 
            onSuccess={handleInviteSuccess}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
