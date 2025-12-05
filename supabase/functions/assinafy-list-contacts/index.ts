import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ListContactsRequest {
  page?: number;
  per_page?: number;
  search?: string;
}

/**
 * Handler da Edge Function assinafy-list-contacts
 * Comentário de nível de função: lista contatos (signers) da Assinafy usando credenciais seguras do ambiente.
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
    const accountId = Deno.env.get("ASSINAFY_ACCOUNT_ID");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ASSINAFY_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accountId) {
      return new Response(JSON.stringify({ error: "ASSINAFY_ACCOUNT_ID não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Partial<ListContactsRequest> = await req.json().catch(() => ({}));
    const url = new URL(`${baseUrl}/accounts/${accountId}/signers`);
    if (typeof body.page === "number") url.searchParams.set("page", String(body.page));
    if (typeof body.per_page === "number") url.searchParams.set("per_page", String(body.per_page));
    if (typeof body.search === "string" && body.search.trim() !== "") url.searchParams.set("search", body.search.trim());

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
        JSON.stringify({ error: "Falha ao listar contatos", status: assinafyResp.status, data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ contacts: data }), {
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
