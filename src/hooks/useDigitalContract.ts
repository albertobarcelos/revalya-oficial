import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  digitalContractService,
  DigitalContract,
  ContractTemplate,
  ContractSignature,
  ContractRenewal,
  ContractAnalytics,
  ContractStatus,
  ContractType,
  SignatureStatus
} from '../services/digitalContractService';

export interface UseDigitalContractReturn {
  // Estados de carregamento
  isCreating: boolean;
  isUpdating: boolean;
  isSearching: boolean;
  isInitiatingSignature: boolean;
  isProcessingRenewal: boolean;
  isGeneratingAnalytics: boolean;
  isCreatingVersion: boolean;
  isSchedulingRenewal: boolean;

  // Estados de dados
  contracts: DigitalContract[];
  currentContract: DigitalContract | null;
  analytics: ContractAnalytics | null;
  searchResults: { contracts: DigitalContract[]; total: number } | null;
  lastError: string | null;
  lastResult: any;

  // Funções principais
  createContract: (
    contract: Omit<DigitalContract, 'id' | 'created_at' | 'version' | 'signatures'>,
    template_id?: string
  ) => Promise<string | null>;
  
  updateContract: (
    contract_id: string,
    updates: Partial<DigitalContract>,
    user_id: string
  ) => Promise<boolean>;
  
  createContractVersion: (
    original_contract_id: string,
    changes: Partial<DigitalContract>,
    user_id: string
  ) => Promise<string | null>;
  
  initiateSignatureProcess: (
    contract_id: string,
    signers: Omit<ContractSignature, 'id' | 'contract_id' | 'signed_at' | 'status'>[],
    provider?: string,
    user_id?: string
  ) => Promise<{ signature_url: string; process_id: string } | null>;
  
  processSignatureWebhook: (
    provider: string,
    payload: any,
    signature_header?: string
  ) => Promise<boolean>;
  
  scheduleContractRenewal: (
    contract_id: string,
    renewal_date: Date,
    user_id: string
  ) => Promise<string | null>;
  
  processPendingRenewals: () => Promise<boolean>;
  
  generateContractAnalytics: (tenant_id: string) => Promise<ContractAnalytics | null>;
  
  searchContracts: (filters: {
    tenant_id: string;
    status?: ContractStatus;
    contract_type?: ContractType;
    start_date?: Date;
    end_date?: Date;
    search_term?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ contracts: DigitalContract[]; total: number } | null>;

  // Funções utilitárias
  clearResults: () => void;
  clearError: () => void;
  setCurrentContract: (contract: DigitalContract | null) => void;
  
  // Funções de validação
  validateContractData: (contract: Partial<DigitalContract>) => string[];
  canUpdateContract: (contract: DigitalContract) => boolean;
  canInitiateSignature: (contract: DigitalContract) => boolean;
  isContractExpiringSoon: (contract: DigitalContract, days?: number) => boolean;
  
  // Funções de formatação
  formatContractNumber: (number: string) => string;
  formatContractStatus: (status: ContractStatus) => string;
  formatContractType: (type: ContractType) => string;
  formatSignatureStatus: (status: SignatureStatus) => string;
}

/**
 * Hook para gerenciar contratos digitais
 * Encapsula toda a lógica de CRUD, assinatura e renovação de contratos
 */
export const useDigitalContract = (): UseDigitalContractReturn => {
  // Estados de carregamento
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitiatingSignature, setIsInitiatingSignature] = useState(false);
  const [isProcessingRenewal, setIsProcessingRenewal] = useState(false);
  const [isGeneratingAnalytics, setIsGeneratingAnalytics] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isSchedulingRenewal, setIsSchedulingRenewal] = useState(false);

  // Estados de dados
  const [contracts, setContracts] = useState<DigitalContract[]>([]);
  const [currentContract, setCurrentContract] = useState<DigitalContract | null>(null);
  const [analytics, setAnalytics] = useState<ContractAnalytics | null>(null);
  const [searchResults, setSearchResults] = useState<{ contracts: DigitalContract[]; total: number } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  /**
   * Cria um novo contrato
   */
  const createContract = useCallback(async (
    contract: Omit<DigitalContract, 'id' | 'created_at' | 'version' | 'signatures'>,
    template_id?: string
  ): Promise<string | null> => {
    setIsCreating(true);
    setLastError(null);
    
    try {
      // Validar dados do contrato
      const validationErrors = validateContractData(contract);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      const contractId = await digitalContractService.createContract(contract, template_id);
      
      setLastResult({ contractId, action: 'create' });
      toast.success('Contrato criado com sucesso!');
      
      return contractId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar contrato';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  /**
   * Atualiza contrato existente
   */
  const updateContract = useCallback(async (
    contract_id: string,
    updates: Partial<DigitalContract>,
    user_id: string
  ): Promise<boolean> => {
    setIsUpdating(true);
    setLastError(null);
    
    try {
      await digitalContractService.updateContract(contract_id, updates, user_id);
      
      setLastResult({ contractId: contract_id, updates, action: 'update' });
      toast.success('Contrato atualizado com sucesso!');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar contrato';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  /**
   * Cria nova versão do contrato
   */
  const createContractVersion = useCallback(async (
    original_contract_id: string,
    changes: Partial<DigitalContract>,
    user_id: string
  ): Promise<string | null> => {
    setIsCreatingVersion(true);
    setLastError(null);
    
    try {
      const newVersionId = await digitalContractService.createContractVersion(
        original_contract_id,
        changes,
        user_id
      );
      
      setLastResult({ 
        originalContractId: original_contract_id, 
        newVersionId, 
        action: 'create_version' 
      });
      toast.success('Nova versão do contrato criada com sucesso!');
      
      return newVersionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar versão do contrato';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsCreatingVersion(false);
    }
  }, []);

  /**
   * Inicia processo de assinatura
   */
  const initiateSignatureProcess = useCallback(async (
    contract_id: string,
    signers: Omit<ContractSignature, 'id' | 'contract_id' | 'signed_at' | 'status'>[],
    provider: string = 'clicksign',
    user_id: string = 'system'
  ): Promise<{ signature_url: string; process_id: string } | null> => {
    setIsInitiatingSignature(true);
    setLastError(null);
    
    try {
      if (signers.length === 0) {
        throw new Error('É necessário pelo menos um signatário');
      }

      const result = await digitalContractService.initiateSignatureProcess(
        contract_id,
        signers,
        provider,
        user_id
      );
      
      setLastResult({ 
        contractId: contract_id, 
        signatureUrl: result.signature_url,
        processId: result.process_id,
        signersCount: signers.length,
        action: 'initiate_signature' 
      });
      toast.success('Processo de assinatura iniciado com sucesso!');
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar processo de assinatura';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsInitiatingSignature(false);
    }
  }, []);

  /**
   * Processa webhook de assinatura
   */
  const processSignatureWebhook = useCallback(async (
    provider: string,
    payload: any,
    signature_header?: string
  ): Promise<boolean> => {
    setLastError(null);
    
    try {
      await digitalContractService.processSignatureWebhook(provider, payload, signature_header);
      
      setLastResult({ provider, payload, action: 'process_webhook' });
      toast.success('Webhook de assinatura processado com sucesso!');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar webhook';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Agenda renovação de contrato
   */
  const scheduleContractRenewal = useCallback(async (
    contract_id: string,
    renewal_date: Date,
    user_id: string
  ): Promise<string | null> => {
    setIsSchedulingRenewal(true);
    setLastError(null);
    
    try {
      const renewalId = await digitalContractService.scheduleContractRenewal(
        contract_id,
        renewal_date,
        user_id
      );
      
      setLastResult({ 
        contractId: contract_id, 
        renewalId, 
        renewalDate: renewal_date,
        action: 'schedule_renewal' 
      });
      toast.success('Renovação agendada com sucesso!');
      
      return renewalId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao agendar renovação';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsSchedulingRenewal(false);
    }
  }, []);

  /**
   * Processa renovações pendentes
   */
  const processPendingRenewals = useCallback(async (): Promise<boolean> => {
    setIsProcessingRenewal(true);
    setLastError(null);
    
    try {
      await digitalContractService.processPendingRenewals();
      
      setLastResult({ action: 'process_renewals' });
      toast.success('Renovações pendentes processadas com sucesso!');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar renovações';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsProcessingRenewal(false);
    }
  }, []);

  /**
   * Gera analytics de contratos
   */
  const generateContractAnalytics = useCallback(async (
    tenant_id: string
  ): Promise<ContractAnalytics | null> => {
    setIsGeneratingAnalytics(true);
    setLastError(null);
    
    try {
      const analyticsData = await digitalContractService.generateContractAnalytics(tenant_id);
      
      setAnalytics(analyticsData);
      setLastResult({ analytics: analyticsData, action: 'generate_analytics' });
      
      return analyticsData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar analytics';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGeneratingAnalytics(false);
    }
  }, []);

  /**
   * Busca contratos com filtros
   */
  const searchContracts = useCallback(async (filters: {
    tenant_id: string;
    status?: ContractStatus;
    contract_type?: ContractType;
    start_date?: Date;
    end_date?: Date;
    search_term?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ contracts: DigitalContract[]; total: number } | null> => {
    setIsSearching(true);
    setLastError(null);
    
    try {
      const results = await digitalContractService.searchContracts(filters);
      
      setSearchResults(results);
      setContracts(results.contracts);
      setLastResult({ results, filters, action: 'search' });
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar contratos';
      setLastError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Valida dados do contrato
   */
  const validateContractData = useCallback((contract: Partial<DigitalContract>): string[] => {
    const errors: string[] = [];

    if (!contract.tenant_id) {
      errors.push('ID do tenant é obrigatório');
    }

    if (!contract.title || contract.title.trim().length === 0) {
      errors.push('Título do contrato é obrigatório');
    }

    if (!contract.contract_type) {
      errors.push('Tipo do contrato é obrigatório');
    }

    if (!contract.contractor_id) {
      errors.push('ID do contratante é obrigatório');
    }

    if (!contract.contractee_id) {
      errors.push('ID do contratado é obrigatório');
    }

    if (!contract.start_date) {
      errors.push('Data de início é obrigatória');
    }

    if (contract.total_value !== undefined && contract.total_value < 0) {
      errors.push('Valor total não pode ser negativo');
    }

    if (!contract.created_by) {
      errors.push('ID do criador é obrigatório');
    }

    // Validar datas
    if (contract.start_date && contract.end_date) {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      
      if (endDate <= startDate) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
    }

    return errors;
  }, []);

  /**
   * Verifica se contrato pode ser atualizado
   */
  const canUpdateContract = useCallback((contract: DigitalContract): boolean => {
    return !['ACTIVE', 'TERMINATED', 'EXPIRED'].includes(contract.status);
  }, []);

  /**
   * Verifica se pode iniciar processo de assinatura
   */
  const canInitiateSignature = useCallback((contract: DigitalContract): boolean => {
    return contract.status === 'PENDING_SIGNATURE';
  }, []);

  /**
   * Verifica se contrato está expirando em breve
   */
  const isContractExpiringSoon = useCallback((contract: DigitalContract, days: number = 30): boolean => {
    if (!contract.end_date || contract.status !== 'ACTIVE') {
      return false;
    }

    const endDate = new Date(contract.end_date);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);

    return endDate <= warningDate;
  }, []);

  /**
   * Formata número do contrato
   */
  const formatContractNumber = useCallback((number: string): string => {
    if (number.length === 8) {
      return `${number.slice(0, 4)}/${number.slice(4, 6)}-${number.slice(6)}`;
    }
    return number;
  }, []);

  /**
   * Formata status do contrato
   */
  const formatContractStatus = useCallback((status: ContractStatus): string => {
    const statusMap: Record<ContractStatus, string> = {
      'DRAFT': 'Rascunho',
      'PENDING_REVIEW': 'Aguardando Revisão',
      'PENDING_SIGNATURE': 'Aguardando Assinatura',
      'ACTIVE': 'Ativo',
      'SUSPENDED': 'Suspenso',
      'TERMINATED': 'Encerrado',
      'EXPIRED': 'Expirado',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  }, []);

  /**
   * Formata tipo do contrato
   */
  const formatContractType = useCallback((type: ContractType): string => {
    const typeMap: Record<ContractType, string> = {
      'SERVICE_AGREEMENT': 'Acordo de Serviços',
      'SOFTWARE_LICENSE': 'Licença de Software',
      'MAINTENANCE_CONTRACT': 'Contrato de Manutenção',
      'CONSULTING_AGREEMENT': 'Acordo de Consultoria',
      'SUBSCRIPTION_CONTRACT': 'Contrato de Assinatura',
      'PARTNERSHIP_AGREEMENT': 'Acordo de Parceria',
      'NDA': 'Acordo de Confidencialidade',
      'EMPLOYMENT_CONTRACT': 'Contrato de Trabalho',
      'CUSTOM': 'Personalizado'
    };
    return typeMap[type] || type;
  }, []);

  /**
   * Formata status da assinatura
   */
  const formatSignatureStatus = useCallback((status: SignatureStatus): string => {
    const statusMap: Record<SignatureStatus, string> = {
      'PENDING': 'Pendente',
      'SIGNED': 'Assinado',
      'REJECTED': 'Rejeitado',
      'EXPIRED': 'Expirado'
    };
    return statusMap[status] || status;
  }, []);

  /**
   * Limpa resultados
   */
  const clearResults = useCallback(() => {
    setLastResult(null);
    setSearchResults(null);
    setAnalytics(null);
  }, []);

  /**
   * Limpa erro
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    // Estados de carregamento
    isCreating,
    isUpdating,
    isSearching,
    isInitiatingSignature,
    isProcessingRenewal,
    isGeneratingAnalytics,
    isCreatingVersion,
    isSchedulingRenewal,

    // Estados de dados
    contracts,
    currentContract,
    analytics,
    searchResults,
    lastError,
    lastResult,

    // Funções principais
    createContract,
    updateContract,
    createContractVersion,
    initiateSignatureProcess,
    processSignatureWebhook,
    scheduleContractRenewal,
    processPendingRenewals,
    generateContractAnalytics,
    searchContracts,

    // Funções utilitárias
    clearResults,
    clearError,
    setCurrentContract,

    // Funções de validação
    validateContractData,
    canUpdateContract,
    canInitiateSignature,
    isContractExpiringSoon,

    // Funções de formatação
    formatContractNumber,
    formatContractStatus,
    formatContractType,
    formatSignatureStatus
  };
};

export default useDigitalContract;
