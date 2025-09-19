import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { startOfDay, endOfDay, parseISO, format } from "date-fns";
import { stringify } from "csv-stringify/sync";
import { requireAuth } from "@/utils/apiAuth";
import type { Database } from '@/types/supabase';

// AIDEV-NOTE: API para exportação de métricas com isolamento de tenant
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    let query = supabase.from("charges").select(`
      *,
      customers (
        name,
        email,
        cpf_cnpj
      )
    `).eq("tenant_id", tenantContext!.tenantId);
    
    if (start && end) {
      query = query.gte("data_criacao", start.toISOString())
        .lte("data_criacao", end.toISOString());
    }
    
    const { data: charges, error: chargesError } = await query;

    if (chargesError) {
      console.error('[Metrics Export] Erro ao buscar charges:', chargesError);
      throw new Error(`Erro ao buscar cobranças: ${chargesError.message}`);
    }

    // Preparar dados para CSV
    const csvData = charges?.map(charge => ({
      ID: charge.id,
      Cliente: charge.customers?.name,
      Email: charge.customers?.email,
      CPF_CNPJ: charge.customers?.cpf_cnpj,
      Valor: charge.valor,
      Status: charge.status,
      Prioridade: "medium", // Default since column doesn't exist
      Data_Criacao: format(new Date(charge.data_criacao), "dd/MM/yyyy"),
      Data_Vencimento: charge.data_vencimento.split('-').reverse().join('/'),
      Data_Pagamento: charge.data_pagamento ? format(new Date(charge.data_pagamento), "dd/MM/yyyy") : "",
    })) || [];

    // Gerar CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        "ID",
        "Cliente",
        "Email",
        "CPF_CNPJ",
        "Valor",
        "Status",
        "Prioridade",
        "Data_Criacao",
        "Data_Vencimento",
        "Data_Pagamento",
      ],
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=metricas-${format(start || new Date(), "yyyy-MM-dd")}-${format(
        end || new Date(),
        "yyyy-MM-dd"
      )}.csv`
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("[Dashboard Export] Erro ao exportar métricas:", error);
    
    // AIDEV-NOTE: Log de auditoria para erro na API
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      error: `Erro interno do servidor: ${errorMessage}`
    });
  }
}
