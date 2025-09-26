import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Configuração do Supabase para consulta de status
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AIDEV-NOTE: Interface para resposta de status
interface ImportJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors: any[];
  filename: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'ID do job é obrigatório' });
    }

    // AIDEV-NOTE: Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // AIDEV-NOTE: Obter tenant do usuário
    const { data: userTenants, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    if (tenantError || !userTenants?.length) {
      return res.status(403).json({ error: 'Usuário sem tenant associado' });
    }

    const tenantId = userTenants[0].tenant_id;

    // AIDEV-NOTE: Buscar job de importação
    const { data: jobData, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('tenant_id', tenantId) // AIDEV-NOTE: Garantir que o job pertence ao tenant do usuário
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Job não encontrado' });
      }
      console.error('❌ Erro ao buscar job:', jobError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // AIDEV-NOTE: Calcular tempo estimado restante
    let estimatedTimeRemaining: number | undefined;
    
    if (jobData.status === 'processing' && jobData.processed_records > 0) {
      const elapsedTime = new Date().getTime() - new Date(jobData.created_at).getTime();
      const recordsPerMs = jobData.processed_records / elapsedTime;
      const remainingRecords = jobData.total_records - jobData.processed_records;
      estimatedTimeRemaining = Math.round(remainingRecords / recordsPerMs);
    }

    // AIDEV-NOTE: Formatar resposta
    const response: ImportJobStatus = {
      id: jobData.id,
      status: jobData.status,
      progress: jobData.progress || 0,
      totalRecords: jobData.total_records,
      processedRecords: jobData.processed_records || 0,
      successCount: jobData.success_count || 0,
      errorCount: jobData.error_count || 0,
      errors: jobData.errors || [],
      filename: jobData.filename,
      createdAt: jobData.created_at,
      updatedAt: jobData.updated_at,
      estimatedTimeRemaining,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro ao consultar status:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}