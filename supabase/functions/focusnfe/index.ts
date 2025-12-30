/**
 * Edge Function: FocusNFe Integration
 * 
 * AIDEV-NOTE: Proxy para integração com API FocusNFe
 * Suporta emissão de NFe (Nota Fiscal Eletrônica) e NFSe (Nota Fiscal de Serviços)
 * 
 * Endpoints:
 * - POST /focusnfe/nfe/emit - Emitir NFe
 * - GET /focusnfe/nfe/{referencia} - Consultar NFe
 * - DELETE /focusnfe/nfe/{referencia} - Cancelar NFe
 * - POST /focusnfe/nfse/emit - Emitir NFSe
 * - GET /focusnfe/nfse/{referencia} - Consultar NFSe
 * - DELETE /focusnfe/nfse/{referencia} - Cancelar NFSe
 * - POST /focusnfe/webhook - Handler de webhooks
 * 
 * Documentação: https://doc.focusnfe.com.br/reference/introducao
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS'
};

// AIDEV-NOTE: Rate limiting simples (em produção usar Redis)
// FocusNFe permite 100 créditos/minuto por token
const requestCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `focusnfe_${tenantId}`;
  const limit = 100; // 100 créditos/minuto (limite da FocusNFe)
  const windowMs = 60000; // 1 minuto
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (current.count >= limit) {
    console.warn('[RATE_LIMIT] Limite excedido:', {
      tenant_id: tenantId,
      count: current.count,
      limit
    });
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * AIDEV-NOTE: Buscar credenciais do FocusNFe por tenant
 * Busca em payment_gateways com provider='focusnfe'
 */
async function getFocusNFeCredentials(
  tenantId: string,
  environment: 'homologacao' | 'producao' = 'producao'
): Promise<{
  token: string;
  baseUrl: string;
  isActive: boolean;
} | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[getFocusNFeCredentials] Variáveis de ambiente não configuradas');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // AIDEV-NOTE: Buscar configuração do FocusNFe em payment_gateways
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('api_key, environment, is_active, settings')
    .eq('tenant_id', tenantId)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    console.error('[getFocusNFeCredentials] Integração não encontrada:', {
      tenant_id: tenantId,
      error: error?.message
    });
    return null;
  }
  
  // AIDEV-NOTE: Verificar se o ambiente corresponde
  const configEnvironment = data.environment?.toLowerCase();
  if (configEnvironment && configEnvironment !== environment) {
    console.warn('[getFocusNFeCredentials] Ambiente não corresponde:', {
      esperado: environment,
      configurado: configEnvironment
    });
  }
  
  // AIDEV-NOTE: Determinar URL base da API
  const baseUrl = environment === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';
  
  // AIDEV-NOTE: Tentar obter token descriptografado (se houver função RPC)
  let token = data.api_key || null;
  
  try {
    const { data: decryptedToken, error: decryptError } = await supabase.rpc(
      'get_decrypted_api_key',
      {
        p_tenant_id: tenantId,
        p_integration_type: 'focusnfe'
      }
    );
    
    if (!decryptError && decryptedToken) {
      token = decryptedToken;
      console.log('[getFocusNFeCredentials] Token descriptografado com sucesso');
    } else {
      // Fallback: usar token do campo api_key
      if (!token) {
        console.error('[getFocusNFeCredentials] Token não encontrado');
        return null;
      }
      console.warn('[getFocusNFeCredentials] Usando token em texto plano (compatibilidade)');
    }
  } catch (error) {
    // Se função não existir ou falhar, usar token do campo api_key
    if (!token) {
      console.error('[getFocusNFeCredentials] Erro ao descriptografar e token não encontrado:', error);
      return null;
    }
    console.warn('[getFocusNFeCredentials] Erro ao descriptografar, usando texto plano:', error);
  }
  
  return {
    token,
    baseUrl,
    isActive: data.is_active
  };
}

/**
 * AIDEV-NOTE: Handler para emissão de NFe
 */
async function handleEmitNFe(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { referencia, dados_nfe, finance_entry_id } = body;
    
    if (!referencia) {
      throw new Error('Referência é obrigatória');
    }
    
    if (!dados_nfe) {
      throw new Error('Dados da NFe são obrigatórios');
    }
    
    // AIDEV-NOTE: Buscar credenciais
    const credentials = await getFocusNFeCredentials(tenantId, body.environment || 'producao');
    if (!credentials || !credentials.isActive) {
      throw new Error('FocusNFe não configurado ou inativo para este tenant');
    }
    
    // AIDEV-NOTE: Enviar requisição para FocusNFe
    const url = `${credentials.baseUrl}/nfe?ref=${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.token}`
      },
      body: JSON.stringify(dados_nfe)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[handleEmitNFe] Erro na API FocusNFe:', {
        status: response.status,
        error: result
      });
      
      // AIDEV-NOTE: Logar erro no banco
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      if (finance_entry_id) {
        await supabase
          .from('finance_entries')
          .update({
            invoice_status: 'error',
            invoice_data: {
              provider: 'focusnfe',
              tipo: 'nfe',
              referencia,
              status: 'erro_autorizacao',
              erro: result.mensagem || result.codigo || 'Erro desconhecido',
              enviado_em: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', finance_entry_id)
          .eq('tenant_id', tenantId);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.mensagem || result.codigo || 'Erro ao emitir NFe',
          detalhes: result.erros || result
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Salvar referência no finance_entry
    if (finance_entry_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase
        .from('finance_entries')
        .update({
          invoice_status: 'processing',
          invoice_data: {
            provider: 'focusnfe',
            tipo: 'nfe',
            referencia,
            status: result.status || 'processando',
            enviado_em: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', finance_entry_id)
        .eq('tenant_id', tenantId);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        referencia,
        status: result.status,
        caminho: result.caminho
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[handleEmitNFe] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFe'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * AIDEV-NOTE: Handler para emissão de NFSe
 */
async function handleEmitNFSe(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { referencia, dados_nfse, finance_entry_id } = body;
    
    if (!referencia) {
      throw new Error('Referência é obrigatória');
    }
    
    if (!dados_nfse) {
      throw new Error('Dados da NFSe são obrigatórios');
    }
    
    // AIDEV-NOTE: Buscar credenciais
    const credentials = await getFocusNFeCredentials(tenantId, body.environment || 'producao');
    if (!credentials || !credentials.isActive) {
      throw new Error('FocusNFe não configurado ou inativo para este tenant');
    }
    
    // AIDEV-NOTE: Enviar requisição para FocusNFe
    const url = `${credentials.baseUrl}/nfsen?ref=${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.token}`
      },
      body: JSON.stringify(dados_nfse)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[handleEmitNFSe] Erro na API FocusNFe:', {
        status: response.status,
        error: result
      });
      
      // AIDEV-NOTE: Logar erro no banco
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      if (finance_entry_id) {
        await supabase
          .from('finance_entries')
          .update({
            invoice_status: 'error',
            invoice_data: {
              provider: 'focusnfe',
              tipo: 'nfse',
              referencia,
              status: 'erro_autorizacao',
              erro: result.mensagem || result.codigo || 'Erro desconhecido',
              enviado_em: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', finance_entry_id)
          .eq('tenant_id', tenantId);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.mensagem || result.codigo || 'Erro ao emitir NFSe',
          detalhes: result.erros || result
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Salvar referência no finance_entry
    if (finance_entry_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase
        .from('finance_entries')
        .update({
          invoice_status: 'processing',
          invoice_data: {
            provider: 'focusnfe',
            tipo: 'nfse',
            referencia,
            status: result.status || 'processando',
            enviado_em: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', finance_entry_id)
        .eq('tenant_id', tenantId);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        referencia,
        status: result.status,
        caminho: result.caminho
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[handleEmitNFSe] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFSe'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * AIDEV-NOTE: Handler para consultar status de nota
 */
async function handleConsultStatus(
  req: Request,
  tenantId: string,
  tipo: 'nfe' | 'nfse',
  referencia: string
): Promise<Response> {
  try {
    const credentials = await getFocusNFeCredentials(tenantId, 'producao');
    if (!credentials || !credentials.isActive) {
      throw new Error('FocusNFe não configurado ou inativo para este tenant');
    }
    
    const endpoint = tipo === 'nfe' ? 'nfe' : 'nfsen';
    const url = `${credentials.baseUrl}/${endpoint}/${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.token}`
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.mensagem || result.codigo || 'Erro ao consultar status'
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[handleConsultStatus] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar status'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * AIDEV-NOTE: Handler principal - Router
 */
serve(async (req: Request) => {
  // AIDEV-NOTE: Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/focusnfe', '') || '/';
    const method = req.method;
    
    // AIDEV-NOTE: Extrair tenant_id do header ou body
    let tenantId = req.headers.get('x-tenant-id');
    
    // AIDEV-NOTE: Para webhooks, não precisa de tenant_id no header
    if (!path.startsWith('/webhook')) {
      if (!tenantId) {
        // Tentar extrair do body (apenas para POST)
        if (method === 'POST') {
          try {
            const body = await req.clone().json();
            tenantId = body.tenant_id;
          } catch {
            // Ignorar erro de parse
          }
        }
      }
      
      if (!tenantId) {
        throw new Error('Tenant ID é obrigatório (header x-tenant-id ou body tenant_id)');
      }
      
      // AIDEV-NOTE: Verificar rate limiting
      if (!checkRateLimit(tenantId)) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit excedido. Tente novamente em alguns minutos.'
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // AIDEV-NOTE: Router de rotas
    let response: Response;
    
    // NFe - Emitir
    if (path === '/nfe/emit' && method === 'POST') {
      response = await handleEmitNFe(req, tenantId!);
    }
    // NFSe - Emitir
    else if (path === '/nfse/emit' && method === 'POST') {
      response = await handleEmitNFSe(req, tenantId!);
    }
    // Consultar NFe
    else if (path.startsWith('/nfe/') && method === 'GET') {
      const referencia = path.replace('/nfe/', '');
      response = await handleConsultStatus(req, tenantId!, 'nfe', referencia);
    }
    // Consultar NFSe
    else if (path.startsWith('/nfse/') && method === 'GET') {
      const referencia = path.replace('/nfse/', '');
      response = await handleConsultStatus(req, tenantId!, 'nfse', referencia);
    }
    // Webhook (será implementado separadamente)
    else if (path === '/webhook' && method === 'POST') {
      // TODO: Implementar handler de webhook
      response = new Response(
        JSON.stringify({ message: 'Webhook handler em desenvolvimento' }),
        {
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    // Rota não encontrada
    else {
      response = new Response(
        JSON.stringify({ error: 'Rota não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return response;
    
  } catch (error) {
    console.error('[focusnfe] Erro geral:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

