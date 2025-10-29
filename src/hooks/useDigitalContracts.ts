// =====================================================
// DIGITAL CONTRACTS HOOK
// Descrição: Hook para gerenciar contratos digitais
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { getCurrentUser } from '@/utils/supabaseAuthManager';
import {
  DigitalContract,
  DigitalContractSignature,
  ContractType,
  ContractStatus,
  SignatureType,
  Signatory,
  SignatoryRole,
  CreateContractRequest,
  SignContractRequest,
  ContractResponse,
  ContractProgress,
  SignatureLocation,
  PaginationParams,
  PaginatedResponse,
} from '../types/models/financial';

interface UseDigitalContractsReturn {
  // State
  contracts: DigitalContract[];
  currentContract: DigitalContract | null;
  signatures: DigitalContractSignature[];
  loading: boolean;
  error: string | null;
  
  // Contract management
  createContract: (request: CreateContractRequest) => Promise<ContractResponse | null>;
  getContract: (id: string) => Promise<ContractResponse | null>;
  getContracts: (params?: PaginationParams & { status?: ContractStatus; type?: ContractType }) => Promise<PaginatedResponse<DigitalContract> | null>;
  updateContract: (id: string, updates: Partial<DigitalContract>) => Promise<boolean>;
  deleteContract: (id: string) => Promise<boolean>;
  
  // Signature management
  signContract: (request: SignContractRequest) => Promise<boolean>;
  getContractSignatures: (contractId: string) => Promise<DigitalContractSignature[]>;
  validateSignature: (contractId: string, signatureId: string) => Promise<boolean>;
  
  // Contract progress
  getContractProgress: (contractId: string) => Promise<ContractProgress | null>;
  sendSignatureReminder: (contractId: string, signatoryEmail: string) => Promise<boolean>;
  
  // Utilities
  generateContractPDF: (contractId: string) => Promise<Blob | null>;
  previewContract: (content: string, signatories: Signatory[]) => string;
  validateContractData: (data: CreateContractRequest) => { isValid: boolean; errors: string[] };
  
  // State management
  setCurrentContract: (contract: DigitalContract | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export const useDigitalContracts = (): UseDigitalContractsReturn => {
  const { supabase, user } = useSupabase();
  const [contracts, setContracts] = useState<DigitalContract[]>([]);
  const [currentContract, setCurrentContract] = useState<DigitalContract | null>(null);
  const [signatures, setSignatures] = useState<DigitalContractSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any, context: string) => {
    console.error(`[useDigitalContracts] ${context}:`, error);
    setError(error.message || `Erro ao ${context}`);
    setLoading(false);
  }, []);

  // Contract management methods
  const createContract = useCallback(async (
    request: CreateContractRequest
  ): Promise<ContractResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('digital-contracts', {
        body: {
          action: 'create',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar contrato');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao criar contrato');
      }

      const contractResponse = data.data as ContractResponse;
      
      // Add to local state
      setContracts(prev => [contractResponse as DigitalContract, ...prev]);
      setCurrentContract(contractResponse as DigitalContract);
      
      setLoading(false);
      return contractResponse;
    } catch (err) {
      handleError(err, 'criar contrato');
      return null;
    }
  }, [supabase, user, handleError]);

  const getContract = useCallback(async (id: string): Promise<ContractResponse | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('digital-contracts', {
        body: {
          action: 'get',
          contractId: id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar contrato');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Contrato não encontrado');
      }

      const contractResponse = data.data as ContractResponse;
      setCurrentContract(contractResponse as DigitalContract);
      
      setLoading(false);
      return contractResponse;
    } catch (err) {
      handleError(err, 'buscar contrato');
      return null;
    }
  }, [supabase, user, handleError]);

  const getContracts = useCallback(async (
    params: PaginationParams & { status?: ContractStatus; type?: ContractType } = {}
  ): Promise<PaginatedResponse<DigitalContract> | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('digital-contracts', {
        body: {
          action: 'list',
          ...params,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar contratos');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao buscar contratos');
      }

      const result = data.data as PaginatedResponse<DigitalContract>;
      setContracts(result.data);
      
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err, 'buscar contratos');
      return null;
    }
  }, [supabase, user, handleError]);

  const updateContract = useCallback(async (
    id: string,
    updates: Partial<DigitalContract>
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // AIDEV-NOTE: Obter usuário atual para configurar contexto
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id || null;
      const tenantId = user.user_metadata?.tenant_id;
      
      // AIDEV-NOTE: Configurar contexto com user_id para popular updated_by
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: tenantId,
        p_user_id: userId
      });

      const { error } = await supabase
        .from('digital_contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar contrato');
      }

      // Update local state
      setContracts(prev => 
        prev.map(contract => 
          contract.id === id ? { ...contract, ...updates } : contract
        )
      );

      if (currentContract?.id === id) {
        setCurrentContract(prev => prev ? { ...prev, ...updates } : null);
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'atualizar contrato');
      return false;
    }
  }, [supabase, user, currentContract, handleError]);

  const deleteContract = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('digital_contracts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.user_metadata?.tenant_id);

      if (error) {
        throw new Error(error.message || 'Erro ao deletar contrato');
      }

      // Remove from local state
      setContracts(prev => prev.filter(contract => contract.id !== id));
      
      if (currentContract?.id === id) {
        setCurrentContract(null);
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'deletar contrato');
      return false;
    }
  }, [supabase, user, currentContract, handleError]);

  // Signature management methods
  const signContract = useCallback(async (request: SignContractRequest): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('digital-contracts', {
        body: {
          action: 'sign',
          ...request,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao assinar contrato');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao assinar contrato');
      }

      // Refresh contract data
      await getContract(request.contractId);
      
      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'assinar contrato');
      return false;
    }
  }, [supabase, user, getContract, handleError]);

  const getContractSignatures = useCallback(async (
    contractId: string
  ): Promise<DigitalContractSignature[]> => {
    if (!user) {
      setError('Usuário não autenticado');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('digital_contract_signatures')
        .select('*')
        .eq('contract_id', contractId)
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .order('signed_at', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar assinaturas');
      }

      const contractSignatures = data as DigitalContractSignature[];
      setSignatures(contractSignatures);
      
      setLoading(false);
      return contractSignatures;
    } catch (err) {
      handleError(err, 'buscar assinaturas');
      return [];
    }
  }, [supabase, user, handleError]);

  const validateSignature = useCallback(async (
    contractId: string,
    signatureId: string
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Implement signature validation logic
      // This could involve cryptographic verification, timestamp validation, etc.
      const { data, error } = await supabase
        .from('digital_contract_signatures')
        .select('*')
        .eq('id', signatureId)
        .eq('contract_id', contractId)
        .eq('tenant_id', user.user_metadata?.tenant_id)
        .single();

      if (error) {
        throw new Error(error.message || 'Assinatura não encontrada');
      }

      // Basic validation - in production, implement proper cryptographic validation
      const isValid = data && data.signature_data && data.signed_at;
      
      setLoading(false);
      return !!isValid;
    } catch (err) {
      handleError(err, 'validar assinatura');
      return false;
    }
  }, [supabase, user, handleError]);

  // Contract progress and utilities
  const getContractProgress = useCallback(async (
    contractId: string
  ): Promise<ContractProgress | null> => {
    const contract = await getContract(contractId);
    if (!contract) return null;

    const signatures = await getContractSignatures(contractId);
    const totalSignatories = contract.signatories.length;
    const signedCount = signatures.length;
    const pendingCount = totalSignatories - signedCount;
    
    const signedEmails = new Set(signatures.map(sig => sig.signatoryEmail));
    const nextSignatory = contract.signatories.find(sig => !signedEmails.has(sig.email));

    return {
      totalSignatories,
      signedCount,
      pendingCount,
      percentComplete: Math.round((signedCount / totalSignatories) * 100),
      nextSignatory,
    };
  }, [getContract, getContractSignatures]);

  const sendSignatureReminder = useCallback(async (
    contractId: string,
    signatoryEmail: string
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('digital-contracts', {
        body: {
          action: 'remind',
          contractId,
          signatoryEmail,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar lembrete');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao enviar lembrete');
      }

      setLoading(false);
      return true;
    } catch (err) {
      handleError(err, 'enviar lembrete');
      return false;
    }
  }, [supabase, user, handleError]);

  const generateContractPDF = useCallback(async (contractId: string): Promise<Blob | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // This would typically call a PDF generation service
      // For now, we'll return a placeholder
      const contract = await getContract(contractId);
      if (!contract) {
        throw new Error('Contrato não encontrado');
      }

      // In a real implementation, you would:
      // 1. Call a PDF generation service (like Puppeteer, jsPDF, etc.)
      // 2. Include contract content, signatures, and metadata
      // 3. Return the generated PDF as a Blob
      
      const pdfContent = `Contrato: ${contract.title}\n\nConteúdo: ${contract.content}`;
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      
      setLoading(false);
      return blob;
    } catch (err) {
      handleError(err, 'gerar PDF');
      return null;
    }
  }, [user, getContract, handleError]);

  const previewContract = useCallback((
    content: string,
    signatories: Signatory[]
  ): string => {
    let preview = content;
    
    // Replace placeholders with signatory information
    signatories.forEach((signatory, index) => {
      preview = preview.replace(
        new RegExp(`{{SIGNATORY_${index + 1}_NAME}}`, 'g'),
        signatory.name
      );
      preview = preview.replace(
        new RegExp(`{{SIGNATORY_${index + 1}_EMAIL}}`, 'g'),
        signatory.email
      );
      preview = preview.replace(
        new RegExp(`{{SIGNATORY_${index + 1}_ROLE}}`, 'g'),
        signatory.role
      );
    });
    
    // Replace date placeholders
    preview = preview.replace(/{{DATE}}/g, new Date().toLocaleDateString('pt-BR'));
    preview = preview.replace(/{{DATETIME}}/g, new Date().toLocaleString('pt-BR'));
    
    return preview;
  }, []);

  const validateContractData = useCallback((
    data: CreateContractRequest
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Título é obrigatório');
    }

    if (!data.content || data.content.trim().length === 0) {
      errors.push('Conteúdo é obrigatório');
    }

    if (!data.contractType) {
      errors.push('Tipo de contrato é obrigatório');
    }

    if (!data.signatories || data.signatories.length === 0) {
      errors.push('Pelo menos um signatário é obrigatório');
    } else {
      data.signatories.forEach((signatory, index) => {
        if (!signatory.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signatory.email)) {
          errors.push(`E-mail do signatário ${index + 1} é inválido`);
        }
        if (!signatory.name || signatory.name.trim().length === 0) {
          errors.push(`Nome do signatário ${index + 1} é obrigatório`);
        }
        if (!signatory.role) {
          errors.push(`Papel do signatário ${index + 1} é obrigatório`);
        }
      });
    }

    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      if (expirationDate <= new Date()) {
        errors.push('Data de expiração deve ser futura');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await getContracts();
  }, [getContracts]);

  // Auto-refresh contracts when user changes
  useEffect(() => {
    if (user) {
      getContracts();
    }
  }, [user, getContracts]);

  return {
    // State
    contracts,
    currentContract,
    signatures,
    loading,
    error,
    
    // Contract management
    createContract,
    getContract,
    getContracts,
    updateContract,
    deleteContract,
    
    // Signature management
    signContract,
    getContractSignatures,
    validateSignature,
    
    // Contract progress
    getContractProgress,
    sendSignatureReminder,
    
    // Utilities
    generateContractPDF,
    previewContract,
    validateContractData,
    
    // State management
    setCurrentContract,
    clearError,
    refresh,
  };
};

// =====================================================
// CONTRACT UTILITIES HOOK
// =====================================================

interface UseContractUtilitiesReturn {
  getContractTypeLabel: (type: ContractType) => string;
  getContractStatusLabel: (status: ContractStatus) => string;
  getContractStatusColor: (status: ContractStatus) => string;
  getSignatoryRoleLabel: (role: SignatoryRole) => string;
  getSignatureTypeLabel: (type: SignatureType) => string;
  formatContractNumber: (number: string) => string;
  isContractExpired: (contract: DigitalContract) => boolean;
  isContractExpiringSoon: (contract: DigitalContract, days?: number) => boolean;
  canUserSignContract: (contract: DigitalContract, userEmail: string) => boolean;
  getNextRequiredSignatory: (contract: DigitalContract, signatures: DigitalContractSignature[]) => Signatory | null;
}

export const useContractUtilities = (): UseContractUtilitiesReturn => {
  const getContractTypeLabel = useCallback((type: ContractType): string => {
    const labels: Record<ContractType, string> = {
      SERVICE: 'Prestação de Serviços',
      PURCHASE: 'Compra e Venda',
      EMPLOYMENT: 'Trabalho',
      NDA: 'Confidencialidade (NDA)',
      PARTNERSHIP: 'Parceria',
      LEASE: 'Locação',
      LOAN: 'Empréstimo',
      OTHER: 'Outros',
    };
    return labels[type] || type;
  }, []);

  const getContractStatusLabel = useCallback((status: ContractStatus): string => {
    const labels: Record<ContractStatus, string> = {
      DRAFT: 'Rascunho',
      PENDING_SIGNATURES: 'Aguardando Assinaturas',
      PARTIALLY_SIGNED: 'Parcialmente Assinado',
      FULLY_SIGNED: 'Totalmente Assinado',
      EXPIRED: 'Expirado',
      CANCELLED: 'Cancelado',
      COMPLETED: 'Concluído',
    };
    return labels[status] || status;
  }, []);

  const getContractStatusColor = useCallback((status: ContractStatus): string => {
    const colors: Record<ContractStatus, string> = {
      DRAFT: 'gray',
      PENDING_SIGNATURES: 'yellow',
      PARTIALLY_SIGNED: 'blue',
      FULLY_SIGNED: 'green',
      EXPIRED: 'red',
      CANCELLED: 'red',
      COMPLETED: 'green',
    };
    return colors[status] || 'gray';
  }, []);

  const getSignatoryRoleLabel = useCallback((role: SignatoryRole): string => {
    const labels: Record<SignatoryRole, string> = {
      SIGNER: 'Signatário',
      WITNESS: 'Testemunha',
      APPROVER: 'Aprovador',
      NOTARY: 'Tabelião',
    };
    return labels[role] || role;
  }, []);

  const getSignatureTypeLabel = useCallback((type: SignatureType): string => {
    const labels: Record<SignatureType, string> = {
      DIGITAL: 'Assinatura Digital',
      ELECTRONIC: 'Assinatura Eletrônica',
      BIOMETRIC: 'Assinatura Biométrica',
      HANDWRITTEN: 'Assinatura Manuscrita',
      TYPED: 'Assinatura Digitada',
    };
    return labels[type] || type;
  }, []);

  const formatContractNumber = useCallback((number: string): string => {
    // Format: YYYY-MM-NNNN (e.g., 2024-01-0001)
    if (number.length >= 8) {
      return `${number.slice(0, 4)}-${number.slice(4, 6)}-${number.slice(6)}`;
    }
    return number;
  }, []);

  const isContractExpired = useCallback((contract: DigitalContract): boolean => {
    if (!contract.expiresAt) return false;
    return new Date(contract.expiresAt) < new Date();
  }, []);

  const isContractExpiringSoon = useCallback((
    contract: DigitalContract,
    days: number = 7
  ): boolean => {
    if (!contract.expiresAt) return false;
    const expirationDate = new Date(contract.expiresAt);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);
    return expirationDate <= warningDate && expirationDate > new Date();
  }, []);

  const canUserSignContract = useCallback((
    contract: DigitalContract,
    userEmail: string
  ): boolean => {
    return contract.signatories.some(signatory => 
      signatory.email.toLowerCase() === userEmail.toLowerCase() && signatory.required
    );
  }, []);

  const getNextRequiredSignatory = useCallback((
    contract: DigitalContract,
    signatures: DigitalContractSignature[]
  ): Signatory | null => {
    const signedEmails = new Set(
      signatures.map(sig => sig.signatoryEmail.toLowerCase())
    );
    
    return contract.signatories
      .filter(signatory => signatory.required)
      .find(signatory => !signedEmails.has(signatory.email.toLowerCase())) || null;
  }, []);

  return {
    getContractTypeLabel,
    getContractStatusLabel,
    getContractStatusColor,
    getSignatoryRoleLabel,
    getSignatureTypeLabel,
    formatContractNumber,
    isContractExpired,
    isContractExpiringSoon,
    canUserSignContract,
    getNextRequiredSignatory,
  };
};
