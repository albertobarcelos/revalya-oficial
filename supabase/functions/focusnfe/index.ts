// =====================================================
// FOCUSNFE EDGE FUNCTION - ROUTER PRINCIPAL
// Descrição: Edge Function para integração com FocusNFe
// Autor: Revalya AI Agent
// Data: 2025-12-14
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// AIDEV-NOTE: Importar handlers
import { handleEmitirNFSe, handleConsultarNFSe, handleCancelarNFSe } from "./handlers/nfse.ts";
import { handleEmitirNFe, handleConsultarNFe, handleCancelarNFe } from "./handlers/nfe.ts";
import { handleWebhook } from "./handlers/webhook.ts";

// AIDEV-NOTE: Configuração de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS"
};

// AIDEV-NOTE: Criar cliente Supabase com service role key
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// =====================================================
// TIPOS DE ROTAS
// =====================================================

interface RouteHandler {
  method: string;
  path: RegExp;
  handler: (req: Request, params: Record<string, string>) => Promise<Response>;
  requiresAuth: boolean;
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * AIDEV-NOTE: Extrai tenant_id do header ou body
 */
async function extractTenantId(req: Request): Promise<string | null> {
  // AIDEV-NOTE: Primeiro tentar do header
  const headerTenantId = req.headers.get("x-tenant-id");
  if (headerTenantId) {
    return headerTenantId;
  }
  
  // AIDEV-NOTE: Se for POST/DELETE, tentar extrair do body
  if (req.method === "POST" || req.method === "DELETE") {
    try {
      const clone = req.clone();
      const body = await clone.json();
      return body.tenant_id || null;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * AIDEV-NOTE: Valida autenticação JWT do Supabase
 */
async function validateAuth(req: Request): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return { valid: false, error: "Header de autorização não fornecido" };
  }
  
  try {
    // AIDEV-NOTE: Criar cliente com a chave do usuário para validar
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );
    
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error || !user) {
      return { valid: false, error: error?.message || "Usuário não autenticado" };
    }
    
    return { valid: true, userId: user.id };
  } catch (error) {
    console.error("[FocusNFe] Erro ao validar autenticação:", error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "Erro de autenticação" 
    };
  }
}

/**
 * AIDEV-NOTE: Criar resposta JSON padronizada
 */
function jsonResponse(
  data: unknown, 
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * AIDEV-NOTE: Criar resposta de erro padronizada
 */
function errorResponse(
  error: string, 
  status: number = 400,
  details?: unknown
): Response {
  return jsonResponse({ 
    success: false, 
    error,
    details 
  }, status);
}

// =====================================================
// DEFINIÇÃO DE ROTAS
// =====================================================

const routes: RouteHandler[] = [
  // =====================================================
  // NFSE - NOTA FISCAL DE SERVIÇO
  // =====================================================
  {
    method: "POST",
    path: /^\/nfse\/emitir$/,
    handler: async (req, _params) => {
      const body = await req.json();
      return handleEmitirNFSe(supabase, body);
    },
    requiresAuth: true
  },
  {
    method: "GET",
    path: /^\/nfse\/consultar\/(.+)$/,
    handler: async (req, params) => {
      const tenantId = await extractTenantId(req);
      return handleConsultarNFSe(supabase, tenantId!, params.referencia);
    },
    requiresAuth: true
  },
  {
    method: "DELETE",
    path: /^\/nfse\/cancelar$/,
    handler: async (req, _params) => {
      const body = await req.json();
      return handleCancelarNFSe(supabase, body);
    },
    requiresAuth: true
  },
  
  // =====================================================
  // NFE - NOTA FISCAL ELETRÔNICA
  // =====================================================
  {
    method: "POST",
    path: /^\/nfe\/emitir$/,
    handler: async (req, _params) => {
      const body = await req.json();
      return handleEmitirNFe(supabase, body);
    },
    requiresAuth: true
  },
  {
    method: "GET",
    path: /^\/nfe\/consultar\/(.+)$/,
    handler: async (req, params) => {
      const tenantId = await extractTenantId(req);
      return handleConsultarNFe(supabase, tenantId!, params.referencia);
    },
    requiresAuth: true
  },
  {
    method: "DELETE",
    path: /^\/nfe\/cancelar$/,
    handler: async (req, _params) => {
      const body = await req.json();
      return handleCancelarNFe(supabase, body);
    },
    requiresAuth: true
  },
  
  // =====================================================
  // WEBHOOK - RECEBE CALLBACKS DO FOCUSNFE
  // =====================================================
  {
    method: "POST",
    path: /^\/webhook\/(.+)$/,
    handler: async (req, params) => {
      const body = await req.json();
      return handleWebhook(supabase, params.tenant_id, body);
    },
    requiresAuth: false // AIDEV-NOTE: Webhooks não usam JWT do Supabase
  }
];

// =====================================================
// ROUTER PRINCIPAL
// =====================================================

serve(async (req: Request): Promise<Response> => {
  // AIDEV-NOTE: Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }
  
  try {
    const url = new URL(req.url);
    
    // AIDEV-NOTE: Extrair path da função (remover /focusnfe do início)
    let pathname = url.pathname;
    const functionNameMatch = pathname.match(/\/focusnfe(.*)$/);
    if (functionNameMatch) {
      pathname = functionNameMatch[1] || "/";
    }
    
    console.log(`[FocusNFe Router] ${req.method} ${pathname}`);
    
    // AIDEV-NOTE: Health check
    if (pathname === "/" || pathname === "/health") {
      return jsonResponse({
        success: true,
        service: "FocusNFe Integration",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      });
    }
    
    // AIDEV-NOTE: Encontrar rota correspondente
    for (const route of routes) {
      if (req.method !== route.method) continue;
      
      const match = pathname.match(route.path);
      if (!match) continue;
      
      console.log(`[FocusNFe Router] Rota encontrada: ${route.path}`);
      
      // AIDEV-NOTE: Validar autenticação se necessário
      if (route.requiresAuth) {
        const authResult = await validateAuth(req);
        if (!authResult.valid) {
          return errorResponse(
            authResult.error || "Não autorizado",
            401
          );
        }
      }
      
      // AIDEV-NOTE: Extrair parâmetros da URL
      const params: Record<string, string> = {};
      
      // Para rotas com parâmetros capturados
      if (route.path.source.includes("/webhook/")) {
        params.tenant_id = match[1];
      } else if (route.path.source.includes("/consultar/")) {
        params.referencia = match[1];
      }
      
      // AIDEV-NOTE: Executar handler
      return await route.handler(req, params);
    }
    
    // AIDEV-NOTE: Rota não encontrada
    console.log(`[FocusNFe Router] Rota não encontrada: ${pathname}`);
    return errorResponse("Rota não encontrada", 404);
    
  } catch (error) {
    console.error("[FocusNFe Router] Erro inesperado:", error);
    
    // AIDEV-NOTE: Log detalhado para debug
    if (error instanceof Error) {
      console.error("[FocusNFe Router] Stack:", error.stack);
    }
    
    return errorResponse(
      error instanceof Error ? error.message : "Erro interno do servidor",
      500
    );
  }
});
