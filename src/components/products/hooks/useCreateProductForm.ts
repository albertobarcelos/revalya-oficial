import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useProductCodeGenerator } from '@/hooks/useProductCodeGenerator';
import type { FiscalData } from '../types/product-form.types';

// AIDEV-NOTE: Hook para gerenciar formulário de criação de produtos
// Implementa validação de tenant e mutação segura conforme guia de segurança

interface CreateProductFormData {
  name: string;
  description: string | null;
  code: string | null; // AIDEV-NOTE: Código interno do produto (PRD001, PRD002, ou personalizado)
  sku: string;
  barcode: string | null; // AIDEV-NOTE: JSONB - string JSON ou null
  price: number;
  cost_price: number | null;
  stock_quantity: number | null;
  min_stock: number | null;
  category_id: string | null; // AIDEV-NOTE: Foreign key para product_categories
  unit_of_measure: string | null;
  is_active: boolean;
}

export function useCreateProductForm(fiscalData?: FiscalData) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // 🔐 AIDEV-NOTE: Usar useTenantAccessGuard ao invés de useTenantContext para garantir acesso correto
  const { currentTenant } = useTenantAccessGuard();
  const { validateCodeExists, refreshMaxCode } = useProductCodeGenerator();

  // 🔄 Estado inicial do formulário para criação
  const [formData, setFormData] = useState<CreateProductFormData>({
    name: '',
    description: null,
    code: null, // AIDEV-NOTE: Será preenchido automaticamente pelo hook useProductCodeGenerator
    sku: '',
    barcode: null,
    price: 0,
    cost_price: null,
    stock_quantity: null,
    min_stock: null,
    category_id: null, // AIDEV-NOTE: Foreign key para product_categories
    unit_of_measure: null,
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔐 Mutação segura para criação de produtos
  const createProductMutation = useSecureTenantMutation(
    async (supabase, tenantId, productData: CreateProductFormData) => {
      console.log(`[AUDIT] Criando produto - Tenant: ${tenantId}`, productData);
      
      // 🔒 Validação dupla de tenant_id antes da criação
      if (!tenantId || tenantId !== currentTenant?.id) {
        throw new Error('Tenant ID inválido para criação de produto');
      }

      // AIDEV-NOTE: Incluir dados fiscais no insertData
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

      // 🔄 Preparar dados para inserção
      // AIDEV-NOTE: Converter barcode de string JSON para JSONB (objeto) antes de enviar (igual à edição)
      let barcodeValue: any = null;
      if (productData.barcode) {
        if (typeof productData.barcode === 'string') {
          try {
            barcodeValue = JSON.parse(productData.barcode); // AIDEV-NOTE: Parse string JSON para objeto
          } catch {
            // Se não conseguir parsear, deixar como null
            barcodeValue = null;
          }
        } else {
          barcodeValue = productData.barcode; // AIDEV-NOTE: Já é objeto, usar diretamente
        }
      }
      
      const insertData = {
        name: productData.name.trim(),
        description: productData.description?.trim() || null,
        code: productData.code?.trim() || null, // AIDEV-NOTE: Código interno (PRD001 ou personalizado)
        sku: productData.sku?.trim() || null, // AIDEV-NOTE: SKU opcional
        barcode: barcodeValue, // AIDEV-NOTE: JSONB - enviar como objeto, não string
        unit_price: Number(productData.price),
        cost_price: productData.cost_price ? Number(productData.cost_price) : null,
        stock_quantity: productData.stock_quantity ? Number(productData.stock_quantity) : 0,
        min_stock_quantity: productData.min_stock ? Number(productData.min_stock) : 0,
        category_id: productData.category_id || null, // AIDEV-NOTE: Foreign key para product_categories
        unit_of_measure: productData.unit_of_measure?.trim() || null,
        is_active: productData.is_active,
        ...fiscalFields, // AIDEV-NOTE: Incluir todos os dados fiscais
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

      // 🛡️ VALIDAÇÃO DUPLA DOS DADOS RETORNADOS (Conforme Manual de Segurança)
      // AIDEV-NOTE: Validar que o produto retornado pertence ao tenant correto
      if (!data) {
        console.error('[SECURITY] Produto não retornado após criação');
        throw new Error('Erro ao criar produto: dados não retornados');
      }
      
      if (data.tenant_id !== tenantId) {
        console.error('[SECURITY] Violação de segurança: produto retornado não pertence ao tenant', {
          productId: data.id,
          expectedTenant: tenantId,
          actualTenant: data.tenant_id
        });
        throw new Error('Violação de segurança: produto não pertence ao tenant');
      }

      console.log(`[SUCCESS] Produto criado com sucesso - ID: ${data.id}, Tenant: ${data.tenant_id}`);
      return data;
    },
    {
      onSuccess: (createdProduct) => {
        // 🛡️ VALIDAÇÃO FINAL DOS DADOS (Conforme Manual de Segurança)
        // AIDEV-NOTE: Validar novamente antes de invalidar cache e mostrar toast
        if (createdProduct && createdProduct.tenant_id) {
          // AIDEV-NOTE: Validação já foi feita na mutation, mas verificamos novamente por segurança
          console.log('[AUDIT] Produto criado com sucesso - validação final:', {
            productId: createdProduct.id,
            tenantId: createdProduct.tenant_id
          });
        }
        
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
  // AIDEV-NOTE: Usar setFormData com função de atualização para não depender de formData
  // Isso evita recriação desnecessária do callback
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []); // AIDEV-NOTE: Sem dependências - setFormData é estável e usa função de atualização

  // 🔄 Função para resetar o formulário
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: null,
      code: null, // AIDEV-NOTE: Será preenchido automaticamente quando o modal abrir novamente
      sku: '',
      barcode: null,
      price: 0,
      cost_price: null,
      stock_quantity: null,
      min_stock: null,
      category_id: null, // AIDEV-NOTE: Foreign key para product_categories
      unit_of_measure: null,
      is_active: true,
    });
  }, []);

  // 🔄 Função para validar dados antes do envio
  const validateForm = useCallback(async (): Promise<boolean> => {
    console.log('[DEBUG] Validando formulário - formData:', formData);
    
    if (!formData.name.trim()) {
      console.log('[DEBUG] Validação falhou: Nome do produto vazio');
      toast({
        title: 'Campo obrigatório',
        description: 'Nome do produto é obrigatório.',
        variant: 'destructive',
      });
      return false;
    }

    // AIDEV-NOTE: SKU não é mais obrigatório - removida validação

    if (formData.price <= 0) {
      console.log('[DEBUG] Validação falhou: Preço inválido:', formData.price);
      toast({
        title: 'Preço inválido',
        description: 'Preço deve ser maior que zero.',
        variant: 'destructive',
      });
      return false;
    }

    if (!currentTenant?.id) {
      console.log('[DEBUG] Validação falhou: Tenant não identificado');
      toast({
        title: 'Erro de contexto',
        description: 'Tenant não identificado. Recarregue a página.',
        variant: 'destructive',
      });
      return false;
    }

    // 🔍 VALIDAR CÓDIGO PERSONALIZADO SE FORNECIDO
    if (formData.code && formData.code.trim()) {
      const codeExists = await validateCodeExists(formData.code.trim());
      if (codeExists) {
        console.log('[DEBUG] Validação falhou: Código duplicado:', formData.code);
        toast({
          title: 'Código duplicado',
          description: `O código "${formData.code}" já está em uso. Escolha outro código.`,
          variant: 'destructive',
        });
        return false;
      }
    }

    console.log('[DEBUG] Validação passou com sucesso');
    return true;
  }, [formData, currentTenant, toast, validateCodeExists]);

  // 🔄 Função para submeter o formulário
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    console.log('[DEBUG] handleSubmit chamado - formData:', formData);
    
    const isValid = await validateForm();
    console.log('[DEBUG] Validação do formulário:', isValid);
    
    if (!isValid) {
      console.log('[DEBUG] Formulário inválido, abortando submissão');
      return false;
    }

    console.log('[DEBUG] Iniciando mutation com formData:', formData);
    
    return new Promise((resolve) => {
      createProductMutation.mutate(formData, {
        onSuccess: (data) => {
          console.log('[DEBUG] Mutation bem-sucedida:', data);
          
          // 🛡️ VALIDAÇÃO ADICIONAL DOS DADOS (Conforme Manual de Segurança)
          // AIDEV-NOTE: Validar tenant_id antes de atualizar cache
          if (data && data.tenant_id && data.tenant_id !== currentTenant?.id) {
            console.error('[SECURITY] Violação detectada no callback onSuccess:', {
              productId: data.id,
              expectedTenant: currentTenant?.id,
              actualTenant: data.tenant_id
            });
            resolve(false);
            return;
          }
          
          // 🔄 ATUALIZAR CACHE DO MAIOR CÓDIGO APÓS CRIAÇÃO
          refreshMaxCode();
          resolve(true);
        },
        onError: (error) => {
          console.error('[ERROR] Erro na submissão:', error);
          resolve(false);
        }
      });
    });
  }, [formData, validateForm, createProductMutation, refreshMaxCode]);

  return {
    formData,
    isLoading: createProductMutation.isPending,
    handleChange,
    handleSubmit,
    resetForm,
  };
}