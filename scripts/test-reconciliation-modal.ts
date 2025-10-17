/**
 * Script para testar carregamento de dados no modal de conciliação
 * 
 * Este script simula o carregamento de dados no modal de conciliação
 * para verificar se a integração frontend está funcionando.
 * 
 * Uso:
 * npm run test:reconciliation -- --tenant-id=123
 * npm run test:reconciliation -- --tenant-id=123 --charge-id=cob_123
 * npm run test:reconciliation -- --tenant-id=123 --status=PENDING
 * 
 * AIDEV-NOTE: Testa especificamente o carregamento de dados no modal
 * de conciliação, simulando a interação do usuário.
 */

import { createClient } from '@supabase/supabase-js';

interface TestReconciliationArgs {
  tenantId: string;
  chargeId?: string;
  status?: string;
  limit?: number;
  testFilters?: boolean;
}

/**
 * Parseia argumentos da linha de comando
 */
function parseArgs(): TestReconciliationArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<TestReconciliationArgs> = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--tenant-id=')) {
      parsed.tenantId = arg.split('=')[1];
    } else if (arg.startsWith('--charge-id=')) {
      parsed.chargeId = arg.split('=')[1];
    } else if (arg.startsWith('--status=')) {
      parsed.status = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      parsed.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--test-filters') {
      parsed.testFilters = true;
    }
  });
  
  if (!parsed.tenantId) {
    console.error('❌ Argumento obrigatório: --tenant-id');
    console.log('Uso: npm run test:reconciliation -- --tenant-id=123');
    process.exit(1);
  }
  
  return {
    tenantId: parsed.tenantId!,
    chargeId: parsed.chargeId,
    status: parsed.status,
    limit: parsed.limit || 10,
    testFilters: parsed.testFilters || false
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
 * Testa carregamento básico de dados
 */
async function testBasicDataLoading(supabase: any, args: TestReconciliationArgs) {
  console.log('🔍 Testando carregamento básico de dados...\n');
  
  try {
    // Query similar ao que o modal faria
    let query = supabase
      .from('conciliation_staging')
      .select(`
        id,
        id_externo,
        cliente_id_externo,
        valor,
        valor_pago,
        valor_liquido,
        taxa_asaas,
        status_asaas,
        status_anterior,
        metodo_pagamento,
        data_vencimento,
        data_pagamento,
        data_confirmacao,
        cliente_nome,
        cliente_email,
        cliente_documento,
        cliente_telefone,
        descricao,
        referencia_externa,
        evento_webhook,
        processado,
        conciliado,
        contrato_id,
        cobranca_id,
        created_at,
        updated_at
      `)
      .eq('tenant_id', args.tenantId)
      .order('created_at', { ascending: false })
      .limit(args.limit);
    
    // Aplica filtros se especificados
    if (args.chargeId) {
      query = query.eq('id_externo', args.chargeId);
    }
    
    if (args.status) {
      query = query.eq('status_asaas', args.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao carregar dados:', error);
      return false;
    }
    
    console.log(`✅ Carregamento básico: ${data?.length || 0} registro(s) encontrado(s)`);
    
    if (data && data.length > 0) {
      console.log('📄 Exemplo de registro:');
      const sample = data[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   ID Externo: ${sample.id_externo}`);
      console.log(`   Cliente: ${sample.cliente_nome || 'N/A'}`);
      console.log(`   Valor: R$ ${sample.valor?.toFixed(2) || '0.00'}`);
      console.log(`   Status: ${sample.status_asaas || 'N/A'}`);
      console.log(`   Processado: ${sample.processado ? 'Sim' : 'Não'}`);
      console.log(`   Conciliado: ${sample.conciliado ? 'Sim' : 'Não'}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro no teste básico:', error);
    return false;
  }
}

/**
 * Testa filtros específicos do modal
 */
async function testModalFilters(supabase: any, args: TestReconciliationArgs) {
  console.log('\n🔍 Testando filtros do modal...\n');
  
  const filters = [
    { name: 'Não processados', filter: { processado: false } },
    { name: 'Não conciliados', filter: { conciliado: false } },
    { name: 'Status PENDING', filter: { status_asaas: 'PENDING' } },
    { name: 'Status CONFIRMED', filter: { status_asaas: 'CONFIRMED' } },
    { name: 'Status RECEIVED', filter: { status_asaas: 'RECEIVED' } },
    { name: 'Com valor > 0', filter: { valor: { gt: 0 } } },
    { name: 'Últimos 7 dias', filter: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } } }
  ];
  
  for (const filterTest of filters) {
    try {
      let query = supabase
        .from('conciliation_staging')
        .select('id', { count: 'exact' })
        .eq('tenant_id', args.tenantId);
      
      // Aplica filtro específico
      Object.entries(filterTest.filter).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Filtros complexos (gt, gte, etc.)
          Object.entries(value).forEach(([op, val]) => {
            if (op === 'gt') query = query.gt(key, val);
            else if (op === 'gte') query = query.gte(key, val);
            else if (op === 'lt') query = query.lt(key, val);
            else if (op === 'lte') query = query.lte(key, val);
          });
        } else {
          // Filtros simples
          query = query.eq(key, value);
        }
      });
      
      const { count, error } = await query;
      
      if (error) {
        console.log(`❌ ${filterTest.name}: Erro - ${error.message}`);
      } else {
        console.log(`✅ ${filterTest.name}: ${count || 0} registro(s)`);
      }
    } catch (error) {
      console.log(`❌ ${filterTest.name}: Erro - ${error}`);
    }
  }
}

/**
 * Testa agregações e estatísticas
 */
async function testAggregations(supabase: any, args: TestReconciliationArgs) {
  console.log('\n🔍 Testando agregações e estatísticas...\n');
  
  try {
    // Busca dados para agregação manual (Supabase não tem SUM nativo no client)
    const { data, error } = await supabase
      .from('conciliation_staging')
      .select(`
        valor,
        valor_pago,
        valor_liquido,
        taxa_asaas,
        status_asaas,
        processado,
        conciliado
      `)
      .eq('tenant_id', args.tenantId);
    
    if (error) {
      console.error('❌ Erro ao buscar dados para agregação:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📭 Nenhum dado para agregação');
      return;
    }
    
    // Calcula estatísticas
    const stats = {
      total: data.length,
      processados: data.filter(r => r.processado).length,
      conciliados: data.filter(r => r.conciliado).length,
      valorTotal: data.reduce((sum, r) => sum + (r.valor || 0), 0),
      valorPago: data.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      valorLiquido: data.reduce((sum, r) => sum + (r.valor_liquido || 0), 0),
      taxaTotal: data.reduce((sum, r) => sum + (r.taxa_asaas || 0), 0),
      statusBreakdown: data.reduce((acc, r) => {
        const status = r.status_asaas || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    console.log('📊 Estatísticas calculadas:');
    console.log(`   Total de registros: ${stats.total}`);
    console.log(`   Processados: ${stats.processados} (${((stats.processados / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Conciliados: ${stats.conciliados} (${((stats.conciliados / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   Valor total: R$ ${stats.valorTotal.toFixed(2)}`);
    console.log(`   Valor pago: R$ ${stats.valorPago.toFixed(2)}`);
    console.log(`   Valor líquido: R$ ${stats.valorLiquido.toFixed(2)}`);
    console.log(`   Taxa total: R$ ${stats.taxaTotal.toFixed(2)}`);
    
    console.log('\n📈 Breakdown por status:');
    Object.entries(stats.statusBreakdown).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de agregações:', error);
  }
}

/**
 * Testa performance de queries
 */
async function testQueryPerformance(supabase: any, args: TestReconciliationArgs) {
  console.log('\n🔍 Testando performance de queries...\n');
  
  const queries = [
    {
      name: 'Query básica (10 registros)',
      query: () => supabase
        .from('conciliation_staging')
        .select('*')
        .eq('tenant_id', args.tenantId)
        .limit(10)
    },
    {
      name: 'Query com filtros (não conciliados)',
      query: () => supabase
        .from('conciliation_staging')
        .select('*')
        .eq('tenant_id', args.tenantId)
        .eq('conciliado', false)
        .limit(10)
    },
    {
      name: 'Query com ordenação (mais recentes)',
      query: () => supabase
        .from('conciliation_staging')
        .select('*')
        .eq('tenant_id', args.tenantId)
        .order('created_at', { ascending: false })
        .limit(10)
    },
    {
      name: 'Query com múltiplos filtros',
      query: () => supabase
        .from('conciliation_staging')
        .select('*')
        .eq('tenant_id', args.tenantId)
        .eq('processado', true)
        .eq('conciliado', false)
        .in('status_asaas', ['CONFIRMED', 'RECEIVED'])
        .limit(10)
    }
  ];
  
  for (const queryTest of queries) {
    try {
      const startTime = Date.now();
      const { data, error } = await queryTest.query();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.log(`❌ ${queryTest.name}: Erro - ${error.message}`);
      } else {
        console.log(`✅ ${queryTest.name}: ${data?.length || 0} registros em ${duration}ms`);
      }
    } catch (error) {
      console.log(`❌ ${queryTest.name}: Erro - ${error}`);
    }
  }
}

/**
 * Função principal
 */
async function main() {
  const args = parseArgs();
  const supabase = initializeSupabase();
  
  console.log('🚀 Testando modal de conciliação...\n');
  console.log(`📋 Configurações:`);
  console.log(`   Tenant ID: ${args.tenantId}`);
  console.log(`   Charge ID: ${args.chargeId || 'Todos'}`);
  console.log(`   Status: ${args.status || 'Todos'}`);
  console.log(`   Limite: ${args.limit}`);
  console.log(`   Testar filtros: ${args.testFilters ? 'Sim' : 'Não'}`);
  console.log('');
  
  // Executa testes
  const basicSuccess = await testBasicDataLoading(supabase, args);
  
  if (basicSuccess && args.testFilters) {
    await testModalFilters(supabase, args);
    await testAggregations(supabase, args);
    await testQueryPerformance(supabase, args);
  }
  
  console.log('\n✅ Teste do modal de conciliação concluído!');
  console.log('');
  console.log('📝 Próximos passos:');
  console.log('   1. Teste o modal no frontend');
  console.log('   2. Verifique se os filtros estão funcionando');
  console.log('   3. Teste a funcionalidade de conciliação');
  console.log('   4. Monitore a performance em produção');
}

// Executa o script
if (require.main === module) {
  main();
}

export { main as testReconciliationModalScript };