import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// AIDEV-NOTE: Headers CORS para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// AIDEV-NOTE: Interface para dados do job de importação
interface ImportJobData {
  id: string;
  tenant_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  total_records: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  error_message?: string;
  processed_records?: number;
  success_records?: number;
  error_records?: number;
}

// AIDEV-NOTE: Função para gerar ID único
function generateJobId(): string {
  return crypto.randomUUID();
}

// AIDEV-NOTE: Função para validar tipo de arquivo
function isValidFileType(contentType: string): boolean {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return allowedTypes.includes(contentType);
}

// AIDEV-NOTE: Função para estimar tempo de processamento
function estimateProcessingTime(recordCount: number): number {
  // Estima 1 segundo para cada 100 registros, mínimo 5 segundos
  return Math.max(5, Math.ceil(recordCount / 100));
}

serve(async (req) => {
  // AIDEV-NOTE: Lidar com requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // AIDEV-NOTE: Apenas método POST é permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // AIDEV-NOTE: Extrair headers necessários
    const tenantId = req.headers.get('x-tenant-id')
    const userId = req.headers.get('x-user-id')
    const authHeader = req.headers.get('authorization')

    // AIDEV-NOTE: Validar headers obrigatórios
    if (!tenantId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant ID é obrigatório' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User ID é obrigatório' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token de autenticação é obrigatório' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // AIDEV-NOTE: Verificar se o usuário tem acesso ao tenant
    console.log(`[DEBUG] Verificando acesso - Tenant: ${tenantId}, User: ${userId}`)
    
    const { data: tenantAccess, error: tenantError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    console.log(`[DEBUG] Query result - Data:`, tenantAccess)
    console.log(`[DEBUG] Query error:`, tenantError)

    if (tenantError || !tenantAccess) {
      console.log(`[ERROR] Acesso negado - Error: ${tenantError?.message}, Data: ${tenantAccess}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Usuário não tem acesso a este tenant. Debug: ${tenantError?.message || 'No data found'}` 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Processar FormData
    const formData = await req.formData()
    const file = formData.get('file') as File
    const recordCount = parseInt(formData.get('recordCount') as string || '0')
    const fieldMappingsStr = formData.get('fieldMappings') as string
    
    // AIDEV-NOTE: Parsear fieldMappings se fornecido
    let fieldMappings: any[] = []
    if (fieldMappingsStr) {
      try {
        fieldMappings = JSON.parse(fieldMappingsStr)
        console.log('🔍 [UPLOAD] Field mappings recebidos:', fieldMappings)
      } catch (error) {
        console.error('❌ [UPLOAD] Erro ao parsear fieldMappings:', error)
      }
    }

    // AIDEV-NOTE: Validar arquivo
    if (!file) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum arquivo foi enviado' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!isValidFileType(file.type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tipo de arquivo não suportado. Use CSV, XLS ou XLSX' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Gerar ID do job
    const jobId = generateJobId()

    console.log(`🔍 DEBUG: Processando arquivo ${file.name} com ${file.size} bytes`)

    // AIDEV-NOTE: Processar arquivo CSV diretamente
    const fileText = await file.text()
    const lines = fileText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Arquivo vazio ou inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Parser CSV robusto que trata aspas e escapes corretamente
    function parseCSVLine(line: string): string[] {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      let i = 0
      
      while (i < line.length) {
        const char = line[i]
        const nextChar = line[i + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Aspas duplas escapadas dentro de campo com aspas
            current += '"'
            i += 2
          } else {
            // Início ou fim de campo com aspas
            inQuotes = !inQuotes
            i++
          }
        } else if (char === ',' && !inQuotes) {
          // Separador encontrado fora de aspas
          result.push(current.trim())
          current = ''
          i++
        } else {
          // Caractere normal
          current += char
          i++
        }
      }
      
      // Adicionar último campo
      result.push(current.trim())
      return result
    }

    // AIDEV-NOTE: Processar CSV - primeira linha como headers
    const headers = parseCSVLine(lines[0])
    const dataRows = lines.slice(1)
    
    console.log(`🔍 DEBUG: Headers detectados:`, headers)
    
    // AIDEV-NOTE: Função de validação de registro (mesma lógica do frontend)
    function isValidRecord(record: any): boolean {
      // Validações obrigatórias - nome e email são essenciais
      const name = record.name || record.Nome || record.NAME || '';
      const email = record.email || record.Email || record.EMAIL || '';
      
      // Nome é obrigatório
      if (!name?.trim()) {
        return false;
      }
      
      // Email é obrigatório e deve ter formato válido
      if (!email?.trim()) {
        return false;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return false;
      }
      
      return true;
    }

    const processedData = dataRows.map((line, index) => {
      const values = parseCSVLine(line)
      const record: any = {}
      
      headers.forEach((header, i) => {
        record[header] = values[i] || ''
      })
      
      return record
    })
    .filter(record => {
      // Primeiro filtro: remover linhas completamente vazias
      const hasAnyValue = Object.values(record).some(value => value !== '');
      if (!hasAnyValue) return false;
      
      // Segundo filtro: aplicar validação de negócio (mesma do frontend)
      return isValidRecord(record);
    });

    console.log(`🔍 DEBUG: Total de linhas processadas: ${dataRows.length}`)
    console.log(`🔍 DEBUG: Registros válidos após validação: ${processedData.length}`)
    console.log(`🔍 DEBUG: Primeiro registro válido:`, processedData[0])

    // AIDEV-NOTE: Fazer upload do arquivo para Supabase Storage
    const fileName = `${jobId}_${file.name}`
    const filePath = `imports/${tenantId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('import-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao fazer upload do arquivo' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Criar registro do job na tabela import_jobs
    console.log(`[DEBUG] Criando job com dados:`, {
      id: jobId,
      tenant_id: tenantId,
      user_id: userId,
      filename: file.name,
      file_size: file.size,
      total_records: processedData.length
    })

    const jobData = {
      id: jobId,
      tenant_id: tenantId,
      user_id: userId,
      filename: file.name,
      file_size: file.size,
      total_records: processedData.length,
      status: 'processing',
      progress: 0,
      processed_records: 0,
      success_count: 0,
      error_count: 0,
      errors: null,
      field_mappings: fieldMappings.length > 0 ? fieldMappings : null
    }

    const { data: jobResult, error: jobError } = await supabase
      .from('import_jobs')
      .insert(jobData)
      .select()

    console.log(`[DEBUG] Resultado da inserção do job:`, { jobResult, jobError })

    if (jobError) {
      console.error('Erro ao criar job:', jobError)
      
      // AIDEV-NOTE: Limpar arquivo se falhou ao criar job
      await supabase.storage
        .from('import-files')
        .remove([filePath])

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao criar job de importação' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // AIDEV-NOTE: Inserir dados processados na tabela import_data
    console.log(`[DEBUG] Inserindo ${processedData.length} registros na tabela import_data`)
    
    const importDataRecords = processedData.map((record, index) => ({
      job_id: jobId,
      row_number: index + 1,
      data: record,
      created_at: new Date().toISOString()
    }))

    // AIDEV-NOTE: Inserir em lotes para evitar timeout
    const batchSize = 100
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    console.log(`[DEBUG] Iniciando inserção de ${importDataRecords.length} registros em lotes de ${batchSize}`)

    for (let i = 0; i < importDataRecords.length; i += batchSize) {
      const batch = importDataRecords.slice(i, i + batchSize)
      
      console.log(`[DEBUG] Inserindo lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(importDataRecords.length/batchSize)}, registros ${i+1}-${i + batch.length}`)
      console.log(`[DEBUG] Primeiro registro do lote:`, JSON.stringify(batch[0], null, 2))
      
      const { data: insertData, error: insertError } = await supabase
        .from('import_data')
        .insert(batch)
        .select()

      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${i}-${i + batch.length}:`, insertError)
        errorCount += batch.length
        errors.push(`Lote ${i}-${i + batch.length}: ${insertError.message}`)
      } else {
        successCount += batch.length
        console.log(`✅ Lote ${i}-${i + batch.length} inserido com sucesso. Registros inseridos:`, insertData?.length)
        console.log(`[DEBUG] IDs dos registros inseridos:`, insertData?.map(r => r.id))
      }
    }

    // AIDEV-NOTE: Atualizar status do job
    const finalStatus = errorCount === 0 ? 'completed' : (successCount > 0 ? 'completed_with_errors' : 'failed')
    
    const { error: updateError } = await supabase
      .from('import_jobs')
      .update({
        status: finalStatus,
        progress: 100,
        processed_records: successCount + errorCount,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Erro ao atualizar status do job:', updateError)
    }

    console.log(`✅ Job ${jobId} processado: ${successCount} sucessos, ${errorCount} erros`)

    // AIDEV-NOTE: Estimar tempo de processamento
    const estimatedTime = estimateProcessingTime(processedData.length)

    // AIDEV-NOTE: Retornar resposta apenas após inserção completa
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        estimatedTime,
        totalRecords: processedData.length,
        processedRecords: successCount + errorCount,
        successCount,
        errorCount,
        message: 'Upload realizado com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    ) 
  } catch (error) {
    console.error('Erro na Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})