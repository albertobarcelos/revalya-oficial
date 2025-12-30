/**
 * Serviço Fiscal Engine
 * 
 * AIDEV-NOTE: Wrapper client-side para Edge Function fiscal-engine
 * Aplica regras de negócio não negociáveis para emissão de notas fiscais
 * 
 * @module FiscalEngine
 */

import { edgeFunctionService } from '../edgeFunctionService';
import type {
  CanEmitProductInvoiceRequest,
  CanEmitProductInvoiceResponse,
  EmitProductInvoiceRequest,
  EmitInvoiceResponse,
  CanEmitServiceInvoiceRequest,
  CanEmitServiceInvoiceResponse,
  EmitServiceInvoiceRequest
} from '@/types/fiscal';

/**
 * AIDEV-NOTE: Serviço centralizado para operações fiscais
 * Todas as operações passam pela Edge Function que aplica regras de negócio
 */
export const fiscalEngine = {
  /**
   * Verifica se pode emitir NF-e para um billing_period_id
   */
  async canEmitProductInvoice(
    billingPeriodId: string,
    tenantId?: string
  ): Promise<CanEmitProductInvoiceResponse> {
    try {
      const request: CanEmitProductInvoiceRequest = {
        billing_period_id: billingPeriodId,
        tenant_id: tenantId
      };

      const response = await edgeFunctionService.callEdgeFunction<
        CanEmitProductInvoiceRequest,
        CanEmitProductInvoiceResponse
      >(
        'fiscal-engine/nfe/can-emit',
        request,
        tenantId
      );

      return response;
    } catch (error) {
      console.error('[FiscalEngine] Erro ao verificar se pode emitir NF-e:', error);
      return {
        canEmit: false,
        reason: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  },

  /**
   * Emite NF-e para um billing_period_id
   * AIDEV-NOTE: A Edge Function valida regras e calcula valor automaticamente
   */
  async emitProductInvoice(
    billingPeriodId: string,
    tenantId?: string
  ): Promise<EmitInvoiceResponse> {
    try {
      const request: EmitProductInvoiceRequest = {
        billing_period_id: billingPeriodId,
        tenant_id: tenantId
      };

      const response = await edgeFunctionService.callEdgeFunction<
        EmitProductInvoiceRequest,
        EmitInvoiceResponse
      >(
        'fiscal-engine/nfe/emit',
        request,
        tenantId
      );

      return response;
    } catch (error) {
      console.error('[FiscalEngine] Erro ao emitir NF-e:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  },

  /**
   * Verifica se pode emitir NFS-e para um charge_id
   */
  async canEmitServiceInvoice(
    chargeId: string,
    tenantId?: string
  ): Promise<CanEmitServiceInvoiceResponse> {
    try {
      const request: CanEmitServiceInvoiceRequest = {
        charge_id: chargeId,
        tenant_id: tenantId
      };

      const response = await edgeFunctionService.callEdgeFunction<
        CanEmitServiceInvoiceRequest,
        CanEmitServiceInvoiceResponse
      >(
        'fiscal-engine/nfse/can-emit',
        request,
        tenantId
      );

      return response;
    } catch (error) {
      console.error('[FiscalEngine] Erro ao verificar se pode emitir NFS-e:', error);
      return {
        canEmit: false,
        reason: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  },

  /**
   * Emite NFS-e para um charge_id
   * AIDEV-NOTE: A Edge Function calcula valor máximo automaticamente (MIN(valorPago, saldoServico))
   */
  async emitServiceInvoice(
    chargeId: string,
    tenantId?: string
  ): Promise<EmitInvoiceResponse> {
    try {
      const request: EmitServiceInvoiceRequest = {
        charge_id: chargeId,
        tenant_id: tenantId
      };

      const response = await edgeFunctionService.callEdgeFunction<
        EmitServiceInvoiceRequest,
        EmitInvoiceResponse
      >(
        'fiscal-engine/nfse/emit',
        request,
        tenantId
      );

      return response;
    } catch (error) {
      console.error('[FiscalEngine] Erro ao emitir NFS-e:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
};

export default fiscalEngine;

