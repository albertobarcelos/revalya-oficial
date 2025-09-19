import { Customer } from "./customer";

export interface DashboardMetrics {
  // Valores gerais
  totalReceivable: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  
  // Counts
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  
  // Métricas financeiras
  mrrTotal: number;
  mrcTotal: number;
  netMonthlyValue: number; // Campo agora obrigatório (MRR - MRC)
  mrrGrowth: number;
  avgTicket: number;
  avgDaysToReceive: number;
  
  // Clientes
  newCustomers: number;
  newCustomersList: any[];
  
  // Dados para gráficos e análises
  revenueByMonth: RevenueTrendItem[]; // Receita por pagamentos recebidos
  revenueByDueDate: RevenueTrendItem[]; // Receita por data de vencimento
  overdueByTime: OverdueByTimeItem[];
  chargesByPaymentMethod: PaymentMethodItem[];
  chargesByStatus: ChargesByStatusItem[];
  chargesByPriority: ChargesByPriorityItem[];
}

export interface RevenueTrendItem {
  month: string;
  revenue: number;
  year: number;
  monthYear: string;
  dueRevenue?: number; // Valor por vencimento (opcional)
}

export interface OverdueByTimeItem {
  period: string;
  amount: number;
  count: number;
}

export interface PaymentMethodItem {
  method: string;
  count: number;
  amount: number;
}

export interface ChargesByStatusItem {
  status: string;
  charges: any[];
  count: number;
  amount: number;
}

export interface ChargesByPriorityItem {
  priority: string;
  count: number;
  amount: number;
}

export interface CashFlowProjection {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}
