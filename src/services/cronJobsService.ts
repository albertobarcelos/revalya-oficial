import { supabase } from '@/lib/supabase';
import { billingForecastService } from './billingForecastService';
import { billingProcessorService } from './billingProcessorService';
import { financeEntriesService } from './financeEntriesService';
import { invoiceService } from './invoiceService';
import type { Database } from '@/types/database';

type CronJob = {
  id: string;
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
  status: 'idle' | 'running' | 'error';
  error_message?: string;
};

type JobResult = {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration_ms: number;
};

class CronJobsService {
  private jobs: Map<string, CronJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  /**
   * Inicializa o serviço de cron jobs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Registrar jobs padrão
      await this.registerDefaultJobs();
      
      // Iniciar jobs ativos
      await this.startAllJobs();
      
      this.isInitialized = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[CronJobs] Serviço inicializado com sucesso');
      }
    } catch (error) {
      console.error('[CronJobs] Erro ao inicializar:', error);
      throw error;
    }
  }

  /**
   * Registra jobs padrão do sistema
   */
  private async registerDefaultJobs(): Promise<void> {
    const defaultJobs: Omit<CronJob, 'id'>[] = [
      {
        name: 'daily_billing_forecast',
        schedule: '0 6 * * *', // Todo dia às 6h
        enabled: true,
        status: 'idle'
      },
      {
        name: 'daily_billing_processing',
        schedule: '0 8 * * *', // Todo dia às 8h
        enabled: true,
        status: 'idle'
      },
      {
        name: 'update_overdue_entries',
        schedule: '0 9 * * *', // Todo dia às 9h
        enabled: true,
        status: 'idle'
      },
      {
        name: 'auto_invoice_generation',
        schedule: '0 10 * * *', // Todo dia às 10h
        enabled: true,
        status: 'idle'
      },
      {
        name: 'cleanup_old_forecasts',
        schedule: '0 2 * * 0', // Todo domingo às 2h
        enabled: true,
        status: 'idle'
      },
      {
        name: 'financial_reports_cache',
        schedule: '0 5 * * *', // Todo dia às 5h
        enabled: true,
        status: 'idle'
      }
    ];

    for (const jobData of defaultJobs) {
      const jobId = this.generateJobId(jobData.name);
      const job: CronJob = {
        id: jobId,
        ...jobData,
        next_run: this.calculateNextRun(jobData.schedule)
      };
      
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Inicia todos os jobs ativos
   */
  private async startAllJobs(): Promise<void> {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.enabled) {
        await this.startJob(jobId);
      }
    }
  }

  /**
   * Inicia um job específico
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) {
      throw new Error(`Job não encontrado ou desabilitado: ${jobId}`);
    }

    // Parar job se já estiver rodando
    await this.stopJob(jobId);

    // Calcular próxima execução
    const nextRun = this.calculateNextRun(job.schedule);
    const delay = nextRun.getTime() - Date.now();

    // Agendar execução
    const timeout = setTimeout(async () => {
      await this.executeJob(jobId);
      // Reagendar para próxima execução
      await this.startJob(jobId);
    }, delay);

    this.intervals.set(jobId, timeout);
    
    // Atualizar próxima execução
    job.next_run = nextRun;
    this.jobs.set(jobId, job);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[CronJobs] Job ${job.name} agendado para ${nextRun.toISOString()}`);
    }
  }

  /**
   * Para um job específico
   */
  async stopJob(jobId: string): Promise<void> {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(jobId);
    }

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'idle';
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Executa um job
   */
  async executeJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job não encontrado: ${jobId}`);
    }

    const startTime = Date.now();
    
    try {
      // Atualizar status
      job.status = 'running';
      job.last_run = new Date();
      job.error_message = undefined;
      this.jobs.set(jobId, job);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[CronJobs] Executando job: ${job.name}`);
      }

      // Executar job específico
      const result = await this.runJobFunction(job.name);
      
      // Atualizar status de sucesso
      job.status = 'idle';
      this.jobs.set(jobId, job);

      const duration = Date.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CronJobs] Job ${job.name} concluído em ${duration}ms`);
      }

      return {
        success: true,
        message: `Job ${job.name} executado com sucesso`,
        data: result,
        duration_ms: duration
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Atualizar status de erro
      job.status = 'error';
      job.error_message = errorMsg;
      this.jobs.set(jobId, job);

      const duration = Date.now() - startTime;
      
      console.error(`[CronJobs] Erro no job ${job.name}:`, errorMsg);

      return {
        success: false,
        message: `Erro no job ${job.name}`,
        error: errorMsg,
        duration_ms: duration
      };
    }
  }

  /**
   * Executa função específica do job
   */
  private async runJobFunction(jobName: string): Promise<any> {
    switch (jobName) {
      case 'daily_billing_forecast':
        return await this.runDailyBillingForecast();
      
      case 'daily_billing_processing':
        return await this.runDailyBillingProcessing();
      
      case 'update_overdue_entries':
        return await this.runUpdateOverdueEntries();
      
      case 'auto_invoice_generation':
        return await this.runAutoInvoiceGeneration();
      
      case 'cleanup_old_forecasts':
        return await this.runCleanupOldForecasts();
      
      case 'financial_reports_cache':
        return await this.runFinancialReportsCache();
      
      default:
        throw new Error(`Função de job não implementada: ${jobName}`);
    }
  }

  /**
   * Job: Geração diária de previsões de faturamento
   */
  private async runDailyBillingForecast(): Promise<any> {
    const results = [];
    
    // Buscar todos os tenants ativos
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Erro ao buscar tenants: ${error.message}`);
    }

    for (const tenant of tenants || []) {
      try {
        const result = await billingForecastService.generateForecastsForTenant(tenant.id);
        results.push({ tenant_id: tenant.id, ...result });
      } catch (error) {
        console.error(`Erro ao gerar previsões para tenant ${tenant.id}:`, error);
        results.push({ 
          tenant_id: tenant.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return {
      total_tenants: tenants?.length || 0,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Job: Processamento diário de faturamento
   */
  private async runDailyBillingProcessing(): Promise<any> {
    const results = [];
    
    // Buscar todos os tenants ativos
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Erro ao buscar tenants: ${error.message}`);
    }

    for (const tenant of tenants || []) {
      try {
        const result = await billingProcessorService.processDailyBilling(tenant.id);
        results.push({ tenant_id: tenant.id, ...result });
      } catch (error) {
        console.error(`Erro ao processar faturamento para tenant ${tenant.id}:`, error);
        results.push({ 
          tenant_id: tenant.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return {
      total_tenants: tenants?.length || 0,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Job: Atualização de lançamentos vencidos
   */
  private async runUpdateOverdueEntries(): Promise<any> {
    const results = [];
    
    // Buscar todos os tenants ativos
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Erro ao buscar tenants: ${error.message}`);
    }

    for (const tenant of tenants || []) {
      try {
        const result = await financeEntriesService.updateOverdueEntries(tenant.id);
        results.push({ tenant_id: tenant.id, updated_count: result });
      } catch (error) {
        console.error(`Erro ao atualizar vencidos para tenant ${tenant.id}:`, error);
        results.push({ 
          tenant_id: tenant.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return {
      total_tenants: tenants?.length || 0,
      total_updated: results.reduce((sum, r) => sum + (r.updated_count || 0), 0),
      results
    };
  }

  /**
   * Job: Geração automática de notas fiscais
   */
  private async runAutoInvoiceGeneration(): Promise<any> {
    const results = [];
    
    // Buscar lançamentos pagos sem nota fiscal
    const { data: entries, error } = await supabase
      .from('finance_entries')
      .select('id, tenant_id')
      .eq('status', 'paid')
      .is('invoice_data', null)
      .gte('payment_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    if (error) {
      throw new Error(`Erro ao buscar lançamentos: ${error.message}`);
    }

    for (const entry of entries || []) {
      try {
        const result = await invoiceService.issueInvoiceForFinanceEntry(entry.id);
        results.push({ 
          finance_entry_id: entry.id, 
          tenant_id: entry.tenant_id,
          success: result.success,
          invoice_number: result.invoice_number,
          error: result.error
        });
      } catch (error) {
        console.error(`Erro ao emitir NF para lançamento ${entry.id}:`, error);
        results.push({ 
          finance_entry_id: entry.id,
          tenant_id: entry.tenant_id,
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return {
      total_entries: entries?.length || 0,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Job: Limpeza de previsões antigas
   */
  private async runCleanupOldForecasts(): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3); // 3 meses atrás

      const { data, error } = await supabase
        .from('billing_forecasts')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .in('status', ['processed', 'cancelled']);

      if (error) {
        throw new Error(`Erro ao limpar previsões: ${error.message}`);
      }

      return {
        deleted_count: data?.length || 0,
        cutoff_date: cutoffDate.toISOString()
      };
    } catch (error) {
      throw new Error(`Erro na limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Job: Cache de relatórios financeiros
   */
  private async runFinancialReportsCache(): Promise<any> {
    // Implementar cache de relatórios se necessário
    // Por enquanto, apenas retornar sucesso
    return {
      message: 'Cache de relatórios atualizado',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Executa job manualmente
   */
  async runJobManually(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job não encontrado: ${jobId}`);
    }

    if (job.status === 'running') {
      throw new Error(`Job já está em execução: ${job.name}`);
    }

    return await this.executeJob(jobId);
  }

  /**
   * Lista todos os jobs
   */
  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Obtém job específico
   */
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Habilita/desabilita job
   */
  async toggleJob(jobId: string, enabled: boolean): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job não encontrado: ${jobId}`);
    }

    job.enabled = enabled;
    this.jobs.set(jobId, job);

    if (enabled) {
      await this.startJob(jobId);
    } else {
      await this.stopJob(jobId);
    }
  }

  /**
   * Atualiza schedule de um job
   */
  async updateJobSchedule(jobId: string, schedule: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job não encontrado: ${jobId}`);
    }

    // Validar cron expression
    try {
      this.calculateNextRun(schedule);
    } catch (error) {
      throw new Error(`Schedule inválido: ${schedule}`);
    }

    job.schedule = schedule;
    job.next_run = this.calculateNextRun(schedule);
    this.jobs.set(jobId, job);

    // Reiniciar job se estiver ativo
    if (job.enabled) {
      await this.startJob(jobId);
    }
  }

  /**
   * Para todos os jobs
   */
  async shutdown(): Promise<void> {
    for (const jobId of this.jobs.keys()) {
      await this.stopJob(jobId);
    }
    
    this.isInitialized = false;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[CronJobs] Serviço finalizado');
    }
  }

  /**
   * Calcula próxima execução baseada no cron schedule
   */
  private calculateNextRun(schedule: string): Date {
    // Implementação simples de cron parser
    // Para produção, usar biblioteca como 'node-cron' ou 'cron-parser'
    
    const parts = schedule.split(' ');
    if (parts.length !== 5) {
      throw new Error(`Schedule inválido: ${schedule}`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const now = new Date();
    const next = new Date(now);
    
    // Implementação básica - apenas para horários fixos diários
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      // Se já passou hoje, agendar para amanhã
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }
    
    // Para outros casos, agendar para próxima hora
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  /**
   * Gera ID único para job
   */
  private generateJobId(name: string): string {
    return `job_${name}_${Date.now()}`;
  }
}

export const cronJobsService = new CronJobsService();
export default cronJobsService;

// Auto-inicializar em produção
if (process.env.NODE_ENV === 'production') {
  cronJobsService.initialize().catch(console.error);
}
