'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useCNPJBackgroundProcessor } from '@/hooks/useCNPJBackgroundProcessor';

// AIDEV-NOTE: Provider para gerenciar processamento automático de CNPJ globalmente
// Deve ser usado no nível mais alto da aplicação

interface CNPJBackgroundContextType {
  isProcessing: boolean;
  startProcessing: () => void;
  stopProcessing: () => void;
  checkConsultaStatus: (customerId: string) => Promise<any>;
  forceReprocessFailed: () => Promise<void>;
}

const CNPJBackgroundContext = createContext<CNPJBackgroundContextType | undefined>(undefined);

interface CNPJBackgroundProviderProps {
  children: ReactNode;
  autoStart?: boolean;
  reprocessFailedInterval?: number;
}

// AIDEV-NOTE: Provider que encapsula a lógica de processamento CNPJ
export function CNPJBackgroundProvider({ 
  children, 
  autoStart = true,
  reprocessFailedInterval = 60 
}: CNPJBackgroundProviderProps) {
  const cnpjProcessor = useCNPJBackgroundProcessor({
    autoStart,
    reprocessFailedInterval
  });

  return (
    <CNPJBackgroundContext.Provider value={cnpjProcessor}>
      {children}
    </CNPJBackgroundContext.Provider>
  );
}

// AIDEV-NOTE: Hook para acessar o contexto de processamento CNPJ
export function useCNPJBackground() {
  const context = useContext(CNPJBackgroundContext);
  
  if (context === undefined) {
    throw new Error('useCNPJBackground deve ser usado dentro de CNPJBackgroundProvider');
  }
  
  return context;
}

// AIDEV-NOTE: Hook opcional para verificar se o provider está disponível
export function useCNPJBackgroundOptional() {
  return useContext(CNPJBackgroundContext);
}
