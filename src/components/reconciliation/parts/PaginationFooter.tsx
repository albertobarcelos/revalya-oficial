// =====================================================
// PAGINATION FOOTER COMPONENT
// Descrição: Componente de paginação para a tabela de conciliação
// =====================================================

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// AIDEV-NOTE: Componente completo de paginação com controles de página e tamanho
export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  // AIDEV-NOTE: Validação de props para evitar erros de undefined
  const safePageSize = pageSize || 10;
  const safeTotalItems = totalItems || 0;
  const safeCurrentPage = currentPage || 1;
  const safeTotalPages = totalPages || 1;
  
  const startItem = (safeCurrentPage - 1) * safePageSize + 1;
  const endItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50">
      {/* AIDEV-NOTE: Informações de paginação */}
      <div className="text-sm text-slate-600">
        Mostrando {startItem} a {endItem} de {safeTotalItems} movimentações
      </div>

      <div className="flex items-center gap-4">
        {/* AIDEV-NOTE: Seletor de itens por página */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Itens por página:</span>
          <Select
            value={safePageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* AIDEV-NOTE: Controles de navegação */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {/* AIDEV-NOTE: Páginas numeradas com lógica de ellipsis */}
            {Array.from({ length: Math.min(5, safeTotalPages) }, (_, i) => {
              let pageNumber;
              if (safeTotalPages <= 5) {
                pageNumber = i + 1;
              } else if (safeCurrentPage <= 3) {
                pageNumber = i + 1;
              } else if (safeCurrentPage >= safeTotalPages - 2) {
                pageNumber = safeTotalPages - 4 + i;
              } else {
                pageNumber = safeCurrentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={safeCurrentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages}
            className="flex items-center gap-1"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};