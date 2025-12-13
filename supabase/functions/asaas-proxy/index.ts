import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// AIDEV-NOTE: Rate limiting simples (em produção usar Redis)
const requestCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `asaas_${tenantId}`;
  const limit = 100; // 100 requests per minute
  const windowMs = 60000; // 1 minute
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    console.warn('RATE_LIMIT_EXCEEDED:', { tenant_id: tenantId, count: current.count, limit });
    return false;
  }
  
  current.count++;
  return true;
}

// AIDEV-NOTE: Função para buscar credenciais do Asaas por tenant
async function getAsaasCredentials(tenantId: string, environment: string = 'production') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // AIDEV-NOTE: Buscar integração - tentar primeiro sem filtro de environment
  // Se não encontrar, tenta com environment (para compatibilidade)
  let { data, error } = await supabase
    .from('tenant_integrations')
    .select('config, is_active, environment')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'asaas')
    .eq('is_active', true)
    .maybeSingle()
  
  // AIDEV-NOTE: Se não encontrou sem filtro de environment, tentar com filtro
  if (error || !data) {
    console.log(`Tentando buscar integração com environment=${environment}`)
    const result = await supabase
      .from('tenant_integrations')
      .select('config, is_active, environment')
      .eq('tenant_id', tenantId)
      .eq('integration_type', 'asaas')
      .eq('environment', environment)
      .eq('is_active', true)
      .maybeSingle()
    
    if (result.error || !result.data) {
      console.error('Erro ao buscar credenciais do Asaas:', error || result.error)
      console.error('Tenant ID:', tenantId, 'Environment:', environment)
      return null
    }
    
    data = result.data
    error = result.error
  }
  
  if (!data) {
    console.error('Integração não encontrada para tenant:', tenantId)
    return null
  }
  
  // AIDEV-NOTE: Tentar obter chave descriptografada usando função RPC
  // Se não conseguir, usar texto plano do config (compatibilidade)
  let apiKey: string | null = null;
  
  try {
    const { data: decryptedKey, error: decryptError } = await supabase.rpc('get_decrypted_api_key', {
      p_tenant_id: tenantId,
      p_integration_type: 'asaas'
    });
    
    if (!decryptError && decryptedKey) {
      apiKey = decryptedKey;
      console.log('[getAsaasCredentials] Chave API descriptografada com sucesso');
    } else {
      // Fallback: usar texto plano do config
      const config = data.config || {};
      apiKey = config.api_key || null;
      if (apiKey) {
        console.warn('[getAsaasCredentials] Usando chave em texto plano (compatibilidade)');
      }
    }
  } catch (error) {
    // Se função não existir ou falhar, usar texto plano
    const config = data.config || {};
    apiKey = config.api_key || null;
    console.warn('[getAsaasCredentials] Erro ao descriptografar, usando texto plano:', error);
  }
  
  if (!apiKey) {
    console.error('API key não encontrada (criptografada ou texto plano) para tenant:', tenantId)
    return null
  }
  
  const config = data.config || {};
  return {
    apiKey: apiKey,
    apiUrl: config.api_url || 'https://api.asaas.com/v3',
    isActive: data.is_active
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // AIDEV-NOTE: Extrair tenant_id do header ou body da requisição
    const tenantId = req.headers.get('x-tenant-id')
    const { method, path, data, params, tenant_id: bodyTenantId, environment = 'production' } = await req.json()
    
    const finalTenantId = tenantId || bodyTenantId
    
    if (!finalTenantId) {
      throw new Error('Tenant ID é obrigatório (header x-tenant-id ou body tenant_id)')
    }
    
    // AIDEV-NOTE: Verificar rate limiting
    if (!checkRateLimit(finalTenantId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Tente novamente em alguns minutos.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Validando integração para tenant')
    
    // AIDEV-NOTE: Buscar credenciais específicas do tenant
    const credentials = await getAsaasCredentials(finalTenantId, environment)
    
    if (!credentials || !credentials.apiKey) {
      console.error('Integração Asaas não configurada para tenant')
      throw new Error('Integração com Asaas não configurada para este tenant. Configure nas Integrações.')
    }
    
    if (!credentials.isActive) {
      throw new Error('Integração com Asaas está desativada para este tenant.')
    }
    
    console.log('Integração validada com sucesso')
    
    console.log('Detalhes da requisição:', {
      method,
      path,
      params,
      hasData: !!data,
      tenant: finalTenantId,
      environment
    })
    
    // AIDEV-NOTE: Usar URL da integração ou padrão
    // AIDEV-NOTE: O path pode já conter query string (ex: /customers?offset=0&limit=20)
    let url = credentials.apiUrl
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    // AIDEV-NOTE: Se o path já contém query string, usar diretamente
    if (cleanPath.includes('?')) {
      url += cleanPath
    } else {
      url += cleanPath
      
      // AIDEV-NOTE: Adicionar params se não houver query string no path
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
        }
      }
    }

    console.log('URL final:', url)

    const headers = {
      'Content-Type': 'application/json',
      'access_token': credentials.apiKey
    }

    console.log('Requisição autorizada iniciada')

    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    const responseData = await response.json()
    
    console.log('Resposta da API Asaas:', {
      status: response.status,
      ok: response.ok,
      hasData: !!responseData
    })

    if (!response.ok) {
      console.error('Erro na API Asaas:', responseData)
      throw new Error(`Erro na API Asaas: ${responseData.message || response.statusText}`)
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Erro no asaas-proxy:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro Interno do Servidor',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: error.status || 500,
      }
    )
  }
})