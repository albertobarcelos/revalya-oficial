import { useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Versão simplificada do hook useAppRecovery que não depende do AppInitializationContext
 */
export function useSimpleAppRecovery() {
  const { user } = useSupabase();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Refs para controle de timeouts e estado
  const recoveryAttemptsRef = useRef(0);
  const maxRecoveryAttempts = 3;

  /**
   * Executa uma recuperação limpa da aplicação
   */
  const performRecovery = useCallback(async () => {
    if (recoveryAttemptsRef.current >= maxRecoveryAttempts) {
      console.warn('[AppRecovery] Máximo de tentativas de recuperação atingido');
      return;
    }

    recoveryAttemptsRef.current++;
    
    console.log(`[AppRecovery] Executando recuperação simplificada (tentativa ${recoveryAttemptsRef.current}/${maxRecoveryAttempts})`);

    try {
      // 1. Limpar caches do React Query
      queryClient.clear();
      
      // 2. Limpar localStorage problemático (mantendo dados essenciais)
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
      
      // 3. Aguardar um pouco antes de continuar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. Forçar re-inicialização navegando para uma rota segura
      if (user) {
        window.location.href = '/meus-aplicativos';
      } else {
        window.location.href = '/login';
      }
      
      // 5. Resetar contador de tentativas após sucesso
      setTimeout(() => {
        recoveryAttemptsRef.current = 0;
        console.log('[AppRecovery] Recuperação simplificada concluída com sucesso');
      }, 2000);
      
    } catch (error) {
      console.error('[AppRecovery] Erro durante recuperação simplificada:', error);
    }
  }, [queryClient, navigate, user]);

  return {
    performRecovery,
    recoveryAttempts: recoveryAttemptsRef.current,
    maxRecoveryAttempts
  };
}
