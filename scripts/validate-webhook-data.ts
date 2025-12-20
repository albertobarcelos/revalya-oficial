/**
 * Script para validar dados do webhook na tabela conciliation_staging
 * 
 * Este script consulta a tabela conciliation_staging para verificar
 * se os dados do webhook foram inseridos corretamente.
 * 
 * Uso:
 * npm run validate:webhook-data -- --tenant-id=123
 * npm run validate:webhook-data -- --tenant-id=123 --charge-id=cob_123
 * npm run validate:webhook-data -- --tenant-id=123 --last=10
 * 
 * AIDEV-NOTE: Facilita a validação dos dados inseridos pelo webhook,
 * permitindo verificar se o fluxo está funcionando corretamente.
 */

import { createClient } from '@supabase/supabase-js';

interface ValidateArgs {
  tenantId: string;
  chargeId?: string;
  last?: number;
  showRawData?: boolean;
}

/**
 * Parseia argumentos da linha de comando
 */
function parseArgs(): ValidateArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<ValidateArgs> = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--tenant-id=')) {
      parsed.tenantId = arg.split('=')[1];
    } else if (arg.startsWith('--charge-id=')) {
      parsed.chargeId = arg.split('=')[1];
    } else if (arg.startsWith('--last=')) {
      parsed.last = parseInt(arg.split('=')[1]);
    } else if (arg === '--show-raw-data') {
      parsed.showRawData = true;
    }
  });
  
  if (!parsed.tenantId) {
    console.error('❌ Argumento obrigatório: --tenant-id');
    console.log('Uso: npm run validate:webhook-data -- --tenant-id=123');
    process.exit(1);
  }
  
  return {
    tenantId: parsed.tenantId!,
    chargeId: parsed.chargeId,
    last: parsed.last || 5,
    showRawData: parsed.showRawData || false
  };
}

/**
 * Inicializa cliente Supabase
 */
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas');
    console.log('Configure: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Formata data para exibição
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR');
}

/**
 * Formata valor monetário
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Consulta dados da tabela conciliation_staging
 */
async function queryWebhookData(args: ValidateArgs) {
  const supabase = initializeSupabase();
  
  try {
    console.log('🔍 Consultando dados do webhook...\n');
    
    // Monta query base
    let query = supabase
      .from('conciliation_staging')
      .select('*')
      .eq('tenant_id', args.tenantId)
      .order('created_at', { ascending: false });
    
    // Aplica filtros
    if (args.chargeId) {
      query = query.eq('id_externo', args.chargeId);
    }
    
    if (args.last && !args.chargeId) {
      query = query.limit(args.last);
    }
    
    // Executa query
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao consultar dados:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📭 Nenhum dado encontrado');
      console.log('');
      console.log('💡 Dicas:');
      console.log('   - Verifique se o tenant_id está correto');
      console.log('   - Execute o teste do webhook primeiro');
      console.log('   - Verifique os logs da Edge Function');
      return;
    }
    
    console.log(`📊 Encontrados ${data.length} registro(s):\n`);
    
    // Exibe dados
    data.forEach((record, index) => {
      console.log(`📄 Registro ${index + 1}:`);
      console.log(`   ID: ${record.id}`);
      console.log(`   ID Externo: ${record.id_externo}`);
      console.log(`   Cliente ID: ${record.cliente_id_externo || 'N/A'}`);
      console.log(`   Valor: ${record.valor ? formatCurrency(record.valor) : 'N/A'}`);
      console.log(`   Valor Pago: ${record.valor_pago ? formatCurrency(record.valor_pago) : 'N/A'}`);
      console.log(`   Valor Líquido: ${record.valor_liquido ? formatCurrency(record.valor_liquido) : 'N/A'}`);
      console.log(`   Taxa ASAAS: ${record.taxa_asaas ? formatCurrency(record.taxa_asaas) : 'N/A'}`);
      console.log(`   Status: ${record.status_asaas || 'N/A'}`);
      console.log(`   Status Anterior: ${record.status_anterior || 'N/A'}`);
      console.log(`   Método Pagamento: ${record.metodo_pagamento || 'N/A'}`);
      console.log(`   Data Vencimento: ${record.data_vencimento || 'N/A'}`);
      console.log(`   Data Pagamento: ${record.data_pagamento || 'N/A'}`);
      console.log(`   Data Confirmação: ${record.data_confirmacao || 'N/A'}`);
      console.log(`   Cliente Nome: ${record.cliente_nome || 'N/A'}`);
      console.log(`   Cliente Email: ${record.cliente_email || 'N/A'}`);
      console.log(`   Cliente Documento: ${record.cliente_documento || 'N/A'}`);
      console.log(`   Cliente Telefone: ${record.cliente_telefone || 'N/A'}`);
      console.log(`   Descrição: ${record.descricao || 'N/A'}`);
      console.log(`   Referência Externa: ${record.referencia_externa || 'N/A'}`);
      console.log(`   Evento Webhook: ${record.evento_webhook || 'N/A'}`);
      console.log(`   Processado: ${record.processado ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Data Processamento: ${record.data_processamento ? formatDate(record.data_processamento) : 'N/A'}`);
      console.log(`   Tentativas Processamento: ${record.tentativas_processamento || 0}`);
      console.log(`   Erro Processamento: ${record.erro_processamento || 'N/A'}`);
      console.log(`   Conciliado: ${record.conciliado ? '✅ Sim' : '❌ Não'}`);
      console.log(`   Data Conciliação: ${record.data_conciliacao ? formatDate(record.data_conciliacao) : 'N/A'}`);
      console.log(`   Usuário Conciliação: ${record.usuario_conciliacao || 'N/A'}`);
      console.log(`   Notas Conciliação: ${record.notas_conciliacao || 'N/A'}`);
      console.log(`   Contrato ID: ${record.contrato_id || 'N/A'}`);
      console.log(`   Cobrança ID: ${record.cobranca_id || 'N/A'}`);
      console.log(`   Criado em: ${formatDate(record.created_at)}`);
      console.log(`   Atualizado em: ${formatDate(record.updated_at)}`);
      console.log(`   Criado por: ${record.created_by || 'N/A'}`);
      
      if (args.showRawData && record.dados_brutos) {
        console.log(`   Dados Brutos:`);
        console.log(`   ${JSON.stringify(record.dados_brutos, null, 2)}`);
      }
      
      console.log('');
    });
    
    // Estatísticas
    const processedCount = data.filter(r => r.processado).length;
    const reconciledCount = data.filter(r => r.conciliado).length;
    const totalValue = data.reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalPaidValue = data.reduce((sum, r) => sum + (r.valor_pago || 0), 0);
    
    console.log('📈 Estatísticas:');
    console.log(`   Total de registros: ${data.length}`);
    console.log(`   Processados: ${processedCount} (${((processedCount / data.length) * 100).toFixed(1)}%)`);
    console.log(`   Conciliados: ${reconciledCount} (${((reconciledCount / data.length) * 100).toFixed(1)}%)`);
    console.log(`   Valor total: ${formatCurrency(totalValue)}`);
    console.log(`   Valor pago total: ${formatCurrency(totalPaidValue)}`);
    
    // Status breakdown
    const statusCounts = data.reduce((acc, r) => {
      const status = r.status_asaas || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('');
    console.log('📊 Breakdown por Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} registro(s)`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao validar dados do webhook:', error);
    process.exit(1);
  }
}

/**
 * Função principal
 */
async function main() {
  const args = parseArgs();
  await queryWebhookData(args);
}

// Executa o script
if (require.main === module) {
  main();
}

export { main as validateWebhookDataScript };