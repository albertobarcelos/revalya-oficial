import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// Atualizar os campos para corresponder à estrutura real da tabela
export interface Notification {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  content: string;
  metadata?: any;
  sent_at?: string;
  error?: string;
  created_at: string;
  updated_at?: string;
  tenant_id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadNotifications = async () => {
    try {
      console.log('Loading notifications...'); // Debug log
      
      // Usar a função RPC em vez de acessar diretamente a tabela
      const { data, error } = await supabase
        .rpc('get_user_notifications');
      
      if (error) {
        console.error('Error loading notifications:', error);
        throw error;
      }

      console.log('Loaded notifications:', data);
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar notificações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const subscription = subscribeToNotifications();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToNotifications = () => {
    return supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notification change received:', payload);
          loadNotifications(); // Reload all notifications to ensure consistency
        }
      )
      .subscribe();
  };

  const createActivityNotification = async (action: string, entityType: string, entityName: string, details?: { 
    field: string;
    oldValue?: string;
    newValue?: string;
  }) => {
    try {
      // Obter informações do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user?.id)
        .single();

      const userName = userData?.name || user?.email || 'Usuário';
      
      // Traduzir o tipo de entidade
      const entityTypeTranslated = {
        'client': 'cliente',
        'charge': 'cobrança',
        'template': 'modelo',
        'rule': 'regra'
      }[entityType] || entityType;

      // Criar mensagem detalhada em português
      let message = '';
      if (details) {
        const fieldTranslated = {
          'name': 'nome',
          'company': 'empresa',
          'email': 'email',
          'phone': 'telefone',
          'address': 'endereço',
          'city': 'cidade',
          'state': 'estado',
          'postal_code': 'CEP'
        }[details.field] || details.field;

        if (details.oldValue && details.newValue) {
          message = `${userName} alterou ${fieldTranslated} do ${entityTypeTranslated} ${entityName} de "${details.oldValue}" para "${details.newValue}"`;
        } else {
          message = `${userName} ${action} ${fieldTranslated} do ${entityTypeTranslated} ${entityName}`;
        }
      } else {
        message = `${userName} ${action} ${entityTypeTranslated}: ${entityName}`;
      }

      const { error } = await supabase
        .from('notifications')
        .insert([{
          type: 'atividade',
          message,
          status: 'pending'
        }]);

      if (error) throw error;
      
      await loadNotifications();
    } catch (error) {
      console.error('Error creating activity notification:', error);
      throw error;
    }
  };

  return {
    notifications,
    loading,
    createActivityNotification,
    refetch: loadNotifications
  };
}
