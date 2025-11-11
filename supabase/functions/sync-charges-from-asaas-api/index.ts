// AIDEV-NOTE: Edge Function para sincronizar charges do ASAAS via API
// Esta função busca dados atualizados da API ASAAS e atualiza charges

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// AIDEV-NOTE: Mapear status ASAAS para status charges (MAIÚSCULAS)
function mapAsaasStatusToChargeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "PENDING": "PENDING",
    "RECEIVED": "RECEIVED",
    "CONFIRMED": "CONFIRMED",
    "OVERDUE": "OVERDUE",
    "REFUNDED": "REFUNDED",
    "RECEIVED_IN_CASH": "RECEIVED",
    "AWAITING_RISK_ANALYSIS": "PENDING",
    "CREATED": "PENDING",
    "DELETED": "PENDING",
    "CHECKOUT_VIEWED": "PENDING",
    "ANTICIPATED": "RECEIVED"
  };
  return statusMap[status] || "PENDING";
}

// AIDEV-NOTE: Buscar dados do cliente na API ASAAS
async function fetchAsaasCustomer(
  customerId: string,
  apiKey: string,
  apiUrl: string
): Promise<any | null> {
  try {
    const baseUrl = apiUrl.endsWith('/v3') ? apiUrl.replace(/\/v3$/, '') : apiUrl.replace(/\/$/, '');
    const customerUrl = `${baseUrl}/v3/customers/${customerId}`;
    
    const response = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Não foi possível obter dados do customer ${customerId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Erro ao buscar customer ${customerId}:`, error);
    return null;
  }
}

// AIDEV-NOTE: Buscar ou criar customer com dados completos do ASAAS
async function findOrCreateCustomer(
  tenantId: string,
  asaasCustomerId: string | null,
  customerData: any
): Promise<string | null> {
  if (!asaasCustomerId && !customerData) {
    console.warn("⚠️ Não é possível criar customer sem asaasCustomerId ou customerData");
    return null;
  }

  // AIDEV-NOTE: Primeiro tentar buscar por customer_asaas_id
  if (asaasCustomerId) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, company, cpf_cnpj, email, phone")
      .eq("tenant_id", tenantId)
      .eq("customer_asaas_id", asaasCustomerId)
      .maybeSingle();

    if (existingCustomer) {
      // AIDEV-NOTE: Verificar se precisa atualizar dados incompletos
      const needsUpdate = 
        !existingCustomer.name || 
        existingCustomer.name === 'Cliente não identificado' ||
        !existingCustomer.company ||
        !existingCustomer.cpf_cnpj;
      
      if (needsUpdate && customerData) {
        console.log(`🔄 Atualizando dados incompletos do customer ${existingCustomer.id}`);
        const updateData: any = {};
        
        if (!existingCustomer.name || existingCustomer.name === 'Cliente não identificado') {
          updateData.name = customerData.name || existingCustomer.name;
        }
        if (!existingCustomer.company && customerData.company) {
          updateData.company = customerData.company;
        }
        if (!existingCustomer.cpf_cnpj && customerData.cpfCnpj) {
          updateData.cpf_cnpj = customerData.cpfCnpj;
        }
        if (!existingCustomer.email && customerData.email) {
          updateData.email = customerData.email;
        }
        if (!existingCustomer.phone && (customerData.phone || customerData.mobilePhone)) {
          updateData.phone = customerData.phone || customerData.mobilePhone;
        }
        
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from("customers")
            .update(updateData)
            .eq("id", existingCustomer.id);
          console.log(`✅ Customer ${existingCustomer.id} atualizado com dados completos`);
        }
      }
      
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
  const { data: newCustomer, error: createError } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      customer_asaas_id: asaasCustomerId,
      name: customerData?.name || "Cliente não identificado",
      email: customerData?.email || null,
      phone: customerData?.phone || customerData?.mobilePhone || null,
      cpf_cnpj: customerData?.cpfCnpj || null,
      company: customerData?.company || null,
    })
    .select("id")
    .single();

  if (createError || !newCustomer) {
    console.error("❌ Erro ao criar customer:", createError);
    return null;
  }

  console.log(`✅ Customer criado: ${newCustomer.id}`);
  return newCustomer.id;
}

// AIDEV-NOTE: Buscar dados do pagamento na API ASAAS
async function fetchPaymentFromAsaas(
  paymentId: string,
  apiKey: string,
  apiUrl: string
): Promise<{ data: any | null; notFound: boolean }> {
  try {
    const baseUrl = apiUrl.endsWith('/v3') ? apiUrl.replace(/\/v3$/, '') : apiUrl.replace(/\/$/, '');
    const paymentUrl = `${baseUrl}/v3/payments/${paymentId}`;
    
    const response = await fetch(paymentUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // AIDEV-NOTE: 404 significa que o pagamento foi deletado ou não existe mais no ASAAS
      if (response.status === 404) {
        console.warn(`⚠️ Pagamento ${paymentId} não encontrado no ASAAS (404) - pode ter sido deletado`);
        return { data: null, notFound: true };
      }
      console.warn(`⚠️ Erro ao buscar pagamento ${paymentId}: ${response.status}`);
      return { data: null, notFound: false };
    }
    
    const data = await response.json();
    return { data, notFound: false };
  } catch (error) {
    console.error(`❌ Erro ao buscar pagamento ${paymentId}:`, error);
    return { data: null, notFound: false };
  }
}

// AIDEV-NOTE: Buscar barcode do pagamento
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
      return null;
    }
    
    const data = await response.json();
    return data.identificationField || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar barcode:`, error);
    return null;
  }
}

// AIDEV-NOTE: Buscar PIX key do pagamento
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
      return null;
    }
    
    const data = await response.json();
    return data.payload || data.encodedImage || data.qrCode || data.content || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar PIX key:`, error);
    return null;
  }
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

// AIDEV-NOTE: Verificar se há divergências entre charge no banco e dados da API ASAAS
function hasDivergences(charge: any, paymentData: any): boolean {
  if (!paymentData) return false;
  
  const mappedStatus = mapAsaasStatusToChargeStatus(paymentData.status || 'PENDING');
  const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate).toISOString().split('T')[0] : null;
  
  // AIDEV-NOTE: Verificar divergências de status
  if (charge.status !== mappedStatus) {
    return true;
  }
  
  // AIDEV-NOTE: Verificar divergências de data de pagamento
  if (charge.data_pagamento?.toString() !== paymentDate) {
    return true;
  }
  
  // AIDEV-NOTE: Verificar se faltam dados importantes
  const missingData = 
    (!charge.external_customer_id && paymentData.customer) ||
    (!charge.barcode && (paymentData.billingType === 'BOLETO' || paymentData.billingType === 'UNDEFINED')) ||
    (!charge.pix_key && paymentData.billingType === 'PIX') ||
    (!charge.external_invoice_number && paymentData.invoiceNumber) ||
    (!charge.invoice_url && paymentData.invoiceUrl) ||
    (!charge.pdf_url && paymentData.bankSlipUrl) ||
    (!charge.net_value && paymentData.netValue !== undefined && paymentData.netValue !== null);
  
  return missingData;
}

// AIDEV-NOTE: Sincronizar charges para um tenant com paginação
async function syncChargesForTenant(tenantId: string): Promise<any> {
  console.log(`🔄 Iniciando sincronização completa para tenant ${tenantId}`);
  
  // AIDEV-NOTE: Buscar configuração ASAAS
  const { data: integration, error: integrationError } = await supabase
    .from('tenant_integrations')
    .select('id, config')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'asaas')
    .eq('is_active', true)
    .maybeSingle();

  if (integrationError || !integration) {
    console.error(`❌ Integração ASAAS não encontrada para tenant ${tenantId}`);
    return {
      success: false,
      error: 'Integração ASAAS não encontrada',
      tenant_id: tenantId
    };
  }

  const { api_key, api_url } = integration.config;
  if (!api_key || !api_url) {
    return {
      success: false,
      error: 'Configuração ASAAS incompleta',
      tenant_id: tenantId
    };
  }

  // AIDEV-NOTE: Contar total de charges do ASAAS para este tenant
  const { count: totalCharges, error: countError } = await supabase
    .from('charges')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('asaas_id', 'is', null)
    .eq('origem', 'ASAAS');

  if (countError) {
    console.error(`❌ Erro ao contar charges:`, countError);
    return {
      success: false,
      error: 'Erro ao contar charges',
      tenant_id: tenantId
    };
  }

  console.log(`📊 Total de charges do ASAAS: ${totalCharges || 0}`);

  // AIDEV-NOTE: Processar em lotes com paginação
  // AIDEV-NOTE: Limitar a 100 charges por execução para evitar timeout
  // As charges restantes serão processadas nas próximas execuções (a cada 1 hora)
  const BATCH_SIZE = 50; // AIDEV-NOTE: Processar 50 por vez para não sobrecarregar
  const MAX_CHARGES_PER_RUN = 100; // AIDEV-NOTE: Máximo de charges por execução para evitar timeout
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalChecked = 0;

  // AIDEV-NOTE: Processar charges em lotes (limitado para evitar timeout)
  while (totalChecked < MAX_CHARGES_PER_RUN) {
    // AIDEV-NOTE: Buscar lote de charges
    // AIDEV-NOTE: Excluir charges que já foram marcadas como deletadas no ASAAS (metadata.asaas_deleted = true)
    let chargesQuery = supabase
      .from('charges')
      .select('id, asaas_id, customer_id, contract_id, status, data_pagamento, updated_at, external_customer_id, barcode, pix_key, external_invoice_number, invoice_url, pdf_url, net_value, metadata')
      .eq('tenant_id', tenantId)
      .not('asaas_id', 'is', null)
      .eq('origem', 'ASAAS');
    
    // AIDEV-NOTE: Excluir charges que já foram marcadas como deletadas no ASAAS
    // Usando uma query que filtra por metadata não contendo asaas_deleted: true
    // Como o Supabase não suporta filtro direto em JSON, vamos buscar todas e filtrar depois
    const { data: charges, error: chargesError } = await chargesQuery
      .order('updated_at', { ascending: true }) // AIDEV-NOTE: Processar as mais antigas primeiro
      .range(offset, offset + BATCH_SIZE - 1);

    if (chargesError) {
      console.error(`❌ Erro ao buscar charges:`, chargesError);
      totalErrors++;
      break;
    }

    if (!charges || charges.length === 0) {
      // AIDEV-NOTE: Não há mais charges para processar
      break;
    }

    // AIDEV-NOTE: Filtrar charges que já foram marcadas como deletadas no ASAAS
    const chargesToProcess = charges.filter((charge: any) => {
      const metadata = charge.metadata || {};
      return !metadata.asaas_deleted;
    });

    if (chargesToProcess.length === 0) {
      // AIDEV-NOTE: Todas as charges deste lote já foram marcadas como deletadas
      offset += BATCH_SIZE;
      continue;
    }

    console.log(`📦 Processando lote ${Math.floor(offset / BATCH_SIZE) + 1}: ${chargesToProcess.length} charges válidas de ${charges.length} (${offset + 1} a ${offset + charges.length} de ${totalCharges || 0})`);

    // AIDEV-NOTE: Processar cada charge do lote
    for (const charge of chargesToProcess) {
      if (!charge.asaas_id) {
        totalSkipped++;
        totalChecked++;
        continue;
      }

      try {
        totalChecked++;
        
        // AIDEV-NOTE: Buscar dados atualizados da API ASAAS
        const { data: paymentData, notFound } = await fetchPaymentFromAsaas(charge.asaas_id, api_key, api_url);
        
        if (!paymentData) {
          // AIDEV-NOTE: Se o pagamento não foi encontrado (404), marcar como não sincronizável
          if (notFound) {
            console.warn(`⚠️ Pagamento ${charge.asaas_id} não encontrado no ASAAS - marcando como não sincronizável`);
            // AIDEV-NOTE: Atualizar updated_at para não tentar sincronizar novamente nas próximas execuções
            // Mas manter a charge no banco para histórico
            await supabase
              .from('charges')
              .update({ 
                updated_at: new Date().toISOString(),
                // AIDEV-NOTE: Podemos adicionar um campo metadata para indicar que foi deletado no ASAAS
                metadata: { ...(charge.metadata || {}), asaas_deleted: true, asaas_not_found_at: new Date().toISOString() }
              })
              .eq('id', charge.id)
              .eq('tenant_id', tenantId);
            
            totalSkipped++;
            continue;
          }
          
          // AIDEV-NOTE: Outro tipo de erro (não 404)
          console.warn(`⚠️ Não foi possível obter dados do pagamento ${charge.asaas_id} - erro na API`);
          totalSkipped++;
          continue;
        }

        // AIDEV-NOTE: Verificar se há divergências
        const hasDivergence = hasDivergences(charge, paymentData);
        
        if (!hasDivergence) {
          // AIDEV-NOTE: Charge está sincronizada, mas ainda verificar customer
          // Verificar se precisa atualizar/criar customer mesmo sem divergências na charge
          const asaasCustomerId = paymentData.customer || charge.external_customer_id;
          
          if (!charge.customer_id && asaasCustomerId) {
            // AIDEV-NOTE: Charge não tem customer, buscar/criar
            let customerData: any = null;
            
            if (asaasCustomerId) {
              customerData = await fetchAsaasCustomer(asaasCustomerId, api_key, api_url);
            }
            
            if (customerData || asaasCustomerId) {
              const foundOrCreatedCustomerId = await findOrCreateCustomer(
                tenantId,
                asaasCustomerId,
                customerData
              );
              
              if (foundOrCreatedCustomerId) {
                // AIDEV-NOTE: Atualizar charge apenas com customer_id
                await supabase
                  .from('charges')
                  .update({ 
                    customer_id: foundOrCreatedCustomerId,
                    external_customer_id: asaasCustomerId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', charge.id)
                  .eq('tenant_id', tenantId);
                
                totalUpdated++;
                console.log(`🔗 Customer ${foundOrCreatedCustomerId} vinculado à charge ${charge.id}`);
              }
            }
          }
          
          totalSkipped++;
          continue;
        }

        // AIDEV-NOTE: Há divergências, processar atualização completa
        console.log(`🔄 Divergência detectada na charge ${charge.id} - sincronizando...`);

        // AIDEV-NOTE: Verificar e atualizar/criar customer se necessário
        let customerId = charge.customer_id;
        const asaasCustomerId = paymentData.customer || charge.external_customer_id;
        
        // AIDEV-NOTE: Se não tem customer_id ou tem customer mas precisa atualizar dados
        if (!customerId || asaasCustomerId) {
          // AIDEV-NOTE: Buscar dados do customer na API ASAAS se necessário
          let customerData: any = null;
          
          if (asaasCustomerId) {
            customerData = await fetchAsaasCustomer(asaasCustomerId, api_key, api_url);
            
            if (customerData) {
              console.log(`✅ Dados do customer obtidos: ${customerData.name || 'N/A'}`);
            } else {
              console.warn(`⚠️ Não foi possível obter dados do customer ${asaasCustomerId}`);
            }
          }
          
          // AIDEV-NOTE: Buscar ou criar customer com dados completos
          if (customerData || asaasCustomerId) {
            const foundOrCreatedCustomerId = await findOrCreateCustomer(
              tenantId,
              asaasCustomerId,
              customerData
            );
            
            if (foundOrCreatedCustomerId && !customerId) {
              customerId = foundOrCreatedCustomerId;
              console.log(`🔗 Customer ${customerId} vinculado à charge ${charge.id}`);
            }
          }
        }

        // AIDEV-NOTE: Mapear status e data de pagamento
        const mappedStatus = mapAsaasStatusToChargeStatus(paymentData.status || 'PENDING');
        const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate).toISOString().split('T')[0] : null;

        // AIDEV-NOTE: Buscar barcode e pix_key se necessário
        let barcode: string | null = null;
        let pixKey: string | null = null;

        if (paymentData.billingType === 'BOLETO' || paymentData.billingType === 'UNDEFINED') {
          barcode = await fetchPaymentBarcode(charge.asaas_id, api_key, api_url);
        }

        if (paymentData.billingType === 'PIX' || paymentData.billingType === 'BOLETO' || paymentData.billingType === 'UNDEFINED') {
          pixKey = await fetchPaymentPixKey(charge.asaas_id, api_key, api_url);
        }

        // AIDEV-NOTE: Verificar se precisa vincular contrato
        // Se a charge não tem contract_id mas tem customer_id, buscar contrato
        let contractIdToLink: string | null = null;
        if (!charge.contract_id && customerId) {
          contractIdToLink = await findContractByCustomerId(tenantId, customerId);
          if (contractIdToLink) {
            console.log(`🔗 Vinculando contrato ${contractIdToLink} à charge ${charge.id} via customer_id`);
          }
        }

        // AIDEV-NOTE: Preparar dados para atualização
        const updateData: any = {
          status: mappedStatus,
          updated_at: new Date().toISOString()
        };
        
        // AIDEV-NOTE: Adicionar customer_id se encontrado/criado
        if (customerId && !charge.customer_id) {
          updateData.customer_id = customerId;
        }
        
        // AIDEV-NOTE: Adicionar external_customer_id se disponível
        if (asaasCustomerId) {
          updateData.external_customer_id = asaasCustomerId;
        }
        
        // AIDEV-NOTE: Adicionar contract_id se encontrado
        if (contractIdToLink) {
          updateData.contract_id = contractIdToLink;
        }

        if (paymentDate) {
          updateData.data_pagamento = paymentDate;
        }

        if (paymentData.netValue !== undefined && paymentData.netValue !== null) {
          updateData.net_value = paymentData.netValue;
          updateData.payment_value = paymentData.netValue;
        }

        if (paymentData.interest?.value !== undefined && paymentData.interest.value !== null) {
          updateData.interest_rate = paymentData.interest.value;
        }

        if (paymentData.fine?.value !== undefined && paymentData.fine.value !== null) {
          updateData.fine_rate = paymentData.fine.value;
        }

        if (paymentData.discount?.value !== undefined && paymentData.discount.value !== null) {
          updateData.discount_value = paymentData.discount.value;
        }

        if (paymentData.invoiceUrl) {
          updateData.invoice_url = paymentData.invoiceUrl;
        }

        if (paymentData.bankSlipUrl) {
          updateData.pdf_url = paymentData.bankSlipUrl;
        }

        if (paymentData.transactionReceiptUrl) {
          updateData.transaction_receipt_url = paymentData.transactionReceiptUrl;
        }

        if (paymentData.invoiceNumber) {
          updateData.external_invoice_number = paymentData.invoiceNumber;
        }

        if (barcode) {
          updateData.barcode = barcode;
        }

        if (pixKey) {
          updateData.pix_key = pixKey;
        }

        // AIDEV-NOTE: Atualizar charge
        const { error: updateError } = await supabase
          .from('charges')
          .update(updateData)
          .eq('id', charge.id)
          .eq('tenant_id', tenantId);

        if (updateError) {
          console.error(`❌ Erro ao atualizar charge ${charge.id}:`, updateError);
          totalErrors++;
        } else {
          totalUpdated++;
        }

        totalProcessed++;

      } catch (error) {
        console.error(`❌ Erro ao processar charge ${charge.id}:`, error);
        totalErrors++;
        totalProcessed++;
      }
    }

    // AIDEV-NOTE: Atualizar offset para próximo lote
    offset += BATCH_SIZE;
    
    // AIDEV-NOTE: Se processou menos que o batch size, chegou ao fim
    if (charges.length < BATCH_SIZE) {
      break;
    }
    
    // AIDEV-NOTE: Verificar se já processou o máximo permitido
    if (totalChecked >= MAX_CHARGES_PER_RUN) {
      console.log(`⚠️ Limite de ${MAX_CHARGES_PER_RUN} charges por execução atingido. Restantes serão processadas na próxima execução.`);
      break;
    }
    
    // AIDEV-NOTE: Pequena pausa entre lotes para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const remainingCharges = (totalCharges || 0) - totalChecked;
  
  console.log(`✅ Sincronização concluída para tenant ${tenantId}`);
  console.log(`📊 Resumo: ${totalChecked} verificadas, ${totalUpdated} atualizadas, ${totalSkipped} sem divergências, ${totalErrors} erros`);
  if (remainingCharges > 0) {
    console.log(`⏭️  ${remainingCharges} charges restantes serão processadas nas próximas execuções`);
  }

  return {
    success: true,
    tenant_id: tenantId,
    total_charges: totalCharges || 0,
    total_checked: totalChecked,
    processed: totalProcessed,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: totalErrors,
    remaining_charges: remainingCharges,
    next_run_will_process: remainingCharges > 0
  };
}

// AIDEV-NOTE: Handler principal
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { sync_all_tenants, tenant_id } = await req.json().catch(() => ({}));

    if (sync_all_tenants) {
      // AIDEV-NOTE: Sincronizar apenas tenants com integração ASAAS ativa
      // AIDEV-NOTE: CRÍTICO: Apenas processar tenants que têm integration_type='asaas' E is_active=true
      const { data: integrations, error: integrationsError } = await supabase
        .from('tenant_integrations')
        .select('tenant_id')
        .eq('integration_type', 'asaas')
        .eq('is_active', true);

      if (integrationsError) {
        console.error('❌ Erro ao buscar integrações ASAAS:', integrationsError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao buscar integrações ASAAS',
            message: integrationsError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!integrations || integrations.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Nenhum tenant com integração ASAAS ativa encontrado',
            total_tenants: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // AIDEV-NOTE: Extrair tenant_ids únicos das integrações ativas
      const tenantIdsSet = new Set<string>();
      for (const integration of integrations) {
        if (integration.tenant_id) {
          tenantIdsSet.add(String(integration.tenant_id));
        }
      }
      const tenantIds = Array.from(tenantIdsSet);
      
      console.log(`📊 Encontrados ${tenantIds.length} tenants com integração ASAAS ativa`);

      const results: any[] = [];
      for (const tenantId of tenantIds) {
        const result = await syncChargesForTenant(tenantId);
        results.push(result);
      }

      return new Response(
        JSON.stringify({
          success: true,
          total_tenants: tenantIds.length,
          results
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (tenant_id) {
      // AIDEV-NOTE: Sincronizar tenant específico
      const result = await syncChargesForTenant(tenant_id);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'tenant_id ou sync_all_tenants é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', message: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}, { verifyJWT: false });

