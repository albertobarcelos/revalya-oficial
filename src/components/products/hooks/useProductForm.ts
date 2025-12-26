import React, { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/hooks/useSecureProducts';
import type { FiscalData } from '../types/product-form.types';

// AIDEV-NOTE: Hook para gerenciar formulário de edição de produtos
// Implementa validação de tenant e mutação segura conforme guia de segurança

interface ProductFormData {
  name: string;
  description: string | null;
  code: string | null;
  sku: string | null;
  barcode: string | null; // AIDEV-NOTE: JSONB - string JSON ou null
  unit_price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_quantity: number;
  category: string | null;
  category_id: string | null; // AIDEV-NOTE: Foreign key para product_categories
  brand_id: string | null; // AIDEV-NOTE: Foreign key para product_brands
  supplier: string | null;
  unit_of_measure: string | null;
  tax_rate: number;
  has_inventory: boolean;
  is_active: boolean;
  image_url: string | null;
}

export function useProductForm(product: Product, onSuccess: () => void, fiscalData?: FiscalData) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🔄 Estado do formulário inicializado com dados do produto
  const [formData, setFormData] = useState<ProductFormData>({
    name: product.name,
    description: product.description || null,
    code: product.code || null, // AIDEV-NOTE: Usar code diretamente, sem fallback para sku
    sku: product.sku,
    barcode: product.barcode 
      ? (typeof product.barcode === 'string' 
          ? product.barcode 
          : JSON.stringify(product.barcode)) 
      : null, // AIDEV-NOTE: Converter JSONB para string JSON se necessário
    unit_price: product.unit_price, // Usando unit_price correto
    cost_price: product.cost_price || null, // Usando cost_price correto
    stock_quantity: product.stock_quantity,
    min_stock_quantity: product.min_stock_quantity || 0, // Usando min_stock_quantity correto
    category: product.category || null,
    category_id: product.category_id || null, // AIDEV-NOTE: Foreign key para product_categories
    brand_id: product.brand_id || null, // AIDEV-NOTE: Foreign key para product_brands
    supplier: product.supplier || null, // Usando supplier correto
    unit_of_measure: product.unit_of_measure || null, // Usando unit_of_measure da nova coluna
    tax_rate: product.tax_rate || 0, // Usando tax_rate da interface
    has_inventory: product.has_inventory !== undefined ? product.has_inventory : true, // Usando has_inventory da interface
    is_active: product.is_active, // Usando is_active correto
    image_url: product.image_url || null, // Usando image_url correto
  });

  // AIDEV-NOTE: Atualizar formData quando o produto mudar (importante quando produto é carregado assincronamente)
  // Isso garante que quando passamos um produto dummy inicialmente e depois o produto real,
  // o formulário seja atualizado com os dados corretos
  useEffect(() => {
    // Só atualizar se o produto tiver um ID válido (não é dummy)
    if (product.id && product.id.trim() !== '') {
      setFormData({
        name: product.name,
        description: product.description || null,
        code: product.code || null,
        sku: product.sku,
        barcode: product.barcode 
          ? (typeof product.barcode === 'string' 
              ? product.barcode 
              : JSON.stringify(product.barcode)) 
          : null,
        unit_price: product.unit_price,
        cost_price: product.cost_price || null,
        stock_quantity: product.stock_quantity,
        min_stock_quantity: product.min_stock_quantity || 0,
        category: product.category || null,
        category_id: product.category_id || null,
        brand_id: product.brand_id || null,
        supplier: product.supplier || null,
        unit_of_measure: product.unit_of_measure || null,
        tax_rate: product.tax_rate || 0,
        has_inventory: product.has_inventory !== undefined ? product.has_inventory : true,
        is_active: product.is_active,
        image_url: product.image_url || null,
      });
    }
  }, [product.id]); // AIDEV-NOTE: Usar apenas product.id como dependência para evitar atualizações desnecessárias

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
      // AIDEV-NOTE: Remover campo legado 'category' e usar apenas 'category_id'
      const { category, ...dataWithoutLegacyCategory } = data;
      
      // AIDEV-NOTE: Converter barcode de string JSON para JSONB (objeto) antes de enviar
      let barcodeValue: any = null;
      if (data.barcode) {
        if (typeof data.barcode === 'string') {
          try {
            barcodeValue = JSON.parse(data.barcode);
          } catch {
            // Se não conseguir parsear, deixar como null
            barcodeValue = null;
          }
        } else {
          barcodeValue = data.barcode;
        }
      }
      
      // AIDEV-NOTE: Incluir dados fiscais no updateData
      // Apenas campos que existem na tabela products
      const fiscalFields: Partial<Record<string, any>> = fiscalData ? {
        ncm: fiscalData.ncm || null,
        cest: fiscalData.cest || null, // AIDEV-NOTE: CEST adicionado à tabela
        product_type_id: fiscalData.product_type_id || null,
        cfop_id: fiscalData.cfop_id || null,
        origem: fiscalData.origem || '0',
        cst_icms: fiscalData.cst_icms || null,
        cst_icms_id: fiscalData.cst_icms_id || null,
        cst_ipi: fiscalData.cst_ipi || null,
        cst_ipi_id: fiscalData.cst_ipi_id || null,
        cst_pis: fiscalData.cst_pis || null,
        cst_pis_id: fiscalData.cst_pis_id || null,
        cst_cofins: fiscalData.cst_cofins || null,
        cst_cofins_id: fiscalData.cst_cofins_id || null,
        // AIDEV-NOTE: Alíquotas de PIS e COFINS
        aliquota_pis: fiscalData.aliquota_pis ? parseFloat(fiscalData.aliquota_pis) : null,
        aliquota_cofins: fiscalData.aliquota_cofins ? parseFloat(fiscalData.aliquota_cofins) : null,
        // AIDEV-NOTE: Campos abaixo não existem na tabela products - removidos
        // use_default_pis_cofins, cst_ibs_cbs, cclass_trib
      } : {};

      const updateData = {
        ...dataWithoutLegacyCategory,
        barcode: barcodeValue, // AIDEV-NOTE: JSONB - enviar como objeto, não string
        category_id: data.category_id || null, // AIDEV-NOTE: Garantir que category_id seja enviado
        brand_id: data.brand_id || null, // AIDEV-NOTE: Garantir que brand_id seja enviado
        ...fiscalFields, // AIDEV-NOTE: Incluir todos os dados fiscais
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
      
      // 🛡️ VALIDAÇÃO DUPLA DOS DADOS RETORNADOS (Conforme Manual de Segurança)
      // AIDEV-NOTE: Validar que o produto retornado pertence ao tenant correto
      if (!updatedProduct) {
        console.error('[SECURITY] Produto não retornado após atualização');
        throw new Error('Erro ao atualizar produto: dados não retornados');
      }
      
      if (updatedProduct.tenant_id !== tenantId) {
        console.error('[SECURITY] Violação de segurança: produto retornado não pertence ao tenant', {
          productId: updatedProduct.id,
          expectedTenant: tenantId,
          actualTenant: updatedProduct.tenant_id
        });
        throw new Error('Violação de segurança: produto não pertence ao tenant');
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
        // 🛡️ VALIDAÇÃO FINAL DOS DADOS (Conforme Manual de Segurança)
        // AIDEV-NOTE: Validar novamente antes de invalidar cache e mostrar toast
        if (updatedProduct && updatedProduct.tenant_id) {
          // AIDEV-NOTE: Validação já foi feita na mutation, mas verificamos novamente por segurança
          console.log('[AUDIT] Produto atualizado com sucesso - validação final:', {
            productId: updatedProduct.id,
            tenantId: updatedProduct.tenant_id
          });
        }
        
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
  // AIDEV-NOTE: Usar setFormData com função de atualização para não depender de formData
  // Isso evita recriação desnecessária do callback
  const handleChange = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []); // AIDEV-NOTE: Sem dependências - setFormData é estável e usa função de atualização

  // 📝 Função para submeter o formulário
  const handleSubmit = useCallback((e?: React.FormEvent): Promise<boolean> => {
    // AIDEV-NOTE: Permitir chamada sem evento (quando chamado programaticamente)
    if (e) {
      e.preventDefault();
    }
    
    // ✅ Validações básicas
    if (!formData.name.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O nome do produto é obrigatório.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    if (formData.unit_price <= 0) {
      toast({
        title: 'Erro de validação',
        description: 'O preço de venda deve ser maior que zero.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    if (formData.cost_price !== null && formData.cost_price < 0) {
      toast({
        title: 'Erro de validação',
        description: 'O preço de custo não pode ser negativo.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    if (formData.stock_quantity < 0) {
      toast({
        title: 'Erro de validação',
        description: 'A quantidade em estoque não pode ser negativa.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    if (formData.min_stock_quantity < 0) {
      toast({
        title: 'Erro de validação',
        description: 'O estoque mínimo não pode ser negativo.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    if (formData.tax_rate < 0 || formData.tax_rate > 100) {
      toast({
        title: 'Erro de validação',
        description: 'A taxa de imposto deve estar entre 0% e 100%.',
        variant: 'destructive',
      });
      return Promise.resolve(false);
    }
    
    // 🚀 Executar mutação
    // AIDEV-NOTE: Usar mutateAsync para aguardar a conclusão da mutação
    // O onSuccess do hook será chamado quando a mutação for bem-sucedida
    return updateProductMutation.mutateAsync(formData)
      .then(() => true)
      .catch(() => false);
  }, [formData, updateProductMutation, toast]);

  return {
    formData,
    isLoading: updateProductMutation.isPending,
    handleSubmit,
    handleChange,
    updateProductMutation, // AIDEV-NOTE: Expor mutação para permitir atualização direta
  };
}