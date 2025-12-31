/**
 * Router principal da Edge Function
 * AIDEV-NOTE: Roteamento centralizado e limpo
 */

import type { Request, Response } from "https://deno.land/std@0.168.0/http/server.ts";
import { CORS_HEADERS } from "./constants.ts";
import { checkRateLimit } from "./utils/rateLimit.ts";
import { validateAuthToken, extractTenantId } from "./utils/auth.ts";
import { errorResponse, unauthorizedResponse, rateLimitResponse, notFoundResponse } from "./utils/response.ts";
import { handleCreateCompany, handleUpdateCompany, handleConsultCompany } from "./handlers/company.ts";
import { handleUpdateFiscalDocuments, handleUpdateNFeConfig, handleUpdateNFSeConfig } from "./handlers/fiscalDocuments.ts";
import { handleEmitNFe, handleEmitNFSe, handleConsultStatus } from "./handlers/documents.ts";

/**
 * Extrai path do request
 */
function extractPath(url: URL): string {
  let path = url.pathname;
  
  // Remover prefixo /focusnfe se existir
  if (path.startsWith('/focusnfe')) {
    path = path.replace('/focusnfe', '');
  }
  
  // Garantir que path começa com /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Remover / final
  if (path === '/') {
    path = '';
  }
  
  return path;
}

/**
 * Valida autenticação (exceto webhooks)
 */
async function validateRequest(req: Request, path: string): Promise<Response | null> {
  if (path.startsWith('/webhook')) {
    return null; // Webhooks não precisam de autenticação
  }
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return unauthorizedResponse();
  }
  
  const authResult = await validateAuthToken(authHeader);
  if (!authResult.valid) {
    return unauthorizedResponse(authResult.error || 'Invalid JWT');
  }
  
  return null;
}

/**
 * Router de rotas
 */
export async function routeRequest(req: Request, tenantId: string): Promise<Response> {
  const url = new URL(req.url);
  const path = extractPath(url);
  const method = req.method;
  
  console.log('[router] Request:', { path, method, url: req.url });
  
  // Empresas
  if (path === '/empresas/create' && method === 'POST') {
    return await handleCreateCompany(req, tenantId);
  }
  
  if (path === '/empresas/update' && method === 'PUT') {
    return await handleUpdateCompany(req, tenantId);
  }
  
  if (path.startsWith('/empresas') && method === 'GET') {
    return await handleConsultCompany(req, tenantId);
  }
  
  // Documentos fiscais
  if (path === '/empresas/documentos-fiscais' && method === 'PUT') {
    return await handleUpdateFiscalDocuments(req, tenantId);
  }
  
  if (path === '/empresas/configuracoes-nfe' && method === 'PUT') {
    return await handleUpdateNFeConfig(req, tenantId);
  }
  
  if (path === '/empresas/configuracoes-nfse' && method === 'PUT') {
    return await handleUpdateNFSeConfig(req, tenantId);
  }
  
  // NFe
  if (path === '/nfe/emit' && method === 'POST') {
    return await handleEmitNFe(req, tenantId);
  }
  
  if (path.startsWith('/nfe/') && method === 'GET') {
    const referencia = path.replace('/nfe/', '');
    return await handleConsultStatus(req, tenantId, 'nfe', referencia);
  }
  
  // NFSe
  if (path === '/nfse/emit' && method === 'POST') {
    return await handleEmitNFSe(req, tenantId);
  }
  
  if (path.startsWith('/nfse/') && method === 'GET') {
    const referencia = path.replace('/nfse/', '');
    return await handleConsultStatus(req, tenantId, 'nfse', referencia);
  }
  
  // Webhook
  if (path === '/webhook' && method === 'POST') {
    return new Response(
      JSON.stringify({ message: 'Webhook handler em desenvolvimento' }),
      {
        status: 501,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Rota não encontrada
  return notFoundResponse(path, method, [
    '/empresas/create (POST)',
    '/empresas/update (PUT)',
    '/empresas?cnpj=... (GET)',
    '/empresas/documentos-fiscais (PUT)',
    '/empresas/configuracoes-nfe (PUT)',
    '/empresas/configuracoes-nfse (PUT)',
    '/nfe/emit (POST)',
    '/nfse/emit (POST)',
    '/nfe/{referencia} (GET)',
    '/nfse/{referencia} (GET)',
  ]);
}

/**
 * Handler principal da Edge Function
 */
export async function handleRequest(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  
  try {
    const url = new URL(req.url);
    const path = extractPath(url);
    
    // Validar autenticação
    const authError = await validateRequest(req, path);
    if (authError) {
      return authError;
    }
    
    // Extrair tenant ID
    let tenantId = await extractTenantId(req);
    
    if (!path.startsWith('/webhook')) {
      if (!tenantId) {
        throw new Error('Tenant ID é obrigatório (header x-tenant-id ou body tenant_id)');
      }
      
      // Verificar rate limiting (exceto para consulta de empresa)
      if (!path.startsWith('/empresas')) {
        if (!checkRateLimit(tenantId)) {
          return rateLimitResponse();
        }
      }
    }
    
    // Roteamento
    if (tenantId) {
      return await routeRequest(req, tenantId);
    } else {
      // Webhook não precisa de tenant_id
      return await routeRequest(req, '');
    }
    
  } catch (error) {
    console.error('[handleRequest] Erro geral:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro interno do servidor',
      500
    );
  }
}

