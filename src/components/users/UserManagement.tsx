import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserPlus, Users, Mails } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { UserList } from "@/components/users/UserList";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import { UserEmptyState } from "@/components/users/UserEmptyState";
import { InviteEmptyState } from "@/components/users/InviteEmptyState";
import { useSupabase } from '@/hooks/useSupabase';

interface UserManagementProps {
  tenantId: string;
}

export function UserManagement({ tenantId }: UserManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('users');
  
  // Buscar convites pendentes
  useEffect(() => {
    const fetchInvites = async () => {
      if (!tenantId) return;
      
      try {
        // Validar se o tenantId parece ser um UUID válido (formato básico)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        
        if (!isValidUUID) {
          console.warn("TenantID não é um UUID válido:", tenantId);
          setIsLoadingInvites(false);
          return;
        }
      
        setIsLoadingInvites(true);
        
        // Tentar usar a nova função RPC
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_tenant_pending_invites_v2', { tenant_id_param: tenantId });
          
        if (!rpcError && rpcData) {
          setInvites(rpcData);
          setIsLoadingInvites(false);
          return;
        }
        
        console.warn("Falha ao usar RPC para buscar convites:", rpcError);
        
        // Fallback para o método original
        const { data, error } = await supabase
          .from('tenant_invites')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'PENDING');
          
        if (error) throw error;
        setInvites(data || []);
      } catch (err) {
        console.error('Erro ao buscar convites:', err);
        toast({
          title: "Erro ao carregar convites",
          description: "Não foi possível carregar a lista de convites pendentes.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInvites(false);
      }
    };
    
    fetchInvites();
  }, [tenantId, supabase, refreshTrigger]);
  
  // Reenviar convite
  const handleResendInvite = async (inviteId: string) => {
    try {
      // Tentar usar a nova função RPC
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
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: "Convite reenviado",
          description: "O convite foi reenviado com sucesso.",
        });
        return;
      }
      
      // Fallback para o método original
      const { error } = await supabase
        .from('tenant_invites')
        .update({ 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteId);
        
      if (error) throw error;
      
      setRefreshTrigger(prev => prev + 1);
      
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
  
  // Cancelar convite
  const handleCancelInvite = async (inviteId: string) => {
    try {
      // Tentar usar a nova função RPC
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
        // Atualizar a lista removendo o convite
        setInvites(invites.filter(invite => invite.id !== inviteId));
        
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
        .eq('id', inviteId);
        
      if (error) throw error;
      
      // Atualizar a lista removendo o convite
      setInvites(invites.filter(invite => invite.id !== inviteId));
      
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
    // Atualizar a lista de convites
    setRefreshTrigger(prev => prev + 1);
    setIsDialogOpen(false);
  };
  
  const openInviteDialog = () => {
    setIsDialogOpen(true);
  };
  
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
