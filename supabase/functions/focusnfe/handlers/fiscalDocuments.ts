/**
 * Handlers para configurações de documentos fiscais
 * AIDEV-NOTE: Lógica de atualização de documentos fiscais (NFe/NFSe)
 */

import type { Request, Response } from "https://deno.land/std@0.168.0/http/server.ts";
import type { Environment } from "../types.ts";
import { getFocusNFeCredentials } from "../utils/credentials.ts";
import { checkTenantIntegration, getTenantCompanyData } from "../utils/tenant.ts";
import { findCompanyInFocusNFe } from "../utils/focusnfe.ts";
import { updateCompanyInFocusNFe } from "../utils/focusnfe.ts";
import { maskCnpj } from "../utils/company.ts";
import { successResponse, errorResponse } from "../utils/response.ts";

/**
 * Atualiza configurações de documentos fiscais no Focus NFe
 */
export async function handleUpdateFiscalDocuments(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const {
      habilita_nfe,
      habilita_nfse,
      habilita_nfsen_homologacao,
      habilita_nfsen_producao,
      environment = 'producao'
    }: {
      habilita_nfe?: boolean;
      habilita_nfse?: boolean;
      habilita_nfsen_homologacao?: boolean;
      habilita_nfsen_producao?: boolean;
      environment?: Environment;
    } = body;
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações primeiro.');
    }
    
    // Buscar CNPJ do tenant
    const empresaData = await getTenantCompanyData(tenantId);
    if (!empresaData?.cnpj) {
      throw new Error('Dados da empresa não encontrados');
    }
    
    const cnpj = empresaData.cnpj.replace(/\D/g, '');
    
    // AIDEV-NOTE: API de empresas SEMPRE opera em produção, forçando ambiente
    const credentials = getFocusNFeCredentials('producao', true);
    const empresaExistente = await findCompanyInFocusNFe(credentials, cnpj);
    
    if (!empresaExistente?.id) {
      throw new Error('Empresa não encontrada no Focus NFe. Cadastre a empresa primeiro.');
    }
    
    // Preparar dados de atualização
    const updateData: Record<string, boolean> = {};
    
    if (typeof habilita_nfe === 'boolean') updateData.habilita_nfe = habilita_nfe;
    if (typeof habilita_nfse === 'boolean') updateData.habilita_nfse = habilita_nfse;
    if (typeof habilita_nfsen_homologacao === 'boolean') {
      updateData.habilita_nfsen_homologacao = habilita_nfsen_homologacao;
    }
    if (typeof habilita_nfsen_producao === 'boolean') {
      updateData.habilita_nfsen_producao = habilita_nfsen_producao;
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('Nenhuma configuração de documento fiscal fornecida');
    }
    
    // Atualizar empresa
    const result = await updateCompanyInFocusNFe(
      credentials,
      empresaExistente.id,
      updateData,
      cnpj
    );
    
    return successResponse(
      result,
      'Documentos fiscais atualizados com sucesso'
    );
    
  } catch (error) {
    console.error('[handleUpdateFiscalDocuments] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar documentos fiscais',
      500
    );
  }
}

/**
 * Atualiza configurações da NF-e no Focus NFe
 */
export async function handleUpdateNFeConfig(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { serie, ultima_nfe_emitida, orientacao_danfe, opcoes_avancadas } = body;
    const environmentHeader = req.headers.get('x-environment');
    const environment = (environmentHeader || 'producao') as Environment;
    
    // Verificar integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações primeiro.');
    }
    
    // Buscar CNPJ do tenant
    const empresaData = await getTenantCompanyData(tenantId);
    if (!empresaData?.cnpj) {
      throw new Error('Dados da empresa não encontrados');
    }
    
    const cnpj = empresaData.cnpj.replace(/\D/g, '');
    
    // AIDEV-NOTE: API de empresas SEMPRE opera em produção, forçando ambiente
    const credentials = getFocusNFeCredentials('producao', true);
    const empresaExistente = await findCompanyInFocusNFe(credentials, cnpj);
    
    if (!empresaExistente?.id) {
      throw new Error('Empresa não encontrada no Focus NFe. Cadastre a empresa primeiro.');
    }
    
    // Preparar dados de atualização
    // AIDEV-NOTE: Campos devem seguir exatamente a documentação da API Focus NFe
    const updateData: Record<string, any> = {};
    
    // Série e próximo número dependem do ambiente
    if (serie) {
      if (environment === 'producao') {
        updateData.serie_nfe_producao = parseInt(serie) || 1;
      } else {
        updateData.serie_nfe_homologacao = parseInt(serie) || 1;
      }
    }
    
    if (ultima_nfe_emitida) {
      const proximoNumero = parseInt(ultima_nfe_emitida) || 1;
      if (environment === 'producao') {
        updateData.proximo_numero_nfe_producao = proximoNumero;
      } else {
        updateData.proximo_numero_nfe_homologacao = proximoNumero;
      }
    }
    
    // Orientação DANFe: "portrait" ou "landscape" (não "retrato" ou "paisagem")
    if (orientacao_danfe) {
      const orientacaoMap: Record<string, string> = {
        'retrato': 'portrait',
        'paisagem': 'landscape',
        'portrait': 'portrait',
        'landscape': 'landscape'
      };
      updateData.orientacao_danfe = orientacaoMap[orientacao_danfe.toLowerCase()] || orientacao_danfe;
    }
    
    // Mapear opções avançadas conforme documentação oficial
    if (opcoes_avancadas) {
      // Campos que existem na documentação
      if (opcoes_avancadas.exibirRecibo !== undefined) {
        updateData.recibo_danfe = opcoes_avancadas.exibirRecibo;
      }
      
      if (opcoes_avancadas.exibirUnidadeTributaria !== undefined) {
        updateData.exibe_unidade_tributaria_danfe = opcoes_avancadas.exibirUnidadeTributaria;
      }
      
      if (opcoes_avancadas.imprimirSempreColunasIpi !== undefined) {
        updateData.exibe_sempre_ipi_danfe = opcoes_avancadas.imprimirSempreColunasIpi;
      }
      
      if (opcoes_avancadas.mostraDadosIssqn !== undefined) {
        updateData.exibe_issqn_danfe = opcoes_avancadas.mostraDadosIssqn;
      }
      
      if (opcoes_avancadas.imprimirImpostosAdicionais !== undefined) {
        updateData.exibe_impostos_adicionais_danfe = opcoes_avancadas.imprimirImpostosAdicionais;
      }
      
      if (opcoes_avancadas.sempreMostrarVolumes !== undefined) {
        updateData.exibe_sempre_volumes_danfe = opcoes_avancadas.sempreMostrarVolumes;
      }
      
      // Campos adicionais - verificar se existem na API
      // AIDEV-NOTE: Esses campos podem não existir na API do Focus NFe
      // Se a API rejeitar, vamos logar o erro específico
      if (opcoes_avancadas.exibirDescontoPorItem !== undefined) {
        // Tentar nome baseado no padrão da API (exibe_*_danfe)
        updateData.exibe_desconto_por_item_danfe = opcoes_avancadas.exibirDescontoPorItem;
      }
      
      if (opcoes_avancadas.exibirSecaoFaturas !== undefined) {
        // Tentar nome baseado no padrão da API (exibe_*_danfe)
        updateData.exibe_secao_faturas_danfe = opcoes_avancadas.exibirSecaoFaturas;
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      throw new Error('Nenhuma configuração fornecida');
    }
    
    console.log('[handleUpdateNFeConfig] Dados a serem enviados:', {
      empresa_id: empresaExistente.id,
      cnpj: cnpj.substring(0, 8) + '****',
      updateData,
      environment
    });
    
    // Tentar atualizar (pode não aceitar todos os campos)
    try {
      const result = await updateCompanyInFocusNFe(
        credentials,
        empresaExistente.id,
        updateData,
        cnpj
      );
      
      console.log('[handleUpdateNFeConfig] Sucesso ao atualizar:', result);
      
      return successResponse(
        {
          ...result,
          synchronized: true,
          fields_sent: Object.keys(updateData)
        },
        'Configurações da NF-e atualizadas com sucesso no Focus NFe'
      );
    } catch (error: any) {
      // AIDEV-NOTE: Se a API não aceitar alguns campos, tentar novamente sem os campos problemáticos
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error?.response || error?.body || {};
      const errorString = JSON.stringify(errorDetails).toLowerCase();
      
      // Verificar se o erro menciona os campos problemáticos
      const camposProblematicos = ['desconto', 'faturas', 'exibe_desconto', 'exibe_secao'];
      const temCampoProblematico = camposProblematicos.some(campo => errorString.includes(campo));
      
      if (temCampoProblematico) {
        console.warn('[handleUpdateNFeConfig] Campos problemáticos detectados, tentando sem eles:', {
          error: errorMessage,
          campos_removidos: ['exibe_desconto_por_item_danfe', 'exibe_secao_faturas_danfe']
        });
        
        // Criar novo objeto sem os campos problemáticos
        const updateDataSemProblemas = { ...updateData };
        delete updateDataSemProblemas.exibe_desconto_por_item_danfe;
        delete updateDataSemProblemas.exibe_secao_faturas_danfe;
        
        try {
          // Tentar novamente sem os campos problemáticos
          const result = await updateCompanyInFocusNFe(
            credentials,
            empresaExistente.id,
            updateDataSemProblemas,
            cnpj
          );
          
          console.log('[handleUpdateNFeConfig] Sucesso ao atualizar (sem campos problemáticos):', result);
          
          return successResponse(
            {
              ...result,
              synchronized: true,
              fields_sent: Object.keys(updateDataSemProblemas),
              fields_ignored: ['exibe_desconto_por_item_danfe', 'exibe_secao_faturas_danfe'],
              warning: 'Alguns campos podem não ser suportados pela API Focus NFe'
            },
            'Configurações atualizadas no Focus NFe. Alguns campos podem não ser suportados.'
          );
        } catch (retryError: any) {
          // Se ainda falhar, retornar erro original
          console.error('[handleUpdateNFeConfig] Erro mesmo sem campos problemáticos:', retryError);
        }
      }
      
      console.error('[handleUpdateNFeConfig] Erro ao atualizar no Focus NFe:', {
        error: errorMessage,
        details: errorDetails,
        updateData,
        empresa_id: empresaExistente.id
      });
      
      return successResponse(
        {
          warning: errorMessage,
          error_details: errorDetails,
          fields_attempted: Object.keys(updateData),
          synchronized: false
        },
        `Configurações salvas localmente. Erro ao sincronizar com Focus NFe: ${errorMessage}`
      );
    }
    
  } catch (error) {
    console.error('[handleUpdateNFeConfig] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar configurações da NF-e',
      500
    );
  }
}

/**
 * Atualiza configurações da NFSe no Focus NFe
 */
export async function handleUpdateNFSeConfig(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { 
      serie_rps_homologacao,
      proximo_numero_rps_homologacao,
      serie_rps_producao,
      proximo_numero_rps_producao,
      prefeitura_usuario,
      prefeitura_senha,
      arquivo_certificado_base64,
      senha_certificado
    } = body;
    
    // AIDEV-NOTE: Verificar se há pelo menos uma integração ativa
    // Mas vamos tentar atualizar ambos os ambientes se os dados forem fornecidos
    const isActiveHomologacao = await checkTenantIntegration(tenantId, 'homologacao');
    const isActiveProducao = await checkTenantIntegration(tenantId, 'producao');
    
    if (!isActiveHomologacao && !isActiveProducao) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações primeiro.');
    }
    
    // AIDEV-NOTE: Se pelo menos um ambiente estiver ativo, tentar atualizar ambos se os dados forem fornecidos
    // O frontend sempre envia dados para ambos os ambientes, então vamos tentar atualizar ambos
    
    // Buscar CNPJ do tenant
    const empresaData = await getTenantCompanyData(tenantId);
    if (!empresaData?.cnpj) {
      throw new Error('Dados da empresa não encontrados');
    }
    
    const cnpj = empresaData.cnpj.replace(/\D/g, '');
    
    const results: any = {};
    
    // AIDEV-NOTE: Focus NFe - API de Empresas opera EXCLUSIVAMENTE em produção
    // A empresa é única e criada apenas em produção
    // Uma vez criada, pode emitir documentos em ambos os ambientes
    // Os campos como serie_nfse_homologacao e serie_nfse_producao são campos da mesma empresa
    
    console.log('[handleUpdateNFSeConfig] Dados recebidos do frontend:', {
      isActiveHomologacao,
      isActiveProducao,
      serie_rps_homologacao: `${serie_rps_homologacao} (tipo: ${typeof serie_rps_homologacao})`,
      proximo_numero_rps_homologacao: `${proximo_numero_rps_homologacao} (tipo: ${typeof proximo_numero_rps_homologacao})`,
      serie_rps_producao: `${serie_rps_producao} (tipo: ${typeof serie_rps_producao})`,
      proximo_numero_rps_producao: `${proximo_numero_rps_producao} (tipo: ${typeof proximo_numero_rps_producao})`,
      body_completo: body
    });
    
    // AIDEV-NOTE: Buscar empresa APENAS em produção (API de empresas só funciona em produção)
    // forceEnvironment=true ignora a variável FOCUSNFE_ENVIRONMENT e SEMPRE usa produção
    const credentialsProducao = getFocusNFeCredentials('producao', true);
    
    let empresaId: string | null = null;
    try {
      const empresa = await findCompanyInFocusNFe(credentialsProducao, cnpj);
      if (empresa?.id) {
        empresaId = empresa.id;
        console.log('[handleUpdateNFSeConfig] Empresa encontrada em produção:', empresaId);
      }
    } catch (error: any) {
      console.error('[handleUpdateNFSeConfig] Erro ao buscar empresa:', error);
    }
    
    if (!empresaId) {
      throw new Error('Empresa não encontrada no Focus NFe. É necessário criar a empresa primeiro no ambiente de produção.');
    }
    
    // AIDEV-NOTE: Enviar TODOS os campos em uma única requisição
    // A API Focus NFe de empresas sempre opera em produção
    // Os campos de homologação e produção são da mesma empresa
    const updateData: Record<string, any> = {};
    
    // AIDEV-NOTE: Conforme documentação Focus NFe, TODOS os campos são NUMÉRICOS:
    // - serie_nfse_producao: numérico
    // - serie_nfse_homologacao: numérico
    // - proximo_numero_nfse_producao: numérico
    // - proximo_numero_nfse_homologacao: numérico
    
    // Campos de produção
    if (serie_rps_producao !== undefined && serie_rps_producao !== null) {
      const serieStr = String(serie_rps_producao).trim();
      if (serieStr !== '') {
        const serieValue = parseInt(serieStr);
        if (!isNaN(serieValue) && serieValue >= 0) {
          updateData.serie_nfse_producao = serieValue; // NUMÉRICO
          console.log('[handleUpdateNFSeConfig] serie_nfse_producao:', serieValue, '(tipo:', typeof serieValue, ')');
        }
      }
    }
    if (proximo_numero_rps_producao !== undefined && proximo_numero_rps_producao !== null) {
      const proximoStr = String(proximo_numero_rps_producao).trim();
      if (proximoStr !== '') {
        const proximoValue = parseInt(proximoStr);
        if (!isNaN(proximoValue) && proximoValue >= 0) {
          updateData.proximo_numero_nfse_producao = proximoValue; // NUMÉRICO
          console.log('[handleUpdateNFSeConfig] proximo_numero_nfse_producao:', proximoValue, '(tipo:', typeof proximoValue, ')');
        }
      }
    }
    
    // Campos de homologação
    if (serie_rps_homologacao !== undefined && serie_rps_homologacao !== null) {
      const serieStr = String(serie_rps_homologacao).trim();
      if (serieStr !== '') {
        const serieValue = parseInt(serieStr);
        if (!isNaN(serieValue) && serieValue >= 0) {
          updateData.serie_nfse_homologacao = serieValue; // NUMÉRICO
          console.log('[handleUpdateNFSeConfig] serie_nfse_homologacao:', serieValue, '(tipo:', typeof serieValue, ')');
        }
      }
    }
    if (proximo_numero_rps_homologacao !== undefined && proximo_numero_rps_homologacao !== null) {
      const proximoStr = String(proximo_numero_rps_homologacao).trim();
      if (proximoStr !== '') {
        const proximoValue = parseInt(proximoStr);
        if (!isNaN(proximoValue) && proximoValue >= 0) {
          updateData.proximo_numero_nfse_homologacao = proximoValue; // NUMÉRICO
          console.log('[handleUpdateNFSeConfig] proximo_numero_nfse_homologacao:', proximoValue, '(tipo:', typeof proximoValue, ')');
        }
      }
    }
    
    // AIDEV-NOTE: Credenciais da prefeitura - usar nomes corretos da API Focus NFe
    // Documentação: login_responsavel e senha_responsavel
    // IMPORTANTE: NUNCA adicionar prefeitura_usuario/prefeitura_senha ao updateData
    // Sempre usar login_responsavel e senha_responsavel
    
    // AIDEV-NOTE: Log ANTES da conversão - verificar estado do updateData
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES da conversão - updateData keys:', Object.keys(updateData));
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES da conversão - updateData tem prefeitura_usuario?', 'prefeitura_usuario' in updateData);
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES da conversão - updateData tem prefeitura_senha?', 'prefeitura_senha' in updateData);
    
    // AIDEV-NOTE: Log dos valores recebidos para debug
    console.log('[handleUpdateNFSeConfig] Valores recebidos do body:', {
      prefeitura_usuario: prefeitura_usuario ? '***preenchido***' : 'vazio/undefined',
      prefeitura_usuario_tipo: typeof prefeitura_usuario,
      prefeitura_usuario_valor: prefeitura_usuario,
      prefeitura_senha: prefeitura_senha ? '***preenchido***' : 'vazio/undefined',
      prefeitura_senha_tipo: typeof prefeitura_senha
    });
    
    // AIDEV-NOTE: Converter SEMPRE que houver valor (mesmo que seja string vazia, mas não undefined/null)
    if (prefeitura_usuario !== undefined && prefeitura_usuario !== null) {
      // AIDEV-NOTE: Converter mesmo se for string vazia (API pode precisar limpar o campo)
      updateData.login_responsavel = String(prefeitura_usuario).trim();
      console.log('[handleUpdateNFSeConfig] ✅ Convertendo prefeitura_usuario para login_responsavel:', updateData.login_responsavel);
    } else {
      console.log('[handleUpdateNFSeConfig] ⚠️ prefeitura_usuario é undefined/null, não convertendo');
    }
    
    if (prefeitura_senha !== undefined && prefeitura_senha !== null) {
      // AIDEV-NOTE: Converter mesmo se for string vazia (API pode precisar limpar o campo)
      updateData.senha_responsavel = String(prefeitura_senha).trim();
      console.log('[handleUpdateNFSeConfig] ✅ Convertendo prefeitura_senha para senha_responsavel: ***senha***');
    } else {
      console.log('[handleUpdateNFSeConfig] ⚠️ prefeitura_senha é undefined/null, não convertendo');
    }
    
    // AIDEV-NOTE: Garantir que campos antigos NUNCA sejam adicionados ao updateData
    // Se por algum motivo foram adicionados, remover imediatamente
    if ('prefeitura_usuario' in updateData) {
      console.error('[handleUpdateNFSeConfig] ❌ ERRO: prefeitura_usuario encontrado em updateData, removendo!');
      delete updateData.prefeitura_usuario;
    }
    if ('prefeitura_senha' in updateData) {
      console.error('[handleUpdateNFSeConfig] ❌ ERRO: prefeitura_senha encontrado em updateData, removendo!');
      delete updateData.prefeitura_senha;
    }
    
    // AIDEV-NOTE: Log final do updateData após conversão
    console.log('[handleUpdateNFSeConfig] updateData após conversão:', {
      tem_login_responsavel: 'login_responsavel' in updateData,
      login_responsavel_valor: updateData.login_responsavel || 'vazio',
      tem_senha_responsavel: 'senha_responsavel' in updateData,
      tem_prefeitura_usuario: 'prefeitura_usuario' in updateData,
      tem_prefeitura_senha: 'prefeitura_senha' in updateData,
      todas_as_keys: Object.keys(updateData)
    });
    
    // AIDEV-NOTE: Certificado digital - arquivo em base64 e senha
    // Documentação: arquivo_certificado_base64 e senha_certificado
    if (arquivo_certificado_base64 !== undefined) {
      updateData.arquivo_certificado_base64 = arquivo_certificado_base64;
    }
    if (senha_certificado !== undefined) {
      updateData.senha_certificado = senha_certificado;
    }
    
    // AIDEV-NOTE: Log ANTES de criar camposParaEnviar - verificar estado final do updateData
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData keys:', Object.keys(updateData));
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData tem prefeitura_usuario?', 'prefeitura_usuario' in updateData);
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData tem prefeitura_senha?', 'prefeitura_senha' in updateData);
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData tem login_responsavel?', 'login_responsavel' in updateData);
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData tem senha_responsavel?', 'senha_responsavel' in updateData);
    console.log('[handleUpdateNFSeConfig] 🔍 ANTES de criar camposParaEnviar - updateData completo:', JSON.stringify({
      ...updateData,
      login_responsavel: updateData.login_responsavel || 'vazio',
      senha_responsavel: updateData.senha_responsavel ? '***senha***' : 'vazio',
      prefeitura_usuario: updateData.prefeitura_usuario || 'vazio',
      prefeitura_senha: updateData.prefeitura_senha ? '***senha***' : 'vazio'
    }, null, 2));
    
    // AIDEV-NOTE: Criar objeto limpo sem campos antigos (prefeitura_usuario/prefeitura_senha)
    // IMPORTANTE: Criar apenas UMA vez e usar em todo o código
    const camposParaEnviar: Record<string, any> = {};
    
    // Copiar apenas os campos válidos, excluindo campos antigos
    Object.keys(updateData).forEach(key => {
      // AIDEV-NOTE: Ignorar campos antigos (prefeitura_usuario/prefeitura_senha)
      if (key !== 'prefeitura_usuario' && key !== 'prefeitura_senha') {
        camposParaEnviar[key] = updateData[key];
      } else {
        console.warn(`[handleUpdateNFSeConfig] ⚠️ Campo antigo '${key}' detectado e ignorado ao criar camposParaEnviar`);
      }
    });
    
    // AIDEV-NOTE: Log APÓS criar camposParaEnviar - verificar estado final
    console.log('[handleUpdateNFSeConfig] 🔍 APÓS criar camposParaEnviar - camposParaEnviar keys:', Object.keys(camposParaEnviar));
    console.log('[handleUpdateNFSeConfig] 🔍 APÓS criar camposParaEnviar - camposParaEnviar tem prefeitura_usuario?', 'prefeitura_usuario' in camposParaEnviar);
    console.log('[handleUpdateNFSeConfig] 🔍 APÓS criar camposParaEnviar - camposParaEnviar tem prefeitura_senha?', 'prefeitura_senha' in camposParaEnviar);
    console.log('[handleUpdateNFSeConfig] 🔍 APÓS criar camposParaEnviar - camposParaEnviar tem login_responsavel?', 'login_responsavel' in camposParaEnviar);
    console.log('[handleUpdateNFSeConfig] 🔍 APÓS criar camposParaEnviar - camposParaEnviar tem senha_responsavel?', 'senha_responsavel' in camposParaEnviar);
    
    // AIDEV-NOTE: Garantir que campos corretos estejam presentes
    // Se login_responsavel/senha_responsavel foram adicionados ao updateData, já estarão em camposParaEnviar
    // Mas garantir que não há campos antigos
    
    console.log('[handleUpdateNFSeConfig] Payload completo para Focus NFe:', {
      empresaId,
      cnpj: cnpj.replace(/\D/g, ''),
      updateData_original_keys: Object.keys(updateData),
      updateData_original_has_prefeitura_usuario: 'prefeitura_usuario' in updateData,
      updateData_original_has_prefeitura_senha: 'prefeitura_senha' in updateData,
      updateData_original_has_login_responsavel: 'login_responsavel' in updateData,
      updateData_original_has_senha_responsavel: 'senha_responsavel' in updateData,
      camposParaEnviar_keys: Object.keys(camposParaEnviar),
      camposParaEnviar,
      tiposCampos: {
        serie_nfse_producao: typeof camposParaEnviar.serie_nfse_producao,
        proximo_numero_nfse_producao: typeof camposParaEnviar.proximo_numero_nfse_producao,
        serie_nfse_homologacao: typeof camposParaEnviar.serie_nfse_homologacao,
        proximo_numero_nfse_homologacao: typeof camposParaEnviar.proximo_numero_nfse_homologacao,
        login_responsavel: typeof camposParaEnviar.login_responsavel,
        senha_responsavel: typeof camposParaEnviar.senha_responsavel,
        arquivo_certificado_base64: typeof camposParaEnviar.arquivo_certificado_base64,
        senha_certificado: typeof camposParaEnviar.senha_certificado
      },
      // AIDEV-NOTE: Log seguro (sem expor senhas)
      credenciais_prefeitura: {
        tem_login: !!camposParaEnviar.login_responsavel,
        tem_senha: !!camposParaEnviar.senha_responsavel,
        login_value: camposParaEnviar.login_responsavel || 'vazio'
      },
      certificado: {
        tem_arquivo: !!camposParaEnviar.arquivo_certificado_base64,
        tem_senha: !!camposParaEnviar.senha_certificado
      }
    });
    
    // AIDEV-NOTE: Enviar tudo em uma única requisição para a API de produção
    try {
      // AIDEV-NOTE: Verificação final - garantir que campos antigos NÃO estejam em camposParaEnviar
      if ('prefeitura_usuario' in camposParaEnviar) {
        console.error('[handleUpdateNFSeConfig] ERRO CRÍTICO: prefeitura_usuario encontrado em camposParaEnviar! Removendo...');
        delete camposParaEnviar.prefeitura_usuario;
      }
      if ('prefeitura_senha' in camposParaEnviar) {
        console.error('[handleUpdateNFSeConfig] ERRO CRÍTICO: prefeitura_senha encontrado em camposParaEnviar! Removendo...');
        delete camposParaEnviar.prefeitura_senha;
      }
      
      if (Object.keys(camposParaEnviar).length > 0) {
        // AIDEV-NOTE: Log do payload REAL que será enviado (sem mascarar para debug)
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe - camposParaEnviar keys:', Object.keys(camposParaEnviar));
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe - tem login_responsavel:', 'login_responsavel' in camposParaEnviar);
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe - tem senha_responsavel:', 'senha_responsavel' in camposParaEnviar);
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe - tem prefeitura_usuario:', 'prefeitura_usuario' in camposParaEnviar);
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe - tem prefeitura_senha:', 'prefeitura_senha' in camposParaEnviar);
        console.log('[handleUpdateNFSeConfig] Enviando para Focus NFe:', JSON.stringify({
          ...camposParaEnviar,
          login_responsavel: camposParaEnviar.login_responsavel ? '***preenchido***' : undefined,
          senha_responsavel: camposParaEnviar.senha_responsavel ? '***preenchido***' : undefined,
          arquivo_certificado_base64: camposParaEnviar.arquivo_certificado_base64 ? '***base64***' : undefined,
          senha_certificado: camposParaEnviar.senha_certificado ? '***senha***' : undefined,
        }, null, 2));
        
        const result = await updateCompanyInFocusNFe(
          credentialsProducao,
          empresaId,
          camposParaEnviar,
          cnpj
        );
        
        // Verificar se os campos foram atualizados
        console.log('[handleUpdateNFSeConfig] Resposta da API:', {
          serie_nfse_homologacao_enviado: camposParaEnviar.serie_nfse_homologacao,
          serie_nfse_homologacao_retornado: result.serie_nfse_homologacao,
          proximo_numero_nfse_homologacao_enviado: camposParaEnviar.proximo_numero_nfse_homologacao,
          proximo_numero_nfse_homologacao_retornado: result.proximo_numero_nfse_homologacao,
          serie_nfse_producao_enviado: camposParaEnviar.serie_nfse_producao,
          serie_nfse_producao_retornado: result.serie_nfse_producao,
          proximo_numero_nfse_producao_enviado: camposParaEnviar.proximo_numero_nfse_producao,
          proximo_numero_nfse_producao_retornado: result.proximo_numero_nfse_producao,
          login_responsavel_enviado: camposParaEnviar.login_responsavel ? '***preenchido***' : 'vazio',
          login_responsavel_retornado: result.login_responsavel || 'vazio',
          senha_responsavel_enviado: camposParaEnviar.senha_responsavel ? '***preenchido***' : 'vazio',
          senha_responsavel_preenchida_retornado: result.senha_responsavel_preenchida || false
        });
        
        results.producao = { success: true, ...result };
        results.homologacao = { success: true, ...result };
        
        console.log('[handleUpdateNFSeConfig] Sucesso ao atualizar empresa:', result);
      } else {
        results.producao = { success: true, message: 'Nenhum campo para atualizar' };
        results.homologacao = { success: true, message: 'Nenhum campo para atualizar' };
      }
      
    } catch (error: any) {
      console.error('[handleUpdateNFSeConfig] Erro ao atualizar empresa:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.producao = { success: false, error: errorMessage };
      results.homologacao = { success: false, error: errorMessage };
    }
    
    return successResponse(
      results,
      'Configurações da NFSe atualizadas com sucesso no Focus NFe'
    );
    
  } catch (error) {
    console.error('[handleUpdateNFSeConfig] Erro:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao atualizar configurações da NFSe',
      500
    );
  }
}

