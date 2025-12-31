/**
 * Handlers para operações de empresa no Focus NFe
 * AIDEV-NOTE: Lógica de criação, atualização e consulta de empresa
 */

import type { Request, Response } from "https://deno.land/std@0.168.0/http/server.ts";
import type { Environment, CompanyData } from "../types.ts";
import { getFocusNFeCredentials } from "../utils/credentials.ts";
import { checkTenantIntegration, getTenantCompanyData } from "../utils/tenant.ts";
import { mapCompanyDataToFocusNFe, validateRequiredFields, maskCnpj } from "../utils/company.ts";
import { findCompanyInFocusNFe, createCompanyInFocusNFe, updateCompanyInFocusNFe } from "../utils/focusnfe.ts";
import { successResponse, errorResponse } from "../utils/response.ts";

/**
 * Cria empresa no Focus NFe
 */
export async function handleCreateCompany(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { company_data, environment = 'producao' }: { company_data?: CompanyData; environment?: Environment } = body;
    
    // Buscar dados da empresa
    let empresaData = company_data;
    if (!empresaData) {
      empresaData = await getTenantCompanyData(tenantId);
    }
    
    if (!empresaData || !empresaData.cnpj) {
      throw new Error('Dados da empresa não encontrados. Preencha os dados da empresa primeiro.');
    }
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações primeiro.');
    }
    
    // AIDEV-NOTE: API de empresas SEMPRE opera em produção, forçando ambiente
    const credentials = getFocusNFeCredentials('producao', true);
    const cnpjClean = empresaData.cnpj.replace(/\D/g, '');
    
    // Verificar se empresa já existe
    const existing = await findCompanyInFocusNFe(credentials, cnpjClean);
    if (existing) {
      return successResponse(
        { ...existing, already_exists: true },
        'Empresa já cadastrada no Focus NFe'
      );
    }
    
    // Mapear dados para formato Focus NFe
    const focusNFeData = mapCompanyDataToFocusNFe(empresaData, true);
    
    // Validar campos obrigatórios
    const camposFaltando = validateRequiredFields(focusNFeData);
    if (camposFaltando.length > 0) {
      throw new Error(
        `Campos obrigatórios não preenchidos: ${camposFaltando.join(', ')}. ` +
        `Preencha os dados da empresa antes de ativar a integração.`
      );
    }
    
    // Criar empresa
    const result = await createCompanyInFocusNFe(credentials, focusNFeData);
    
    console.log('[handleCreateCompany] Empresa criada com sucesso');
    
    return successResponse(
      { ...result, already_exists: false },
      'Empresa cadastrada com sucesso no Focus NFe'
    );
    
  } catch (error) {
    console.error('[handleCreateCompany] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao criar empresa',
      500
    );
  }
}

/**
 * Atualiza empresa no Focus NFe
 */
export async function handleUpdateCompany(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { company_data, environment = 'producao' }: { company_data?: CompanyData; environment?: Environment } = body;
    
    // Buscar dados da empresa
    let empresaData = company_data;
    if (!empresaData) {
      empresaData = await getTenantCompanyData(tenantId);
    }
    
    if (!empresaData || !empresaData.cnpj) {
      throw new Error('Dados da empresa não encontrados. Preencha os dados da empresa primeiro.');
    }
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações primeiro.');
    }
    
    // AIDEV-NOTE: API de empresas SEMPRE opera em produção, forçando ambiente
    const credentials = getFocusNFeCredentials('producao', true);
    const cnpjClean = empresaData.cnpj.replace(/\D/g, '');
    
    // Buscar empresa existente
    const empresaExistente = await findCompanyInFocusNFe(credentials, cnpjClean);
    
    if (!empresaExistente || !empresaExistente.id) {
      // Empresa não existe, criar ao invés de atualizar
      console.log('[handleUpdateCompany] Empresa não encontrada, redirecionando para criação...');
      return await handleCreateCompany(req, tenantId);
    }
    
    // Mapear dados para formato Focus NFe
    const focusNFeData = mapCompanyDataToFocusNFe(empresaData);
    
    // Atualizar empresa
    const result = await updateCompanyInFocusNFe(
      credentials,
      empresaExistente.id,
      focusNFeData,
      cnpjClean
    );
    
    console.log('[handleUpdateCompany] Empresa atualizada com sucesso');
    
    return successResponse(
      result,
      'Empresa atualizada com sucesso no Focus NFe'
    );
    
  } catch (error) {
    console.error('[handleUpdateCompany] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar empresa',
      500
    );
  }
}

/**
 * Consulta empresa no Focus NFe
 */
export async function handleConsultCompany(req: Request, tenantId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const cnpj = url.searchParams.get('cnpj');
    const environmentParam = url.searchParams.get('environment');
    const environmentHeader = req.headers.get('x-environment');
    const environment = (environmentParam || environmentHeader || 'producao') as Environment;
    
    if (!cnpj) {
      throw new Error('CNPJ é obrigatório');
    }
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações.');
    }
    
    // AIDEV-NOTE: API de empresas SEMPRE opera em produção, forçando ambiente
    const credentials = getFocusNFeCredentials('producao', true);
    const empresa = await findCompanyInFocusNFe(credentials, cnpj);
    
    if (empresa) {
      return successResponse(
        { ...empresa, found: true },
        'Empresa encontrada no Focus NFe'
      );
    }
    
    return successResponse(
      { found: false },
      'Empresa não cadastrada no Focus NFe'
    );
    
  } catch (error) {
    console.error('[handleConsultCompany] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao consultar empresa',
      500
    );
  }
}

