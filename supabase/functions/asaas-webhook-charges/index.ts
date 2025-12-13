import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Configuração de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token, x-asaas-access-token, x-webhook-token, access_token, user-agent",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

// AIDEV-NOTE: Função helper para obter chave API descriptografada (com fallback para texto plano)
// Esta função tenta usar a função RPC get_decrypted_api_key que já faz o fallback automaticamente
async function getDecryptedApiKey(tenantId: string): Promise<string | null> {
  try {
    const { data: decryptedKey, error: decryptError } = await supabase.rpc('get_decrypted_api_key', {
      p_tenant_id: tenantId,
      p_integration_type: 'asaas'
    });
    
    if (!decryptError && decryptedKey) {
      console.log('[getDecryptedApiKey] Chave API obtida com sucesso (criptografada ou texto plano)');
      return decryptedKey;
    } else {
      // Se função RPC não existir ou falhar, buscar diretamente do config (compatibilidade)
      console.warn('[getDecryptedApiKey] Função RPC não disponível, usando fallback direto');
      const { data: integrationData } = await supabase
        .from("tenant_integrations")
        .select("config")
        .eq("tenant_id", tenantId)
        .eq("integration_type", "asaas")
        .eq("is_active", true)
        .maybeSingle();
      
      const apiKey = integrationData?.config?.api_key || null;
      if (apiKey) {
        console.warn('[getDecryptedApiKey] Usando chave em texto plano (compatibilidade)');
      }
      return apiKey;
    }
  } catch (error) {
    // Se função não existir ou falhar, usar texto plano
    console.warn('[getDecryptedApiKey] Erro ao obter chave, usando fallback direto:', error);
    const { data: integrationData } = await supabase
      .from("tenant_integrations")
      .select("config")
      .eq("tenant_id", tenantId)
      .eq("integration_type", "asaas")
      .eq("is_active", true)
      .maybeSingle();
    
    return integrationData?.config?.api_key || null;
  }
}

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

// AIDEV-NOTE: Mapeamento de status ASAAS para status (charges)
// Status ASAAS pode vir em diferentes formatos, status (charges) usa MAIÚSCULAS conforme constraint
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

// AIDEV-NOTE: Função auxiliar para buscar ou criar customer
// CRÍTICO: Se tiver asaasCustomerId mas não tiver customerData, SEMPRE buscar na API antes de criar
async function findOrCreateCustomer(
  tenantId: string,
  asaasCustomerId: string | null,
  customerData: any,
  apiKey?: string,
  apiUrl?: string
): Promise<string | null> {
  if (!asaasCustomerId && !customerData) {
    console.warn("⚠️ Não é possível criar customer sem asaasCustomerId ou customerData");
    return null;
  }

  // AIDEV-NOTE: CRÍTICO - Se tiver asaasCustomerId mas não tiver customerData, BUSCAR na API
  // NUNCA criar como "Cliente não identificado" se tiver asaasCustomerId válido
  if (asaasCustomerId && !customerData && apiKey && apiUrl) {
    console.log(`🔍 Buscando dados do customer ${asaasCustomerId} na API ASAAS (obrigatório antes de criar)`);
    try {
      customerData = await fetchAsaasCustomer(asaasCustomerId, apiKey, apiUrl);
      if (customerData) {
        console.log(`✅ Dados do customer obtidos da API: ${customerData.name || 'N/A'}`);
      } else {
        console.error(`❌ ERRO CRÍTICO: Não foi possível obter dados do customer ${asaasCustomerId} da API ASAAS`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ERRO ao buscar customer ${asaasCustomerId} na API:`, error);
      return null;
    }
  } else if (asaasCustomerId && !customerData) {
    console.error(`❌ ERRO CRÍTICO: Tem asaasCustomerId (${asaasCustomerId}) mas não tem customerData nem credenciais da API`);
    return null;
  }

  // AIDEV-NOTE: Primeiro tentar buscar por customer_asaas_id
  if (asaasCustomerId) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_asaas_id", asaasCustomerId)
      .maybeSingle();

    if (existingCustomer) {
      console.log(`✅ Customer encontrado por asaas_id: ${existingCustomer.id}`);
      return existingCustomer.id;
    }
  }

  // AIDEV-NOTE: Tentar buscar por documento se disponível
  if (customerData?.cpfCnpj) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("cpf_cnpj", customerData.cpfCnpj)
      .maybeSingle();

    if (existingCustomer) {
      // AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
      if (asaasCustomerId) {
        await supabase
          .from("customers")
          .update({ customer_asaas_id: asaasCustomerId })
          .eq("id", existingCustomer.id);
      }
      console.log(`✅ Customer encontrado por documento: ${existingCustomer.id}`);
      return existingCustomer.id;
    }
  }

  // AIDEV-NOTE: Criar novo customer
  // CRÍTICO: NUNCA criar como "Cliente não identificado" se tiver asaasCustomerId
  if (asaasCustomerId && !customerData) {
    console.error(`❌ ERRO CRÍTICO: Tentando criar customer com asaasCustomerId (${asaasCustomerId}) mas sem customerData`);
    return null;
  }

  // AIDEV-NOTE: Só criar como "Cliente não identificado" se realmente não tiver como obter dados
  const customerName = customerData?.name || (asaasCustomerId ? null : "Cliente não identificado");
  
  if (!customerName && asaasCustomerId) {
    console.error(`❌ ERRO CRÍTICO: Não é possível criar customer sem nome quando há asaasCustomerId (${asaasCustomerId})`);
    return null;
  }

  const { data: newCustomer, error: createError } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      customer_asaas_id: asaasCustomerId,
      name: customerName,
      email: customerData?.email || null,
      phone: customerData?.phone || customerData?.mobilePhone || null,
      cpf_cnpj: customerData?.cpfCnpj || null,
    })
    .select("id")
    .single();

  if (createError || !newCustomer) {
    console.error("❌ Erro ao criar customer:", createError);
    return null;
  }

  console.log(`✅ Customer criado: ${newCustomer.id} (nome: ${customerName})`);
  return newCustomer.id;
}

// AIDEV-NOTE: Função auxiliar para buscar contrato por externalReference
async function findContractByExternalReference(
  tenantId: string,
  externalReference: string | null
): Promise<string | null> {
  if (!externalReference) {
    return null;
  }

  // AIDEV-NOTE: Tentar buscar contrato pelo número ou ID na externalReference
  // Assumindo que externalReference pode conter contract_id ou contract_number
  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("tenant_id", tenantId)
    .or(`contract_number.eq.${externalReference},id.eq.${externalReference}`)
    .maybeSingle();

  if (contract) {
    console.log(`✅ Contrato encontrado por externalReference: ${contract.id}`);
    return contract.id;
  }

  return null;
}

// AIDEV-NOTE: Função auxiliar para buscar contrato por customer_id
// Prioriza contratos ATIVOS e mais recentes
async function findContractByCustomerId(
  tenantId: string,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) {
    return null;
  }

  // AIDEV-NOTE: Buscar contratos do customer, priorizando ATIVOS e mais recentes
  // Ordem de prioridade:
  // 1. Status ACTIVE
  // 2. Mais recente (created_at DESC)
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", ["ACTIVE", "DRAFT"]) // AIDEV-NOTE: Buscar apenas contratos ativos ou em rascunho
    .order("status", { ascending: true }) // AIDEV-NOTE: ACTIVE vem antes de DRAFT
    .order("created_at", { ascending: false }) // AIDEV-NOTE: Mais recente primeiro
    .limit(1)
    .maybeSingle();

  if (contract) {
    console.log(`✅ Contrato encontrado por customer_id: ${contract.id} (status: ${contract.status})`);
    return contract.id;
  }

  return null;
}

// AIDEV-NOTE: Função auxiliar para mapear payment method para tipo
function mapPaymentMethodToTipo(billingType: string | null | undefined): string {
  if (!billingType) return "BOLETO";
  
  const typeMap: Record<string, string> = {
    "PIX": "PIX",
    "BOLETO": "BOLETO",
    "BANK_SLIP": "BOLETO",
    "CREDIT_CARD": "CREDIT_CARD",
    "CASH": "CASH",
    "TRANSFER": "PIX"
  };
  
  return typeMap[billingType.toUpperCase()] || "BOLETO";
}

// AIDEV-NOTE: Função para buscar barcode do pagamento via API ASAAS
async function fetchPaymentBarcode(
  paymentId: string,
  apiKey: string,
  apiUrl: string
): Promise<string | null> {
  try {
    const baseUrl = apiUrl.endsWith('/v3') ? apiUrl.replace(/\/v3$/, '') : apiUrl.replace(/\/$/, '');
    const barcodeUrl = `${baseUrl}/v3/payments/${paymentId}/identificationField`;
    
    const response = await fetch(barcodeUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Não foi possível obter barcode para pagamento ${paymentId}`);
      return null;
    }
    
    const data = await response.json();
    return data.identificationField || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar barcode para pagamento ${paymentId}:`, error);
    return null;
  }
}

// AIDEV-NOTE: Função para buscar PIX key do pagamento via API ASAAS
async function fetchPaymentPixKey(
  paymentId: string,
  apiKey: string,
  apiUrl: string
): Promise<string | null> {
  try {
    const baseUrl = apiUrl.endsWith('/v3') ? apiUrl.replace(/\/v3$/, '') : apiUrl.replace(/\/$/, '');
    const pixUrl = `${baseUrl}/v3/payments/${paymentId}/pixQrCode`;
    
    const response = await fetch(pixUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Não foi possível obter PIX key para pagamento ${paymentId}`);
      return null;
    }
    
    const data = await response.json();
    // AIDEV-NOTE: PIX pode vir em diferentes campos (payload, encodedImage, qrCode, content)
    return data.payload || data.encodedImage || data.qrCode || data.content || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar PIX key para pagamento ${paymentId}:`, error);
    return null;
  }
}

// AIDEV-NOTE: Função para criar notificação detalhada de atualização de charge
// CRÍTICO: Sistema financeiro precisa de assertividade - mostrar exatamente o que mudou
async function createChargeUpdateNotification(
  tenantId: string,
  chargeId: string,
  asaasId: string,
  oldCharge: any,
  newChargeData: any,
  eventType: string,
  isNewCharge: boolean
): Promise<void> {
  try {
    // AIDEV-NOTE: Mapear nomes amigáveis dos campos para exibição
    const fieldNames: Record<string, string> = {
      status: 'Status',
      valor: 'Valor',
      data_vencimento: 'Data de Vencimento',
      data_pagamento: 'Data de Pagamento',
      payment_value: 'Valor Pago',
      net_value: 'Valor Líquido',
      tipo: 'Tipo de Pagamento',
      descricao: 'Descrição',
      customer_id: 'Cliente',
      contract_id: 'Contrato',
      barcode: 'Código de Barras',
      pix_key: 'Chave PIX',
      invoice_url: 'URL da Fatura',
      pdf_url: 'URL do PDF',
      transaction_receipt_url: 'URL do Comprovante',
      external_invoice_number: 'Número da Fatura Externa',
      interest_rate: 'Taxa de Juros',
      fine_rate: 'Taxa de Multa',
      discount_value: 'Valor de Desconto',
      external_customer_id: 'ID do Cliente Externo'
    };

    // AIDEV-NOTE: Identificar campos alterados
    const changes: Array<{ field: string; oldValue: any; newValue: any; fieldName: string }> = [];
    
    if (isNewCharge) {
      // AIDEV-NOTE: Para nova charge, todos os campos são "novos"
      for (const [key, value] of Object.entries(newChargeData)) {
        if (key !== 'tenant_id' && key !== 'updated_at' && value !== null && value !== undefined) {
          const fieldName = fieldNames[key] || key;
          changes.push({
            field: key,
            oldValue: null,
            newValue: value,
            fieldName
          });
        }
      }
    } else {
      // AIDEV-NOTE: Para charge existente, comparar valores
      for (const [key, newValue] of Object.entries(newChargeData)) {
        if (key === 'tenant_id' || key === 'updated_at') continue;
        
        const oldValue = oldCharge?.[key];
        
        // AIDEV-NOTE: Comparar valores considerando tipos diferentes
        const oldValueStr = oldValue !== null && oldValue !== undefined ? String(oldValue) : null;
        const newValueStr = newValue !== null && newValue !== undefined ? String(newValue) : null;
        
        if (oldValueStr !== newValueStr) {
          const fieldName = fieldNames[key] || key;
          changes.push({
            field: key,
            oldValue: oldValue,
            newValue: newValue,
            fieldName
          });
        }
      }
    }

    // AIDEV-NOTE: Formatar valores para exibição
    const formatValue = (value: any, field: string): string => {
      if (value === null || value === undefined) return 'N/A';
      
      // AIDEV-NOTE: Formatação específica por tipo de campo
      if (field === 'valor' || field === 'payment_value' || field === 'net_value' || field === 'discount_value') {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
      }
      
      if (field === 'interest_rate' || field === 'fine_rate') {
        return `${Number(value)}%`;
      }
      
      if (field === 'data_vencimento' || field === 'data_pagamento') {
        return new Date(value).toLocaleDateString('pt-BR');
      }
      
      if (field === 'status') {
        const statusMap: Record<string, string> = {
          'PENDING': 'Pendente',
          'RECEIVED': 'Recebido',
          'OVERDUE': 'Vencido',
          'CONFIRMED': 'Confirmado',
          'REFUNDED': 'Reembolsado'
        };
        return statusMap[value] || value;
      }
      
      if (field === 'tipo') {
        const tipoMap: Record<string, string> = {
          'PIX': 'PIX',
          'BOLETO': 'Boleto',
          'CREDIT_CARD': 'Cartão de Crédito',
          'CASH': 'Dinheiro'
        };
        return tipoMap[value] || value;
      }
      
      // AIDEV-NOTE: Truncar valores muito longos
      const strValue = String(value);
      if (strValue.length > 100) {
        return `${strValue.substring(0, 100)}...`;
      }
      
      return strValue;
    };

    // AIDEV-NOTE: Construir mensagem resumida em uma linha
    const action = isNewCharge ? 'CRIADA' : 'ATUALIZADA';
    const changeCount = changes.length;
    const statusEmoji = changeCount > 0 ? '🔄' : 'ℹ️';
    
    let summaryMessage = `${statusEmoji} Cobrança ${action} | ASAAS ID: ${asaasId}`;
    if (changeCount > 0) {
      const mainChanges = changes.slice(0, 3).map(c => c.fieldName).join(', ');
      summaryMessage += ` | Alterações: ${mainChanges}${changeCount > 3 ? ` +${changeCount - 3} mais` : ''}`;
    }

    // AIDEV-NOTE: Construir conteúdo detalhado
    let content = isNewCharge 
      ? `📝 Nova cobrança criada via webhook ASAAS.\n\n`
      : `🔄 Cobrança atualizada via webhook ASAAS.\n\n`;
    
    content += `📋 Informações da Cobrança:\n`;
    content += `• ID Interno: ${chargeId}\n`;
    content += `• ID ASAAS: ${asaasId}\n`;
    content += `• Tipo de Evento: ${eventType}\n`;
    content += `• Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n`;

    if (changes.length > 0) {
      content += `📊 Alterações Detectadas (${changes.length}):\n\n`;
      
      for (const change of changes) {
        const oldFormatted = formatValue(change.oldValue, change.field);
        const newFormatted = formatValue(change.newValue, change.field);
        
        content += `• ${change.fieldName}:\n`;
        if (isNewCharge) {
          content += `  → Novo valor: ${newFormatted}\n`;
        } else {
          content += `  → Valor anterior: ${oldFormatted}\n`;
          content += `  → Novo valor: ${newFormatted}\n`;
        }
        content += `\n`;
      }
    } else {
      content += `ℹ️ Nenhuma alteração detectada (dados já estavam atualizados).\n\n`;
    }

    // AIDEV-NOTE: Adicionar informações financeiras importantes
    const financialInfo: string[] = [];
    if (newChargeData.valor) {
      financialInfo.push(`Valor: ${formatValue(newChargeData.valor, 'valor')}`);
    }
    if (newChargeData.payment_value) {
      financialInfo.push(`Valor Pago: ${formatValue(newChargeData.payment_value, 'payment_value')}`);
    }
    if (newChargeData.net_value) {
      financialInfo.push(`Valor Líquido: ${formatValue(newChargeData.net_value, 'net_value')}`);
    }
    if (newChargeData.status) {
      financialInfo.push(`Status: ${formatValue(newChargeData.status, 'status')}`);
    }
    
    if (financialInfo.length > 0) {
      content += `💰 Resumo Financeiro:\n`;
      financialInfo.forEach(info => {
        content += `• ${info}\n`;
      });
      content += `\n`;
    }

    // AIDEV-NOTE: Metadata com informações estruturadas para análise
    const metadata = {
      notification_type: 'charge_webhook_update',
      tenant_id: tenantId,
      charge_id: chargeId,
      asaas_id: asaasId,
      event_type: eventType,
      is_new_charge: isNewCharge,
      changes: changes.map(c => ({
        field: c.field,
        field_name: c.fieldName,
        old_value: c.oldValue,
        new_value: c.newValue
      })),
      financial_summary: {
        valor: newChargeData.valor,
        payment_value: newChargeData.payment_value,
        net_value: newChargeData.net_value,
        status: newChargeData.status,
        tipo: newChargeData.tipo
      },
      timestamp: new Date().toISOString()
    };

    // AIDEV-NOTE: Inserir notificação na tabela
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        tenant_id: tenantId,
        type: isNewCharge ? 'charge_created' : 'charge_updated',
        recipient_email: 'system@revalya.com', // AIDEV-NOTE: Email do sistema
        subject: summaryMessage, // AIDEV-NOTE: Mensagem resumida em uma linha
        content: content, // AIDEV-NOTE: Conteúdo detalhado
        metadata: metadata,
        sent_at: null,
        error: null
      });

    if (notificationError) {
      console.error(`❌ Erro ao criar notificação de atualização de charge:`, notificationError);
    } else {
      console.log(`📧 Notificação de atualização de charge criada: ${chargeId} (${changes.length} alterações)`);
    }
  } catch (error) {
    console.error(`❌ Erro ao criar notificação de atualização de charge:`, error);
    // AIDEV-NOTE: Não falhar o processamento do webhook se a notificação falhar
  }
}

// AIDEV-NOTE: Handler para requisições GET - consultas à API ASAAS
async function handleGetRequest(req: Request, url: URL) {
  console.log("🔍 Processando requisição GET para consulta API ASAAS");
  
  // Extrair parâmetros da query string
  const customerId = url.searchParams.get('customer_id');
  const tenantId = url.searchParams.get('tenant_id');
  
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

  // AIDEV-NOTE: Se tenant_id não vier na query, tentar buscar por customer
  let finalTenantId = tenantId;
  if (!finalTenantId) {
    const { data: customerData } = await supabase
      .from("customers")
      .select("tenant_id")
      .eq("customer_asaas_id", customerId)
      .limit(1)
      .maybeSingle();

    if (customerData) {
      finalTenantId = customerData.tenant_id;
    }
  }

  if (!finalTenantId) {
    return new Response(JSON.stringify({
      error: "Tenant ID não encontrado. Forneça tenant_id na query ou certifique-se de que o customer existe."
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  console.log("📌 Tenant encontrado para customer_id:", finalTenantId);

  // 🔑 Buscar configuração ASAAS no banco
  const { data: integrationData, error: integrationError } = await supabase
    .from("tenant_integrations")
    .select("id, config")
    .eq("tenant_id", finalTenantId)
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

  // AIDEV-NOTE: Obter chave API descriptografada (com fallback para texto plano)
  const apiKey = await getDecryptedApiKey(finalTenantId);
  const apiUrl = integrationData.config?.api_url;

  if (!apiKey || !apiUrl) {
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
    apiKey,
    apiUrl
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
  // AIDEV-NOTE: Obter chave API descriptografada (com fallback para texto plano)
  const apiKey = await getDecryptedApiKey(tenantId);
  const apiUrl = integrationData.config?.api_url;

  if (!customerData && customerId && apiKey && apiUrl) {
    console.log(`🔍 Buscando dados do customer ${customerId} na API ASAAS...`);
    try {
      customerData = await fetchAsaasCustomer(
        customerId, 
        apiKey,
        apiUrl
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
  } else if (!apiKey || !apiUrl) {
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

  // AIDEV-NOTE: Garantir que payment.id existe
  const asaasId = payment.id;
  if (!asaasId) {
    console.error("❌ payment.id não encontrado no payload");
    return new Response(JSON.stringify({
      error: "payment.id é obrigatório"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // AIDEV-NOTE: Buscar ou criar customer
  const asaasCustomerId = customerId || (typeof payment.customer === 'string' ? payment.customer : payment.customer?.id) || null;
  const customerUuid = await findOrCreateCustomer(
    tenantId, 
    asaasCustomerId, 
    customerData,
    apiKey,
    apiUrl
  );

  if (!customerUuid) {
    console.error("❌ Não foi possível criar ou encontrar customer");
    return new Response(JSON.stringify({
      error: "Não foi possível processar customer"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // AIDEV-NOTE: Tentar vincular contrato
  // Prioridade: 1) externalReference, 2) customer_id
  let contractId = await findContractByExternalReference(tenantId, payment.externalReference);
  
  // AIDEV-NOTE: Se não encontrou por externalReference, buscar por customer_id
  if (!contractId && customerUuid) {
    contractId = await findContractByCustomerId(tenantId, customerUuid);
  }

  // AIDEV-NOTE: Mapear status e tipo
  const mappedStatus = mapExternalStatusToChargeStatus(mapPaymentStatusToExternal(payment.status || "pending"));
  const mappedTipo = mapPaymentMethodToTipo(payment.billingType);

  // AIDEV-NOTE: Garantir data_vencimento válida
  const dueDate = payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  // AIDEV-NOTE: Garantir valor válido
  const valor = payment.value || 0;

  // AIDEV-NOTE: Buscar barcode e pix_key via API quando necessário
  // AIDEV-NOTE: apiKey e apiUrl já foram declarados anteriormente na função (linha 890)
  let barcode: string | null = null;
  let pixKey: string | null = null;

  if (apiKey && apiUrl) {
    // AIDEV-NOTE: Buscar barcode para boletos
    if (payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED') {
      try {
        barcode = await fetchPaymentBarcode(
          asaasId,
          apiKey,
          apiUrl
        );
      } catch (error) {
        console.error(`❌ Erro ao buscar barcode:`, error);
      }
    }
    
    // AIDEV-NOTE: Buscar PIX key para PIX ou boletos
    if (payment.billingType === 'PIX' || payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED') {
      try {
        pixKey = await fetchPaymentPixKey(
          asaasId,
          apiKey,
          apiUrl
        );
      } catch (error) {
        console.error(`❌ Erro ao buscar PIX key:`, error);
      }
    }
  }

  // AIDEV-NOTE: Criar ou atualizar charge diretamente com todos os campos mapeados
  const chargeData: any = {
    tenant_id: tenantId,
    customer_id: customerUuid,
    contract_id: contractId,
    asaas_id: asaasId,
    valor: valor,
    status: mappedStatus,
    tipo: mappedTipo,
    data_vencimento: dueDate,
    descricao: payment.description || `Cobrança ASAAS ${asaasId}`,
    origem: 'ASAAS', // AIDEV-NOTE: Origem sempre ASAAS para webhooks
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // AIDEV-NOTE: Horário de Brasília (UTC-3)
  };

  // AIDEV-NOTE: Adicionar data_pagamento se disponível
  if (payment.paymentDate) {
    chargeData.data_pagamento = new Date(payment.paymentDate).toISOString().split('T')[0];
  }

  // AIDEV-NOTE: Mapear campos financeiros
  if (payment.netValue !== undefined && payment.netValue !== null) {
    chargeData.net_value = payment.netValue;
  }
  
  if (payment.interest?.value !== undefined && payment.interest.value !== null) {
    chargeData.interest_rate = payment.interest.value;
  }
  
  if (payment.fine?.value !== undefined && payment.fine.value !== null) {
    chargeData.fine_rate = payment.fine.value;
  }
  
  if (payment.discount?.value !== undefined && payment.discount.value !== null) {
    chargeData.discount_value = payment.discount.value;
  }

  // AIDEV-NOTE: Mapear payment_value (valor pago)
  if (payment.paymentDate && payment.netValue !== undefined) {
    chargeData.payment_value = payment.netValue;
  } else if (payment.value !== undefined) {
    chargeData.payment_value = payment.value;
  }

  // AIDEV-NOTE: Mapear campos de URLs e documentos
  if (payment.invoiceUrl) {
    chargeData.invoice_url = payment.invoiceUrl;
  }
  
  if (payment.bankSlipUrl) {
    chargeData.pdf_url = payment.bankSlipUrl;
  }
  
  if (payment.transactionReceiptUrl) {
    chargeData.transaction_receipt_url = payment.transactionReceiptUrl;
  }
  
  if (payment.invoiceNumber) {
    chargeData.external_invoice_number = payment.invoiceNumber;
  }

  // AIDEV-NOTE: Mapear external_customer_id
  if (asaasCustomerId) {
    chargeData.external_customer_id = asaasCustomerId;
  }

  // AIDEV-NOTE: Adicionar barcode e pix_key se obtidos via API
  if (barcode) {
    chargeData.barcode = barcode;
  }
  
  if (pixKey) {
    chargeData.pix_key = pixKey;
  }

  // AIDEV-NOTE: Verificar se o pagamento foi deletado no ASAAS
  // O campo deleted pode vir no payload ou no payment object
  const isDeleted = payment.deleted === true || payload.payment?.deleted === true;
  
  // AIDEV-NOTE: Verificar se o evento é de deletação
  const isDeleteEvent = eventType === 'PAYMENT_DELETED' || 
                        eventType === 'payment.deleted' || 
                        eventType === 'DELETED' ||
                        eventType?.toLowerCase().includes('delete');

  if (isDeleted || isDeleteEvent) {
    console.log(`🗑️ Evento de deletação detectado para payment ${asaasId} - deletando charge do banco`);
    
    // AIDEV-NOTE: Buscar charge existente
    const { data: existingCharge } = await supabase
      .from("charges")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("asaas_id", asaasId)
      .maybeSingle();

    if (existingCharge) {
      // AIDEV-NOTE: Verificar se há finance_entries relacionados antes de deletar
      const { data: relatedEntries, error: entriesError } = await supabase
        .from("finance_entries")
        .select("id")
        .eq("charge_id", existingCharge.id)
        .eq("tenant_id", tenantId);

      if (entriesError) {
        console.error("❌ Erro ao verificar finance_entries:", entriesError);
        return new Response(JSON.stringify({
          error: "Erro ao verificar dependências",
          details: entriesError.message
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      // AIDEV-NOTE: Se houver finance_entries relacionados, deletá-los primeiro
      if (relatedEntries && relatedEntries.length > 0) {
        console.log(`⚠️ Encontrados ${relatedEntries.length} finance_entries relacionados. Deletando primeiro...`);
        
        const { error: deleteEntriesError } = await supabase
          .from("finance_entries")
          .delete()
          .eq("charge_id", existingCharge.id)
          .eq("tenant_id", tenantId);

        if (deleteEntriesError) {
          console.error("❌ Erro ao deletar finance_entries:", deleteEntriesError);
          return new Response(JSON.stringify({
            error: "Erro ao deletar finance_entries relacionados",
            details: deleteEntriesError.message
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }

        console.log(`✅ ${relatedEntries.length} finance_entries deletados com sucesso`);
      }

      // AIDEV-NOTE: Agora deletar a charge (sem dependências)
      const { error: deleteError } = await supabase
        .from("charges")
        .delete()
        .eq("id", existingCharge.id)
        .eq("tenant_id", tenantId);

      if (deleteError) {
        console.error("❌ Erro ao deletar charge:", deleteError);
        return new Response(JSON.stringify({
          error: "Erro ao deletar charge",
          details: deleteError.message
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      console.log(`✅ Charge ${existingCharge.id} deletada com sucesso (webhook de deletação)`);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Charge deletada com sucesso",
        eventType,
        eventId,
        deleted: true,
        finance_entries_deleted: relatedEntries?.length || 0
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      console.log(`ℹ️ Charge não encontrada no banco para asaas_id ${asaasId} - já foi deletada ou não existe`);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Charge não encontrada (já deletada ou não existe)",
        eventType,
        eventId,
        deleted: false
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }

  // AIDEV-NOTE: Buscar charge existente ANTES do upsert para comparar mudanças
  const { data: existingCharge } = await supabase
    .from("charges")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("asaas_id", asaasId)
    .maybeSingle();

  const isNewCharge = !existingCharge;

  // AIDEV-NOTE: Upsert charge usando asaas_id como chave única por tenant
  const { data: charge, error: chargeError } = await supabase
    .from("charges")
    .upsert(chargeData, {
      onConflict: "tenant_id,asaas_id",
      ignoreDuplicates: false
    })
    .select("*")
    .single();

  if (chargeError) {
    console.error("❌ Erro ao criar/atualizar charge:", chargeError);
    return new Response(JSON.stringify({
      error: "Erro ao processar charge",
      details: chargeError.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  console.log(`✅ Charge ${charge?.id ? (isNewCharge ? 'criada' : 'atualizada') : 'processada'} com sucesso: ${charge?.id || 'N/A'}`);

  // AIDEV-NOTE: Criar notificação detalhada da atualização/criação
  // CRÍTICO: Sistema financeiro precisa de assertividade - registrar todas as mudanças
  if (charge?.id) {
    await createChargeUpdateNotification(
      tenantId,
      charge.id,
      asaasId,
      existingCharge || null,
      chargeData,
      eventType,
      isNewCharge
    );
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Webhook processado com sucesso",
    eventType,
    eventId,
    charge_id: charge?.id,
    is_new: isNewCharge
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