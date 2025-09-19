import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('api_key_asaas')
    console.log('CHAVE_API_ASAAS configurada:', !!apiKey)
    
    if (!apiKey) {
      console.error('CHAVE_API_ASAAS não configurada')
      throw new Error('CHAVE_API_ASAAS não configurada')
    }

    const { method, path, data, params } = await req.json()
    
    console.log('Detalhes da requisição:', {
      method,
      path,
      params,
      hasData: !!data
    })
    
    let url = 'https://api.asaas.com/v3'
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
      'access_token': apiKey
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