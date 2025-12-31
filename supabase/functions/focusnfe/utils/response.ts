/**
 * Utilitários para criar respostas HTTP
 * AIDEV-NOTE: Helpers para respostas padronizadas
 */

import type { ApiResponse } from "../types.ts";
import { CORS_HEADERS } from "../constants.ts";

/**
 * Cria resposta de sucesso
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    data
  };
  
  return new Response(
    JSON.stringify(response),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Cria resposta de erro
 */
export function errorResponse(
  error: string | Error,
  status = 500,
  details?: any
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    ...(details && { data: details })
  };
  
  return new Response(
    JSON.stringify(response),
    {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Cria resposta de erro de autenticação
 */
export function unauthorizedResponse(message = 'Token de autenticação não fornecido'): Response {
  return errorResponse(message, 401);
}

/**
 * Cria resposta de erro de rate limit
 */
export function rateLimitResponse(): Response {
  return errorResponse(
    'Rate limit excedido. Tente novamente em alguns minutos.',
    429
  );
}

/**
 * Cria resposta de rota não encontrada
 */
export function notFoundResponse(path: string, method: string, availablePaths: string[]): Response {
  return errorResponse(
    'Endpoint não encontrado (404). Verifique se a URL da API está correta.',
    404,
    {
      path,
      method,
      availablePaths
    }
  );
}

