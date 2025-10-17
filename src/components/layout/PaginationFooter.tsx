import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// AIDEV-NOTE: Interface para definir as props do componente de paginação
interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  isLoading?: boolean;
  className?: string;
}

// AIDEV-NOTE: Opções de itens por página disponíveis
const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

// AIDEV-NOTE: Componente de paginação fixa com controles responsivos
export function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
  className = ""
}: PaginationFooterProps) {
  // AIDEV-NOTE: Calcular range de itens exibidos na página atual
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // AIDEV-NOTE: Função para gerar números de páginas visíveis
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      {/* AIDEV-NOTE: Informações de itens e seletor de itens por página */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-1 sm:gap-2">
          <span>Mostrando</span>
          <span className="font-medium text-foreground">
            {totalItems > 0 ? `${startItem}-${endItem}` : '0'}
          </span>
          <span>de</span>
          <span className="font-medium text-foreground">{totalItems}</span>
          <span>itens</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <span>Itens por página:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AIDEV-NOTE: Controles de navegação de páginas */}
      {totalPages > 1 && (
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* AIDEV-NOTE: Botão primeira página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || isLoading}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          {/* AIDEV-NOTE: Botão página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          {/* AIDEV-NOTE: Números de páginas com responsividade */}
          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
            {getVisiblePages().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-1 sm:px-2 py-1 text-muted-foreground text-xs sm:text-sm">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    disabled={isLoading}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* AIDEV-NOTE: Indicador de página atual em telas pequenas */}
          <div className="sm:hidden flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm">
            <span className="font-medium">{currentPage}</span>
            <span className="text-muted-foreground">de</span>
            <span className="font-medium">{totalPages}</span>
          </div>

          {/* AIDEV-NOTE: Botão próxima página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          {/* AIDEV-NOTE: Botão última página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}