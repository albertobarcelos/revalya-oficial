import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// AIDEV-NOTE: Função para buscar credenciais do Asaas por tenant
async function getAsaasCredentials(tenantId: string, environment: string = 'production') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('credentials, config, is_active')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'asaas')
    .eq('environment', environment)
    .eq('is_active', true)
    .single()
  
  if (error || !data) {
    console.error('Erro ao buscar credenciais do Asaas:', error)
    return null
  }
  
  // AIDEV-NOTE: As credenciais estão armazenadas no campo 'config' (JSONB)
  // Estrutura: { api_key, api_url, environment, instance_name }
  const config = data.config || {}
  
  return {
    apiKey: config.api_key || data.credentials?.api_key,
    apiUrl: config.api_url || data.credentials?.api_url || 'https://api.asaas.com/v3',
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
    
    console.log('Buscando credenciais para tenant:', finalTenantId, 'ambiente:', environment)
    
    // AIDEV-NOTE: Buscar credenciais específicas do tenant
    const credentials = await getAsaasCredentials(finalTenantId, environment)
    
    if (!credentials || !credentials.apiKey) {
      console.error('Credenciais do Asaas não configuradas para o tenant:', finalTenantId)
      throw new Error('Integração com Asaas não configurada para este tenant. Configure nas Integrações.')
    }
    
    if (!credentials.isActive) {
      throw new Error('Integração com Asaas está desativada para este tenant.')
    }
    
    console.log('Credenciais encontradas para tenant:', finalTenantId)
    
    console.log('Detalhes da requisição:', {
      method,
      path,
      params,
      hasData: !!data,
      tenant: finalTenantId,
      environment
    })
    
    // AIDEV-NOTE: Usar URL da integração ou padrão
    let url = credentials.apiUrl
    url += path.startsWith('/') ? path : `/${path}`

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

    console.log('URL final:', url)

    const headers = {
      'Content-Type': 'application/json',
      'access_token': credentials.apiKey
    }

    console.log('Fazendo requisição com headers:', {
      contentType: headers['Content-Type'],
      hasAccessToken: !!headers['access_token']
    })

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