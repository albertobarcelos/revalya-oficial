import { useCallback, useRef } from 'react';

/**
 * Hook para debounce de funções callback
 * Útil para evitar múltiplas execuções de funções custosas
 */
export function useCallbackDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Limpar timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Criar novo timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}

/**
 * Hook para throttle de funções callback
 * Útil para limitar a frequência de execução de funções
 */
export function useCallbackThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecuted.current;

      if (timeSinceLastExecution >= delay) {
        // Executar imediatamente se passou tempo suficiente
        lastExecuted.current = now;
        callback(...args);
      } else {
        // Agendar execução para o final do período de throttle
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastExecuted.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastExecution);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
}
