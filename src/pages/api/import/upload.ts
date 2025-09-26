import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';

// AIDEV-NOTE: Cliente Supabase com permissões de service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AIDEV-NOTE: Interface para dados do job de importação
interface ImportJobData {
  id: string;
  tenant_id: string;
  user_id: string;
  filename: string;
  file_size: number;
  total_records: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processed_records: number;
  success_count: number;
  error_count: number;
  errors: any[];
  created_at: string;
  updated_at: string;
}

export const config = {
  api: {
    bodyParser: false, // AIDEV-NOTE: Desabilitar bodyParser para upload de arquivos
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // AIDEV-NOTE: Configurar formidable para upload
    const form = formidable({
      uploadDir: './uploads',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    // AIDEV-NOTE: Extrair dados do formulário
    const tenantId = Array.isArray(fields.tenantId) ? fields.tenantId[0] : fields.tenantId;
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'tenantId e userId são obrigatórios' });
    }

    // AIDEV-NOTE: Validar arquivo enviado
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    // AIDEV-NOTE: Validar tipo de arquivo
    const fileName = uploadedFile.originalFilename || 'arquivo_importacao';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo não suportado. Use CSV, XLS ou XLSX.' 
      });
    }

    // AIDEV-NOTE: Gerar ID único para o job
    const jobId = uuidv4();

    // AIDEV-NOTE: Criar registro do job na base de dados
    const { error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        id: jobId,
        tenant_id: tenantId,
        user_id: userId,
        filename: fileName,
        file_size: uploadedFile.size,
        total_records: 0, // Será atualizado durante o processamento
        status: 'pending',
        progress: 0,
        processed_records: 0,
        success_count: 0,
        error_count: 0,
        errors: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (jobError) {
      console.error('❌ Erro ao criar job:', jobError);
      return res.status(500).json({ error: 'Erro ao criar job de importação' });
    }

    // AIDEV-NOTE: Adicionar job à fila de processamento
    const { importQueueService } = await import('@/services/importQueueService');
    
    const queueJobId = await importQueueService.enqueueJob({
      tenant_id: tenantId,
      user_id: userId,
      file_name: fileName,
      file_path: uploadedFile.filepath,
      file_type: fileExtension,
      file_size: uploadedFile.size,
      priority: 1, // Prioridade normal
      max_retries: 3
    });

    return res.status(200).json({
      success: true,
      jobId,
      message: 'Arquivo enviado com sucesso. O processamento foi iniciado.',
      estimatedTime: Math.ceil(uploadedFile.size / (1024 * 1024)) * 30 // 30s por MB estimado
    });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// AIDEV-NOTE: Função para processar arquivo CSV
async function processCSVFile(filePath: string): Promise<CustomerImportData[]> {
  return new Promise((resolve, reject) => {
    const results: CustomerImportData[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // AIDEV-NOTE: Mapear campos do CSV para formato padrão
        const customer: CustomerImportData = {
          name: data.name || data.nome || data.Name || data.Nome,
          email: data.email || data.Email,
          phone: data.phone || data.telefone || data.Phone || data.Telefone,
          cpf_cnpj: data.cpf_cnpj || data.cpf || data.cnpj || data.document,
          company: data.company || data.empresa || data.Company || data.Empresa,
          address: data.address || data.endereco || data.Address || data.Endereco,
          address_number: data.address_number || data.numero || data.Number,
          complement: data.complement || data.complemento || data.Complement,
          neighborhood: data.neighborhood || data.bairro || data.Neighborhood,
          postal_code: data.postal_code || data.cep || data.CEP,
          city: data.city || data.cidade || data.City || data.Cidade,
          state: data.state || data.estado || data.State || data.Estado,
          country: data.country || data.pais || data.Country || 'Brasil',
        };
        
        // AIDEV-NOTE: Validar campos obrigatórios
        if (customer.name && customer.email) {
          results.push(customer);
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// AIDEV-NOTE: Função para processar arquivo Excel
async function processExcelFile(filePath: string): Promise<CustomerImportData[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  return jsonData.map((row: any) => ({
    name: row.name || row.nome || row.Name || row.Nome,
    email: row.email || row.Email,
    phone: row.phone || row.telefone || row.Phone || row.Telefone,
    cpf_cnpj: row.cpf_cnpj || row.cpf || row.cnpj || row.document,
    company: row.company || row.empresa || row.Company || row.Empresa,
    address: row.address || row.endereco || row.Address || row.Endereco,
    address_number: row.address_number || row.numero || row.Number,
    complement: row.complement || row.complemento || row.Complement,
    neighborhood: row.neighborhood || row.bairro || row.Neighborhood,
    postal_code: row.postal_code || row.cep || row.CEP,
    city: row.city || row.cidade || row.City || row.Cidade,
    state: row.state || row.estado || row.State || row.Estado,
    country: row.country || row.pais || row.Country || 'Brasil',
  })).filter(customer => customer.name && customer.email);
}

// AIDEV-NOTE: Função para processar job de importação assincronamente
async function processImportJob(jobId: string) {
  try {
    console.log('🔄 Iniciando processamento do job:', jobId);
    
    // AIDEV-NOTE: Buscar dados do job
    const { data: jobData, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      throw new Error('Job não encontrado');
    }

    // AIDEV-NOTE: Buscar dados para importação
    const { data: importDataResult, error: dataError } = await supabase
      .from('import_data')
      .select('data')
      .eq('job_id', jobId)
      .single();

    if (dataError || !importDataResult) {
      throw new Error('Dados de importação não encontrados');
    }

    const importData: CustomerImportData[] = importDataResult.data;
    
    // AIDEV-NOTE: Atualizar status para processando
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // AIDEV-NOTE: Processar em lotes de 50 registros
    const batchSize = 50;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < importData.length; i += batchSize) {
      const batch = importData.slice(i, i + batchSize);
      
      for (const customerData of batch) {
        try {
          // AIDEV-NOTE: Inserir cliente no banco
          const { error: insertError } = await supabase
            .from('customers')
            .insert({
              ...customerData,
              tenant_id: jobData.tenant_id,
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            errorCount++;
            errors.push({
              record: customerData,
              error: insertError.message
            });
          } else {
            successCount++;
          }
        } catch (error) {
          errorCount++;
          errors.push({
            record: customerData,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
        
        processedCount++;
        
        // AIDEV-NOTE: Atualizar progresso a cada 10 registros
        if (processedCount % 10 === 0) {
          const progress = Math.round((processedCount / importData.length) * 100);
          
          await supabase
            .from('import_jobs')
            .update({
              progress,
              processed_records: processedCount,
              success_count: successCount,
              error_count: errorCount,
              errors: errors.slice(-100), // Manter apenas os últimos 100 erros
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
      }
    }

    // AIDEV-NOTE: Finalizar job
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        progress: 100,
        processed_records: processedCount,
        success_count: successCount,
        error_count: errorCount,
        errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log('✅ Job processado com sucesso:', {
      jobId,
      processedCount,
      successCount,
      errorCount
    });

  } catch (error) {
    console.error('❌ Erro no processamento do job:', error);
    
    // AIDEV-NOTE: Marcar job como falhou
    await supabase
      .from('import_jobs')
      .update({
        status: 'failed',
        errors: [{ error: error instanceof Error ? error.message : 'Erro desconhecido' }],
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}