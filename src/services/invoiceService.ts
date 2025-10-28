import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

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
      // Buscar configurações dos provedores
      const { data: configs, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .in('provider', ['omie', 'nfse_io']);

      if (error) {
        console.error('Erro ao buscar configurações de NFS-e:', error);
        return;
      }

      configs?.forEach(config => {
        switch (config.provider) {
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
        }
      });

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
    // Prioridade: Omie > NFSe.io
    return this.providers.get('omie') || this.providers.get('nfse_io');
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
