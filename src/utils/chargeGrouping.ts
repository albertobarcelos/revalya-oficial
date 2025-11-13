import { format, parseISO, differenceInDays } from 'date-fns';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para grupo de cobranças vencidas por cliente
export interface CustomerOverdueGroup {
  customerId: string;
  customerName: string;
  customerCompany?: string;
  overdueCharges: Cobranca[];
  totalOverdueValue: number;
  oldestOverdueDate: string;
  daysSinceOldest: number;
}

// AIDEV-NOTE: Função para encontrar cobranças vencidas relacionadas aos clientes do grupo atual
export function findRelatedOverdueCharges(
  currentGroupCharges: Cobranca[],
  allCharges: Cobranca[]
): CustomerOverdueGroup[] {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Obter IDs únicos dos clientes do grupo atual
  const customerIds = new Set(currentGroupCharges.map(c => c.customer_id));
  
  if (customerIds.size === 0) return [];
  
  // Buscar TODAS as cobranças vencidas do mesmo cliente (sem filtro de período)
  const overdueCharges = allCharges.filter(charge => {
    const isSameCustomer = customerIds.has(charge.customer_id);
    const isOverdue = charge.data_vencimento < todayStr;
    const isPending = ['PENDING', 'OVERDUE'].includes(charge.status || '');
    
    return isSameCustomer && isOverdue && isPending;
  });
  
  if (overdueCharges.length === 0) return [];
  
  // Agrupar por cliente
  const grouped = overdueCharges.reduce((acc, charge) => {
    const customerId = charge.customer_id;
    
    if (!acc[customerId]) {
      // AIDEV-NOTE: Normalizar customers que pode vir como array ou objeto
      const customers = Array.isArray(charge.customers) 
        ? (charge.customers.length > 0 ? charge.customers[0] : null)
        : charge.customers;
      
      acc[customerId] = {
        customerId,
        customerName: customers?.name || charge.customer?.name || 'Cliente não informado',
        customerCompany: customers?.company || charge.customer?.company,
        overdueCharges: [],
        totalOverdueValue: 0,
        oldestOverdueDate: charge.data_vencimento,
        daysSinceOldest: 0
      };
    }
    
    acc[customerId].overdueCharges.push(charge);
    acc[customerId].totalOverdueValue += charge.valor || 0;
    
    // Encontrar a mais antiga
    if (charge.data_vencimento < acc[customerId].oldestOverdueDate) {
      acc[customerId].oldestOverdueDate = charge.data_vencimento;
    }
    
    return acc;
  }, {} as Record<string, CustomerOverdueGroup>);
  
  // Calcular dias desde a mais antiga e ordenar
  const result = Object.values(grouped).map(group => {
    const oldestDate = parseISO(group.oldestOverdueDate);
    const today = new Date();
    group.daysSinceOldest = differenceInDays(today, oldestDate);
    
    // Ordenar cobranças por data (mais antiga primeiro)
    group.overdueCharges.sort((a, b) => 
      a.data_vencimento.localeCompare(b.data_vencimento)
    );
    
    return group;
  });
  
  // Ordenar grupos por dias desde a mais antiga (mais antigas primeiro)
  return result.sort((a, b) => b.daysSinceOldest - a.daysSinceOldest);
}

