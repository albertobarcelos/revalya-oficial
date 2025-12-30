/**
 * Serviço de Recibo
 * 
 * AIDEV-NOTE: Serviço para gerar recibos PDF (estilo Omie)
 * Integra com Edge Function receipt-pdf
 * 
 * @module receiptService
 */

import { edgeFunctionService } from './edgeFunctionService';
import type { ReceiptData } from '@/types/fiscal';

export interface ReceiptResponse {
  success: boolean;
  receipt_data: ReceiptData;
  billing_period_id: string;
  error?: string;
}

/**
 * AIDEV-NOTE: Gerar dados do recibo para um período de faturamento
 */
export async function generateReceiptData(
  billingPeriodId: string,
  tenantId?: string
): Promise<ReceiptResponse> {
  try {
    const response = await edgeFunctionService.callEdgeFunction('receipt-pdf', {
      billing_period_id: billingPeriodId,
      tenant_id: tenantId
    });

    return response as ReceiptResponse;
  } catch (error) {
    console.error('[ReceiptService] Erro ao gerar recibo:', error);
    throw error;
  }
}

/**
 * AIDEV-NOTE: Gerar PDF do recibo no frontend
 * Usa react-pdf ou jspdf para gerar o PDF a partir dos dados estruturados
 * 
 * TODO: Implementar geração de PDF usando react-pdf ou jspdf
 */
export async function generateReceiptPDF(
  receiptData: ReceiptData
): Promise<Blob> {
  // TODO: Implementar geração de PDF
  // Por enquanto, retorna um blob vazio
  // Pode usar react-pdf (@react-pdf/renderer) ou jspdf
  throw new Error('Geração de PDF ainda não implementada. Use generateReceiptData para obter os dados.');
}

