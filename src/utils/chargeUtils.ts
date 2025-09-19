/**
 * AIDEV-NOTE: Utilitários para criação de cobranças contornando problemas de RLS
 * Este arquivo contém funções para inserir cobranças quando há problemas de autenticação
 */

import { supabase } from '@/lib/supabase';

export interface ChargeData {
  tenant_id: string;
  customer_id: string;
  contract_id: string;
  valor: number;
  data_vencimento: string;
  status: string;
  tipo: string;
  descricao?: string;
}

/**
 * AIDEV-NOTE: Função para inserir cobrança usando função do banco que contorna problemas de RLS
 * Usa a função insert_charge_with_auth_context criada no banco de dados
 */
export async function insertChargeWithAuthContext(chargeData: ChargeData) {
  try {
    // Obter o usuário atual da sessão
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Chamar a função do banco que contorna o problema de RLS
    const { data, error } = await supabase.rpc('insert_charge_with_auth_context', {
      p_tenant_id: chargeData.tenant_id,
      p_customer_id: chargeData.customer_id,
      p_contract_id: chargeData.contract_id,
      p_valor: chargeData.valor,
      p_data_vencimento: chargeData.data_vencimento,
      p_status: chargeData.status,
      p_tipo: chargeData.tipo,
      p_descricao: chargeData.descricao || null,
      p_user_id: user.id
    });

    if (error) {
      console.error('Erro ao inserir cobrança:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Erro na função insertChargeWithAuthContext:', error);
    return { data: null, error };
  }
}

/**
 * AIDEV-NOTE: Função para inserir múltiplas cobranças (parcelas)
 * Usa a mesma função do banco para cada parcela
 */
export async function insertMultipleCharges(chargesData: ChargeData[]) {
  const results = [];
  let errorCount = 0;

  for (const chargeData of chargesData) {
    const result = await insertChargeWithAuthContext(chargeData);
    results.push(result);
    
    if (result.error) {
      errorCount++;
    }
  }

  return {
    results,
    successCount: results.length - errorCount,
    errorCount,
    totalCount: results.length
  };
}

/**
 * AIDEV-NOTE: Função para verificar se o usuário tem acesso ao tenant
 * Útil para validações antes de inserir cobranças
 */
export async function validateUserTenantAccess(tenantId: string) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { hasAccess: false, error: 'Usuário não autenticado' };
    }

    const { data, error } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      return { hasAccess: false, error: error.message };
    }

    return { hasAccess: !!data, error: null };
  } catch (error) {
    return { hasAccess: false, error: (error as Error).message };
  }
}
