import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/hooks/useSecureProducts';

// AIDEV-NOTE: Hook para gerenciar formulário de edição de produtos
// Implementa validação de tenant e mutação segura conforme guia de segurança

interface ProductFormData {
  name: string;
  description: string | null;
  code: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  category: string | null;
  supplier: string | null;
  tax_rate: number;
  has_inventory: boolean;
  is_active: boolean;
  image_url: string | null;
}

export function useProductForm(product: Product, onSuccess: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🔄 Estado do formulário inicializado com dados do produto
  const [formData, setFormData] = useState<ProductFormData>({
    name: product.name,
    description: product.description,
    code: product.code || product.sku, // Usando code ou sku como fallback
    sku: product.sku,
    barcode: product.barcode,
    unit_price: product.unit_price, // Usando unit_price correto
    cost_price: product.cost_price, // Usando cost_price correto
    stock_quantity: product.stock_quantity,
    min_stock_quantity: product.min_stock_quantity || 0, // Usando min_stock_quantity correto
    category: product.category,
    supplier: product.supplier, // Usando supplier correto
    tax_rate: product.tax_rate || 0, // Usando tax_rate da interface
    has_inventory: product.has_inventory !== undefined ? product.has_inventory : true, // Usando has_inventory da interface
    is_active: product.is_active, // Usando is_active correto
    image_url: product.image_url || null, // Usando image_url correto
  });

  // 🔐 Mutação segura para atualizar produto
  const updateProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, data: ProductFormData) => {
      console.log(`[AUDIT] Atualizando produto - Tenant: ${tenantId}, Produto: ${product.id}`);
      
      // 🛡️ Validação dupla de segurança antes da atualização
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('tenant_id')
        .eq('id', product.id)
        .eq('tenant_id', tenantId)
        .single();
        
      if (checkError || !existingProduct) {
        console.error('[SECURITY] Produto não encontrado ou não pertence ao tenant:', {
          productId: product.id,
          tenantId,
          error: checkError
        });
        throw new Error('Produto não encontrado ou acesso negado');
      }
      
      if (existingProduct.tenant_id !== tenantId) {
        console.error('[SECURITY] Tentativa de atualização de produto de outro tenant:', {
          productId: product.id,
          expectedTenant: tenantId,
          actualTenant: existingProduct.tenant_id
        });
        throw new Error('Violação de segurança: produto não pertence ao tenant');
      }
      
      // 📝 Preparar dados para atualização
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      
      const { data: updatedProduct, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)
        .eq('tenant_id', tenantId) // 🔒 Filtro de segurança obrigatório
        .select()
        .single();
        
      if (error) {
        console.error('Erro ao atualizar produto:', error);
        throw error;
      }
      
      console.log('Produto atualizado com sucesso:', {
        id: updatedProduct.id,
        name: updatedProduct.name,
        tenant_id: updatedProduct.tenant_id
      });
      
      return updatedProduct;
    },
    {
      onSuccess: (updatedProduct) => {
        // 🔄 Invalidar caches relacionados
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product-details', product.id] });
        
        toast({
          title: 'Produto atualizado',
          description: `${updatedProduct.name} foi atualizado com sucesso.`,
        });
        
        onSuccess();
      },
      onError: (error) => {
        console.error('Erro na mutação de atualização:', error);
        toast({
          title: 'Erro ao atualizar produto',
          description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
          variant: 'destructive',
        });
      },
    }
  );

  // 🔄 Função para atualizar campos do formulário
  const handleChange = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 📝 Função para submeter o formulário
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Validações básicas
    if (!formData.name.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O nome do produto é obrigatório.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.unit_price <= 0) {
      toast({
        title: 'Erro de validação',
        description: 'O preço de venda deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.cost_price !== null && formData.cost_price < 0) {
      toast({
        title: 'Erro de validação',
        description: 'O preço de custo não pode ser negativo.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.stock_quantity < 0) {
      toast({
        title: 'Erro de validação',
        description: 'A quantidade em estoque não pode ser negativa.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.min_stock_quantity < 0) {
      toast({
        title: 'Erro de validação',
        description: 'O estoque mínimo não pode ser negativo.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.tax_rate < 0 || formData.tax_rate > 100) {
      toast({
        title: 'Erro de validação',
        description: 'A taxa de imposto deve estar entre 0% e 100%.',
        variant: 'destructive',
      });
      return;
    }
    
    // 🚀 Executar mutação
    updateProductMutation.mutate(formData);
  }, [formData, updateProductMutation, toast]);

  return {
    formData,
    isLoading: updateProductMutation.isPending,
    handleSubmit,
    handleChange,
  };
}