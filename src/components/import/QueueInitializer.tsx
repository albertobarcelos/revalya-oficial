'use client';

import { useEffect } from 'react';
import { queueInitializer } from '@/utils/queueInitializer';

/**
 * AIDEV-NOTE: Componente para inicialização automática da fila de importação
 * 
 * Este componente é montado no layout principal e garante que a fila
 * de processamento de importações seja iniciada automaticamente quando
 * a aplicação é carregada.
 * 
 * Características:
 * - Executa apenas uma vez por sessão
 * - Não renderiza nenhum conteúdo visual
 * - Implementa retry automático em caso de falha
 * - Registra logs para debugging
 */
export function QueueInitializer() {
  useEffect(() => {
    // Inicializa a fila apenas uma vez quando o componente é montado
    queueInitializer.initialize();
    
    // Cleanup não é necessário pois a fila deve continuar rodando
    // durante toda a sessão da aplicação
  }, []);

  // Este componente não renderiza nada
  return null;
}

export default QueueInitializer;