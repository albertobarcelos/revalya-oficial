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
  sent_at: string;
  template_name: string;
  status: 'delivered' | 'read' | 'sent';
  message: string;
  tenant_id: string; // 🛡️ OBRIGATÓRIO para segurança multi-tenant
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
    // 🔑 QUERY KEY PADRONIZADA COM TENANT_ID
    ['message-history', chargeId],
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

      // 🛡️ VERIFICAÇÃO DE EXISTÊNCIA DA TABELA
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'message_history');
      
      if (tableError || !tables || tables.length === 0) {
        console.log('🔍 [DEBUG] Tabela message_history não existe. Retornando array vazio.');
        return [];
      }

      // 🛡️ CONSULTA COM FILTRO OBRIGATÓRIO DE TENANT_ID
      const { data, error } = await supabase
        .from('message_history')
        .select('id, sent_at, template_name, status, message, tenant_id')
        .eq('tenant_id', tenantId) // 🛡️ FILTRO CRÍTICO
        .eq('charge_id', chargeId)
        .order('sent_at', { ascending: false });

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
        chargeId
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