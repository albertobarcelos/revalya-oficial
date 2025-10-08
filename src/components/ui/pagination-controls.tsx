import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// AIDEV-NOTE: Interface para definir as props do componente de paginação reutilizável
// Permite customização completa de comportamento e aparência
export interface PaginationControlsProps {
  // Dados de paginação
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  
  // Callbacks para mudanças
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  
  // Customizações opcionais
  itemsPerPageOptions?: number[];
  showItemsPerPageSelector?: boolean;
  showStatusText?: boolean;
  showNavigationButtons?: boolean;
  showNumberedPagination?: boolean;
  maxVisiblePages?: number;
  
  // Textos customizáveis
  statusTextTemplate?: (start: number, end: number, total: number) => string;
  itemsPerPageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  pageLabel?: string;
  
  // Classes CSS customizáveis
  className?: string;
  statusClassName?: string;
  controlsClassName?: string;
  
  // Estado de loading
  isLoading?: boolean;
}

// AIDEV-NOTE: Componente de paginação reutilizável que encapsula toda a lógica de navegação
// Suporta paginação numerada avançada, seletor de itens por página e textos customizáveis
export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  showItemsPerPageSelector = true,
  showStatusText = true,
  showNavigationButtons = true,
  showNumberedPagination = false,
  maxVisiblePages = 5,
  statusTextTemplate,
  itemsPerPageLabel = "Itens por página:",
  previousLabel = "Anterior",
  nextLabel = "Próximo",
  pageLabel = "Página",
  className = "",
  statusClassName = "",
  controlsClassName = "",
  isLoading = false,
}: PaginationControlsProps) {
  
  // AIDEV-NOTE: Cálculo das páginas totais e validações básicas
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // AIDEV-NOTE: Função para renderizar os itens de paginação numerada com elipses
  // Implementa lógica inteligente para mostrar páginas relevantes
  const renderPaginationItems = () => {
    if (!showNumberedPagination || totalPages <= 1) return null;
    
    const items = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Primeira página e elipse inicial
    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => onPageChange(1)}>
            <span className="sr-only">Ir para primeira página</span>
            1
          </PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
    }

    // Páginas visíveis
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => onPageChange(i)}
            isActive={currentPage === i}
            aria-current={currentPage === i ? 'page' : undefined}
          >
            <span className="sr-only">{pageLabel} {i}</span>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Última página e elipse final
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => onPageChange(totalPages)}>
            <span className="sr-only">Ir para última página</span>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  // AIDEV-NOTE: Função para gerar texto de status customizável
  const getStatusText = () => {
    if (statusTextTemplate) {
      return statusTextTemplate(startItem, endItem, totalItems);
    }
    return `Mostrando ${startItem} a ${endItem} de ${totalItems} itens`;
  };

  // AIDEV-NOTE: Handler para mudança de itens por página com reset de página
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = Number(value);
    onItemsPerPageChange(newItemsPerPage);
    // Reset para primeira página quando mudar itens por página
    if (currentPage > Math.ceil(totalItems / newItemsPerPage)) {
      onPageChange(1);
    }
  };

  // Não renderizar se não há itens ou está carregando
  if (isLoading || totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 ${className}`}>
      {/* Status e seletor de itens por página */}
      {(showStatusText || showItemsPerPageSelector) && (
        <div className={`flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-4 ${statusClassName}`}>
          {showStatusText && (
            <p className="text-sm text-gray-500">
              {getStatusText()}
            </p>
          )}
          
          {showItemsPerPageSelector && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">{itemsPerPageLabel}</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemsPerPageOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      
      {/* Controles de navegação */}
      {(showNavigationButtons || showNumberedPagination) && totalPages > 1 && (
        <div className={`flex items-center space-x-2 ${controlsClassName}`}>
          {showNavigationButtons && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
              >
                {previousLabel}
              </Button>
              
              {!showNumberedPagination && (
                <span className="text-sm text-gray-600">
                  {pageLabel} {currentPage} de {totalPages}
                </span>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                {nextLabel}
              </Button>
            </>
          )}
          
          {showNumberedPagination && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}

// AIDEV-NOTE: Hook personalizado para gerenciar estado de paginação
// Simplifica o uso do componente PaginationControls
export function usePaginationState(initialItemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(initialItemsPerPage);

  // AIDEV-NOTE: Reset da página quando itens por página mudar
  const handleItemsPerPageChange = React.useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // AIDEV-NOTE: Reset da página para busca ou filtros
  const resetToFirstPage = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage: handleItemsPerPageChange,
    resetToFirstPage,
  };
}