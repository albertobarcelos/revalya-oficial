/**
 * API Route: Processador de Jobs de Importação
 * 
 * Endpoint responsável por processar jobs de importação de forma assíncrona.
 * Utiliza um sistema de filas baseado em PostgreSQL para garantir
 * processamento confiável e escalável.
 * 
 * @module ProcessJobAPI
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { importErrorHandler, ErrorContext } from '@/utils/importErrorHandler';
import { createOptimizedBatchProcessor, BatchResult, ImportRecord } from '@/utils/batchProcessor';

// AIDEV-NOTE: Configuração do Supabase para operações de banco
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImportRow {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  empresa?: string;
  endereco?: string;
  [key: string]: any;
}

interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: number;
  errorDetails: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'ID do job é obrigatório' });
  }

  const context: ErrorContext = {
    jobId,
    operation: 'process_import_job_api',
    timestamp: new Date()
  };

  try {
    // Executa processamento com retry automático
    const result = await importErrorHandler.executeWithRetry(async () => {
      // AIDEV-NOTE: Buscar job na fila de processamento
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job não encontrado');
      }

      if (job.status !== 'pending') {
        throw new Error('Job já foi processado ou está em processamento');
      }

      // AIDEV-NOTE: Marcar job como em processamento
      await supabase
        .from('import_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // AIDEV-NOTE: Processar arquivo baseado no tipo
      let processingResult: ProcessingResult;
      
      if (job.file_type === 'csv') {
        processingResult = await processCSVFile(job.file_path, job.tenant_id);
      } else if (job.file_type === 'xlsx') {
        processingResult = await processExcelFile(job.file_path, job.tenant_id);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${job.file_type}`);
      }

      // AIDEV-NOTE: Atualizar status do job com resultados
      const finalStatus = processingResult.success ? 'completed' : 'failed';
      
      await supabase
        .from('import_jobs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          total_records: processingResult.processed + processingResult.errors,
          processed_records: processingResult.processed,
          failed_records: processingResult.errors,
          error_details: processingResult.errorDetails.length > 0 ? processingResult.errorDetails : null
        })
        .eq('id', jobId);

      // AIDEV-NOTE: Salvar dados importados na tabela de dados
      if (processingResult.processed > 0) {
        // Aqui você pode implementar a lógica para salvar os dados processados
        // na tabela de clientes ou outra tabela de destino
      }

      return {
        processed: processingResult.processed,
        errors: processingResult.errors,
        status: finalStatus
      };
    }, context);

    res.status(200).json({ 
      success: true, 
      message: 'Job processado com sucesso',
      jobId,
      result 
    });

  } catch (error) {
    console.error(`[API] Erro ao processar job ${jobId}:`, error);
    
    // AIDEV-NOTE: Marcar job como falhou em caso de erro
    try {
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: [{
            row: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          }]
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error('Erro ao atualizar status do job:', updateError);
    }
    
    // Processa erro com sistema robusto
    const processedError = importErrorHandler.handleError(error as Error, context);
    
    res.status(processedError.severity === 'critical' ? 500 : 400).json({ 
      error: processedError.userMessage,
      retryable: processedError.retryable,
      retryCount: processedError.retryCount,
      maxRetries: processedError.maxRetries
    });
  }
}

/**
 * Processa arquivo CSV com sistema de lotes otimizado
 */
async function processCSVFile(filePath: string, tenantId: string, jobId: string): Promise<ProcessingResult> {
  return new Promise((resolve) => {
    const records: ImportRecord[] = [];
    const parseErrors: Array<{ row: number; error: string; data?: any }> = [];
    let rowCount = 0;

    // AIDEV-NOTE: Primeira passada - ler e validar dados
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: ImportRow) => {
        rowCount++;
        
        try {
          // AIDEV-NOTE: Validar dados obrigatórios
          if (!data.nome || data.nome.trim() === '') {
            parseErrors.push({
              row: rowCount,
              error: 'Nome é obrigatório',
              data
            });
            return;
          }

          // AIDEV-NOTE: Normalizar dados
          const normalizedData: ImportRecord = {
            nome: data.nome?.trim(),
            email: data.email?.trim().toLowerCase() || null,
            telefone: data.telefone?.trim() || null,
            cpf_cnpj: data.cpf_cnpj?.trim() || null,
            empresa: data.empresa?.trim() || null,
            endereco: data.endereco?.trim() || null,
            tenant_id: tenantId,
            row_number: rowCount
          };

          records.push(normalizedData);
        } catch (error) {
          parseErrors.push({
            row: rowCount,
            error: error instanceof Error ? error.message : 'Erro de processamento',
            data
          });
        }
      })
      .on('end', async () => {
        try {
          // AIDEV-NOTE: Processar em lotes se há dados válidos
          if (records.length > 0) {
            const batchProcessor = createOptimizedBatchProcessor(tenantId, jobId, records.length);
            
            const batchResult = await batchProcessor.processInBatches(
              records,
              async (batch: ImportRecord[], batchIndex: number): Promise<BatchResult> => {
                return await processBatchToDatabase(batch, batchIndex, tenantId);
              }
            );

            resolve({
              success: batchResult.success,
              processed: batchResult.totalProcessed,
              errors: batchResult.totalErrors + parseErrors.length,
              errorDetails: [
                ...parseErrors,
                ...batchResult.batches.flatMap(batch => batch.errorDetails.map(err => ({
                  row: err.index,
                  error: err.error,
                  data: err.record
                })))
              ]
            });
          } else {
            resolve({
              success: parseErrors.length === 0,
              processed: 0,
              errors: parseErrors.length,
              errorDetails: parseErrors
            });
          }
        } catch (batchError) {
          resolve({
            success: false,
            processed: 0,
            errors: records.length + parseErrors.length,
            errorDetails: [
              ...parseErrors,
              {
                row: 0,
                error: `Erro no processamento em lotes: ${batchError instanceof Error ? batchError.message : 'Erro desconhecido'}`
              }
            ]
          });
        }
      })
      .on('error', (error) => {
        resolve({
          success: false,
          processed: 0,
          errors: 1,
          errorDetails: [{
            row: 0,
            error: `Erro ao ler arquivo CSV: ${error.message}`
          }]
        });
      });
  });
}

/**
 * Processa arquivo Excel com sistema de lotes otimizado
 */
async function processExcelFile(filePath: string, tenantId: string, jobId: string): Promise<ProcessingResult> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // AIDEV-NOTE: Converter para JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];
    
    if (jsonData.length === 0) {
      return {
        success: false,
        processed: 0,
        errors: 1,
        errorDetails: [{
          row: 0,
          error: 'Arquivo Excel está vazio ou não contém dados válidos'
        }]
      };
    }

    const records: ImportRecord[] = [];
    const parseErrors: Array<{ row: number; error: string; data?: any }> = [];

    // AIDEV-NOTE: Validar e normalizar dados
    jsonData.forEach((data, index) => {
      const rowNumber = index + 2; // +2 porque Excel começa em 1 e tem header
      
      try {
        // AIDEV-NOTE: Validar dados obrigatórios
        if (!data.nome || String(data.nome).trim() === '') {
          parseErrors.push({
            row: rowNumber,
            error: 'Nome é obrigatório',
            data
          });
          return;
        }

        // AIDEV-NOTE: Normalizar dados
        const normalizedData: ImportRecord = {
          nome: String(data.nome || '').trim(),
          email: String(data.email || '').trim().toLowerCase() || null,
          telefone: String(data.telefone || '').trim() || null,
          cpf_cnpj: String(data.cpf_cnpj || '').trim() || null,
          empresa: String(data.empresa || '').trim() || null,
          endereco: String(data.endereco || '').trim() || null,
          tenant_id: tenantId,
          row_number: rowNumber
        };

        records.push(normalizedData);
      } catch (error) {
        parseErrors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Erro de processamento',
          data
        });
      }
    });

    // AIDEV-NOTE: Processar em lotes se há dados válidos
    if (records.length > 0) {
      const batchProcessor = createOptimizedBatchProcessor(tenantId, jobId, records.length);
      
      const batchResult = await batchProcessor.processInBatches(
        records,
        async (batch: ImportRecord[], batchIndex: number): Promise<BatchResult> => {
          return await processBatchToDatabase(batch, batchIndex, tenantId);
        }
      );

      return {
        success: batchResult.success,
        processed: batchResult.totalProcessed,
        errors: batchResult.totalErrors + parseErrors.length,
        errorDetails: [
          ...parseErrors,
          ...batchResult.batches.flatMap(batch => batch.errorDetails.map(err => ({
            row: err.index,
            error: err.error,
            data: err.record
          })))
        ]
      };
    } else {
      return {
        success: parseErrors.length === 0,
        processed: 0,
        errors: parseErrors.length,
        errorDetails: parseErrors
      };
    }

  } catch (error) {
    return {
      success: false,
      processed: 0,
      errors: 1,
      errorDetails: [{
        row: 0,
        error: `Erro ao processar arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }]
    };
  }
}
    
    const results: ImportRow[] = [];
    const errors: Array<{ row: number; error: string; data?: any }> = [];

    jsonData.forEach((data, index) => {
      const rowNumber = index + 2; // +2 porque Excel começa em 1 e tem header
      
      try {
        // AIDEV-NOTE: Validar dados obrigatórios
        if (!data.nome || String(data.nome).trim() === '') {
          errors.push({
            row: rowNumber,
            error: 'Nome é obrigatório',
            data
          });
          return;
        }

        // AIDEV-NOTE: Normalizar dados
        const normalizedData = {
          nome: String(data.nome).trim(),
          email: data.email ? String(data.email).trim().toLowerCase() : null,
          telefone: data.telefone ? String(data.telefone).trim() : null,
          cpf_cnpj: data.cpf_cnpj ? String(data.cpf_cnpj).trim() : null,
          empresa: data.empresa ? String(data.empresa).trim() : null,
          endereco: data.endereco ? String(data.endereco).trim() : null,
          tenant_id: tenantId
        };

        results.push(normalizedData);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Erro de processamento',
          data
        });
      }
    });

    return {
      success: errors.length === 0 || results.length > 0,
      processed: results.length,
      errors: errors.length,
      errorDetails: errors
    };

  } catch (error) {
    return {
      success: false,
      processed: 0,
      errors: 1,
      errorDetails: [{
        row: 0,
        error: `Erro ao ler arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }]
    };
  }
}

// AIDEV-NOTE: Desabilitar parsing automático do body para permitir formidable
export const config = {
  api: {
    bodyParser: false,
  },
};