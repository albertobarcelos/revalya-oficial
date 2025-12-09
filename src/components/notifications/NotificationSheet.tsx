import { useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

export function NotificationSheet() {
  const { notifications, loading, refetch } = useNotifications();
  const { toast } = useToast();
  const unreadNotifications = notifications.filter(n => !n.status || n.status === "pending");
  const unreadCount = unreadNotifications.length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', id);

      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Notificação marcada como lida",
        description: "A notificação foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .in('status', ['pending', null]);

      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Notificações atualizadas",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações como lidas.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-2 rounded-lg text-foreground hover:text-primary focus:outline-none relative">
          <Bell size={20} className="text-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="bg-background border border-border">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notificações</SheetTitle>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : unreadNotifications.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma notificação não lida.
              </div>
            ) : (
              unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg border border-border bg-card relative cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">
                      {notification.type === 'atividade' ? 'Atividade' : notification.type}
                    </h4>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
