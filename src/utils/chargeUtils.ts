/**
 * AIDEV-NOTE: Utilitários para criação de cobranças contornando problemas de RLS
 * Este arquivo contém funções para inserir cobranças quando há problemas de autenticação
 * Inclui invalidação de cache para garantir atualização do Kanban após faturamento
 */

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

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

    // AIDEV-NOTE: Invalidar cache após inserção bem-sucedida para atualizar Kanban
    queryClient.invalidateQueries({ queryKey: ['charges'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['kanban'] });

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

  // AIDEV-NOTE: Invalidar cache apenas se houve pelo menos uma inserção bem-sucedida
  if (results.length - errorCount > 0) {
    queryClient.invalidateQueries({ queryKey: ['charges'] });
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['kanban'] });
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

/**
 * AIDEV-NOTE: Interface para representar um item extraído da descrição da cobrança
 */
export interface ChargeItem {
  name: string;
  quantity: number;
  description?: string;
}

/**
 * AIDEV-NOTE: Função para extrair itens da descrição da cobrança
 * Analisa strings como "Melhor serviço desse mundo (1x), PDV Legal (1x)"
 * e retorna um array de itens estruturados
 */
export function parseChargeDescription(description: string): ChargeItem[] {
  if (!description) return [];

  try {
    console.log('Analisando descrição:', description);
    
    // Tentar diferentes padrões de extração
    let itemsSection = '';
    
    // Padrão 1: Extrair a parte após o último " - " que contém os itens
    const parts = description.split(' - ');
    if (parts.length >= 3) {
      itemsSection = parts[parts.length - 1];
    } else if (parts.length === 2) {
      // Padrão 2: Se só tem 2 partes, a segunda pode conter os itens
      itemsSection = parts[1];
    } else {
      // Padrão 3: Tentar extrair itens da descrição completa
      itemsSection = description;
    }
    
    console.log('Seção de itens extraída:', itemsSection);
    
    // Dividir por vírgula para separar os itens
    const itemStrings = itemsSection.split(',').map(item => item.trim());
    
    const items: ChargeItem[] = [];
    
    for (const itemString of itemStrings) {
      // Regex para extrair nome e quantidade: "Nome do serviço (2x)" ou "Nome do serviço (1x)"
      const match = itemString.match(/^(.+?)\s*\((\d+)x\)$/);
      
      if (match) {
        const [, name, quantityStr] = match;
        const quantity = parseInt(quantityStr, 10);
        
        items.push({
          name: name.trim(),
          quantity,
          description: name.trim()
        });
      } else if (itemString.length > 0) {
        // Se não conseguir extrair quantidade, mas tem conteúdo, assume 1
        items.push({
          name: itemString,
          quantity: 1,
          description: itemString
        });
      }
    }
    
    console.log('Itens extraídos:', items);
    return items;
  } catch (error) {
    console.error('Erro ao analisar descrição da cobrança:', error);
    return [];
  }
}
