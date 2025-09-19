import { useEffect, useRef, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useTenant } from '@/core/tenant';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook que detecta mudanças de visibilidade da página e revalida a sessão
 * quando a página volta ao foco após um período de inatividade
 * Otimizado para evitar verificações excessivas e conflitos
 */
export function usePageVisibility() {
  // AIDEV-NOTE: Estado para rastrear visibilidade da página
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const { supabase } = useSupabase();
  const { refetchTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const lastHiddenTimeRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);
  const consecutiveChecksRef = useRef(0);
  const lastCheckTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Página ficou oculta - registra o tempo
        lastHiddenTimeRef.current = Date.now();
        return;
      }

      // Página voltou ao foco
      if (lastHiddenTimeRef.current && !isCheckingRef.current) {
        const hiddenDuration = Date.now() - lastHiddenTimeRef.current;
        const timeSinceLastCheck = lastCheckTimeRef.current 
          ? Date.now() - lastCheckTimeRef.current 
          : Infinity;
        
        // Verificações mais inteligentes:
        // 1. Só verifica se ficou oculta por mais de 2 minutos (aumentado de 30s)
        // 2. Evita verificações muito frequentes (mínimo 30s entre verificações)
        // 3. Limita verificações consecutivas para evitar loops
        const shouldCheck = hiddenDuration > 120000 && // 2 minutos
                           timeSinceLastCheck > 30000 && // 30s entre verificações
                           consecutiveChecksRef.current < 3; // máximo 3 verificações consecutivas
        
        if (shouldCheck) {
          isCheckingRef.current = true;
          consecutiveChecksRef.current++;
          lastCheckTimeRef.current = Date.now();
          
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PageVisibility] Verificando sessão após reativação');
            }

            // Verifica se a sessão ainda é válida com tratamento de erro melhorado
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              // Se for erro de sessão, tentar recuperar antes de redirecionar
              if (error.message?.includes('session') || error.message?.includes('Auth session missing')) {
                console.log('[PageVisibility] Erro de sessão detectado, tentando recuperar...');
                
                // Importar função de recuperação de sessão
                const { recoverSession } = await import('@/utils/authTokenManager');
                const recoveryResult = await recoverSession();
                
                if (recoveryResult.success) {
                  // Tentar obter sessão novamente após recuperação
                  const { data: { session: recoveredSession }, error: recoveredError } = await supabase.auth.getSession();
                  if (!recoveredError && recoveredSession) {
                    console.log('[PageVisibility] Sessão recuperada com sucesso');
                    // Continuar com a sessão recuperada
                  } else {
                    console.log('[PageVisibility] Falha na recuperação, redirecionando para login');
                    window.location.href = '/login';
                    return;
                  }
                } else {
                  console.log('[PageVisibility] Falha na recuperação da sessão, redirecionando para login');
                  window.location.href = '/login';
                  return;
                }
              } else {
                console.log('[PageVisibility] Erro de sessão não recuperável, redirecionando para login');
                window.location.href = '/login';
                return;
              }
            }
            
            if (!session) {
              console.log('[PageVisibility] Nenhuma sessão encontrada, redirecionando para login');
              window.location.href = '/login';
              return;
            }

            // Só revalida se realmente necessário
            const shouldRevalidate = hiddenDuration > 300000; // 5 minutos
            
            if (shouldRevalidate) {
              await refetchTenant();
              
              // Invalida apenas caches específicos, não todos
              queryClient.invalidateQueries({ 
                queryKey: ['notifications'],
                exact: false 
              });
            }

            // Reset do contador se a verificação foi bem-sucedida
            consecutiveChecksRef.current = 0;
            
          } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            
            // Em caso de erro, não incrementa o contador para permitir retry
            if (consecutiveChecksRef.current > 0) {
              consecutiveChecksRef.current--;
            }
          } finally {
            isCheckingRef.current = false;
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PageVisibility] Verificação ignorada - critérios não atendidos', {
              hiddenDuration,
              timeSinceLastCheck,
              consecutiveChecks: consecutiveChecksRef.current
            });
          }
        }
        
        lastHiddenTimeRef.current = null;
      }
    };

    // Reset do contador após 10 minutos de inatividade
    const resetCounter = () => {
      if (consecutiveChecksRef.current > 0 && 
          lastCheckTimeRef.current && 
          Date.now() - lastCheckTimeRef.current > 600000) { // 10 minutos
        consecutiveChecksRef.current = 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('[PageVisibility] Contador de verificações resetado');
        }
      }
    };

    const resetInterval = setInterval(resetCounter, 60000); // verifica a cada minuto

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(resetInterval);
    };
  }, [supabase, refetchTenant, queryClient]);

  // AIDEV-NOTE: Atualizar estado de visibilidade quando a página muda
  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', updateVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  // AIDEV-NOTE: Retornar objeto com propriedade isVisible
  return { isVisible };
}
