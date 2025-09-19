/**
 * Configuração do TanStack Query Provider para toda a aplicação
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

// Configurações padrão para o QueryClient
const defaultOptions = {
  queries: {
    staleTime: 30 * 1000, // 30 segundos
    retry: 1,
    refetchOnWindowFocus: import.meta.env.PROD, // Desabilitar em dev para facilitar debugging
    keepPreviousData: true, // Suavizar transições ao mudar de página
  },
};

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Criar uma instância de QueryClient para cada renderização
  // Isso é importante para prevenir memory leaks com SSR (futuro)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions,
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
