import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

export function usePaymentUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;

  useEffect(() => {
    if (!websocketUrl) return;

    const ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Invalidar o cache das cobranças
        queryClient.invalidateQueries({ queryKey: ['payments'] });

        // Mostrar notificação
        toast({
          title: `Atualização de Pagamento - ${data.event}`,
          description: `Cliente: ${data.customer.name}\nValor: R$ ${data.payment.value}\nStatus: ${data.payment.status}`,
        });

        // Se o navegador suportar notificações, mostrar uma notificação nativa
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Atualização de Pagamento - ${data.event}`, {
            body: `Cliente: ${data.customer.name}\nValor: R$ ${data.payment.value}\nStatus: ${data.payment.status}`,
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    // Solicitar permissão para notificações nativas
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      ws.close();
    };
  }, [queryClient, toast, websocketUrl]);
}
