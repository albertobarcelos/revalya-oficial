/**
 * Edge Function: FocusNFe Integration
 * 
 * AIDEV-NOTE: Proxy para integração com API FocusNFe
 * Suporta emissão de NFe (Nota Fiscal Eletrônica) e NFSe (Nota Fiscal de Serviços)
 * 
 * Endpoints:
 * - POST /focusnfe/empresas/create - Criar empresa
 * - PUT /focusnfe/empresas/update - Atualizar empresa
 * - GET /focusnfe/empresas?cnpj=... - Consultar empresa
 * - PUT /focusnfe/empresas/documentos-fiscais - Atualizar documentos fiscais
 * - PUT /focusnfe/empresas/configuracoes-nfe - Atualizar configurações NF-e
 * - POST /focusnfe/nfe/emit - Emitir NFe
 * - GET /focusnfe/nfe/{referencia} - Consultar NFe
 * - POST /focusnfe/nfse/emit - Emitir NFSe
 * - GET /focusnfe/nfse/{referencia} - Consultar NFSe
 * 
 * Documentação: https://doc.focusnfe.com.br/reference/introducao
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleRequest } from "./router.ts";

// AIDEV-NOTE: Edge Function principal - delega para router modularizado
serve(handleRequest);
