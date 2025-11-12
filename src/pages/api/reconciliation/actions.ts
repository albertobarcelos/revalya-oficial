import { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from '@supabase/ssr';
import { requireAuth } from "@/utils/apiAuth";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: Endpoint para ações de conciliação
// Implementa vincular contrato, criar avulsa e outras operações de conciliação

interface ReconciliationAction {
  type: 'vincular_contrato' | 'criar_avulsa' | 'complementar';
  chargeIds: string[]; // AIDEV-NOTE: Agora são charge IDs, não staging IDs
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
    const { type, chargeIds, contratoId, cobrancaId, observacao, valorAjuste }: ReconciliationAction = req.body;

    // Validações básicas
    if (!type || !chargeIds || chargeIds.length === 0) {
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

    // AIDEV-NOTE: Buscar charges diretamente
    const { data: charges, error: fetchError } = await supabase
      .from('charges')
      .select(`
        id,
        asaas_id,
        valor,
        status,
        contract_id,
        data_vencimento,
        data_pagamento,
        descricao,
        customer_id
      `)
      .in('id', chargeIds)
      .eq('tenant_id', tenantId)
      .not('asaas_id', 'is', null); // Apenas charges do ASAAS

    if (fetchError) {
      console.error('Erro ao buscar charges:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar charges' });
    }

    if (!charges || charges.length === 0) {
      return res.status(404).json({ error: 'Charges não encontradas' });
    }

    // AIDEV-NOTE: Verificar se todas as charges já têm contrato vinculado
    const alreadyLinked = charges.filter(
      charge => charge.contract_id !== null
    );

    if (alreadyLinked.length > 0 && type === 'vincular_contrato') {
      return res.status(400).json({ 
        error: 'Algumas charges já têm contrato vinculado',
        linkedIds: alreadyLinked.map(c => c.id)
      });
    }

    // AIDEV-NOTE: Preparar dados de atualização para charges
    let updateData: any = {
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
        updateData.contract_id = contratoId;
        if (observacao) {
          updateData.descricao = `${charges[0]?.descricao || ''} ${observacao}`.trim();
        }
        break;

      case 'criar_avulsa':
        // AIDEV-NOTE: Para criar avulsa, somar valores das charges selecionadas
        const totalValue = charges.reduce((sum, charge) => 
          sum + (charge.valor || 0), 0
        );

        // AIDEV-NOTE: Buscar customer_id da primeira charge
        const customerId = charges[0]?.customer_id;
        if (!customerId) {
          return res.status(400).json({ error: 'Customer ID não encontrado' });
        }

        const { data: newCharge, error: chargeError } = await supabase
          .from('charges')
          .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            valor: totalValue,
            descricao: observacao || `Cobrança avulsa - Conciliação ${new Date().toLocaleDateString()}`,
            status: 'RECEIVED',
            tipo: 'CASH',
            data_vencimento: new Date().toISOString().split('T')[0],
            data_pagamento: charges[0]?.data_pagamento || new Date().toISOString(),
          })
          .select()
          .single();

        if (chargeError) {
          console.error('Erro ao criar cobrança avulsa:', chargeError);
          return res.status(500).json({ error: 'Erro ao criar cobrança avulsa' });
        }

        // AIDEV-NOTE: Não precisamos atualizar as charges originais para criar avulsa
        return res.status(200).json({
          success: true,
          message: 'Cobrança avulsa criada com sucesso',
          data: newCharge,
          action: {
            type,
            recordsProcessed: chargeIds.length,
            newChargeId: newCharge.id
          }
        });

      case 'complementar':
        if (!cobrancaId) {
          return res.status(400).json({ 
            error: 'ID da cobrança é obrigatório para complemento' 
          });
        }
        
        // AIDEV-NOTE: Atualizar valor da cobrança existente se necessário
        if (valorAjuste !== undefined) {
          const { error: updateChargeError } = await supabase
            .from('charges')
            .update({ 
              valor: valorAjuste,
              updated_at: new Date().toISOString()
            })
            .eq('id', cobrancaId)
            .eq('tenant_id', tenantId);

          if (updateChargeError) {
            console.error('Erro ao atualizar cobrança:', updateChargeError);
            return res.status(500).json({ error: 'Erro ao atualizar cobrança' });
          }
        }
        
        // AIDEV-NOTE: Atualizar descrição das charges selecionadas para referenciar a cobrança complementada
        if (observacao) {
          updateData.descricao = `${charges[0]?.descricao || ''} [Complemento: ${cobrancaId}] ${observacao}`.trim();
        }
        break;

      default:
        return res.status(400).json({ error: 'Tipo de ação inválido' });
    }

    // AIDEV-NOTE: Atualizar charges diretamente
    const { data: updatedCharges, error: updateError } = await supabase
      .from('charges')
      .update(updateData)
      .in('id', chargeIds)
      .eq('tenant_id', tenantId)
      .select();

    if (updateError) {
      console.error('Erro ao atualizar registros:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar registros' });
    }

    // Log da ação para auditoria
    console.log(`Ação de conciliação executada:`, {
      type,
      chargeIds,
      contratoId,
      cobrancaId,
      tenantId,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Ação de conciliação executada com sucesso',
      data: updatedCharges,
      action: {
        type,
        recordsProcessed: chargeIds.length,
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