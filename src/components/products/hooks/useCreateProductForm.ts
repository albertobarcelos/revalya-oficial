import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/hooks/useTenantContext';

// AIDEV-NOTE: Hook para gerenciar formulário de criação de produtos
// Implementa validação de tenant e mutação segura conforme guia de segurança

interface CreateProductFormData {
  name: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number | null;
  min_stock: number | null;
  category: string | null;
  unit: string | null;
  is_active: boolean;
}

export function useCreateProductForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentTenant } = useTenantContext();

  // 🔄 Estado inicial do formulário para criação
  const [formData, setFormData] = useState<CreateProductFormData>({
    name: '',
    description: null,
    sku: '',
    barcode: null,
    price: 0,
    cost_price: null,
    stock_quantity: null,
    min_stock: null,
    category: null,
    unit: null,
    is_active: true,
  });

  // 🔐 Mutação segura para criação de produtos
  const createProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, productData: CreateProductFormData) => {
      console.log(`[AUDIT] Criando produto - Tenant: ${tenantId}`, productData);
      
      // 🔒 Validação dupla de tenant_id antes da criação
      if (!tenantId || tenantId !== currentTenant?.id) {
        throw new Error('Tenant ID inválido para criação de produto');
      }

      // 🔄 Preparar dados para inserção
      const insertData = {
        name: productData.name.trim(),
        description: productData.description?.trim() || null,
        sku: productData.sku.trim(),
        barcode: productData.barcode?.trim() || null,
        unit_price: Number(productData.price),
        cost_price: productData.cost_price ? Number(productData.cost_price) : null,
        stock_quantity: productData.stock_quantity ? Number(productData.stock_quantity) : 0,
        min_stock_quantity: productData.min_stock ? Number(productData.min_stock) : 0,
        category: productData.category?.trim() || null,
        unit: productData.unit?.trim() || null,
        is_active: productData.is_active,
        tenant_id: tenantId, // 🔒 Garantir tenant_id na criação
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('products')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro ao criar produto:', error);
        throw error;
      }

      console.log(`[SUCCESS] Produto criado com sucesso - ID: ${data.id}`);
      return data;
    },
    {
      onSuccess: () => {
        // 🔄 Invalidar cache de produtos para atualizar lista
        queryClient.invalidateQueries({ queryKey: ['secure-products'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        
        toast({
          title: 'Produto criado com sucesso!',
          description: 'O novo produto foi adicionado ao sistema.',
        });
      },
      onError: (error: any) => {
        console.error('[ERROR] Falha ao criar produto:', error);
        
        let errorMessage = 'Erro ao criar produto. Tente novamente.';
        
        if (error?.code === '23505') {
          errorMessage = 'SKU já existe. Use um código único.';
        } else if (error?.message?.includes('tenant')) {
          errorMessage = 'Erro de permissão. Verifique seu acesso.';
        }
        
        toast({
          title: 'Erro ao criar produto',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    }
  );

  // 🔄 Função para atualizar campos do formulário
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // 🔄 Função para resetar o formulário
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: null,
      sku: '',
      barcode: null,
      price: 0,
      cost_price: null,
      stock_quantity: null,
      min_stock: null,
      category: null,
      unit: null,
      is_active: true,
    });
  }, []);

  // 🔄 Função para validar dados antes do envio
  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Nome do produto é obrigatório.',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.sku.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'SKU é obrigatório.',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.price <= 0) {
      toast({
        title: 'Preço inválido',
        description: 'Preço deve ser maior que zero.',
        variant: 'destructive',
      });
      return false;
    }

    if (!currentTenant?.id) {
      toast({
        title: 'Erro de contexto',
        description: 'Tenant não identificado. Recarregue a página.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [formData, currentTenant, toast]);

  // 🔄 Função para submeter o formulário
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!validateForm()) {
      return false;
    }

    try {
      await createProductMutation.mutateAsync(formData);
      return true;
    } catch (error) {
      console.error('[ERROR] Erro na submissão:', error);
      return false;
    }
  }, [formData, validateForm, createProductMutation]);

  return {
    formData,
    isLoading: createProductMutation.isPending,
    handleChange,
    handleSubmit,
    resetForm,
  };
}