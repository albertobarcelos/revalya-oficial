// AIDEV-NOTE: Edge Function para recálculo automático de status de períodos de faturamento
// Executa diariamente via cron para atualizar PENDING → DUE_TODAY → LATE
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
Deno.serve(async (req)=>{
  const startTime = Date.now();
  try {
    // AIDEV-NOTE: Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Método não permitido. Use POST.'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // AIDEV-NOTE: Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[RecalcBillingStatuses] Iniciando recálculo automático de status...');
    // AIDEV-NOTE: Buscar todos os tenants ativos
    const { data: tenants, error: tenantsError } = await supabase.from('tenants').select('id, name').eq('is_active', true);
    if (tenantsError) {
      throw new Error(`Erro ao buscar tenants: ${tenantsError.message}`);
    }
    if (!tenants || tenants.length === 0) {
      console.log('[RecalcBillingStatuses] Nenhum tenant ativo encontrado');
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum tenant ativo encontrado',
        stats: {
          total_tenants: 0,
          successful_tenants: 0,
          failed_tenants: 0,
          total_periods_updated: 0,
          execution_time_ms: Date.now() - startTime,
          results: []
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[RecalcBillingStatuses] Processando ${tenants.length} tenants...`);
    // AIDEV-NOTE: Processar cada tenant
    const results = [];
    let totalPeriodsUpdated = 0;
    for (const tenant of tenants){
      try {
        console.log(`[RecalcBillingStatuses] Processando tenant: ${tenant.name} (${tenant.id})`);
        // AIDEV-NOTE: Configurar contexto do tenant
        const { error: contextError } = await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: tenant.id
        });
        if (contextError) {
          throw new Error(`Erro ao configurar contexto: ${contextError.message}`);
        }
        // AIDEV-NOTE: Executar recálculo de status para o tenant
        const { data: recalcData, error: recalcError } = await supabase.rpc('recalc_billing_statuses', {
          p_tenant_id: tenant.id
        });
        if (recalcError) {
          throw new Error(`Erro no recálculo: ${recalcError.message}`);
        }
        const result = recalcData[0];
        totalPeriodsUpdated += result.updated_periods;
        results.push({
          tenant_id: tenant.id,
          success: true,
          result
        });
        console.log(`[RecalcBillingStatuses] Tenant ${tenant.name}: ${result.updated_periods} períodos atualizados`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[RecalcBillingStatuses] Erro no tenant ${tenant.name}:`, errorMessage);
        results.push({
          tenant_id: tenant.id,
          success: false,
          error: errorMessage
        });
      }
    }
    // AIDEV-NOTE: Compilar estatísticas finais
    const stats = {
      total_tenants: tenants.length,
      successful_tenants: results.filter((r)=>r.success).length,
      failed_tenants: results.filter((r)=>!r.success).length,
      total_periods_updated: totalPeriodsUpdated,
      execution_time_ms: Date.now() - startTime,
      results
    };
    console.log(`[RecalcBillingStatuses] Concluído: ${stats.total_periods_updated} períodos atualizados em ${stats.execution_time_ms}ms`);
    // AIDEV-NOTE: Retornar resultado
    return new Response(JSON.stringify({
      success: true,
      message: `Recálculo concluído: ${stats.total_periods_updated} períodos atualizados`,
      timestamp: new Date().toISOString(),
      stats
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[RecalcBillingStatuses] Erro geral:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
