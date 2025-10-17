import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, Percent, DollarSign, Info } from "lucide-react";
import { ContractFormValues } from "../schema/ContractFormSchema";
import { formatCurrency } from "@/lib/utils";

// AIDEV-NOTE: Tipos para configuração de desconto
interface DiscountConfig {
  type: "percentage" | "fixed";
  value: number;
  description?: string;
}

interface ContractDiscountsProps {
  className?: string;
}

/**
 * Componente para configuração de descontos no contrato
 * Permite aplicar desconto percentual ou valor fixo no total do contrato
 * sem alterar os valores individuais dos serviços
 */
export function ContractDiscounts({ className }: ContractDiscountsProps) {
  const { watch, setValue, getValues } = useFormContext<ContractFormValues>();
  
  // AIDEV-NOTE: Estados para controle do desconto
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountInputValue, setDiscountInputValue] = useState<string>("0");
  const [discountDescription, setDiscountDescription] = useState<string>("");

  // AIDEV-NOTE: Observar mudanças nos serviços para recalcular totais
  const services = watch("services") || [];
  const products = watch("products") || [];
  const currentTotalDiscount = watch("total_discount") || 0;

  // AIDEV-NOTE: Calcular subtotal dos serviços e produtos (sem descontos individuais)
  const calculateSubtotal = useCallback(() => {
    const servicesTotal = services.reduce((sum, service) => {
      const quantity = service.quantity || 1;
      const unitPrice = service.unit_price || service.default_price || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    const productsTotal = products.reduce((sum, product) => {
      const quantity = product.quantity || 1;
      const unitPrice = product.unit_price || product.price || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    return servicesTotal + productsTotal;
  }, [services, products]);

  // AIDEV-NOTE: Calcular valor do desconto baseado no tipo
  const calculateDiscountAmount = useCallback((type: "percentage" | "fixed", value: number, subtotal: number) => {
    if (type === "percentage") {
      return (subtotal * value) / 100;
    }
    return Math.min(value, subtotal); // Não permitir desconto maior que o subtotal
  }, []);

  // AIDEV-NOTE: Função para lidar com mudanças no input de desconto
  const handleDiscountInputChange = useCallback((inputValue: string) => {
    // Permitir apenas números, vírgulas e pontos
    const cleanValue = inputValue.replace(/[^\d.,]/g, '');
    
    // Substituir vírgula por ponto para padronização
    const normalizedValue = cleanValue.replace(',', '.');
    
    // Validar se é um número válido
    const numericValue = parseFloat(normalizedValue);
    
    if (!isNaN(numericValue) && numericValue >= 0) {
      // Aplicar limites baseados no tipo
      let limitedValue = numericValue;
      if (discountType === "percentage" && numericValue > 100) {
        limitedValue = 100;
      } else if (discountType === "fixed") {
        const subtotal = calculateSubtotal();
        if (numericValue > subtotal) {
          limitedValue = subtotal;
        }
      }
      
      setDiscountValue(limitedValue);
      setDiscountInputValue(limitedValue.toString());
    } else if (cleanValue === '' || cleanValue === '0') {
      setDiscountValue(0);
      setDiscountInputValue(cleanValue);
    } else {
      // Manter o valor anterior se a entrada for inválida
      setDiscountInputValue(discountValue.toString());
    }
  }, [discountType, discountValue, calculateSubtotal]);

  // AIDEV-NOTE: Função para lidar com blur do input (formatação final)
  const handleDiscountInputBlur = useCallback(() => {
    if (discountInputValue === '' || discountInputValue === '.') {
      setDiscountValue(0);
      setDiscountInputValue('0');
    } else {
      // Garantir formatação consistente
      const numericValue = parseFloat(discountInputValue);
      if (!isNaN(numericValue)) {
        setDiscountValue(numericValue);
        setDiscountInputValue(numericValue.toString());
      }
    }
  }, [discountInputValue]);

  // AIDEV-NOTE: Aplicar desconto - apenas atualiza o total_discount, o cálculo final é feito pelo ContractFormProvider
  const applyDiscount = useCallback(() => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount(discountType, discountValue, subtotal);

    // AIDEV-NOTE: Apenas atualizar o total_discount, o ContractFormProvider recalculará automaticamente
    setValue("total_discount", discountAmount);

    // AIDEV-NOTE: Salvar configuração do desconto em metadata (se necessário)
    if (discountDescription.trim()) {
      const currentValues = getValues();
      const currentDescription = currentValues.description || "";
      
      // Remover descrição de desconto anterior se existir
      const cleanDescription = currentDescription.replace(/\n\nDesconto aplicado:.*$/g, "");
      
      const updatedDescription = cleanDescription 
        ? `${cleanDescription}\n\nDesconto aplicado: ${discountDescription}`
        : `Desconto aplicado: ${discountDescription}`;
      
      setValue("description", updatedDescription);
    }
  }, [discountType, discountValue, discountDescription, calculateSubtotal, calculateDiscountAmount, setValue, getValues]);

  // AIDEV-NOTE: Remover desconto
  const removeDiscount = useCallback(() => {
    // Resetar valores
    setDiscountValue(0);
    setDiscountDescription("");
    
    // AIDEV-NOTE: Apenas zerar o total_discount, o ContractFormProvider recalculará automaticamente
    setValue("total_discount", 0);
    
    // Remover descrição do desconto
    const currentValues = getValues();
    const currentDescription = currentValues.description || "";
    const cleanDescription = currentDescription.replace(/\n\nDesconto aplicado:.*$/g, "");
    setValue("description", cleanDescription);
  }, [setValue, getValues]);

  // AIDEV-NOTE: Inicializar valores baseados no desconto atual
  useEffect(() => {
    if (currentTotalDiscount > 0) {
      const subtotal = calculateSubtotal();
      const discountPercentage = (currentTotalDiscount / subtotal) * 100;
      
      // Determinar se é desconto percentual ou fixo baseado no valor
      if (discountPercentage % 1 === 0 && discountPercentage <= 100) {
        setDiscountType("percentage");
        setDiscountValue(discountPercentage);
        setDiscountInputValue(discountPercentage.toString());
      } else {
        setDiscountType("fixed");
        setDiscountValue(currentTotalDiscount);
        setDiscountInputValue(currentTotalDiscount.toString());
      }
    } else {
      setDiscountValue(0);
      setDiscountInputValue("0");
    }
  }, [currentTotalDiscount, calculateSubtotal]);

  // AIDEV-NOTE: Sincronizar input quando o tipo de desconto muda
  useEffect(() => {
    setDiscountInputValue(discountValue.toString());
  }, [discountType]);

  const subtotal = calculateSubtotal();
  const previewDiscountAmount = calculateDiscountAmount(discountType, discountValue, subtotal);
  const finalTotal = subtotal - previewDiscountAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Configuração de Descontos</h3>
          <p className="text-sm text-muted-foreground">
            Configure descontos que serão aplicados no valor total do contrato
          </p>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal (Serviços + Produtos)</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          
          {currentTotalDiscount > 0 && (
            <div className="flex justify-between items-center text-red-600">
              <span className="text-sm">Desconto Aplicado</span>
              <span className="font-medium">-{formatCurrency(currentTotalDiscount)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Final</span>
            <span className="text-primary">{formatCurrency(finalTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Desconto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplicar Desconto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Desconto */}
          <div className="space-y-3">
            <Label>Tipo de Desconto</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value: "percentage" | "fixed") => setDiscountType(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="flex items-center gap-2 cursor-pointer">
                  <Percent className="h-4 w-4" />
                  Percentual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
                  <DollarSign className="h-4 w-4" />
                  Valor Fixo
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* AIDEV-NOTE: Valor do Desconto - Input customizado para permitir entrada livre */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Percentual de Desconto (%)" : "Valor do Desconto (R$)"}
            </Label>
            <Input
              id="discount-value"
              type="text"
              value={discountInputValue}
              onChange={(e) => handleDiscountInputChange(e.target.value)}
              onBlur={handleDiscountInputBlur}
              placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 100,00"}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {discountType === "percentage" 
                  ? "Máximo: 100%" 
                  : `Máximo: ${formatCurrency(subtotal)}`
                }
              </span>
              {discountType === "percentage" && discountValue > 0 && (
                <span>
                  Equivale a {formatCurrency(previewDiscountAmount)} de desconto
                </span>
              )}
            </div>
          </div>

          {/* Descrição do Desconto */}
          <div className="space-y-2">
            <Label htmlFor="discount-description">Descrição do Desconto (Opcional)</Label>
            <Input
              id="discount-description"
              value={discountDescription}
              onChange={(e) => setDiscountDescription(e.target.value)}
              placeholder="Ex: Desconto promocional, Cliente fidelidade, etc."
              maxLength={100}
            />
          </div>

          {/* Preview do Desconto */}
          {discountValue > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-muted rounded-lg space-y-2"
            >
              <h4 className="font-medium text-sm">Preview do Desconto</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Desconto ({discountType === "percentage" ? `${discountValue}%` : "Fixo"}):</span>
                  <span>-{formatCurrency(previewDiscountAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total Final:</span>
                  <span className="text-primary">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={applyDiscount}
              disabled={discountValue <= 0}
              className="flex-1"
            >
              Aplicar Desconto
            </Button>
            
            {currentTotalDiscount > 0 && (
              <Button
                variant="outline"
                onClick={removeDiscount}
                className="flex-1"
              >
                Remover Desconto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Desconto Atual */}
      {currentTotalDiscount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Desconto Ativo
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(currentTotalDiscount)} de desconto aplicado
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeDiscount}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}