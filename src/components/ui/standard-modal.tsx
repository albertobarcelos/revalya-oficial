import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface StandardModalProps {
  /**
   * Título do modal
   */
  title: string;
  /**
   * Descrição opcional do modal
   */
  description?: string;
  /**
   * Ícone para exibir ao lado do título
   */
  icon?: React.ReactNode;
  /**
   * Estado de abertura do modal
   */
  open: boolean;
  /**
   * Função para alterar o estado de abertura
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Conteúdo do modal
   */
  children: React.ReactNode;
  /**
   * Conteúdo do rodapé (botões de ação)
   */
  footer?: React.ReactNode;
  /**
   * Texto do botão de cancelar
   * @default "Cancelar"
   */
  cancelText?: string;
  /**
   * Texto do botão de confirmar
   * @default "Confirmar"
   */
  confirmText?: string;
  /**
   * Função chamada ao clicar no botão de cancelar
   */
  onCancel?: () => void;
  /**
   * Função chamada ao clicar no botão de confirmar
   */
  onConfirm?: () => void;
  /**
   * Estado de carregamento do botão de confirmar
   */
  isLoading?: boolean;
  /**
   * Estado de desabilitação do botão de confirmar
   */
  isDisabled?: boolean;
  /**
   * Largura máxima do modal
   * @default "md"
   */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  /**
   * Classes adicionais para o conteúdo do modal
   */
  contentClassName?: string;
}

/**
 * Componente de modal padronizado para toda a aplicação
 */
export function StandardModal({
  title,
  description,
  icon,
  open,
  onOpenChange,
  children,
  footer,
  cancelText = "Cancelar",
  confirmText = "Confirmar",
  onCancel,
  onConfirm,
  isLoading = false,
  isDisabled = false,
  maxWidth = "md",
  contentClassName,
}: StandardModalProps) {
  // Mapeamento de tamanhos para classes de largura máxima
  const maxWidthClasses = {
    xs: "sm:max-w-xs",
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  };

  // Função para lidar com o cancelamento
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "border-border/50 shadow-lg",
          maxWidthClasses[maxWidth],
          contentClassName
        )}
      >
        <button
          onClick={handleCancel}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-[25px]">{children}</div>

        <DialogFooter className="gap-2 sm:gap-0">
          {footer ? (
            footer
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-border/50"
              >
                {cancelText}
              </Button>
              {onConfirm && (
                <Button
                  onClick={onConfirm}
                  disabled={isDisabled || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? "Carregando..." : confirmText}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
