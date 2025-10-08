// AIDEV-NOTE: Edge Function para envio de mensagens em massa via WhatsApp (Evolution)
// Versão 6.0 - Config multi-tenant via public.tenant_integrations (JSON config), environment-aware e overrides por header
// Data: 2025-10-08
import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
/** =========================
 *  ENV Helpers
 *  ========================= */ function requireEnv(name, value) {
  if (!value?.trim()) throw new Error(`Variável de ambiente ${name} é obrigatória`);
  return value.trim();
}
// Lê a primeira variável disponível de uma lista (aceita VITE_* e nomes legados)
function getFirstEnv(names, { required = true } = {}) {
  for (const n of names){
    const v = Deno.env.get(n);
    if (v && v.trim()) return v.trim();
  }
  if (required) throw new Error(`Variável(veis) de ambiente obrigatória(s) ausente(s): ${names.join(" ou ")}`);
  return "";
}
/** =========================
 *  Config & Constantes
 *  ========================= */ const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-timestamp, x-tenant-id, x-wa-instance, x-wa-api-base-url, x-wa-api-key, x-country-code, x-dry-run, x-throttle-ms, x-batch-size, x-concurrency, x-env",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const SUPABASE_URL = requireEnv("SUPABASE_URL", Deno.env.get("SUPABASE_URL"));
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
// Fallback global (só se não houver registro em tenant_integrations)
const FALLBACK_EVOLUTION_API_BASE_URL = getFirstEnv([
  "VITE_EVOLUTION_API_URL",
  "EVOLUTION_API_BASE_URL"
], {
  required: false
})?.replace?.(/\/+$/, "") || "";
const FALLBACK_EVOLUTION_API_KEY = getFirstEnv([
  "VITE_EVOLUTION_API_KEY",
  "EVOLUTION_API_KEY"
], {
  required: false
}) || "";
// Fallback opcional de instância via env (raramente necessário)
const EVOLUTION_INSTANCE_ENV = (Deno.env.get("EVOLUTION_INSTANCE") || "").trim();
const DEFAULT_COUNTRY_CODE = "55"; // Brasil
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_INTER_BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;
/** =========================
 *  Auditoria / Logs
 *  ========================= */ class Audit {
  static opStart(meta) {
    console.log(`[AUDIT] start`, JSON.stringify(meta));
  }
  static opDone(meta) {
    console.log(`[AUDIT] done`, JSON.stringify(meta));
  }
  static error(err, ctx) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[AUDIT] error`, JSON.stringify({
      error: errorMsg,
      stack,
      ...ctx,
      ts: new Date().toISOString()
    }));
  }
  static sec(msg, ctx) {
    console.log(`[AUDIT] sec`, JSON.stringify({
      message: msg,
      ...ctx
    }));
  }
}
async function validateRequest(req, opts) {
  try {
    if (!opts.methods.includes(req.method)) {
      return {
        ok: false,
        error: `Método ${req.method} não permitido`,
        status: 405
      };
    }
    if (opts.maxBodyBytes && req.headers.get("content-length")) {
      const len = parseInt(req.headers.get("content-length") || "0");
      if (len > opts.maxBodyBytes) return {
        ok: false,
        error: "Body muito grande",
        status: 413
      };
    }
    if (opts.requireAuth) {
      const auth = req.headers.get("authorization");
      if (!auth?.startsWith("Bearer ")) {
        return {
          ok: false,
          error: "Token de autorização obrigatório",
          status: 401
        };
      }
    }
    let tenantId;
    if (opts.requireTenant) {
      tenantId = (req.headers.get("x-tenant-id") || "").trim();
      if (!tenantId) return {
        ok: false,
        error: "Header x-tenant-id obrigatório",
        status: 400
      };
    }
    return {
      ok: true,
      tenantId
    };
  } catch (error) {
    Audit.error(error, {
      where: "validateRequest"
    });
    return {
      ok: false,
      error: "Erro na validação da requisição",
      status: 500
    };
  }
}
/** =========================
 *  Telefones / Normalização
 *  ========================= */ // Evolution aceita número com DDI (E.164 sem '+'), ex.: 5565999999999
function normalizeToE164(numberRaw, countryCode = DEFAULT_COUNTRY_CODE) {
  const digits = numberRaw.replace(/\D/g, "");
  if (digits.startsWith(countryCode)) return digits;
  return `${countryCode}${digits}`;
}
function isValidArrayOfStrings(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every((s)=>typeof s === "string" && !!s.trim());
}
/** =========================
 *  Evolution API Client (por tenant)
 *  ========================= */ async function fetchJsonWithTimeout(input, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal
    });
    const data = await res.json().catch(()=>({}));
    return {
      res,
      data
    };
  } finally{
    clearTimeout(id);
  }
}
async function getEvolutionConfig(supabase, tenantId, envOverride, headerOverrides) {
  const desiredEnv = (envOverride || "production").toLowerCase();
  if (![
    "production",
    "sandbox"
  ].includes(desiredEnv)) {
    throw new Error("x-env inválido. Use 'production' ou 'sandbox'.");
  }
  // Busca a integração ativa do tipo 'evolution' para o ambiente desejado
  const { data, error } = await supabase.from("tenant_integrations").select("environment, is_active, config").eq("tenant_id", tenantId).eq("integration_type", "whatsapp").eq("is_active", true).eq("environment", desiredEnv).maybeSingle();
  if (error) {
    Audit.error(error, {
      where: "getEvolutionConfig",
      tenantId,
      desiredEnv
    });
    throw new Error("Erro ao buscar integração Evolution");
  }
  let cfg = data?.config || {};
  // Tenta ler keys usuais (com sinônimos)
  const pick = (obj, keys, def = "")=>keys.reduce((acc, k)=>acc || obj?.[k] || obj?.[k.toLowerCase()] || obj?.[k.toUpperCase()], "") || def;
  const dbBaseUrl = String(pick(cfg, [
    "api_url",
    "base_url",
    "evolution_url",
    "url"
  ], "")).replace(/\/+$/, "");
  const dbApiKey = String(pick(cfg, [
    "api_key",
    "apikey",
    "token"
  ], ""));
  const dbInstance = String(pick(cfg, [
    "instance_name",
    "instance",
    "evolution_instance"
  ], ""));
  // Overrides por header (se vierem)
  const apiBaseUrl = (headerOverrides?.baseUrl?.trim() || dbBaseUrl || FALLBACK_EVOLUTION_API_BASE_URL).replace(/\/+$/, "");
  const apiKey = headerOverrides?.apiKey?.trim() || dbApiKey || FALLBACK_EVOLUTION_API_KEY;
  const instanceName = headerOverrides?.instanceName?.trim() || dbInstance || EVOLUTION_INSTANCE_ENV || "";
  if (!apiBaseUrl) throw new Error("API URL não encontrada para Evolution (verifique tenant_integrations.config.api_url ou header x-wa-api-base-url).");
  if (!apiKey) throw new Error("API Key não encontrada para Evolution (verifique tenant_integrations.config.api_key ou header x-wa-api-key).");
  if (!instanceName) throw new Error("Instance Name não encontrado (verifique tenant_integrations.config.instance_name ou header x-wa-instance).");
  return {
    apiBaseUrl,
    apiKey,
    instanceName,
    environment: desiredEnv
  };
}
class EvolutionApi {
  static async sendText(opts) {
    const url = `${opts.baseUrl}/message/sendText/${opts.instance}`;
    let lastError = "";
    for(let attempt = 1; attempt <= MAX_RETRIES; attempt++){
      try {
        Audit.opStart({
          where: "sendText",
          url,
          attempt,
          number: opts.number,
          requestId: opts.requestId
        });
        const { res, data } = await fetchJsonWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "apikey": opts.apiKey,
            "x-request-id": opts.requestId
          },
          body: JSON.stringify({
            number: opts.number,
            text: opts.text,
            linkPreview: opts.linkPreview ?? false,
            delay: opts.delay ?? 0
          })
        }, DEFAULT_TIMEOUT_MS);
        const ok = res.ok && (data?.key?.id || data?.messageId || data?.id);
        if (ok) {
          const messageId = data?.key?.id || data?.messageId || data?.id;
          Audit.opDone({
            where: "sendText",
            attempt,
            messageId,
            number: opts.number,
            requestId: opts.requestId
          });
          return {
            ok: true,
            messageId: String(messageId)
          };
        }
        lastError = data?.message || `HTTP ${res.status}: ${res.statusText}`;
        Audit.error(lastError, {
          where: "sendText",
          status: res.status,
          attempt,
          data,
          requestId: opts.requestId
        });
        if (res.status >= 400 && res.status < 500) return {
          ok: false,
          error: lastError
        };
        if (attempt < MAX_RETRIES) await new Promise((r)=>setTimeout(r, Math.pow(2, attempt) * 1000));
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        Audit.error(err, {
          where: "sendText",
          attempt,
          requestId: opts.requestId
        });
        if (attempt < MAX_RETRIES) await new Promise((r)=>setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    return {
      ok: false,
      error: lastError || "Falha desconhecida ao enviar mensagem"
    };
  }
}
class BulkService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async fetchChargesAndCustomers(chargeIds, tenantId) {
    const [chargesResult, customersResult] = await Promise.all([
      this.supabase.from("charges").select(`
          id, customer_id, valor, data_vencimento, status, tipo, descricao,
           customers!inner(id, name, phone, email)
        `).in("id", chargeIds).eq("tenant_id", tenantId),
      this.supabase.from("customers").select("id, name, phone, email").eq("tenant_id", tenantId)
    ]);
    if (chargesResult.error) throw new Error(`Erro ao buscar cobranças: ${chargesResult.error.message}`);
    if (customersResult.error) throw new Error(`Erro ao buscar clientes: ${customersResult.error.message}`);
    const charges = chargesResult.data ?? [];
    const customers = customersResult.data ?? [];
    const customersById = new Map(customers.map((c)=>[
        c.id,
        c
      ]));
    return {
      charges,
      customersById
    };
  }
  async getTemplate(templateId, tenantId) {
    const { data, error } = await this.supabase.from("notification_templates").select("message").eq("id", templateId).eq("tenant_id", tenantId).single();
    if (error) throw new Error(`Template não encontrado: ${error.message}`);
    if (!data?.message?.trim()) throw new Error("Template não encontrado");
    return data.message;
  }
  async logMessage(payload) {
    try {
      const { error } = await this.supabase.from("message_history").insert({
        tenant_id: payload.tenantId,
        customer_id: payload.customerId ?? null,
        charge_id: payload.chargeId ?? null,
        template_id: payload.templateId ?? null,
        message: payload.message,
        phone: payload.phone,
        success: payload.success,
        message_id: payload.messageId ?? null,
        error: payload.error ?? null,
        sent_at: new Date().toISOString(),
        request_id: payload.requestId,
        dry_run: payload.dryRun ?? false
      });
      if (error) Audit.error(error, {
        where: "logMessage",
        requestId: payload.requestId
      });
    } catch (err) {
      Audit.error(err, {
        where: "logMessage",
        requestId: payload.requestId
      });
    }
  }
  renderMessage(tpl, customer, charge) {
    // AIDEV-NOTE: Preparação dos dados para substituição nas tags
    const nome = customer?.name || "Cliente";
    const empresa = customer?.company || "";
    const cpfCnpj = customer?.cpf_cnpj || "";
    const telefone = customer?.phone || "";
    const email = customer?.email || "";
    
    const valorNum = Number(charge?.valor ?? 0);
    const valor = isFinite(valorNum) ? valorNum.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }) : "R$ 0,00";
    
    const vencimento = charge?.data_vencimento ? new Date(charge.data_vencimento).toLocaleDateString("pt-BR") : "";
    const descricao = charge?.descricao || "";
    const status = charge?.status || "";
    
    // AIDEV-NOTE: Suporte para tags do frontend ({cliente.nome}, {cobranca.valor}, etc.)
    let message = tpl
      // Tags de cliente
      .replace(/\{cliente\.nome\}/g, nome)
      .replace(/\{cliente\.empresa\}/g, empresa)
      .replace(/\{cliente\.cpf_cnpj\}/g, cpfCnpj)
      .replace(/\{cliente\.telefone\}/g, telefone)
      .replace(/\{cliente\.email\}/g, email)
      // Tags de cobrança
      .replace(/\{cobranca\.valor\}/g, valor)
      .replace(/\{cobranca\.vencimento\}/g, vencimento)
      .replace(/\{cobranca\.descricao\}/g, descricao)
      .replace(/\{cobranca\.status\}/g, status)
      // Manter compatibilidade com tags antigas ({{nome}}, {{valor}}, etc.)
      .replace(/\{\{nome\}\}/g, nome)
      .replace(/\{\{valor\}\}/g, valor)
      .replace(/\{\{vencimento\}\}/g, vencimento)
      .replace(/\{\{telefone\}\}/g, telefone)
      .replace(/\{\{email\}\}/g, email);
    
    return message;
  }
  async run(input) {
    const { chargeIds, tenantId, templateId, customMessage, countryCode, throttleMs, batchSize, concurrency, dryRun, requestId, evoCfg } = input;
    Audit.opStart({
      where: "BulkService.run",
      tenantId,
      chargeCount: chargeIds.length,
      hasTemplate: !!templateId,
      hasCustomMessage: !!customMessage,
      environment: evoCfg.environment,
      instance: evoCfg.instanceName,
      dryRun: !!dryRun,
      requestId
    });
    if (!templateId && !customMessage?.trim()) {
      throw new Error("É necessário fornecer um templateId ou customMessage");
    }
    const { charges, customersById } = await this.fetchChargesAndCustomers(chargeIds, tenantId);
    if (charges.length === 0) throw new Error("Nenhuma cobrança encontrada com os IDs fornecidos");
    let templateContent = "";
    if (templateId && !customMessage) templateContent = await this.getTemplate(templateId, tenantId);
    const results = {
      total: charges.length,
      success: 0,
      failed: 0,
      details: []
    };
    const BATCH = Math.max(1, Math.min(Number(batchSize ?? DEFAULT_BATCH_SIZE), 100));
    const CONC = Math.max(1, Math.min(Number(concurrency ?? DEFAULT_CONCURRENCY), 10));
    const INTER_DELAY = DEFAULT_INTER_BATCH_DELAY_MS;
    const THROTTLE = Math.max(0, Number(throttleMs ?? 0));
    for(let i = 0; i < charges.length; i += BATCH){
      const batch = charges.slice(i, i + BATCH);
      const queue = [
        ...batch
      ];
      const workers = new Array(CONC).fill(0).map(async ()=>{
        while(queue.length){
          const charge = queue.shift();
          if (!charge) break;
          try {
            const customer = customersById.get(charge.customer_id);
            if (!customer) throw new Error(`Cliente não encontrado (charge ${charge.id})`);
            if (!customer.phone?.trim()) throw new Error("Cliente sem telefone cadastrado");
            const msg = (customMessage?.trim() || this.renderMessage(templateContent, customer, charge)).trim();
            const normalizedPhone = normalizeToE164(customer.phone, countryCode || DEFAULT_COUNTRY_CODE);
            let sendResult = {
              ok: true,
              messageId: "DRY_RUN",
              error: undefined
            };
            if (!dryRun) {
              sendResult = await EvolutionApi.sendText({
                baseUrl: evoCfg.apiBaseUrl,
                apiKey: evoCfg.apiKey,
                instance: evoCfg.instanceName,
                number: normalizedPhone,
                text: msg,
                requestId
              });
            }
            await this.logMessage({
              tenantId,
              customerId: customer.id,
              chargeId: charge.id,
              templateId: templateId || null,
              message: msg,
              phone: normalizedPhone,
              success: sendResult.ok,
              messageId: sendResult.messageId,
              error: sendResult.error,
              requestId,
              dryRun: !!dryRun
            });
            const row = {
              chargeId: charge.id,
              customerId: customer.id,
              phone: normalizedPhone,
              success: sendResult.ok,
              messageId: sendResult.messageId,
              error: sendResult.error
            };
            results.details.push(row);
            if (sendResult.ok) results.success++;
            else results.failed++;
            if (THROTTLE) await new Promise((r)=>setTimeout(r, THROTTLE));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            Audit.error(err, {
              where: "BulkService.run",
              requestId,
              chargeId: charge?.id,
              customerId: charge?.customer_id
            });
            results.details.push({
              chargeId: charge?.id ?? null,
              customerId: charge?.customer_id ?? null,
              phone: "",
              success: false,
              error: msg
            });
            results.failed++;
            if (THROTTLE) await new Promise((r)=>setTimeout(r, THROTTLE));
          }
        }
      });
      await Promise.all(workers);
      if (i + BATCH < charges.length) await new Promise((r)=>setTimeout(r, INTER_DELAY));
    }
    Audit.opDone({
      where: "BulkService.run",
      tenantId,
      requestId,
      summary: {
        total: results.total,
        success: results.success,
        failed: results.failed
      }
    });
    return results;
  }
}
/** =========================
 *  HTTP Handler
 *  ========================= */ serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  const requestId = (req.headers.get("x-request-id") || crypto.randomUUID()).trim();
  try {
    const validation = await validateRequest(req, {
      methods: [
        "POST"
      ],
      requireAuth: true,
      requireTenant: true,
      maxBodyBytes: 1024 * 1024
    });
    if (!validation.ok) {
      return new Response(JSON.stringify({
        error: validation.error
      }), {
        status: validation.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "x-request-id": requestId
        }
      });
    }
    let body;
    try {
      body = await req.json();
    } catch  {
      return new Response(JSON.stringify({
        error: "JSON inválido no body da requisição"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "x-request-id": requestId
        }
      });
    }
    const { chargeIds, templateId, customMessage } = body ?? {};
    if (!isValidArrayOfStrings(chargeIds)) {
      return new Response(JSON.stringify({
        error: "chargeIds deve ser um array não vazio de strings"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "x-request-id": requestId
        }
      });
    }
    if (!templateId && !customMessage?.trim()) {
      return new Response(JSON.stringify({
        error: "É necessário fornecer templateId ou customMessage"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "x-request-id": requestId
        }
      });
    }
    // Overrides por header
    const envHeader = (req.headers.get("x-env") || "production").toLowerCase();
    const instanceOverride = req.headers.get("x-wa-instance");
    const baseUrlOverride = req.headers.get("x-wa-api-base-url");
    const apiKeyOverride = req.headers.get("x-wa-api-key");
    const countryCode = req.headers.get("x-country-code") || DEFAULT_COUNTRY_CODE;
    const dryRun = (req.headers.get("x-dry-run") || "").toLowerCase() === "true";
    const throttleMs = Number(req.headers.get("x-throttle-ms") || 0);
    const batchSize = Number(req.headers.get("x-batch-size") || DEFAULT_BATCH_SIZE);
    const concurrency = Number(req.headers.get("x-concurrency") || DEFAULT_CONCURRENCY);
    // Supabase Service Role (Edge) + contexto de tenant (RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: ctxErr } = await supabase.rpc("set_tenant_context_simple", {
      p_tenant_id: validation.tenantId
    });
    if (ctxErr) {
      Audit.error(ctxErr, {
        where: "set_tenant_context_simple",
        requestId,
        tenantId: validation.tenantId
      });
      return new Response(JSON.stringify({
        error: "Erro ao configurar contexto do tenant"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "x-request-id": requestId
        }
      });
    }
    // Carrega a config Evolution a partir de tenant_integrations
    const evoCfg = await getEvolutionConfig(supabase, validation.tenantId, envHeader, {
      baseUrl: baseUrlOverride,
      apiKey: apiKeyOverride,
      instanceName: instanceOverride
    });
    const svc = new BulkService(supabase);
    const results = await svc.run({
      chargeIds,
      tenantId: validation.tenantId,
      templateId: templateId ?? null,
      customMessage: customMessage ?? null,
      countryCode,
      throttleMs,
      batchSize,
      concurrency,
      dryRun,
      requestId,
      evoCfg
    });
    return new Response(JSON.stringify({
      success: true,
      data: results,
      requestId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "x-request-id": requestId
      }
    });
  } catch (error) {
    Audit.error(error, {
      where: "serve",
      requestId
    });
    const msg = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(JSON.stringify({
      success: false,
      error: msg,
      requestId
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "x-request-id": requestId
      }
    });
  }
});
