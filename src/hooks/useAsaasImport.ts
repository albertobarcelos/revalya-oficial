// =====================================================
// HOOK: useAsaasImport
// Descrição: Hook para importação ativa de cobranças ASAAS
// =====================================================

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';
import { toast } from 'sonner';

// AIDEV-NOTE: Interface para parâmetros de importação
export interface AsaasImportParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  limit?: number;
}

// AIDEV-NOTE: Interface para resultado da importação
export interface AsaasImportResult {
  success: boolean;
  summary: {
    total_imported: number;
    total_updated: number;
    total_skipped: number;
    total_processed: number;
    total_errors: number;
    imported_ids: string[];
    updated_ids: string[];
    skipped_ids: string[];
    errors: string[];
  };
  error?: string;
}

// AIDEV-NOTE: Hook principal para importação ASAAS
export function useAsaasImport() {
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  // AIDEV-NOTE: Função para chamar a Edge Function de importação
  const callImportFunction = useCallback(async (params: AsaasImportParams): Promise<AsaasImportResult> => {
    if (!currentTenant?.id) {
      throw new Error('Tenant não identificado');
    }

    const { data, error } = await supabase.functions.invoke('asaas-import-charges', {
      body: {
        tenant_id: currentTenant.id,
        start_date: params.startDate,
        end_date: params.endDate,
        limit: params.limit || 100
      }
    });

    if (error) {
      console.error('❌ Erro ao chamar Edge Function:', error);
      throw new Error(error.message || 'Erro na importação ASAAS');
    }

    return data as AsaasImportResult;
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Mutation para importação com feedback visual
  const importMutation = useMutation({
    mutationFn: callImportFunction,
    onMutate: () => {
      setIsImporting(true);
      toast.loading('Iniciando importação ASAAS...', {
        id: 'asaas-import'
      });
    },
    onSuccess: (result) => {
      setIsImporting(false);
      
      // AIDEV-NOTE: Validar estrutura da resposta antes de acessar propriedades
      if (!result) {
        console.error('❌ Resposta da Edge Function é null/undefined');
        toast.error('Erro: Resposta inválida da importação', {
          id: 'asaas-import'
        });
        return;
      }

      console.log('📥 Resposta recebida da Edge Function:', result);
      
      if (result.success) {
        // AIDEV-NOTE: Validar se summary existe na resposta
        if (!result.summary) {
          console.error('❌ Propriedade summary não encontrada na resposta:', result);
          toast.error('Erro: Estrutura de resposta inválida (summary ausente)', {
            id: 'asaas-import'
          });
          return;
        }

        const { summary } = result;
        
        // AIDEV-NOTE: Validar propriedades essenciais do summary
        const totalImported = summary.total_imported ?? 0;
        const totalUpdated = summary.total_updated ?? 0;
        const totalSkipped = summary.total_skipped ?? 0;
        const totalProcessed = summary.total_processed ?? 0;
        const totalErrors = summary.total_errors ?? 0;
        
        // Invalidar queries relacionadas para atualizar dados
        queryClient.invalidateQueries({ 
          queryKey: ['reconciliation-data', currentTenant?.id] 
        });
        
        // AIDEV-NOTE: Toast de sucesso com estatísticas detalhadas
        const successMessage = totalUpdated > 0 
          ? `Importação concluída! ${totalImported} novos, ${totalUpdated} atualizados`
          : `Importação concluída! ${totalImported} novos registros`;
          
        const description = [];
        if (totalSkipped > 0) description.push(`${totalSkipped} já existentes`);
        if (totalErrors > 0) description.push(`${totalErrors} erros`);
        
        toast.success(successMessage, {
          id: 'asaas-import',
          duration: 6000,
          description: description.length > 0 ? description.join(', ') : undefined
        });

        // Log detalhado para debug
        console.log('✅ Importação ASAAS concluída:', {
          imported: totalImported,
          updated: totalUpdated,
          skipped: totalSkipped,
          processed: totalProcessed,
          errors: totalErrors,
          importedIds: summary.imported_ids || [],
          updatedIds: summary.updated_ids || [],
          skippedIds: summary.skipped_ids || [],
          errorDetails: summary.errors || []
        });

      } else {
        const errorMessage = result.error || 'Erro desconhecido na importação';
        console.error('❌ Importação falhou:', errorMessage);
        toast.error(`Erro na importação: ${errorMessage}`, {
          id: 'asaas-import'
        });
      }
    },
    onError: (error) => {
      setIsImporting(false);
      console.error('❌ Erro na importação ASAAS:', error);
      
      toast.error(`Falha na importação: ${error.message}`, {
        id: 'asaas-import',
        duration: 5000
      });
    }
  });

  // AIDEV-NOTE: Função principal de importação
  const importCharges = useCallback((params: AsaasImportParams) => {
    if (!hasAccess) {
      toast.error('Acesso negado para importação');
      return;
    }

    if (!currentTenant?.id) {
      toast.error('Tenant não identificado');
      return;
    }

    // Validações básicas
    if (!params.startDate || !params.endDate) {
      toast.error('Datas de início e fim são obrigatórias');
      return;
    }

    if (params.startDate > params.endDate) {
      toast.error('Data de início deve ser anterior à data de fim');
      return;
    }

    // Validar período máximo (ex: 90 dias)
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      toast.error('Período máximo de importação é 90 dias');
      return;
    }

    // Executar importação
    importMutation.mutate(params);
  }, [hasAccess, currentTenant?.id, importMutation]);

  return {
    // Estados
    isImporting: isImporting || importMutation.isPending,
    hasAccess,
    
    // Funções
    importCharges,
    
    // Dados da última importação
    lastImportResult: importMutation.data,
    lastImportError: importMutation.error,
    
    // Status da mutation
    isSuccess: importMutation.isSuccess,
    isError: importMutation.isError,
    
    // Reset da mutation
    reset: importMutation.reset
  };
}