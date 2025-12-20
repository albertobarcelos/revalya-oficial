import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== INICIO DEBUG ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    // Headers
    const headers = {}
    for (const [key, value] of req.headers.entries()) {
      headers[key] = value
    }
    console.log('Headers:', JSON.stringify(headers, null, 2))
    
    // Body
    const bodyText = await req.text()
    console.log('Body (raw):', bodyText)
    
    let body
    try {
      body = JSON.parse(bodyText)
      console.log('Body (parsed):', JSON.stringify(body, null, 2))
    } catch (e) {
      console.log('JSON Parse Error:', e.message)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Env vars
    console.log('SUPABASE_URL:', !!Deno.env.get('SUPABASE_URL'))
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    console.log('JWT_PRIVATE_KEY:', !!Deno.env.get('JWT_PRIVATE_KEY'))
    
    console.log('=== FIM DEBUG ===')
    
    // Resposta de sucesso temporária para debug
    return new Response(
      JSON.stringify({ 
        debug: 'success',
        receivedBody: body,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('ERROR:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal error',
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

