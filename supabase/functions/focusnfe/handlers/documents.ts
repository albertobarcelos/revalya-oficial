/**
 * Handlers para emissão e consulta de documentos fiscais (NFe/NFSe)
 * AIDEV-NOTE: Lógica de emissão e consulta de notas fiscais
 */

import type { Request, Response } from "https://deno.land/std@0.168.0/http/server.ts";
import type { Environment, DocumentType } from "../types.ts";
import { getFocusNFeCredentials } from "../utils/credentials.ts";
import { checkTenantIntegration, getTenantCompanyData } from "../utils/tenant.ts";
import { findCompanyInFocusNFe } from "../utils/focusnfe.ts";
import { createSupabaseClient } from "../utils/supabase.ts";
import { successResponse, errorResponse } from "../utils/response.ts";

/**
 * Atualiza status do finance_entry após emissão
 */
async function updateFinanceEntryStatus(
  financeEntryId: string,
  tenantId: string,
  status: 'processing' | 'error',
  invoiceData: Record<string, any>
): Promise<void> {
  if (!financeEntryId) return;
  
  const supabase = createSupabaseClient();
  
  await supabase
    .from('finance_entries')
    .update({
      invoice_status: status,
      invoice_data: invoiceData,
      updated_at: new Date().toISOString()
    })
    .eq('id', financeEntryId)
    .eq('tenant_id', tenantId);
}

/**
 * Emite NFe no Focus NFe
 */
export async function handleEmitNFe(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { referencia, dados_nfe, finance_entry_id, environment = 'producao' } = body;
    
    if (!referencia) {
      throw new Error('Referência é obrigatória');
    }
    
    if (!dados_nfe) {
      throw new Error('Dados da NFe são obrigatórios');
    }
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações.');
    }
    
    const credentials = getFocusNFeCredentials(environment);
    const url = `${credentials.baseUrl}/nfe?ref=${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.authHeader
      },
      body: JSON.stringify(dados_nfe)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[handleEmitNFe] Erro na API FocusNFe:', {
        status: response.status,
        error: result
      });
      
      // Atualizar status de erro no finance_entry
      if (finance_entry_id) {
        await updateFinanceEntryStatus(
          finance_entry_id,
          tenantId,
          'error',
          {
            provider: 'focusnfe',
            tipo: 'nfe',
            referencia,
            status: 'erro_autorizacao',
            erro: result.mensagem || result.codigo || 'Erro desconhecido',
            enviado_em: new Date().toISOString()
          }
        );
      }
      
      return errorResponse(
        result.mensagem || result.codigo || 'Erro ao emitir NFe',
        response.status,
        { detalhes: result.erros || result }
      );
    }
    
    // Atualizar status de processamento no finance_entry
    if (finance_entry_id) {
      await updateFinanceEntryStatus(
        finance_entry_id,
        tenantId,
        'processing',
        {
          provider: 'focusnfe',
          tipo: 'nfe',
          referencia,
          status: result.status || 'processando',
          enviado_em: new Date().toISOString()
        }
      );
    }
    
    return successResponse({
      referencia,
      status: result.status,
      caminho: result.caminho
    });
    
  } catch (error) {
    console.error('[handleEmitNFe] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao emitir NFe',
      500
    );
  }
}

/**
 * Emite NFSe no Focus NFe
 */
export async function handleEmitNFSe(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { referencia, dados_nfse, finance_entry_id, environment = 'producao' } = body;
    
    if (!referencia) {
      throw new Error('Referência é obrigatória');
    }
    
    if (!dados_nfse) {
      throw new Error('Dados da NFSe são obrigatórios');
    }
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações.');
    }
    
    // AIDEV-NOTE: Buscar dados da empresa do Focus NFe para incluir credenciais da prefeitura
    // As credenciais são necessárias para algumas prefeituras que exigem login/senha
    let empresaData: any = null;
    try {
      const tenantCompanyData = await getTenantCompanyData(tenantId);
      if (tenantCompanyData?.cnpj) {
        const cnpj = tenantCompanyData.cnpj.replace(/\D/g, '');
        // AIDEV-NOTE: API de empresas sempre opera em produção
        const credentialsProducao = getFocusNFeCredentials('producao', true);
        empresaData = await findCompanyInFocusNFe(credentialsProducao, cnpj);
        
        // AIDEV-NOTE: Incluir credenciais da prefeitura se disponíveis
        // Usar nomes corretos da API Focus NFe: login_responsavel e senha_responsavel
        if (empresaData?.login_responsavel || empresaData?.senha_responsavel) {
          dados_nfse.login_responsavel = empresaData.login_responsavel;
          dados_nfse.senha_responsavel = empresaData.senha_responsavel;
          
          console.log('[handleEmitNFSe] Credenciais da prefeitura incluídas:', {
            has_login: !!empresaData.login_responsavel,
            has_senha: !!empresaData.senha_responsavel
          });
        }
        
        // AIDEV-NOTE: Incluir certificado digital se disponível
        if (empresaData?.arquivo_certificado_base64 || empresaData?.senha_certificado) {
          dados_nfse.arquivo_certificado_base64 = empresaData.arquivo_certificado_base64;
          dados_nfse.senha_certificado = empresaData.senha_certificado;
          
          console.log('[handleEmitNFSe] Certificado digital incluído:', {
            has_arquivo: !!empresaData.arquivo_certificado_base64,
            has_senha: !!empresaData.senha_certificado
          });
        }
      }
    } catch (error) {
      // AIDEV-NOTE: Não falhar a emissão se não conseguir buscar dados da empresa
      // Apenas logar o erro e continuar sem as credenciais
      console.warn('[handleEmitNFSe] Erro ao buscar dados da empresa (não crítico):', error);
    }
    
    const credentials = getFocusNFeCredentials(environment);
    const url = `${credentials.baseUrl}/nfsen?ref=${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.authHeader
      },
      body: JSON.stringify(dados_nfse)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[handleEmitNFSe] Erro na API FocusNFe:', {
        status: response.status,
        error: result
      });
      
      // Atualizar status de erro no finance_entry
      if (finance_entry_id) {
        await updateFinanceEntryStatus(
          finance_entry_id,
          tenantId,
          'error',
          {
            provider: 'focusnfe',
            tipo: 'nfse',
            referencia,
            status: 'erro_autorizacao',
            erro: result.mensagem || result.codigo || 'Erro desconhecido',
            enviado_em: new Date().toISOString()
          }
        );
      }
      
      return errorResponse(
        result.mensagem || result.codigo || 'Erro ao emitir NFSe',
        response.status,
        { detalhes: result.erros || result }
      );
    }
    
    // Atualizar status de processamento no finance_entry
    if (finance_entry_id) {
      await updateFinanceEntryStatus(
        finance_entry_id,
        tenantId,
        'processing',
        {
          provider: 'focusnfe',
          tipo: 'nfse',
          referencia,
          status: result.status || 'processando',
          enviado_em: new Date().toISOString()
        }
      );
    }
    
    return successResponse({
      referencia,
      status: result.status,
      caminho: result.caminho
    });
    
  } catch (error) {
    console.error('[handleEmitNFSe] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao emitir NFSe',
      500
    );
  }
}

/**
 * Consulta status de nota fiscal
 * AIDEV-NOTE: Emissão fiscal respeita o ambiente configurado (homologação/produção)
 */
export async function handleConsultStatus(
  req: Request,
  tenantId: string,
  tipo: DocumentType,
  referencia: string
): Promise<Response> {
  try {
    // AIDEV-NOTE: Extrair ambiente do header ou query param (emissão fiscal respeita ambiente)
    const url = new URL(req.url);
    const environmentParam = url.searchParams.get('environment');
    const environmentHeader = req.headers.get('x-environment');
    const environment = (environmentParam || environmentHeader || 'producao') as Environment;
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações.');
    }
    
    // AIDEV-NOTE: Emissão fiscal NÃO força produção, respeita o ambiente configurado
    const credentials = getFocusNFeCredentials(environment);
    const endpoint = tipo === 'nfe' ? 'nfe' : 'nfsen';
    const apiUrl = `${credentials.baseUrl}/${endpoint}/${encodeURIComponent(referencia)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': credentials.authHeader
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return errorResponse(
        result.mensagem || result.codigo || 'Erro ao consultar status',
        response.status
      );
    }
    
    return successResponse(result);
    
  } catch (error) {
    console.error('[handleConsultStatus] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao consultar status',
      500
    );
  }
}

