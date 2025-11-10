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

// AIDEV-NOTE: Mapeamento de status_externo (conciliation_staging) para status (charges)
// status_externo usa minúsculas, status (charges) usa MAIÚSCULAS conforme constraint
function mapExternalStatusToChargeStatus(statusExterno: string): string {
  if (!statusExterno) return "PENDING"; // Default seguro
  
  const statusLower = statusExterno.toLowerCase();
  const statusMap: Record<string, string> = {
    "pending": "PENDING",
    "received": "RECEIVED",
    "overdue": "OVERDUE",
    "confirmed": "CONFIRMED",
    "refunded": "REFUNDED",
    "created": "PENDING",        // Default para PENDING
    "deleted": "PENDING",        // Default para PENDING
    "checkout_viewed": "PENDING", // Default para PENDING
    "anticipaded": "RECEIVED"    // Mantém o typo do constraint do banco
  };
  
  return statusMap[statusLower] || "PENDING"; // Default para PENDING se não encontrar
}

// AIDEV-NOTE: Função para buscar dados do cliente na API ASAAS
async function fetchAsaasCustomer(customerId: string, apiKey: string, apiUrl: string) {
  try {
    // AIDEV-NOTE: Validar parâmetros antes de fazer a requisição
    if (!customerId || !apiKey || !apiUrl) {
      console.error(`❌ Parâmetros inválidos para buscar customer:`, {
        customerId: customerId ? `${customerId.substring(0, 10)}...` : 'null',
        hasApiKey: !!apiKey,
        hasApiUrl: !!apiUrl
      });
      return null;
    }

    // AIDEV-NOTE: Limpar customerId (remover espaços, etc)
    const cleanCustomerId = customerId.trim();
    if (!cleanCustomerId) {
      console.error(`❌ customerId vazio após limpeza`);
      return null;
    }

    console.log(`🔍 Buscando cliente ${cleanCustomerId} na API ASAAS...`);
    console.log(`🔧 URL da API: ${apiUrl}`);
    
    // AIDEV-NOTE: Construir URL corretamente (remover /v3 duplicado se apiUrl já tiver)
    const baseUrl = apiUrl.endsWith('/v3') ? apiUrl.replace(/\/v3$/, '') : apiUrl.replace(/\/$/, '');
    const customerUrl = `${baseUrl}/v3/customers/${cleanCustomerId}`;
    
    console.log(`🌐 URL completa: ${customerUrl}`);
    
    const response = await fetch(customerUrl, {
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
      console.error(`📄 Detalhes do erro: ${errorText.substring(0, 500)}`);
      
      // AIDEV-NOTE: Se for 404, o customer não existe (não é erro crítico)
      if (response.status === 404) {
        console.warn(`⚠️ Customer ${cleanCustomerId} não encontrado na API ASAAS`);
      }
      
      return null;
    }

    const customerData = await response.json();
    
    // AIDEV-NOTE: Validar se os dados retornados são válidos
    if (!customerData || typeof customerData !== 'object') {
      console.error(`❌ Resposta inválida da API:`, typeof customerData);
      return null;
    }
    
    console.log(`✅ Cliente encontrado: ${customerData.name || 'N/A'} (${customerData.email || 'sem email'})`);
    
    return customerData;
  } catch (error) {
    console.error('❌ Erro ao buscar cliente na API ASAAS:', error);
    if (error instanceof Error) {
      console.error(`📄 Mensagem de erro: ${error.message}`);
      console.error(`📄 Stack: ${error.stack?.substring(0, 500)}`);
    }
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
  
  // AIDEV-NOTE: Verificar se é uma requisição de teste do ASAAS (pode vir sem token durante configuração)
  const isTestRequest = req.headers.get("user-agent")?.includes("Asaas") || 
                       !accessToken;
  
  if (!isTestRequest && (!accessToken || accessToken.trim() !== integrationData.webhook_token.trim())) {
    console.error("❌ Token inválido ou ausente");
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
  let payload;
  let bodyText: string = "";
  try {
    bodyText = await req.text();
    console.log("📦 Body recebido (raw):", bodyText.substring(0, 500)); // Limitar para não poluir logs
    
    // AIDEV-NOTE: Se o body estiver vazio, pode ser uma requisição de teste do ASAAS
    if (!bodyText || bodyText.trim() === "") {
      console.log("⚠️ Body vazio detectado - provavelmente requisição de teste do ASAAS");
      return new Response(JSON.stringify({
        success: true,
        message: "Webhook configurado com sucesso",
        test: true
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    payload = JSON.parse(bodyText);
    console.log("📦 Payload parseado:", JSON.stringify(payload).substring(0, 500));
  } catch (parseError) {
    console.error("❌ Erro ao fazer parse do JSON:", parseError);
    console.error("❌ Body que causou erro:", bodyText?.substring(0, 200));
    return new Response(JSON.stringify({
      error: "Payload JSON inválido",
      message: parseError instanceof Error ? parseError.message : String(parseError)
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  
  const eventId = payload.event?.id || crypto.randomUUID();
  const eventType = payload.event?.type || payload.event || "UNKNOWN";
  const payment = payload.payment || {};
  
  // 🔍 Buscar dados do cliente na API ASAAS se customer_id estiver presente
  // AIDEV-NOTE: payment.customer pode ser string (ID) ou objeto com dados
  let customerData = null;
  let customerId: string | null = null;
  
  // Extrair customer ID se for string ou objeto
  if (typeof payment.customer === 'string') {
    customerId = payment.customer;
  } else if (payment.customer && typeof payment.customer === 'object' && payment.customer.id) {
    customerId = payment.customer.id;
    // AIDEV-NOTE: Se o webhook já enviar dados do customer como objeto, usar diretamente
    customerData = payment.customer;
  }
  
  // AIDEV-NOTE: Se não tiver dados do customer no payload e tiver customerId, buscar na API
  if (!customerData && customerId && integrationData.config?.api_key && integrationData.config?.api_url) {
    console.log(`🔍 Buscando dados do customer ${customerId} na API ASAAS...`);
    try {
      customerData = await fetchAsaasCustomer(
        customerId, 
        integrationData.config.api_key,
        integrationData.config.api_url
      );
      if (customerData) {
        console.log(`✅ Dados do customer obtidos: ${customerData.name || 'N/A'}`);
      } else {
        console.warn(`⚠️ Não foi possível obter dados do customer ${customerId} - pode estar faltando configuração ou o customer não existe na API`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar customer ${customerId}:`, error);
      // AIDEV-NOTE: Continuar mesmo se a busca falhar - não bloquear o processamento do webhook
    }
  } else if (!customerId) {
    console.warn(`⚠️ payment.customer não encontrado ou inválido no payload`);
  } else if (!integrationData.config?.api_key || !integrationData.config?.api_url) {
    console.warn(`⚠️ API key ou URL não configurados - não é possível buscar dados do customer`);
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
    processed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // AIDEV-NOTE: Horário de Brasília (UTC-3)
  });

  // 💾 Persistir dados na conciliation_staging
  // AIDEV-NOTE: Garantir que id_externo sempre tenha um valor válido
  const idExterno = payment.id || eventId || crypto.randomUUID();
  
  // AIDEV-NOTE: Correção crítica - netValue deve ser tratado consistentemente
  // Garantir que valor_liquido e valor_pago tenham o mesmo tratamento para null
  const netValueSafe = payment.netValue ?? 0;
  
  // AIDEV-NOTE: Preparar dados para inserção - apenas colunas que existem na tabela
  const upsertData: any = {
    tenant_id: tenantId,
    origem: "ASAAS", // AIDEV-NOTE: Maiúsculo conforme constraint conciliation_staging_origem_check
    id_externo: idExterno,
    asaas_customer_id: customerId || (typeof payment.customer === 'string' ? payment.customer : payment.customer?.id) || null,
    // AIDEV-NOTE: asaas_subscription_id não existe na tabela - removido
    valor_cobranca: payment.value,
    valor_pago: netValueSafe,
    valor_original: payment.originalValue,
    valor_liquido: netValueSafe,
    taxa_juros: payment.interest?.value ?? 0,
    taxa_multa: payment.fine?.value ?? 0,
    valor_desconto: payment.discount?.value ?? 0,
    status_externo: mapPaymentStatusToExternal(payment.status || "pending"),
    status_conciliacao: "PENDENTE", // AIDEV-NOTE: Status padrão em MAIÚSCULO
    data_vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString() : null,
    // AIDEV-NOTE: data_vencimento_original não existe na tabela - removido
    data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
    // AIDEV-NOTE: data_pagamento_cliente, data_confirmacao, data_credito, data_credito_estimada não existem - removidos
    installment_number: payment.installmentNumber,
    // AIDEV-NOTE: installment_count não existe na tabela - removido
    invoice_url: payment.invoiceUrl?.replace(/,$/, '') || null, // AIDEV-NOTE: Remove vírgula no final da URL
    // AIDEV-NOTE: bank_slip_url não existe, mas pdf_url existe - usar pdf_url se bankSlipUrl estiver disponível
    pdf_url: payment.bankSlipUrl?.replace(/,$/, '') || null,
    transaction_receipt_url: payment.transactionReceiptUrl?.replace(/,$/, '') || null,
    payment_method: payment.billingType,
    external_reference: payment.externalReference,
    invoice_number: payment.invoiceNumber || null, // AIDEV-NOTE: Número da fatura/nota fiscal do ASAAS
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
    // AIDEV-NOTE: webhook_event não existe na tabela - removido (pode ser armazenado em raw_data)
    raw_data: payload,
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // AIDEV-NOTE: Horário de Brasília (UTC-3)
  };

  const { error: persistError } = await supabase.from("conciliation_staging").upsert(upsertData, {
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

  // AIDEV-NOTE: Buscar dados persistidos de conciliation_staging para sincronizar com charges
  const { data: persistedData, error: fetchError } = await supabase
    .from("conciliation_staging")
    .select("status_externo, valor_cobranca")
    .eq("tenant_id", tenantId)
    .eq("id_externo", idExterno)
    .eq("origem", "ASAAS")
    .single();

  if (fetchError) {
    console.error("⚠️ Erro ao buscar dados persistidos de conciliation_staging:", fetchError);
    // Não interrompe o fluxo - continuar sem sincronizar status e payment_value
  }

  // AIDEV-NOTE: Lógica inteligente - Sincronizar com charges se houver vinculação
  try {
    // Buscar charge vinculada pelo asaas_id
    const { data: linkedCharge, error: chargeError } = await supabase
      .from("charges")
      .select("id, status, data_pagamento, asaas_payment_date, asaas_net_value, asaas_invoice_url")
      .eq("tenant_id", tenantId)
      .eq("asaas_id", payment.id)
      .single();

    if (chargeError && chargeError.code !== 'PGRST116') {
      console.error("❌ Erro ao buscar charge vinculada:", chargeError);
    } else if (linkedCharge) {
      console.log("🔗 Charge vinculada encontrada:", linkedCharge.id);
      
      // Preparar dados para atualização
      const updateData: any = {
        asaas_payment_date: payment.paymentDate || null,
        asaas_net_value: payment.netValue || null,
        asaas_invoice_url: payment.invoiceUrl || null,
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // AIDEV-NOTE: Horário de Brasília (UTC-3)
      };

      // AIDEV-NOTE: Sincronizar status com status_externo de conciliation_staging
      if (persistedData?.status_externo) {
        const mappedStatus = mapExternalStatusToChargeStatus(persistedData.status_externo);
        updateData.status = mappedStatus;
        console.log(`🔄 Sincronizando status: ${persistedData.status_externo} → ${mappedStatus}`);
      }

      // AIDEV-NOTE: Atualizar payment_value com valor_cobranca de conciliation_staging
      if (persistedData?.valor_cobranca !== null && persistedData?.valor_cobranca !== undefined) {
        updateData.payment_value = persistedData.valor_cobranca;
        console.log(`💰 Sincronizando payment_value: ${persistedData.valor_cobranca}`);
      }

      // Atualizar data_pagamento apenas se veio do webhook e ainda não existe
      if (payment.paymentDate && !linkedCharge.data_pagamento) {
        updateData.data_pagamento = payment.paymentDate;
      }

      // Atualizar charge com dados do webhook
      const { error: updateError } = await supabase
        .from("charges")
        .update(updateData)
        .eq("id", linkedCharge.id)
        .eq("tenant_id", tenantId);

      if (updateError) {
        console.error("❌ Erro ao atualizar charge vinculada:", updateError);
      } else {
        console.log("✅ Charge vinculada atualizada com dados do webhook");
      }
    } else {
      console.log("ℹ️ Nenhuma charge vinculada encontrada para asaas_id:", payment.id);
    }
  } catch (syncError) {
    console.error("❌ Erro na sincronização com charges:", syncError);
    // Não interrompe o fluxo principal - sincronização é opcional
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
    const pathParts = url.pathname.split("/").filter(part => part.length > 0);
    const tenantId = pathParts[pathParts.length - 1];
    
    console.log("📌 URL completa:", req.url);
    console.log("📌 Pathname:", url.pathname);
    console.log("📌 Path parts:", pathParts);
    console.log("📌 Tenant extraído:", tenantId);
    console.log("📌 Método HTTP:", req.method);
    console.log("📌 Headers recebidos:", Object.fromEntries(req.headers.entries()));
    
    // AIDEV-NOTE: Validação mais robusta do tenant ID
    // Verificar se o tenantId é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!tenantId || tenantId === "asaas-webhook-charges" || tenantId === "asaas-webhook" || !uuidRegex.test(tenantId)) {
      console.error("❌ Tenant ID inválido:", tenantId);
      return new Response(JSON.stringify({
        error: "Tenant ID inválido",
        received: tenantId,
        pathname: url.pathname,
        expectedFormat: "UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
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
    console.error("❌ Stack trace:", err instanceof Error ? err.stack : "N/A");
    return new Response(JSON.stringify({
      error: "Erro interno",
      message: err instanceof Error ? err.message : String(err)
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