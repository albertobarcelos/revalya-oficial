import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

// Tempo de inatividade em minutos (pode ser configurável)
const IDLE_TIMEOUT_MINUTES = 30;

export function useIdleTimeout() {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Resetar o timer quando há atividade do usuário
  const resetTimer = () => {
    setLastActivity(new Date());
  };

  // Encerrar a sessão após timeout
  const handleIdle = async () => {
    toast({
      title: "Sessão expirada",
      description: "Sua sessão expirou por inatividade. Por favor, faça login novamente.",
    });
    
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    // Monitora eventos de atividade
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Adiciona listeners para todos os eventos
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Timer que verifica inatividade a cada minuto
    const interval = setInterval(() => {
      const now = new Date();
      const idleTime = now.getTime() - lastActivity.getTime();
      const idleTimeMinutes = idleTime / (1000 * 60);
      
      // Debug log (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Tempo inativo: ${Math.round(idleTimeMinutes)} minutos`, { 
          lastActivity, 
          now, 
          threshold: IDLE_TIMEOUT_MINUTES 
        });
      }
      
      if (idleTimeMinutes >= IDLE_TIMEOUT_MINUTES) {
        handleIdle();
      }
    }, 60000); // Verifica a cada minuto

    return () => {
      // Limpa listeners e interval quando o componente é desmontado
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [lastActivity, navigate, supabase.auth, toast]);

  return null;
}
