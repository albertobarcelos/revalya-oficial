/**
 * Serviço de Fila de Importação
 * 
 * Gerencia o sistema de filas para processamento assíncrono de importações.
 * Utiliza PostgreSQL como backend de fila para garantir persistência e confiabilidade.
 * 
 * @module ImportQueueService
 */

import { createClient } from '@supabase/supabase-js';
import { importErrorHandler, ErrorContext } from '@/utils/importErrorHandler';

// AIDEV-NOTE: Cliente Supabase com privilégios de service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QueueJob {
  id: string;
  tenant_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  total_records?: number;
  processed_records?: number;
  failed_records?: number;
  error_details?: any;
  retry_count: number;
  max_retries: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export class ImportQueueService {
  private static instance: ImportQueueService;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): ImportQueueService {
    if (!ImportQueueService.instance) {
      ImportQueueService.instance = new ImportQueueService();
    }
    return ImportQueueService.instance;
  }

  /**
   * Adiciona um job à fila de processamento
   */
  async enqueueJob(jobData: Omit<QueueJob, 'id' | 'created_at' | 'status' | 'retry_count'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .insert({
          ...jobData,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Erro ao adicionar job à fila: ${error.message}`);
      }

      // AIDEV-NOTE: Iniciar processamento se não estiver rodando
      this.startProcessing();

      return data.id;
    } catch (error) {
      console.error('Erro ao enfileirar job:', error);
      throw error;
    }
  }

  /**
   * Busca o próximo job pendente na fila
   */
  async getNextJob(): Promise<QueueJob | null> {
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Erro ao buscar próximo job: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Erro ao buscar próximo job:', error);
      return null;
    }
  }

  /**
   * Atualiza o status de um job
   */
  async updateJobStatus(
    jobId: string, 
    status: QueueJob['status'], 
    updates: Partial<QueueJob> = {}
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        ...updates
      };

      // AIDEV-NOTE: Adicionar timestamps baseado no status
      if (status === 'processing') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('import_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        throw new Error(`Erro ao atualizar status do job: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do job:', error);
      throw error;
    }
  }

  /**
   * Processa um job da fila com tratamento robusto de erros
   */
  private async processJob(job: QueueJob): Promise<void> {
    const context: ErrorContext = {
      jobId: job.id,
      tenantId: job.tenant_id,
      operation: 'process_import_job',
      timestamp: new Date()
    };

    try {
      console.log(`[Queue] Processando job ${job.id}...`);
      
      // Atualiza status para processando
      await this.updateJobStatus(job.id, 'processing');
      
      // Executa processamento com retry automático
      await importErrorHandler.executeWithRetry(async () => {
        const response = await fetch('/api/import/process-job', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId: job.id })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      }, context);
      
      console.log(`[Queue] Job ${job.id} processado com sucesso`);
      
    } catch (error) {
      console.error(`[Queue] Erro ao processar job ${job.id}:`, error);
      
      // Processa erro com sistema robusto
      const processedError = importErrorHandler.handleError(error as Error, context);
      
      // Atualiza status baseado na possibilidade de retry
      if (processedError.retryable && processedError.retryCount < processedError.maxRetries) {
        await this.updateJobStatus(job.id, 'pending', processedError.message);
        console.log(`[Queue] Job ${job.id} será retentado. Tentativa ${processedError.retryCount + 1}/${processedError.maxRetries}`);
      } else {
        await this.updateJobStatus(job.id, 'failed', processedError.message);
        console.log(`[Queue] Job ${job.id} falhou definitivamente após ${processedError.retryCount} tentativas`);
      }
    }
  }

  /**
   * Inicia o processamento contínuo da fila
   */
  startProcessing(): void {
    if (this.processingInterval || this.isProcessing) {
      return; // Já está processando
    }

    console.log('Iniciando processamento da fila de importação...');

    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) {
        return; // Evitar processamento concorrente
      }

      this.isProcessing = true;

      try {
        const job = await this.getNextJob();
        
        if (job) {
          await this.processJob(job);
        }
      } catch (error) {
        console.error('Erro no processamento da fila:', error);
        
        // Processa erro com contexto da fila
        const processedError = importErrorHandler.handleError(error as Error, {
          operation: 'process_queue',
          timestamp: new Date()
        });
      } finally {
        this.isProcessing = false;
      }
    }, 5000); // Verificar a cada 5 segundos
  }

  /**
   * Para o processamento da fila
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Processamento da fila parado');
    }
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(tenantId?: string): Promise<QueueStats> {
    try {
      let query = supabase
        .from('import_jobs')
        .select('status');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: data.length
      };

      data.forEach(job => {
        stats[job.status as keyof Omit<QueueStats, 'total'>]++;
      });

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas da fila:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Remove jobs antigos completados ou falhados
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('import_jobs')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('completed_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Erro ao limpar jobs antigos: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`${deletedCount} jobs antigos removidos`);
      
      return deletedCount;
    } catch (error) {
      console.error('Erro ao limpar jobs antigos:', error);
      return 0;
    }
  }

  /**
   * Reprocessa jobs falhados
   */
  async retryFailedJobs(tenantId?: string): Promise<number> {
    try {
      let query = supabase
        .from('import_jobs')
        .update({ 
          status: 'pending',
          retry_count: 0,
          error_details: null
        })
        .eq('status', 'failed')
        .lt('retry_count', supabase.raw('max_retries'));

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.select('id');

      if (error) {
        throw new Error(`Erro ao reprocessar jobs falhados: ${error.message}`);
      }

      const retriedCount = data?.length || 0;
      console.log(`${retriedCount} jobs falhados reprocessados`);

      // AIDEV-NOTE: Iniciar processamento se houver jobs para reprocessar
      if (retriedCount > 0) {
        this.startProcessing();
      }

      return retriedCount;
    } catch (error) {
      console.error('Erro ao reprocessar jobs falhados:', error);
      return 0;
    }
  }
}

// AIDEV-NOTE: Exportar instância singleton
export const importQueueService = ImportQueueService.getInstance();