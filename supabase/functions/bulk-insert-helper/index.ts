import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// AIDEV-NOTE: Helper para inserção em lote otimizada no Supabase
// Resolve problemas de performance e timeout em importações grandes

interface DetailedError {
  id: string;
  category: 'validation' | 'duplicate' | 'system' | 'permission' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage: string;
  field?: string;
  rowIndex?: number;
  originalData?: Record<string, any>;
  suggestedAction: string;
  canRetry: boolean;
  canIgnore: boolean;
}

interface ErrorSummary {
  validationErrors: number;
  duplicateErrors: number;
  systemErrors: number;
  permissionErrors: number;
  networkErrors: number;
}

interface BulkInsertRequest {
  table: string;
  data: Record<string, any>[];
  batchSize?: number;
  upsert?: boolean;
  onConflict?: string;
}

interface BulkInsertResponse {
  success: boolean;
  totalRecords: number;
  processedRecords: number;
  errors: DetailedError[];
  summary: ErrorSummary;
  batches: number;
  duration: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { table, data, batchSize = 100, upsert = false, onConflict }: BulkInsertRequest = await req.json();

    if (!table || !data || !Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: table and data array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    const totalRecords = data.length;
    const batches = Math.ceil(totalRecords / batchSize);
    let processedRecords = 0;
    const errors: DetailedError[] = [];

    console.log(`[BULK-INSERT] Iniciando inserção: ${totalRecords} registros em ${batches} batches`);
    
    // 🔧 [DEBUG-EDGE] Log dos primeiros 3 registros recebidos
    console.log('🔧 [DEBUG-EDGE] Primeiros 3 registros recebidos na Edge Function:');
    data.slice(0, 3).forEach((record, index) => {
      console.log(`🔧 [DEBUG-EDGE] Registro ${index}:`, {
        name: record.name,
        email: record.email,
        cpf_cnpj: record.cpf_cnpj,
        company: record.company,
        phone: record.phone,
        tenant_id: record.tenant_id,
        created_by: record.created_by
      });
    });

    // Helper para criar erro detalhado
    const createDetailedError = (
      error: any, 
      batchIndex: number, 
      batchData: Record<string, any>[]
    ): DetailedError => {
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let category: DetailedError['category'] = 'system';
      let severity: DetailedError['severity'] = 'medium';
      let userMessage = 'Erro desconhecido durante a inserção';
      let suggestedAction = 'Tente novamente ou contate o suporte';
      let canRetry = true;
      let canIgnore = false;

      // Categorizar erro baseado na mensagem
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        category = 'duplicate';
        severity = 'low';
        userMessage = 'Registro duplicado encontrado';
        suggestedAction = 'Verifique se o registro já existe ou use a opção de atualização';
        canIgnore = true;
      } else if (errorMessage.includes('not null') || errorMessage.includes('required')) {
        category = 'validation';
        severity = 'high';
        userMessage = 'Campo obrigatório não preenchido';
        suggestedAction = 'Preencha todos os campos obrigatórios';
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('reference')) {
        category = 'validation';
        severity = 'high';
        userMessage = 'Referência inválida encontrada';
        suggestedAction = 'Verifique se os dados referenciados existem';
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        category = 'permission';
        severity = 'critical';
        userMessage = 'Sem permissão para inserir dados';
        suggestedAction = 'Contate o administrador do sistema';
        canRetry = false;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        category = 'network';
        severity = 'medium';
        userMessage = 'Problema de conexão durante a inserção';
        suggestedAction = 'Verifique sua conexão e tente novamente';
      }

      return {
        id: errorId,
        category,
        severity,
        message: error.message || 'Erro desconhecido', // Adicionando campo message obrigatório
        userMessage,
        technicalMessage: error.message || 'Erro desconhecido',
        rowIndex: batchIndex * batchSize,
        originalData: batchData[0], // Primeiro registro do batch como exemplo
        suggestedAction,
        canRetry,
        canIgnore
      };
    };

    // Processar batches
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalRecords);
      const batch = data.slice(start, end);

      try {
        let query = supabaseClient.from(table);
        
        // 🔧 [DEBUG-EDGE] Log do batch antes da inserção
        console.log(`🔧 [DEBUG-EDGE] Batch ${i + 1} - Primeiro registro:`, {
          name: batch[0].name,
          email: batch[0].email,
          cpf_cnpj: batch[0].cpf_cnpj,
          company: batch[0].company,
          phone: batch[0].phone,
          allFields: Object.keys(batch[0])
        });
        
        if (upsert && onConflict) {
          const { error } = await query.upsert(batch, { onConflict });
          if (error) throw error;
        } else {
          const { error } = await query.insert(batch);
          if (error) throw error;
        }

        processedRecords += batch.length;
        console.log(`[BULK-INSERT] Batch ${i + 1}/${batches} processado: ${batch.length} registros`);

      } catch (batchError) {
        console.log(`[BULK-INSERT] Batch ${i + 1} falhou, processando registros individuais...`);
        
        // Se o batch falhou, processar registro por registro
        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const recordIndex = start + j;
          
          try {
            let query = supabaseClient.from(table);
            
            if (upsert && onConflict) {
              const { error } = await query.upsert([record], { onConflict });
              if (error) throw error;
            } else {
              const { error } = await query.insert([record]);
              if (error) throw error;
            }
            
            processedRecords++;
            console.log(`[BULK-INSERT] Registro ${recordIndex + 1} processado com sucesso`);
            
          } catch (recordError) {
            const detailedError = createDetailedError(recordError, recordIndex, [record]);
            detailedError.rowIndex = recordIndex;
            detailedError.originalData = record;
            errors.push(detailedError);
            console.error(`[BULK-INSERT] Registro ${recordIndex + 1} falhou:`, detailedError);
          }
        }
      }
    }

    // Criar resumo de erros
    const summary: ErrorSummary = {
      validationErrors: errors.filter(e => e.category === 'validation').length,
      duplicateErrors: errors.filter(e => e.category === 'duplicate').length,
      systemErrors: errors.filter(e => e.category === 'system').length,
      permissionErrors: errors.filter(e => e.category === 'permission').length,
      networkErrors: errors.filter(e => e.category === 'network').length,
    };

    const duration = Date.now() - startTime;
    const response: BulkInsertResponse = {
      success: errors.length === 0,
      totalRecords,
      processedRecords,
      errors,
      summary,
      batches,
      duration
    };

    console.log(`[BULK-INSERT] Concluído: ${processedRecords}/${totalRecords} em ${duration}ms`);

    return new Response(
      JSON.stringify(response),
      { 
        status: errors.length === 0 ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[BULK-INSERT] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});