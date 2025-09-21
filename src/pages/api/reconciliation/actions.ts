import { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from '@supabase/ssr';
import { requireAuth } from "@/utils/apiAuth";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: Endpoint para ações de conciliação
// Implementa vincular contrato, criar avulsa e outras operações de conciliação

interface ReconciliationAction {
  type: 'vincular_contrato' | 'criar_avulsa' | 'complementar';
  stagingIds: string[];
  contratoId?: string;
  cobrancaId?: string;
  observacao?: string;
  valorAjuste?: number;
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
    const { type, stagingIds, contratoId, cobrancaId, observacao, valorAjuste }: ReconciliationAction = req.body;

    // Validações básicas
    if (!type || !stagingIds || stagingIds.length === 0) {
      return res.status(400).json({ 
        error: 'Tipo de ação e IDs são obrigatórios' 
      });
    }

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

    // Iniciar transação
    const { data: stagingRecords, error: fetchError } = await supabase
      .from('conciliation_staging')
      .select(`
        id,
        origem,
        id_externo,
        valor_cobranca,
        valor_pago,
        status_externo,
        status_conciliacao,
        contrato_id,
        cobranca_id,
        juros_multa_diferenca,
        data_vencimento,
        data_pagamento,
        observacao
      `)
      .in('id', stagingIds)
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('Erro ao buscar registros:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar registros' });
    }

    if (!stagingRecords || stagingRecords.length === 0) {
      return res.status(404).json({ error: 'Registros não encontrados' });
    }

    // Verificar se todos os registros estão não conciliados
    const alreadyConciliated = stagingRecords.filter(
      record => record.status_conciliacao === 'conciliado'
    );

    if (alreadyConciliated.length > 0) {
      return res.status(400).json({ 
        error: 'Alguns registros já foram conciliados',
        conciliatedIds: alreadyConciliated.map(r => r.id)
      });
    }

    let updateData: any = {
      status_conciliacao: 'CONCILIADO',
      observacao: observacao || null,
      updated_at: new Date().toISOString()
    };

    // Processar ação específica
    switch (type) {
      case 'vincular_contrato':
        if (!contratoId) {
          return res.status(400).json({ 
            error: 'ID do contrato é obrigatório para vinculação' 
          });
        }
        updateData.contrato_id = contratoId;
        break;

      case 'criar_avulsa':
        // Para criar avulsa, vamos criar uma nova cobrança
        const totalValue = stagingRecords.reduce((sum, record) => 
          sum + (record.valor_pago || 0), 0
        );

        const { data: newCharge, error: chargeError } = await supabase
          .from('charges')
          .insert({
            tenant_id: tenantId,
            amount: totalValue,
            description: `Cobrança avulsa - Conciliação ${new Date().toLocaleDateString()}`,
            status: 'paid',
            due_date: new Date().toISOString().split('T')[0],
            payment_date: stagingRecords[0]?.data_pagamento || new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (chargeError) {
          console.error('Erro ao criar cobrança avulsa:', chargeError);
          return res.status(500).json({ error: 'Erro ao criar cobrança avulsa' });
        }

        updateData.cobranca_id = newCharge.id;
        break;

      case 'complementar':
        if (!cobrancaId) {
          return res.status(400).json({ 
            error: 'ID da cobrança é obrigatório para complemento' 
          });
        }
        updateData.cobranca_id = cobrancaId;
        
        // Atualizar valor da cobrança existente se necessário
        if (valorAjuste) {
          const { error: updateChargeError } = await supabase
            .from('charges')
            .update({ 
              amount: valorAjuste,
              updated_at: new Date().toISOString()
            })
            .eq('id', cobrancaId)
            .eq('tenant_id', tenantId);

          if (updateChargeError) {
            console.error('Erro ao atualizar cobrança:', updateChargeError);
            return res.status(500).json({ error: 'Erro ao atualizar cobrança' });
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Tipo de ação inválido' });
    }

    // Atualizar registros de staging
    const { data: updatedRecords, error: updateError } = await supabase
      .from('conciliation_staging')
      .update(updateData)
      .in('id', stagingIds)
      .eq('tenant_id', tenantId)
      .select();

    if (updateError) {
      console.error('Erro ao atualizar registros:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar registros' });
    }

    // Log da ação para auditoria
    console.log(`Ação de conciliação executada:`, {
      type,
      stagingIds,
      contratoId,
      cobrancaId,
      tenantId,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Ação de conciliação executada com sucesso',
      data: updatedRecords,
      action: {
        type,
        recordsProcessed: stagingIds.length,
        contratoId,
        cobrancaId
      }
    });

  } catch (error) {
    console.error('Erro no endpoint de ações de conciliação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}