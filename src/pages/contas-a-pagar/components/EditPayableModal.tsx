import React from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, RefreshCw, DollarSign, History, X, ArrowLeft, Sparkles, Hash } from 'lucide-react';

import { useEditPayableLogic } from './edit-payable-parts/useEditPayableLogic';
import { EditPayableModalProps } from './edit-payable-parts/types';
import { PayableGeneralTab } from './edit-payable-parts/tabs/PayableGeneralTab';
import { PayableRecurrenceTab } from './edit-payable-parts/tabs/PayableRecurrenceTab';
import { PayableLaunchesTab } from './edit-payable-parts/tabs/PayableLaunchesTab';
import { PayableHistoryTab } from './edit-payable-parts/tabs/PayableHistoryTab';

import { LAUNCH_TYPES } from '@/types/financial-enums';

// AIDEV-NOTE: DialogContent customizado para remover bordas indesejadas e seguir padrão do modal de contratos
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden flex flex-col outline-none",
        className
      )}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export function EditPayableModal(props: EditPayableModalProps) {
  const { open, onOpenChange, entry, readOnly } = props;
  
  const logic = useEditPayableLogic(props);
  const { tab, setTab, handleSavePayable } = logic;

  const calculateTotals = () => {
    const gross = Number(logic.amount || 0);
    let discounts = 0;
    let additions = 0;
    let paid = 0;

    const currentLaunches = logic.launches || [];

    currentLaunches.forEach(l => {
      const typeKey = l.typeId as keyof typeof LAUNCH_TYPES;
      const def = LAUNCH_TYPES[typeKey];
      const isSettlement = def?.isSettlement;
      const amount = Number(l.amount || 0);
      const op = l.operation;

      if (isSettlement) {
         if (op === 'DEBIT') paid += amount;
         else paid -= amount;
      } else {
         if (op === 'DEBIT') discounts += amount;
         else additions += amount;
      }
    });

    const net = gross + additions - discounts;
    const balance = Math.max(net - paid, 0);

    return { gross, discounts, additions, paid, net, balance };
  };

  const totals = calculateTotals();
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getTitle = () => {
    switch (tab) {
      case 'dados': return 'Dados gerais';
      case 'repeticoes': return 'Relação de Parcelas Associadas';
      case 'lancamentos': return 'Lançamentos';
      case 'historico': return 'Histórico de Alterações';
      default: return 'Detalhes';
    }
  };

  const getNavButtonClass = (isActive: boolean) => cn(
    "w-full justify-start font-medium transition-all h-10 rounded-md gap-2",
    isActive 
      ? "bg-background border-2 border-primary text-primary shadow-sm" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogContent className="p-0 m-0 border-0">
        <div className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-r from-primary via-primary/85 to-primary/60",
          "border-b border-white/10"
        )}>
          {/* AIDEV-NOTE: Efeito de brilho sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
          
          <div className="relative flex items-center justify-between p-4 z-10 h-[66.5px]">
            <div className="flex items-center gap-3">
              <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                  onClick={() => onOpenChange(false)}
              >
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                    {readOnly ? 'Visualizar conta a pagar' : (entry ? 'Editar conta a pagar' : 'Nova conta a pagar')}
                    {!readOnly && !entry && <Sparkles className="h-4 w-4 text-yellow-300/80" />}
                  </h1>
                  <p className="text-xs text-white/70 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Gerencie as informações da conta a pagar
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-8 grid grid-cols-12 gap-8 bg-muted/30">
          <div className="col-span-3 space-y-6">
            <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm">
              <CardHeader className="pb-4 flex flex-row items-center gap-2 space-y-0">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold text-foreground">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className={getNavButtonClass(tab === 'dados')}
                  onClick={() => setTab('dados')}
                >
                  <FileText className="h-4 w-4" />
                  Dados gerais
                </Button>
                <Button
                  variant="ghost"
                  className={getNavButtonClass(tab === 'repeticoes')}
                  onClick={() => setTab('repeticoes')}
                >
                  <RefreshCw className="h-4 w-4" />
                  Repetições
                </Button>
                <Button
                  variant="ghost"
                  className={getNavButtonClass(tab === 'lancamentos')}
                  onClick={() => setTab('lancamentos')}
                >
                  <DollarSign className="h-4 w-4" />
                  Lançamentos
                </Button>
                <Button
                  variant="ghost"
                  className={getNavButtonClass(tab === 'historico')}
                  onClick={() => setTab('historico')}
                >
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
              </CardContent>
            </Card>

            {entry && (
              <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4 flex flex-row items-center gap-2 space-y-0">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-foreground">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Bruto</span>
                      <span className="font-medium">{formatMoney(totals.gross)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Descontos (-)</span>
                      <span className="text-emerald-600 font-medium">{formatMoney(totals.discounts)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Juros/Multa (+)</span>
                      <span className="text-red-600 font-medium">{formatMoney(totals.additions)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Pago (-)</span>
                      <span className="text-blue-600 font-medium">{formatMoney(totals.paid)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total Líquido</span>
                      <span className="text-lg font-bold text-primary">{formatMoney(totals.net)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold text-foreground text-sm">Saldo Restante</span>
                      <span className="text-base font-bold text-gray-700">{formatMoney(totals.balance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="col-span-9 h-full flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-sm">
              <CardHeader className="px-8 py-6 border-b bg-background shrink-0">
                <CardTitle className="text-lg">{getTitle()}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-8 bg-background">
                {tab === 'dados' && (
                  <PayableGeneralTab 
                    form={logic} 
                    readOnly={readOnly} 
                    entry={entry} 
                  />
                )}
                {tab === 'repeticoes' && (
                  <PayableRecurrenceTab
                    form={logic}
                    readOnly={readOnly}
                    entry={entry}
                    onSwitchEntry={props.onSwitchEntry}
                  />
                )}
                {tab === 'lancamentos' && (
                  <PayableLaunchesTab
                    form={logic}
                    isSettled={totals.balance <= 0 || entry?.status === 'PAID'}
                  />
                )}
                {tab === 'historico' && (
                  <PayableHistoryTab
                    currentTenantId={logic.currentTenant?.id}
                    entryId={entry?.id}
                  />
                )}
              </CardContent>
              
              {!readOnly && (
                <div className="p-6 border-t bg-muted/10 flex justify-end gap-3 shrink-0">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePayable}>
                    Salvar alterações
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </CustomDialogContent>
    </Dialog>
  );
}
