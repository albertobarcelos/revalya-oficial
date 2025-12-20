import { serve } from "https://deno.land/std/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
/**
 * Handler da Edge Function assinafy-delete-template
 * Comentário de nível de função: exclui um template na Assinafy usando credenciais seguras do ambiente.
 */ serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Método não permitido"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const apiKey = Deno.env.get("ASSINAFY_API_KEY");
    const baseUrl = Deno.env.get("ASSINAFY_BASE_URL") || "https://api.assinafy.com.br/v1";
    const accountId = Deno.env.get("ASSINAFY_ACCOUNT_ID");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "ASSINAFY_API_KEY não configurada"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!accountId) {
      return new Response(JSON.stringify({
        error: "ASSINAFY_ACCOUNT_ID não configurada"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const body = await req.json().catch(()=>({}));
    const templateId = typeof body.template_id === "string" ? body.template_id : undefined;
    if (!templateId) {
      return new Response(JSON.stringify({
        error: "template_id obrigatório"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const url = `${baseUrl}/accounts/${accountId}/templates/${templateId}`;
    const assinafyResp = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });
    const text = await assinafyResp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch  {
      data = {
        raw: text
      };
    }
    if (!assinafyResp.ok) {
      return new Response(JSON.stringify({
        error: "Falha ao excluir template",
        status: assinafyResp.status,
        data
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      result: data
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
