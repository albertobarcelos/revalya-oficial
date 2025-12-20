import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// AIDEV-NOTE: Edge Function para executar recálculo diário de status de faturamento
// Esta função pode ser chamada via webhook ou cron job externo
Deno.serve(async (req)=>{
  try {
    // AIDEV-NOTE: Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // AIDEV-NOTE: Criar cliente Supabase com service role para acesso completo
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Iniciando recálculo diário de status de faturamento...');
    // AIDEV-NOTE: Executar função de recálculo diário
    const { data, error } = await supabase.rpc('daily_billing_status_recalc');
    if (error) {
      console.error('Erro ao executar daily_billing_status_recalc:', error);
      throw error;
    }
    console.log('Recálculo concluído com sucesso:', data);
    // AIDEV-NOTE: Registrar log de auditoria
    const { error: logError } = await supabase.from('system_logs').insert({
      log_level: 'INFO',
      message: 'Daily billing status update completed successfully',
      context: {
        function: 'daily-billing-status-update',
        result: data,
        timestamp: new Date().toISOString()
      }
    });
    if (logError) {
      console.warn('Erro ao registrar log de auditoria:', logError);
    }
    // AIDEV-NOTE: Retornar resultado com estatísticas
    return new Response(JSON.stringify({
      success: true,
      message: 'Daily billing status update completed successfully',
      statistics: data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
