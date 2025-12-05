import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ListTemplatesRequest {
  account_id?: string;
  workspace_id?: string;
}

/**
 * Handler da Edge Function assinafy-list-templates
 * Comentário de nível de função: lista templates da Assinafy usando API Key do ambiente, sem expor segredos ao frontend.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ASSINAFY_API_KEY");
    const baseUrl = Deno.env.get("ASSINAFY_BASE_URL") || "https://api.assinafy.com.br/v1";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ASSINAFY_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Partial<ListTemplatesRequest> = await req.json().catch(() => ({}));
    const accountId = Deno.env.get("ASSINAFY_ACCOUNT_ID") || (typeof body.account_id === "string" ? body.account_id : undefined);

    // Construir URL flexível: se houver account_id usar rota com conta, caso contrário usar rota global
    const url = new URL(accountId ? `${baseUrl}/accounts/${accountId}/templates` : `${baseUrl}/templates`);
    if (body.workspace_id) url.searchParams.set("workspace_id", body.workspace_id);

    const assinafyResp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    const text = await assinafyResp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!assinafyResp.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao listar templates", status: assinafyResp.status, data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ templates: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
