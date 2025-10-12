import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Configuração de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token, x-asaas-access-token, x-webhook-token, access_token, user-agent",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// AIDEV-NOTE: Mapeamento de status de pagamento para status externo (valores válidos do constraint)
function mapPaymentStatusToExternal(status: string): string {
  const statusMap: Record<string, string> = {
    "PENDING": "pending",
    "RECEIVED": "received",
    "PAID": "received", // AIDEV-NOTE: Status PAID do ASAAS mapeado para "received" para resolver constraint violation
    "CONFIRMED": "confirmed",
    "OVERDUE": "overdue",
    "REFUNDED": "refunded",
    "RECEIVED_IN_CASH": "received",
    "REFUND_REQUESTED": "refunded",
    "REFUND_IN_PROGRESS": "refunded",
    "CHARGEBACK_REQUESTED": "refunded",
    "CHARGEBACK_DISPUTE": "refunded",
    "AWAITING_CHARGEBACK_REVERSAL": "pending",
    "DUNNING_REQUESTED": "overdue",
    "DUNNING_RECEIVED": "overdue",
    "AWAITING_RISK_ANALYSIS": "pending",
    "CREATED": "created",
    "DELETED": "deleted",
    "CHECKOUT_VIEWED": "checkout_viewed",
    "ANTICIPATED": "anticipaded" // Mantém o typo do constraint do banco
  };
  return statusMap[status] || "pending"; // Default para pending se não encontrar
}

// AIDEV-NOTE: Função para buscar dados do cliente na API ASAAS
async function fetchAsaasCustomer(customerId: string, apiKey: string, apiUrl: string) {
  try {
    console.log(`🔍 Buscando cliente ${customerId} na API ASAAS...`);
    console.log(`🔧 URL da API: ${apiUrl}`);
    console.log(`🔑 API Key original: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);
    
    // AIDEV-NOTE: Usar a API key completa incluindo o prefixo '$' conforme documentação ASAAS
    console.log(`🔑 API Key completa: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);
    
    const response = await fetch(`${apiUrl}/v3/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Status da resposta: ${response.status} - ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao buscar cliente: ${response.status} - ${response.statusText}`);
      console.error(`📄 Detalhes do erro: ${errorText}`);
      return null;
    }

    const customerData = await response.json();
    console.log(`✅ Cliente encontrado: ${customerData.name || 'N/A'}`);
    
    return customerData;
  } catch (error) {
    console.error('❌ Erro ao buscar cliente na API ASAAS:', error);
    return null;
  }
}

// AIDEV-NOTE: Handler para requisições GET - consultas à API ASAAS
async function handleGetRequest(req: Request, url: URL) {
  console.log("🔍 Processando requisição GET para consulta API ASAAS");
  
  // Extrair parâmetros da query string
  const customerId = url.searchParams.get('customer_id');
  
  if (!customerId) {
    return new Response(JSON.stringify({
      error: "customer_id é obrigatório para consultas GET"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  //// 🔍 Buscar tenant_id baseado no customer_id
  const { data: mappingData, error: mappingError } = await supabase
    .from("conciliation_staging")
    .select("tenant_id")
    .eq("asaas_customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (mappingError || !mappingData) {
    console.error("❌ Customer ID não encontrado no mapeamento:", mappingError);
    return new Response(JSON.stringify({
      error: "Customer ID não encontrado no sistema"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const tenantId = mappingData.tenant_id;
  console.log("📌 Tenant encontrado para customer_id:", tenantId);

  // 🔑 Buscar configuração ASAAS no banco
  const { data: integrationData, error: integrationError } = await supabase
    .from("tenant_integrations")
    .select("id, config")
    .eq("tenant_id", tenantId)
    .eq("integration_type", "asaas") // AIDEV-NOTE: Minúsculo conforme constraint tenant_integrations
    .eq("is_active", true)
    .maybeSingle();

  if (integrationError || !integrationData) {
    console.error("❌ Integração ASAAS não encontrada:", integrationError);
    return new Response(JSON.stringify({
      error: "Integração ASAAS não encontrada"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  if (!integrationData.config?.api_key || !integrationData.config?.api_url) {
    return new Response(JSON.stringify({
      error: "Configuração ASAAS incompleta (api_key ou api_url ausente)"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // 🔍 Buscar dados do cliente na API ASAAS
  const customerData = await fetchAsaasCustomer(
    customerId,
    integrationData.config.api_key,
    integrationData.config.api_url
  );

  if (!customerData) {
    return new Response(JSON.stringify({
      error: "Cliente não encontrado na API ASAAS"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    customer: customerData
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// AIDEV-NOTE: Handler para requisições POST - webhooks ASAAS
async function handlePostRequest(req: Request, tenantId: string) {
  console.log("📨 Processando webhook POST do ASAAS");
  
  // 🔑 Buscar configuração ASAAS no banco
  const { data: integrationData, error: integrationError } = await supabase
    .from("tenant_integrations")
    .select("id, webhook_token, config")
    .eq("tenant_id", tenantId)
    .eq("integration_type", "asaas") // AIDEV-NOTE: Minúsculo conforme constraint tenant_integrations
    .eq("is_active", true)
    .maybeSingle();

  if (integrationError || !integrationData) {
    console.error("❌ Integração ASAAS não encontrada:", integrationError);
    return new Response(JSON.stringify({
      error: "Integração ASAAS não encontrada"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // 🔐 Validação flexível de token
  const accessToken = req.headers.get("asaas-access-token") || 
                     req.headers.get("x-asaas-access-token") || 
                     req.headers.get("x-webhook-token") || 
                     req.headers.get("authorization")?.replace("Bearer ", "");
  
  console.log("📌 Token esperado:", integrationData.webhook_token);
  console.log("📌 Token recebido:", accessToken);
  
  if (!accessToken || accessToken.trim() !== integrationData.webhook_token.trim()) {
    return new Response(JSON.stringify({
      error: "Não autorizado"
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // 📦 Parse do payload
  const payload = await req.json();
  console.log("📦 Payload recebido:", JSON.stringify(payload));
  
  const eventId = payload.event?.id || crypto.randomUUID();
  const eventType = payload.event?.type || payload.event || "UNKNOWN";
  const payment = payload.payment || {};
  
  // 🔍 Buscar dados do cliente na API ASAAS se customer_id estiver presente
  let customerData = null;
  if (payment.customer && integrationData.config?.api_key && integrationData.config?.api_url) {
    customerData = await fetchAsaasCustomer(
      payment.customer, 
      integrationData.config.api_key,
      integrationData.config.api_url
    );
  }

  // ⚡️ Idempotência
  const { data: existing } = await supabase
    .from("integration_processed_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("integration_id", integrationData.id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    console.log(`⚠️ Evento duplicado ignorado: ${eventId}`);
    return new Response(JSON.stringify({
      message: "Evento já processado"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // 📝 Registrar evento processado
  await supabase.from("integration_processed_events").insert({
    tenant_id: tenantId,
    integration_id: integrationData.id,
    event_type: eventType,
    event_id: eventId,
    status: "processed",
    payload,
    processed_at: new Date().toISOString()
  });

  // 💾 Persistir dados na conciliation_staging
  // AIDEV-NOTE: Garantir que id_externo sempre tenha um valor válido
  const idExterno = payment.id || eventId || crypto.randomUUID();
  
  const { error: persistError } = await supabase.from("conciliation_staging").upsert({
    tenant_id: tenantId,
    origem: "ASAAS", // AIDEV-NOTE: Maiúsculo conforme constraint conciliation_staging_origem_check
    id_externo: idExterno,
    asaas_customer_id: payment.customer,
    asaas_subscription_id: payment.subscription,
    valor_cobranca: payment.value,
    valor_pago: payment.netValue ?? 0,
    valor_original: payment.originalValue,
    valor_liquido: payment.netValue,
    valor_juros: payment.interest?.value ?? 0,
    valor_multa: payment.fine?.value ?? 0,
    valor_desconto: payment.discount?.value ?? 0,
    status_externo: mapPaymentStatusToExternal(payment.status || "pending"),
    status_conciliacao: "PENDENTE", // AIDEV-NOTE: Status padrão em MAIÚSCULO
    data_vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString() : null,
    data_vencimento_original: payment.originalDueDate ? new Date(payment.originalDueDate).toISOString() : null,
    data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
    data_pagamento_cliente: payment.clientPaymentDate ? new Date(payment.clientPaymentDate).toISOString() : null,
    data_confirmacao: payment.confirmedDate ? new Date(payment.confirmedDate).toISOString() : null,
    data_credito: payment.creditDate ? new Date(payment.creditDate).toISOString() : null,
    data_credito_estimada: payment.estimatedCreditDate ? new Date(payment.estimatedCreditDate).toISOString() : null,
    installment_number: payment.installmentNumber,
    installment_count: payment.installmentCount,
    invoice_url: payment.invoiceUrl?.replace(/,$/, '') || null, // AIDEV-NOTE: Remove vírgula no final da URL
    bank_slip_url: payment.bankSlipUrl?.replace(/,$/, '') || null, // AIDEV-NOTE: Remove vírgula no final da URL
    transaction_receipt_url: payment.transactionReceiptUrl?.replace(/,$/, '') || null,
    payment_method: payment.billingType,
    external_reference: payment.externalReference,
    deleted_flag: payment.deleted ?? false,
    anticipated_flag: payment.anticipated ?? false,
    // AIDEV-NOTE: Campos do customer obtidos da API do Asaas
    customer_name: customerData?.name || null,
    customer_email: customerData?.email || null,
    customer_phone: customerData?.phone || null,
    customer_mobile_phone: customerData?.mobilePhone || null,
    customer_document: customerData?.cpfCnpj || null,
    customer_address: customerData?.address || null,
    customer_address_number: customerData?.addressNumber || null,
    customer_complement: customerData?.complement || null,
    customer_city: customerData?.city || null,
    customer_state: customerData?.state || null,
    customer_province: customerData?.province || null,
    customer_postal_code: customerData?.postalCode || null,
    customer_country: customerData?.country || null,
    webhook_event: eventType,
    raw_data: payload,
    updated_at: new Date().toISOString()
  }, {
    onConflict: "tenant_id,id_externo,origem",
    ignoreDuplicates: false
  });

  if (persistError) {
    console.error("❌ Erro ao persistir conciliação:", persistError);
    return new Response(JSON.stringify({
      error: "Erro ao persistir conciliação"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Webhook processado com sucesso",
    eventType,
    eventId
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// Função principal com JWT EXPLICITAMENTE DESATIVADO
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // AIDEV-NOTE: Aceita POST (webhooks) e GET (consultas API)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({
      error: "Método não permitido. Use POST para webhooks ou GET para consultas."
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  
  try {
    // 🔎 Extrair tenant da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const tenantId = pathParts[pathParts.length - 1];
    console.log("📌 URL completa:", req.url);
    console.log("📌 Tenant extraído:", tenantId);
    console.log("📌 Método HTTP:", req.method);
    
    if (!tenantId || tenantId === "asaas-webhook") {
      return new Response(JSON.stringify({
        error: "Tenant ID inválido"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // AIDEV-NOTE: Roteamento baseado no método HTTP
    if (req.method === "GET") {
      return await handleGetRequest(req, url);
    } else if (req.method === "POST") {
      return await handlePostRequest(req, tenantId);
    }
  } catch (err) {
    console.error("❌ Erro inesperado:", err);
    return new Response(JSON.stringify({
      error: "Erro interno"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}, {
  // AIDEV-NOTE: JWT EXPLICITAMENTE DESATIVADO
  verifyJWT: false
});