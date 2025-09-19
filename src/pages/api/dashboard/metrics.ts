import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { DashboardMetrics } from "@/types/database";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { requireAuth } from "@/utils/apiAuth";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: API para métricas do dashboard com isolamento de tenant
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardMetrics | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // AIDEV-NOTE: Autenticar e autorizar usuário com contexto de tenant
    const authResult = await requireAuth(req, res);
    
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || "Não autorizado" });
    }
    
    const { user, tenantContext } = authResult;
    
    // AIDEV-NOTE: Criar cliente Supabase com contexto de autenticação
    const supabase = createServerSupabaseClient<Database>({ req, res });
    
    const { startDate, endDate } = req.query;
    const start = startDate ? startOfDay(parseISO(startDate as string)) : null;
    const end = endDate ? endOfDay(parseISO(endDate as string)) : null;

    // AIDEV-NOTE: Buscar cobranças com filtro de tenant (RLS aplicado automaticamente)
    let chargesQuery = supabase
      .from("charges")
      .select("*")
      .eq("tenant_id", tenantContext!.tenantId);
      
    if (start && end) {
      chargesQuery = chargesQuery
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }
    
    const { data: charges, error: chargesError } = await chargesQuery;

    if (chargesError) {
      console.error('[Dashboard Metrics] Erro ao buscar charges:', chargesError);
      throw new Error(`Erro ao buscar cobranças: ${chargesError.message}`);
    }

    // AIDEV-NOTE: Buscar novos clientes com filtro de tenant
    let customersQuery = supabase
      .from("customers")
      .select("created_at")
      .eq("tenant_id", tenantContext!.tenantId);
      
    if (start && end) {
      customersQuery = customersQuery
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }
    
    const { data: newCustomers, error: customersError } = await customersQuery;

    if (customersError) {
      console.error('[Dashboard Metrics] Erro ao buscar customers:', customersError);
      throw new Error(`Erro ao buscar clientes: ${customersError.message}`);
    }

    // Calcular métricas
    const metrics: DashboardMetrics = {
      totalPaid: charges?.reduce((sum, charge) => 
        charge.status === "paid" ? sum + charge.valor : sum, 0) || 0,
      totalPending: charges?.reduce((sum, charge) => 
        charge.status === "pending" ? sum + charge.valor : sum, 0) || 0,
      totalOverdue: charges?.reduce((sum, charge) => 
        charge.status === "overdue" ? sum + charge.valor : sum, 0) || 0,
      totalReceivable: charges?.reduce((sum, charge) => 
        (charge.status === "pending" || charge.status === "overdue") ? sum + charge.valor : sum, 0) || 0,
      paidCount: charges?.filter(c => c.status === "paid").length || 0,
      pendingCount: charges?.filter(c => c.status === "pending").length || 0,
      overdueCount: charges?.filter(c => c.status === "overdue").length || 0,
      newCustomers: newCustomers?.length || 0,
      chargesByStatus: [
        { status: "paid", count: charges?.filter(c => c.status === "paid").length || 0 },
        { status: "pending", count: charges?.filter(c => c.status === "pending").length || 0 },
        { status: "overdue", count: charges?.filter(c => c.status === "overdue").length || 0 },
        { status: "canceled", count: charges?.filter(c => c.status === "canceled").length || 0 }
      ],
      chargesByPriority: [
        { priority: "high", count: 0 },
        { priority: "medium", count: charges?.length || 0 },
        { priority: "low", count: 0 }
      ]
    };

    return res.status(200).json(metrics);
  } catch (error) {
    console.error("[Dashboard Metrics] Erro ao buscar métricas:", error);
    
    // AIDEV-NOTE: Log de auditoria para erro na API
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      error: `Erro interno do servidor: ${errorMessage}`
    });
  }
}
