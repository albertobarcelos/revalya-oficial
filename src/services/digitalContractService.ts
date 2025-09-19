import { format, addDays, addMonths, addYears, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { financialAuditService } from './financialAuditService';

export interface DigitalContract {
  id?: string;
  tenant_id: string;
  contract_number: string;
  contract_type: ContractType;
  title: string;
  description?: string;
  
  // Partes do contrato
  contractor_id: string; // ID do contratante
  contractee_id: string; // ID do contratado
  
  // Datas
  created_at?: string;
  start_date: Date;
  end_date?: Date;
  signature_date?: Date;
  
  // Status e controle
  status: ContractStatus;
  version: number;
  parent_contract_id?: string; // Para versionamento
  
  // Valores e condições
  total_value: number;
  currency: string;
  payment_terms: PaymentTerms;
  
  // Renovação
  auto_renewal: boolean;
  renewal_period?: RenewalPeriod;
  renewal_notice_days?: number;
  
  // Documentos e assinaturas
  document_url?: string;
  document_hash?: string;
  signatures: ContractSignature[];
  
  // Metadados
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Auditoria
  created_by: string;
  updated_by?: string;
  updated_at?: string;
}

export type ContractType = 
  | 'SERVICE_AGREEMENT'
  | 'SOFTWARE_LICENSE'
  | 'MAINTENANCE_CONTRACT'
  | 'CONSULTING_AGREEMENT'
  | 'SUBSCRIPTION_CONTRACT'
  | 'PARTNERSHIP_AGREEMENT'
  | 'NDA'
  | 'EMPLOYMENT_CONTRACT'
  | 'CUSTOM';

export type ContractStatus = 
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface PaymentTerms {
  billing_cycle: BillingCycle;
  payment_method: PaymentMethod;
  due_days: number;
  late_fee_percentage?: number;
  discount_percentage?: number;
  discount_days?: number;
}

export type BillingCycle = 
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'ANNUAL'
  | 'ONE_TIME'
  | 'CUSTOM';

export type PaymentMethod = 
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'CREDIT_CARD_RECURRING'
  | 'PIX'
  | 'BOLETO'
  | 'CHECK'
  | 'CASH';

export type RenewalPeriod = 
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'ANNUAL'
  | 'BIENNIAL';

export interface ContractSignature {
  id?: string;
  contract_id: string;
  signer_id: string;
  signer_name: string;
  signer_email: string;
  signer_role: SignerRole;
  signature_type: SignatureType;
  signature_data?: string; // Base64 ou hash da assinatura
  signed_at?: Date;
  ip_address?: string;
  user_agent?: string;
  certificate_info?: CertificateInfo;
  status: SignatureStatus;
}

export type SignerRole = 
  | 'CONTRACTOR'
  | 'CONTRACTEE'
  | 'WITNESS'
  | 'LEGAL_REPRESENTATIVE'
  | 'GUARANTOR';

export type SignatureType = 
  | 'ELECTRONIC'
  | 'DIGITAL_CERTIFICATE'
  | 'BIOMETRIC'
  | 'SMS_TOKEN'
  | 'EMAIL_CONFIRMATION';

export type SignatureStatus = 
  | 'PENDING'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED';

export interface CertificateInfo {
  issuer: string;
  subject: string;
  serial_number: string;
  valid_from: Date;
  valid_to: Date;
  fingerprint: string;
}

export interface ContractTemplate {
  id?: string;
  tenant_id: string;
  name: string;
  description?: string;
  contract_type: ContractType;
  template_content: string; // HTML ou Markdown
  variables: TemplateVariable[];
  default_payment_terms?: PaymentTerms;
  is_active: boolean;
  created_by: string;
  created_at?: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: VariableType;
  required: boolean;
  default_value?: string;
  options?: string[]; // Para tipo SELECT
  validation_regex?: string;
}

export type VariableType = 
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE'
  | 'SELECT'
  | 'BOOLEAN'
  | 'CURRENCY';

export interface ContractRenewal {
  id?: string;
  original_contract_id: string;
  new_contract_id?: string;
  renewal_type: RenewalType;
  scheduled_date: Date;
  notification_sent_at?: Date;
  status: RenewalStatus;
  terms_changed: boolean;
  change_summary?: string;
  created_at?: string;
}

export type RenewalType = 
  | 'AUTOMATIC'
  | 'MANUAL'
  | 'RENEGOTIATION';

export type RenewalStatus = 
  | 'SCHEDULED'
  | 'NOTIFIED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'FAILED';

export interface ContractAnalytics {
  total_contracts: number;
  active_contracts: number;
  pending_signatures: number;
  expiring_soon: number;
  total_value: number;
  average_contract_value: number;
  contracts_by_type: Record<ContractType, number>;
  contracts_by_status: Record<ContractStatus, number>;
  signature_completion_rate: number;
  renewal_rate: number;
}

export interface DigitalSignatureProvider {
  name: string;
  api_endpoint: string;
  api_key: string;
  webhook_url?: string;
  settings: Record<string, any>;
}

/**
 * Serviço para gestão de contratos digitais
 * Inclui assinatura eletrônica, versionamento e renovação automática
 */
class DigitalContractService {
  private readonly SIGNATURE_PROVIDERS: Record<string, DigitalSignatureProvider> = {
    docusign: {
      name: 'DocuSign',
      api_endpoint: 'https://demo.docusign.net/restapi',
      api_key: process.env.DOCUSIGN_API_KEY || '',
      settings: {}
    },
    clicksign: {
      name: 'ClickSign',
      api_endpoint: 'https://api.clicksign.com',
      api_key: process.env.CLICKSIGN_API_KEY || '',
      settings: {}
    }
  };

  /**
   * Cria um novo contrato
   */
  async createContract(
    contract: Omit<DigitalContract, 'id' | 'created_at' | 'version' | 'signatures'>,
    template_id?: string
  ): Promise<string> {
    try {
      // Gerar número do contrato
      const contractNumber = await this.generateContractNumber(contract.tenant_id);
      
      // Se usar template, aplicar conteúdo
      let documentContent = '';
      if (template_id) {
        documentContent = await this.applyTemplate(template_id, contract);
      }

      const newContract: DigitalContract = {
        ...contract,
        contract_number: contractNumber,
        version: 1,
        signatures: [],
        status: 'DRAFT',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('digital_contracts')
        .insert([newContract])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar contrato:', error);
        throw error;
      }

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: contract.tenant_id,
        user_id: contract.created_by,
        action_type: 'CREATE',
        entity_type: 'CONTRACT',
        entity_id: data.id,
        new_values: { contract_number: contractNumber, status: 'DRAFT' },
        metadata: { template_id },
        risk_level: 'MEDIUM'
      });

      return data.id;
    } catch (error) {
      console.error('Erro no serviço de contratos:', error);
      throw error;
    }
  }

  /**
   * Atualiza contrato existente
   */
  async updateContract(
    contract_id: string,
    updates: Partial<DigitalContract>,
    user_id: string
  ): Promise<void> {
    try {
      // Buscar contrato atual
      const { data: currentContract, error: fetchError } = await supabase
        .from('digital_contracts')
        .select('*')
        .eq('id', contract_id)
        .single();

      if (fetchError || !currentContract) {
        throw new Error('Contrato não encontrado');
      }

      // Verificar se pode ser atualizado
      if (['ACTIVE', 'TERMINATED', 'EXPIRED'].includes(currentContract.status)) {
        throw new Error('Contrato não pode ser modificado no status atual');
      }

      const updatedContract = {
        ...updates,
        updated_by: user_id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('digital_contracts')
        .update(updatedContract)
        .eq('id', contract_id);

      if (error) {
        console.error('Erro ao atualizar contrato:', error);
        throw error;
      }

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: currentContract.tenant_id,
        user_id,
        action_type: 'UPDATE',
        entity_type: 'CONTRACT',
        entity_id: contract_id,
        old_values: currentContract,
        new_values: updatedContract,
        risk_level: 'MEDIUM'
      });
    } catch (error) {
      console.error('Erro no serviço de contratos:', error);
      throw error;
    }
  }

  /**
   * Cria nova versão do contrato
   */
  async createContractVersion(
    original_contract_id: string,
    changes: Partial<DigitalContract>,
    user_id: string
  ): Promise<string> {
    try {
      // Buscar contrato original
      const { data: originalContract, error } = await supabase
        .from('digital_contracts')
        .select('*')
        .eq('id', original_contract_id)
        .single();

      if (error || !originalContract) {
        throw new Error('Contrato original não encontrado');
      }

      // Criar nova versão
      const newVersion: DigitalContract = {
        ...originalContract,
        ...changes,
        id: undefined,
        version: originalContract.version + 1,
        parent_contract_id: original_contract_id,
        status: 'DRAFT',
        signatures: [],
        created_by: user_id,
        created_at: new Date().toISOString(),
        updated_by: undefined,
        updated_at: undefined
      };

      const { data, error: insertError } = await supabase
        .from('digital_contracts')
        .insert([newVersion])
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar versão:', insertError);
        throw insertError;
      }

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: originalContract.tenant_id,
        user_id,
        action_type: 'CREATE',
        entity_type: 'CONTRACT',
        entity_id: data.id,
        metadata: {
          action: 'VERSION_CREATED',
          original_contract_id,
          version: newVersion.version
        },
        risk_level: 'HIGH'
      });

      return data.id;
    } catch (error) {
      console.error('Erro no serviço de contratos:', error);
      throw error;
    }
  }

  /**
   * Inicia processo de assinatura
   */
  async initiateSignatureProcess(
    contract_id: string,
    signers: Omit<ContractSignature, 'id' | 'contract_id' | 'signed_at' | 'status'>[],
    provider: string = 'clicksign',
    user_id: string
  ): Promise<{ signature_url: string; process_id: string }> {
    try {
      // Buscar contrato
      const { data: contract, error } = await supabase
        .from('digital_contracts')
        .select('*')
        .eq('id', contract_id)
        .single();

      if (error || !contract) {
        throw new Error('Contrato não encontrado');
      }

      if (contract.status !== 'PENDING_SIGNATURE') {
        throw new Error('Contrato não está pronto para assinatura');
      }

      // Criar registros de assinatura
      const signatures: ContractSignature[] = signers.map(signer => ({
        ...signer,
        contract_id,
        status: 'PENDING'
      }));

      const { error: signaturesError } = await supabase
        .from('contract_signatures')
        .insert(signatures);

      if (signaturesError) {
        console.error('Erro ao criar assinaturas:', signaturesError);
        throw signaturesError;
      }

      // Integrar com provedor de assinatura
      const signatureResult = await this.integrateWithSignatureProvider(
        provider,
        contract,
        signers
      );

      // Atualizar contrato com informações da assinatura
      await supabase
        .from('digital_contracts')
        .update({
          metadata: {
            ...contract.metadata,
            signature_provider: provider,
            signature_process_id: signatureResult.process_id
          },
          updated_by: user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract_id);

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: contract.tenant_id,
        user_id,
        action_type: 'CREATE',
        entity_type: 'CONTRACT',
        entity_id: contract_id,
        metadata: {
          action: 'SIGNATURE_INITIATED',
          provider,
          signers_count: signers.length
        },
        risk_level: 'HIGH'
      });

      return signatureResult;
    } catch (error) {
      console.error('Erro no processo de assinatura:', error);
      throw error;
    }
  }

  /**
   * Processa webhook de assinatura
   */
  async processSignatureWebhook(
    provider: string,
    payload: any,
    signature_header?: string
  ): Promise<void> {
    try {
      // Validar webhook
      if (!this.validateWebhookSignature(provider, payload, signature_header)) {
        throw new Error('Assinatura do webhook inválida');
      }

      // Processar baseado no provedor
      const processedData = await this.processProviderWebhook(provider, payload);
      
      if (!processedData) {
        return;
      }

      const { contract_id, signer_email, status, signature_data } = processedData;

      // Atualizar assinatura
      const { error } = await supabase
        .from('contract_signatures')
        .update({
          status,
          signature_data,
          signed_at: status === 'SIGNED' ? new Date().toISOString() : undefined
        })
        .eq('contract_id', contract_id)
        .eq('signer_email', signer_email);

      if (error) {
        console.error('Erro ao atualizar assinatura:', error);
        throw error;
      }

      // Verificar se todas as assinaturas foram concluídas
      await this.checkContractSignatureCompletion(contract_id);

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: processedData.tenant_id || 'system',
        user_id: 'webhook',
        action_type: 'UPDATE',
        entity_type: 'CONTRACT',
        entity_id: contract_id,
        metadata: {
          action: 'SIGNATURE_UPDATED',
          provider,
          signer_email,
          status
        },
        risk_level: 'HIGH'
      });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  /**
   * Agenda renovação automática
   */
  async scheduleContractRenewal(
    contract_id: string,
    renewal_date: Date,
    user_id: string
  ): Promise<string> {
    try {
      const renewal: ContractRenewal = {
        original_contract_id: contract_id,
        renewal_type: 'AUTOMATIC',
        scheduled_date: renewal_date,
        status: 'SCHEDULED',
        terms_changed: false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('contract_renewals')
        .insert([renewal])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao agendar renovação:', error);
        throw error;
      }

      // Registrar auditoria
      await financialAuditService.logAuditEntry({
        tenant_id: 'system', // Buscar do contrato se necessário
        user_id,
        action_type: 'CREATE',
        entity_type: 'CONTRACT',
        entity_id: contract_id,
        metadata: {
          action: 'RENEWAL_SCHEDULED',
          renewal_date: renewal_date.toISOString()
        },
        risk_level: 'MEDIUM'
      });

      return data.id;
    } catch (error) {
      console.error('Erro no agendamento de renovação:', error);
      throw error;
    }
  }

  /**
   * Processa renovações pendentes
   */
  async processPendingRenewals(): Promise<void> {
    try {
      const today = new Date();
      
      // Buscar renovações agendadas para hoje ou anteriores
      const { data: renewals, error } = await supabase
        .from('contract_renewals')
        .select(`
          *,
          original_contract:digital_contracts!original_contract_id(*)
        `)
        .eq('status', 'SCHEDULED')
        .lte('scheduled_date', today.toISOString());

      if (error) {
        console.error('Erro ao buscar renovações:', error);
        throw error;
      }

      for (const renewal of renewals || []) {
        await this.processContractRenewal(renewal);
      }
    } catch (error) {
      console.error('Erro ao processar renovações:', error);
      throw error;
    }
  }

  /**
   * Gera relatório de contratos
   */
  async generateContractAnalytics(tenant_id: string): Promise<ContractAnalytics> {
    try {
      // Buscar todos os contratos do tenant
      const { data: contracts, error } = await supabase
        .from('digital_contracts')
        .select('*')
        .eq('tenant_id', tenant_id);

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }

      const totalContracts = contracts?.length || 0;
      const activeContracts = contracts?.filter(c => c.status === 'ACTIVE').length || 0;
      const pendingSignatures = contracts?.filter(c => c.status === 'PENDING_SIGNATURE').length || 0;
      
      // Contratos expirando em 30 dias
      const thirtyDaysFromNow = addDays(new Date(), 30);
      const expiringSoon = contracts?.filter(c => 
        c.end_date && 
        isBefore(new Date(c.end_date), thirtyDaysFromNow) && 
        c.status === 'ACTIVE'
      ).length || 0;

      const totalValue = contracts?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0;
      const averageContractValue = totalContracts > 0 ? totalValue / totalContracts : 0;

      // Agrupar por tipo
      const contractsByType: Record<ContractType, number> = {} as any;
      contracts?.forEach(c => {
        contractsByType[c.contract_type] = (contractsByType[c.contract_type] || 0) + 1;
      });

      // Agrupar por status
      const contractsByStatus: Record<ContractStatus, number> = {} as any;
      contracts?.forEach(c => {
        contractsByStatus[c.status] = (contractsByStatus[c.status] || 0) + 1;
      });

      // Calcular taxa de conclusão de assinaturas
      const contractsWithSignatures = contracts?.filter(c => c.signatures?.length > 0).length || 0;
      const signatureCompletionRate = totalContracts > 0 ? (contractsWithSignatures / totalContracts) * 100 : 0;

      // Calcular taxa de renovação (simplificado)
      const renewalRate = 85; // Implementar cálculo real baseado em histórico

      return {
        total_contracts: totalContracts,
        active_contracts: activeContracts,
        pending_signatures: pendingSignatures,
        expiring_soon: expiringSoon,
        total_value: totalValue,
        average_contract_value: averageContractValue,
        contracts_by_type: contractsByType,
        contracts_by_status: contractsByStatus,
        signature_completion_rate: signatureCompletionRate,
        renewal_rate: renewalRate
      };
    } catch (error) {
      console.error('Erro ao gerar analytics:', error);
      throw error;
    }
  }

  /**
   * Busca contratos com filtros
   */
  async searchContracts(filters: {
    tenant_id: string;
    status?: ContractStatus;
    contract_type?: ContractType;
    start_date?: Date;
    end_date?: Date;
    search_term?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ contracts: DigitalContract[]; total: number }> {
    try {
      let query = supabase
        .from('digital_contracts')
        .select('*', { count: 'exact' })
        .eq('tenant_id', filters.tenant_id)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.contract_type) {
        query = query.eq('contract_type', filters.contract_type);
      }

      if (filters.start_date) {
        query = query.gte('start_date', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('end_date', filters.end_date.toISOString());
      }

      if (filters.search_term) {
        query = query.or(`title.ilike.%${filters.search_term}%,contract_number.ilike.%${filters.search_term}%`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }

      return {
        contracts: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Erro no serviço de contratos:', error);
      throw error;
    }
  }

  /**
   * Gera número do contrato
   */
  private async generateContractNumber(tenant_id: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Buscar último número do mês
    const { data, error } = await supabase
      .from('digital_contracts')
      .select('contract_number')
      .eq('tenant_id', tenant_id)
      .like('contract_number', `${year}${month}%`)
      .order('contract_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].contract_number;
      const lastSequence = parseInt(lastNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${year}${month}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Aplica template ao contrato
   */
  private async applyTemplate(template_id: string, contract: any): Promise<string> {
    // Implementar aplicação de template
    return 'Template content applied';
  }

  /**
   * Integra com provedor de assinatura
   */
  private async integrateWithSignatureProvider(
    provider: string,
    contract: DigitalContract,
    signers: any[]
  ): Promise<{ signature_url: string; process_id: string }> {
    // Implementar integração específica do provedor
    return {
      signature_url: 'https://signature-provider.com/sign/123',
      process_id: 'process_123'
    };
  }

  /**
   * Valida assinatura do webhook
   */
  private validateWebhookSignature(
    provider: string,
    payload: any,
    signature_header?: string
  ): boolean {
    // Implementar validação específica do provedor
    return true;
  }

  /**
   * Processa webhook do provedor
   */
  private async processProviderWebhook(provider: string, payload: any): Promise<any> {
    // Implementar processamento específico do provedor
    return {
      contract_id: payload.contract_id,
      signer_email: payload.signer_email,
      status: payload.status,
      signature_data: payload.signature_data
    };
  }

  /**
   * Verifica conclusão das assinaturas
   */
  private async checkContractSignatureCompletion(contract_id: string): Promise<void> {
    // Buscar todas as assinaturas do contrato
    const { data: signatures, error } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contract_id);

    if (error || !signatures) {
      return;
    }

    // Verificar se todas foram assinadas
    const allSigned = signatures.every(sig => sig.status === 'SIGNED');
    
    if (allSigned) {
      // Ativar contrato
      await supabase
        .from('digital_contracts')
        .update({
          status: 'ACTIVE',
          signature_date: new Date().toISOString()
        })
        .eq('id', contract_id);
    }
  }

  /**
   * Processa renovação individual
   */
  private async processContractRenewal(renewal: any): Promise<void> {
    try {
      const originalContract = renewal.original_contract;
      
      if (!originalContract.auto_renewal) {
        // Marcar como rejeitada se não tem renovação automática
        await supabase
          .from('contract_renewals')
          .update({ status: 'REJECTED' })
          .eq('id', renewal.id);
        return;
      }

      // Criar novo contrato renovado
      const renewedContract = {
        ...originalContract,
        id: undefined,
        start_date: new Date(),
        end_date: this.calculateRenewalEndDate(originalContract),
        status: 'ACTIVE',
        version: 1,
        parent_contract_id: originalContract.id,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('digital_contracts')
        .insert([renewedContract])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Atualizar renovação
      await supabase
        .from('contract_renewals')
        .update({
          new_contract_id: data.id,
          status: 'COMPLETED'
        })
        .eq('id', renewal.id);

      // Marcar contrato original como renovado
      await supabase
        .from('digital_contracts')
        .update({ status: 'TERMINATED' })
        .eq('id', originalContract.id);

    } catch (error) {
      // Marcar renovação como falhada
      await supabase
        .from('contract_renewals')
        .update({ status: 'FAILED' })
        .eq('id', renewal.id);
      
      console.error('Erro ao processar renovação:', error);
    }
  }

  /**
   * Calcula data de fim da renovação
   */
  private calculateRenewalEndDate(contract: DigitalContract): Date {
    const startDate = new Date();
    
    switch (contract.renewal_period) {
      case 'MONTHLY':
        return addMonths(startDate, 1);
      case 'QUARTERLY':
        return addMonths(startDate, 3);
      case 'SEMI_ANNUAL':
        return addMonths(startDate, 6);
      case 'ANNUAL':
        return addYears(startDate, 1);
      case 'BIENNIAL':
        return addYears(startDate, 2);
      default:
        return addYears(startDate, 1);
    }
  }
}

export const digitalContractService = new DigitalContractService();
export default digitalContractService;
