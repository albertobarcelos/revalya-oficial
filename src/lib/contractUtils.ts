import { toast } from "@/components/ui/use-toast";

/**
 * Formata mensagens de erro de forma consistente
 */
export const formatErrorMessage = (error: unknown, defaultMessage = "Ocorreu um erro inesperado"): string => {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
};

/**
 * Exibe notificação de erro
 */
export const showError = (error: unknown, context = "") => {
  const message = formatErrorMessage(error);
  console.error(`[${context}]`, error);
  
  toast({
    title: "Erro",
    description: message,
    variant: "destructive",
  });
};

/**
 * Exibe notificação de sucesso
 */
export const showSuccess = (message: string) => {
  toast({
    title: "Sucesso",
    description: message,
  });
};

/**
 * Calcula o valor total de um serviço
 */
export const calculateServiceTotal = (params: {
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercentage?: number;
}) => {
  const { quantity, unitPrice, taxRate, discountPercentage = 0 } = params;
  const subtotal = quantity * unitPrice;
  const afterDiscount = subtotal * (1 - (discountPercentage / 100));
  return afterDiscount * (1 + (taxRate / 100));
};
