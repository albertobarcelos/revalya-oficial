/**
 * Utilitários para gerenciar credenciais do Focus NFe
 * AIDEV-NOTE: Lógica de autenticação centralizada
 */

import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import type { Environment, FocusNFeCredentials } from "../types.ts";
import { FOCUSNFE_URLS } from "../constants.ts";

/**
 * AIDEV-NOTE: Buscar chave única da API FocusNFe dos secrets do Supabase
 * Padrão único: uma chave para todos os tenants
 * @param environment - Ambiente desejado (homologacao ou producao)
 * @param forceEnvironment - Se true, ignora FOCUSNFE_ENVIRONMENT e usa o parâmetro environment
 */
export function getFocusNFeCredentials(
  environment: Environment = 'producao',
  forceEnvironment: boolean = false
): FocusNFeCredentials {
  const apiKey = Deno.env.get('FOCUSNFE_API_KEY');
  
  // AIDEV-NOTE: Se forceEnvironment=true, ignora a variável de ambiente
  // Isso é CRÍTICO para a API de empresas que SÓ funciona em produção
  const configEnvironment = forceEnvironment 
    ? environment 
    : (Deno.env.get('FOCUSNFE_ENVIRONMENT') || environment);
  
  if (!apiKey || !apiKey.trim()) {
    const errorMsg = 'FOCUSNFE_API_KEY não configurada no Supabase Vault. Configure em Dashboard > Edge Functions > Secrets';
    console.error('[getFocusNFeCredentials]', errorMsg);
    throw new Error(errorMsg);
  }
  
  const finalEnvironment = configEnvironment === 'producao' ? 'producao' : 'homologacao';
  const baseUrl = finalEnvironment === 'producao'
    ? FOCUSNFE_URLS.PRODUCAO
    : FOCUSNFE_URLS.HOMOLOGACAO;
  
  // AIDEV-NOTE: FocusNFe usa HTTP Basic Auth - token como username, senha vazia
  const token = apiKey.trim();
  const credentials = `${token}:`;
  const encoder = new TextEncoder();
  const credentialsBytes = encoder.encode(credentials);
  const base64 = base64Encode(credentialsBytes);
  const authHeader = `Basic ${base64}`;
  
  console.log('[getFocusNFeCredentials] Credenciais obtidas:', {
    hasApiKey: !!token,
    environment: finalEnvironment,
    baseUrl,
    usingBasicAuth: true
  });
  
  return { token, baseUrl, authHeader };
}

