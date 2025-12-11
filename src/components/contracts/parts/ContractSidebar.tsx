import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  CreditCard,
  Calculator,
  TrendingUp,
  Percent,
  Receipt,
  Package,
  Briefcase,
  Edit2,
  Check,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

// AIDEV-NOTE: Interface para tipo de desconto geral do contrato
type ContractDiscountType = 'percentage' | 'fixed';

interface ContractSidebarProps {
  totalValues: {
    subtotal: number;
    discount: number;
    tax: number;
    costs: number;
    total: number;
    // Detalhamento por tipo
    services?: {
      subtotal: number;
      discount: number;
      costs: number;
    };
    products?: {
      subtotal: number;
      discount: number;
    };
  };
  onBilling?: () => void;
  contractId?: string;
  // AIDEV-NOTE: Callback para atualizar o desconto geral do contrato
  onContractDiscountChange?: (discountValue: number) => void;
  // AIDEV-NOTE: Valor atual do desconto geral (para modo controlado)
  contractDiscountValue?: number;
  // AIDEV-NOTE: Se o sidebar está em modo de edição
  isEditable?: boolean;
}

export function ContractSidebar({ 
  totalValues, 
  onBilling, 
  contractId: _contractId, // AIDEV-NOTE: Reservado para uso futuro
  onContractDiscountChange,
  contractDiscountValue: _contractDiscountValue = 0, // AIDEV-NOTE: Reservado para uso futuro
  isEditable = true
}: ContractSidebarProps) {
  // AIDEV-NOTE: Estado para controlar a edição do desconto geral
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<ContractDiscountType>('percentage');
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  
  // AIDEV-NOTE: Tentar acessar o contexto do formulário (pode não existir em alguns contextos)
  let form: ReturnType<typeof useFormContext> | null = null;
  try {
    form = useFormContext();
  } catch {
    // Formulário não disponível neste contexto
  }

  // AIDEV-NOTE: Calcular desconto dos itens (soma dos descontos individuais dos serviços/produtos)
  const itemsDiscount = (totalValues.services?.discount || 0) + (totalValues.products?.discount || 0);
  
  // AIDEV-NOTE: Desconto geral do contrato (diferença entre desconto total e descontos de itens)
  const generalContractDiscount = Math.max(0, totalValues.discount - itemsDiscount);

  // AIDEV-NOTE: Handler para abrir edição de desconto
  const handleOpenDiscountEdit = useCallback(() => {
    if (!isEditable) return;
    
    // AIDEV-NOTE: Inicializar com o valor atual do desconto geral
    if (generalContractDiscount > 0) {
      // Se já tem desconto, abrir com o valor atual
      setDiscountType('fixed');
      setDiscountInputValue(generalContractDiscount.toFixed(2));
    } else {
      setDiscountType('percentage');
      setDiscountInputValue('');
    }
    setIsEditingDiscount(true);
  }, [isEditable, generalContractDiscount]);

  // AIDEV-NOTE: Handler para aplicar o desconto geral
  const handleApplyDiscount = useCallback(() => {
    const inputValue = parseFloat(discountInputValue) || 0;
    
    if (inputValue < 0) {
      toast.error('O desconto não pode ser negativo');
      return;
    }

    // AIDEV-NOTE: Calcular o valor máximo permitido para desconto geral
    // O desconto total (itens + geral) não pode ultrapassar o subtotal
    const maxAllowedDiscount = Math.max(0, totalValues.subtotal - itemsDiscount);

    let discountValue = 0;
    
    if (discountType === 'percentage') {
      if (inputValue > 100) {
        toast.error('O desconto percentual não pode ser maior que 100%');
        return;
      }
      // AIDEV-NOTE: Calcular desconto baseado no subtotal (antes dos descontos individuais)
      discountValue = (totalValues.subtotal * inputValue) / 100;
    } else {
      // Desconto fixo
      discountValue = inputValue;
    }

    // AIDEV-NOTE: Validar se o desconto não vai deixar o contrato negativo
    if (discountValue > maxAllowedDiscount) {
      toast.error(
        `O desconto geral máximo permitido é ${formatCurrency(maxAllowedDiscount)}. ` +
        `Já existem ${formatCurrency(itemsDiscount)} em descontos dos itens.`
      );
      return;
    }

    // AIDEV-NOTE: Atualizar o formulário se disponível
    if (form) {
      form.setValue('total_discount', discountValue, { shouldDirty: true });
    }

    // AIDEV-NOTE: Chamar callback se fornecido
    if (onContractDiscountChange) {
      onContractDiscountChange(discountValue);
    }

    setIsEditingDiscount(false);
    toast.success(`Desconto geral de ${formatCurrency(discountValue)} aplicado ao contrato`);
  }, [discountInputValue, discountType, totalValues.subtotal, itemsDiscount, form, onContractDiscountChange]);

  // AIDEV-NOTE: Handler para cancelar edição
  const handleCancelDiscount = useCallback(() => {
    setIsEditingDiscount(false);
    setDiscountInputValue('');
  }, []);

  // AIDEV-NOTE: Handler para remover desconto geral
  const handleRemoveDiscount = useCallback(() => {
    if (form) {
      form.setValue('total_discount', 0, { shouldDirty: true });
    }
    if (onContractDiscountChange) {
      onContractDiscountChange(0);
    }
    setIsEditingDiscount(false);
    toast.success('Desconto geral removido');
  }, [form, onContractDiscountChange]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Resumo Financeiro */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* AIDEV-NOTE: Seção de Serviços */}
            {totalValues.services && totalValues.services.subtotal > 0 && (
              <>
                <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Serviços</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {totalValues.services.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descontos</span>
                        <span className="font-medium text-orange-600">-{formatCurrency(totalValues.services.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalValues.services.subtotal - totalValues.services.discount)}</span>
                    </div>
                    {totalValues.services.costs > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custos</span>
                        <span className="font-medium text-destructive">{formatCurrency(totalValues.services.costs)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* AIDEV-NOTE: Seção de Produtos */}
            {totalValues.products && totalValues.products.subtotal > 0 && (
              <>
                <div className="p-2.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Produtos</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {totalValues.products.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descontos</span>
                        <span className="font-medium text-orange-600">-{formatCurrency(totalValues.products.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalValues.products.subtotal - totalValues.products.discount)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            
            {/* AIDEV-NOTE: Resumo Geral - Subtotal já com descontos dos itens aplicados */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Subtotal Geral
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(
                  ((totalValues.services?.subtotal || 0) - (totalValues.services?.discount || 0)) +
                  ((totalValues.products?.subtotal || 0) - (totalValues.products?.discount || 0))
                )}
              </span>
            </div>
            
            {/* AIDEV-NOTE: Seção de Descontos com edição inline */}
            <div className="space-y-2">
              {/* AIDEV-NOTE: Detalhamento dos descontos primeiro */}
              {(itemsDiscount > 0 || generalContractDiscount > 0) && (
                <div className="space-y-1 text-xs">
                  {itemsDiscount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Percent className="h-3 w-3" />
                        Descontos dos itens
                      </span>
                      <span>-{formatCurrency(itemsDiscount)}</span>
                    </div>
                  )}
                  {generalContractDiscount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span className="flex items-center gap-2">
                        <Percent className="h-3 w-3" />
                        Desconto geral do contrato
                      </span>
                      <span>-{formatCurrency(generalContractDiscount)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* AIDEV-NOTE: Descontos Totais por último */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Descontos Totais
                </span>
                <span className="font-medium text-orange-600">
                  -{formatCurrency(totalValues.discount)}
                </span>
              </div>
              
              {/* AIDEV-NOTE: Botão/Popover para adicionar desconto geral */}
              {isEditable && (
                <Popover open={isEditingDiscount} onOpenChange={setIsEditingDiscount}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-7 text-xs text-muted-foreground hover:bg-primary hover:text-white"
                      onClick={handleOpenDiscountEdit}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      {generalContractDiscount > 0 ? 'Editar desconto geral' : 'Adicionar desconto geral'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Desconto Geral do Contrato
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Este desconto será aplicado sobre o subtotal, além dos descontos individuais dos itens.
                        </p>
                      </div>
                      
                      {/* AIDEV-NOTE: Tipo de desconto */}
                      <div className="space-y-2">
                        <Label className="text-xs">Tipo de desconto</Label>
                        <ToggleGroup 
                          type="single" 
                          value={discountType}
                          onValueChange={(value) => value && setDiscountType(value as ContractDiscountType)}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="percentage" size="sm" className="text-xs">
                            <Percent className="h-3 w-3 mr-1" />
                            Percentual
                          </ToggleGroupItem>
                          <ToggleGroupItem value="fixed" size="sm" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Valor Fixo
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      
                      {/* AIDEV-NOTE: Input do valor */}
                      <div className="space-y-2">
                        <Label className="text-xs">
                          {discountType === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={discountType === 'percentage' ? '0.1' : '0.01'}
                            min="0"
                            max={discountType === 'percentage' ? '100' : undefined}
                            placeholder={discountType === 'percentage' ? 'Ex: 5' : 'Ex: 50.00'}
                            value={discountInputValue}
                            onChange={(e) => setDiscountInputValue(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground min-w-[30px]">
                            {discountType === 'percentage' ? '%' : 'R$'}
                          </span>
                        </div>
                        {discountType === 'percentage' && discountInputValue && (
                          <p className="text-xs text-muted-foreground">
                            = {formatCurrency((totalValues.subtotal * (parseFloat(discountInputValue) || 0)) / 100)}
                          </p>
                        )}
                      </div>
                      
                      {/* AIDEV-NOTE: Botões de ação */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleApplyDiscount}
                          className="flex-1"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aplicar
                        </Button>
                        {generalContractDiscount > 0 && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={handleRemoveDiscount}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleCancelDiscount}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custos Totais
              </span>
              <span className="font-medium text-destructive">
                {formatCurrency(totalValues.costs)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Impostos
              </span>
              <span className="font-medium text-foreground">{formatCurrency(totalValues.tax)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total
              </span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalValues.total)}
              </span>
            </div>
          </div>
          
          {/* AIDEV-NOTE: Margem de Lucro - Lucro = Total Final - Custos */}
          <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/40">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Margem de Lucro</span>
              <Badge variant="secondary">
                {totalValues.total > 0 
                  ? `${(((totalValues.total - totalValues.costs) / totalValues.total) * 100).toFixed(1)}%`
                  : '0%'
                }
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lucro: {formatCurrency(totalValues.total - totalValues.costs)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Botão de Faturamento */}
      {onBilling && (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <Button 
              onClick={onBilling}
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              size="lg"
            >
              <Receipt className="h-4 w-4" />
              Faturar Contrato
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Gerar cobrança para este contrato
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
