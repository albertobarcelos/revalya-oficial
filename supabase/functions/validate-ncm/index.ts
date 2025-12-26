/**
 * Edge Function: Validação de NCM via API FocusNFe
 * 
 * AIDEV-NOTE: Consulta NCM na API da FocusNFe
 * Endpoint: GET https://api.focusnfe.com.br/v2/ncms/{codigo}
 * Documentação: https://focusnfe.com.br/doc/#consulta-de-ncm
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const FOCUSNFE_API_URL = Deno.env.get('FOCUSNFE_API_URL') || 'https://api.focusnfe.com.br/v2';
const FOCUSNFE_TOKEN = Deno.env.get('FOCUSNFE_TOKEN') || '';

interface NCMRequest {
  code: string;
}

interface FocusNFeNCMResponse {
  codigo: string;
  descricao: string;
  ex?: string; // Exceção tarifária
  tipo?: string;
  unidade?: string;
}

interface NCMValidationResponse {
  code: string;
  description: string;
  valid: boolean;
  error?: string;
  details?: {
    ex?: string; // Exceção tarifária
    tipo?: string;
    unidade?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // AIDEV-NOTE: Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // AIDEV-NOTE: Validar token da FocusNFe
    if (!FOCUSNFE_TOKEN) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'FOCUSNFE_TOKEN não configurado. Configure a variável de ambiente.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // AIDEV-NOTE: Parse do body da requisição
    const { code }: NCMRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Código NCM não fornecido',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // AIDEV-NOTE: Remover pontos do código NCM para consulta na API
    // A FocusNFe espera o código sem pontos (ex: 22030000 em vez de 2203.00.00)
    const ncmCodeClean = code.replace(/\D/g, '');

    if (ncmCodeClean.length !== 8) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Código NCM deve ter 8 dígitos',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // AIDEV-NOTE: Consultar API da FocusNFe
    // AIDEV-NOTE: FocusNFe usa Basic Auth - token como username, sem senha
    const focusNFeUrl = `${FOCUSNFE_API_URL}/ncms/${ncmCodeClean}`;
    
    // AIDEV-NOTE: Basic Auth: token como username, senha vazia
    // Usar módulo std/encoding/base64 do Deno
    const credentials = `${FOCUSNFE_TOKEN}:`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64 = base64Encode(credentialsBytes);
    
    const focusNFeResponse = await fetch(focusNFeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64}`,
        'Content-Type': 'application/json',
      },
    });

    if (!focusNFeResponse.ok) {
      // AIDEV-NOTE: Se retornar 404, o NCM não existe
      if (focusNFeResponse.status === 404) {
        return new Response(
          JSON.stringify({
            code: code,
            description: '',
            valid: false,
            error: 'NCM não encontrado na base da FocusNFe',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // AIDEV-NOTE: Outros erros da API
      const errorText = await focusNFeResponse.text();
      console.error('[ERROR] Erro na API FocusNFe:', {
        status: focusNFeResponse.status,
        statusText: focusNFeResponse.statusText,
        error: errorText,
      });

      return new Response(
        JSON.stringify({
          code: code,
          description: '',
          valid: false,
          error: `Erro ao consultar FocusNFe: ${focusNFeResponse.status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // AIDEV-NOTE: Parse da resposta da FocusNFe
    const ncmData: FocusNFeNCMResponse = await focusNFeResponse.json();

    // AIDEV-NOTE: Debug temporário para verificar resposta da FocusNFe
    console.log('[DEBUG] Resposta da FocusNFe:', JSON.stringify(ncmData, null, 2));

    // AIDEV-NOTE: Formatar código NCM com pontos (XXXX.XX.XX)
    const formattedCode = `${ncmData.codigo.slice(0, 4)}.${ncmData.codigo.slice(4, 6)}.${ncmData.codigo.slice(6, 8)}`;

    const response: NCMValidationResponse = {
      code: formattedCode,
      description: ncmData.descricao || '',
      valid: true,
      details: {
        ex: ncmData.ex,
        tipo: ncmData.tipo,
        unidade: ncmData.unidade,
      },
    };

    // AIDEV-NOTE: Debug temporário para verificar resposta final
    console.log('[DEBUG] Resposta final da Edge Function:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ERROR] Erro na Edge Function validate-ncm:', error);
    
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

