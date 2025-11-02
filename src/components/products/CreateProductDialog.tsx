import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProductForm } from './hooks/useCreateProductForm';
import { useActiveProductCategories } from '@/hooks/useProductCategories';
import { motion } from 'framer-motion';
import { Package, DollarSign, Hash, Barcode, Layers, Plus } from 'lucide-react';

// AIDEV-NOTE: Modal de criação de produtos seguindo padrões de segurança multi-tenant
// Implementa validação de tenant_id e hooks seguros conforme guia de segurança

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProductDialogProps) {
  // 🔐 Hook seguro para criação de produtos
  const {
    formData,
    isLoading,
    handleChange,
    handleSubmit,
    resetForm
  } = useCreateProductForm();

  // AIDEV-NOTE: Hook para buscar categorias ativas do tenant
  const { categories, isLoading: isLoadingCategories } = useActiveProductCategories();

  // AIDEV-NOTE: Função para lidar com o sucesso da criação
  const handleSuccess = () => {
    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  // AIDEV-NOTE: Função para lidar com o cancelamento
  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // AIDEV-NOTE: Função para submissão do formulário
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleSubmit();
    if (success) {
      handleSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-5 w-5 text-primary" />
            </motion.div>
            Criar Novo Produto
          </DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo produto no sistema.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* AIDEV-NOTE: Seção de Informações Básicas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Digite o nome do produto"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category || ''}
                    onValueChange={(value) => handleChange({
                      target: { name: 'category', value }
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
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {categories.length === 0 && !isLoadingCategories && (
                        <SelectItem value="no-categories" disabled>
                          Nenhuma categoria encontrada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Descrição detalhada do produto"
                  rows={3}
                />
              </div>
            </motion.div>

            {/* AIDEV-NOTE: Seção de Códigos e Identificação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Códigos e Identificação</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Código SKU único"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={formData.barcode || ''}
                    onChange={handleChange}
                    placeholder="Código de barras"
                  />
                </div>
              </div>
            </motion.div>

            {/* AIDEV-NOTE: Seção de Preços e Estoque */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Preços e Estoque</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço de Venda *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    name="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price || ''}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                  <Input
                    id="stock_quantity"
                    name="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity || ''}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    name="min_stock"
                    type="number"
                    min="0"
                    value={formData.min_stock || ''}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Unidade de Medida</Label>
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
            </motion.div>

            {/* AIDEV-NOTE: Seção de Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Status e Configurações</h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    handleChange({ target: { name: 'is_active', value: checked } } as any)
                  }
                />
                <Label htmlFor="is_active">Produto Ativo</Label>
              </div>
            </motion.div>

            {/* AIDEV-NOTE: Botões de Ação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-end gap-3 pt-4 border-t"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Criar Produto'
                )}
              </Button>
            </motion.div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}