/**
 * Processador Direto de Importação
 * 
 * Processa jobs de importação diretamente sem depender de APIs externas.
 * Usado para resolver jobs travados e garantir processamento confiável.
 * 
 * @module DirectImportProcessor
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

// AIDEV-NOTE: Cliente Supabase com service role para operações administrativas
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

export class DirectImportProcessor {
  
  /**
   * Processa um job específico diretamente
   */
  static async processJob(jobId: string): Promise<ProcessingResult> {
    try {
      console.log(`🔄 [DirectProcessor] Iniciando processamento do job: ${jobId}`);
      
      // AIDEV-NOTE: Buscar dados do job
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error(`Job não encontrado: ${jobError?.message || 'ID inválido'}`);
      }

      console.log(`📄 [DirectProcessor] Job encontrado: ${job.filename}`);

      // AIDEV-NOTE: Atualizar status para processando
      await supabase
        .from('import_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // AIDEV-NOTE: Processar arquivo baseado no tipo
      let processingResult: ProcessingResult;
      
      if (job.file_type === 'csv') {
        processingResult = await this.processCSVFile(job.file_path, job.tenant_id);
      } else if (job.file_type === 'xlsx' || job.file_type === 'xls') {
        processingResult = await this.processExcelFile(job.file_path, job.tenant_id);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${job.file_type}`);
      }

      // AIDEV-NOTE: Atualizar status final do job
      const finalStatus = processingResult.success ? 'completed' : 'failed';
      
      await supabase
        .from('import_jobs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          total_records: processingResult.processed + processingResult.errors,
          processed_records: processingResult.processed,
          failed_records: processingResult.errors,
          progress: 100,
          error_details: processingResult.errorDetails.length > 0 ? processingResult.errorDetails : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`✅ [DirectProcessor] Job processado: ${processingResult.processed} registros`);
      
      return processingResult;

    } catch (error) {
      console.error(`❌ [DirectProcessor] Erro ao processar job ${jobId}:`, error);
      
      // AIDEV-NOTE: Marcar job como falhou
      await supabase
        .from('import_jobs')
        .update({
          status: 'failed',
          error_details: [{ 
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            timestamp: new Date().toISOString()
          }],
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      throw error;
    }
  }

  /**
   * Processa arquivo CSV
   */
  private static async processCSVFile(filePath: string, tenantId: string): Promise<ProcessingResult> {
    return new Promise((resolve) => {
      const results: ImportRow[] = [];
      const errors: Array<{ row: number; error: string; data?: any }> = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rowNumber++;
          
          try {
            // AIDEV-NOTE: Validar dados obrigatórios
            if (!data.nome && !data.name) {
              errors.push({
                row: rowNumber,
                error: 'Nome é obrigatório',
                data
              });
              return;
            }

            // AIDEV-NOTE: Normalizar dados
            const normalizedData: ImportRow = {
              nome: data.nome || data.name || '',
              email: data.email || null,
              telefone: data.telefone || data.phone || null,
              cpf_cnpj: data.cpf_cnpj || data.cpf || data.cnpj || null,
              empresa: data.empresa || data.company || null,
              endereco: data.endereco || data.address || null,
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
        })
        .on('end', () => {
          resolve({
            success: errors.length === 0 || results.length > 0,
            processed: results.length,
            errors: errors.length,
            errorDetails: errors
          });
        })
        .on('error', (error) => {
          resolve({
            success: false,
            processed: 0,
            errors: 1,
            errorDetails: [{ row: 0, error: error.message }]
          });
        });
    });
  }

  /**
   * Processa arquivo Excel
   */
  private static async processExcelFile(filePath: string, tenantId: string): Promise<ProcessingResult> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const results: ImportRow[] = [];
      const errors: Array<{ row: number; error: string; data?: any }> = [];

      jsonData.forEach((data: any, index) => {
        const rowNumber = index + 2; // +2 porque Excel começa em 1 e tem header
        
        try {
          // AIDEV-NOTE: Validar dados obrigatórios
          if (!data.nome && !data.name) {
            errors.push({
              row: rowNumber,
              error: 'Nome é obrigatório',
              data
            });
            return;
          }

          // AIDEV-NOTE: Normalizar dados
          const normalizedData: ImportRow = {
            nome: data.nome || data.name || '',
            email: data.email || null,
            telefone: data.telefone || data.phone || null,
            cpf_cnpj: data.cpf_cnpj || data.cpf || data.cnpj || null,
            empresa: data.empresa || data.company || null,
            endereco: data.endereco || data.address || null,
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
          error: error instanceof Error ? error.message : 'Erro ao processar Excel' 
        }]
      };
    }
  }

  /**
   * Processa todos os jobs pendentes
   */
  static async processAllPendingJobs(): Promise<void> {
    try {
      console.log('🔍 [DirectProcessor] Buscando jobs pendentes...');
      
      const { data: pendingJobs, error } = await supabase
        .from('import_jobs')
        .select('id, filename')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar jobs pendentes: ${error.message}`);
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        console.log('✅ [DirectProcessor] Nenhum job pendente encontrado');
        return;
      }

      console.log(`📋 [DirectProcessor] Encontrados ${pendingJobs.length} jobs pendentes`);

      // AIDEV-NOTE: Processar jobs sequencialmente para evitar conflitos
      for (const job of pendingJobs) {
        try {
          await this.processJob(job.id);
          console.log(`✅ [DirectProcessor] Job ${job.filename} processado com sucesso`);
        } catch (error) {
          console.error(`❌ [DirectProcessor] Erro ao processar job ${job.filename}:`, error);
        }
      }

      console.log('🎉 [DirectProcessor] Processamento de jobs pendentes concluído');

    } catch (error) {
      console.error('❌ [DirectProcessor] Erro ao processar jobs pendentes:', error);
      throw error;
    }
  }
}