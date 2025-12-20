import { serve } from "https://deno.land/std/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
/**
 * Handler da Edge Function assinafy-list-signer-documents
 * Comentário de nível de função: lista documentos associados a um signer na Assinafy com autorização segura via API Key
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
    const body = await req.json().catch(()=>({}));
    const signerId = typeof body.signer_id === "string" ? body.signer_id : undefined;
    if (!signerId) {
      return new Response(JSON.stringify({
        error: "signer_id obrigatório"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const url = new URL(`${baseUrl}/signers/${signerId}/documents`);
    if (typeof body.signer_access_code === "string" && body.signer_access_code.trim() !== "") {
      url.searchParams.set("signer-access-code", body.signer_access_code.trim());
    }
    if (typeof body.status === "string" && body.status.trim() !== "") url.searchParams.set("status", body.status.trim());
    if (typeof body.method === "string" && body.method.trim() !== "") url.searchParams.set("method", body.method.trim());
    if (typeof body.search === "string" && body.search.trim() !== "") url.searchParams.set("search", body.search.trim());
    if (typeof body.sort === "string" && body.sort.trim() !== "") url.searchParams.set("sort", body.sort.trim());
    const assinafyResp = await fetch(url.toString(), {
      method: "GET",
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
        error: "Falha ao listar documentos do signer",
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
      documents: data
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
