import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useProductForm } from './hooks/useProductForm';
import type { Product } from '@/hooks/useSecureProducts';
import { useProductCategories } from '@/hooks/useSecureProducts';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { useProductStock } from '@/hooks/useProductStock';
import { motion } from 'framer-motion';
import { 
  X,
  Save,
  Plus,
  Copy,
  Ban,
  Clock,
  Trash2,
  Image as ImageIcon,
  Edit,
  Search,
  Info,
  Package, 
  DollarSign, 
  Warehouse,
  Truck,
  FileText, 
  Tag,
  Receipt, 
  HelpCircle,
  Globe
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProductDialog({
  product,
  isOpen,
  onClose,
  onSuccess,
}: EditProductDialogProps) {
  // AIDEV-NOTE: Verificação de segurança - não renderiza se product for null
  if (!product) {
    return null;
  }

  const [activeTab, setActiveTab] = useState('estoque');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // AIDEV-NOTE: Hook para buscar categorias da tabela products do tenant
  const { data: categoriesData, isLoading: isLoadingCategories } = useProductCategories();
  const categories = categoriesData || [];
  
  // AIDEV-NOTE: Hook para buscar locais de estoque cadastrados no sistema
  const { 
    locations, 
    isLoading: isLoadingLocations 
  } = useStorageLocations({ is_active: true });

  // AIDEV-NOTE: Hook para buscar estoque real do produto por local
  // IMPORTANTE: Sem limite de paginação para buscar todos os locais
  const { 
    stock: productStockByLocation, 
    isLoading: isLoadingStock,
    refetch: refetchStock
  } = useProductStock({ 
    product_id: product.id,
    limit: 1000 // AIDEV-NOTE: Buscar todos os locais (sem paginação)
  });
  
  // AIDEV-NOTE: Forçar refetch quando o dialog abrir para garantir dados atualizados
  React.useEffect(() => {
    if (isOpen && product.id) {
      console.log('🔍 [DEBUG] Forçando refetch do estoque para product_id:', product.id);
      refetchStock();
    }
  }, [isOpen, product.id, refetchStock]);

  // AIDEV-NOTE: Estado para edição inline do estoque mínimo por local
  const [editingMinStock, setEditingMinStock] = useState<{ locationId: string; value: number } | null>(null);
  
  // AIDEV-NOTE: Estado para armazenar estoque mínimo por local (será persistido no banco futuramente)
  const [minStockByLocation, setMinStockByLocation] = useState<Record<string, number>>({});

  // AIDEV-NOTE: Estado local para controlar o valor formatado do preço durante a digitação
  const [unitPriceDisplay, setUnitPriceDisplay] = useState<string>('');

  // AIDEV-NOTE: Função para converter string formatada em número
  const parsePrice = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove R$, espaços, pontos (separadores de milhar) e substitui vírgula por ponto
    const cleaned = value
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // AIDEV-NOTE: Função para formatar número como preço brasileiro (sem R$)
  const formatPrice = (value: number): string => {
    if (!value || value === 0) return '';
    return value.toFixed(2).replace('.', ',');
  };

  // AIDEV-NOTE: Busca segura de dados completos do produto usando padrões multi-tenant
  const {
    data: completeProduct,
    isLoading: isLoadingProduct,
    error: productError
  } = useSecureTenantQuery(
    ['product-details', product?.id],
    async (supabase, tenantId) => {
      if (!product?.id) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          code,
          sku,
          barcode,
          unit_price,
          cost_price,
          stock_quantity,
          min_stock_quantity,
          category,
          category_id,
          supplier,
          tax_rate,
          has_inventory,
          is_active,
          image_url,
          created_at,
          updated_at,
          tenant_id
        `)
        .eq('id', product.id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        throw error;
      }
      
      return data;
    },
    {
      enabled: isOpen && !!product?.id,
      staleTime: 5 * 60 * 1000
    }
  );

  const { formData, isLoading, handleSubmit, handleChange, updateProductMutation } = useProductForm(
    completeProduct || product,
    () => {
      onSuccess?.();
      onClose();
    }
  );

  // AIDEV-NOTE: Sincronizar estado local quando formData.unit_price mudar externamente
  useEffect(() => {
    if (formData.unit_price && formData.unit_price > 0) {
      setUnitPriceDisplay(formatPrice(formData.unit_price));
    } else {
      setUnitPriceDisplay('');
    }
  }, [formData.unit_price]);

  // AIDEV-NOTE: Função wrapper para handleSubmit que sincroniza o preço antes de salvar
  const handleSubmitWithPriceSync = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    
    // Sincronizar o valor do preço antes de submeter
    const numericValue = parsePrice(unitPriceDisplay);
    
    // Criar um novo formData com o valor atualizado do preço
    const updatedFormData = {
      ...formData,
      unit_price: numericValue
    };
    
    // Atualizar o estado local também
    handleChange('unit_price', numericValue);
    
    // Validar antes de submeter
    if (!updatedFormData.name || !updatedFormData.name.trim()) {
      setDescriptionError('Este campo é obrigatório');
      return;
    }
    
    // Limpar erro se validação passar
    setDescriptionError(null);
    
    if (updatedFormData.unit_price <= 0) {
      return;
    }
    
    // Chamar a mutação diretamente com os dados atualizados
    updateProductMutation.mutate(updatedFormData);
  }, [unitPriceDisplay, formData, handleChange, updateProductMutation]);

  // AIDEV-NOTE: Preparar dados de estoque baseados nos dados reais de product_stock_by_location
  // Cada local tem seu estoque individual controlado pela tabela product_stock_by_location
  const stockData = useMemo(() => {
    console.log('🔍 [DEBUG STOCK] productStockByLocation recebido:', productStockByLocation);
    console.log('🔍 [DEBUG STOCK] locations recebidas:', locations);
    console.log('🔍 [DEBUG STOCK] product.id:', product.id);
    
    if (locations.length === 0) {
      // Local padrão quando não há locais cadastrados
      return [
        {
          id: 'default',
          locationId: 'default',
          location: 'PADRAO - Local de Estoque Padrão',
          locationDescription: 'Local de estoque padrão do sistema',
          availableStock: formData.stock_quantity || 0,
          unitCMC: formData.cost_price || 0,
          totalCMC: (formData.cost_price || 0) * (formData.stock_quantity || 0),
          minStock: minStockByLocation['default'] ?? formData.min_stock_quantity ?? 0,
          inboundForecast: 0,
          outboundForecast: 0,
          locationType: 'Estoque próprio da empresa',
          isActive: true
        }
      ];
    }

    // AIDEV-NOTE: Criar um mapa de estoque por local_id para busca rápida
    const stockMap = new Map(
      (productStockByLocation || []).map((stock: any) => {
        console.log('🔍 [DEBUG STOCK] Mapeando stock:', {
          storage_location_id: stock.storage_location_id,
          product_id: stock.product_id,
          available_stock: stock.available_stock,
          unit_cmc: stock.unit_cmc,
          total_cmc: stock.total_cmc
        });
        return [stock.storage_location_id, stock];
      })
    );

    console.log('🔍 [DEBUG STOCK] stockMap criado com', stockMap.size, 'itens');

    return locations.map((location: any) => {
      // AIDEV-NOTE: Buscar estoque real do local na tabela product_stock_by_location
      const stockForLocation = stockMap.get(location.id) as any;
      
      console.log(`🔍 [DEBUG STOCK] Local "${location.name}" (ID: ${location.id}):`, {
        encontrado: !!stockForLocation,
        stockData: stockForLocation
      });
      
      // Se não houver registro na tabela, estoque é 0 (será criado na primeira movimentação)
      // AIDEV-NOTE: Converter strings DECIMAL para números (Supabase retorna DECIMAL como string)
      const availableStock = stockForLocation?.available_stock 
        ? parseFloat(String(stockForLocation.available_stock)) 
        : 0;
      const unitCMC = stockForLocation?.unit_cmc 
        ? parseFloat(String(stockForLocation.unit_cmc)) 
        : 0;
      const totalCMC = stockForLocation?.total_cmc 
        ? parseFloat(String(stockForLocation.total_cmc)) 
        : (unitCMC * availableStock);
      
      // Estoque mínimo por local (usa valor salvo ou divide o mínimo geral)
      const minStock = minStockByLocation[location.id] ?? 
        (stockForLocation?.min_stock 
          ? parseFloat(String(stockForLocation.min_stock))
          : (locations.length > 0 
            ? Math.floor((formData.min_stock_quantity || 0) / locations.length)
            : 0));

      console.log(`🔍 [DEBUG STOCK] Dados finais para "${location.name}":`, {
        availableStock,
        unitCMC,
        totalCMC,
        minStock
      });

      return {
        id: location.id,
        locationId: location.id,
        location: location.name,
        locationDescription: location.description || '',
        availableStock: availableStock,
        unitCMC: unitCMC,
        totalCMC: totalCMC,
        minStock: minStock,
        inboundForecast: 0,
        outboundForecast: 0,
        locationType: location.description || 'Estoque próprio da empresa',
        isActive: location.is_active
      };
    });
  }, [locations, productStockByLocation, formData.stock_quantity, formData.cost_price, formData.min_stock_quantity, minStockByLocation, product.id]);

  // AIDEV-NOTE: Handler para editar estoque mínimo inline
  const handleMinStockEdit = (locationId: string, currentValue: number) => {
    setEditingMinStock({ locationId, value: currentValue });
  };

  // AIDEV-NOTE: Handler para salvar estoque mínimo
  const handleMinStockSave = (locationId: string, newValue: number) => {
    // Atualizar estado local
    setMinStockByLocation(prev => ({
      ...prev,
      [locationId]: newValue
    }));
    setEditingMinStock(null);
    
    // TODO: Implementar salvamento no banco de dados
    // Futuramente, criar tabela product_stock_by_location ou similar
    // para armazenar estoque mínimo por local de estoque
  };

  if (isLoadingProduct) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-[calc(100vw-30px)] !w-[calc(100vw-30px)] !h-[calc(100vh-30px)] !left-[15px] !right-[15px] !top-[15px] !bottom-[15px] !translate-x-0 !translate-y-0 p-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando produto...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[calc(100vw-30px)] !w-[calc(100vw-30px)] !h-[calc(100vh-30px)] !left-[15px] !right-[15px] !top-[15px] !bottom-[15px] !translate-x-0 !translate-y-0 p-0 flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-[55px] min-h-[55px] bg-[rgb(244,245,246)] px-6">
          <DialogTitle className="text-[18px] font-normal leading-[18.48px] text-[rgb(0, 0, 0)]" style={{ fontFamily: '"Poppins", sans-serif' }}>Produtos</DialogTitle>
          <DialogDescription className="sr-only">
            Editar informações do produto
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-[rgb(91,91,91)] hover:bg-transparent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 py-4">
              {/* Product Image and Basic Info */}
              <div className="flex gap-[45px] mb-6 px-6">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {formData.image_url ? (
                    <div className="w-[70px] h-[70px] rounded-lg overflow-hidden mb-2 border">
                      <img 
                        src={formData.image_url} 
                        alt={formData.name || 'Produto'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-[70px] h-[70px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white mb-2 border border-blue-700 shadow-sm">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-[70px] text-[12px]"
                    onClick={() => {/* TODO: Implementar upload de imagem */}}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Alterar
                  </Button>
                </div>

                {/* Basic Product Information and Definition */}
                <div className="flex-1 flex gap-6">
                  <div className="flex-1 space-y-4">
                  {/* Descrição - linha completa */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-label font-medium leading-none">
                      Descrição <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="description"
                      name="description"
                      value={formData.name || ''}
                      onChange={(e) => {
                        handleChange('name', e.target.value);
                        // Limpar erro quando o usuário começar a digitar
                        if (descriptionError) {
                          setDescriptionError(null);
                        }
                      }}
                      placeholder="Descrição do produto"
                      className={`h-[25px] text-input text-foreground border-[0.8px] focus:border-black ${
                        descriptionError 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[#b9b9b9]'
                      }`}
                    />
                    {descriptionError && (
                      <p className="text-[12px] text-red-500 mt-1">{descriptionError}</p>
                    )}
                  </div>

                  {/* Primeira linha: Código do Produto, Código EAN, Unidade, Preço Unitário */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="code" className="text-label font-medium leading-none block">
                        Código do Produto
                      </Label>
                        <Input
                          id="code"
                          name="code"
                          value={formData.code || ''}
                        onChange={(e) => handleChange('code', e.target.value || null)}
                        placeholder="Código do produto"
                        className="h-[25px] text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                      />
                  </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="barcode" className="text-label font-medium leading-none flex items-center gap-1.5">
                        Código EAN (GTIN)
                        <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </Label>
                      <Input
                        id="barcode"
                        name="barcode"
                        value={formData.barcode || ''}
                        onChange={(e) => handleChange('barcode', e.target.value || null)}
                        placeholder="Código EAN"
                        className="h-[25px] text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="unit_of_measure" className="text-label font-medium leading-none block">
                        Unidade
                      </Label>
                      <Select
                        value={formData.unit_of_measure || 'un'}
                        onValueChange={(value) => handleChange('unit_of_measure', value || null)}
                      >
                        <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">Unidade (UN)</SelectItem>
                          <SelectItem value="kg">Quilograma (KG)</SelectItem>
                          <SelectItem value="g">Grama (G)</SelectItem>
                          <SelectItem value="l">Litro (L)</SelectItem>
                          <SelectItem value="ml">Mililitro (ML)</SelectItem>
                          <SelectItem value="m">Metro (M)</SelectItem>
                          <SelectItem value="cm">Centímetro (CM)</SelectItem>
                          <SelectItem value="m2">Metro Quadrado (M²)</SelectItem>
                          <SelectItem value="m3">Metro Cúbico (M³)</SelectItem>
                        </SelectContent>
                      </Select>
                </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="unit_price" className="text-label font-medium leading-none block">
                        Preço Unitário de Venda
                      </Label>
                      <Input
                        id="unit_price"
                        name="unit_price"
                        type="text"
                        value={unitPriceDisplay}
                        onChange={(e) => {
                          // Permite digitação livre - apenas remove caracteres inválidos
                          const inputValue = e.target.value;
                          // Permite números, vírgula e ponto (mas apenas uma vírgula ou ponto)
                          let cleaned = inputValue.replace(/[^\d,.]/g, '');
                          // Garante apenas um separador decimal
                          const parts = cleaned.split(/[,.]/);
                          if (parts.length > 2) {
                            // Se houver mais de um separador, mantém apenas o primeiro
                            cleaned = parts[0] + (parts[1] ? ',' + parts.slice(1).join('') : '');
                          }
                          // Substitui ponto por vírgula para padronizar
                          cleaned = cleaned.replace('.', ',');
                          setUnitPriceDisplay(cleaned);
                        }}
                        onFocus={(e) => {
                          // Ao focar, mantém o valor atual para facilitar edição
                          // Não altera nada, apenas permite editar
                        }}
                        onBlur={(e) => {
                          // Ao sair do foco, converte para número e formata
                          const numericValue = parsePrice(e.target.value);
                          if (numericValue > 0) {
                            const formatted = formatPrice(numericValue);
                            setUnitPriceDisplay(formatted);
                            // Atualiza o formData com o valor numérico
                            handleChange({
                              target: { name: 'unit_price', value: numericValue.toString() }
                            } as React.ChangeEvent<HTMLInputElement>);
                          } else {
                            setUnitPriceDisplay('');
                            handleChange({
                              target: { name: 'unit_price', value: '0' }
                            } as React.ChangeEvent<HTMLInputElement>);
                          }
                        }}
                        placeholder="0,00"
                        className="h-[25px] text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                      />
                    </div>
                    </div>

                  {/* Segunda linha: Código NCM, Família de Produto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ncm" className="text-label font-medium leading-none block">
                        Código NCM
                      </Label>
                      <div className="relative">
                        <Input
                          id="ncm"
                          name="ncm"
                          value={formData.category || ''}
                          onChange={(e) => handleChange('category', e.target.value || null)}
                          placeholder="2106.90.90 OUTROS PREPARACOES ALIMENTICIAS"
                          className="h-[25px] text-input text-foreground pr-8 border-[0.8px] border-[#b9b9b9] focus:border-black"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-[25px] w-[25px] hover:bg-transparent pointer-events-auto"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            // TODO: Implementar busca de NCM
                          }}
                        >
                          <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="category_id" className="text-label font-medium leading-none flex items-center gap-1.5">
                        Família de Produto
                        <Edit className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </Label>
                      <Select
                        value={formData.category_id || ''}
                        onValueChange={(value) => handleChange('category_id', value || null)}
                        disabled={isLoadingCategories}
                      >
                        <SelectTrigger className="h-[25px] text-select border-[0.8px] border-[#b9b9b9] focus:border-black">
                          <SelectValue placeholder="Selecione a família do produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories && categories.length > 0 ? (
                            categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                              Nenhuma categoria disponível
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  </div>

                  {/* Product Definition - Lado direito */}
                  <div className="flex-shrink-0 w-64">
                    <h3 className="text-[12px] font-semibold mb-3 text-foreground">Definição do Produto</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                      <Switch
                          checked={true}
                          disabled
                      />
                        <Label className="flex items-center gap-1.5 cursor-pointer text-label font-medium text-foreground">
                          Simples
                          <Info className="h-3 w-3 text-muted-foreground" />
                      </Label>
                    </div>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Tabs */}
              <div className="px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="estoque">Estoque</TabsTrigger>
                  <TabsTrigger value="custo-estoque">Custo do Estoque</TabsTrigger>
                  <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
                  <TabsTrigger value="informacoes-adicionais">Informações Adicionais</TabsTrigger>
                  <TabsTrigger value="caracteristicas">Características</TabsTrigger>
                  <TabsTrigger value="recomendacoes-fiscais">Recomendações Fiscais</TabsTrigger>
                  <TabsTrigger value="observacoes">Observações</TabsTrigger>
                </TabsList>

                {/* Estoque Tab */}
                <TabsContent value="estoque" className="mt-6 space-y-4">
                  <div className="mb-4">
                    <h4 className="text-[12px] font-semibold mb-2 flex items-center gap-1">
                          Estoque Mínimo
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </h4>
                    <p className="text-[12px] text-muted-foreground">
                      Clique diretamente em qualquer célula desta coluna para atualizar o estoque mínimo de cada local de estoque.
                    </p>
                    </div>

                  <div className="mb-4">
                    <h4 className="text-[12px] font-semibold mb-3">Abaixo um resumo das informações de estoque deste produto</h4>
                    
                    {/* Resumo de Estoque */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-[12px] text-blue-600 font-medium mb-1">Estoque Total</div>
                        <div className="text-heading-3 font-bold text-blue-900">
                          {(formData.stock_quantity || 0).toLocaleString('pt-BR')}
                      </div>
                </div>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-[12px] text-green-600 font-medium mb-1">Valor Total (CMC)</div>
                        <div className="text-heading-3 font-bold text-green-900">
                          {formatCurrency((formData.cost_price || 0) * (formData.stock_quantity || 0))}
                    </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <div className="text-[12px] text-orange-600 font-medium mb-1">Estoque Mínimo</div>
                        <div className="text-heading-3 font-bold text-orange-900">
                          {(formData.min_stock_quantity || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <div className="text-[12px] text-purple-600 font-medium mb-1">Locais de Estoque</div>
                        <div className="text-heading-3 font-bold text-purple-900">
                          {locations.length}
                        </div>
                    </div>
                  </div>
                </div>

                  {isLoadingLocations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Carregando locais de estoque...</span>
                      </div>
                  ) : stockData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum local de estoque cadastrado</p>
                      <p className="text-[12px] mt-2">Cadastre locais de estoque em Configurações → Estoque → Local de Estoque</p>
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Local de Estoque</TableHead>
                              <TableHead>Estoque Disponível</TableHead>
                              <TableHead>CMC Unitário</TableHead>
                              <TableHead>CMC Total</TableHead>
                              <TableHead className="cursor-pointer hover:bg-muted/50">
                                Estoque Mínimo
                                <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                              </TableHead>
                              <TableHead>Previsão de Entrada</TableHead>
                              <TableHead>Previsão de Saída</TableHead>
                              <TableHead>Tipo de Local de Estoque</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stockData.map((item) => (
                              <TableRow 
                                key={item.id} 
                                className={item.availableStock === 0 ? "bg-red-50" : ""}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold flex items-center gap-2">
                                      {item.location}
                                      {!item.isActive && (
                                        <Badge variant="secondary" className="text-[12px]">
                                          Inativo
                                        </Badge>
                                      )}
                                    </div>
                                    {item.locationDescription && (
                                      <div className="text-[12px] text-muted-foreground mt-1">
                                        {item.locationDescription}
                  </div>
                )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={item.availableStock > 0 ? "default" : "secondary"}
                                    className={item.availableStock === 0 ? "bg-red-100 text-red-800" : ""}
                                  >
                                    {item.availableStock.toLocaleString('pt-BR')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-body">
                                    {formatCurrency(item.unitCMC)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-body">
                                    {formatCurrency(item.totalCMC)}
                                  </span>
                                </TableCell>
                                <TableCell 
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => handleMinStockEdit(item.locationId, item.minStock)}
                                >
                                  {editingMinStock?.locationId === item.locationId ? (
                                    <div className="flex items-center gap-2">
                        <Input
                                        type="number"
                                        value={editingMinStock.value}
                                        onChange={(e) => setEditingMinStock({
                                          locationId: item.locationId,
                                          value: parseInt(e.target.value) || 0
                                        })}
                                        onBlur={() => handleMinStockSave(item.locationId, editingMinStock.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleMinStockSave(item.locationId, editingMinStock.value);
                                          }
                                          if (e.key === 'Escape') {
                                            setEditingMinStock(null);
                                          }
                                        }}
                                        className="w-20 h-[25px] text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black"
                                        autoFocus
                        />
                      </div>
                                  ) : (
                                    <span className="font-medium">{item.minStock}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50">
                                    {item.inboundForecast.toLocaleString('pt-BR')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-orange-50">
                                    {item.outboundForecast.toLocaleString('pt-BR')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Warehouse className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[12px] text-muted-foreground">
                                      {item.locationType}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between text-body text-muted-foreground mt-4">
                        <span>
                          {stockData.length} - {stockData.length} de {stockData.length} registros
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled>
                            anterior
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            próximo
                          </Button>
                    </div>
                  </div>
                    </>
                  )}
                </TabsContent>

                {/* Custo do Estoque Tab */}
                <TabsContent value="custo-estoque" className="mt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost_price">Preço de Custo</Label>
                        <Input
                          id="cost_price"
                          name="cost_price"
                          type="number"
                          step="0.01"
                          value={formData.cost_price || ''}
                          onChange={(e) => handleChange('cost_price', e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-[25px] text-foreground border-[0.8px] border-black"
                        />
                      </div>
                      </div>
                      </div>
                </TabsContent>

                {/* Fornecedores Tab */}
                <TabsContent value="fornecedores" className="mt-6">
                  <div className="space-y-4">
                      <div className="space-y-2">
                      <Label htmlFor="supplier">Fornecedor Principal</Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        value={formData.supplier || ''}
                          onChange={(e) => handleChange('supplier', e.target.value || null)}
                        placeholder="Nome do fornecedor"
                        className="h-[25px] text-foreground"
                      />
                    </div>
                  </div>
            </TabsContent>

                {/* Informações Adicionais Tab */}
                <TabsContent value="informacoes-adicionais" className="mt-6">
                  <div className="space-y-4">
                      <div className="space-y-2">
                      <Label htmlFor="name">Nome do Produto</Label>
                        <Input
                        id="name"
                        name="name"
                        value={formData.name || ''}
                          onChange={(e) => handleChange('name', e.target.value)}
                        required
                        className="h-[25px] text-foreground"
                        />
                      </div>
                      </div>
            </TabsContent>

                {/* Características Tab */}
                <TabsContent value="caracteristicas" className="mt-6">
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">
                      Este produto ainda não tem nenhuma característica =P
                    </p>
                    <p className="text-body text-muted-foreground">
                      A característica pode ser a cor, tamanho, dimensão, voltagem, etc...
                    </p>
                    <Button className="bg-primary text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Incluir uma característica agora
                    </Button>
                      </div>
                </TabsContent>

                {/* Recomendações Fiscais Tab */}
                <TabsContent value="recomendacoes-fiscais" className="mt-6">
                  <div className="space-y-4">
                      <div className="space-y-2">
                      <Label htmlFor="tax_rate">Taxa de Imposto (%)</Label>
                        <Input
                        id="tax_rate"
                        name="tax_rate"
                          type="number"
                          step="0.01"
                          value={formData.tax_rate || 0}
                          onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                          className="h-[25px] text-foreground border-[0.8px] border-black"
                        />
                      </div>
                    </div>
              </TabsContent>

                {/* Observações Tab */}
                <TabsContent value="observacoes" className="mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Observações</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value || null)}
                        rows={6}
                        placeholder="Adicione observações sobre o produto..."
                        className="text-foreground"
                      />
                  </div>
                </div>
            </TabsContent>
          </Tabs>
          </div>
        </ScrollArea>
            </div>
            
          {/* Right Sidebar - Actions */}
          <div className="w-64 border-l bg-muted/30 p-4 flex flex-col gap-2">
              <Button
              variant="ghost"
              className="w-full justify-start"
                onClick={handleSubmitWithPriceSync}
                disabled={isLoading}
              >
                    <Save className="h-4 w-4 mr-2" />
              Salvar
              </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" />
              Incluir
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Ban className="h-4 w-4 mr-2" />
              Inativar
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Histórico de Alterações</span>
            </Button>
              <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
              </Button>
            </div>
          </div>

        {/* Help Button */}
        <div className="absolute bottom-4 right-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <HelpCircle className="h-5 w-5 text-blue-500" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
