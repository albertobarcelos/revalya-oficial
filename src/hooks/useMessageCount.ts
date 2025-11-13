/**
 * 🔐 Hook Seguro para Contagem de Mensagens por Cobrança
 * 
 * Este hook busca a contagem de mensagens enviadas para cada cobrança,
 * filtrando apenas mensagens enviadas após a criação da cobrança.
 */

import { useMemo } from 'react';
import { useTenantAccessGuard, useSecureTenantQuery } from './templates/useSecureTenantQuery';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ChargeDateMap {
  [chargeId: string]: string; // ISO date string
}

interface UseMessageCountParams {
  chargeIds: string[];
  chargeDates: ChargeDateMap; // Map de chargeId -> data de criação da cobrança
}

/**
 * Hook que retorna um Map com a contagem de mensagens por charge_id
 * Filtra mensagens enviadas após a criação da cobrança
 */
export function useMessageCount({ chargeIds, chargeDates }: UseMessageCountParams) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Query otimizada - busca todas as contagens em uma única chamada
  const { data: messageCounts, isLoading } = useSecureTenantQuery(
    ['message-counts', chargeIds.sort().join(',')],
    async (supabase: SupabaseClient, tenantId: string) => {
      // Se não houver chargeIds, retornar objeto vazio
      if (!chargeIds || chargeIds.length === 0) {
        return {};
      }

      console.log(`🔍 [MESSAGE COUNT] Buscando contagens para ${chargeIds.length} cobranças`);

      // AIDEV-NOTE: Buscar todas as mensagens para os chargeIds fornecidos
      // Filtrar por tenant_id e charge_id IN (...)
      const { data: messages, error } = await supabase
        .from('message_history')
        .select('charge_id, created_at')
        .eq('tenant_id', tenantId)
        .in('charge_id', chargeIds);

      if (error) {
        console.error('🚨 [MESSAGE COUNT] Erro ao buscar mensagens:', error);
        throw error;
      }

      // AIDEV-NOTE: Contar mensagens por charge_id, filtrando por data da cobrança
      const counts: { [chargeId: string]: number } = {};
      
      (messages || []).forEach((msg) => {
        const chargeId = msg.charge_id;
        const messageDate = new Date(msg.created_at);
        const chargeDate = chargeDates[chargeId] ? new Date(chargeDates[chargeId]) : null;

        // AIDEV-NOTE: Só contar se a mensagem foi enviada após a criação da cobrança
        if (!chargeDate || messageDate >= chargeDate) {
          counts[chargeId] = (counts[chargeId] || 0) + 1;
        }
      });

      // AIDEV-NOTE: Garantir que todos os chargeIds tenham uma entrada (mesmo que 0)
      chargeIds.forEach((chargeId) => {
        if (!(chargeId in counts)) {
          counts[chargeId] = 0;
        }
      });

      console.log(`✅ [MESSAGE COUNT] Contagens calculadas:`, counts);

      return counts;
    },
    {
      enabled: hasAccess && !!currentTenant?.id && chargeIds.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutos de cache
    }
  );

  // AIDEV-NOTE: Retornar Map otimizado usando useMemo
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    if (messageCounts) {
      Object.entries(messageCounts).forEach(([chargeId, count]) => {
        map.set(chargeId, count);
      });
    }
    return map;
  }, [messageCounts]);

  return {
    messageCounts: countMap,
    isLoading,
    hasAccess,
  };
}

