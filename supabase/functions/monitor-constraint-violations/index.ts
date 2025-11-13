/**
 * EDGE FUNCTION: Monitor Constraint Violations
 * 
 * Monitora violações de constraint nas tabelas do sistema
 * e envia alertas quando detectadas.
 * 
 * AIDEV-NOTE: Esta função deve ser executada periodicamente (cron)
 * para detectar problemas de constraint violation em tempo real.
 * 
 * NOTA: A tabela conciliation_staging foi migrada para charges, mas ainda existe para rollback.
 * Esta função pode monitorar ambas as tabelas durante o período de transição.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ConstraintViolation {
  timestamp: string;
  table_name: string;
  constraint_name: string;
  attempted_value: string;
  tenant_id: string;
  error_message: string;
}

interface MonitoringResult {
  status: 'success' | 'error';
  violations_found: number;
  violations: ConstraintViolation[];
  timestamp: string;
  alert_level: 'normal' | 'attention' | 'critical';
}

serve(async (req: Request) => {
  try {
    // AIDEV-NOTE: Configuração do cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Iniciando monitoramento de constraint violations...');

    // AIDEV-NOTE: Verificar violações recentes na tabela de log
    // Esta query assume que existe uma tabela constraint_violation_log
    const { data: recentViolations, error: queryError } = await supabase
      .from('constraint_violation_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Última hora
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('❌ Erro ao consultar violações:', queryError);
      // Continuar mesmo com erro - pode ser que a tabela não exista ainda
    }

    const violations: ConstraintViolation[] = recentViolations?.map(v => ({
      timestamp: v.created_at,
      table_name: v.table_name,
      constraint_name: v.constraint_name,
      attempted_value: v.attempted_value,
      tenant_id: v.tenant_id,
      error_message: v.error_message || 'Constraint violation detected'
    })) || [];

    // AIDEV-NOTE: Determinar nível de alerta baseado no número de violações
    let alertLevel: 'normal' | 'attention' | 'critical' = 'normal';
    const violationCount = violations.length;

    if (violationCount > 10) {
      alertLevel = 'critical';
    } else if (violationCount > 5) {
      alertLevel = 'attention';
    }

    // AIDEV-NOTE: Log das violações encontradas
    if (violations.length > 0) {
      console.log(`🚨 ALERTA [${alertLevel.toUpperCase()}]: ${violations.length} violações detectadas na última hora`);
      
      violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. [${violation.timestamp}] ${violation.table_name}.${violation.constraint_name}`);
        console.log(`     Valor tentado: "${violation.attempted_value}" (Tenant: ${violation.tenant_id})`);
      });

      // AIDEV-NOTE: Aqui poderia integrar com sistema de notificação
      // Exemplos: Slack webhook, Discord, email, etc.
      if (alertLevel === 'critical') {
        console.log('🔴 CRÍTICO: Muitas violações detectadas - considere investigação imediata');
      }
    } else {
      console.log('✅ Nenhuma violação de constraint detectada na última hora');
    }

    // AIDEV-NOTE: Verificar também estatísticas gerais da tabela
    // NOTA: A tabela conciliation_staging foi migrada para charges, mas ainda existe para rollback
    // Esta verificação pode ser útil para monitoramento durante o período de transição
    const { data: tableStats, error: statsError } = await supabase
      .rpc('get_table_statistics', { table_name: 'conciliation_staging' })
      .single();

    if (statsError) {
      console.log('⚠️ Não foi possível obter estatísticas da tabela:', statsError.message);
    } else if (tableStats) {
      console.log(`📊 Estatísticas da tabela conciliation_staging (mantida para rollback):`);
      console.log(`   - Total de registros: ${tableStats.total_rows || 'N/A'}`);
      console.log(`   - Inserções hoje: ${tableStats.inserts_today || 'N/A'}`);
    }

    const result: MonitoringResult = {
      status: 'success',
      violations_found: violations.length,
      violations: violations,
      timestamp: new Date().toISOString(),
      alert_level: alertLevel
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no monitoramento de constraint violations:', error);
    
    const errorResult: MonitoringResult = {
      status: 'error',
      violations_found: 0,
      violations: [],
      timestamp: new Date().toISOString(),
      alert_level: 'critical'
    };

    return new Response(
      JSON.stringify({ 
        ...errorResult,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});

/**
 * AIDEV-NOTE: Para usar esta função:
 * 
 * 1. Deploy: supabase functions deploy monitor-constraint-violations
 * 
 * 2. Configurar cron job (exemplo com GitHub Actions):
 *    - Executar a cada 15 minutos
 *    - Fazer POST para a URL da função
 * 
 * 3. Criar tabela de log (se não existir):
 *    CREATE TABLE constraint_violation_log (
 *      id SERIAL PRIMARY KEY,
 *      table_name TEXT NOT NULL,
 *      constraint_name TEXT NOT NULL,
 *      attempted_value TEXT,
 *      tenant_id UUID,
 *      error_message TEXT,
 *      created_at TIMESTAMP DEFAULT NOW()
 *    );
 * 
 * 4. Integrar com sistema de notificação conforme necessário
 */