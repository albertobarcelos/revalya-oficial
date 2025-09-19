import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL')
const N8N_API_KEY = Deno.env.get('N8N_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chargeIds, templateId } = await req.json()

    // Forward the request to N8N with proper authentication
    const response = await fetch(`${N8N_WEBHOOK_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || '',
        ...corsHeaders,
      },
      body: JSON.stringify({
        action: 'sendBulkMessages',
        chargeIds,
        templateId
      })
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      status: response.status,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      status: 500,
    })
  }
})