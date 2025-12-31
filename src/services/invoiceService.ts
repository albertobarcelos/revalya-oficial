import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { edgeFunctionService } from './edgeFunctionService';
import type {
  EmitNFeRequest,
  EmitNFSeRequest,
  NFePayload,
  NFSePayload,
  EmitInvoiceResponse,
  ConsultStatusResponse,
  RevalyaEmitente,
  RevalyaCliente,
  RevalyaServico
} from '@/types/focusnfe';

type FinanceEntry = Database['public']['Tables']['finance_entries']['Row'];
type Charge = Database['public']['Tables']['charges']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Contract = Database['public']['Tables']['contracts']['Row'];

export interface InvoiceData {
  customer: {
    name: string;
    email: string;
    document: string; // CPF/CNPJ
    phone?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipcode: string;
    };
  };
  services: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    service_code?: string;
    iss_rate?: number;
  }>;
  total_amount: number;
  iss_amount?: number;
  net_amount: number;
  due_date: string;
  reference_period?: string;
  observations?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoice_id?: string;
  external_id?: string;
  invoice_number?: string;
  pdf_url?: string;
  xml_url?: string;
  verification_code?: string;
  error?: string;
  provider_response?: any;
}

export interface InvoiceProvider {
  name: string;
  createInvoice(data: InvoiceData): Promise<InvoiceResponse>;
  getInvoice(external_id: string): Promise<InvoiceResponse>;
  cancelInvoice(external_id: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Provider para Omie
 */
class OmieInvoiceProvider implements InvoiceProvider {
  name = 'omie';
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://app.omie.com.br/api/v1';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async createInvoice(data: InvoiceData): Promise<InvoiceResponse> {
    try {
      const payload = {
        call: 'IncluirNFS',
        app_key: this.apiKey,
        app_secret: this.apiSecret,
        param: [{
          cabecalho: {
            cCodIntServ: `SRV_${Date.now()}`,
            dDtEmissao: new Date().toISOString().split('T')[0],
            dDtVencimento: data.due_date,
            cTomadorRazaoSocial: data.customer.name,
            cTomadorCNPJ: data.customer.document,
            cTomadorEmail: data.customer.email,
            cTomadorTelefone: data.customer.phone || '',
            nValorServicos: data.total_amount,
            nValorISS: data.iss_amount || 0,
            nValorLiquido: data.net_amount,
            cObservacoes: data.observations || ''
          },
          servicos: data.services.map(service => ({
            cDescricao: service.description,
            nQuantidade: service.quantity,
            nValorUnitario: service.unit_price,
            nValorTotal: service.total_price,
            cCodServ: service.service_code || '01.01'
          }))
        }]
      };

      const response = await fetch(`${this.baseUrl}/servicos/nfs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.faultstring) {
        throw new Error(result.faultstring);
      }

      return {
        success: true,
        external_id: result.cCodIntServ,
        invoice_number: result.cNumero,
        verification_code: result.cCodVerificacao,
        pdf_url: result.cLinkPDF,
        provider_response: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFS-e via Omie'
      };
    }
  }

  async getInvoice(external_id: string): Promise<InvoiceResponse> {
    try {
      const payload = {
        call: 'ConsultarNFS',
        app_key: this.apiKey,
        app_secret: this.apiSecret,
        param: [{
          cCodIntServ: external_id
        }]
      };

      const response = await fetch(`${this.baseUrl}/servicos/nfs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.faultstring) {
        throw new Error(result.faultstring);
      }

      return {
        success: true,
        external_id: result.cCodIntServ,
        invoice_number: result.cNumero,
        verification_code: result.cCodVerificacao,
        pdf_url: result.cLinkPDF,
        provider_response: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar NFS-e via Omie'
      };
    }
  }

  async cancelInvoice(external_id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        call: 'CancelarNFS',
        app_key: this.apiKey,
        app_secret: this.apiSecret,
        param: [{
          cCodIntServ: external_id,
          cMotivoCancelamento: 'Cancelamento solicitado pelo cliente'
        }]
      };

      const response = await fetch(`${this.baseUrl}/servicos/nfs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.faultstring) {
        throw new Error(result.faultstring);
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar NFS-e via Omie'
      };
    }
  }
}

/**
 * Provider para FocusNFe
 * AIDEV-NOTE: Suporta emissão de NFe e NFSe via Edge Function
 */
class FocusNFeProvider implements InvoiceProvider {
  name = 'focusnfe';
  private tenantId?: string;
  private environment: 'homologacao' | 'producao' = 'producao';

  constructor(tenantId?: string, environment: 'homologacao' | 'producao' = 'producao') {
    this.tenantId = tenantId;
    this.environment = environment;
  }

  /**
   * AIDEV-NOTE: Emite NFSe (Nota Fiscal de Serviços)
   * Mapeia dados do Revalya para formato FocusNFe
   */
  async createInvoice(data: InvoiceData): Promise<InvoiceResponse> {
    try {
      // AIDEV-NOTE: Buscar dados do emitente (empresa)
      const emitente = await this.getEmitenteData();
      if (!emitente) {
        throw new Error('Dados da empresa não configurados. Configure em Configurações > Dados da Empresa');
      }

      // AIDEV-NOTE: Gerar referência única
      const referencia = `NFSE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // AIDEV-NOTE: Mapear dados para formato FocusNFe
      const dados_nfse: NFSePayload = {
        data_emissao: new Date().toISOString(),
        natureza_operacao: '1', // 1=Tributação no município
        optante_simples_nacional: emitente.fiscal?.regime_tributario === 'simples_nacional',
        incentivador_cultural: false,
        status: '1', // 1=Normal

        prestador: {
          cnpj: emitente.cnpj.replace(/\D/g, ''),
          inscricao_municipal: emitente.inscricao_municipal || '',
          codigo_municipio: this.getCodigoMunicipioIBGE(emitente.endereco.cidade, emitente.endereco.uf)
        },

        tomador: {
          cpf: data.customer.document.length === 11 ? data.customer.document : undefined,
          cnpj: data.customer.document.length === 14 ? data.customer.document : undefined,
          razao_social: data.customer.name,
          email: data.customer.email,
          telefone: data.customer.phone,
          endereco: {
            logradouro: data.customer.address?.street || '',
            numero: data.customer.address?.number || 'S/N',
            complemento: data.customer.address?.complement,
            bairro: data.customer.address?.neighborhood || '',
            codigo_municipio: this.getCodigoMunicipioIBGE(
              data.customer.address?.city || '',
              data.customer.address?.state || ''
            ),
            uf: data.customer.address?.state || '',
            cep: data.customer.address?.zipcode?.replace(/\D/g, '') || ''
          }
        },

        servico: {
          aliquota: data.iss_amount && data.total_amount > 0 
            ? data.iss_amount / data.total_amount 
            : 0.05, // Padrão 5%
          discriminacao: this.buildDiscriminacaoServicos(data.services),
          iss_retido: false,
          item_lista_servico: data.services[0]?.service_code || '14.01', // Padrão
          valor_servicos: data.total_amount,
          codigo_municipio: emitente.endereco.cidade 
            ? this.getCodigoMunicipioIBGE(emitente.endereco.cidade, emitente.endereco.uf)
            : ''
        }
      };

      // AIDEV-NOTE: Chamar Edge Function
      const response = await edgeFunctionService.callEdgeFunction<EmitNFSeRequest, EmitInvoiceResponse>(
        'focusnfe/nfse/emit',
        {
          referencia,
          dados_nfse,
          environment: this.environment,
          tenant_id: this.tenantId
        },
        this.tenantId
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erro ao emitir NFSe'
        };
      }

      return {
        success: true,
        external_id: response.referencia,
        invoice_number: response.numero,
        verification_code: response.codigo_verificacao,
        pdf_url: response.caminho_pdf,
        xml_url: response.caminho_xml_nota_fiscal,
        provider_response: response
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFSe via FocusNFe'
      };
    }
  }

  /**
   * AIDEV-NOTE: Emite NFe (Nota Fiscal Eletrônica) - Nova funcionalidade
   */
  async createNFe(
    produtos: Array<{
      id: string;
      name: string;
      ncm: string;
      cfop: string;
      unidade: string;
      quantidade: number;
      valor_unitario: number;
      origem?: string;
      cst_icms?: string;
      cst_pis?: string;
      cst_cofins?: string;
    }>,
    cliente: RevalyaCliente,
    naturezaOperacao: string = 'Venda de mercadoria'
  ): Promise<InvoiceResponse> {
    try {
      const emitente = await this.getEmitenteData();
      if (!emitente) {
        throw new Error('Dados da empresa não configurados');
      }

      const referencia = `NFE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const dados_nfe: NFePayload = {
        natureza_operacao: naturezaOperacao,
        data_emissao: new Date().toISOString(),
        tipo_documento: '1', // 1=Saída
        finalidade_emissao: '1', // 1=Normal
        consumidor_final: '0',
        indicador_presenca: '1', // 1=Presencial

        cnpj_emitente: emitente.cnpj.replace(/\D/g, ''),

        cnpj_destinatario: cliente.cpf_cnpj.length === 14 ? cliente.cpf_cnpj : undefined,
        cpf_destinatario: cliente.cpf_cnpj.length === 11 ? cliente.cpf_cnpj : undefined,
        nome_destinatario: cliente.name,
        indicador_inscricao_estadual_destinatario: '9', // 9=Não contribuinte
        endereco_destinatario: {
          logradouro: cliente.address || '',
          numero: cliente.address_number || 'S/N',
          complemento: cliente.complement,
          bairro: cliente.neighborhood || '',
          municipio: cliente.city || '',
          uf: cliente.state || '',
          cep: cliente.postal_code?.replace(/\D/g, '') || ''
        },
        telefone_destinatario: cliente.phone,
        email_destinatario: cliente.email,

        produtos: produtos.map(produto => ({
          codigo: produto.id,
          descricao: produto.name,
          ncm: produto.ncm,
          cfop: produto.cfop,
          unidade: produto.unidade,
          quantidade: produto.quantidade,
          valor_unitario: produto.valor_unitario,
          icms_origem: (produto.origem || '0') as any,
          icms_situacao_tributaria: produto.cst_icms || '00',
          pis_situacao_tributaria: produto.cst_pis || '07',
          cofins_situacao_tributaria: produto.cst_cofins || '07'
        })),

        valor_total: produtos.reduce((sum, p) => sum + (p.valor_unitario * p.quantidade), 0),
        modalidade_frete: '9', // 9=Sem ocorrência de transporte

        formas_pagamento: [{
          forma_pagamento: '90', // 90=Sem pagamento
          valor_pagamento: produtos.reduce((sum, p) => sum + (p.valor_unitario * p.quantidade), 0)
        }]
      };

      const response = await edgeFunctionService.callEdgeFunction<EmitNFeRequest, EmitInvoiceResponse>(
        'focusnfe/nfe/emit',
        {
          referencia,
          dados_nfe,
          environment: this.environment,
          tenant_id: this.tenantId
        },
        this.tenantId
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erro ao emitir NFe'
        };
      }

      return {
        success: true,
        external_id: response.referencia,
        invoice_number: response.numero,
        verification_code: response.chave_nfe,
        pdf_url: response.caminho_danfe,
        xml_url: response.caminho_xml_nota_fiscal,
        provider_response: response
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFe via FocusNFe'
      };
    }
  }

  async getInvoice(external_id: string): Promise<InvoiceResponse> {
    try {
      const response = await edgeFunctionService.callEdgeFunction<{ referencia: string }, ConsultStatusResponse>(
        `focusnfe/nfse/${external_id}`,
        { referencia: external_id },
        this.tenantId,
        { method: 'GET' }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Erro ao consultar nota'
        };
      }

      return {
        success: true,
        external_id: response.referencia,
        invoice_number: response.numero,
        verification_code: response.codigo_verificacao || response.chave_nfe,
        pdf_url: response.caminho_pdf || response.caminho_danfe,
        xml_url: response.caminho_xml_nota_fiscal,
        provider_response: response
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar nota via FocusNFe'
      };
    }
  }

  async cancelInvoice(external_id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implementar cancelamento quando handler estiver pronto
      return {
        success: false,
        error: 'Cancelamento ainda não implementado'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar nota via FocusNFe'
      };
    }
  }

  /**
   * AIDEV-NOTE: Buscar dados do emitente (empresa) do tenant
   */
  private async getEmitenteData(): Promise<RevalyaEmitente | null> {
    if (!this.tenantId) {
      return null;
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('company_data')
      .eq('id', this.tenantId)
      .single();

    if (error || !data?.company_data) {
      return null;
    }

    return data.company_data as RevalyaEmitente;
  }

  /**
   * AIDEV-NOTE: Construir discriminação dos serviços para NFSe
   */
  private buildDiscriminacaoServicos(services: InvoiceData['services']): string {
    return services
      .map(s => `${s.description} - Qtd: ${s.quantity} - Valor Unit: R$ ${s.unit_price.toFixed(2)} - Total: R$ ${s.total_price.toFixed(2)}`)
      .join(' | ');
  }

  /**
   * AIDEV-NOTE: Obter código IBGE do município (simplificado)
   * Em produção, usar tabela de referência ou API
   */
  private getCodigoMunicipioIBGE(cidade: string, uf: string): string {
    // TODO: Implementar busca em tabela de referência
    // Por enquanto, retorna código padrão de São Paulo
    if (cidade.toLowerCase().includes('são paulo') && uf === 'SP') {
      return '3550308';
    }
    // Retornar código vazio se não encontrar (será validado pela FocusNFe)
    return '';
  }
}

/**
 * Provider para NFSe.io
 */
class NFSeIoProvider implements InvoiceProvider {
  name = 'nfse_io';
  private apiKey: string;
  private baseUrl = 'https://api.nfse.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createInvoice(data: InvoiceData): Promise<InvoiceResponse> {
    try {
      const payload = {
        borrower: {
          federalTaxNumber: data.customer.document,
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone
        },
        services: data.services.map(service => ({
          description: service.description,
          servicesAmount: service.total_price,
          quantity: service.quantity
        })),
        servicesAmount: data.total_amount,
        issAmount: data.iss_amount || 0
      };

      const response = await fetch(`${this.baseUrl}/companies/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro na API NFSe.io');
      }

      return {
        success: true,
        external_id: result.id,
        invoice_number: result.number,
        verification_code: result.verificationCode,
        pdf_url: result.pdfUrl,
        xml_url: result.xmlUrl,
        provider_response: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir NFS-e via NFSe.io'
      };
    }
  }

  async getInvoice(external_id: string): Promise<InvoiceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/invoices/${external_id}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro na API NFSe.io');
      }

      return {
        success: true,
        external_id: result.id,
        invoice_number: result.number,
        verification_code: result.verificationCode,
        pdf_url: result.pdfUrl,
        xml_url: result.xmlUrl,
        provider_response: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar NFS-e via NFSe.io'
      };
    }
  }

  async cancelInvoice(external_id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/invoices/${external_id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Cancelamento solicitado pelo cliente'
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Erro na API NFSe.io');
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar NFS-e via NFSe.io'
      };
    }
  }
}

/**
 * Serviço principal de emissão de notas fiscais
 */
class InvoiceService {
  private providers: Map<string, InvoiceProvider> = new Map();

  constructor() {
    // Inicializar providers baseado nas configurações
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    try {
      // AIDEV-NOTE: Buscar tenant_id do contexto atual
      const { data: { user } } = await supabase.auth.getUser();
      let tenantId: string | undefined;
      
      if (user) {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (tenantUser?.tenant_id) {
          tenantId = tenantUser.tenant_id;
        }
      }

      // AIDEV-NOTE: Buscar configurações dos provedores de tenant_integrations
      if (tenantId) {
        const { data: integrations, error: integrationError } = await supabase
          .from('tenant_integrations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .in('integration_type', ['omie', 'nfse_io', 'focusnfe']);

        if (integrationError) {
          console.error('Erro ao buscar configurações de NFS-e:', integrationError);
        } else if (integrations) {
          integrations.forEach(integration => {
            const config = integration.config || {};
            
            switch (integration.integration_type) {
              case 'omie':
                if (config.api_key && config.api_secret) {
                  this.providers.set('omie', new OmieInvoiceProvider(config.api_key, config.api_secret));
                }
                break;
              case 'nfse_io':
                if (config.api_key) {
                  this.providers.set('nfse_io', new NFSeIoProvider(config.api_key));
                }
                break;
              case 'focusnfe':
                // AIDEV-NOTE: FocusNFe usa Edge Function, não precisa de api_key no frontend
                const environment = (integration.environment?.toLowerCase() === 'homologacao' 
                  ? 'homologacao' 
                  : 'producao') as 'homologacao' | 'producao';
                this.providers.set('focusnfe', new FocusNFeProvider(tenantId, environment));
                break;
            }
          });
        }
      }

    } catch (error) {
      console.error('Erro ao inicializar providers de NFS-e:', error);
    }
  }

  /**
   * Emite nota fiscal para um lançamento financeiro
   */
  async issueInvoiceForFinanceEntry(
    finance_entry_id: string,
    provider_name?: string
  ): Promise<InvoiceResponse> {
    try {
      // Buscar dados do lançamento financeiro
      const financeEntry = await this.getFinanceEntryWithRelations(finance_entry_id);
      if (!financeEntry) {
        throw new Error('Lançamento financeiro não encontrado');
      }

      // Determinar provider
      const provider = provider_name 
        ? this.providers.get(provider_name)
        : this.getDefaultProvider();

      if (!provider) {
        throw new Error(`Provider de NFS-e não configurado: ${provider_name || 'padrão'}`);
      }

      // Preparar dados da nota fiscal
      const invoiceData = await this.prepareInvoiceData(financeEntry);

      // Emitir nota fiscal
      const result = await provider.createInvoice(invoiceData);

      if (result.success) {
        // Salvar dados da nota fiscal no lançamento
        await this.saveInvoiceData(finance_entry_id, result, provider.name);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir nota fiscal'
      };
    }
  }

  /**
   * Emite nota fiscal para uma cobrança
   */
  async issueInvoiceForCharge(
    charge_id: string,
    provider_name?: string
  ): Promise<InvoiceResponse> {
    try {
      // Buscar lançamento financeiro relacionado à cobrança
      const { data: financeEntry, error } = await supabase
        .from('finance_entries')
        .select('id')
        .eq('charge_id', charge_id)
        .single();

      if (error || !financeEntry) {
        throw new Error('Lançamento financeiro não encontrado para esta cobrança');
      }

      return await this.issueInvoiceForFinanceEntry(financeEntry.id, provider_name);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao emitir nota fiscal'
      };
    }
  }

  /**
   * Consulta status de uma nota fiscal
   */
  async getInvoiceStatus(
    finance_entry_id: string
  ): Promise<InvoiceResponse> {
    try {
      // Buscar dados da nota fiscal
      const { data: financeEntry, error } = await supabase
        .from('finance_entries')
        .select('invoice_data')
        .eq('id', finance_entry_id)
        .single();

      if (error || !financeEntry?.invoice_data) {
        throw new Error('Nota fiscal não encontrada');
      }

      const invoiceData = financeEntry.invoice_data as any;
      const provider = this.providers.get(invoiceData.provider);

      if (!provider) {
        throw new Error(`Provider não configurado: ${invoiceData.provider}`);
      }

      return await provider.getInvoice(invoiceData.external_id);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao consultar nota fiscal'
      };
    }
  }

  /**
   * Cancela uma nota fiscal
   */
  async cancelInvoice(
    finance_entry_id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar dados da nota fiscal
      const { data: financeEntry, error } = await supabase
        .from('finance_entries')
        .select('invoice_data')
        .eq('id', finance_entry_id)
        .single();

      if (error || !financeEntry?.invoice_data) {
        throw new Error('Nota fiscal não encontrada');
      }

      const invoiceData = financeEntry.invoice_data as any;
      const provider = this.providers.get(invoiceData.provider);

      if (!provider) {
        throw new Error(`Provider não configurado: ${invoiceData.provider}`);
      }

      const result = await provider.cancelInvoice(invoiceData.external_id);

      if (result.success) {
        // Atualizar status no banco
        await supabase
          .from('finance_entries')
          .update({
            invoice_data: {
              ...invoiceData,
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', finance_entry_id);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar nota fiscal'
      };
    }
  }

  /**
   * Busca lançamento financeiro com relações
   */
  private async getFinanceEntryWithRelations(finance_entry_id: string): Promise<any> {
    const { data, error } = await supabase
      .from('finance_entries')
      .select(`
        *,
        customer:customers(*),
        contract:contracts(*),
        charge:charges(*)
      `)
      .eq('id', finance_entry_id)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar lançamento: ${error.message}`);
    }

    return data;
  }

  /**
   * Prepara dados para emissão da nota fiscal
   */
  private async prepareInvoiceData(financeEntry: any): Promise<InvoiceData> {
    const customer = financeEntry.contracts?.customers;
    const contract = financeEntry.contract;

    // AIDEV-NOTE: Buscar serviços do contrato usando campos atualizados
    const { data: contractServices, error } = await supabase
      .from('contract_services')
      .select(`
        *,
        service:services(*)
      `)
      .eq('contract_id', contract.id);

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    const services = contractServices?.map(cs => ({
      description: cs.service?.name || cs.description || 'Serviço',
      quantity: cs.quantity || 1,
      unit_price: cs.unit_price || financeEntry.gross_amount,
      total_price: cs.total_amount || (cs.unit_price * (cs.quantity || 1)) || financeEntry.gross_amount,
      service_code: cs.service?.code || '01.01'
    })) || [{
      description: financeEntry.description || 'Serviço prestado',
      quantity: 1,
      unit_price: financeEntry.gross_amount,
      total_price: financeEntry.gross_amount
    }];

    return {
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        phone: customer.phone
      },
      services,
      total_amount: financeEntry.gross_amount,
      iss_amount: financeEntry.tax_amount || 0,
      net_amount: financeEntry.net_amount,
      due_date: financeEntry.due_date,
      reference_period: financeEntry.reference_period,
      observations: financeEntry.notes
    };
  }

  /**
   * Salva dados da nota fiscal no lançamento
   */
  private async saveInvoiceData(
    finance_entry_id: string,
    invoiceResult: InvoiceResponse,
    provider: string
  ): Promise<void> {
    const invoiceData = {
      provider,
      external_id: invoiceResult.external_id,
      invoice_number: invoiceResult.invoice_number,
      verification_code: invoiceResult.verification_code,
      pdf_url: invoiceResult.pdf_url,
      xml_url: invoiceResult.xml_url,
      status: 'issued',
      issued_at: new Date().toISOString(),
      provider_response: invoiceResult.provider_response
    };

    const { error } = await supabase
      .from('finance_entries')
      .update({
        invoice_data: invoiceData,
        invoice_status: 'issued',
        updated_at: new Date().toISOString()
      })
      .eq('id', finance_entry_id);

    if (error) {
      throw new Error(`Erro ao salvar dados da nota fiscal: ${error.message}`);
    }
  }

  /**
   * Obtém provider padrão
   */
  private getDefaultProvider(): InvoiceProvider | undefined {
    // Prioridade: FocusNFe > Omie > NFSe.io
    return this.providers.get('focusnfe') 
      || this.providers.get('omie') 
      || this.providers.get('nfse_io');
  }

  /**
   * Lista providers disponíveis
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Reemite nota fiscal
   */
  async reissueInvoice(
    finance_entry_id: string,
    provider_name?: string
  ): Promise<InvoiceResponse> {
    // Cancelar nota atual (se existir)
    try {
      await this.cancelInvoice(finance_entry_id);
    } catch (error) {
      // Ignorar erro se não houver nota para cancelar
    }

    // Emitir nova nota
    return await this.issueInvoiceForFinanceEntry(finance_entry_id, provider_name);
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
