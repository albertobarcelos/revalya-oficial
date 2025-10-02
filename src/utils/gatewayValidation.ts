/**
 * AIDEV-NOTE: Utilitário para validação de gateways de pagamento
 * Centraliza a lógica de validação e feedback para usuários
 */

import { toast } from 'sonner';

export interface GatewayValidationError {
  code: string;
  message: string;
  userMessage: string;
  action?: 'configure' | 'contact_support' | 'retry';
}

/**
 * Mapeia erros de gateway para mensagens amigáveis ao usuário
 */
export function parseGatewayError(error: string): GatewayValidationError {
  // Erros de configuração
  if (error.includes('não configurado')) {
    const provider = error.match(/Gateway (\w+) não configurado/)?.[1] || 'gateway';
    
    return {
      code: 'GATEWAY_NOT_CONFIGURED',
      message: error,
      userMessage: `O ${provider} não está configurado. Configure as credenciais nas integrações.`,
      action: 'configure'
    };
  }
  
  // Erros de credenciais
  if (error.includes('API Key é obrigatória') || error.includes('api_key')) {
    return {
      code: 'MISSING_API_KEY',
      message: error,
      userMessage: 'API Key não configurada. Verifique as credenciais nas integrações.',
      action: 'configure'
    };
  }
  
  if (error.includes('URL da API é obrigatória') || error.includes('api_url')) {
    return {
      code: 'MISSING_API_URL',
      message: error,
      userMessage: 'URL da API não configurada. Verifique as configurações nas integrações.',
      action: 'configure'
    };
  }
  
  // Erros de autenticação
  if (error.includes('401') || error.includes('Unauthorized') || error.includes('access_token')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: error,
      userMessage: 'Credenciais inválidas. Verifique a API Key e tente novamente.',
      action: 'configure'
    };
  }
  
  // Erros de rede
  if (error.includes('fetch') || error.includes('network') || error.includes('timeout')) {
    return {
      code: 'NETWORK_ERROR',
      message: error,
      userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
      action: 'retry'
    };
  }
  
  // Erro genérico
  return {
    code: 'UNKNOWN_ERROR',
    message: error,
    userMessage: 'Erro inesperado. Entre em contato com o suporte se persistir.',
    action: 'contact_support'
  };
}

/**
 * Mostra toast de erro com base no tipo de erro de gateway
 */
export function showGatewayError(error: string): void {
  const parsedError = parseGatewayError(error);
  
  toast.error(parsedError.userMessage, {
    description: parsedError.action === 'configure' 
      ? 'Acesse Configurações > Integrações para configurar'
      : undefined,
    duration: 5000
  });
}

/**
 * Mostra toast de sucesso para operações de gateway
 */
export function showGatewaySuccess(message: string): void {
  toast.success(message, {
    duration: 3000
  });
}

/**
 * Valida se um provider de gateway é suportado
 */
export function isValidGatewayProvider(provider: string): boolean {
  const supportedProviders = ['asaas', 'cora', 'itau', 'omie'];
  return supportedProviders.includes(provider.toLowerCase());
}

/**
 * Formata nome do provider para exibição
 */
export function formatProviderName(provider: string): string {
  const providerNames: Record<string, string> = {
    'asaas': 'AsaaS',
    'cora': 'Cora',
    'itau': 'Itaú',
    'omie': 'Omie'
  };
  
  return providerNames[provider.toLowerCase()] || provider;
}