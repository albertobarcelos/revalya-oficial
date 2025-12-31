/**
 * Utilitários para comunicação com API Focus NFe
 * AIDEV-NOTE: Helpers para requisições à API Focus NFe
 */

import type { FocusNFeCredentials, Environment } from "../types.ts";
import { maskCnpj } from "./company.ts";

/**
 * Busca empresa no Focus NFe pelo CNPJ
 */
export async function findCompanyInFocusNFe(
  credentials: FocusNFeCredentials,
  cnpj: string
): Promise<{ id: string; [key: string]: any } | null> {
  const consultUrl = `${credentials.baseUrl}/empresas?cnpj=${cnpj.replace(/\D/g, '')}`;
  
  const response = await fetch(consultUrl, {
    method: 'GET',
    headers: {
      'Authorization': credentials.authHeader
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    
    const error = await response.json().catch(() => ({}));
    throw new Error(error.mensagem || 'Erro ao consultar empresa no Focus NFe');
  }
  
  const companies = await response.json();
  return Array.isArray(companies) && companies.length > 0 ? companies[0] : null;
}

/**
 * Atualiza empresa no Focus NFe
 */
export async function updateCompanyInFocusNFe(
  credentials: FocusNFeCredentials,
  empresaId: string,
  updateData: Record<string, any>,
  cnpj: string
): Promise<any> {
  const updateUrl = `${credentials.baseUrl}/empresas/${empresaId}`;
  
  // AIDEV-NOTE: Para ALTERAÇÃO (PUT), os dados são enviados DIRETAMENTE, sem wrapper "empresa"
  // Exemplo da documentação: curl -X PUT -d '{"nome_fantasia":"Focus NFe Teste"}' .../empresas/ID
  // O wrapper { empresa: {...} } é usado apenas para CRIAÇÃO (POST)
  
  // AIDEV-NOTE: Verificação de segurança - garantir que campos antigos NÃO sejam enviados
  // IMPORTANTE: Para ATUALIZAÇÃO (PUT), usar apenas login_responsavel e senha_responsavel
  const updateDataLimpo: Record<string, any> = {};
  Object.keys(updateData).forEach(key => {
    // AIDEV-NOTE: Ignorar campos antigos (prefeitura_usuario/prefeitura_senha)
    if (key !== 'prefeitura_usuario' && key !== 'prefeitura_senha') {
      updateDataLimpo[key] = updateData[key];
    } else {
      console.warn(`[updateCompanyInFocusNFe] ATENÇÃO: Campo antigo '${key}' detectado e removido!`);
    }
  });
  
  // AIDEV-NOTE: Se campos antigos foram removidos, logar aviso
  if (Object.keys(updateDataLimpo).length !== Object.keys(updateData).length) {
    console.warn('[updateCompanyInFocusNFe] Campos antigos foram removidos do payload de atualização');
  }
  
  console.log('[updateCompanyInFocusNFe] Atualizando empresa (PUT):', {
    empresa_id: empresaId,
    cnpj: maskCnpj(cnpj),
    updateData_keys: Object.keys(updateData),
    updateDataLimpo_keys: Object.keys(updateDataLimpo),
    tem_login_responsavel: 'login_responsavel' in updateDataLimpo,
    tem_senha_responsavel: 'senha_responsavel' in updateDataLimpo,
    tem_prefeitura_usuario: 'prefeitura_usuario' in updateDataLimpo,
    tem_prefeitura_senha: 'prefeitura_senha' in updateDataLimpo,
    updateDataLimpo: JSON.stringify({
      ...updateDataLimpo,
      login_responsavel: updateDataLimpo.login_responsavel ? '***preenchido***' : undefined,
      senha_responsavel: updateDataLimpo.senha_responsavel ? '***preenchido***' : undefined,
    }, null, 2)
  });
  
  // AIDEV-NOTE: Verificação final EXTRA - garantir que campos antigos NÃO estejam em updateDataLimpo
  // Esta é uma verificação de segurança adicional
  if ('prefeitura_usuario' in updateDataLimpo) {
    console.error('[updateCompanyInFocusNFe] ❌ ERRO CRÍTICO: prefeitura_usuario ainda está em updateDataLimpo! Removendo...');
    delete updateDataLimpo.prefeitura_usuario;
  }
  if ('prefeitura_senha' in updateDataLimpo) {
    console.error('[updateCompanyInFocusNFe] ❌ ERRO CRÍTICO: prefeitura_senha ainda está em updateDataLimpo! Removendo...');
    delete updateDataLimpo.prefeitura_senha;
  }
  
  const requestBody = JSON.stringify(updateDataLimpo);
  
  // AIDEV-NOTE: Log detalhado do payload REAL (sem mascarar para debug interno)
  console.log('[updateCompanyInFocusNFe] Request body enviado para Focus NFe (PUT):', requestBody);
  console.log('[updateCompanyInFocusNFe] Verificação final - updateDataLimpo contém prefeitura_usuario?', 'prefeitura_usuario' in updateDataLimpo);
  console.log('[updateCompanyInFocusNFe] Verificação final - updateDataLimpo contém prefeitura_senha?', 'prefeitura_senha' in updateDataLimpo);
  console.log('[updateCompanyInFocusNFe] Verificação final - updateDataLimpo contém login_responsavel?', 'login_responsavel' in updateDataLimpo);
  console.log('[updateCompanyInFocusNFe] Verificação final - updateDataLimpo contém senha_responsavel?', 'senha_responsavel' in updateDataLimpo);
  console.log('[updateCompanyInFocusNFe] Valor login_responsavel (raw):', updateDataLimpo.login_responsavel);
  console.log('[updateCompanyInFocusNFe] Tipo login_responsavel:', typeof updateDataLimpo.login_responsavel);
  console.log('[updateCompanyInFocusNFe] Valor senha_responsavel (raw):', updateDataLimpo.senha_responsavel ? '***preenchido***' : 'vazio');
  console.log('[updateCompanyInFocusNFe] Tipo senha_responsavel:', typeof updateDataLimpo.senha_responsavel);
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': credentials.authHeader
    },
    body: requestBody  // AIDEV-NOTE: Usando updateDataLimpo (sem campos antigos)
  });
  
  const responseText = await response.text();
  let responseData: any = {};
  
  try {
    responseData = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseData = { raw: responseText };
  }
  
  if (!response.ok) {
    console.error('[updateCompanyInFocusNFe] Erro da API Focus NFe:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData,
      updateData: updateData,
      url: updateUrl
    });
    
    // Construir mensagem de erro mais detalhada
    const errorMessage = responseData.mensagem || responseData.message || responseData.codigo || 'Erro ao atualizar empresa';
    const errorDetails = responseData.erros || responseData.errors || responseData.detalhes || '';
    
    throw new Error(
      errorDetails 
        ? `${errorMessage}: ${JSON.stringify(errorDetails)}`
        : errorMessage
    );
  }
  
  // AIDEV-NOTE: Log da resposta completa para verificar se os campos foram atualizados
  console.log('[updateCompanyInFocusNFe] Resposta completa da API Focus NFe:', {
    status: response.status,
    statusText: response.statusText,
    responseData: JSON.stringify(responseData, null, 2),
    campos_enviados: Object.keys(updateData),
    campos_retornados_homologacao: {
      serie_nfse_homologacao: responseData.serie_nfse_homologacao,
      proximo_numero_nfse_homologacao: responseData.proximo_numero_nfse_homologacao
    },
    campos_retornados_producao: {
      serie_nfse_producao: responseData.serie_nfse_producao,
      proximo_numero_nfse_producao: responseData.proximo_numero_nfse_producao
    }
  });
  
  return responseData;
}

/**
 * Cria empresa no Focus NFe
 */
export async function createCompanyInFocusNFe(
  credentials: FocusNFeCredentials,
  companyData: Record<string, any>
): Promise<any> {
  const createUrl = `${credentials.baseUrl}/empresas`;
  
  console.log('[createCompanyInFocusNFe] Criando empresa:', {
    cnpj: maskCnpj(companyData.cnpj),
    nome: companyData.nome,
    baseUrl: credentials.baseUrl
  });
  
  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': credentials.authHeader
    },
    body: JSON.stringify(companyData)
  });
  
  if (!response.ok) {
    let errorMessage = 'Erro ao criar empresa no Focus NFe';
    let errorDetails: any = {};
    
    try {
      const errorText = await response.text();
      try {
        errorDetails = JSON.parse(errorText);
        errorMessage = errorDetails.mensagem || errorDetails.codigo || errorDetails.error || errorMessage;
        
        if (errorDetails.erros && Array.isArray(errorDetails.erros)) {
          const errosDetalhados = errorDetails.erros
            .map((e: any) => `${e.campo || 'campo'}: ${e.mensagem || e.codigo || 'erro'}`)
            .join('; ');
          if (errosDetalhados) {
            errorMessage = `${errorMessage}. Erros de validação: ${errosDetalhados}`;
          }
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
    } catch (e) {
      console.error('[createCompanyInFocusNFe] Erro ao ler resposta:', e);
    }
    
    // Tratamento específico de erros HTTP
    if (response.status === 401) {
      errorMessage = 'Não autorizado (401). Verifique se o token FOCUSNFE_API_KEY está correto nos secrets do Supabase. Algumas contas podem não ter permissão para criar empresas via API.';
    } else if (response.status === 403) {
      errorMessage = 'Acesso negado (403). Sua conta pode não ter permissão para criar empresas via API. Entre em contato com o suporte Focus NFe.';
    } else if (response.status === 404) {
      errorMessage = 'Endpoint não encontrado (404). A API de empresas pode não estar disponível para sua conta.';
    } else if (response.status === 422) {
      errorMessage = `Dados inválidos (422): ${errorMessage}. Verifique se todos os campos obrigatórios foram preenchidos corretamente.`;
    }
    
    throw new Error(errorMessage);
  }
  
  return await response.json();
}

