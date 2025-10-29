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
  Receipt
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ContractSidebarProps {
  totalValues: {
    subtotal: number;
    discount: number;
    tax: number;
    costs: number;
    total: number;
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
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Subtotal
              </span>
              <span className="font-medium">{formatCurrency(totalValues.subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Custos
              </span>
              <span className="font-medium text-orange-600">
                {formatCurrency(totalValues.costs)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Descontos
              </span>
              <span className="font-medium text-green-600">
                -{formatCurrency(totalValues.discount)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Impostos
              </span>
              <span className="font-medium">{formatCurrency(totalValues.tax)}</span>
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
          
          {/* Margem de Lucro */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Margem de Lucro</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {totalValues.subtotal > 0 
                  ? `${(((totalValues.subtotal - totalValues.costs) / totalValues.subtotal) * 100).toFixed(1)}%`
                  : '0%'
                }
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lucro: {formatCurrency(totalValues.subtotal - totalValues.costs)}
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
