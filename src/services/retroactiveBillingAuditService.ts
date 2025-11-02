// =====================================================
// SERVIÇO DE AUDITORIA PARA FATURAMENTO RETROATIVO
// Descrição: Sistema especializado para monitorar e auditar aplicação da lógica retroativa
// =====================================================

import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import type { Contract, BillingPeriod } from '../utils/retroactiveBillingUtils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface RetroactiveBillingAuditEntry {
  tenant_id: string
  contract_id: string
  user_id?: string
  action: RetroactiveBillingAction
  details: RetroactiveBillingDetails
  metadata?: Record<string, any>
  timestamp?: Date
  ip_address?: string
  user_agent?: string
}

export type RetroactiveBillingAction = 
  | 'RETROACTIVE_LOGIC_APPLIED'
  | 'RETROACTIVE_PERIODS_CALCULATED'
  | 'RETROACTIVE_BILLING_GENERATED'
  | 'RETROACTIVE_FORECAST_CREATED'
  | 'RETROACTIVE_VALIDATION_FAILED'
  | 'RETROACTIVE_LOGIC_SKIPPED'

export interface RetroactiveBillingDetails {
  contract_number?: string
  contract_start_date?: string
  contract_end_date?: string
  billing_cycle?: string
  periods_generated?: number
  total_amount?: number
  validation_errors?: string[]
  calculation_method?: string
  applied_rules?: string[]
  performance_metrics?: {
    calculation_time_ms: number
    periods_processed: number
    database_queries: number
  }
}

export interface RetroactiveBillingStats {
  total_contracts_processed: number
  total_periods_generated: number
  total_amount_calculated: number
  success_rate: number
  average_processing_time_ms: number
  errors_count: number
  last_execution: Date
}

// =====================================================
// SERVIÇO DE AUDITORIA RETROATIVA
// =====================================================

class RetroactiveBillingAuditService {
  
  /**
   * AIDEV-NOTE: Registra evento de aplicação da lógica retroativa
   * Centraliza todos os logs relacionados ao faturamento retroativo
   */
  async logRetroactiveApplication(entry: RetroactiveBillingAuditEntry): Promise<void> {
    try {
      const auditEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date()
      }

      // Log no sistema de auditoria geral
      await logger.audit({
        userId: entry.user_id,
        tenantId: entry.tenant_id,
        action: 'billing_retroactive_applied',
        resourceType: 'contract',
        resourceId: entry.contract_id,
        metadata: {
          action: entry.action,
          details: entry.details,
          ...entry.metadata
        },
        ipAddress: entry.ip_address,
        userAgent: entry.user_agent
      })

      // Log específico para faturamento retroativo
      await this.saveRetroactiveAuditLog(auditEntry)

      // Log estruturado para monitoramento
      logger.info(`Retroactive billing audit: ${entry.action}`, {
        contractId: entry.contract_id,
        tenantId: entry.tenant_id,
        action: entry.action,
        details: entry.details
      })

    } catch (error) {
      logger.error('Erro ao registrar auditoria retroativa', {
        error: error instanceof Error ? error.message : String(error),
        entry
      })
    }
  }

  /**
   * AIDEV-NOTE: Registra início do processamento retroativo
   */
  async logRetroactiveStart(
    tenantId: string,
    contractId: string,
    contract: Contract,
    userId?: string
  ): Promise<void> {
    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_LOGIC_APPLIED',
      details: {
        contract_number: contract.contract_number,
        contract_start_date: contract.start_date,
        contract_end_date: contract.end_date,
        billing_cycle: contract.billing_cycle,
        calculation_method: 'automatic_retroactive'
      }
    })
  }

  /**
   * AIDEV-NOTE: Registra cálculo de períodos retroativos
   */
  async logRetroactiveCalculation(
    tenantId: string,
    contractId: string,
    periods: BillingPeriod[],
    calculationTimeMs: number,
    userId?: string
  ): Promise<void> {
    const totalAmount = periods.reduce((sum, period) => sum + (period.amount || 0), 0)

    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_PERIODS_CALCULATED',
      details: {
        periods_generated: periods.length,
        total_amount: totalAmount,
        performance_metrics: {
          calculation_time_ms: calculationTimeMs,
          periods_processed: periods.length,
          database_queries: 1 // Será incrementado conforme necessário
        }
      }
    })
  }

  /**
   * AIDEV-NOTE: Registra geração de faturamentos retroativos
   */
  async logRetroactiveBillingGeneration(
    tenantId: string,
    contractId: string,
    generatedBillings: number,
    totalAmount: number,
    userId?: string
  ): Promise<void> {
    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_BILLING_GENERATED',
      details: {
        periods_generated: generatedBillings,
        total_amount: totalAmount,
        applied_rules: ['retroactive_billing_generation', 'automatic_due_date_calculation']
      }
    })
  }

  /**
   * AIDEV-NOTE: Registra criação de previsões retroativas
   */
  async logRetroactiveForecastCreation(
    tenantId: string,
    contractId: string,
    forecastsCreated: number,
    userId?: string
  ): Promise<void> {
    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_FORECAST_CREATED',
      details: {
        periods_generated: forecastsCreated,
        applied_rules: ['retroactive_forecast_generation', 'future_period_calculation']
      }
    })
  }

  /**
   * AIDEV-NOTE: Registra falha na validação retroativa
   */
  async logRetroactiveValidationFailure(
    tenantId: string,
    contractId: string,
    errors: string[],
    userId?: string
  ): Promise<void> {
    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_VALIDATION_FAILED',
      details: {
        validation_errors: errors,
        applied_rules: ['retroactive_validation']
      }
    })
  }

  /**
   * AIDEV-NOTE: Registra quando a lógica retroativa é ignorada
   */
  async logRetroactiveSkipped(
    tenantId: string,
    contractId: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    await this.logRetroactiveApplication({
      tenant_id: tenantId,
      contract_id: contractId,
      user_id: userId,
      action: 'RETROACTIVE_LOGIC_SKIPPED',
      details: {
        validation_errors: [reason],
        applied_rules: ['retroactive_validation_check']
      }
    })
  }

  /**
   * AIDEV-NOTE: Busca logs de auditoria retroativa
   */
  async getRetroactiveAuditLogs(
    tenantId: string,
    filters?: {
      contractId?: string
      action?: RetroactiveBillingAction
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    }
  ): Promise<{ logs: any[]; total: number }> {
    try {
      let query = supabase
        .from('retroactive_billing_audit')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (filters?.contractId) {
        query = query.eq('contract_id', filters.contractId)
      }

      if (filters?.action) {
        query = query.eq('action', filters.action)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        logs: data || [],
        total: count || 0
      }

    } catch (error) {
      logger.error('Erro ao buscar logs de auditoria retroativa', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        filters
      })
      return { logs: [], total: 0 }
    }
  }

  /**
   * AIDEV-NOTE: Gera estatísticas de faturamento retroativo
   */
  async getRetroactiveStats(
    tenantId: string,
    period?: { startDate: Date; endDate: Date }
  ): Promise<RetroactiveBillingStats> {
    try {
      let query = supabase
        .from('retroactive_billing_audit')
        .select('*')
        .eq('tenant_id', tenantId)

      if (period) {
        query = query
          .gte('created_at', period.startDate.toISOString())
          .lte('created_at', period.endDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const logs = data || []
      const contractsProcessed = new Set(logs.map(log => log.contract_id)).size
      const periodsGenerated = logs
        .filter(log => log.action === 'RETROACTIVE_PERIODS_CALCULATED')
        .reduce((sum, log) => sum + (log.details?.periods_generated || 0), 0)
      
      const totalAmount = logs
        .filter(log => log.action === 'RETROACTIVE_BILLING_GENERATED')
        .reduce((sum, log) => sum + (log.details?.total_amount || 0), 0)

      const successfulLogs = logs.filter(log => 
        !log.action.includes('FAILED') && !log.action.includes('SKIPPED')
      )
      const successRate = logs.length > 0 ? (successfulLogs.length / logs.length) * 100 : 0

      const processingTimes = logs
        .filter(log => log.details?.performance_metrics?.calculation_time_ms)
        .map(log => log.details.performance_metrics.calculation_time_ms)
      
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0

      const errorsCount = logs.filter(log => 
        log.action.includes('FAILED') || log.action.includes('SKIPPED')
      ).length

      const lastExecution = logs.length > 0 
        ? new Date(logs[0].created_at) 
        : new Date()

      return {
        total_contracts_processed: contractsProcessed,
        total_periods_generated: periodsGenerated,
        total_amount_calculated: totalAmount,
        success_rate: successRate,
        average_processing_time_ms: averageProcessingTime,
        errors_count: errorsCount,
        last_execution: lastExecution
      }

    } catch (error) {
      logger.error('Erro ao gerar estatísticas retroativas', {
        error: error instanceof Error ? error.message : String(error),
        tenantId
      })

      return {
        total_contracts_processed: 0,
        total_periods_generated: 0,
        total_amount_calculated: 0,
        success_rate: 0,
        average_processing_time_ms: 0,
        errors_count: 0,
        last_execution: new Date()
      }
    }
  }

  /**
   * AIDEV-NOTE: Salva log específico de auditoria retroativa
   * Método privado para persistir dados na tabela específica
   */
  private async saveRetroactiveAuditLog(entry: RetroactiveBillingAuditEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('retroactive_billing_audit')
        .insert({
          tenant_id: entry.tenant_id,
          contract_id: entry.contract_id,
          user_id: entry.user_id,
          action: entry.action,
          details: entry.details,
          metadata: entry.metadata,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          created_at: entry.timestamp?.toISOString()
        })

      if (error) {
        throw error
      }

    } catch (error) {
      // Log no sistema geral se falhar na tabela específica
      logger.error('Erro ao salvar log de auditoria retroativa', {
        error: error instanceof Error ? error.message : String(error),
        entry
      })
    }
  }
}

// =====================================================
// EXPORTAÇÃO
// =====================================================

export const retroactiveBillingAuditService = new RetroactiveBillingAuditService()
export default retroactiveBillingAuditService