import { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from '@supabase/ssr';
import { requireAuth } from "@/utils/apiAuth";
import { AsaasService } from "@/services/asaas";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: Endpoint para importar dados do ASAAS para conciliation_staging
// Busca movimentações do ASAAS e insere na tabela de staging para conciliação

interface ImportFilters {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  limit?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Autenticação e autorização
    const authResult = await requireAuth(req, res);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tenantId } = authResult;
    const { dataInicio, dataFim, status, limit = 100 }: ImportFilters = req.body;

    // Criar cliente Supabase
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return req.cookies[name];
          },
          set: () => {},
          remove: () => {},
        },
      }
    );

    // Inicializar serviço ASAAS
    const asaasService = new AsaasService();

    // Buscar dados do ASAAS
    console.log('Buscando dados do ASAAS...', { dataInicio, dataFim, status, limit });

    // Buscar pagamentos do ASAAS
    const asaasPayments = await asaasService.request('/payments', {
      method: 'GET',
      params: {
        dateCreated: dataInicio ? `[gte]${dataInicio}` : undefined,
        dateCreated2: dataFim ? `[lte]${dataFim}` : undefined,
        status: status || undefined,
        limit: Math.min(limit, 100), // Limitar para evitar sobrecarga
        offset: 0
      }
    });

    if (!asaasPayments.success || !asaasPayments.data?.data) {
      console.error('Erro ao buscar dados do ASAAS:', asaasPayments.error);
      return res.status(500).json({ 
        error: 'Erro ao buscar dados do ASAAS',
        details: asaasPayments.error
      });
    }

    const payments = asaasPayments.data.data;
    console.log(`Encontrados ${payments.length} pagamentos no ASAAS`);

    if (payments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum pagamento encontrado no período',
        imported: 0,
        skipped: 0
      });
    }

    // AIDEV-NOTE: Verificar se já existe registro com mesmo id_externo
    const externalIds = payments.map((p: any) => p.id);
    const { data: existingRecords } = await supabase
      .from('conciliation_staging')
      .select('id, id_externo')
      .eq('tenant_id', tenantId)
      .eq('origem', 'ASAAS')
      .in('id_externo', externalIds);

    const existingIds = new Set(existingRecords?.map(record => record.id_externo) || []);

    // AIDEV-NOTE: Filtrar apenas registros novos
    const newRecords = payments.filter(payment => !existingIds.has(payment.id));

    if (newRecords.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum registro novo encontrado',
        imported: 0,
        total: payments.length
      });
    }

    // AIDEV-NOTE: Preparar dados para inserção na tabela conciliation_staging
    const recordsToInsert = newRecords.map((payment: any) => ({
      tenant_id: tenantId,
      origem: 'ASAAS',
      id_externo: payment.id,
      valor_cobranca: parseFloat(payment.value || '0'),
      valor_pago: parseFloat(payment.netValue || payment.value || '0'),
      status_externo: payment.status || 'PENDING',
      status_conciliacao: 'NAO_CONCILIADO',
      juros_multa_diferenca: (parseFloat(payment.interestValue || '0') + parseFloat(payment.fineValue || '0') - parseFloat(payment.discountValue || '0')),
      data_vencimento: payment.dueDate ? new Date(payment.dueDate).toISOString() : null,
      data_pagamento: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
      observacao: JSON.stringify({
        asaas_data: {
          externalReference: payment.externalReference,
          customer: payment.customer,
          customerName: payment.customerName,
          customerDocument: payment.customerDocument,
          billingType: payment.billingType,
          installmentNumber: payment.installmentNumber,
          installmentCount: payment.installmentCount,
          bankSlipUrl: payment.bankSlipUrl,
          invoiceUrl: payment.invoiceUrl,
          pixQrCodeId: payment.pixQrCodeId,
          pixCopyAndPaste: payment.pixCopyAndPaste,
          confirmedDate: payment.confirmedDate,
          creditDate: payment.creditDate,
          description: payment.description
        },
        importedAt: new Date().toISOString()
      })
    }));

    let imported = 0;
    const skipped = payments.length - newRecords.length;

    // AIDEV-NOTE: Inserir registros em lote na tabela staging
    const { data: insertedRecords, error: insertError } = await supabase
      .from('conciliation_staging')
      .insert(recordsToInsert)
      .select('id');

    if (insertError) {
      console.error('Erro ao inserir na tabela staging:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar dados importados',
        details: insertError.message
      });
    }

    imported = insertedRecords?.length || 0;

    // Log da importação
    console.log(`Importação concluída:`, {
      tenantId,
      totalFound: payments.length,
      imported,
      skipped,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Importação concluída com sucesso',
      summary: {
        totalFound: payments.length,
        imported,
        skipped,
        source: 'ASAAS',
        period: {
          dataInicio: dataInicio || 'Não especificado',
          dataFim: dataFim || 'Não especificado'
        }
      }
    });

  } catch (error) {
    console.error('Erro no endpoint de importação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}