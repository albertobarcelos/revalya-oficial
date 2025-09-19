import React from 'react';
import { motion } from 'framer-motion';
import { Search, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PaginationFooter } from './PaginationFooter';

// AIDEV-NOTE: Interface para definir as props do componente PageLayout
interface PageLayoutProps {
  title: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actionButtons?: React.ReactNode;
  cardTitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  // AIDEV-NOTE: Props para paginação
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    isLoading?: boolean;
  };
}

// AIDEV-NOTE: Componente reutilizável para padronizar layout das páginas de listagem
export function PageLayout({
  title,
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  actionButtons,
  cardTitle,
  children,
  footer,
  className = "",
  pagination
}: PageLayoutProps) {
  return (
    <div className={`flex-1 space-y-4 p-4 md:p-8 pt-6 ${className}`}>
      {/* AIDEV-NOTE: Cabeçalho com título, busca e botões de ação */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8 w-full"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* AIDEV-NOTE: Botão de atualizar com tooltip */}
          {onRefresh && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                  >
                    <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar lista</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* AIDEV-NOTE: Botões de ação customizáveis */}
          {actionButtons}
        </div>
      </motion.div>

      {/* AIDEV-NOTE: Card principal com conteúdo e paginação fixa */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col h-[calc(100vh-12rem)]"
      >
        <Card className="flex-1 flex flex-col overflow-hidden">
          {cardTitle && (
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle>{cardTitle}</CardTitle>
            </CardHeader>
          )}
          
          <CardContent className="p-0 flex-1 overflow-auto">
            {children}
          </CardContent>
          
          {/* AIDEV-NOTE: Rodapé com paginação fixa ou footer customizado */}
          {pagination ? (
            <div className="flex-shrink-0">
              <PaginationFooter
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.onPageChange}
                onItemsPerPageChange={pagination.onItemsPerPageChange}
                isLoading={pagination.isLoading}
              />
            </div>
          ) : footer ? (
            <CardFooter className="flex items-center justify-between border-t p-4 flex-shrink-0">
              {footer}
            </CardFooter>
          ) : null}
        </Card>
      </motion.div>
    </div>
  );
}