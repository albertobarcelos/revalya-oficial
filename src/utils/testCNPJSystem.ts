import { supabase } from '@/lib/supabase';
import { processarConsultasPendentes } from '@/services/cnpjBackgroundService';

// AIDEV-NOTE: Utilitário para testar e debugar o sistema de CNPJ automático
// Permite verificar consultas pendentes e forçar processamento

export interface CNPJLookupStatus {
  id: string;
  customer_id: string;
  cnpj: string;
  status: string;
  attempts: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

// AIDEV-NOTE: Verifica todas as consultas pendentes
export async function verificarConsultasPendentes(): Promise<CNPJLookupStatus[]> {
  try {
    const { data, error } = await supabase
      .from('pending_cnpj_lookups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar consultas pendentes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao verificar consultas pendentes:', error);
    return [];
  }
}

// AIDEV-NOTE: Verifica consultas por status específico
export async function verificarConsultasPorStatus(status: string): Promise<CNPJLookupStatus[]> {
  try {
    const { data, error } = await supabase
      .from('pending_cnpj_lookups')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar consultas com status ${status}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Erro ao verificar consultas com status ${status}:`, error);
    return [];
  }
}

// AIDEV-NOTE: Força o processamento de consultas pendentes
export async function forcarProcessamento(): Promise<void> {
  try {
    console.log('Forçando processamento de consultas CNPJ pendentes...');
    await processarConsultasPendentes();
    console.log('Processamento concluído.');
  } catch (error) {
    console.error('Erro ao forçar processamento:', error);
  }
}

// AIDEV-NOTE: Gera relatório completo do sistema CNPJ
export async function gerarRelatorioSistema(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  consultas: CNPJLookupStatus[];
}> {
  try {
    const consultas = await verificarConsultasPendentes();
    
    const relatorio = {
      pending: consultas.filter(c => c.status === 'pending').length,
      processing: consultas.filter(c => c.status === 'processing').length,
      completed: consultas.filter(c => c.status === 'completed').length,
      failed: consultas.filter(c => c.status === 'failed').length,
      total: consultas.length,
      consultas
    };

    console.log('=== RELATÓRIO DO SISTEMA CNPJ ===');
    console.log(`Total de consultas: ${relatorio.total}`);
    console.log(`Pendentes: ${relatorio.pending}`);
    console.log(`Processando: ${relatorio.processing}`);
    console.log(`Concluídas: ${relatorio.completed}`);
    console.log(`Falhadas: ${relatorio.failed}`);
    console.log('================================');

    return relatorio;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
      consultas: []
    };
  }
}

// AIDEV-NOTE: Limpa consultas antigas (mais de 7 dias)
export async function limparConsultasAntigas(): Promise<number> {
  try {
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('pending_cnpj_lookups')
      .delete()
      .lt('created_at', seteDiasAtras)
      .select('id');

    if (error) {
      console.error('Erro ao limpar consultas antigas:', error);
      return 0;
    }

    const quantidade = data?.length || 0;
    console.log(`${quantidade} consultas antigas removidas.`);
    return quantidade;
  } catch (error) {
    console.error('Erro ao limpar consultas antigas:', error);
    return 0;
  }
}

// AIDEV-NOTE: Função para debug - exibe informações detalhadas
export async function debugSistemaCNPJ(): Promise<void> {
  console.log('🔍 INICIANDO DEBUG DO SISTEMA CNPJ...');
  
  const relatorio = await gerarRelatorioSistema();
  
  if (relatorio.pending > 0) {
    console.log('\n📋 CONSULTAS PENDENTES:');
    relatorio.consultas
      .filter(c => c.status === 'pending')
      .forEach(consulta => {
        console.log(`- ID: ${consulta.id}`);
        console.log(`  CNPJ: ${consulta.cnpj}`);
        console.log(`  Cliente: ${consulta.customer_id}`);
        console.log(`  Tentativas: ${consulta.attempts}`);
        console.log(`  Criado em: ${consulta.created_at}`);
        console.log('---');
      });
  }
  
  if (relatorio.failed > 0) {
    console.log('\n❌ CONSULTAS FALHADAS:');
    relatorio.consultas
      .filter(c => c.status === 'failed')
      .forEach(consulta => {
        console.log(`- ID: ${consulta.id}`);
        console.log(`  CNPJ: ${consulta.cnpj}`);
        console.log(`  Erro: ${consulta.error_message}`);
        console.log(`  Tentativas: ${consulta.attempts}`);
        console.log('---');
      });
  }
  
  console.log('\n🔧 Para forçar processamento, execute: forcarProcessamento()');
  console.log('✅ DEBUG CONCLUÍDO');
}
