/**
 * Hook para operações com FocusNFe
 * 
 * AIDEV-NOTE: Hook seguro multi-tenant para emissão de NFe e NFSe via FocusNFe
 * Documentação: https://doc.focusnfe.com.br/reference/introducao
 * 
 * @module useFocusNFe
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from './useTenantAccessGuard';
import { invoiceService } from '@/services/invoiceService';
import type {
  InvoiceResponse,
  InvoiceData
} from '@/services/invoiceService';
import type {
  RevalyaProduto,
  RevalyaCliente
} from '@/types/focusnfe';

/**
 * Hook para emitir NFSe (Nota Fiscal de Serviços)
 */
export function useEmitNFSe() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      finance_entry_id: string;
      invoiceData?: InvoiceData;
    }): Promise<InvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado ou tenant não encontrado');
      }

      // AIDEV-NOTE: Usar InvoiceService que já tem o Provider FocusNFe integrado
      return await invoiceService.issueInvoiceForFinanceEntry(
        params.finance_entry_id,
        'focusnfe'
      );
    },
    onSuccess: () => {
      // AIDEV-NOTE: Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['finance_entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

/**
 * Hook para emitir NFe (Nota Fiscal Eletrônica)
 * 
 * AIDEV-NOTE: Nova funcionalidade - emissão de NFe para produtos
 */
export function useEmitNFe() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      produtos: RevalyaProduto[];
      cliente: RevalyaCliente;
      naturezaOperacao?: string;
    }): Promise<InvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado ou tenant não encontrado');
      }

      // AIDEV-NOTE: Buscar provider FocusNFe do InvoiceService
      const provider = (invoiceService as any).providers?.get('focusnfe');
      if (!provider || !provider.createNFe) {
        throw new Error('Provider FocusNFe não configurado');
      }

      return await provider.createNFe(
        params.produtos.map(p => ({
          id: p.id,
          name: p.name,
          ncm: p.ncm || '',
          cfop: p.cfop || '',
          unidade: p.unit_of_measure || 'UN',
          quantidade: p.quantity,
          valor_unitario: p.unit_price,
          origem: p.origem,
          cst_icms: p.cst_icms,
          cst_pis: p.cst_pis,
          cst_cofins: p.cst_cofins
        })),
        params.cliente,
        params.naturezaOperacao
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

/**
 * Hook para consultar status de nota fiscal
 */
export function useInvoiceStatus(referencia?: string, enabled: boolean = true) {
  const { currentTenant, hasAccess } = useTenantAccessGuard();

  return useQuery({
    queryKey: ['focusnfe', 'status', currentTenant?.id, referencia],
    queryFn: async (): Promise<InvoiceResponse> => {
      if (!hasAccess || !currentTenant?.id || !referencia) {
        throw new Error('Parâmetros inválidos');
      }

      const provider = (invoiceService as any).providers?.get('focusnfe');
      if (!provider) {
        throw new Error('Provider FocusNFe não configurado');
      }

      return await provider.getInvoice(referencia);
    },
    enabled: enabled && hasAccess && !!currentTenant?.id && !!referencia,
    refetchInterval: (data) => {
      // AIDEV-NOTE: Polling automático se status for "processando"
      const status = (data as any)?.provider_response?.status;
      return status === 'processando' ? 5000 : false; // 5 segundos
    }
  });
}

/**
 * Hook para cancelar nota fiscal
 */
export function useCancelInvoice() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      finance_entry_id: string;
      justificativa?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado ou tenant não encontrado');
      }

      return await invoiceService.cancelInvoice(params.finance_entry_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

/**
 * Hook para verificar se FocusNFe está configurado
 */
export function useFocusNFeConfig() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();

  return useQuery({
    queryKey: ['focusnfe', 'config', currentTenant?.id],
    queryFn: async (): Promise<{
      isConfigured: boolean;
      isActive: boolean;
      environment?: 'homologacao' | 'producao';
    }> => {
      if (!hasAccess || !currentTenant?.id) {
        return { isConfigured: false, isActive: false };
      }

      // AIDEV-NOTE: Verificar se provider está disponível
      const provider = (invoiceService as any).providers?.get('focusnfe');
      return {
        isConfigured: !!provider,
        isActive: !!provider,
        environment: 'producao' // TODO: Buscar do banco
      };
    },
    enabled: hasAccess && !!currentTenant?.id,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}

/**
 * Hook principal - exporta todas as funcionalidades
 */
export function useFocusNFe() {
  const emitNFSe = useEmitNFSe();
  const emitNFe = useEmitNFe();
  const invoiceStatus = useInvoiceStatus();
  const cancelInvoice = useCancelInvoice();
  const config = useFocusNFeConfig();

  return {
    // Emissão
    emitNFSe,
    emitNFe,
    
    // Consulta
    invoiceStatus,
    
    // Cancelamento
    cancelInvoice,
    
    // Configuração
    config,
    
    // Helpers
    isConfigured: config.data?.isConfigured || false,
    isActive: config.data?.isActive || false
  };
}

