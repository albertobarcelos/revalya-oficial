/**
 * Tipos TypeScript para módulo fiscal
 * 
 * AIDEV-NOTE: Interfaces para operações fiscais (NF-e e NFS-e)
 * @module FiscalTypes
 */

/**
 * Tipo de nota fiscal
 */
export type FiscalInvoiceType = 'NFE' | 'NFSE';

/**
 * Origem da nota fiscal
 */
export type FiscalInvoiceOrigin = 'PRODUTO' | 'SERVICO';

/**
 * Status da nota fiscal
 */
export type FiscalInvoiceStatus = 'PENDENTE' | 'PROCESSANDO' | 'EMITIDA' | 'CANCELADA' | 'ERRO';

/**
 * Nota fiscal no banco de dados
 */
export interface FiscalInvoice {
  id: string;
  tenant_id: string;
  tipo: FiscalInvoiceType;
  origem: FiscalInvoiceOrigin;
  customer_id: string;
  contract_id?: string;
  billing_period_id?: string;
  charge_id?: string;
  valor: number;
  status: FiscalInvoiceStatus;
  focus_ref?: string;
  focus_status?: string;
  chave?: string;
  numero?: string;
  serie?: string;
  xml_url?: string;
  pdf_url?: string;
  danfe_url?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Resposta de validação para emissão de NF-e
 */
export interface CanEmitProductInvoiceResponse {
  canEmit: boolean;
  reason?: string;
  valor?: number;
}

/**
 * Resposta de validação para emissão de NFS-e
 */
export interface CanEmitServiceInvoiceResponse {
  canEmit: boolean;
  reason?: string;
  valorMaximo?: number;
}

/**
 * Resposta de emissão de nota fiscal
 */
export interface EmitInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

/**
 * Request para verificar se pode emitir NF-e
 */
export interface CanEmitProductInvoiceRequest {
  billing_period_id: string;
  tenant_id?: string;
}

/**
 * Request para emitir NF-e
 */
export interface EmitProductInvoiceRequest {
  billing_period_id: string;
  tenant_id?: string;
}

/**
 * Request para verificar se pode emitir NFS-e
 */
export interface CanEmitServiceInvoiceRequest {
  charge_id: string;
  tenant_id?: string;
}

/**
 * Request para emitir NFS-e
 */
export interface EmitServiceInvoiceRequest {
  charge_id: string;
  tenant_id?: string;
}

