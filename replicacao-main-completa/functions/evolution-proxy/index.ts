import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};
// AIDEV-NOTE: Rate limiting simples (em produção usar Redis)
const requestCache = new Map();
function checkRateLimit(tenantId) {
  const now = Date.now();
  const key = `evolution_${tenantId}`;
  const limit = 200; // 200 requests per minute (Evolution API pode ter mais chamadas)
  const windowMs = 60000; // 1 minute
  const current = requestCache.get(key);
  if (!current || now > current.resetTime) {
    requestCache.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  if (current.count >= limit) {
    console.warn('RATE_LIMIT_EXCEEDED:', {
      tenant_id: tenantId,
      count: current.count,
      limit
    });
    return false;
  }
  current.count++;
  return true;
}
// AIDEV-NOTE: Obter credenciais fixas da Evolution API (variáveis de ambiente do Supabase Vault)
// Essas são 100% fixas para todos os tenants, pois a Evolution API é centralizada
// As variáveis devem ser configuradas no Supabase Dashboard > Edge Functions > Secrets
function getEvolutionApiCredentials() {
  // AIDEV-NOTE: Buscar URL e API Key diretamente do Supabase Vault
  // Variáveis configuradas no Dashboard: EVOLUTION_API_URL e EVOLUTION_API_KEY
  const apiUrl = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  console.log('[getEvolutionApiCredentials] Verificando variáveis de ambiente:', {
    hasApiUrl: !!apiUrl,
    hasApiKey: !!apiKey,
    apiUrlLength: apiUrl?.length || 0,
    apiKeyLength: apiKey?.length || 0
  });
  if (!apiUrl || !apiUrl.trim()) {
    const errorMsg = 'EVOLUTION_API_URL não configurada no Supabase Vault. Configure em Dashboard > Edge Functions > Secrets';
    console.error('[getEvolutionApiCredentials]', errorMsg);
    throw new Error(errorMsg);
  }
  if (!apiKey || !apiKey.trim()) {
    const errorMsg = 'EVOLUTION_API_KEY não configurada no Supabase Vault. Configure em Dashboard > Edge Functions > Secrets';
    console.error('[getEvolutionApiCredentials]', errorMsg);
    throw new Error(errorMsg);
  }
  return {
    apiUrl: apiUrl.trim().replace(/\/+$/, ''),
    apiKey: apiKey.trim()
  };
}
// AIDEV-NOTE: Verificar se a integração WhatsApp está ativa para o tenant
// Apenas verifica se está ativa, não busca credenciais (que são fixas)
async function checkTenantIntegration(tenantId, environment = 'production') {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[checkTenantIntegration] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
      return false;
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log(`[checkTenantIntegration] Verificando integração para tenant ${tenantId}, environment=${environment}`);
    // AIDEV-NOTE: Primeiro, buscar TODAS as integrações WhatsApp do tenant para debug
    const { data: allIntegrations, error: allError } = await supabase.from('tenant_integrations').select('id, is_active, environment, integration_type, created_at, updated_at').eq('tenant_id', tenantId).eq('integration_type', 'whatsapp');
    console.log(`[checkTenantIntegration] Todas as integrações WhatsApp do tenant:`, {
      count: allIntegrations?.length || 0,
      error: allError?.message,
      integrations: allIntegrations?.map((i)=>({
          id: i.id,
          is_active: i.is_active,
          environment: i.environment,
          created_at: i.created_at,
          updated_at: i.updated_at
        }))
    });
    // AIDEV-NOTE: Buscar apenas se a integração está ativa
    // Primeiro tentar sem filtro de environment (mais flexível)
    let { data, error } = await supabase.from('tenant_integrations').select('is_active, environment').eq('tenant_id', tenantId).eq('integration_type', 'whatsapp').eq('is_active', true).maybeSingle();
    console.log(`[checkTenantIntegration] Primeira tentativa (sem filtro environment, is_active=true):`, {
      found: !!data,
      error: error?.message,
      data: data ? {
        is_active: data.is_active,
        environment: data.environment
      } : null
    });
    // AIDEV-NOTE: Se não encontrou sem filtro de environment, tentar com filtro
    if (error || !data) {
      console.log(`[checkTenantIntegration] Tentando buscar integração com environment=${environment} e is_active=true`);
      const result = await supabase.from('tenant_integrations').select('is_active, environment').eq('tenant_id', tenantId).eq('integration_type', 'whatsapp').eq('environment', environment).eq('is_active', true).maybeSingle();
      console.log(`[checkTenantIntegration] Segunda tentativa (com filtro environment=${environment}, is_active=true):`, {
        found: !!result.data,
        error: result.error?.message,
        data: result.data ? {
          is_active: result.data.is_active,
          environment: result.data.environment
        } : null
      });
      if (result.error || !result.data) {
        // AIDEV-NOTE: Tentar buscar sem filtro de is_active para ver se existe mas está inativa
        const inactiveCheck = await supabase.from('tenant_integrations').select('is_active, environment').eq('tenant_id', tenantId).eq('integration_type', 'whatsapp').maybeSingle();
        if (inactiveCheck.data) {
          console.log(`[checkTenantIntegration] Integração encontrada mas INATIVA:`, {
            is_active: inactiveCheck.data.is_active,
            environment: inactiveCheck.data.environment
          });
        } else {
          console.log(`[checkTenantIntegration] Integração WhatsApp não encontrada para tenant: ${tenantId}`);
        }
        return false;
      }
      data = result.data;
    }
    const isActive = data?.is_active === true;
    console.log(`[checkTenantIntegration] Resultado final: isActive=${isActive}`);
    return isActive;
  } catch (error) {
    console.error('[checkTenantIntegration] Erro ao verificar integração:', error);
    return false;
  }
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // AIDEV-NOTE: Extrair tenant_id do header ou body da requisição
    const tenantId = req.headers.get('x-tenant-id');
    const requestBody = await req.json().catch(()=>({}));
    const { method, endpoint, data, tenant_id: bodyTenantId, environment = 'production' } = requestBody;
    const finalTenantId = tenantId || bodyTenantId;
    if (!finalTenantId) {
      throw new Error('Tenant ID é obrigatório (header x-tenant-id ou body tenant_id)');
    }
    if (!method || !endpoint) {
      throw new Error('Método HTTP e endpoint são obrigatórios');
    }
    // AIDEV-NOTE: Verificar rate limiting
    if (!checkRateLimit(finalTenantId)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Tente novamente em alguns minutos.'
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Validando integração Evolution para tenant:', finalTenantId);
    // AIDEV-NOTE: Obter credenciais fixas da Evolution API PRIMEIRO (erro crítico)
    // As variáveis EVOLUTION_API_URL e EVOLUTION_API_KEY devem estar configuradas no Supabase Dashboard > Edge Functions > Secrets
    // Verificar isso primeiro porque é um erro crítico que impede qualquer operação
    let credentials;
    try {
      credentials = getEvolutionApiCredentials();
      console.log('[evolution-proxy] Credenciais obtidas com sucesso');
    } catch (credError) {
      console.error('[evolution-proxy] Erro ao obter credenciais:', credError);
      throw credError; // Re-throw para manter a mensagem de erro clara
    }
    // AIDEV-NOTE: Verificar se a integração está ativa para o tenant (após verificar credenciais)
    // IMPORTANTE: Para operações de criação de instância (/instance/create), permitir mesmo sem integração ativa
    // Isso resolve o problema de "ovo e galinha": precisa criar instância para ativar, mas precisa estar ativo para criar
    const isCreateOperation = method === 'POST' && (endpoint.includes('/instance/create') || endpoint === '/instance/create');
    const isIntegrationActive = await checkTenantIntegration(finalTenantId, environment);
    if (!isIntegrationActive) {
      if (isCreateOperation) {
        // AIDEV-NOTE: Permitir criação de instância mesmo sem integração ativa
        // A integração será ativada após a criação bem-sucedida da instância
        console.log(`[evolution-proxy] Permitindo criação de instância mesmo sem integração ativa (tenant: ${finalTenantId})`);
      } else {
        // AIDEV-NOTE: Para outras operações, exigir que a integração esteja ativa
        throw new Error('Integração com Evolution API não está ativa para este tenant. Ative nas Integrações.');
      }
    } else {
      console.log(`[evolution-proxy] Integração ativa confirmada para tenant: ${finalTenantId}`);
    }
    console.log('Integração validada com sucesso');
    console.log('Detalhes da requisição:', {
      method,
      endpoint,
      hasData: !!data,
      tenant: finalTenantId,
      environment
    });
    // AIDEV-NOTE: Construir URL completa
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${credentials.apiUrl}${cleanEndpoint}`;
    console.log('URL final:', url);
    const headers = {
      'Content-Type': 'application/json',
      'apikey': credentials.apiKey
    };
    console.log('Requisição autorizada iniciada');
    // AIDEV-NOTE: Fazer requisição para Evolution API
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined
    });
    // AIDEV-NOTE: Verificar se a resposta é JSON ou texto
    const contentType = response.headers.get('content-type');
    let responseData;
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else if (response.status === 204) {
      // No content
      responseData = {
        success: true
      };
    } else {
      const text = await response.text();
      responseData = text ? {
        data: text
      } : {
        success: true
      };
    }
    console.log('Resposta da API Evolution:', {
      status: response.status,
      ok: response.ok,
      hasData: !!responseData
    });
    if (!response.ok) {
      console.error('Erro na API Evolution:', responseData);
      throw new Error(`Erro na API Evolution: ${responseData.error || responseData.message || response.statusText}`);
    }
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro no evolution-proxy:', error);
    // AIDEV-NOTE: Melhorar mensagem de erro para facilitar debug
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Detalhes do erro:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return new Response(JSON.stringify({
      error: errorMessage || 'Erro Interno do Servidor',
      details: process.env.DENO_ENV === 'development' ? errorStack : undefined
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
