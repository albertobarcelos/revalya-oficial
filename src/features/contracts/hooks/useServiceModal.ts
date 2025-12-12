/**
 * AIDEV-NOTE: Hook para gerenciar estado do modal de edição de serviço
 * Centraliza lógica de abertura/fechamento do modal
 * 
 * @module features/contracts/hooks/useServiceModal
 */

import { useState, useCallback, useRef } from 'react';

interface UseServiceModalReturn {
  /** Indica se o modal está aberto */
  isOpen: boolean;
  /** ID do serviço sendo editado */
  editingServiceId: string;
  /** ID do último serviço carregado (para evitar reload desnecessário) */
  lastLoadedServiceId: string | null;
  /** Abre o modal para editar um serviço */
  open: (serviceId: string) => void;
  /** Fecha o modal e limpa estado */
  close: () => void;
  /** Marca serviço como carregado */
  markAsLoaded: (serviceId: string) => void;
  /** Verifica se o serviço já foi carregado */
  isAlreadyLoaded: (serviceId: string) => boolean;
}

/**
 * Hook para gerenciar estado do modal de edição de serviço
 * 
 * @returns Objeto com estado e funções de controle do modal
 * 
 * @example
 * ```tsx
 * const { isOpen, editingServiceId, open, close } = useServiceModal();
 * 
 * // Abrir modal
 * <Button onClick={() => open(service.id)}>Editar</Button>
 * 
 * // Modal
 * <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
 *   ...
 * </Dialog>
 * ```
 */
export function useServiceModal(): UseServiceModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState('');
  const lastLoadedServiceIdRef = useRef<string | null>(null);

  const open = useCallback((serviceId: string) => {
    setEditingServiceId(serviceId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingServiceId('');
    // Limpa ref quando fecha o modal
    lastLoadedServiceIdRef.current = null;
  }, []);

  const markAsLoaded = useCallback((serviceId: string) => {
    lastLoadedServiceIdRef.current = serviceId;
  }, []);

  const isAlreadyLoaded = useCallback((serviceId: string) => {
    return lastLoadedServiceIdRef.current === serviceId;
  }, []);

  return {
    isOpen,
    editingServiceId,
    lastLoadedServiceId: lastLoadedServiceIdRef.current,
    open,
    close,
    markAsLoaded,
    isAlreadyLoaded
  };
}

