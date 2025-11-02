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
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { useProductForm } from './hooks/useProductForm';
import { generateInternalCode } from '@/lib/utils/productUtils';
import type { Product } from '@/hooks/useSecureProducts';
import { motion } from 'framer-motion';
import { useProductCategories } from '@/hooks/useSecureProducts';
import { 
  Package, 
  DollarSign, 
  Hash, 
  Barcode, 
  Layers, 
  FileText, 
  Receipt, 
  MessageSquare,
  ShoppingCart,
  Tag,
  AlertTriangle,
  MapPin,
  BarChart3,
  Info,
  Save,
  Loader2
} from 'lucide-react';
import { useState } from 'react';

// AIDEV-NOTE: Estrutura de abas para organização clara das informações do produto
// Seguindo as especificações: Dados Gerais, Estoque, Fiscal (condicional), Observações

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// AIDEV-NOTE: Interface para configuração do tenant - controla exibição condicional
interface TenantConfig {
  nfe_enabled: boolean;
  stock_control_enabled: boolean;
}

// Mock da configuração do tenant - em produção virá da API
const mockTenantConfig: TenantConfig = {
  nfe_enabled: true, // Controla exibição da aba Fiscal
  stock_control_enabled: true // Controla funcionalidades de estoque
};

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
  // AIDEV-NOTE: Hook para buscar categorias da tabela products do tenant
  const { data: categories, isLoading: isLoadingCategories } = useProductCategories();

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
      enabled: isOpen && !!product?.id, // Só executa quando diálogo está aberto e tem ID
      staleTime: 5 * 60 * 1000 // 5 minutos de cache
    }
  );

  const { formData, isLoading, handleSubmit, handleChange } = useProductForm(
    completeProduct || product, // Usa dados completos ou fallback para dados básicos
    () => {
      onSuccess?.();
      onOpenChange(false);
    }
  );

  // AIDEV-NOTE: Estado local para controle de estoque - usado quando tenant permite
  const [stockControlEnabled, setStockControlEnabled] = useState(
    mockTenantConfig.stock_control_enabled
  );

  // AIDEV-NOTE: Função para gerar código interno automaticamente
  const generateInternalCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PRD-${timestamp}-${random}`;
  };

  // AIDEV-NOTE: Renderização condicional baseada no estado de carregamento
  if (isLoadingProduct) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando produto...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-blue-600" />
            {product?.id ? 'Editar Produto' : 'Cadastro de Produto'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {product?.id 
              ? 'Atualize as informações do produto usando as abas organizadas abaixo.'
              : 'Preencha as informações do novo produto usando as abas organizadas abaixo.'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Estoque
              </TabsTrigger>
              {mockTenantConfig.nfe_enabled && (
                <TabsTrigger value="fiscal" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Fiscal
                </TabsTrigger>
              )}
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Observações
              </TabsTrigger>
            </TabsList>

            {/* ABA: DADOS GERAIS */}
            <TabsContent value="general" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Seção: Identificação */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <Tag className="h-5 w-5 text-blue-600" />
                    Identificação do Produto
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Nome do Produto *
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        placeholder="Ex: Notebook Dell Inspiron 15"
                        className="w-full"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code" className="text-sm font-medium">
                        Código Interno
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="code"
                          name="code"
                          value={formData.code || ''}
                          onChange={handleChange}
                          placeholder="Código interno do produto"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleChange({
                            target: { name: 'code', value: generateInternalCode() }
                          } as any)}
                          className="px-3"
                        >
                          <Hash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode" className="text-sm font-medium">
                        Código de Barras
                      </Label>
                      <Input
                        id="barcode"
                        name="barcode"
                        value={formData.barcode || ''}
                        onChange={handleChange}
                        placeholder="Ex: 7891234567890"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category_id" className="text-sm font-medium">
                        Categoria
                      </Label>
                      <Select
                        value={formData.category_id || ''}
                        onValueChange={(value) => handleChange({
                          target: { name: 'category_id', value }
                        } as any)}
                        disabled={isLoadingCategories}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingCategories 
                              ? "Carregando categorias..." 
                              : "Selecione uma categoria"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                          {(!categories || categories.length === 0) && !isLoadingCategories && (
                            <SelectItem value="no-categories" disabled>
                              Nenhuma categoria encontrada
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Seção: Precificação */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Precificação
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_price" className="text-sm font-medium">
                        Preço de Venda *
                      </Label>
                      <Input
                        id="unit_price"
                        name="unit_price"
                        type="number"
                        step="0.01"
                        value={formData.unit_price || ''}
                        onChange={handleChange}
                        placeholder="0,00"
                        className="w-full"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit_of_measure" className="text-sm font-medium">
                        Unidade de Medida
                      </Label>
                      <Select
                        value={formData.unit_of_measure || ''}
                        onValueChange={(value) => handleChange({
                          target: { name: 'unit_of_measure', value }
                        } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">Unidade (un)</SelectItem>
                          <SelectItem value="kg">Quilograma (kg)</SelectItem>
                          <SelectItem value="g">Grama (g)</SelectItem>
                          <SelectItem value="l">Litro (l)</SelectItem>
                          <SelectItem value="ml">Mililitro (ml)</SelectItem>
                          <SelectItem value="m">Metro (m)</SelectItem>
                          <SelectItem value="cm">Centímetro (cm)</SelectItem>
                          <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                          <SelectItem value="m3">Metro Cúbico (m³)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* ABA: ESTOQUE */}
            <TabsContent value="stock" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Controle de Estoque */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                      <Layers className="h-5 w-5 text-purple-600" />
                      Controle de Estoque
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="stock-control"
                        checked={stockControlEnabled}
                        onCheckedChange={setStockControlEnabled}
                      />
                      <Label htmlFor="stock-control" className="text-sm">
                        Ativar controle
                      </Label>
                    </div>
                  </div>

                  {stockControlEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="cost_price" className="text-sm font-medium">
                          Preço de Custo
                        </Label>
                        <Input
                          id="cost_price"
                          name="cost_price"
                          type="number"
                          step="0.01"
                          value={formData.cost_price || ''}
                          onChange={handleChange}
                          placeholder="0,00"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="current_stock" className="text-sm font-medium">
                          Estoque Atual
                        </Label>
                        <Input
                          id="current_stock"
                          name="current_stock"
                          type="number"
                          value={formData.current_stock || ''}
                          onChange={handleChange}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="min_stock" className="text-sm font-medium">
                          Estoque Mínimo
                        </Label>
                        <Input
                          id="min_stock"
                          name="min_stock"
                          type="number"
                          value={formData.min_stock || ''}
                          onChange={handleChange}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_stock" className="text-sm font-medium">
                          Estoque Máximo
                        </Label>
                        <Input
                          id="max_stock"
                          name="max_stock"
                          type="number"
                          value={formData.max_stock || ''}
                          onChange={handleChange}
                          placeholder="0"
                          className="w-full"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Localização */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <MapPin className="h-5 w-5 text-red-600" />
                    Localização no Estoque
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storage_location" className="text-sm font-medium">
                        Local de Armazenamento
                      </Label>
                      <Input
                        id="storage_location"
                        name="storage_location"
                        value={formData.storage_location || ''}
                        onChange={handleChange}
                        placeholder="Ex: Prateleira A-1, Setor B"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplier" className="text-sm font-medium">
                        Fornecedor Principal
                      </Label>
                      <Input
                        id="supplier"
                        name="supplier"
                        value={formData.supplier || ''}
                        onChange={handleChange}
                        placeholder="Nome do fornecedor"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Alertas de Estoque */}
                {stockControlEnabled && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Alertas de Estoque</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Quando ativado, você receberá notificações quando o estoque atingir os níveis mínimo ou máximo configurados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* ABA: FISCAL (Condicional) */}
            {mockTenantConfig.nfe_enabled && (
              <TabsContent value="fiscal" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                      <Receipt className="h-5 w-5 text-indigo-600" />
                      Informações Fiscais
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ncm" className="text-sm font-medium">
                          NCM (Nomenclatura Comum do Mercosul)
                        </Label>
                        <Input
                          id="ncm"
                          name="ncm"
                          value={formData.ncm || ''}
                          onChange={handleChange}
                          placeholder="Ex: 8471.30.12"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cest" className="text-sm font-medium">
                          Código CEST
                        </Label>
                        <Input
                          id="cest"
                          name="cest"
                          value={formData.cest || ''}
                          onChange={handleChange}
                          placeholder="Ex: 01.001.00"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cfop" className="text-sm font-medium">
                          CFOP (Código Fiscal de Operações)
                        </Label>
                        <Select
                          value={formData.cfop || ''}
                          onValueChange={(value) => handleChange({
                            target: { name: 'cfop', value }
                          } as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o CFOP" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5102">5102 - Venda de mercadoria adquirida</SelectItem>
                            <SelectItem value="5101">5101 - Venda de produção própria</SelectItem>
                            <SelectItem value="5405">5405 - Venda de bem do ativo imobilizado</SelectItem>
                            <SelectItem value="5949">5949 - Outra saída de mercadoria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="icms_rate" className="text-sm font-medium">
                          Alíquota ICMS (%)
                        </Label>
                        <Input
                          id="icms_rate"
                          name="icms_rate"
                          type="number"
                          step="0.01"
                          value={formData.icms_rate || ''}
                          onChange={handleChange}
                          placeholder="0,00"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ipi_rate" className="text-sm font-medium">
                          Alíquota IPI (%)
                        </Label>
                        <Input
                          id="ipi_rate"
                          name="ipi_rate"
                          type="number"
                          step="0.01"
                          value={formData.ipi_rate || ''}
                          onChange={handleChange}
                          placeholder="0,00"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pis_cofins_rate" className="text-sm font-medium">
                          PIS/COFINS (%)
                        </Label>
                        <Input
                          id="pis_cofins_rate"
                          name="pis_cofins_rate"
                          type="number"
                          step="0.01"
                          value={formData.pis_cofins_rate || ''}
                          onChange={handleChange}
                          placeholder="0,00"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Informações Fiscais</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          As informações fiscais são utilizadas para emissão de notas fiscais. 
                          Consulte seu contador para definir os códigos e alíquotas corretas.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            )}

            {/* ABA: OBSERVAÇÕES */}
            <TabsContent value="notes" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Observações e Descrições
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Descrição Detalhada
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        placeholder="Descreva as características, especificações técnicas e detalhes importantes do produto..."
                        className="w-full min-h-[120px] resize-none"
                        rows={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="internal_notes" className="text-sm font-medium">
                        Observações Internas
                      </Label>
                      <Textarea
                        id="internal_notes"
                        name="internal_notes"
                        value={formData.internal_notes || ''}
                        onChange={handleChange}
                        placeholder="Anotações internas, lembretes, informações para a equipe..."
                        className="w-full min-h-[80px] resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500">
                        * As observações internas não são exibidas para clientes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Dicas para Descrições</h4>
                      <ul className="text-sm text-green-700 mt-1 space-y-1">
                        <li>• Inclua especificações técnicas importantes</li>
                        <li>• Mencione garantia e condições de uso</li>
                        <li>• Destaque diferenciais e benefícios</li>
                        <li>• Use palavras-chave para facilitar buscas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* RODAPÉ FIXO COM BOTÕES */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              <span>* Campos obrigatórios</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {product?.id ? 'Atualizar Produto' : 'Cadastrar Produto'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}