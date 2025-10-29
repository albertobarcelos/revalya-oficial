/**
 * Página de Gerenciamento de Produtos
 * 
 * AIDEV-NOTE: Implementa interface moderna com Shadcn/UI + UIverse + Motion.dev
 * seguindo o padrão de segurança multi-tenant obrigatório.
 * Refatorada para usar PageLayout reutilizável e EditModal como serviços.
 * 
 * @module ProductsPage
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  Package,
  Info
} from 'lucide-react';

// Shadcn/UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Hooks e Utilitários
import { useSecureProducts, Product } from '@/hooks/useSecureProducts';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useProductCodeGenerator } from '@/hooks/useProductCodeGenerator';
import { usePagination } from '@/hooks/usePagination';
import { Layout } from '@/components/layout/Layout';
import { PageLayout } from '@/components/layout/PageLayout';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Componentes específicos para produtos
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
import { EditProductDialog } from '@/components/products/EditProductDialog';

// AIDEV-NOTE: Função para traduzir unidades do inglês para português
const translateUnit = (unit: string): string => {
  const translations: Record<string, string> = {
    'unit': 'unidade',
    'piece': 'peça',
    'kg': 'kg',
    'gram': 'grama',
    'liter': 'litro',
    'meter': 'metro',
    'hour': 'hora',
    'day': 'dia',
    'month': 'mês',
    'year': 'ano',
    'box': 'caixa',
    'pack': 'pacote',
    'bottle': 'garrafa',
    'can': 'lata',
    'bag': 'saco',
    'dozen': 'dúzia',
    'pair': 'par',
    'set': 'conjunto'
  };
  
  return translations[unit?.toLowerCase()] || unit || 'unidade';
};

// AIDEV-NOTE: Componente principal da página de produtos
export default function ProductsPage() {
  // AIDEV-NOTE: Proteção de acesso multi-tenant obrigatória
  const { hasAccess, isLoading: accessLoading, currentTenant, accessError } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Estados para controle da interface seguindo padrão de serviços
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // AIDEV-NOTE: Hook seguro para produtos com validação multi-tenant
  const {
    products = [],
    isLoading,
    error,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError
  } = useSecureProducts({
    searchTerm,
    page: 1,
    limit: 50
  }, {
    enabled: hasAccess && !!currentTenant?.id
  });

  // AIDEV-NOTE: Hook para geração automática de código de produto
  const { 
    nextAvailableCode, 
    isLoading: isLoadingMaxCode, 
    validateCode 
  } = useProductCodeGenerator();

  // AIDEV-NOTE: Hook para paginação reutilizável
  const pagination = usePagination({
    data: products,
    itemsPerPage: 10
  });

  const { toast } = useToast();

  // AIDEV-NOTE: Produtos paginados para renderização
  const paginatedProducts = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return products.slice(startIndex, endIndex);
  }, [products, pagination.currentPage, pagination.itemsPerPage]);

  // AIDEV-NOTE: Handlers para ações da interface seguindo padrão de serviços
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteProduct = useCallback((productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(productId);
    }
  }, [deleteProduct]);

  const handleCreateProduct = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateModalOpen(false);
    refetch(); // Atualiza a lista de produtos
  }, [refetch]);

  const handleEditSuccess = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
    refetch(); // Atualiza a lista de produtos
  }, [refetch]);

  const handleCancelCreate = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
  }, []);

  // AIDEV-NOTE: Handler para validação de código seguindo padrão de serviços
  const handleCodeValidation = useCallback(async (code: string, currentId?: string) => {
    if (!code.trim()) return true; // Código vazio é válido (será gerado automaticamente)
    return await validateCode(code, currentId);
  }, [validateCode]);

  // 🎨 COMPONENTE REUTILIZÁVEL PARA HEADER DA TABELA
  const TableHeaderComponent = ({ isSticky = false }: { isSticky?: boolean }) => (
    <TableHeader className={isSticky ? "sticky top-0 bg-background z-10" : ""}>
      <TableRow className="h-10">
        <TableHead className="py-2">Nome</TableHead>
        <TableHead className="py-2">Código</TableHead>
        <TableHead className="py-2">Valor</TableHead>
        <TableHead className="py-2">Unidade</TableHead>
        <TableHead className="py-2">Taxa (%)</TableHead>
        <TableHead className="py-2">Status</TableHead>
        <TableHead className="py-2">Retenção</TableHead>
        <TableHead className="text-right py-2">Ações</TableHead>
      </TableRow>
    </TableHeader>
  );

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
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">
              {accessError || "Você não tem permissão para acessar esta página."}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // AIDEV-NOTE: Renderização do conteúdo da tabela
  const renderTableContent = () => {
    if (isLoading) {
      return (
        <div className="rounded-md border">
          <Table>
            <TableHeaderComponent />
            <TableBody>
              {Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index} className="h-10">
                  <TableCell className="py-1"><Skeleton className="h-4 w-[200px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[100px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[60px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[80px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[60px]" /></TableCell>
                   <TableCell className="py-1"><Skeleton className="h-4 w-[40px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar produtos: {error.message}
            </p>
          </div>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado para sua busca.' : 'Nenhum produto cadastrado.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeaderComponent isSticky={true} />
          <TableBody>
            <AnimatePresence>
              {paginatedProducts.map((product) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell className="font-medium py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{product.name}</span>
                      {product.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info 
                                className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors cursor-help" 
                              />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[300px]">
                              <p className="text-xs">{product.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {product.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(product.unit_price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {translateUnit(product.unit)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.tax_rate ? `${product.tax_rate}%` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={product.is_active ? "default" : "secondary"}
                      className={product.is_active ? "bg-green-100 text-green-800" : ""}
                    >
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.withholding_tax ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <span className="sr-only">Editar produto</span>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProduct(product)}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <span className="sr-only">Excluir produto</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Layout>
      <PageLayout
        title="Produtos"
        searchPlaceholder="Buscar produto..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        actionButtons={
          <Button onClick={handleCreateProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        }
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalItems: pagination.totalItems,
          itemsPerPage: pagination.itemsPerPage,
          onPageChange: pagination.setCurrentPage,
          onItemsPerPageChange: pagination.setItemsPerPage,
          isLoading: isLoading
        }}
      >
        {renderTableContent()}
      </PageLayout>

      {/* AIDEV-NOTE: Modal específico para criação de produtos */}
      <CreateProductDialog
        open={isCreateModalOpen}
        close={handleCancelCreate}
        onSuccess={handleCreateSuccess}
      />
      
      {/* AIDEV-NOTE: Modal específico para edição de produtos */}
      <EditProductDialog
        Open={isEditModalOpen}
        Close={handleCancelEdit}
        onSuccess={handleEditSuccess}
        product={editingProduct}
      />
    </Layout>
  );
}
