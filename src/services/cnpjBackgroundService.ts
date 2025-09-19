import { supabase } from '@/lib/supabase';
import { consultarCNPJ } from './cnpjService';

// AIDEV-NOTE: Serviço para processar consultas CNPJ em background
// Executa automaticamente após criação de clientes com CNPJ

interface PendingCNPJLookup {
  id: string;
  customer_id: string;
  cnpj: string;
  tenant_id: string;
  status: string;
  attempts: number;
  created_at: string;
}

// AIDEV-NOTE: Função principal para processar consultas pendentes
export async function processarConsultasPendentes() {
  try {
    // Busca consultas pendentes (máximo 10 por vez)
    const { data: consultas, error } = await supabase
      .from('pending_cnpj_lookups')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Máximo 3 tentativas
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar consultas pendentes:', error);
      return;
    }

    if (!consultas || consultas.length === 0) {
      return; // Nenhuma consulta pendente
    }

    console.log(`Processando ${consultas.length} consultas CNPJ pendentes`);

    // Processa cada consulta
    for (const consulta of consultas) {
      await processarConsultaIndividual(consulta);
      
      // Pequeno delay entre consultas para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Erro no processamento de consultas CNPJ:', error);
  }
}

// AIDEV-NOTE: Processa uma consulta individual
async function processarConsultaIndividual(consulta: PendingCNPJLookup) {
  try {
    // Marca como processando
    await supabase
      .from('pending_cnpj_lookups')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', consulta.id);

    // Faz a consulta na API
    const dadosCNPJ = await consultarCNPJ(consulta.cnpj);

    if (dadosCNPJ) {
      // Chama a função do banco para processar os dados
      const { error } = await supabase.rpc('processar_consulta_cnpj', {
        lookup_id: consulta.id,
        dados_empresa: dadosCNPJ
      });

      if (error) {
        throw new Error(`Erro ao processar dados: ${error.message}`);
      }

      console.log(`Consulta CNPJ processada com sucesso: ${consulta.cnpj}`);
    } else {
      throw new Error('Dados não encontrados na API');
    }

  } catch (error) {
    console.error(`Erro ao processar consulta ${consulta.id}:`, error);
    
    // Marca como falha
    await supabase.rpc('marcar_consulta_cnpj_falha', {
      lookup_id: consulta.id,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// AIDEV-NOTE: Função para iniciar o processamento automático
export function iniciarProcessamentoAutomatico() {
  // Executa imediatamente
  processarConsultasPendentes();
  
  // Configura para executar a cada 30 segundos
  const interval = setInterval(processarConsultasPendentes, 30000);
  
  // Retorna função para parar o processamento
  return () => {
    clearInterval(interval);
  };
}

// AIDEV-NOTE: Função para verificar status de uma consulta específica
export async function verificarStatusConsulta(customerId: string) {
  try {
    const { data, error } = await supabase
      .from('pending_cnpj_lookups')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar status da consulta:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao verificar status da consulta:', error);
    return null;
  }
}

// AIDEV-NOTE: Função para reprocessar consultas falhadas
export async function reprocessarConsultasFalhadas() {
  try {
    // Reseta consultas falhadas para pendente (apenas as que falharam há mais de 1 hora)
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('pending_cnpj_lookups')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'failed')
      .lt('updated_at', umaHoraAtras)
      .lt('attempts', 3);

    if (error) {
      console.error('Erro ao reprocessar consultas falhadas:', error);
    } else {
      console.log('Consultas falhadas resetadas para reprocessamento');
    }
  } catch (error) {
    console.error('Erro ao reprocessar consultas falhadas:', error);
  }
}
