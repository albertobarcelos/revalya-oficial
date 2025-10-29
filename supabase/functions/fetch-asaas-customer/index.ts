import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// AIDEV-NOTE: Configuração de CORS para Edge Function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// AIDEV-NOTE: Usar as mesmas variáveis de ambiente que o asaas-webhook
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// AIDEV-NOTE: Edge Function para buscar dados completos do cliente ASAAS
// Utilizada pelo trigger da tabela conciliation_staging para popular colunas customer_*

interface AsaasCustomer {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  [key: string]: any;
}

// AIDEV-NOTE: Função para obter credenciais ASAAS do tenant
async function getAsaasCredentials(tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_integrations')
    .select('api_key, api_url, environment')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'asaas')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Credenciais ASAAS não encontradas para tenant ${tenantId}: ${error?.message}`);
  }

  return {
    apiKey: data.api_key,
    apiUrl: data.api_url || (data.environment === 'production' ? 'https://api.asaas.com' : 'https://sandbox.asaas.com'),
  };
}

// AIDEV-NOTE: Função para buscar cliente na API ASAAS
async function fetchAsaasCustomer(customerId: string, credentials: any): Promise<AsaasCustomer | null> {
  try {
    const response = await fetch(`${credentials.apiUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': credentials.apiKey
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Cliente ${customerId} não encontrado no ASAAS`)
        return null
      }
      throw new Error(`Erro na API ASAAS: ${response.status} - ${response.statusText}`)
    }

    const customerData = await response.json()
    console.log('Dados do cliente obtidos do ASAAS:', { id: customerData.id, name: customerData.name })
    
    return customerData
  } catch (error) {
    console.error(`Erro ao buscar cliente ${customerId} no ASAAS:`, error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customer_id, tenant_id } = await req.json()
    
    if (!customer_id) {
      throw new Error('customer_id é obrigatório')
    }
    
    if (!tenant_id) {
      throw new Error('tenant_id é obrigatório')
    }

    console.log('Buscando dados do cliente ASAAS:', { customer_id, tenant_id })
    
    // AIDEV-NOTE: Buscar credenciais específicas do tenant
    const credentials = await getAsaasCredentials(tenant_id)
    
    if (!credentials) {
      throw new Error('Integração ASAAS não configurada para este tenant')
    }
    
    if (!credentials.isActive) {
      throw new Error('Integração ASAAS está desativada para este tenant')
    }

    // AIDEV-NOTE: Buscar dados do cliente na API ASAAS
    const customerData = await fetchAsaasCustomer(customer_id, credentials)
    
    if (!customerData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cliente não encontrado no ASAAS',
          customer_data: null 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Mapear dados do ASAAS para as colunas da tabela conciliation_staging
    const mappedData = {
      customer_name: customerData.name,
      customer_company: customerData.company,
      customer_email: customerData.email,
      customer_document: customerData.cpfCnpj,
      customer_phone: customerData.phone,
      customer_mobile_phone: customerData.mobilePhone,
      customer_address: customerData.address,
      customer_address_number: customerData.addressNumber,
      customer_complement: customerData.complement,
      customer_province: customerData.province,
      customer_city: customerData.city,
      customer_state: customerData.state,
      customer_postal_code: customerData.postalCode,
      customer_country: customerData.country || 'Brasil'
    }

    console.log('Dados mapeados para conciliation_staging:', mappedData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer_data: mappedData,
        raw_customer_data: customerData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na fetch-asaas-customer:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        customer_data: null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})