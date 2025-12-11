import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  Building2,
  CreditCard,
  Calculator,
  TrendingUp,
  Percent,
  Receipt,
  Package,
  Briefcase
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
}

export function ContractSidebar({ totalValues, onBilling, contractId }: ContractSidebarProps) {

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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalValues.services.subtotal)}</span>
                    </div>
                    {totalValues.services.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descontos</span>
                        <span className="font-medium text-orange-600">-{formatCurrency(totalValues.services.discount)}</span>
                      </div>
                    )}
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalValues.products.subtotal)}</span>
                    </div>
                    {totalValues.products.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descontos</span>
                        <span className="font-medium text-orange-600">-{formatCurrency(totalValues.products.discount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            <Separator />
            
            {/* AIDEV-NOTE: Resumo Geral */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Subtotal Geral
              </span>
              <span className="font-medium text-foreground">{formatCurrency(totalValues.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Descontos Totais
              </span>
              <span className="font-medium text-orange-600">
                -{formatCurrency(totalValues.discount)}
              </span>
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
