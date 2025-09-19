// AIDEV-NOTE: Utilitário para aguardar confirmação de sessão antes de navegar após login
// Evita navegação prematura antes da sessão estar completamente estabelecida

import { supabase } from '@/lib/supabase';

/**
 * Aguarda confirmação de que a sessão está ativa e válida
 * @param maxWaitTime Tempo máximo de espera em ms (padrão: 3000ms)
 * @returns Promise<boolean> - true se sessão confirmada, false se timeout
 */
export async function waitForSessionConfirmation(maxWaitTime: number = 3000): Promise<boolean> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Se temos uma sessão válida com usuário autenticado
        if (session?.user?.id && session?.access_token && !error) {
          console.log('[SessionConfirmation] Sessão confirmada:', {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          });
          resolve(true);
          return;
        }
        
        // Se passou do tempo limite
        if (Date.now() - startTime > maxWaitTime) {
          console.warn('[SessionConfirmation] Timeout aguardando confirmação de sessão');
          resolve(false);
          return;
        }
        
        // Tentar novamente em 100ms
        setTimeout(checkSession, 100);
      } catch (error) {
        console.error('[SessionConfirmation] Erro ao verificar sessão:', error);
        resolve(false);
      }
    };
    
    checkSession();
  });
}

/**
 * Navega para uma rota apenas após confirmar que a sessão está ativa
 * @param navigate Função de navegação do React Router
 * @param path Caminho para navegar
 * @param options Opções de navegação
 * @param maxWaitTime Tempo máximo de espera em ms
 * @param forceHardRedirect Se true, usa window.location.href para forçar um redirecionamento completo
 */
export async function navigateWithSessionConfirmation(
  navigate: (path: string, options?: any) => void,
  path: string,
  options?: any,
  maxWaitTime: number = 3000,
  forceHardRedirect: boolean = true
): Promise<void> {
  console.log('[SessionConfirmation] Aguardando confirmação de sessão antes de navegar para:', path);
  
  const sessionConfirmed = await waitForSessionConfirmation(maxWaitTime);
  
  if (sessionConfirmed) {
    console.log('[SessionConfirmation] Sessão confirmada, navegando para:', path);
    
    // Usar redirecionamento forçado se solicitado
    if (forceHardRedirect) {
      console.log('[SessionConfirmation] Usando redirecionamento forçado para:', path);
      window.location.href = path;
    } else {
      navigate(path, options);
    }
  } else {
    console.warn('[SessionConfirmation] Sessão não confirmada, navegando mesmo assim para:', path);
    
    // Mesmo sem confirmação, usar redirecionamento forçado se solicitado
    if (forceHardRedirect) {
      window.location.href = path;
    } else {
      navigate(path, options);
    }
  }
}

/**
 * Aguarda confirmação de sessão com callback personalizado
 * @param onConfirmed Callback executado quando sessão for confirmada
 * @param onTimeout Callback executado em caso de timeout
 * @param maxWaitTime Tempo máximo de espera em ms
 */
export async function onSessionConfirmed(
  onConfirmed: () => void,
  onTimeout?: () => void,
  maxWaitTime: number = 3000
): Promise<void> {
  const sessionConfirmed = await waitForSessionConfirmation(maxWaitTime);
  
  if (sessionConfirmed) {
    onConfirmed();
  } else if (onTimeout) {
    onTimeout();
  } else {
    // Se não há callback de timeout, executar o callback confirmado mesmo assim
    onConfirmed();
  }
}
