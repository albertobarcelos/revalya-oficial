import { useEffect, useRef, useCallback } from 'react';
import { useAppInitialization } from '../contexts/AppInitializationContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para detectar quando a aplicação está "travada" e implementar
 * mecanismos de recuperação automática
 */
export function useAppRecovery() {
  const { 
    isInitializing, 
    isPageReactivating, 
    initializationLock,
    resetInitialization 
  } = useAppInitialization();
  const { user } = useSupabase();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Refs para controle de timeouts e estado
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const recoveryAttemptsRef = useRef(0);
  const maxRecoveryAttempts = 3;
  const recoveryTimeoutMs = 30000; // 30 segundos
  const activityCheckIntervalMs = 5000; // 5 segundos

  /**
   * Atualiza o timestamp da última atividade
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /**
   * Executa uma recuperação limpa da aplicação
   */
  const performRecovery = useCallback(async () => {
    if (recoveryAttemptsRef.current >= maxRecoveryAttempts) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AppRecovery] Máximo de tentativas de recuperação atingido, recarregando página');
      }
      
      // Último recurso: recarregar a página
      window.location.reload();
      return;
    }

    recoveryAttemptsRef.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[AppRecovery] Executando recuperação (tentativa ${recoveryAttemptsRef.current}/${maxRecoveryAttempts})`);
    }

    try {
      // 1. Resetar estados de inicialização
      resetInitialization();
      
      // 2. Limpar caches do React Query
      queryClient.clear();
      
      // 3. Limpar localStorage problemático (mantendo dados essenciais)
      const essentialKeys = ['portalType', 'tenantId', 'resellerId'];
      const essentialData: Record<string, string | null> = {};
      
      essentialKeys.forEach(key => {
        essentialData[key] = localStorage.getItem(key);
      });
      
      // Limpar localStorage
      localStorage.clear();
      
      // Restaurar dados essenciais
      Object.entries(essentialData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
        }
      });
      
      // 4. Aguardar um pouco antes de continuar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 5. Forçar re-inicialização navegando para uma rota segura
      if (user) {
        navigate('/meus-aplicativos', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      
      // 6. Resetar contador de tentativas após sucesso
      setTimeout(() => {
        recoveryAttemptsRef.current = 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AppRecovery] Recuperação concluída com sucesso');
        }
      }, 5000);
      
    } catch (error) {
      console.error('[AppRecovery] Erro durante recuperação:', error);
      
      // Se falhar, tentar novamente após um delay
      setTimeout(() => {
        performRecovery();
      }, 2000);
    }
  }, [resetInitialization, queryClient, navigate, user]);

  /**
   * Verifica se a aplicação está travada
   */
  const checkForStuckState = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Condições que indicam que a aplicação pode estar travada:
    const isStuck = (
      // 1. Inicializando por muito tempo
      (isInitializing && timeSinceLastActivity > recoveryTimeoutMs) ||
      // 2. Reativando página por muito tempo
      (isPageReactivating && timeSinceLastActivity > recoveryTimeoutMs) ||
      // 3. Lock de inicialização preso por muito tempo
      (initializationLock && timeSinceLastActivity > recoveryTimeoutMs)
    );
    
    if (isStuck) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AppRecovery] Estado travado detectado:', {
          isInitializing,
          isPageReactivating,
          initializationLock,
          timeSinceLastActivity
        });
      }
      
      performRecovery();
    }
  }, [isInitializing, isPageReactivating, initializationLock, performRecovery]);

  /**
   * Monitora eventos de atividade do usuário
   */
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };
    
    // Adicionar listeners para eventos de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  /**
   * Monitora o estado da aplicação periodicamente
   */
  useEffect(() => {
    const interval = setInterval(checkForStuckState, activityCheckIntervalMs);
    
    return () => {
      clearInterval(interval);
    };
  }, [checkForStuckState]);

  /**
   * Atualiza atividade quando estados importantes mudam
   */
  useEffect(() => {
    updateActivity();
  }, [isInitializing, isPageReactivating, initializationLock, user, updateActivity]);

  /**
   * Cleanup de timeouts
   */
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  return {
    performRecovery,
    updateActivity,
    recoveryAttempts: recoveryAttemptsRef.current,
    maxRecoveryAttempts
  };
}
