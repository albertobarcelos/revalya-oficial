import { useState, useMemo, useEffect } from 'react';
import type { ValidationResultWithCustomer } from './useImportValidation';

/**
 * AIDEV-NOTE: Hook para gerenciar paginação na importação
 * Centraliza toda a lógica de paginação e navegação
 */
export function useImportPagination(
  filteredData: ValidationResultWithCustomer[],
  itemsPerPage: number = 10,
  activeFilter: string,
  searchTerm: string
) {
  const [currentPage, setCurrentPage] = useState(1);

  // AIDEV-NOTE: Cálculos de paginação baseados nos dados filtrados
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  // AIDEV-NOTE: Reset da página quando os dados ou filtro mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  // AIDEV-NOTE: Funções de navegação da paginação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    currentPageData,
    goToPage,
    goToPreviousPage,
    goToNextPage
  };
}