import { supabase } from '@/lib/supabase';

// AIDEV-NOTE: Serviço para inserção em lote otimizada
// Utiliza Edge Function como primeira opção, com fallback direto no Supabase

interface BulkInsertOptions {
  table: string;
  data: Record<string, any>[];
  batchSize?: number;
  upsert?: boolean;
  onConflict?: string;
}

interface BulkInsertResult {
  success: boolean;
  totalRecords: number;
  processedRecords: number;
  errors: string[];
  duration: number;
  method: 'edge_function' | 'direct_supabase'; // AIDEV-NOTE: Indica qual método foi usado
}

export class BulkInsertService {
  private static readonly EDGE_FUNCTION_URL = '/functions/v1/bulk-insert-helper';
  private static readonly MAX_BATCH_SIZE = 1000;
  private static readonly EDGE_FUNCTION_TIMEOUT = 30000; // 30 segundos

  /**
   * AIDEV-NOTE: Inserção em lote com Edge Function e fallback direto
   * Tenta usar Edge Function primeiro, se falhar usa inserção direta no Supabase
   */
  static async insertBulk(options: BulkInsertOptions): Promise<BulkInsertResult> {
    const startTime = Date.now();
    
    console.log(`[BULK-INSERT-SERVICE] Iniciando inserção de ${options.data.length} registros na tabela ${options.table}`);
    
    // AIDEV-NOTE: Primeira tentativa - Edge Function
    try {
      const edgeResult = await this.tryEdgeFunction(options);
      const duration = Date.now() - startTime;
      
      console.log(`[BULK-INSERT-SERVICE] ✅ Edge Function executada com sucesso em ${duration}ms`);
      
      return {
        ...edgeResult,
        duration,
        method: 'edge_function'
      };
    } catch (edgeError) {
      console.warn(`[BULK-INSERT-SERVICE] ⚠️ Edge Function falhou:`, edgeError);
      console.log(`[BULK-INSERT-SERVICE] 🔄 Tentando fallback direto no Supabase...`);
      
      // AIDEV-NOTE: Fallback - Inserção direta no Supabase
      try {
        const directResult = await this.insertDirectSupabase(options);
        const duration = Date.now() - startTime;
        
        console.log(`[BULK-INSERT-SERVICE] ✅ Fallback direto executado com sucesso em ${duration}ms`);
        
        return {
          ...directResult,
          duration,
          method: 'direct_supabase'
        };
      } catch (directError) {
        console.error(`[BULK-INSERT-SERVICE] ❌ Fallback direto também falhou:`, directError);
        throw directError;
      }
    }
  }

  /**
   * AIDEV-NOTE: Tentativa de usar Edge Function
   */
  private static async tryEdgeFunction(options: BulkInsertOptions): Promise<Omit<BulkInsertResult, 'duration' | 'method'>> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const fullUrl = `${supabase.supabaseUrl}${this.EDGE_FUNCTION_URL}`;
    
    console.log('🔧 [DEBUG-URL] URL completa da Edge Function:', fullUrl);
    console.log('🔧 [DEBUG-URL] Supabase URL:', supabase.supabaseUrl);
    console.log('🔧 [DEBUG-URL] Edge Function Path:', this.EDGE_FUNCTION_URL);
    
    // AIDEV-NOTE: Log dos primeiros 3 registros para debug
    console.log('🔧 [DEBUG-DATA] Primeiros 3 registros enviados:', options.data.slice(0, 3).map(record => ({
      name: record.name,
      email: record.email,
      cpf_cnpj: record.cpf_cnpj,
      company: record.company,
      phone: record.phone,
      tenant_id: record.tenant_id,
      created_by: record.created_by
    })));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.EDGE_FUNCTION_TIMEOUT);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey,
          'x-client-info': 'revalya-bulk-insert/1.0.0',
        },
        body: JSON.stringify({
          table: options.table,
          data: options.data,
          batchSize: options.batchSize || 100,
          upsert: options.upsert || false,
          onConflict: options.onConflict,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('🔧 [DEBUG-RESPONSE] Status da resposta:', response.status);
      console.log('🔧 [DEBUG-RESPONSE] Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 [DEBUG-ERROR] Erro na resposta:', errorText);
        throw new Error(`Edge Function HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('🔧 [DEBUG-RESULT] Resultado da Edge Function:', result);
      
      // AIDEV-NOTE: Validar se a resposta tem a estrutura esperada
      if (!result || typeof result.success !== 'boolean') {
        throw new Error('Edge Function retornou resposta inválida');
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Edge Function timeout após ${this.EDGE_FUNCTION_TIMEOUT}ms`);
      }
      
      throw error;
    }
  }

  /**
   * AIDEV-NOTE: Inserção direta no Supabase como fallback
   */
  private static async insertDirectSupabase(options: BulkInsertOptions): Promise<Omit<BulkInsertResult, 'duration' | 'method'>> {
    const { table, data, batchSize = 100 } = options;
    
    console.log(`[DIRECT-SUPABASE] Inserindo ${data.length} registros em lotes de ${batchSize}`);
    
    let processedRecords = 0;
    const errors: string[] = [];
    
    // AIDEV-NOTE: Processar em lotes para evitar timeouts
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        console.log(`[DIRECT-SUPABASE] Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} (${batch.length} registros)`);
        
        const { data: insertedData, error } = await supabase
          .from(table)
          .insert(batch)
          .select('id');

        if (error) {
          console.error(`[DIRECT-SUPABASE] Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
          
          // AIDEV-NOTE: Tentar inserção individual para identificar registros problemáticos
          for (const record of batch) {
            try {
              const { error: individualError } = await supabase
                .from(table)
                .insert(record);
              
              if (individualError) {
                errors.push(`Registro ${record.name || record.email}: ${individualError.message}`);
              } else {
                processedRecords++;
              }
            } catch (individualErr) {
              errors.push(`Registro ${record.name || record.email}: ${individualErr.message}`);
            }
          }
        } else {
          processedRecords += insertedData?.length || batch.length;
          console.log(`[DIRECT-SUPABASE] ✅ Lote ${Math.floor(i / batchSize) + 1} inserido: ${insertedData?.length || batch.length} registros`);
        }
      } catch (batchError) {
        console.error(`[DIRECT-SUPABASE] Erro crítico no lote ${Math.floor(i / batchSize) + 1}:`, batchError);
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${batchError.message}`);
      }
    }
    
    const success = processedRecords > 0;
    
    console.log(`[DIRECT-SUPABASE] Concluído: ${processedRecords}/${data.length} registros inseridos, ${errors.length} erros`);
    
    return {
      success,
      totalRecords: data.length,
      processedRecords,
      errors
    };
  }

  /**
   * Insere clientes em lote com validação
   */
  static async insertCustomers(
    customers: Record<string, any>[],
    options?: { batchSize?: number; upsert?: boolean }
  ): Promise<BulkInsertResult> {
    // Validação básica dos dados
    const validCustomers = customers.filter(customer => 
      customer.name && 
      customer.name.trim() !== '' &&
      customer.tenant_id
    );

    if (validCustomers.length !== customers.length) {
      console.warn(`[BULK-INSERT-SERVICE] ${customers.length - validCustomers.length} clientes inválidos removidos`);
    }

    return this.insertBulk({
      table: 'customers',
      data: validCustomers,
      batchSize: options?.batchSize || 100,
      upsert: options?.upsert || false,
      onConflict: 'customer_asaas_id,cpf_cnpj'
    });
  }

  /**
   * AIDEV-NOTE: Método genérico para inserção com progresso
   */
  static async insertWithProgress<T>(
    data: T[],
    insertFn: (batch: T[]) => Promise<void>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ success: boolean; processed: number; total: number }> {
    const { batchSize = 100, onProgress } = options;
    let processed = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await insertFn(batch);
      processed += batch.length;
      onProgress?.(processed, data.length);
    }

    return {
      success: true,
      processed,
      total: data.length
    };
  }
}

export default BulkInsertService;