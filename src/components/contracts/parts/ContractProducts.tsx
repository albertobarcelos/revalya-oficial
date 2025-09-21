import React from "react";
import { useFormContext } from "react-hook-form";
import { Plus, Search, Package, Trash2, FileText, MoreHorizontal, Edit, Copy, Box, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { ContractFormValues } from "../schema/ContractFormSchema";
import { toast } from "sonner";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ContractProductsProps {
  products: any[];
}

interface SelectedProduct {
  id: string;
  product_id?: string;
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  discount_percentage: number;
  tax_rate: number;
  total_amount: number;
  is_active: boolean;
  // AIDEV-NOTE: Campos financeiros adicionados para produtos
  payment_method?: string | null;
  card_type?: string | null;
  billing_type?: string | null;
  recurrence_frequency?: string | null;
  installments?: number | null;
  payment_gateway?: string | null;
  due_date_type?: string | null;
  due_days?: number | null;
  due_day?: number | null;
  due_next_month?: boolean | null;
}

export function ContractProducts({ products }: ContractProductsProps) {
  const form = useFormContext<ContractFormValues>();
  // Usar o campo do formulário como fonte de verdade
  const selectedProducts: SelectedProduct[] = form.watch('products') || [];
  const [showProductModal, setShowProductModal] = React.useState(false);
  const [showTaxModal, setShowTaxModal] = React.useState(false);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [showCustomProductForm, setShowCustomProductForm] = React.useState(false);
  const [customProductName, setCustomProductName] = React.useState<string>("");
  const [customProductDescription, setCustomProductDescription] = React.useState<string>("");
  const [customProductPrice, setCustomProductPrice] = React.useState<number>(0);

  // AIDEV-NOTE: Estados para configuração financeira do produto
  const [financialData, setFinancialData] = React.useState({
    payment_method: undefined as string | undefined,
    card_type: undefined as string | undefined,
    billing_type: undefined as string | undefined,
    recurrence_frequency: undefined as string | undefined,
    installments: 1,
    payment_gateway: undefined as string | undefined
  });

  // AIDEV-NOTE: Estados para dados de vencimento do produto
  const [dueDateData, setDueDateData] = React.useState({
    due_date_type: 'days_after_billing' as 'days_after_billing' | 'fixed_day',
    due_days: 5,
    due_day: 10,
    due_next_month: false
  });

  // AIDEV-NOTE: Estados para dados de impostos e retenções do produto
  const [taxData, setTaxData] = React.useState({
    nbs_code: '',
    deduction_value: 0,
    calculation_base: 0,
    iss_deduct: false,
    iss_rate: 0,
    ir_deduct: false,
    ir_rate: 0,
    csll_deduct: false,
    csll_rate: 0,
    inss_deduct: false,
    inss_rate: 0,
    pis_deduct: false,
    pis_rate: 0,
    cofins_deduct: false,
    cofins_rate: 0
  });

  // Adicionar produto customizado
  const handleAddCustomProduct = () => {
    if (!customProductName.trim() || customProductPrice <= 0) return;
    
    const newProduct: SelectedProduct = {
      id: `product-${Date.now()}-${Math.random()}`,
      product_id: undefined, // Será tratado no backend
      name: customProductName,
      description: customProductDescription,
      unit_price: customProductPrice,
      quantity: quantity,
      discount_percentage: 0,
      tax_rate: 0,
      total_amount: customProductPrice * quantity,
      is_active: true
    };
    
    const currentProducts = form.getValues("products") || [];
    form.setValue("products", [...currentProducts, newProduct]);
    
    // Reset form
    setCustomProductName("");
    setCustomProductDescription("");
    setCustomProductPrice(0);
    setQuantity(1);
    setShowCustomProductForm(false);
    setShowProductModal(false);
  };

  // Adicionar produto ao contrato
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const newProduct: SelectedProduct = {
      id: `${selectedProductId}-${Date.now()}`,
      product_id: selectedProductId,
      name: product.name,
      description: product.description,
      unit_price: product.unit_price || product.price || 0,
      quantity: quantity,
      discount_percentage: 0,
      tax_rate: product.tax_rate || 0,
      total_amount: (product.unit_price || product.price || 0) * quantity,
      is_active: true
    };
    // Atualizar o campo do formulário diretamente
    form.setValue("products", [...selectedProducts, newProduct]);
    setShowProductModal(false);
    setSelectedProductId("");
    setQuantity(1);
  };

  // Remover produto do contrato
  const handleRemoveProduct = (id: string) => {
    form.setValue("products", selectedProducts.filter(p => p.id !== id));
  };

  // AIDEV-NOTE: Função para abrir modal de edição de impostos e retenções
  const handleEditTaxes = (productId: string) => {
    setEditingProductId(productId);
    const currentProduct = selectedProducts.find(p => p.id === productId);
    if (currentProduct) {
      console.log('=== CARREGANDO DADOS SALVOS DO PRODUTO ===');
      console.log('Produto atual:', JSON.stringify(currentProduct, null, 2));
      
      // AIDEV-NOTE: Inicializar dados financeiros com valores salvos do produto
      setFinancialData({
        payment_method: currentProduct.payment_method || undefined,
        card_type: currentProduct.card_type || undefined,
        billing_type: currentProduct.billing_type || undefined,
        recurrence_frequency: currentProduct.recurrence_frequency || undefined,
        installments: currentProduct.installments || 1,
        payment_gateway: currentProduct.payment_gateway || undefined
      });
      
      console.log('Dados financeiros carregados:', {
        payment_method: currentProduct.payment_method,
        billing_type: currentProduct.billing_type
      });
      
      // AIDEV-NOTE: Inicializar dados de vencimento com valores salvos do produto
      setDueDateData({
        due_date_type: currentProduct.due_date_type || 'days_after_billing',
        due_days: currentProduct.due_days || 5,
        due_day: currentProduct.due_day || 10,
        due_next_month: currentProduct.due_next_month || false
      });
      
      // AIDEV-NOTE: Inicializar dados de impostos com valores salvos do produto
      setTaxData({
        nbs_code: currentProduct.nbs_code || '',
        deduction_value: currentProduct.deduction_value || 0,
        calculation_base: currentProduct.calculation_base || (currentProduct.unit_price * currentProduct.quantity),
        iss_deduct: currentProduct.iss_deduct || false,
        iss_rate: currentProduct.iss_rate || 0,
        ir_deduct: currentProduct.ir_deduct || false,
        ir_rate: currentProduct.ir_rate || 0,
        csll_deduct: currentProduct.csll_deduct || false,
        csll_rate: currentProduct.csll_rate || 0,
        inss_deduct: currentProduct.inss_deduct || false,
        inss_rate: currentProduct.inss_rate || 0,
        pis_deduct: currentProduct.pis_deduct || false,
        pis_rate: currentProduct.pis_rate || 0,
        cofins_deduct: currentProduct.cofins_deduct || false,
        cofins_rate: currentProduct.cofins_rate || 0
      });
      
      console.log('✅ Dados carregados com sucesso');
    }
    setShowTaxModal(true);
  };

  // AIDEV-NOTE: Função para mapear payment_method para o formato do banco (consistência com ContractServices)
  const mapPaymentMethod = (paymentMethod: string | null): string | null => {
    if (!paymentMethod) return null;
    
    const mapping: Record<string, string> = {
      'card': 'Cartão',
      'pix': 'PIX',
      'bank_transfer': 'Transferência',
      'bank_slip': 'Boleto',
      // Valores já em português (caso venham assim)
      'Cartão': 'Cartão',
      'PIX': 'PIX',
      'Transferência': 'Transferência',
      'Transferência Bancária': 'Transferência',
      'Boleto': 'Boleto',
      'Boleto Bancário': 'Boleto'
    };
    
    return mapping[paymentMethod] || null;
  };

  // AIDEV-NOTE: Função para salvar configurações de impostos e retenções
  const handleSaveTaxes = () => {
    if (!editingProductId) return;
    
    try {
      // Encontrar o produto que está sendo editado
      const productIndex = selectedProducts.findIndex(p => p.id === editingProductId);
      if (productIndex === -1) {
        console.error('Produto não encontrado para atualização');
        return;
      }
      
      const currentProduct = selectedProducts[productIndex];
      
      // AIDEV-NOTE: Mapear payment_method e validar card_type (consistência com ContractServices)
      const mappedPaymentMethod = mapPaymentMethod(financialData.payment_method);
      const validatedCardType = mappedPaymentMethod === 'Cartão' 
        ? (financialData.card_type || null) 
        : null;
      
      // AIDEV-NOTE: Validar se card_type é obrigatório quando payment_method é 'Cartão'
      if (mappedPaymentMethod === 'Cartão' && !financialData.card_type) {
        toast.error('Quando o método de pagamento é Cartão, o tipo de cartão é obrigatório.');
        return;
      }
      
      console.log('🔄 Mapeamento de dados financeiros do produto:', {
        original: { payment_method: financialData.payment_method, card_type: financialData.card_type },
        mapped: { payment_method: mappedPaymentMethod, card_type: validatedCardType }
      });
      
      // Preparar dados atualizados do produto com informações financeiras e impostos
      const updatedProduct = {
        ...currentProduct,
        // Campos financeiros - AIDEV-NOTE: Usar valores mapeados para consistência com banco
        payment_method: mappedPaymentMethod,
        card_type: validatedCardType,
        billing_type: financialData.billing_type || null,
        recurrence_frequency: financialData.recurrence_frequency || null,
        installments: financialData.installments || 1,
        payment_gateway: financialData.payment_gateway || null,
        // Campos de vencimento
        due_date_type: dueDateData.due_date_type || 'days_after_billing',
        due_days: dueDateData.due_days !== undefined ? dueDateData.due_days : 5,
        due_day: dueDateData.due_day !== undefined ? dueDateData.due_day : 10,
        due_next_month: dueDateData.due_next_month || false,
        // Campos de impostos
        ...taxData
      };
      
      console.log('=== SALVANDO CONFIGURAÇÕES FINANCEIRAS DO PRODUTO ===');
      console.log('Produto ID:', editingProductId);
      console.log('Dados financeiros:', JSON.stringify(financialData, null, 2));
      console.log('Dados de vencimento:', JSON.stringify(dueDateData, null, 2));
      console.log('Dados de impostos:', JSON.stringify(taxData, null, 2));
      console.log('Produto antes da atualização:', JSON.stringify(currentProduct, null, 2));
      console.log('Produto após atualização:', JSON.stringify(updatedProduct, null, 2));
      
      // Atualizar o produto na lista
      const updatedProducts = [...selectedProducts];
      updatedProducts[productIndex] = updatedProduct;
      
      // Atualizar o formulário com os produtos atualizados
      form.setValue('products', updatedProducts);
      
      console.log('✅ Configurações financeiras do produto salvas com sucesso');
      
      // Fechar modal
      setShowTaxModal(false);
      setEditingProductId(null);
      
    } catch (error) {
      console.error('❌ Erro ao salvar configurações financeiras do produto:', error);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Remover o useEffect que sincronizava selectedProducts com o form

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowProductModal(true)}
          className="gap-1 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Produto
        </Button>
      </div>
      
      {selectedProducts.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20 flex flex-col items-center justify-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Box className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Nenhum produto adicionado ao contrato</p>
            <p className="text-xs text-muted-foreground">Adicione produtos para calcular o valor total do contrato</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowProductModal(true)}
            className="mt-2 gap-1 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Produto
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="font-medium text-muted-foreground text-xs min-w-[150px]">Produto</TableHead>
                  <TableHead className="text-right font-medium text-muted-foreground text-xs min-w-[100px]">Valor Unitário</TableHead>
                  <TableHead className="text-right font-medium text-muted-foreground text-xs min-w-[80px]">Quantidade</TableHead>
                  <TableHead className="text-right font-medium text-muted-foreground text-xs min-w-[100px]">Total</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {selectedProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.unit_price)}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{formatCurrency(product.total_amount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 border-border/50">
                          <DropdownMenuItem 
                            className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" 
                            onClick={() => handleEditTaxes(product.id)}
                          >
                            <Calculator className="h-4 w-4" />
                            <span>Impostos e Retenções</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer">
                            <Copy className="h-4 w-4" />
                            <span>Duplicar</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive gap-2 focus:text-destructive hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer" 
                            onClick={() => handleRemoveProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remover</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* Modal para adicionar produto */}
      <Dialog 
        key={`product-modal-${showProductModal}`}
        open={showProductModal} 
        onOpenChange={(open) => {
          setShowProductModal(open);
          if (!open) {
            // Reset states when closing
            setSelectedProductId("");
            setQuantity(1);
            setShowCustomProductForm(false);
            setCustomProductName("");
            setCustomProductDescription("");
            setCustomProductPrice(0);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md mx-auto border-border/50 shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              Adicionar Produto ao Contrato
            </DialogTitle>
            <DialogDescription>
              Selecione um produto e a quantidade para adicionar ao contrato.
            </DialogDescription>
            <div className="flex gap-2 mt-2">
              <Button
                variant={!showCustomProductForm ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCustomProductForm(false)}
              >
                Buscar Produto
              </Button>
              <Button
                variant={showCustomProductForm ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCustomProductForm(true)}
              >
                Produto Customizado
              </Button>
            </div>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {!showCustomProductForm ? (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    className="pl-9 border-border/50 bg-background/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="border rounded-lg border-border/50 overflow-hidden max-h-60 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Nenhum produto encontrado
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div 
                          key={product.id} 
                          className={cn(
                            "p-2 rounded-md cursor-pointer flex items-center justify-between",
                            selectedProductId === product.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                              selectedProductId === product.id ? "bg-primary/20" : "bg-muted"
                            )}>
                              <Box className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {product.sku || product.code || 'N/A'}</p>
                            </div>
                          </div>
                          <span className="font-medium text-sm">{formatCurrency(product.unit_price || product.price || 0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="custom-product-name" className="text-sm">Nome do Produto *</Label>
                  <Input
                    id="custom-product-name"
                    placeholder="Digite o nome do produto..."
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    className="border-border/50 bg-background/50"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="custom-product-description" className="text-sm">Descrição</Label>
                  <Input
                    id="custom-product-description"
                    placeholder="Descrição do produto (opcional)..."
                    value={customProductDescription}
                    onChange={(e) => setCustomProductDescription(e.target.value)}
                    className="border-border/50 bg-background/50"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="custom-product-price" className="text-sm">Preço Unitário *</Label>
                  <Input
                    id="custom-product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customProductPrice || ""}
                    onChange={(e) => setCustomProductPrice(Number(e.target.value))}
                    className="border-border/50 bg-background/50"
                  />
                </div>
              </>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="quantity" className="text-sm">Quantidade</Label>
              <Input 
                id="quantity"
                type="number" 
                min={1} 
                value={quantity} 
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="border-border/50 bg-background/50"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProductModal(false);
                setShowCustomProductForm(false);
                setCustomProductName("");
                setCustomProductDescription("");
                setCustomProductPrice(0);
              }}
              className="border-border/50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={showCustomProductForm ? handleAddCustomProduct : handleAddProduct}
              disabled={showCustomProductForm ? (!customProductName.trim() || customProductPrice <= 0) : !selectedProductId}
              className="bg-primary hover:bg-primary/90 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Impostos e Retenções */}
      <Dialog 
        key={`tax-modal-${showTaxModal}-${editingProductId}`}
        open={showTaxModal} 
        onOpenChange={(open) => {
          setShowTaxModal(open);
          if (!open) {
            // Reset states when closing
            setEditingProductId(null);
            setFinancialData({
              payment_method: '',
              card_type: '',
              billing_type: '',
              recurrence_frequency: '',
              installments: 1
            });
            setDueDateData({
              due_date_type: 'days_after_billing',
              due_days: 5,
              due_day: 10,
              due_next_month: false
            });
            setTaxData({
              nbs_code: '',
              deduction_value: 0,
              calculation_base: 0,
              iss_deduct: false,
              iss_rate: 0,
              ir_deduct: false,
              ir_rate: 0,
              csll_deduct: false,
              csll_rate: 0,
              inss_deduct: false,
              inss_rate: 0,
              pis_deduct: false,
              pis_rate: 0,
              cofins_deduct: false,
              cofins_rate: 0
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Impostos e Retenções do Item
            </DialogTitle>
            <DialogDescription>
              Configure os impostos e retenções para o produto selecionado.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detalhes do Produto</TabsTrigger>
              <TabsTrigger value="financial">Configuração Financeira</TabsTrigger>
              <TabsTrigger value="taxes">Impostos e Retenções</TabsTrigger>
              <TabsTrigger value="transparency">Lei da Transparência</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              {/* AIDEV-NOTE: Seção de configuração de detalhes do produto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Detalhes do Produto</h3>
                <p className="text-sm text-muted-foreground">Configure os detalhes específicos do produto</p>
                
                {/* AIDEV-NOTE: Campos de valor e quantidade do produto */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Valor e Quantidade</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Campo de Valor Unitário */}
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice" className="text-sm font-medium">Valor Unitário</Label>
                      <Input 
                        id="unitPrice"
                        type="text"
                        inputMode="decimal"
                        value={(() => {
                          const currentProduct = selectedProducts.find(p => p.id === editingProductId);
                          const value = currentProduct?.unit_price ?? '';
                          return value === 0 ? '' : value.toString();
                        })()}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Permite apenas números, vírgula e ponto
                          const sanitizedValue = inputValue.replace(/[^0-9.,]/g, '').replace(',', '.');
                          const newValue = sanitizedValue === '' ? 0 : parseFloat(sanitizedValue);
                          
                          const updatedProducts = selectedProducts.map(product => 
                            product.id === editingProductId 
                              ? { 
                                  ...product, 
                                  unit_price: isNaN(newValue) ? 0 : newValue,
                                  total_amount: (isNaN(newValue) ? 0 : newValue) * (product.quantity || 1)
                                }
                              : product
                          );
                          form.setValue('products', updatedProducts);
                        }}
                        placeholder="Ex: 1500.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor cobrado por unidade do produto
                      </p>
                    </div>
                    
                    {/* Campo de Quantidade */}
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium">Quantidade</Label>
                      <Input 
                        id="quantity"
                        type="text"
                        inputMode="numeric"
                        value={(() => {
                          const currentProduct = selectedProducts.find(p => p.id === editingProductId);
                          const value = currentProduct?.quantity ?? '';
                          return value === 0 ? '' : value.toString();
                        })()}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Permite apenas números inteiros
                          const sanitizedValue = inputValue.replace(/[^0-9]/g, '');
                          const newValue = sanitizedValue === '' ? 1 : parseInt(sanitizedValue);
                          
                          const updatedProducts = selectedProducts.map(product => 
                            product.id === editingProductId 
                              ? { 
                                  ...product, 
                                  quantity: isNaN(newValue) ? 1 : Math.max(1, newValue),
                                  total_amount: (product.unit_price || 0) * (isNaN(newValue) ? 1 : Math.max(1, newValue))
                                }
                              : product
                          );
                          form.setValue('products', updatedProducts);
                        }}
                        placeholder="Ex: 2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantidade de unidades do produto
                      </p>
                    </div>
                  </div>
                  
                  {/* Exibição do Total Calculado */}
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total do Produto:</span>
                      <span className="text-lg font-semibold text-primary">
                        {(() => {
                          const currentProduct = selectedProducts.find(p => p.id === editingProductId);
                          return formatCurrency(currentProduct?.total_amount || 0);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Configuração de Vencimento */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Tipo de Vencimento</h4>
                  
                  {/* Seletor do tipo de vencimento */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Como será calculado o vencimento?</Label>
                    <Select 
                      value={dueDateData.due_date_type} 
                      onValueChange={(value: 'days_after_billing' | 'fixed_day') => 
                        setDueDateData(prev => ({ ...prev, due_date_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de vencimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days_after_billing">Número de dias após faturar</SelectItem>
                        <SelectItem value="fixed_day">Fixar Dia do Mês (1 a 31)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Campo condicional: Número de dias */}
                  {dueDateData.due_date_type === 'days_after_billing' && (
                    <div className="space-y-2">
                      <Label htmlFor="dueDays" className="text-sm font-medium">Número de dias</Label>
                      <Input 
                        id="dueDays"
                        type="number"
                        min={1}
                        max={365}
                        value={dueDateData.due_days}
                        onChange={(e) => setDueDateData(prev => ({ 
                          ...prev, 
                          due_days: parseInt(e.target.value) || 1 
                        }))}
                        placeholder="Ex: 5 dias após o faturamento"
                      />
                      <p className="text-xs text-muted-foreground">
                        O vencimento será {dueDateData.due_days} dias após a data de faturamento do contrato
                      </p>
                    </div>
                  )}
                  
                  {/* Campos condicionais: Dia fixo do mês */}
                  {dueDateData.due_date_type === 'fixed_day' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dueDay" className="text-sm font-medium">Dia do Mês</Label>
                        <Input 
                          id="dueDay"
                          type="number"
                          min={1}
                          max={31}
                          value={dueDateData.due_day}
                          onChange={(e) => setDueDateData(prev => ({ 
                            ...prev, 
                            due_day: parseInt(e.target.value) || 1 
                          }))}
                          placeholder="Ex: 10 (dia 10 de cada mês)"
                        />
                        <p className="text-xs text-muted-foreground">
                          O vencimento será sempre no dia {dueDateData.due_day} do mês
                        </p>
                      </div>
                      
                      {/* Checkbox para próximo mês */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dueNextMonth"
                          checked={dueDateData.due_next_month}
                          onCheckedChange={(checked) => setDueDateData(prev => ({ 
                            ...prev, 
                            due_next_month: !!checked 
                          }))}
                        />
                        <Label htmlFor="dueNextMonth" className="text-sm font-medium">
                          Próximo mês
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dueDateData.due_next_month 
                          ? `O vencimento começará no próximo mês (dia ${dueDateData.due_day})` 
                          : `O vencimento começará no mês atual (dia ${dueDateData.due_day})`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configuração Financeira</h3>
                  <p className="text-sm text-muted-foreground">Configure o método de pagamento e faturamento para este produto</p>
                </div>
                
                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Método de Pagamento</Label>
                  <Select value={financialData.payment_method || ""} onValueChange={(value) => setFinancialData(prev => ({ ...prev, payment_method: value }))}>
                       <SelectTrigger>
                         <SelectValue placeholder="Selecione o método" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Cartão">Cartão</SelectItem>
                         <SelectItem value="PIX">PIX</SelectItem>
                         <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                         <SelectItem value="Boleto Bancário">Boleto Bancário</SelectItem>
                       </SelectContent>
                     </Select>
                </div>
                
                {/* Tipo de Cartão - Condicional */}
                {financialData.payment_method === 'Cartão' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Cartão</Label>
                    <Select value={financialData.card_type || ""} onValueChange={(value) => setFinancialData(prev => ({ ...prev, card_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">Crédito</SelectItem>
                        <SelectItem value="credit_recurring">Crédito Recorrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Tipo de Faturamento - só aparece após escolher método de pagamento */}
                {financialData.payment_method && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Faturamento</Label>
                    <Select value={financialData.billing_type || ""} onValueChange={(value) => setFinancialData(prev => ({ ...prev, billing_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Único">Único</SelectItem>
                        <SelectItem value="Mensal">Recorrente (Mensal)</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Frequência de Recorrência - só aparece após escolher método de pagamento e tipo de faturamento */}
                {financialData.payment_method && (financialData.billing_type === "Mensal" || financialData.billing_type === "Trimestral" || financialData.billing_type === "Semestral" || financialData.billing_type === "Anual") && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequência de Cobrança</Label>
                    <Select value={financialData.recurrence_frequency || ""} onValueChange={(value) => setFinancialData(prev => ({ ...prev, recurrence_frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Número de Parcelas - para cartão só aparece para crédito (não recorrente), para outros métodos após escolher faturamento */}
                {((financialData.payment_method === 'Cartão' && financialData.card_type === 'credit') || 
                  (financialData.payment_method && financialData.payment_method !== 'Cartão' && financialData.billing_type && financialData.billing_type !== "Único")) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Número de Parcelas</Label>
                    <Input 
                      type="number" 
                      min={2} 
                      max={financialData.payment_method === 'Cartão' ? 6 : 60} 
                      value={financialData.installments} 
                      onChange={(e) => {
                        const maxValue = financialData.payment_method === 'Cartão' ? 6 : 60;
                        const value = Math.min(parseInt(e.target.value) || 1, maxValue);
                        setFinancialData(prev => ({ ...prev, installments: value }));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      parcelas (mín: 2, máx: {financialData.payment_method === 'Cartão' ? 6 : 60})
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="taxes" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Impostos e Retenções</h3>
                  <p className="text-sm text-muted-foreground">Configure os impostos e retenções aplicáveis a este produto</p>
                </div>
                
                {/* Informações Gerais */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nbs_code" className="text-sm font-medium">Código NBS</Label>
                    <Input
                      id="nbs_code"
                      value={taxData.nbs_code}
                      onChange={(e) => setTaxData(prev => ({ ...prev, nbs_code: e.target.value }))}
                      placeholder="Ex: 1.0101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction_value" className="text-sm font-medium">Valor da Dedução</Label>
                    <Input
                      id="deduction_value"
                      type="number"
                      step="0.01"
                      value={taxData.deduction_value}
                      onChange={(e) => setTaxData(prev => ({ ...prev, deduction_value: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calculation_base" className="text-sm font-medium">Base de Cálculo</Label>
                    <Input
                      id="calculation_base"
                      type="number"
                      step="0.01"
                      value={taxData.calculation_base}
                      onChange={(e) => setTaxData(prev => ({ ...prev, calculation_base: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                
                {/* Impostos Municipais */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Impostos Municipais</h4>
                  
                  {/* ISS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">ISS (Imposto Sobre Serviços)</h5>
                      <Checkbox
                        checked={taxData.iss_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, iss_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="iss_rate">Alíquota (%)</Label>
                        <Input
                          id="iss_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.iss_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, iss_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="iss_value">Valor</Label>
                        <Input
                          id="iss_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.iss_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Impostos Federais */}
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Impostos Federais</h4>
                  
                  {/* IR */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">IR (Imposto de Renda)</h5>
                      <Checkbox
                        checked={taxData.ir_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, ir_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ir_rate">Alíquota (%)</Label>
                        <Input
                          id="ir_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.ir_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, ir_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="ir_value">Valor</Label>
                        <Input
                          id="ir_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.ir_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* CSLL */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">CSLL (Contribuição Social sobre o Lucro Líquido)</h5>
                      <Checkbox
                        checked={taxData.csll_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, csll_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="csll_rate">Alíquota (%)</Label>
                        <Input
                          id="csll_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.csll_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, csll_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="csll_value">Valor</Label>
                        <Input
                          id="csll_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.csll_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* INSS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">INSS (Instituto Nacional do Seguro Social)</h5>
                      <Checkbox
                        checked={taxData.inss_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, inss_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="inss_rate">Alíquota (%)</Label>
                        <Input
                          id="inss_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.inss_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, inss_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inss_value">Valor</Label>
                        <Input
                          id="inss_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.inss_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* PIS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">PIS (Programa de Integração Social)</h5>
                      <Checkbox
                        checked={taxData.pis_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, pis_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pis_rate">Alíquota (%)</Label>
                        <Input
                          id="pis_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.pis_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, pis_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pis_value">Valor</Label>
                        <Input
                          id="pis_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.pis_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* COFINS */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">COFINS (Contribuição para o Financiamento da Seguridade Social)</h5>
                      <Checkbox
                        checked={taxData.cofins_deduct}
                        onCheckedChange={(checked) => setTaxData(prev => ({ ...prev, cofins_deduct: !!checked }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cofins_rate">Alíquota (%)</Label>
                        <Input
                          id="cofins_rate"
                          type="number"
                          step="0.0001"
                          value={taxData.cofins_rate}
                          onChange={(e) => setTaxData(prev => ({ ...prev, cofins_rate: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cofins_value">Valor</Label>
                        <Input
                          id="cofins_value"
                          type="text"
                          value={formatCurrency((taxData.calculation_base * taxData.cofins_rate) / 100)}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="transparency" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Lei da Transparência</h3>
                <p className="text-sm text-muted-foreground">Informações sobre a carga tributária incidente sobre este produto</p>
                
                {/* Resumo dos Tributos */}
                <div className="bg-primary/10 dark:bg-primary/10 p-4 rounded-lg border border-primary/20 dark:border-primary/20">
                  <h4 className="font-medium text-primary dark:text-primary mb-3">Resumo dos Tributos Federais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>IR (Imposto de Renda):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.ir_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSLL (Contribuição Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.csll_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>INSS (Previdência Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.inss_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PIS (Programa de Integração Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.pis_rate) / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COFINS (Contribuição para Financiamento da Seguridade Social):</span>
                        <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.cofins_rate) / 100)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <h4 className="font-medium text-primary dark:text-primary mb-2">Tributos Municipais</h4>
                    <div className="flex justify-between text-sm">
                      <span>ISS (Imposto Sobre Serviços):</span>
                      <span className="font-medium">{formatCurrency((taxData.calculation_base * taxData.iss_rate) / 100)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Aproximado de Tributos:</span>
                      <span className="text-primary dark:text-primary">
                        {formatCurrency(
                          (taxData.calculation_base * (taxData.ir_rate + taxData.csll_rate + taxData.inss_rate + taxData.pis_rate + taxData.cofins_rate + taxData.iss_rate)) / 100
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span className="text-sm text-muted-foreground">Percentual da Carga Tributária:</span>
                      <span className="font-medium">
                        {((taxData.ir_rate + taxData.csll_rate + taxData.inss_rate + taxData.pis_rate + taxData.cofins_rate + taxData.iss_rate)).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <h4 className="font-medium text-primary dark:text-primary mb-2">Informações Importantes</h4>
                    <div className="text-xs text-primary/80 dark:text-primary/80 space-y-1">
                      <p>• Os valores apresentados são aproximados e podem variar conforme a legislação vigente.</p>
                      <p>• Esta informação é fornecida em cumprimento à Lei nº 12.741/2012 (Lei da Transparência).</p>
                      <p>• Os tributos podem estar sujeitos a regimes especiais de tributação.</p>
                      <p>• Para informações precisas, consulte sempre um contador ou advogado tributarista.</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-primary/70 dark:text-primary/70">
                      <strong>Fonte:</strong> Receita Federal do Brasil e legislação tributária vigente.<br/>
                      Esta informação tem caráter meramente educativo e informativo.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowTaxModal(false)}
              className="border-border/50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTaxes}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
