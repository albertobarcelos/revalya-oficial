import React from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, RefreshCw, X, ArrowLeft, Sparkles, Hash, Loader2 } from 'lucide-react';

import { useEditRecebimentoLogic, EditRecebimentoModalProps } from './useEditRecebimentoLogic';
import { RecebimentoGeneralTab } from './RecebimentoGeneralTab';

// AIDEV-NOTE: DialogContent customizado para remover bordas indesejadas
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

export function EditRecebimentoModal(props: EditRecebimentoModalProps) {
  const { open, onOpenChange, entry, readOnly } = props;
  const logic = useEditRecebimentoLogic(props);
  const { tab, setTab, handleSave, isSaving } = logic;

  const getNavButtonClass = (isActive: boolean) => cn(
    "w-full justify-start font-medium transition-all h-10 rounded-md gap-2",
    isActive 
      ? "bg-background border-2 border-primary text-primary shadow-sm" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogContent className="p-0 m-0 border-0">
        <DialogPrimitive.Title className="sr-only">
          {readOnly ? 'Visualizar recebimento' : (entry ? 'Editar recebimento' : 'Novo recebimento')}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">
          Gerencie as informações do recebimento
        </DialogPrimitive.Description>
        
        {/* Header */}
        <div className={cn(
          "relative overflow-hidden shrink-0",
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
                    {readOnly ? 'Visualizar Recebimento' : (entry ? 'Editar Recebimento' : 'Novo Recebimento')}
                    {!readOnly && !entry && <Sparkles className="h-4 w-4 text-yellow-300/80" />}
                  </h1>
                  <p className="text-xs text-white/70 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Gerencie as informações financeiras
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

        {/* Content */}
        <div className="flex-1 overflow-hidden p-8 grid grid-cols-12 gap-8 bg-muted/30">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 space-y-4">
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
                  Dados Gerais
                </Button>
                {/* 
                <Button
                  variant="ghost"
                  className={getNavButtonClass(tab === 'historico')}
                  onClick={() => setTab('historico')}
                >
                  <History className="h-4 w-4" />
                  Histórico
                </Button> 
                */}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-12 md:col-span-9 h-full overflow-hidden flex flex-col">
            <Card className="flex-1 border-0 shadow-sm bg-background/50 backdrop-blur-sm flex flex-col overflow-hidden">
              <CardHeader className="border-b pb-4 shrink-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {tab === 'dados' ? 'Dados Gerais' : 'Histórico'}
                </CardTitle>
              </CardHeader>
              
              <div className="flex-1 overflow-y-auto p-6">
                {tab === 'dados' && (
                  <RecebimentoGeneralTab
                    form={logic}
                    readOnly={readOnly}
                  />
                )}
                {/* tab === 'historico' && ... */}
              </div>
              
              {!readOnly && (
                <div className="p-4 border-t bg-muted/10 flex justify-end gap-3 shrink-0">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {entry ? 'Salvar alterações' : 'Criar recebimento'}
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
