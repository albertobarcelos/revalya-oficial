/**
 * AIDEV-NOTE: Componente principal de produtos do contrato - VERSÃO REFATORADA
 * Usa tipos, constantes e componentes da nova estrutura
 * 
 * @module features/contracts/components/ContractProducts/ContractProducts
 */

import React, { useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Plus, Search, Box, Calculator, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// AIDEV-NOTE: Imports da nova estrutura
import type { SelectedProduct, DiscountData } from '../../types';
import {
  DEFAULT_FINANCIAL_DATA,
  DEFAULT_DUE_DATE_DATA,
  DEFAULT_DISCOUNT_DATA,
  PAYMENT_METHODS,
  CARD_TYPES,
  BILLING_TYPES,
  RECURRENCE_FREQUENCIES,
  DUE_TYPES,
  DISCOUNT_TYPES,
  isCardPaymentMethod,
  isRecurringCardType,
  isRecurringBillingType,
  mapPaymentMethod
} from '../../constants';
import { calculateDiscount, calculateSubtotal } from '../../utils';

// Componentes extraídos
import { ProductTable } from './ProductTable';
import { EmptyProductState } from './EmptyProductState';
import { ProductTotalDisplay } from './ProductTotalDisplay';

// Componentes compartilhados de services (reutilizáveis)
import { DiscountField } from '../ContractServices/DiscountField';
import { DueDateConfig } from '../ContractServices/DueDateConfig';

interface ContractProductsProps {
  products: any[];
}

interface ContractFormValues {
  products?: SelectedProduct[];
  [key: string]: unknown;
}

/**
 * Componente principal de gerenciamento de produtos do contrato
 */
export function ContractProducts({ products }: ContractProductsProps) {
  const form = useFormContext<ContractFormValues>();
  
  // Estado dos produtos selecionados (do formulário)
  const selectedProducts: SelectedProduct[] = form.watch('products') || [];
  
  // Estados de modais
  const [showProductModal, setShowProductModal] = React.useState(false);
  const [showTaxModal, setShowTaxModal] = React.useState(false);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  
  // Estados de seleção de produto
  const [selectedProductId, setSelectedProductId] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(1);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  
  // Estados de produto customizado
  const [showCustomProductForm, setShowCustomProductForm] = React.useState(false);
  const [customProductName, setCustomProductName] = React.useState<string>('');
  const [customProductDescription, setCustomProductDescription] = React.useState<string>('');
  const [customProductPrice, setCustomProductPrice] = React.useState<number>(0);

  // Estados de configuração financeira
  const [financialData, setFinancialData] = React.useState({
    payment_method: '' as string,
    card_type: '' as string,
    billing_type: '' as string,
    recurrence_frequency: '' as string,
    installments: 1,
    payment_gateway: '' as string
  });

  // Estados de vencimento
  const [dueDateData, setDueDateData] = React.useState({
    due_type: 'days_after_billing' as 'days_after_billing' | 'fixed_day',
    due_value: 5 as number | undefined,
    due_next_month: false
  });

  // Estado de cobrança
  const [billingData, setBillingData] = React.useState({
    generate_billing: false
  });

  // Estado de desconto
  const [discountData, setDiscountData] = React.useState<DiscountData>(DEFAULT_DISCOUNT_DATA);

  // Produto atual sendo editado
  const currentProduct = useMemo(() => 
    selectedProducts.find(p => p.id === editingProductId),
    [selectedProducts, editingProductId]
  );

  // Produtos filtrados
  const filteredProducts = useMemo(() => 
    products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [products, searchTerm]
  );

  // ========== HANDLERS ==========

  const handleAddCustomProduct = useCallback(() => {
    if (!customProductName.trim() || customProductPrice <= 0) return;
    
    const newProduct: SelectedProduct = {
      id: `product-${Date.now()}-${Math.random()}`,
      product_id: undefined,
      name: customProductName,
      description: customProductDescription,
      unit_price: customProductPrice,
      quantity: quantity,
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: customProductPrice * quantity,
      payment_method: DEFAULT_FINANCIAL_DATA.payment_method,
      card_type: '',
      billing_type: DEFAULT_FINANCIAL_DATA.billing_type,
      recurrence_frequency: '',
      installments: 1,
      due_type: DEFAULT_DUE_DATE_DATA.due_type,
      due_value: DEFAULT_DUE_DATE_DATA.due_value,
      due_next_month: false,
      generate_billing: false
    };
    
    const currentProducts = form.getValues('products') || [];
    form.setValue('products', [...currentProducts, newProduct]);
    
    // Reset form
    setCustomProductName('');
    setCustomProductDescription('');
    setCustomProductPrice(0);
    setQuantity(1);
    setShowCustomProductForm(false);
    setShowProductModal(false);
    
    toast.success('Produto adicionado com sucesso!');
  }, [customProductName, customProductDescription, customProductPrice, quantity, form]);

  const handleAddProduct = useCallback(() => {
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
      discount_amount: 0,
      total_amount: (product.unit_price || product.price || 0) * quantity,
      payment_method: DEFAULT_FINANCIAL_DATA.payment_method,
      card_type: '',
      billing_type: DEFAULT_FINANCIAL_DATA.billing_type,
      recurrence_frequency: '',
      installments: 1,
      due_type: DEFAULT_DUE_DATE_DATA.due_type,
      due_value: DEFAULT_DUE_DATE_DATA.due_value,
      due_next_month: false,
      generate_billing: false
    };
    
    form.setValue('products', [...selectedProducts, newProduct]);
    setShowProductModal(false);
    setSelectedProductId('');
    setQuantity(1);
    
    toast.success('Produto adicionado com sucesso!');
  }, [selectedProductId, products, quantity, selectedProducts, form]);

  const handleRemoveProduct = useCallback((id: string) => {
    // AIDEV-NOTE: Atualiza formulário imediatamente para persistir a remoção
    form.setValue('products', selectedProducts.filter(p => p.id !== id));
    toast.success('Produto removido do contrato');
  }, [selectedProducts, form]);

  const handleEditProduct = useCallback((productId: string) => {
    setEditingProductId(productId);
    const product = selectedProducts.find(p => p.id === productId);
    
    if (product) {
      // Carregar dados financeiros
      setFinancialData({
        payment_method: product.payment_method || '',
        card_type: product.card_type || '',
        billing_type: product.billing_type || '',
        recurrence_frequency: product.recurrence_frequency || '',
        installments: product.installments || 1,
        payment_gateway: ''
      });
      
      // Carregar dados de vencimento
      setDueDateData({
        due_type: (product.due_type as 'days_after_billing' | 'fixed_day') ?? 'days_after_billing',
        due_value: product.due_value ?? 5,
        due_next_month: product.due_next_month ?? false
      });
      
      // Carregar dados de cobrança
      setBillingData({
        generate_billing: product.generate_billing ?? false
      });
      
      // Carregar dados de desconto
      // AIDEV-NOTE: CORREÇÃO - O banco salva discount_percentage como decimal (0.10 para 10%)
      // O formulário espera como percentual (10), então converter para exibição
      let discountPercentage = product.discount_percentage || 0;
      const discountAmount = product.discount_amount || 0;
      
      // AIDEV-NOTE: Se discount_percentage está como decimal (<= 1), converter para percentual para exibição
      // Se está como percentual (> 1), usar diretamente (compatibilidade com dados antigos)
      if (discountPercentage > 0 && discountPercentage <= 1) {
        discountPercentage = discountPercentage * 100; // Converter 0.10 para 10
      }
      
      const discountType = discountPercentage > 0 ? 'percentage' : (discountAmount > 0 ? 'fixed' : 'percentage');
      
      setDiscountData({
        discount_type: discountType,
        discount_value: discountType === 'percentage' ? discountPercentage : discountAmount,
        discount_percentage: discountPercentage, // AIDEV-NOTE: Percentual para exibição (10)
        discount_amount: discountAmount
      });
    }
    
    setShowTaxModal(true);
  }, [selectedProducts]);

  const handleSaveProduct = useCallback(() => {
    if (!editingProductId) return;
    
    try {
      const productIndex = selectedProducts.findIndex(p => p.id === editingProductId);
      if (productIndex === -1) {
        console.error('Produto não encontrado para atualização');
        return;
      }
      
      const product = selectedProducts[productIndex];
      
      // Validação de cartão
      const mappedPaymentMethod = mapPaymentMethod(financialData.payment_method);
      if (mappedPaymentMethod === 'Cartão' && !financialData.card_type) {
        toast.error('Tipo de cartão é obrigatório para pagamento com cartão');
        return;
      }
      
      // Calcular total com desconto
      const subtotal = calculateSubtotal(product.unit_price, product.quantity);
      
      // AIDEV-NOTE: Validação de desconto antes de calcular
      if (discountData.discount_type === 'percentage') {
        const percentage = discountData.discount_percentage || 0;
        if (percentage > 100) {
          toast.error('O desconto percentual não pode ser maior que 100%');
          return;
        }
      } else {
        const fixedAmount = discountData.discount_amount || 0;
        if (fixedAmount > subtotal) {
          toast.error(`O desconto fixo (${formatCurrency(fixedAmount)}) não pode ser maior que o subtotal (${formatCurrency(subtotal)})`);
          return;
        }
      }
      
      let discount = 0;
      if (discountData.discount_type === 'percentage') {
        discount = calculateDiscount(subtotal, 'percentage', discountData.discount_percentage);
      } else {
        discount = calculateDiscount(subtotal, 'fixed', discountData.discount_amount);
      }
      
      // AIDEV-NOTE: CORREÇÃO - Converter desconto percentual para decimal antes de salvar
      // O banco espera discount_percentage como decimal (0.10 para 10%), não como percentual (10)
      let discountPercentage = 0;
      if (discountData.discount_type === 'percentage') {
        const percentageValue = discountData.discount_percentage || 0;
        // Se o valor for > 1, está em percentual (10), converter para decimal (0.10)
        // Se o valor for <= 1, já está em decimal (0.10), usar diretamente
        discountPercentage = percentageValue > 1 ? percentageValue / 100 : percentageValue;
      }
      
      // Preparar produto atualizado
      const updatedProduct: SelectedProduct = {
        ...product,
        discount_percentage: discountPercentage, // AIDEV-NOTE: Usar decimal (0.10 para 10%)
        discount_amount: discountData.discount_type === 'fixed' ? discountData.discount_amount : 0,
        total_amount: Math.max(0, subtotal - discount),
        payment_method: mappedPaymentMethod,
        card_type: mappedPaymentMethod === 'Cartão' ? (financialData.card_type || null) : null,
        billing_type: financialData.billing_type || null,
        recurrence_frequency: financialData.recurrence_frequency || null,
        installments: financialData.installments || 1,
        due_type: dueDateData.due_type ?? 'days_after_billing',
        due_value: dueDateData.due_value ?? 5,
        due_next_month: dueDateData.due_next_month ?? false,
        generate_billing: billingData.generate_billing ?? false
      };
      
      // Atualizar lista
      const updatedProducts = [...selectedProducts];
      updatedProducts[productIndex] = updatedProduct;
      form.setValue('products', updatedProducts);
      
      // Fechar modal
      setShowTaxModal(false);
      setEditingProductId(null);
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  }, [editingProductId, selectedProducts, financialData, dueDateData, billingData, discountData, form]);

  const handleCloseProductModal = useCallback(() => {
    setShowProductModal(false);
    setSelectedProductId('');
    setQuantity(1);
    setShowCustomProductForm(false);
    setCustomProductName('');
    setCustomProductDescription('');
    setCustomProductPrice(0);
  }, []);

  const handleCloseTaxModal = useCallback(() => {
    setShowTaxModal(false);
    setEditingProductId(null);
    setFinancialData({
      payment_method: '',
      card_type: '',
      billing_type: '',
      recurrence_frequency: '',
      installments: 1,
      payment_gateway: ''
    });
    setDueDateData({
      due_type: 'days_after_billing',
      due_value: 5,
      due_next_month: false
    });
    setDiscountData(DEFAULT_DISCOUNT_DATA);
  }, []);

  // ========== RENDER ==========
  return (
    <div>
      {/* Header - Layout idêntico ao ContractServices */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Produtos do Contrato
        </h3>
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
      
      {/* Lista de Produtos ou Estado Vazio */}
      {selectedProducts.length === 0 ? (
        <EmptyProductState onAddProduct={() => setShowProductModal(true)} />
      ) : (
        <ProductTable
          products={selectedProducts}
          onEditProduct={handleEditProduct}
          onRemoveProduct={handleRemoveProduct}
        />
      )}
      
      {/* Modal para adicionar produto */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
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
                variant={!showCustomProductForm ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCustomProductForm(false)}
              >
                Buscar Produto
              </Button>
              <Button
                variant={showCustomProductForm ? 'default' : 'outline'}
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
                            'p-2 rounded-md cursor-pointer flex items-center justify-between',
                            selectedProductId === product.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                          )}
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0',
                              selectedProductId === product.id ? 'bg-primary/20' : 'bg-muted'
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
                    value={customProductPrice || ''}
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
            <Button variant="outline" onClick={handleCloseProductModal} className="border-border/50">
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

      {/* Modal de Edição de Produto */}
      <Dialog open={showTaxModal} onOpenChange={(open) => !open && handleCloseTaxModal()}>
        <DialogContent className="sm:max-w-4xl border-border/50 shadow-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Configuração do Produto
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes, valores e forma de pagamento do produto.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes do Produto</TabsTrigger>
              <TabsTrigger value="financial">Configuração Financeira</TabsTrigger>
            </TabsList>
            
            {/* Aba Detalhes */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">Detalhes do Produto</h3>
                <p className="text-sm text-muted-foreground">Configure os detalhes específicos do produto</p>
                
                {/* Valor e Quantidade */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Valor e Quantidade</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice" className="text-sm font-medium">Valor Unitário</Label>
                      <Input 
                        id="unitPrice"
                        type="text"
                        inputMode="decimal"
                        value={currentProduct?.unit_price ?? ''}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm font-medium">Quantidade</Label>
                      <Input 
                        id="quantity"
                        type="text"
                        inputMode="numeric"
                        className="text-center"
                        value={currentProduct?.quantity?.toString() ?? '1'}
                        onChange={(e) => {
                          const sanitizedValue = e.target.value.replace(/[^0-9]/g, '');
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
                  
                  {/* Campo de Desconto (reutilizando componente) */}
                  <DiscountField
                    discountData={discountData}
                    onDiscountChange={(changes) => setDiscountData(prev => ({ ...prev, ...changes }))}
                  />
                  
                  {/* Total Calculado */}
                  {currentProduct && (
                    <ProductTotalDisplay
                      unitPrice={currentProduct.unit_price}
                      quantity={currentProduct.quantity}
                      discountData={discountData}
                    />
                  )}
                </div>
                
                {/* Configuração de Vencimento (reutilizando componente) */}
                <DueDateConfig
                  dueDateData={dueDateData}
                  onDueDateChange={(changes) => setDueDateData(prev => ({ ...prev, ...changes }))}
                />

                {/* Configuração de Cobrança */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium text-lg">Gerar cobrança no faturamento?</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="billing_yes"
                        name="generate_billing"
                        checked={billingData.generate_billing === true}
                        onChange={() => setBillingData({ generate_billing: true })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <Label htmlFor="billing_yes" className="text-sm">Sim</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="billing_no"
                        name="generate_billing"
                        checked={billingData.generate_billing === false}
                        onChange={() => setBillingData({ generate_billing: false })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <Label htmlFor="billing_no" className="text-sm">Não</Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Define se este produto deve gerar cobrança automática no faturamento
                  </p>
                </div>
              </div>
            </TabsContent>
            
            {/* Aba Financeira */}
            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configuração Financeira</h3>
                  <p className="text-sm text-muted-foreground">Configure o método de pagamento e faturamento</p>
                </div>
                
                {/* Método de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Método de Pagamento</Label>
                  <Select 
                    value={financialData.payment_method || ''} 
                    onValueChange={(value) => {
                      const newData = { ...financialData, payment_method: value };
                      if (!isCardPaymentMethod(value)) {
                        newData.card_type = '';
                        newData.billing_type = 'Único';
                        newData.recurrence_frequency = '';
                        newData.installments = 1;
                      }
                      setFinancialData(newData);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Tipo de Cartão */}
                {isCardPaymentMethod(financialData.payment_method) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Cartão</Label>
                    <Select 
                      value={financialData.card_type || ''} 
                      onValueChange={(value) => {
                        const newData = { ...financialData, card_type: value };
                        if (isRecurringCardType(value)) {
                          newData.billing_type = 'Mensal';
                          newData.recurrence_frequency = 'Mensal';
                          newData.installments = 1;
                        } else if (value === 'credit') {
                          newData.billing_type = 'Único';
                          newData.recurrence_frequency = '';
                          newData.installments = newData.installments || 2;
                        }
                        setFinancialData(newData);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_TYPES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Tipo de Faturamento */}
                {financialData.payment_method && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Faturamento</Label>
                    <Select 
                      value={financialData.billing_type || ''} 
                      onValueChange={(value) => setFinancialData(prev => ({ ...prev, billing_type: value }))}
                      disabled={isCardPaymentMethod(financialData.payment_method) && 
                               (isRecurringCardType(financialData.card_type) || financialData.card_type === 'credit')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TYPES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Frequência de Recorrência */}
                {financialData.payment_method && 
                 isRecurringBillingType(financialData.billing_type) && 
                 !isRecurringCardType(financialData.card_type) &&
                 financialData.card_type !== 'credit' &&
                 financialData.payment_method !== 'Boleto Bancário' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequência de Cobrança</Label>
                    <Select 
                      value={financialData.recurrence_frequency || ''} 
                      onValueChange={(value) => setFinancialData(prev => ({ ...prev, recurrence_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_FREQUENCIES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Número de Parcelas */}
                {((isCardPaymentMethod(financialData.payment_method) && financialData.card_type === 'credit') || 
                  (financialData.payment_method && 
                   !isCardPaymentMethod(financialData.payment_method) && 
                   financialData.payment_method !== 'Boleto Bancário' && 
                   financialData.billing_type && 
                   financialData.billing_type !== 'Único')) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Número de Parcelas</Label>
                    <Input 
                      type="number" 
                      value={financialData.installments || ''} 
                      onChange={(e) => {
                        const value = e.target.value === '' ? 1 : parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          setFinancialData(prev => ({ ...prev, installments: value }));
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseTaxModal} className="border-border/50">
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} className="bg-primary hover:bg-primary/90">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContractProducts;

