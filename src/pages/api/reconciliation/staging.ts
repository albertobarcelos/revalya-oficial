import { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from '@supabase/ssr';
import { requireAuth } from "@/utils/apiAuth";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: Endpoint para buscar dados da tabela conciliation_staging
// Implementa filtros, paginação e ordenação para a tela de conciliação

interface StagingFilters {
  origem?: string;
  status_conciliacao?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

interface StagingQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: StagingFilters;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Autenticação e autorização
    const authResult = await requireAuth(req, res);
    if (!authResult.success) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tenantId } = authResult;

    // Criar cliente Supabase
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return req.cookies[name];
          },
          set: () => {},
          remove: () => {},
        },
      }
    );

    // Parse dos parâmetros de query
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc',
      filters = {}
    } = req.query as any;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // AIDEV-NOTE: Buscar dados da tabela conciliation_staging com filtros
    let query = supabase
      .from('conciliation_staging')
      .select(`
        id,
        origem,
        id_externo,
        valor_cobranca,
        valor_pago,
        status_externo,
        status_conciliacao,
        contrato_id,
        cobranca_id,
        juros_multa_diferenca,
        data_vencimento,
        data_pagamento,
        observacao,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);

    // AIDEV-NOTE: Aplicar filtros se fornecidos
    if (filters.origem) {
      query = query.eq('origem', filters.origem);
    }

    if (filters.status_conciliacao) {
      query = query.eq('status_conciliacao', filters.status_conciliacao);
    }

    if (filters.data_inicio) {
      query = query.gte('data_vencimento', filters.data_inicio);
    }

    if (filters.data_fim) {
      query = query.lte('data_vencimento', filters.data_fim);
    }

    if (filters.valor_min) {
      query = query.gte('valor_pago', parseFloat(filters.valor_min));
    }

    if (filters.valor_max) {
      query = query.lte('valor_pago', parseFloat(filters.valor_max));
    }

    // Aplicar ordenação e paginação
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar dados de conciliação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Calcular metadados de paginação
    const totalPages = Math.ceil((count || 0) / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPreviousPage = parseInt(page) > 1;

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });

  } catch (error) {
    console.error('Erro no endpoint de conciliação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}