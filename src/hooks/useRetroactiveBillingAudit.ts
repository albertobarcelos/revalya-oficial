// =====================================================
// HOOK PARA AUDITORIA DE FATURAMENTO RETROATIVO
// Descrição: Hook React para gerenciar logs e auditoria de faturamento retroativo
// =====================================================

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenantAccessGuard } from './templates/useTenantAccessGuard'
import { retroactiveBillingAuditService } from '../services/retroactiveBillingAuditService'
import type { 
  RetroactiveBillingAction, 
  RetroactiveBillingStats,
  RetroactiveBillingAuditEntry 
} from '../services/retroactiveBillingAuditService'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UseRetroactiveBillingAuditReturn {
  // Estados
  isLoading: boolean
  isError: boolean
  error: Error | null
  
  // Dados
  auditLogs: any[]
  totalLogs: number
  stats: RetroactiveBillingStats | null
  
  // Funções
  fetchLogs: (filters?: AuditFilters) => Promise<void>
  refreshStats: () => Promise<void>
  logRetroactiveStart: (contractId: string, contract: any) => Promise<void>
  logRetroactiveCalculation: (contractId: string, periods: any[], calculationTimeMs: number) => Promise<void>
  logRetroactiveBillingGeneration: (contractId: string, generatedBillings: number, totalAmount: number) => Promise<void>
  logRetroactiveForecastCreation: (contractId: string, forecastsCreated: number) => Promise<void>
  logRetroactiveValidationFailure: (contractId: string, errors: string[]) => Promise<void>
  logRetroactiveSkipped: (contractId: string, reason: string) => Promise<void>
}

export interface AuditFilters {
  contractId?: string
  action?: RetroactiveBillingAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

/**
 * AIDEV-NOTE: Hook para gerenciar auditoria de faturamento retroativo
 * Integra com o sistema de segurança multi-tenant e fornece interface React
 */
export function useRetroactiveBillingAudit(): UseRetroactiveBillingAuditReturn {
  // Guard de segurança multi-tenant
  const { hasAccess, currentTenant, currentUser } = useTenantAccessGuard()
  
  // Estados locais
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Query para estatísticas
  const {
    data: stats,
    refetch: refreshStats,
    isLoading: isStatsLoading
  } = useQuery({
    queryKey: ['retroactive-billing-stats', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null
      return await retroactiveBillingAuditService.getRetroactiveStats(currentTenant.id)
    },
    enabled: !!currentTenant?.id && hasAccess,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  })

  /**
   * AIDEV-NOTE: Busca logs de auditoria com filtros
   */
  const fetchLogs = useCallback(async (filters?: AuditFilters) => {
    if (!currentTenant?.id || !hasAccess) {
      setIsError(true)
      setError(new Error('Acesso negado ou tenant não encontrado'))
      return
    }

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const result = await retroactiveBillingAuditService.getRetroactiveAuditLogs(
        currentTenant.id,
        filters
      )

      setAuditLogs(result.logs)
      setTotalLogs(result.total)

    } catch (err) {
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Erro ao buscar logs'))
      setAuditLogs([])
      setTotalLogs(0)
    } finally {
      setIsLoading(false)
    }
  }, [currentTenant?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra início do processamento retroativo
   */
  const logRetroactiveStart = useCallback(async (
    contractId: string, 
    contract: any
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveStart(
        currentTenant.id,
        contractId,
        contract,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar início retroativo:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra cálculo de períodos retroativos
   */
  const logRetroactiveCalculation = useCallback(async (
    contractId: string,
    periods: any[],
    calculationTimeMs: number
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveCalculation(
        currentTenant.id,
        contractId,
        periods,
        calculationTimeMs,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar cálculo retroativo:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra geração de faturamentos retroativos
   */
  const logRetroactiveBillingGeneration = useCallback(async (
    contractId: string,
    generatedBillings: number,
    totalAmount: number
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveBillingGeneration(
        currentTenant.id,
        contractId,
        generatedBillings,
        totalAmount,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar geração de faturamentos:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra criação de previsões retroativas
   */
  const logRetroactiveForecastCreation = useCallback(async (
    contractId: string,
    forecastsCreated: number
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveForecastCreation(
        currentTenant.id,
        contractId,
        forecastsCreated,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar criação de previsões:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra falha na validação retroativa
   */
  const logRetroactiveValidationFailure = useCallback(async (
    contractId: string,
    errors: string[]
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveValidationFailure(
        currentTenant.id,
        contractId,
        errors,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar falha de validação:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  /**
   * AIDEV-NOTE: Registra quando a lógica retroativa é ignorada
   */
  const logRetroactiveSkipped = useCallback(async (
    contractId: string,
    reason: string
  ) => {
    if (!currentTenant?.id || !hasAccess) return

    try {
      await retroactiveBillingAuditService.logRetroactiveSkipped(
        currentTenant.id,
        contractId,
        reason,
        currentUser?.id
      )
    } catch (err) {
      console.error('Erro ao registrar lógica ignorada:', err)
    }
  }, [currentTenant?.id, currentUser?.id, hasAccess])

  return {
    // Estados
    isLoading: isLoading || isStatsLoading,
    isError,
    error,
    
    // Dados
    auditLogs,
    totalLogs,
    stats: stats || null,
    
    // Funções
    fetchLogs,
    refreshStats: () => refreshStats(),
    logRetroactiveStart,
    logRetroactiveCalculation,
    logRetroactiveBillingGeneration,
    logRetroactiveForecastCreation,
    logRetroactiveValidationFailure,
    logRetroactiveSkipped
  }
}