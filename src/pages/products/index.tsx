/**
 * Página de Gerenciamento de Produtos
 * 
 * AIDEV-NOTE: Implementa interface moderna com Shadcn/UI + UIverse + Motion.dev
 * seguindo o padrão de segurança multi-tenant obrigatório.
 * Refatorada para usar PageLayout reutilizável e EditModal como serviços.
 * 
 * @module ProductsPage
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle,
  Package
} from 'lucide-react';

// Shadcn/UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Hooks e Utilitários
import { useSecureProducts, Product } from '@/hooks/useSecureProducts';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { usePagination } from '@/hooks/usePagination';
import { Layout } from '@/components/layout/Layout';
import { PageLayout } from '@/components/layout/PageLayout';
import { EditProductDialog } from '@/components/products/EditProductDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

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
  
  // AIDEV-NOTE: Estados locais para busca, filtros e modais
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // AIDEV-NOTE: Hook seguro para produtos com validação multi-tenant
  const {
    products = [],
    isLoading,
    error,
    refetch
  } = useSecureProducts({
    searchTerm,
    page: 1,
    limit: 50
  }, {
    enabled: hasAccess && !!currentTenant?.id
  });

  // AIDEV-NOTE: Hook para paginação reutilizável
  const pagination = usePagination({
    data: products,
    itemsPerPage: 10
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Produtos paginados para renderização
  const paginatedProducts = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return products.slice(startIndex, endIndex);
  }, [products, pagination.currentPage, pagination.itemsPerPage]);

  // AIDEV-NOTE: Função para refresh da página
  const refresh = () => {
    refetch();
  };

  // AIDEV-NOTE: Mutations para operações CRUD
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Implementar delete do produto
      throw new Error('Delete não implementado ainda');
    },
    onSuccess: () => {
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      // Implementar update do produto
      throw new Error('Update não implementado ainda');
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado",
        description: "O produto foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditModalOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: Omit<Product, 'id'>) => {
      // Implementar criação do produto
      throw new Error('Create não implementado ainda');
    },
    onSuccess: () => {
      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AIDEV-NOTE: Handlers para ações da interface
  const handleCreateProduct = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleSaveProduct = async (data: any) => {
    if (editingProduct) {
      // Atualizar produto existente
      updateProductMutation.mutate({ ...editingProduct, ...data });
    } else {
      // Criar novo produto
      createProductMutation.mutate(data);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setEditingProduct(null);
  };

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
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Nome</TableHead>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead className="w-[120px]">Valor</TableHead>
              <TableHead className="w-[100px]">Unidade</TableHead>
              <TableHead className="w-[80px]">Taxa (%)</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[80px]">Retenção</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
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
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground">
                          {product.description}
                        </div>
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
                      {formatCurrency(product.price)}
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
        onRefresh={refresh}
        isRefreshing={isLoading}
        actionButtons={
          <Button onClick={handleCreateProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        }
        cardTitle="Lista de Produtos"
        pagination={pagination}
      >
        {renderTableContent()}
      </PageLayout>

      {/* AIDEV-NOTE: Modal de Edição usando EditProductDialog específico */}
      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEditingProduct(null);
            queryClient.invalidateQueries(['secure-products']);
          }}
        />
      )}

      {/* AIDEV-NOTE: Modal de Criação usando CreateProductDialog */}
      {isCreateModalOpen && (
        <EditProductDialog
          product={{} as Product} // Produto vazio para criação
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries(['secure-products']);
          }}
        />
      )}
    </Layout>
  );
}
