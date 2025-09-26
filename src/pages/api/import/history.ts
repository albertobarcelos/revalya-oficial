import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Configuração do Supabase para histórico
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// AIDEV-NOTE: Interface para item do histórico
interface ImportHistoryItem {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  successCount: number;
  errorCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
}

// AIDEV-NOTE: Interface para resposta paginada
interface ImportHistoryResponse {
  items: ImportHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
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

    // AIDEV-NOTE: Parâmetros de paginação e filtros
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Máximo 100 por página
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const offset = (page - 1) * limit;

    // AIDEV-NOTE: Construir query base
    let query = supabase
      .from('import_jobs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // AIDEV-NOTE: Aplicar filtros
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // AIDEV-NOTE: Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: jobs, error: jobsError, count } = await query;

    if (jobsError) {
      console.error('❌ Erro ao buscar histórico:', jobsError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // AIDEV-NOTE: Formatar dados
    const items: ImportHistoryItem[] = (jobs || []).map(job => ({
      id: job.id,
      filename: job.filename,
      status: job.status,
      totalRecords: job.total_records,
      successCount: job.success_count || 0,
      errorCount: job.error_count || 0,
      progress: job.progress || 0,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      fileSize: job.file_size,
    }));

    // AIDEV-NOTE: Calcular informações de paginação
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: ImportHistoryResponse = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}