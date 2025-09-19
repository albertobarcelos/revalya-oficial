import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '@/contexts/PortalContext';
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UserManagement } from '@/components/users/UserManagement';
import { UserFilters } from '@/components/users/UserFilters';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';

interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export default function TenantUsersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("users");
  const { supabase } = useSupabase();
  const { tenantId, currentPortal } = usePortal();
  const { toast } = useToast();

  // Usar o tenantId do contexto, garantindo que seja UUID válido
  const validTenantId = tenantId || '';
  
  // Verificar acesso ao tenant
  useEffect(() => {
    const checkAccess = async () => {
      if (!validTenantId) {
        setError("Nenhum tenant selecionado. Por favor, retorne à seleção de tenant.");
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .rpc('check_tenant_access_by_id', { tenant_id_param: validTenantId });
        
        if (error) throw error;
        
        if (!data) {
          setError("Você não tem permissão para acessar este tenant.");
        }
      } catch (err) {
        console.error("Erro ao verificar acesso:", err);
        setError("Ocorreu um erro ao verificar suas permissões. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [validTenantId, supabase]);

  const handleInviteSuccess = () => {
    setIsDialogOpen(false);
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Convite enviado',
      description: 'O convite foi enviado com sucesso.',
    });
  };
  
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTrigger(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header />
          <div className="flex-1 p-6 overflow-auto">
            <div className="container mx-auto flex items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Carregando gerenciamento de usuários...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header />
          <div className="flex-1 p-6 overflow-auto">
            <div className="container mx-auto flex items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center py-10 text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-medium mb-2">Acesso negado</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RefreshCw size={14} />
                  Tentar novamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Convidar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar usuário para o tenant</DialogTitle>
                  <DialogDescription>
                    Envie um convite para um novo usuário se juntar ao seu tenant.
                  </DialogDescription>
                </DialogHeader>
                <InviteUserDialog 
                  isOpen={isDialogOpen}
                  onClose={() => setIsDialogOpen(false)}
                  tenantId={validTenantId}
                  onSuccess={handleInviteSuccess}
                />
              </DialogContent>
            </Dialog>
          </div>
        </Header>
        <div className="flex-1 p-6 overflow-auto">
          <div className="container mx-auto py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-1">Gerenciamento de Usuários</h1>
              <p className="text-muted-foreground">
                Gerencie os usuários e convites do seu tenant.
              </p>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <UserManagement tenantId={validTenantId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
