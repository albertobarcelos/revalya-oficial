import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { usePortal } from '@/contexts/PortalContext';
import { TenantInvite, inviteService } from '@/services/inviteService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Clock, Mail, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingInviteCardProps {
  invite: TenantInvite;
  onAccept: () => void;
  onReject: () => void;
}

export function PendingInviteCard({ invite, onAccept, onReject }: PendingInviteCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();
  const { setPortal } = usePortal();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      setIsLoading(true);
      const { success, error } = await inviteService.acceptInvite(supabase, invite.id);
      
      if (error) {
        throw error;
      }

      if (success) {
        toast({
          title: 'Convite aceito',
          description: `Você agora tem acesso ao tenant ${invite.tenant?.name}.`,
        });
        
        // Redirecionar para o tenant
        setPortal('tenant', invite.tenant_id);
        navigate('/dashboard');
        
        // Notificar o componente pai
        onAccept();
      }
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      toast({
        title: 'Erro ao aceitar convite',
        description: 'Não foi possível aceitar o convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsLoading(true);
      const { success, error } = await inviteService.rejectInvite(supabase, invite.id);
      
      if (error) {
        throw error;
      }

      if (success) {
        toast({
          title: 'Convite rejeitado',
          description: 'O convite foi rejeitado com sucesso.',
        });
        
        // Notificar o componente pai
        onReject();
      }
    } catch (error) {
      console.error('Erro ao rejeitar convite:', error);
      toast({
        title: 'Erro ao rejeitar convite',
        description: 'Não foi possível rejeitar o convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Formatar a data de expiração
  const expiresIn = formatDistanceToNow(new Date(invite.expires_at), {
    addSuffix: true,
    locale: ptBR,
  });

  // Configurações de estilo consistentes com os cards de portal
  const styles = {
    gradient: 'from-warning/20 to-warning/10',
    border: 'border-warning/30 hover:border-warning/60',
    icon: 'bg-warning/20 text-warning',
    dot: 'bg-warning'
  }

  const features = [
    `Papel: ${invite.role === 'TENANT_ADMIN' ? 'Administrador' : 'Usuário'}`,
    `Convidado por: ${invite.inviter?.email}`,
    `Expira ${expiresIn}`
  ]

  return (
    <Card className={`group relative overflow-hidden border ${styles.border} bg-slate-800/90 transition-all duration-300 hover:shadow-lg hover:shadow-warning/10`}>
      {/* Gradiente de fundo */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-40`}></div>
      
      <div className="relative z-10">
        <CardHeader className="pb-4">
          {/* Ícone */}
          <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${styles.icon}`}>
            <Building2 className="h-7 w-7" />
          </div>
          
          {/* Título e descrição */}
          <CardTitle className="text-xl font-medium tracking-tight text-slate-100">
            {invite.tenant?.name || 'Convite Pendente'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            Você foi convidado para acessar este tenant
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-4">
          {/* Lista de informações */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase text-slate-500">
              Detalhes do Convite
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center">
                  <div className={`mr-2 h-1.5 w-1.5 rounded-full ${styles.dot}`}></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="gap-3">
          {/* Botões de ação */}
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-slate-100"
          >
            Rejeitar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isLoading ? 'Processando...' : 'Aceitar'}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
