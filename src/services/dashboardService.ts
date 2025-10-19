import { supabase } from '@/lib/supabase';
import { format, subMonths, differenceInDays, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardMetrics, CashFlowProjection, RevenueTrendItem } from "@/types/models/dashboard";
import { DateRange } from "react-day-picker";

// Função auxiliar para obter fator mensal a partir do tipo de faturamento
function getMonthlyFactorFromBillingType(billingType: string): number {
  switch (billingType) {
    case 'Mensal':
      return 1; // 1 cobrança por mês
    case 'Trimestral':
      return 0.33; // 1 cobrança a cada 3 meses
    case 'Semestral':
      return 0.167; // 1 cobrança a cada 6 meses
    case 'Anual':
      return 0.0833; // 1 cobrança a cada 12 meses
    case 'Único':
      return 0; // Pagamento único, não recorrente
    default:
      return 0;
  }
}

export const dashboardService = {
  async getDashboardMetrics(tenantId: string, dateRange?: DateRange): Promise<DashboardMetrics> {
    try {
      console.log(`[AUDIT] getDashboardMetrics - Tenant: ${tenantId}`);
      
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para getDashboardMetrics');
      }

      // Otimização: Formatar datas uma única vez
      const startDate = dateRange?.from ? format(startOfDay(dateRange.from), 'yyyy-MM-dd') : null;
      const endDate = dateRange?.to ? format(endOfDay(dateRange.to), 'yyyy-MM-dd') : null;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Data de início para dados de tendência (um ano completo para garantir cobertura adequada)
      const startOfCurrentYear = format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd');
      
      // Forçamos o ano para 2025 se o sistema não estiver no ano correto
      const currentYear = new Date().getFullYear();
      
      // Verificar se o ano do sistema está correto (2025)
      if (currentYear !== 2025) {
        console.warn(`Aviso: O ano atual no sistema é ${currentYear}, mas o ano correto é 2025.`);
      }
      
      // Data de início para buscar dados históricos (6 meses atrás)
      const sixMonthsAgoDate = subMonths(new Date(), 6);
      const sixMonthsAgo = format(sixMonthsAgoDate, 'yyyy-MM-dd');
      
      console.log(`Buscando dados a partir de ${sixMonthsAgo} (6 meses atrás)`);

      // Inicializar métricas com valores padrão
      const metrics: DashboardMetrics = {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalReceivable: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        newCustomers: 0,
        newCustomersList: [],
        mrrTotal: 0,
        mrcTotal: 0,
        netMonthlyValue: 0,
        mrrGrowth: 0,
        avgTicket: 0,
        avgDaysToReceive: 0,
        revenueByMonth: [],
        revenueByDueDate: [],
        overdueByTime: [
          { period: "1-15", amount: 0, count: 0 },
          { period: "16-30", amount: 0, count: 0 },
          { period: "31-60", amount: 0, count: 0 },
          { period: "60+", amount: 0, count: 0 }
        ],
        chargesByStatus: [
          { status: "RECEIVED", count: 0, amount: 0, charges: [] },
          { status: "PENDING", count: 0, amount: 0, charges: [] },
          { status: "OVERDUE", count: 0, amount: 0, charges: [] },
          { status: "CONFIRMED", count: 0, amount: 0, charges: [] }
        ],
        chargesByPriority: [
          { priority: "high", count: 0, amount: 0 },
          { priority: "medium", count: 0, amount: 0 },
          { priority: "low", count: 0, amount: 0 }
        ],
        chargesByPaymentMethod: [
          { method: "pix", count: 0, amount: 0 },
          { method: "boleto", count: 0, amount: 0 },
          { method: "cartao", count: 0, amount: 0 },
          { method: "outro", count: 0, amount: 0 }
        ]
      };

      // Executar consultas em paralelo para melhor performance
      const [
        chargesResult, 
        customersCountResult, 
        newCustomersListResult,
        contractsResult,
        historicalChargesResult
      ] = await Promise.all([
        // 1. Buscar cobranças com dados do cliente
        supabase
          .from("charges")
          .select(`
            id,
            valor,
            status,
            data_vencimento,
            data_pagamento,
            created_at,
            tipo,
            customer_id,
            tenant_id
          `)
          .eq('tenant_id', tenantId)
          .order('data_vencimento', { ascending: false })
          .gte('data_vencimento', startDate || '1970-01-01')
          .lte('data_vencimento', endDate || today),
          
        // 2. Contar novos clientes
        supabase
          .from("customers")
          .select("created_at", { count: "exact" })
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate || '1970-01-01')
          .lte('created_at', endDate || today),
          
        // 3. Buscar lista de novos clientes
        supabase
          .from("customers")
          .select("*")
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate || '1970-01-01')
          .lte('created_at', endDate || today)
          .order('created_at', { ascending: false }),
          
        // 4. Buscar contratos ativos para calcular o MRR e MRC
        supabase
          .from('contracts')
          .select(`
            id, total_amount, billing_type, installments,
            services:contract_services(total_amount),
            tenant_id
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'ACTIVE'),
          
        // 5. Buscar dados históricos para tendências (últimos 6 meses)
        supabase
          .from("charges")
          .select(`
            id,
            valor,
            status,
            data_pagamento,
            data_vencimento,
            tenant_id
          `)
          .eq('tenant_id', tenantId)
          .gte('data_vencimento', sixMonthsAgo)
          .order('data_vencimento', { ascending: true })
      ]);

      // Verificar e processar resultados
      if (chargesResult.error) throw chargesResult.error;
      if (customersCountResult.error) throw customersCountResult.error;
      if (newCustomersListResult.error) throw newCustomersListResult.error;
      if (contractsResult.error) throw contractsResult.error;
      if (historicalChargesResult.error) throw historicalChargesResult.error;

      // Validação de segurança - verificar se todos os dados pertencem ao tenant correto
      const invalidCharges = chargesResult.data?.filter(c => c.tenant_id !== tenantId);
      if (invalidCharges?.length > 0) {
        throw new Error('Violação de segurança: charges de tenant incorreto detectadas');
      }

      const invalidCustomers = newCustomersListResult.data?.filter(c => c.tenant_id !== tenantId);
      if (invalidCustomers?.length > 0) {
        throw new Error('Violação de segurança: customers de tenant incorreto detectados');
      }

      const invalidContracts = contractsResult.data?.filter(c => c.tenant_id !== tenantId);
      if (invalidContracts?.length > 0) {
        throw new Error('Violação de segurança: contracts de tenant incorreto detectados');
      }

      const invalidHistoricalCharges = historicalChargesResult.data?.filter(c => c.tenant_id !== tenantId);
      if (invalidHistoricalCharges?.length > 0) {
        throw new Error('Violação de segurança: historical charges de tenant incorreto detectadas');
      }

      // Atualizar métricas com dados dos clientes
      metrics.newCustomers = customersCountResult.count || 0;
      metrics.newCustomersList = newCustomersListResult.data || [];
      
      // Agora vamos calcular o MRR e o MRC com base em contratos
      const contracts = contractsResult.data || [];
      let mrrTotal = 0;
      const mrcTotal = 0;

      // Calcular MRR baseado nos contratos ativos
      contracts.forEach(contract => {
        const monthlyFactor = getMonthlyFactorFromBillingType(contract.billing_type);
        if (monthlyFactor > 0) {
          // Cálculo mensalizado do valor do contrato
          const monthlyValue = (contract.total_amount / contract.installments) * monthlyFactor;
          mrrTotal += monthlyValue;
        }
      });

      metrics.mrrTotal = mrrTotal;
      metrics.mrcTotal = mrcTotal;
      metrics.netMonthlyValue = mrrTotal - mrcTotal;
      
      // Processar cobranças de forma mais eficiente
      const charges = chargesResult.data || [];
      const statusMap: Record<string, number> = {
        "RECEIVED": 0,
        "RECEIVED_IN_CASH": 0,
        "PENDING": 1,
        "OVERDUE": 2,
        "CONFIRMED": 3
      };
      
      // Variáveis para cálculos de médias
      let totalTicketValue = 0;
      let totalTicketCount = 0;
      let totalDaysToReceive = 0;
      let countForDaysToReceive = 0;

      console.log('🔍 [DEBUG] dashboardService - Total de cobranças carregadas:', charges.length);
      console.log('🔍 [DEBUG] dashboardService - Data de hoje para comparação:', today);
      
      let overdueDebugCount = 0;
      let pendingDebugCount = 0;
      
      charges.forEach((charge, index) => {
        const valor = charge.valor || 0;
        const status = charge.status || "";
        const prioridade = "medium"; // Default priority since column doesn't exist
        
        // Verificar se é uma cobrança vencida (PENDING + data_vencimento < hoje)
        const isOverdue = status === "PENDING" && charge.data_vencimento < today;
        const effectiveStatus = isOverdue ? "OVERDUE" : status;
        
        // Debug detalhado para cobranças vencidas
        if (status === "PENDING") {
          pendingDebugCount++;
          console.log(`🔍 [DEBUG] Cobrança PENDING ${index + 1}:`, {
            id: charge.id,
            status: charge.status,
            data_vencimento: charge.data_vencimento,
            valor: charge.valor,
            isOverdue,
            effectiveStatus
          });
        }
        
        if (isOverdue) {
          overdueDebugCount++;
          console.log(`🔍 [DEBUG] Cobrança VENCIDA ${overdueDebugCount}:`, {
            id: charge.id,
            status: charge.status,
            data_vencimento: charge.data_vencimento,
            valor: charge.valor,
            daysSinceOverdue: differenceInDays(new Date(), parseISO(charge.data_vencimento))
          });
        }
        
        // Determinar método de pagamento
        let paymentMethod = "outro";
        if (charge.tipo) {
          const tipo = charge.tipo.toLowerCase();
          if (tipo.includes('pix')) paymentMethod = "pix";
          else if (tipo.includes('boleto')) paymentMethod = "boleto";
          else if (tipo.includes('cartao') || tipo.includes('cartão') || tipo.includes('card')) paymentMethod = "cartao";
        }
        
        // Incrementar contagens e valores por status
        if (effectiveStatus === "RECEIVED" || effectiveStatus === "CONFIRMED") {
          metrics.totalPaid += valor;
          metrics.paidCount++;
          
          // Calcular dias até receber
          if (charge.data_pagamento && charge.data_vencimento) {
            const daysToReceive = differenceInDays(
              parseISO(charge.data_pagamento), 
              parseISO(charge.data_vencimento)
            );
            totalDaysToReceive += daysToReceive;
            countForDaysToReceive++;
          }
          
          // Para ticket médio, contamos apenas pagos e confirmados
          totalTicketValue += valor;
          totalTicketCount++;
        } else if (effectiveStatus === "PENDING") {
          metrics.totalPending += valor;
          metrics.pendingCount++;
        }
        
        if (isOverdue) {
          metrics.totalOverdue += valor;
          metrics.overdueCount++;
          
          // Categorizar por faixa de atraso
          const daysSinceOverdue = differenceInDays(new Date(), parseISO(charge.data_vencimento));
          if (daysSinceOverdue <= 15) {
            metrics.overdueByTime[0].amount += valor;
            metrics.overdueByTime[0].count++;
          } else if (daysSinceOverdue <= 30) {
            metrics.overdueByTime[1].amount += valor;
            metrics.overdueByTime[1].count++;
          } else if (daysSinceOverdue <= 60) {
            metrics.overdueByTime[2].amount += valor;
            metrics.overdueByTime[2].count++;
          } else {
            metrics.overdueByTime[3].amount += valor;
            metrics.overdueByTime[3].count++;
          }
        }
        
        // Incrementar contagens por método de pagamento
        const methodIndex = metrics.chargesByPaymentMethod.findIndex(m => m.method === paymentMethod);
        if (methodIndex >= 0) {
          metrics.chargesByPaymentMethod[methodIndex].count++;
          metrics.chargesByPaymentMethod[methodIndex].amount += valor;
        }
        
        // Incrementar contagens por prioridade
        const priorityIndex = metrics.chargesByPriority.findIndex(p => p.priority === prioridade);
        if (priorityIndex >= 0) {
          metrics.chargesByPriority[priorityIndex].count++;
          metrics.chargesByPriority[priorityIndex].amount += valor;
        }
        
        // Adicionar cobrança ao grupo por status
        const statusIndex = statusMap[effectiveStatus];
        if (statusIndex !== undefined) {
          metrics.chargesByStatus[statusIndex].count++;
          metrics.chargesByStatus[statusIndex].amount += valor;
          metrics.chargesByStatus[statusIndex].charges.push(charge);
        }
      });
      
      // Debug final dos totais calculados
      console.log('🔍 [DEBUG] dashboardService - Totais finais calculados:', {
        totalPending: metrics.pendingCount,
        totalOverdue: metrics.overdueCount,
        pendingDebugCount,
        overdueDebugCount,
        chargesByStatus: metrics.chargesByStatus.map(s => ({ status: s.status, count: s.count, amount: s.amount }))
      });
      
      console.log('🔍 [DEBUG] dashboardService - Cobranças OVERDUE encontradas:', 
        metrics.chargesByStatus.find(s => s.status === 'OVERDUE')?.charges?.map(c => ({
          id: c.id,
          status: c.status,
          data_vencimento: c.data_vencimento,
          valor: c.valor
        })) || []
      );
      
      // Calcular ticket médio
      metrics.avgTicket = totalTicketCount > 0 ? totalTicketValue / totalTicketCount : 0;
      
      // Calcular média de dias para receber
      metrics.avgDaysToReceive = countForDaysToReceive > 0 ? totalDaysToReceive / countForDaysToReceive : 0;
      
      // Calcular receita total a receber
      metrics.totalReceivable = metrics.totalPending + metrics.totalOverdue;
      
      // Processar dados históricos para tendências
      const historicalCharges = historicalChargesResult.data || [];
      
      // 1. RECEITA POR PAGAMENTO (pago efetivamente)
      const revenueByMonth: Record<string, number> = {};
      
      // Filtrar apenas cobranças PAGAS (status RECEIVED, RECEIVED_IN_CASH ou CONFIRMED)
      const paidCharges = historicalCharges.filter(charge => 
        (charge.status === "RECEIVED" || charge.status === "CONFIRMED") 
        && charge.data_pagamento // Garantir que tem data de pagamento
      );
      
      // Agrupar por mês de PAGAMENTO (não de vencimento)
      paidCharges.forEach(charge => {
        if (charge.data_pagamento) {
          const paymentDate = parseISO(charge.data_pagamento);
          const month = format(paymentDate, 'MMM/yyyy', { locale: ptBR });
          revenueByMonth[month] = (revenueByMonth[month] || 0) + (charge.valor || 0);
        }
      });
      
      // 2. RECEITA POR VENCIMENTO (quando deveria ser pago)
      const revenueByDueDate: Record<string, number> = {};
      
      // Considerar TODAS as cobranças com data de vencimento, independente do status
      historicalCharges.forEach(charge => {
        if (charge.data_vencimento) {
          const dueDate = parseISO(charge.data_vencimento);
          const month = format(dueDate, 'MMM/yyyy', { locale: ptBR });
          revenueByDueDate[month] = (revenueByDueDate[month] || 0) + (charge.valor || 0);
        }
      });
      
      // Converter dados para o formato esperado
      metrics.revenueByMonth = Object.entries(revenueByMonth).map(([month, revenue]) => ({
        month,
        revenue
      }));
      
      metrics.revenueByDueDate = Object.entries(revenueByDueDate).map(([month, revenue]) => ({
        month,
        revenue
      }));
      
      return metrics;
    } catch (error) {
      console.error('Erro ao buscar métricas do dashboard:', error);
      throw error;
    }
  },

  async getCashFlowProjection(tenantId: string, nextDays: number = 30): Promise<CashFlowProjection[]> {
    try {
      console.log(`[AUDIT] getCashFlowProjection - Tenant: ${tenantId}`);
      
      if (!tenantId) {
        throw new Error('tenant_id é obrigatório para getCashFlowProjection');
      }

      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + nextDays);
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      // Buscamos cobranças relevantes: PENDING (a receber) e CONFIRMED (confirmadas)
      const { data, error } = await supabase
        .from("charges")
        .select(`
          valor,
          data_vencimento,
          status,
          tenant_id
        `)
        .eq('tenant_id', tenantId)
        .lte('data_vencimento', endDateStr)
        .in('status', ['PENDING', 'CONFIRMED']) // Apenas cobranças pendentes ou confirmadas
        .order('data_vencimento', { ascending: true });
        
      if (error) throw error;
      
      // Validação de segurança
      const invalidData = data?.filter(c => c.tenant_id !== tenantId);
      if (invalidData?.length > 0) {
        throw new Error('Violação de segurança: cash flow data de tenant incorreto detectada');
      }
      
      const cashFlow: Record<string, CashFlowProjection> = {};
      
      // Inicializar dias
      for (let i = 0; i <= nextDays; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        cashFlow[dateStr] = {
          date: format(date, 'dd/MM/yyyy'),
          inflow: 0,
          outflow: 0,
          balance: 0
        };
      }
      
      // Processar cobranças
      data?.forEach(charge => {
        if (charge.data_vencimento && cashFlow[charge.data_vencimento]) {
          // Soma o valor como entrada (inflow)
          cashFlow[charge.data_vencimento].inflow += Number(charge.valor || 0);
        }
      });
      
      // Calcular saldo acumulado
      let balance = 0;
      Object.keys(cashFlow).sort().forEach(date => {
        balance += cashFlow[date].inflow - cashFlow[date].outflow;
        cashFlow[date].balance = Number(balance.toFixed(2));
      });
      
      return Object.values(cashFlow);
    } catch (error) {
      console.error("Erro ao buscar projeção de fluxo de caixa:", error);
      throw error;
    }
  },

  async exportMetrics(tenantId: string, dateRange?: DateRange): Promise<Blob> {
    console.log(`[AUDIT] exportMetrics - Tenant: ${tenantId}`);
    
    if (!tenantId) {
      throw new Error('tenant_id é obrigatório para exportMetrics');
    }

    const metrics = await this.getDashboardMetrics(tenantId, dateRange);

    const csvContent = [
      "Métricas Financeiras",
      `Período: ${dateRange?.from?.toLocaleDateString()} a ${dateRange?.to?.toLocaleDateString()}`,
      "",
      "Métrica,Valor",
      `Valor total recebido,${metrics.totalPaid}`,
      `Valor total pendente,${metrics.totalPending}`,
      `Valor total vencido,${metrics.totalOverdue}`,
      `Quantidade de cobranças recebidas,${metrics.paidCount}`,
      `Quantidade de cobranças pendentes,${metrics.pendingCount}`,
      `Quantidade de cobranças vencidas,${metrics.overdueCount}`,
      `MRR (Receita Mensal Recorrente),${metrics.mrrTotal}`,
      `MRC (Custo Mensal Recorrente),${metrics.mrcTotal}`,
      `Valor líquido mensal,${metrics.netMonthlyValue}`,
      `Crescimento de MRR (%),${metrics.mrrGrowth}`,
      `Ticket médio,${metrics.avgTicket}`,
      `Média de dias para receber,${metrics.avgDaysToReceive}`,
      `Novos clientes,${metrics.newCustomers}`,
      "",
      "Receita mensal",
      "Mês,Valor",
      ...metrics.revenueByMonth.map(item => `${item.month},${item.revenue}`),
      "",
      "Inadimplência por tempo",
      "Período (dias),Valor,Quantidade",
      ...metrics.overdueByTime.map(item => `${item.period},${item.amount},${item.count}`),
      "",
      "Cobranças por método de pagamento",
      "Método,Valor,Quantidade",
      ...metrics.chargesByPaymentMethod.map(item => `${item.method},${item.amount},${item.count}`),
    ].join("\n");

    return new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  }
};
