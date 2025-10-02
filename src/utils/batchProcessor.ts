/**
 * Sistema de processamento em lotes otimizado para grandes volumes de dados
 * 
 * AIDEV-NOTE: Este módulo implementa estratégias de processamento em lotes
 * para otimizar performance e uso de memória durante importações massivas
 */

import { supabase } from '@/lib/supabase';
import { importErrorHandler, ErrorContext } from './importErrorHandler';

// AIDEV-NOTE: Configurações de processamento em lotes
export interface BatchConfig {
  batchSize: number;           // Tamanho do lote (registros por batch)
  maxConcurrency: number;      // Máximo de batches processados simultaneamente
  delayBetweenBatches: number; // Delay entre batches (ms)
  memoryThreshold: number;     // Limite de memória antes de forçar GC (MB)
}

// AIDEV-NOTE: Configurações padrão baseadas no tamanho do arquivo
export const BATCH_CONFIGS = {
  small: {    // < 1000 registros
    batchSize: 100,
    maxConcurrency: 2,
    delayBetweenBatches: 100,
    memoryThreshold: 50
  },
  medium: {   // 1000-10000 registros
    batchSize: 250,
    maxConcurrency: 3,
    delayBetweenBatches: 200,
    memoryThreshold: 100
  },
  large: {    // 10000-50000 registros
    batchSize: 500,
    maxConcurrency: 4,
    delayBetweenBatches: 300,
    memoryThreshold: 200
  },
  xlarge: {   // > 50000 registros
    batchSize: 1000,
    maxConcurrency: 2,
    delayBetweenBatches: 500,
    memoryThreshold: 300
  }
};

// AIDEV-NOTE: Interface para dados de importação
export interface ImportRecord {
  [key: string]: any;
}

// AIDEV-NOTE: Resultado do processamento de um lote
export interface BatchResult {
  batchIndex: number;
  processed: number;
  errors: number;
  errorDetails: Array<{
    record: ImportRecord;
    error: string;
    index: number;
  }>;
  processingTime: number;
  memoryUsage: number;
}

// AIDEV-NOTE: Resultado completo do processamento em lotes
export interface BatchProcessingResult {
  totalRecords: number;
  totalProcessed: number;
  totalErrors: number;
  batches: BatchResult[];
  totalTime: number;
  averageBatchTime: number;
  peakMemoryUsage: number;
  success: boolean;
}

// AIDEV-NOTE: Classe principal para processamento em lotes
export class BatchProcessor {
  private config: BatchConfig;
  private tenantId: string;
  private jobId: string;

  constructor(tenantId: string, jobId: string, totalRecords: number) {
    this.tenantId = tenantId;
    this.jobId = jobId;
    this.config = this.selectOptimalConfig(totalRecords);
  }

  /**
   * Seleciona configuração otimizada baseada no volume de dados
   */
  private selectOptimalConfig(totalRecords: number): BatchConfig {
    if (totalRecords < 1000) return BATCH_CONFIGS.small;
    if (totalRecords < 10000) return BATCH_CONFIGS.medium;
    if (totalRecords < 50000) return BATCH_CONFIGS.large;
    return BATCH_CONFIGS.xlarge;
  }

  /**
   * Processa dados em lotes otimizados
   */
  async processInBatches(
    records: ImportRecord[],
    processor: (batch: ImportRecord[], batchIndex: number) => Promise<BatchResult>
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const totalRecords = records.length;
    const batches: BatchResult[] = [];
    let totalProcessed = 0;
    let totalErrors = 0;
    let peakMemoryUsage = 0;

    console.log(`[BatchProcessor] Iniciando processamento de ${totalRecords} registros em lotes de ${this.config.batchSize}`);

    try {
      // AIDEV-NOTE: Dividir dados em lotes
      const batchChunks = this.createBatches(records);
      
      // AIDEV-NOTE: Processar lotes com controle de concorrência
      for (let i = 0; i < batchChunks.length; i += this.config.maxConcurrency) {
        const concurrentBatches = batchChunks.slice(i, i + this.config.maxConcurrency);
        
        // AIDEV-NOTE: Processar lotes concorrentemente
        const batchPromises = concurrentBatches.map(async (batch, index) => {
          const batchIndex = i + index;
          return this.processSingleBatch(batch, batchIndex, processor);
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        // AIDEV-NOTE: Processar resultados dos lotes
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            const batchResult = result.value;
            batches.push(batchResult);
            totalProcessed += batchResult.processed;
            totalErrors += batchResult.errors;
            peakMemoryUsage = Math.max(peakMemoryUsage, batchResult.memoryUsage);
          } else {
            console.error('[BatchProcessor] Erro no processamento do lote:', result.reason);
            totalErrors += this.config.batchSize; // Assume que todo o lote falhou
          }
        }

        // AIDEV-NOTE: Atualizar progresso do job
        await this.updateJobProgress(totalProcessed, totalErrors, totalRecords);

        // AIDEV-NOTE: Controle de memória e delay entre lotes
        await this.manageMemoryAndDelay();
      }

      const totalTime = Date.now() - startTime;
      const averageBatchTime = batches.length > 0 ? totalTime / batches.length : 0;

      return {
        totalRecords,
        totalProcessed,
        totalErrors,
        batches,
        totalTime,
        averageBatchTime,
        peakMemoryUsage,
        success: totalErrors === 0
      };

    } catch (error) {
      console.error('[BatchProcessor] Erro crítico no processamento em lotes:', error);
      
      const processedError = importErrorHandler.handleError(error as Error, {
        jobId: this.jobId,
        tenantId: this.tenantId,
        operation: 'batch_processing',
        timestamp: new Date()
      });

      throw new Error(`Falha no processamento em lotes: ${processedError.userMessage}`);
    }
  }

  /**
   * Divide os registros em lotes otimizados
   */
  private createBatches(records: ImportRecord[]): ImportRecord[][] {
    const batches: ImportRecord[][] = [];
    
    for (let i = 0; i < records.length; i += this.config.batchSize) {
      batches.push(records.slice(i, i + this.config.batchSize));
    }
    
    return batches;
  }

  /**
   * Processa um único lote com tratamento de erros
   */
  private async processSingleBatch(
    batch: ImportRecord[],
    batchIndex: number,
    processor: (batch: ImportRecord[], batchIndex: number) => Promise<BatchResult>
  ): Promise<BatchResult> {
    const context: ErrorContext = {
      jobId: this.jobId,
      tenantId: this.tenantId,
      operation: 'process_batch',
      batchIndex,
      timestamp: new Date()
    };

    return importErrorHandler.executeWithRetry(async () => {
      const startTime = Date.now();
      const startMemory = this.getMemoryUsage();

      console.log(`[BatchProcessor] Processando lote ${batchIndex + 1} com ${batch.length} registros`);

      const result = await processor(batch, batchIndex);
      
      const endTime = Date.now();
      const endMemory = this.getMemoryUsage();

      return {
        ...result,
        batchIndex,
        processingTime: endTime - startTime,
        memoryUsage: Math.max(startMemory, endMemory)
      };
    }, context);
  }

  /**
   * Atualiza o progresso do job no banco de dados
   */
  private async updateJobProgress(processed: number, errors: number, total: number): Promise<void> {
    try {
      const progress = Math.round((processed + errors) / total * 100);
      
      await supabase
        .from('import_jobs')
        .update({
          processed_records: processed,
          failed_records: errors,
          progress_percentage: progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.jobId);

    } catch (error) {
      console.error('[BatchProcessor] Erro ao atualizar progresso:', error);
      // Não falha o processamento por erro de atualização
    }
  }

  /**
   * Gerencia memória e aplica delay entre lotes
   */
  private async manageMemoryAndDelay(): Promise<void> {
    const currentMemory = this.getMemoryUsage();
    
    // AIDEV-NOTE: Forçar garbage collection se necessário
    if (currentMemory > this.config.memoryThreshold) {
      if (global.gc) {
        global.gc();
        console.log(`[BatchProcessor] Garbage collection executado. Memória: ${currentMemory}MB`);
      }
    }

    // AIDEV-NOTE: Delay entre lotes para evitar sobrecarga
    if (this.config.delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
    }
  }

  /**
   * Obtém uso atual de memória em MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024);
    }
    return 0;
  }

  /**
   * Obtém estatísticas de performance do processamento
   */
  getPerformanceStats(result: BatchProcessingResult): {
    recordsPerSecond: number;
    averageMemoryUsage: number;
    efficiency: number;
    recommendedBatchSize: number;
  } {
    const recordsPerSecond = result.totalTime > 0 ? 
      Math.round((result.totalProcessed / result.totalTime) * 1000) : 0;
    
    const averageMemoryUsage = result.batches.length > 0 ?
      Math.round(result.batches.reduce((sum, batch) => sum + batch.memoryUsage, 0) / result.batches.length) : 0;
    
    const efficiency = result.totalRecords > 0 ?
      Math.round((result.totalProcessed / result.totalRecords) * 100) : 0;
    
    // AIDEV-NOTE: Recomendação de tamanho de lote baseada na performance
    let recommendedBatchSize = this.config.batchSize;
    if (result.averageBatchTime > 5000) { // > 5s por lote
      recommendedBatchSize = Math.max(50, Math.round(this.config.batchSize * 0.7));
    } else if (result.averageBatchTime < 1000) { // < 1s por lote
      recommendedBatchSize = Math.min(2000, Math.round(this.config.batchSize * 1.3));
    }

    return {
      recordsPerSecond,
      averageMemoryUsage,
      efficiency,
      recommendedBatchSize
    };
  }
}

// AIDEV-NOTE: Função utilitária para criar processador otimizado
export function createOptimizedBatchProcessor(
  tenantId: string,
  jobId: string,
  totalRecords: number
): BatchProcessor {
  return new BatchProcessor(tenantId, jobId, totalRecords);
}