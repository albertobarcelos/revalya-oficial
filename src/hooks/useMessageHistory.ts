/**
 * 🔐 Hook Seguro para Histórico de Mensagens
 * 
 * Este hook implementa todas as 5 camadas de segurança multi-tenant:
 * - Validação de acesso via useTenantAccessGuard
 * - Consultas seguras via useSecureTenantQuery
 * - Query keys padronizadas com tenant_id
 * - Validação dupla de dados
 * - Logs de auditoria obrigatórios
 */

import { useToast } from '@/components/ui/use-toast';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';

export interface MessageHistory {
  id: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
  charge_id: string;
  template_id: string | null;
  customer_id: string | null;
  message: string;
  status: string;
  error_details: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  batch_id: string | null;
}

export function useMessageHistory(chargeId: string | null) {
  const { toast } = useToast();
  
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();

  // 🔐 CONSULTA SEGURA COM VALIDAÇÃO MULTI-TENANT
  const {
    data: messageHistory,
    isLoading,
    error,
    refetch: refreshMessageHistory
  } = useSecureTenantQuery(
    // 🔑 QUERY KEY PADRONIZADA - useSecureTenantQuery adiciona tenant_id automaticamente
    ['message-history-by-charge', chargeId],
    async (supabase, tenantId) => {
      // AIDEV-NOTE: Validação crítica - chargeId deve existir
      if (!chargeId) {
        console.log('🔍 [DEBUG] useMessageHistory - ChargeId não fornecido, retornando array vazio');
        return [];
      }

      console.log('🔍 [DEBUG] useMessageHistory - Iniciando busca segura:', { 
        chargeId, 
        tenantId,
        currentTenant: currentTenant?.name 
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      console.log(`🔍 [QUERY] useMessageHistory - Executando query:`, {
        tenantId,
        chargeId,
        query: 'SELECT from message_history WHERE tenant_id = ? AND charge_id = ?'
      });

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      const { data, error } = await supabase
        .from('message_history')
        .select('id, tenant_id, charge_id, template_id, customer_id, message, status, error_details, metadata, created_at, updated_at, batch_id')
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .eq('charge_id', chargeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🚨 [ERROR] useMessageHistory - Erro na consulta:', error);
        throw error;
      }

      // 🛡️ VALIDAÇÃO DUPLA DE SEGURANÇA (CAMADA 3)
      if (data) {
        const invalidData = data.filter(item => item.tenant_id !== tenantId);
        if (invalidData.length > 0) {
          console.error('🚨 [CRITICAL] Violação de segurança detectada! Mensagens de outros tenants:', invalidData);
          throw new Error('❌ ERRO CRÍTICO: Violação de isolamento de dados detectada!');
        }
        console.log(`✅ [SECURITY] ${data.length} mensagens validadas para tenant ${tenantId}`);
      }

      // 🔍 LOGS DE AUDITORIA
      console.log('✅ [DEBUG] useMessageHistory - Dados carregados com sucesso:', {
        count: data?.length || 0,
        tenantId,
        chargeId,
        statuses: data?.map(m => m.status) || []
      });

      return data || [];
    },
    {
      enabled: !!currentTenant?.id && !!chargeId, // 🔒 SÓ EXECUTA SE TENANT E CHARGE VÁLIDOS
      onError: (error) => {
        console.error('🚨 [ERROR] useMessageHistory - Erro no hook:', error);
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar o histórico de mensagens.",
          variant: "destructive"
        });
      }
    }
  );

  return {
    messageHistory: messageHistory || [],
    isLoading,
    refreshMessageHistory,
    hasAccess,
    accessError
  };
}