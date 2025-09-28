import { createClient } from 'npm:@supabase/supabase-js@2';

// AIDEV-NOTE: Interfaces para tipagem
interface ImportJob {
  id: string;
  tenant_id: string;
  filename: string;
  status: string;
  field_mappings?: any;
  created_at: string;
  updated_at: string;
}

interface ProcessingResult {
  success: boolean;
  jobId: string;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row?: number;
    message: string;
    field?: string;
    data?: any;
  }>;
}

interface CustomerData {
  name?: string;
  email?: string;
  cpf_cnpj?: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  country?: string;
  celular_whatsapp?: string;
  customer_asaas_id?: string;
  additional_info?: string;
}

// AIDEV-NOTE: Headers CORS seguros
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, especificar domínios conhecidos
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// AIDEV-NOTE: Criar cliente Supabase fora do handler para reutilização
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// AIDEV-NOTE: Configurações
const BATCH_SIZE = parseInt(Deno.env.get('IMPORT_BATCH_SIZE') || '5');
const MAX_CUSTOMERS_PER_BATCH = parseInt(Deno.env.get('MAX_CUSTOMERS_PER_BATCH') || '50');

Deno.serve(async (req: Request) => {
  // AIDEV-NOTE: Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // AIDEV-NOTE: Apenas POST é permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🚀 Iniciando processamento de jobs de importação');

    // AIDEV-NOTE: Verificar autorização para requests externos
    const authHeader = req.headers.get('authorization');
    const isInternalTrigger = req.headers.get('x-internal-trigger') === 'true';

    if (!isInternalTrigger && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AIDEV-NOTE: Buscar e bloquear jobs pendentes de forma segura
    const workerId = `worker-${Date.now()}`;
    const { data: lockedJobs, error: lockError } = await supabase.rpc('lock_pending_import_jobs', {
      batch_size_param: BATCH_SIZE,
      worker_id_param: workerId
    });

    if (lockError) {
      console.error('❌ Erro ao bloquear jobs pendentes:', lockError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar jobs pendentes',
          code: 'LOCK_JOBS_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lockedJobs || lockedJobs.length === 0) {
      console.log('ℹ️ Nenhum job pendente encontrado');
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum job pendente encontrado', 
          processedJobs: [],
          summary: { total: 0, successful: 0, failed: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Encontrados ${lockedJobs.length} jobs para processar`);

    const results: ProcessingResult[] = [];

    // AIDEV-NOTE: Processar cada job sequencialmente
    for (const job of lockedJobs) {
      try {
        console.log(`🔄 Processando job ${job.id} - ${job.filename} (tenant: ${job.tenant_id})`);
        
        const result = await processImportFile(job);
        results.push(result);

        // AIDEV-NOTE: Atualizar status final do job
        const finalStatus = result.success ? 'completed' : 'failed';
        const { error: updateError } = await supabase
          .from('import_jobs')
          .update({
            status: finalStatus,
            processed_records: result.processedRecords,
            success_count: result.successCount,
            error_count: result.errorCount,
            errors: result.errors,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar job ${job.id}:`, updateError);
        } else {
          console.log(`✅ Job ${job.id} finalizado com status: ${finalStatus}`);
        }

      } catch (jobError) {
        console.error(`❌ Erro crítico no job ${job.id}:`, jobError);
        
        // AIDEV-NOTE: Marcar job como falhou
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            errors: [{ 
              message: jobError instanceof Error ? jobError.message : 'Erro desconhecido',
              timestamp: new Date().toISOString(),
              type: 'CRITICAL_ERROR'
            }],
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({
          success: false,
          jobId: job.id,
          processedRecords: 0,
          successCount: 0,
          errorCount: 1,
          errors: [{ 
            message: jobError instanceof Error ? jobError.message : 'Erro crítico no processamento'
          }]
        });
      }
    }

    // AIDEV-NOTE: Preparar resposta com resumo
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalProcessed: results.reduce((sum, r) => sum + r.processedRecords, 0),
      totalSuccess: results.reduce((sum, r) => sum + r.successCount, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0)
    };

    console.log(`🎯 Processamento concluído:`, summary);

    return new Response(
      JSON.stringify({
        message: `Processamento concluído. ${results.length} jobs processados.`,
        processedJobs: results,
        summary
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro geral no processamento:', error);
    
    // AIDEV-NOTE: Não expor detalhes internos em produção
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// AIDEV-NOTE: Função para processar um arquivo de importação com batch operations
async function processImportFile(job: ImportJob): Promise<ProcessingResult> {
  try {
    console.log(`📊 Iniciando processamento do job ${job.id}`);
    
    // AIDEV-NOTE: Buscar todos os dados para importação
    const { data: importDataRows, error: dataError } = await supabase
      .from('import_data')
      .select('data, row_number')
      .eq('job_id', job.id)
      .order('row_number');

    if (dataError) {
      throw new Error(`Erro ao buscar dados de importação: ${dataError.message}`);
    }

    if (!importDataRows || importDataRows.length === 0) {
      console.log(`⚠️ Nenhum dado encontrado para o job ${job.id}`);
      return {
        success: true,
        jobId: job.id,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        errors: []
      };
    }

    console.log(`📋 Processando ${importDataRows.length} registros`);
    
    // AIDEV-NOTE: CORREÇÃO CRÍTICA - Aplicar field_mappings aos dados antes do processamento
    let importData: CustomerData[];
    
    if (job.field_mappings && Array.isArray(job.field_mappings) && job.field_mappings.length > 0) {
      console.log(`🔄 Aplicando ${job.field_mappings.length} mapeamentos de campo`);
      console.log('🔍 [DEBUG] Field mappings:', JSON.stringify(job.field_mappings, null, 2));
      
      // AIDEV-NOTE: Aplicar mapeamento aos dados
      importData = importDataRows.map((row, index) => {
        const originalData = row.data;
        const mappedData: CustomerData = {};
        
        // AIDEV-NOTE: Aplicar cada mapeamento
        job.field_mappings.forEach((mapping: any) => {
          if (mapping.sourceField && mapping.targetField && originalData[mapping.sourceField] !== undefined) {
            // AIDEV-NOTE: Mapear campo de origem para campo de destino
            (mappedData as any)[mapping.targetField] = originalData[mapping.sourceField];
          }
        });
        
        // AIDEV-NOTE: Log detalhado apenas para os primeiros 3 registros
        if (index < 3) {
          console.log(`🔍 [DEBUG] Linha ${row.row_number} - Original:`, JSON.stringify(originalData, null, 2));
          console.log(`🔍 [DEBUG] Linha ${row.row_number} - Mapeado:`, JSON.stringify(mappedData, null, 2));
        }
        
        return mappedData;
      });
      
      console.log(`✅ Mapeamento aplicado com sucesso a ${importData.length} registros`);
      console.log(`🔍 [DEBUG] Primeiro registro mapeado:`, JSON.stringify(importData[0], null, 2));
    } else {
      console.log(`⚠️ Nenhum field_mapping encontrado, usando dados brutos`);
      // AIDEV-NOTE: Usar dados brutos se não houver mapeamento
      importData = importDataRows.map(row => row.data);
    }
    
    // AIDEV-NOTE: Processar em lotes para melhor performance
    const results = await processBatchCustomers(importData, job);
    
    return {
      success: true,
      jobId: job.id,
      processedRecords: importData.length,
      successCount: results.successCount,
      errorCount: results.errorCount,
      errors: results.errors
    };

  } catch (error) {
    console.error(`💥 Erro no processamento do job ${job.id}:`, error);
    return {
      success: false,
      jobId: job.id,
      processedRecords: 0,
      successCount: 0,
      errorCount: 1,
      errors: [{ 
        message: error instanceof Error ? error.message : 'Erro no processamento'
      }]
    };
  }
}

// AIDEV-NOTE: Processar clientes em lotes com verificação de duplicatas otimizada
async function processBatchCustomers(
  importData: CustomerData[], 
  job: ImportJob
): Promise<{ successCount: number; errorCount: number; errors: any[] }> {
  
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  // AIDEV-NOTE: Processar em chunks para evitar sobrecarga
  for (let i = 0; i < importData.length; i += MAX_CUSTOMERS_PER_BATCH) {
    const batch = importData.slice(i, i + MAX_CUSTOMERS_PER_BATCH);
    console.log(`🔄 Processando lote ${Math.floor(i / MAX_CUSTOMERS_PER_BATCH) + 1} (${batch.length} registros)`);
    
    // AIDEV-NOTE: Validar dados básicos do lote
    const validatedBatch = [];
    const batchErrors = [];

    for (let j = 0; j < batch.length; j++) {
      const customerData = batch[j];
      const rowNumber = i + j + 1;
      
      const validation = validateCustomerData(customerData, rowNumber);
      if (validation.isValid) {
        validatedBatch.push({
          data: customerData,
          rowNumber,
          processedData: validation.processedData!
        });
      } else {
        batchErrors.push(...validation.errors);
      }
    }

    // AIDEV-NOTE: Verificar duplicatas em lote se há dados válidos
    if (validatedBatch.length > 0) {
      const { validCustomers, duplicateErrors } = await checkDuplicatesInBatch(
        validatedBatch, 
        job.tenant_id
      );

      batchErrors.push(...duplicateErrors);

      // AIDEV-NOTE: Inserir clientes válidos em lote
      if (validCustomers.length > 0) {
        const insertResult = await insertCustomersBatch(validCustomers, job.tenant_id);
        successCount += insertResult.successCount;
        errorCount += insertResult.errorCount;
        errors.push(...insertResult.errors);
      }
    }

    // AIDEV-NOTE: Adicionar erros de validação
    errorCount += batchErrors.length;
    errors.push(...batchErrors);
  }

  console.log(`📈 Lote concluído: ${successCount} sucessos, ${errorCount} erros`);
  return { successCount, errorCount, errors };
}

// AIDEV-NOTE: Validar dados do cliente com validações mais rigorosas
function validateCustomerData(customerData: CustomerData, rowNumber: number): {
  isValid: boolean;
  errors: any[];
  processedData?: any;
} {
  const errors = [];

  // AIDEV-NOTE: Sanitizar dados
  const sanitized = {
    name: customerData.name?.toString()?.trim() || '',
    email: customerData.email?.toString()?.trim() || '',
    cpf_cnpj: customerData.cpf_cnpj?.toString()?.trim() || '',
    company: customerData.company?.toString()?.trim() || null,
    phone: customerData.phone?.toString()?.trim() || null,
    address: customerData.address?.toString()?.trim() || null,
    city: customerData.city?.toString()?.trim() || null,
    state: customerData.state?.toString()?.trim() || null,
    postal_code: customerData.postal_code?.toString()?.trim() || null,
    address_number: customerData.address_number?.toString()?.trim() || null,
    complement: customerData.complement?.toString()?.trim() || null,
    neighborhood: customerData.neighborhood?.toString()?.trim() || null,
    country: customerData.country?.toString()?.trim() || 'Brasil',
    celular_whatsapp: customerData.celular_whatsapp?.toString()?.trim() || null,
    customer_asaas_id: customerData.customer_asaas_id?.toString()?.trim() || null,
    additional_info: customerData.additional_info?.toString()?.trim() || null
  };

  // AIDEV-NOTE: Aplicar validação rigorosa antes do processamento
  const validationResult = isValidRecord(sanitized);
  if (!validationResult.isValid) {
    validationResult.errors.forEach(errorMsg => {
      errors.push({
        row: rowNumber,
        message: errorMsg,
        field: errorMsg.includes('Nome') ? 'name' : 'email',
        data: customerData
      });
    });
  }

  // AIDEV-NOTE: Validações obrigatórias mais rigorosas
  if (!sanitized.name || sanitized.name.length < 2) {
    errors.push({
      row: rowNumber,
      message: 'Nome é obrigatório e deve ter pelo menos 2 caracteres',
      field: 'name',
      data: customerData
    });
  }

  // AIDEV-NOTE: Validar se nome não é texto genérico/inválido - CORREÇÃO: Padrões mais específicos
  const invalidNamePatterns = [
    /^mensalidade\s*$/i,           // Apenas "mensalidade" sozinho
    /^cobrança\s*$/i,             // Apenas "cobrança" sozinho  
    /^pagamento\s*$/i,            // Apenas "pagamento" sozinho
    /^vencimento\s*$/i,           // Apenas "vencimento" sozinho
    /^\d+\/\d+\/\d+$/,            // Apenas datas (dd/mm/yyyy)
    /^cus_[a-zA-Z0-9]+$/i,        // IDs do Asaas (cus_xxxxx)
    /^\d+\.\d+$/,                 // Apenas números decimais
    /^R\$\s*\d+/i,                // Valores monetários
    /^null$/i,                    // Valor "null" literal
    /^undefined$/i,               // Valor "undefined" literal
    /^\s*$/                       // Apenas espaços em branco
  ];
  
  if (sanitized.name && invalidNamePatterns.some(pattern => pattern.test(sanitized.name))) {
    errors.push({
      row: rowNumber,
      message: 'Nome contém texto inválido (não é um nome de pessoa/empresa válido)',
      field: 'name',
      data: customerData
    });
  }

  if (!sanitized.email) {
    errors.push({
      row: rowNumber,
      message: 'Email é obrigatório',
      field: 'email',
      data: customerData
    });
  } else if (!isValidEmail(sanitized.email)) {
    errors.push({
      row: rowNumber,
      message: 'Email com formato inválido',
      field: 'email',
      data: customerData
    });
  }

  // AIDEV-NOTE: Validar CPF/CNPJ se fornecido - CORREÇÃO: Validação mais flexível
  if (sanitized.cpf_cnpj) {
    // Verificar se não é ID do Asaas ou outro formato claramente inválido
    if (sanitized.cpf_cnpj.startsWith('cus_')) {
      errors.push({
        row: rowNumber,
        message: 'CPF/CNPJ em formato inválido (ID de sistema detectado)',
        field: 'cpf_cnpj',
        data: customerData
      });
    } else if (sanitized.cpf_cnpj.length < 11 || sanitized.cpf_cnpj.length > 18) {
      // AIDEV-NOTE: Permitir CPF (11) e CNPJ (14) com formatação
      errors.push({
        row: rowNumber,
        message: 'CPF/CNPJ deve ter entre 11 e 18 caracteres',
        field: 'cpf_cnpj',
        data: customerData
      });
    } else if (!isValidCpfCnpj(sanitized.cpf_cnpj)) {
      // AIDEV-NOTE: Apenas avisar, não bloquear - pode ser formatação diferente
      console.log(`⚠️ Linha ${rowNumber}: CPF/CNPJ com formato não padrão: ${sanitized.cpf_cnpj}`);
    }
  }

  // AIDEV-NOTE: Log detalhado para debugging
  if (errors.length > 0) {
    console.log(`❌ Linha ${rowNumber} rejeitada:`, {
      name: sanitized.name,
      email: sanitized.email,
      cpf_cnpj: sanitized.cpf_cnpj,
      errors: errors.map(e => e.message)
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    processedData: sanitized
  };
}

// AIDEV-NOTE: Verificar duplicatas em lote (CPF/CNPJ e Email)
async function checkDuplicatesInBatch(
  validatedBatch: Array<{ data: CustomerData; rowNumber: number; processedData: any }>,
  tenantId: string
): Promise<{ validCustomers: any[]; duplicateErrors: any[] }> {
  
  const validCustomers = [];
  const duplicateErrors = [];

  // AIDEV-NOTE: Extrair CPF/CNPJs não vazios para verificação em lote
  const cpfCnpjsToCheck = validatedBatch
    .filter(item => item.processedData.cpf_cnpj)
    .map(item => {
      const cleanCpfCnpj = item.processedData.cpf_cnpj.replace(/\D/g, '');
      return cleanCpfCnpj ? parseInt(cleanCpfCnpj) : null;
    })
    .filter(cpf => cpf !== null);

  // AIDEV-NOTE: Extrair emails não vazios para verificação em lote
  const emailsToCheck = validatedBatch
    .filter(item => item.processedData.email)
    .map(item => item.processedData.email.toLowerCase().trim())
    .filter(email => email);

  let existingCustomers = [];
  
  // AIDEV-NOTE: Verificar duplicatas de CPF/CNPJ
  if (cpfCnpjsToCheck.length > 0) {
    console.log(`🔍 Verificando ${cpfCnpjsToCheck.length} CPF/CNPJs para duplicatas`);
    
    const { data: existing, error } = await supabase
      .from('customers')
      .select('cpf_cnpj, name, email')
      .eq('tenant_id', tenantId)
      .in('cpf_cnpj', cpfCnpjsToCheck);

    if (error) {
      console.error('❌ Erro ao verificar duplicatas de CPF/CNPJ:', error);
    } else {
      existingCustomers = existing || [];
    }
  }

  // AIDEV-NOTE: Verificar duplicatas de email
  let existingEmailCustomers = [];
  if (emailsToCheck.length > 0) {
    console.log(`🔍 Verificando ${emailsToCheck.length} emails para duplicatas`);
    
    const { data: existingEmails, error: emailError } = await supabase
      .from('customers')
      .select('cpf_cnpj, name, email')
      .eq('tenant_id', tenantId)
      .in('email', emailsToCheck);

    if (emailError) {
      console.error('❌ Erro ao verificar duplicatas de email:', emailError);
    } else {
      existingEmailCustomers = existingEmails || [];
    }
  }

  // AIDEV-NOTE: Criar mapas de CPF/CNPJs e emails existentes
  const existingCpfCnpjMap = new Map();
  existingCustomers.forEach(customer => {
    existingCpfCnpjMap.set(customer.cpf_cnpj, customer);
  });

  const existingEmailMap = new Map();
  existingEmailCustomers.forEach(customer => {
    existingEmailMap.set(customer.email.toLowerCase(), customer);
  });

  // AIDEV-NOTE: Filtrar registros válidos
  for (const item of validatedBatch) {
    const { processedData, rowNumber, data } = item;
    let isDuplicate = false;
    
    // AIDEV-NOTE: Verificar duplicata de CPF/CNPJ
    if (processedData.cpf_cnpj) {
      const cleanCpfCnpj = processedData.cpf_cnpj.replace(/\D/g, '');
      const cpfCnpjNumber = cleanCpfCnpj ? parseInt(cleanCpfCnpj) : null;
      
      if (cpfCnpjNumber && existingCpfCnpjMap.has(cpfCnpjNumber)) {
        const existing = existingCpfCnpjMap.get(cpfCnpjNumber);
        duplicateErrors.push({
          row: rowNumber,
          message: `CPF/CNPJ já cadastrado para cliente: ${existing.name} (${existing.email})`,
          field: 'cpf_cnpj',
          data,
          existing_customer: existing
        });
        isDuplicate = true;
      }
    }

    // AIDEV-NOTE: Verificar duplicata de email (apenas se não for duplicata de CPF/CNPJ)
    if (!isDuplicate && processedData.email) {
      const emailToCheck = processedData.email.toLowerCase().trim();
      
      if (existingEmailMap.has(emailToCheck)) {
        const existing = existingEmailMap.get(emailToCheck);
        duplicateErrors.push({
          row: rowNumber,
          message: `Email já cadastrado para cliente: ${existing.name} (${existing.email})`,
          field: 'email',
          data,
          existing_customer: existing
        });
        isDuplicate = true;
      }
    }

    // AIDEV-NOTE: Se não for duplicata, adicionar à lista de válidos
    if (!isDuplicate) {
      // AIDEV-NOTE: Preparar dados para inserção
      const customerToInsert = {
        name: processedData.name,
        email: processedData.email,
        company: processedData.company,
        phone: processedData.phone,
        cpf_cnpj: processedData.cpf_cnpj ? 
          parseInt(processedData.cpf_cnpj.replace(/\D/g, '')) || null : null,
        address: processedData.address,
        city: processedData.city,
        state: processedData.state,
        postal_code: processedData.postal_code,
        address_number: processedData.address_number,
        complement: processedData.complement,
        neighborhood: processedData.neighborhood,
        country: processedData.country,
        celular_whatsapp: processedData.celular_whatsapp,
        customer_asaas_id: processedData.customer_asaas_id,
        additional_info: processedData.additional_info,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      validCustomers.push({
        customerData: customerToInsert,
        rowNumber,
        originalData: data
      });
    }
  }

  console.log(`✅ Verificação de duplicatas concluída: ${validCustomers.length} válidos, ${duplicateErrors.length} duplicatas`);
  
  return { validCustomers, duplicateErrors };
}

// AIDEV-NOTE: Inserir clientes em lote com logs detalhados
async function insertCustomersBatch(
  validCustomers: Array<{ customerData: any; rowNumber: number; originalData: any }>,
  tenantId: string
): Promise<{ successCount: number; errorCount: number; errors: any[] }> {
  
  console.log(`💾 Inserindo lote de ${validCustomers.length} clientes`);
  
  const customersToInsert = validCustomers.map(item => item.customerData);
  
  // AIDEV-NOTE: Log detalhado dos dados que serão inseridos
  console.log('📋 Dados para inserção:', customersToInsert.map(c => ({
    name: c.name,
    email: c.email,
    cpf_cnpj: c.cpf_cnpj,
    tenant_id: c.tenant_id
  })));
  
  const { data: insertedCustomers, error: insertError } = await supabase
    .from('customers')
    .insert(customersToInsert)
    .select('id, name, email');

  if (insertError) {
    console.error('❌ Erro no batch insert:', insertError);
    console.error('❌ Dados que causaram erro:', JSON.stringify(customersToInsert, null, 2));
    
    // AIDEV-NOTE: Se batch insert falhar, tentar inserção individual
    return await insertCustomersIndividually(validCustomers);
  }

  console.log(`✅ Lote inserido com sucesso: ${insertedCustomers?.length || 0} clientes`);
  console.log('✅ Clientes inseridos:', insertedCustomers?.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email
  })));
  
  return {
    successCount: insertedCustomers?.length || 0,
    errorCount: 0,
    errors: []
  };
}

// AIDEV-NOTE: Fallback para inserção individual com logs detalhados
async function insertCustomersIndividually(
  validCustomers: Array<{ customerData: any; rowNumber: number; originalData: any }>
): Promise<{ successCount: number; errorCount: number; errors: any[] }> {
  
  console.log(`🔄 Inserção individual iniciada para ${validCustomers.length} clientes`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const item of validCustomers) {
    try {
      console.log(`📝 Inserindo cliente linha ${item.rowNumber}:`, {
        name: item.customerData.name,
        email: item.customerData.email,
        cpf_cnpj: item.customerData.cpf_cnpj
      });
      
      const { data: insertedCustomer, error: insertError } = await supabase
        .from('customers')
        .insert(item.customerData)
        .select('id, name, email')
        .single();

      if (insertError) {
        console.error(`❌ Erro ao inserir cliente linha ${item.rowNumber}:`, insertError);
        console.error(`❌ Dados da linha ${item.rowNumber}:`, JSON.stringify(item.customerData, null, 2));
        
        // AIDEV-NOTE: Tratamento específico para erro de constraint UNIQUE
        let errorMessage = insertError.message;
        if (insertError.code === '23505') {
          if (insertError.message.includes('customers_tenant_id_email_key')) {
            errorMessage = `Email já cadastrado: ${item.customerData.email}`;
          } else if (insertError.message.includes('customers_tenant_id_cpf_cnpj_key')) {
            errorMessage = `CPF/CNPJ já cadastrado: ${item.customerData.cpf_cnpj}`;
          } else {
            errorMessage = `Dados já cadastrados (duplicata detectada)`;
          }
        }
        
        errorCount++;
        errors.push({
          row: item.rowNumber,
          message: errorMessage,
          field: 'insert',
          data: item.originalData,
          error_code: insertError.code
        });
      } else {
        console.log(`✅ Cliente inserido linha ${item.rowNumber}:`, {
          id: insertedCustomer.id,
          name: insertedCustomer.name,
          email: insertedCustomer.email
        });
        successCount++;
      }
    } catch (error) {
      console.error(`💥 Erro crítico na inserção linha ${item.rowNumber}:`, error);
      console.error(`💥 Dados da linha ${item.rowNumber}:`, JSON.stringify(item.customerData, null, 2));
      errorCount++;
      errors.push({
        row: item.rowNumber,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        field: 'insert',
        data: item.originalData
      });
    }
  }

  console.log(`📊 Inserção individual concluída: ${successCount} sucessos, ${errorCount} erros`);
  
  return { successCount, errorCount, errors };
}

// AIDEV-NOTE: Funções de validação aprimoradas
function isValidEmail(email: string): boolean {
  if (!email?.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isValidRecord(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validações obrigatórias (mesma lógica do frontend)
  if (!data.name?.trim()) {
    errors.push('Nome é obrigatório');
  }
  
  if (!data.email?.trim()) {
    errors.push('Email é obrigatório');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email inválido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function isValidCpfCnpj(document: string): boolean {
  if (!document?.trim()) return true; // Campo opcional
  
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return isValidCpf(cleanDoc);
  }
  
  if (cleanDoc.length === 14) {
    return isValidCnpj(cleanDoc);
  }
  
  return false;
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.charAt(10));
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}