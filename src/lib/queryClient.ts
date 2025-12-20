import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";

/**
 * Instância global do QueryClient para uso em serviços e utilitários
 * que precisam invalidar cache fora dos componentes React
 */
// AIDEV-NOTE: Configurações otimizadas do QueryClient para reduzir refetches desnecessários
export const queryClient = new QueryClient({
  // AIDEV-NOTE: Configuração global de tratamento de erros para o Sentry
  // Captura erros de queries e mutations que não são tratados explicitamente
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Ignora erros 404/401 se necessário, mas captura 400 (Bad Request)
      const status = (error as any)?.status || (error as any)?.code;
      
      // Captura a exceção no Sentry com contexto da query
      Sentry.captureException(error, {
        extra: {
          type: 'queryError',
          queryKey: query.queryKey,
          status,
          errorMessage: error.message
        }
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Captura erros de mutação (POST/PUT/DELETE)
      Sentry.captureException(error, {
        extra: {
          type: 'mutationError',
          mutationKey: mutation.options.mutationKey,
          errorMessage: error.message
        }
      });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Desabilitar refetch no foco da janela
      refetchOnMount: true, // Manter refetch ao montar
      staleTime: 2 * 60 * 1000, // 2 minutos de cache válido
      cacheTime: 5 * 60 * 1000, // 5 minutos de cache total
      retry: 2, // Reduzir tentativas de retry
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Função utilitária para invalidar cache de contratos
export const invalidateContractsCache = () => {
  queryClient.invalidateQueries({ queryKey: ['contracts'] });
  queryClient.invalidateQueries({ queryKey: ['contractDetails'] });
};

// Função utilitária para forçar refetch de contratos
export const refetchContractsData = () => {
  queryClient.refetchQueries({ queryKey: ['contracts'] });
  queryClient.refetchQueries({ queryKey: ['contractDetails'] });
};

export default queryClient;
