/**
 * Página de Gerenciamento de Produtos
 * 
 * AIDEV-NOTE: Implementa interface moderna seguindo o padrão da página de contratos.
 * Refatorada para usar paginação no servidor, debounce na busca e estrutura idêntica.
 * 
 * @module ProductsPage
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { usePaginationState } from '@/components/ui/pagination-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSecureProducts, Product } from '@/hooks/useSecureProducts';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { Layout } from '@/components/layout/Layout';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Trash2, Package, AlertCircle, Info } from 'lucide-react';

// AIDEV-NOTE: Função para formatar unidades no padrão "Nome Completo (ABREVIAÇÃO)"
const translateUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'un': 'Unidade (UN)',
    'kg': 'Quilograma (KG)',
    'g': 'Grama (G)',
    'l': 'Litro (L)',
    'ml': 'Mililitro (ML)',
    'm': 'Metro (M)',
    'cm': 'Centímetro (CM)',
    'm2': 'Metro Quadrado (M²)',
    'm3': 'Metro Cúbico (M³)',
    'unit': 'Unidade (UN)',
    'piece': 'Peça',
    'gram': 'Grama (G)',
    'liter': 'Litro (L)',
    'meter': 'Metro (M)',
    'hour': 'Hora',
    'day': 'Dia',
    'month': 'Mês',
    'year': 'Ano',
    'box': 'Caixa',
    'pack': 'Pacote',
    'bottle': 'Garrafa',
    'can': 'Lata',
    'bag': 'Saco',
    'dozen': 'Dúzia',
    'pair': 'Par',
    'set': 'Conjunto'
  };
  
  const normalizedUnit = unit?.toLowerCase() || 'un';
  return unitMap[normalizedUnit] || unit || 'Unidade (UN)';
};

// AIDEV-NOTE: Componente principal da página de produtos
export default function ProductsPage() {
  const { toast } = useToast();
  
  // AIDEV-NOTE: Proteção de acesso multi-tenant obrigatória
  const { hasAccess, isLoading: accessLoading, currentTenant, accessError } = useTenantAccessGuard();
  
  // Estados de busca
  const [searchTerm, setSearchTerm] = useState("");
  
  // AIDEV-NOTE: Implementando debounce para busca em tempo real
  // Delay de 300ms para otimizar consultas ao banco sem prejudicar UX
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // AIDEV-NOTE: Usando hook personalizado para gerenciar estado de paginação
  const pagination = usePaginationState(25);
  
  // Estados para modais
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // AIDEV-NOTE: Usando busca dinâmica com debounce para otimizar performance
  const { 
    products, 
    total,
    isLoading, 
    error, 
    refetch,
    deleteProduct,
  } = useSecureProducts({
    searchTerm: debouncedSearchTerm,
    limit: pagination.itemsPerPage,
    page: pagination.currentPage,
  }, {
    enabled: hasAccess && !!currentTenant?.id
  });
  
  // AIDEV-NOTE: Calcular paginação baseada no totalCount (agora com paginação no servidor)
  const totalPages = Math.ceil(total / pagination.itemsPerPage);
  
  // AIDEV-NOTE: Reset da página quando searchTerm mudar
  useEffect(() => {
    pagination.resetToFirstPage();
  }, [debouncedSearchTerm, pagination.resetToFirstPage]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    pagination.resetToFirstPage(); // Resetar para primeira página ao buscar
  };

  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteProduct = useCallback((product: Product | string) => {
    const productId = typeof product === 'string' ? product : product.id;
    const productName = typeof product === 'string' ? 'este produto' : product.name;
    
    if (window.confirm(`Tem certeza que deseja excluir ${productName}?`)) {
      deleteProduct(productId, {
        onSuccess: () => {
          toast({
            title: "Sucesso",
            description: "Produto excluído com sucesso.",
            variant: "default"
          });
          refetch();
        },
        onError: (error) => {
          console.error('Erro ao excluir produto:', error);
          toast({
            title: "Erro",
            description: "Erro ao excluir produto. Tente novamente.",
            variant: "destructive"
          });
        }
      });
    }
  }, [deleteProduct, refetch, toast]);

  const handleCreateProduct = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateModalOpen(false);
    refetch(); // Atualiza a lista de produtos
  }, [refetch]);

  const handleEditSuccess = useCallback(() => {
    // AIDEV-NOTE: Não fechar o modal automaticamente em modo de edição
    // O usuário pode continuar editando ou fechar manualmente
    // setIsEditModalOpen(false); // REMOVIDO: Não fechar automaticamente
    // setEditingProduct(null); // REMOVIDO: Não limpar produto para permitir continuar editando
    refetch(); // Atualiza a lista de produtos
  }, [refetch]);

  const handleCancelCreate = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
  }, []);

  // AIDEV-NOTE: Verificação de acesso
  if (accessLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Verificando permissões...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-heading-3 font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">
              {accessError || "Você não tem permissão para acessar esta página."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // AIDEV-NOTE: Importações dinâmicas dos modais para otimização
  const CreateProductDialog = React.lazy(() => import('@/components/products/CreateProductDialog').then(module => ({ default: module.CreateProductDialog })));
  const EditProductDialog = React.lazy(() => import('@/components/products/EditProductDialog').then(module => ({ default: module.EditProductDialog })));

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-full p-4 md:p-8 pt-6 pb-0">
        <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between mb-2 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Produtos</h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCreateProduct}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Produto
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-small">Adicionar novo produto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="py-2 text-table font-medium">Nome</TableHead>
                      <TableHead className="py-2 text-table font-medium">Código</TableHead>
                      <TableHead className="py-2 text-table font-medium">Valor</TableHead>
                      <TableHead className="py-2 text-table font-medium">Unidade</TableHead>
                      <TableHead className="py-2 text-table font-medium">Taxa (%)</TableHead>
                      <TableHead className="py-2 text-table font-medium">Status</TableHead>
                      <TableHead className="py-2 text-table font-medium">Retenção</TableHead>
                      <TableHead className="text-right py-2 text-table font-medium">Excluir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: pagination.itemsPerPage }).map((_, index) => (
                      <TableRow key={index} className="h-12">
                        <TableCell className="py-1">
                          <Skeleton height={16} width={200} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={16} width={80} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={16} width={100} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={16} width={80} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={16} width={60} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={20} width={80} borderRadius={999} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={16} width={60} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Skeleton height={28} width={28} circle />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 rounded-md border">
                <div className="text-center text-destructive">
                  <p className="text-body">
                    Erro ao carregar produtos
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            ) : products?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-md border">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-center text-muted-foreground">
                  <p className="text-body font-medium">
                    {searchTerm 
                      ? 'Nenhum produto encontrado para a busca' 
                      : 'Nenhum produto cadastrado'}
                  </p>
                  {!searchTerm && (
                    <p className="text-sm mt-2 text-muted-foreground/80">
                      Clique em "Novo Produto" para começar
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md border flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="h-10">
                        <TableHead className="py-2 text-table font-medium">Nome</TableHead>
                        <TableHead className="py-2 text-table font-medium">Código</TableHead>
                        <TableHead className="py-2 text-table font-medium">Valor</TableHead>
                        <TableHead className="py-2 text-table font-medium">Unidade</TableHead>
                        <TableHead className="py-2 text-table font-medium">Taxa (%)</TableHead>
                        <TableHead className="py-2 text-table font-medium">Status</TableHead>
                        <TableHead className="py-2 text-table font-medium">Retenção</TableHead>
                        <TableHead className="text-right py-2 text-table font-medium">Excluir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product: Product) => (
                        <TableRow 
                          key={product.id} 
                          className="hover:bg-muted/50 h-12 cursor-pointer"
                          onClick={() => handleEditProduct(product)}
                        >
                          <TableCell className="font-medium py-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-table">{product.name}</span>
                              {product.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info 
                                        className="h-3 w-3 hover:text-foreground transition-colors cursor-help" 
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[300px]">
                                      <p className="text-small">{product.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-table">
                              {product.code || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-table text-green-600 font-medium">
                              {formatCurrency(product.unit_price)}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant="secondary" className="text-table">
                              {translateUnit(product.unit_of_measure || 'un')}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-table">
                              {product.tax_rate ? `${product.tax_rate}%` : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge 
                              variant={product.is_active ? "default" : "secondary"}
                              className={product.is_active ? "bg-green-100 text-green-800 text-table" : "text-table"}
                            >
                              {product.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1">
                            <span className="text-table">
                              {(product as any).withholding_tax ? 'Sim' : 'Não'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation(); // AIDEV-NOTE: Prevenir que o clique no botão dispare o onClick da linha
                                        handleDeleteProduct(product);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-small">Excluir produto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
          
          {!isLoading && total > 0 && (
            <div className="flex-shrink-0 border-t">
              <PaginationFooter
                currentPage={pagination.currentPage}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setCurrentPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                isLoading={isLoading}
              />
            </div>
          )}
        </Card>

        {/* AIDEV-NOTE: Modais com lazy loading para otimização */}
        <React.Suspense fallback={null}>
          <CreateProductDialog
            open={isCreateModalOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCancelCreate();
              }
            }}
            onSuccess={handleCreateSuccess}
          />
          
          <EditProductDialog
            isOpen={isEditModalOpen}
            onClose={handleCancelEdit}
            onSuccess={handleEditSuccess}
            product={editingProduct}
          />
        </React.Suspense>
      </div>
    </Layout>
  );
}
