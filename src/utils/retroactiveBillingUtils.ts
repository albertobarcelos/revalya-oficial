import { 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  setDate, 
  format,
  isAfter,
  isBefore
} from 'date-fns';

/**
 * Interface para representar um contrato
 */
export interface Contract {
  id: string;
  tenant_id: string;
  initial_date: string | Date;
  final_date?: string | Date;
  billing_day: number;
  billing_type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  monthly_value: number;
  status: string;
}

/**
 * Interface para representar um período de faturamento
 */
export interface BillingPeriod {
  contract_id: string;
  tenant_id: string;
  period_start: Date;
  period_end: Date;
  bill_date: Date;
  amount: number;
  status: 'PENDING' | 'BILLED' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DUE_TODAY';
  created_at: Date;
  metadata?: {
    is_retroactive: boolean;
    logic_version: string;
    first_period_bill_logic?: 'CURRENT_DATE' | 'CONFIGURED_DAY';
  };
}

/**
 * Parâmetros para criação de período
 */
interface CreatePeriodParams {
  contract: Contract;
  periodStart: Date;
  isFirstPeriod: boolean;
  currentDate: Date;
}

/**
 * AIDEV-NOTE: Detecta se um contrato é retroativo
 * Um contrato é considerado retroativo quando sua data inicial é anterior ao primeiro dia do mês atual
 * 
 * @param initialDate - Data inicial do contrato
 * @param currentDate - Data atual (padrão: hoje)
 * @returns true se o contrato for retroativo
 */
export function isRetroactiveContract(
  initialDate: string | Date, 
  currentDate: Date = new Date()
): boolean {
  const contractStart = typeof initialDate === 'string' ? new Date(initialDate) : initialDate;
  const currentMonthStart = startOfMonth(currentDate);
  
  return isBefore(contractStart, currentMonthStart);
}

/**
 * AIDEV-NOTE: Determina o dia de faturamento para o primeiro período
 * Nova lógica: Se dia configurado <= dia atual, usar HOJE; caso contrário, usar dia configurado
 * 
 * @param contract - Dados do contrato
 * @param periodStart - Início do período
 * @param currentDate - Data atual
 * @returns Data de faturamento do primeiro período
 */
export function getFirstPeriodBillDate(
  contract: Contract,
  periodStart: Date,
  currentDate: Date
): Date {
  const currentDay = currentDate.getDate();
  const configuredDay = contract.billing_day;
  
  // Se dia configurado <= dia atual: usar HOJE
  // Se dia configurado > dia atual: usar dia configurado no período
  if (configuredDay <= currentDay) {
    return currentDate;
  } else {
    return setDate(periodStart, configuredDay);
  }
}

/**
 * AIDEV-NOTE: Determina o fim do período baseado no tipo de faturamento
 * 
 * @param periodStart - Início do período
 * @param billingType - Tipo de faturamento
 * @returns Data de fim do período
 */
export function getFullPeriodEnd(periodStart: Date, billingType: string): Date {
  switch (billingType) {
    case 'MONTHLY':
      return endOfMonth(periodStart);
    case 'QUARTERLY':
      return endOfMonth(addMonths(periodStart, 2));
    case 'YEARLY':
      return endOfMonth(addMonths(periodStart, 11));
    default:
      return endOfMonth(periodStart);
  }
}

/**
 * AIDEV-NOTE: Adiciona intervalo de faturamento baseado no tipo
 * 
 * @param date - Data base
 * @param billingType - Tipo de faturamento
 * @returns Nova data com intervalo adicionado
 */
export function addBillingInterval(date: Date, billingType: string): Date {
  switch (billingType) {
    case 'MONTHLY':
      return addMonths(date, 1);
    case 'QUARTERLY':
      return addMonths(date, 3);
    case 'YEARLY':
      return addMonths(date, 12);
    default:
      return addMonths(date, 1);
  }
}

/**
 * AIDEV-NOTE: Obtém o mês de fim do contrato
 * 
 * @param contract - Dados do contrato
 * @returns Data do último mês do contrato
 */
export function getContractEndMonth(contract: Contract): Date {
  if (!contract.final_date) {
    // Se não há data final, assumir 12 meses a partir da data inicial
    const initialDate = typeof contract.initial_date === 'string' 
      ? new Date(contract.initial_date) 
      : contract.initial_date;
    return addMonths(initialDate, 12);
  }
  
  const finalDate = typeof contract.final_date === 'string' 
    ? new Date(contract.final_date) 
    : contract.final_date;
  
  return startOfMonth(finalDate);
}

/**
 * AIDEV-NOTE: Cria período com valor integral seguindo a nova lógica
 * 
 * @param params - Parâmetros para criação do período
 * @returns Período de faturamento criado
 */
export function createFullMonthPeriod({
  contract,
  periodStart,
  isFirstPeriod,
  currentDate
}: CreatePeriodParams): BillingPeriod {
  
  const periodEnd = getFullPeriodEnd(periodStart, contract.billing_type);
  
  // Nova lógica para o dia de faturamento do primeiro período
  const billDate = isFirstPeriod 
    ? getFirstPeriodBillDate(contract, periodStart, currentDate)
    : setDate(periodStart, contract.billing_day);
  
  return {
    contract_id: contract.id,
    tenant_id: contract.tenant_id,
    period_start: periodStart,
    period_end: periodEnd,
    bill_date: billDate,
    amount: contract.monthly_value, // Sempre valor integral
    status: 'PENDING',
    created_at: new Date(),
    metadata: {
      is_retroactive: true,
      logic_version: 'FULL_MONTH_ALWAYS_V2',
      first_period_bill_logic: isFirstPeriod 
        ? (contract.billing_day <= currentDate.getDate() ? 'CURRENT_DATE' : 'CONFIGURED_DAY')
        : undefined
    }
  };
}

/**
 * AIDEV-NOTE: Função principal para calcular períodos retroativos
 * Implementa a lógica "Mês Cheio Sempre" conforme documentação
 * 
 * @param contract - Dados do contrato
 * @param currentDate - Data atual (padrão: hoje)
 * @returns Array de períodos de faturamento
 */
export function calculateRetroactiveBillingPeriods(
  contract: Contract,
  currentDate: Date = new Date()
): BillingPeriod[] {
  
  // 1. Verificar se é contrato retroativo
  if (!isRetroactiveContract(contract.initial_date, currentDate)) {
    // Se não for retroativo, retornar array vazio ou chamar lógica normal
    return [];
  }
  
  // 2. Definir período inicial como mês atual
  const startMonth = startOfMonth(currentDate);
  const endMonth = getContractEndMonth(contract);
  
  // 3. Gerar períodos com valor integral
  const periods: BillingPeriod[] = [];
  let currentPeriod = startMonth;
  let periodIndex = 0;
  
  while (currentPeriod <= endMonth) {
    const period = createFullMonthPeriod({
      contract,
      periodStart: currentPeriod,
      isFirstPeriod: periodIndex === 0,
      currentDate
    });
    
    periods.push(period);
    currentPeriod = addBillingInterval(currentPeriod, contract.billing_type);
    periodIndex++;
  }
  
  return periods;
}

/**
 * AIDEV-NOTE: Log detalhado da aplicação da nova lógica
 * 
 * @param contract - Dados do contrato
 * @param periods - Períodos gerados
 * @param currentDate - Data atual
 */
export function logRetroactiveLogicApplication(
  contract: Contract,
  periods: BillingPeriod[],
  currentDate: Date
): void {
  
  const logData = {
    event: 'RETROACTIVE_LOGIC_APPLIED',
    contract_id: contract.id,
    tenant_id: contract.tenant_id,
    contract_start: contract.initial_date,
    contract_end: contract.final_date,
    creation_date: currentDate,
    configured_billing_day: contract.billing_day,
    current_day: currentDate.getDate(),
    first_period_bill_date_logic: contract.billing_day <= currentDate.getDate() 
      ? 'CURRENT_DATE' 
      : 'CONFIGURED_DAY',
    periods_created: periods.length,
    total_amount: periods.reduce((sum, p) => sum + p.amount, 0),
    first_bill_date: periods[0]?.bill_date,
    logic_version: 'FULL_MONTH_ALWAYS_V2',
    timestamp: new Date()
  };
  
  console.log('🔄 [RETROACTIVE BILLING] Logic Applied:', logData);
  
  // TODO: Integrar com sistema de auditoria quando disponível
  // auditService.log(logData);
}

/**
 * AIDEV-NOTE: Valida se um contrato pode usar a lógica retroativa
 * 
 * @param contract - Dados do contrato
 * @returns true se o contrato pode usar a lógica retroativa
 */
export function canApplyRetroactiveLogic(contract: Contract): boolean {
  // Verificações básicas
  if (!contract.id || !contract.tenant_id) {
    return false;
  }
  
  if (!contract.initial_date || !contract.billing_day || !contract.monthly_value) {
    return false;
  }
  
  if (contract.status !== 'ACTIVE') {
    return false;
  }
  
  // Verificar se o valor mensal é positivo
  if (contract.monthly_value <= 0) {
    return false;
  }
  
  // Verificar se o dia de faturamento é válido (1-31)
  if (contract.billing_day < 1 || contract.billing_day > 31) {
    return false;
  }
  
  return true;
}

/**
 * AIDEV-NOTE: Calcula estatísticas dos períodos retroativos
 * 
 * @param periods - Períodos gerados
 * @returns Estatísticas dos períodos
 */
export function calculateRetroactiveStats(periods: BillingPeriod[]) {
  return {
    total_periods: periods.length,
    total_amount: periods.reduce((sum, p) => sum + p.amount, 0),
    first_bill_date: periods[0]?.bill_date,
    last_bill_date: periods[periods.length - 1]?.bill_date,
    period_range: {
      start: periods[0]?.period_start,
      end: periods[periods.length - 1]?.period_end
    },
    average_amount: periods.length > 0 
      ? periods.reduce((sum, p) => sum + p.amount, 0) / periods.length 
      : 0
  };
}