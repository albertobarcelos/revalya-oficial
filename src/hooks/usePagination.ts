import { useState, useEffect, useMemo } from 'react';

// AIDEV-NOTE: Interface para configuração do hook de paginação
interface UsePaginationProps {
  totalItems: number;
  defaultItemsPerPage?: number;
  defaultPage?: number;
  enableResponsive?: boolean;
}

// AIDEV-NOTE: Interface para retorno do hook
interface UsePaginationReturn {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;
}

// AIDEV-NOTE: Função para detectar tamanho da tela e ajustar itens por página
const getResponsiveItemsPerPage = (defaultItems: number): number => {
  if (typeof window === 'undefined') return defaultItems;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // AIDEV-NOTE: Ajustar baseado na resolução da tela
  if (width < 640) { // Mobile
    return Math.min(25, defaultItems);
  } else if (width < 1024) { // Tablet
    return Math.min(50, defaultItems);
  } else if (height < 800) { // Desktop com altura pequena
    return Math.min(50, defaultItems);
  } else { // Desktop normal
    return defaultItems;
  }
};

// AIDEV-NOTE: Hook personalizado para gerenciar paginação com responsividade
export function usePagination({
  totalItems,
  defaultItemsPerPage = 10,
  defaultPage = 1,
  enableResponsive = true
}: UsePaginationProps): UsePaginationReturn {
  // AIDEV-NOTE: Estados da paginação
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [itemsPerPage, setItemsPerPageState] = useState(() => 
    enableResponsive ? getResponsiveItemsPerPage(defaultItemsPerPage) : defaultItemsPerPage
  );

  // AIDEV-NOTE: Efeito para ajustar itens por página baseado na resolução
  useEffect(() => {
    if (!enableResponsive) return;

    const handleResize = () => {
      const newItemsPerPage = getResponsiveItemsPerPage(defaultItemsPerPage);
      if (newItemsPerPage !== itemsPerPage) {
        setItemsPerPageState(newItemsPerPage);
        // AIDEV-NOTE: Ajustar página atual para manter contexto
        const currentStartIndex = (currentPage - 1) * itemsPerPage;
        const newPage = Math.floor(currentStartIndex / newItemsPerPage) + 1;
        setCurrentPage(newPage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, itemsPerPage, defaultItemsPerPage, enableResponsive]);

  // AIDEV-NOTE: Cálculos derivados da paginação
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalItems / itemsPerPage)), 
    [totalItems, itemsPerPage]
  );

  const startIndex = useMemo(() => 
    (currentPage - 1) * itemsPerPage, 
    [currentPage, itemsPerPage]
  );

  const endIndex = useMemo(() => 
    Math.min(startIndex + itemsPerPage - 1, totalItems - 1), 
    [startIndex, itemsPerPage, totalItems]
  );

  const hasNextPage = useMemo(() => 
    currentPage < totalPages, 
    [currentPage, totalPages]
  );

  const hasPreviousPage = useMemo(() => 
    currentPage > 1, 
    [currentPage]
  );

  // AIDEV-NOTE: Função para alterar página com validação
  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  // AIDEV-NOTE: Função para alterar itens por página
  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPageState(items);
    // AIDEV-NOTE: Manter posição relativa dos itens
    const currentStartIndex = (currentPage - 1) * itemsPerPage;
    const newPage = Math.floor(currentStartIndex / items) + 1;
    setCurrentPage(newPage);
  };

  // AIDEV-NOTE: Funções de navegação
  const goToNextPage = () => {
    if (hasNextPage) {
      handlePageChange(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      handlePageChange(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    handlePageChange(1);
  };

  const goToLastPage = () => {
    handlePageChange(totalPages);
  };

  // AIDEV-NOTE: Função para resetar paginação
  const reset = () => {
    setCurrentPage(defaultPage);
    setItemsPerPageState(
      enableResponsive ? getResponsiveItemsPerPage(defaultItemsPerPage) : defaultItemsPerPage
    );
  };

  // AIDEV-NOTE: Efeito para ajustar página quando totalItems muda
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    setCurrentPage: handlePageChange,
    setItemsPerPage: handleItemsPerPageChange,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    reset
  };
}