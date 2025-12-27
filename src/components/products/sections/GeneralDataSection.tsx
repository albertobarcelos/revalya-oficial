/**
 * Seção: Dados Gerais
 * 
 * AIDEV-NOTE: Componente refatorado com clean code
 * - Hooks customizados para lógica complexa
 * - Componentes isolados para reutilização
 * - Separação de responsabilidades
 * - Performance: Memoizado para evitar re-renders desnecessários
 */

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useProductCategories, type ProductCategory } from '@/hooks/useProductCategories';
import { useProductCode } from './hooks/useProductCode';
import { usePriceInput } from './hooks/usePriceInput';
import { ProductCodeField } from './components/ProductCodeField';
import { CategorySelect } from './components/CategorySelect';
import { BrandSelect } from './components/BrandSelect';
import { PriceField } from './components/PriceField';
import { CreateCategoryDialog } from './components/CreateCategoryDialog';
import { CreateBrandDialog } from './components/CreateBrandDialog';
import type { GeneralDataSectionProps } from '../types/product-form.types';

// AIDEV-NOTE: Opções de unidade de medida
const UNIT_OPTIONS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'm2', label: 'Metro Quadrado (m²)' },
  { value: 'm3', label: 'Metro Cúbico (m³)' },
];

// AIDEV-NOTE: Componente memoizado para evitar re-renders desnecessários
// Comparação customizada para otimizar performance
// TEMPORARIAMENTE: Removendo memo para debug - será reativado após correção
export function GeneralDataSection({
  formData,
  onChange,
  categories = [],
  isLoadingCategories = false,
  isEditMode = false,
  brands = [],
  isLoadingBrands = false,
  validateCodeExists,
  nextAvailableCode,
  isLoadingMaxCode = false,
  hasCodeAccess = false,
  createBrand,
  isCreatingBrand = false,
  brandsError,
  refetchBrands,
  productId,
}: GeneralDataSectionProps) {
  // AIDEV-NOTE: Hook apenas para criar categoria (lista vem via props)
  // AIDEV-NOTE: Usar enabled: false para evitar query desnecessária, só precisamos da função createCategory
  const { createCategory, isCreating: isCreatingCategory } = useProductCategories({ 
    is_active: true,
    limit: 1,
    enabled: false, // AIDEV-NOTE: Não buscar dados, só precisamos da função de criação
  });

  // AIDEV-NOTE: Estados para dialogs de criação
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [isCreateBrandDialogOpen, setIsCreateBrandDialogOpen] = useState(false);

  // AIDEV-NOTE: Hook para gerenciar código interno do produto
  const codeState = useProductCode({
    formData,
    isEditMode,
    validateCodeExists,
    nextAvailableCode,
    hasCodeAccess,
    productId,
    onChange,
  });

  // AIDEV-NOTE: Hook para gerenciar input de preço
  const priceState = usePriceInput({
    formData,
    isEditMode,
    onChange,
  });

  // AIDEV-NOTE: Handler para mudança de categoria
  const handleCategoryChange = useCallback((value: string) => {
    onChange({
      target: { name: 'category_id', value }
    } as any);
  }, [onChange]);

  // AIDEV-NOTE: Handler para mudança de marca
  const handleBrandChange = useCallback((value: string) => {
    onChange({
      target: { name: 'brand_id', value }
    } as any);
  }, [onChange]);

  // AIDEV-NOTE: Handler para criar categoria
  const handleCreateCategory = useCallback((name: string, onSuccess: (category: ProductCategory) => void, onError: (error: Error) => void) => {
    createCategory(
      { name, is_active: true },
      {
        onSuccess,
        onError,
      }
    );
  }, [createCategory]);

  // AIDEV-NOTE: Handler para categoria criada
  const handleCategoryCreated = useCallback((categoryId: string) => {
    handleCategoryChange(categoryId);
  }, [handleCategoryChange]);

  // AIDEV-NOTE: Handler para criar marca
  const handleCreateBrand = useCallback(async (name: string): Promise<{ id: string; name: string }> => {
    if (!createBrand) {
      throw new Error('Função de criação de marca não disponível');
    }

    const newBrand = await createBrand({ name, is_active: true });
    
    // AIDEV-NOTE: Atualizar lista de marcas após criar
    if (refetchBrands) {
      await refetchBrands();
    }
    
    return newBrand;
  }, [createBrand, refetchBrands]);

  // AIDEV-NOTE: Handler para marca criada
  const handleBrandCreated = useCallback((brandId: string) => {
    handleBrandChange(brandId);
  }, [handleBrandChange]);

  return (
    <div className="space-y-6">
      {/* Primeira linha: Nome do produto, Unidade e Situação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome do produto <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="Digite o nome do produto"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="unit_of_measure" className="text-sm font-medium">
            Unidade
          </Label>
          <Select
            value={(formData as any).unit_of_measure ?? ''}
            onValueChange={(value) => {
              onChange({
                target: { name: 'unit_of_measure', value }
              } as any);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="w-full">
            <Label htmlFor="is_active" className="text-sm font-medium mb-2 block">
              Situação
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm",
                formData.is_active ? "text-muted-foreground" : "text-foreground"
              )}>
                Inativo
              </span>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => 
                  onChange({ target: { name: 'is_active', value: checked } } as any)
                }
              />
              <span className={cn(
                "text-sm font-medium",
                formData.is_active ? "text-foreground" : "text-muted-foreground"
              )}>
                Ativo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha: Código interno do produto, Categoria, Marca, Preço de venda */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ProductCodeField
          formData={formData}
          isEditMode={isEditMode}
          isLoadingMaxCode={isLoadingMaxCode}
          nextAvailableCode={nextAvailableCode}
          codeState={codeState}
        />
        
        <CategorySelect
          formData={formData}
          categories={categories}
          isLoadingCategories={isLoadingCategories}
          onValueChange={handleCategoryChange}
          onCreateNew={() => setIsCreateCategoryDialogOpen(true)}
        />
        
        <BrandSelect
          formData={formData}
          brands={brands}
          isLoadingBrands={isLoadingBrands}
          brandsError={brandsError}
          onValueChange={handleBrandChange}
          onCreateNew={() => setIsCreateBrandDialogOpen(true)}
        />
        
        <PriceField
          isEditMode={isEditMode}
          priceState={priceState}
        />
      </div>

      {/* Descrição */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Descrição
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={onChange}
          placeholder="Descrição detalhada do produto"
          rows={4}
          className="mt-1 rounded-[10px]"
          style={{ padding: '5px', lineHeight: '1.0' }}
        />
      </div>

      {/* Dialogs de criação */}
      <CreateCategoryDialog
        open={isCreateCategoryDialogOpen}
        onOpenChange={setIsCreateCategoryDialogOpen}
        onCreateCategory={handleCreateCategory}
        isCreating={isCreatingCategory}
        onCategoryCreated={handleCategoryCreated}
      />

      <CreateBrandDialog
        open={isCreateBrandDialogOpen}
        onOpenChange={setIsCreateBrandDialogOpen}
        onCreateBrand={handleCreateBrand}
        isCreating={isCreatingBrand}
        onBrandCreated={handleBrandCreated}
      />
    </div>
  );
}
