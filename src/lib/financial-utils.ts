// =====================================================
// FINANCIAL UTILITIES
// Descrição: Utilitários para cálculos, validações e formatações financeiras
// =====================================================

import { Decimal } from 'decimal.js'
import { format, addDays, addMonths, addYears, differenceInDays, differenceInMonths, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// =====================================================
// CONFIGURAÇÕES GLOBAIS
// =====================================================

// Configuração do Decimal.js para precisão financeira
Decimal.config({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  minE: -9e15,
  maxE: 9e15,
})

// =====================================================
// CONSTANTES FINANCEIRAS
// =====================================================

export const FINANCIAL_CONSTANTS = {
  // Taxas de referência (valores exemplo - devem ser atualizados via API)
  SELIC: 0.1175, // 11.75% ao ano
  CDI: 0.1165, // 11.65% ao ano
  IPCA: 0.0456, // 4.56% ao ano
  
  // Dias úteis e calendário
  DAYS_IN_YEAR: 365,
  BUSINESS_DAYS_IN_YEAR: 252,
  DAYS_IN_MONTH: 30,
  
  // Limites para validação
  MAX_INTEREST_RATE: 1000, // 1000% ao ano
  MIN_INTEREST_RATE: -100, // -100% ao ano
  MAX_AMOUNT: 999999999999.99, // ~1 trilhão
  MIN_AMOUNT: 0.01,
  
  // Precisão decimal
  CURRENCY_PRECISION: 2,
  PERCENTAGE_PRECISION: 4,
  RATE_PRECISION: 6,
} as const

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface FinancialAmount {
  value: number
  currency: string
  formatted: string
}

export interface InterestCalculation {
  principal: number
  rate: number
  time: number
  timeUnit: 'days' | 'months' | 'years'
  compounding?: 'simple' | 'compound'
  frequency?: number // Para juros compostos
}

export interface LoanPayment {
  paymentNumber: number
  paymentDate: Date
  paymentAmount: number
  principalAmount: number
  interestAmount: number
  remainingBalance: number
}

export interface AmortizationSchedule {
  payments: LoanPayment[]
  totalPayments: number
  totalInterest: number
  totalAmount: number
}

export interface CashFlowItem {
  date: Date
  amount: number
  description?: string
  type: 'inflow' | 'outflow'
}

export interface NPVCalculation {
  cashFlows: CashFlowItem[]
  discountRate: number
  npv: number
  irr?: number
  paybackPeriod?: number
}

// =====================================================
// FUNÇÕES DE FORMATAÇÃO
// =====================================================

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(
  amount: number,
  currency: string = 'BRL',
  locale: string = 'pt-BR'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: FINANCIAL_CONSTANTS.CURRENCY_PRECISION,
      maximumFractionDigits: FINANCIAL_CONSTANTS.CURRENCY_PRECISION,
    }).format(amount)
  } catch (error) {
    console.error('Erro ao formatar moeda:', error)
    return `${currency} ${amount.toFixed(FINANCIAL_CONSTANTS.CURRENCY_PRECISION)}`
  }
}

/**
 * Formata porcentagem para exibição
 */
export function formatPercentage(
  rate: number,
  precision: number = FINANCIAL_CONSTANTS.PERCENTAGE_PRECISION
): string {
  return `${(rate * 100).toFixed(precision)}%`
}

/**
 * Formata número para exibição
 */
export function formatNumber(
  value: number,
  precision: number = 2,
  locale: string = 'pt-BR'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

/**
 * Formata data para exibição
 */
export function formatDate(
  date: Date | string,
  formatString: string = 'dd/MM/yyyy',
  locale = ptBR
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) {
    throw new Error('Data inválida fornecida')
  }
  return format(dateObj, formatString, { locale })
}

// =====================================================
// FUNÇÕES DE VALIDAÇÃO
// =====================================================

/**
 * Valida se um valor é um número válido para cálculos financeiros
 */
export function validateFinancialAmount(amount: number): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount >= FINANCIAL_CONSTANTS.MIN_AMOUNT &&
    amount <= FINANCIAL_CONSTANTS.MAX_AMOUNT
  )
}

/**
 * Valida taxa de juros
 */
export function validateInterestRate(rate: number): boolean {
  return (
    typeof rate === 'number' &&
    !isNaN(rate) &&
    isFinite(rate) &&
    rate >= FINANCIAL_CONSTANTS.MIN_INTEREST_RATE &&
    rate <= FINANCIAL_CONSTANTS.MAX_INTEREST_RATE
  )
}

/**
 * Valida período de tempo
 */
export function validateTimePeriod(time: number, unit: string): boolean {
  if (typeof time !== 'number' || !isFinite(time) || time <= 0) {
    return false
  }
  
  const maxPeriods = {
    days: 36500, // ~100 anos
    months: 1200, // 100 anos
    years: 100,
  }
  
  return time <= (maxPeriods[unit as keyof typeof maxPeriods] || 100)
}

/**
 * Valida data
 */
export function validateDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return isValid(dateObj)
}

// =====================================================
// CÁLCULOS DE JUROS
// =====================================================

/**
 * Calcula juros simples
 */
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  time: number,
  timeUnit: 'days' | 'months' | 'years' = 'months'
): number {
  if (!validateFinancialAmount(principal) || !validateInterestRate(rate) || !validateTimePeriod(time, timeUnit)) {
    throw new Error('Parâmetros inválidos para cálculo de juros simples')
  }
  
  const principalDecimal = new Decimal(principal)
  const rateDecimal = new Decimal(rate)
  let timeDecimal = new Decimal(time)
  
  // Converter tempo para anos se necessário
  if (timeUnit === 'months') {
    timeDecimal = timeDecimal.div(12)
  } else if (timeUnit === 'days') {
    timeDecimal = timeDecimal.div(FINANCIAL_CONSTANTS.DAYS_IN_YEAR)
  }
  
  const interest = principalDecimal.mul(rateDecimal).mul(timeDecimal)
  return interest.toNumber()
}

/**
 * Calcula juros compostos
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  timeUnit: 'days' | 'months' | 'years' = 'months',
  frequency: number = 1 // Frequência de capitalização por ano
): number {
  if (!validateFinancialAmount(principal) || !validateInterestRate(rate) || !validateTimePeriod(time, timeUnit)) {
    throw new Error('Parâmetros inválidos para cálculo de juros compostos')
  }
  
  const principalDecimal = new Decimal(principal)
  const rateDecimal = new Decimal(rate)
  const frequencyDecimal = new Decimal(frequency)
  let timeDecimal = new Decimal(time)
  
  // Converter tempo para anos se necessário
  if (timeUnit === 'months') {
    timeDecimal = timeDecimal.div(12)
  } else if (timeUnit === 'days') {
    timeDecimal = timeDecimal.div(FINANCIAL_CONSTANTS.DAYS_IN_YEAR)
  }
  
  // Fórmula: A = P(1 + r/n)^(nt)
  const ratePerPeriod = rateDecimal.div(frequencyDecimal)
  const exponent = frequencyDecimal.mul(timeDecimal)
  const base = new Decimal(1).plus(ratePerPeriod)
  const amount = principalDecimal.mul(base.pow(exponent.toNumber()))
  
  return amount.minus(principalDecimal).toNumber()
}

/**
 * Calcula montante final com juros compostos
 */
export function calculateFutureValue(
  principal: number,
  rate: number,
  time: number,
  timeUnit: 'days' | 'months' | 'years' = 'months',
  frequency: number = 1
): number {
  const interest = calculateCompoundInterest(principal, rate, time, timeUnit, frequency)
  return principal + interest
}

/**
 * Calcula valor presente
 */
export function calculatePresentValue(
  futureValue: number,
  rate: number,
  time: number,
  timeUnit: 'days' | 'months' | 'years' = 'months'
): number {
  if (!validateFinancialAmount(futureValue) || !validateInterestRate(rate) || !validateTimePeriod(time, timeUnit)) {
    throw new Error('Parâmetros inválidos para cálculo de valor presente')
  }
  
  const futureValueDecimal = new Decimal(futureValue)
  const rateDecimal = new Decimal(rate)
  let timeDecimal = new Decimal(time)
  
  // Converter tempo para anos se necessário
  if (timeUnit === 'months') {
    timeDecimal = timeDecimal.div(12)
  } else if (timeUnit === 'days') {
    timeDecimal = timeDecimal.div(FINANCIAL_CONSTANTS.DAYS_IN_YEAR)
  }
  
  // Fórmula: PV = FV / (1 + r)^t
  const base = new Decimal(1).plus(rateDecimal)
  const divisor = base.pow(timeDecimal.toNumber())
  
  return futureValueDecimal.div(divisor).toNumber()
}

// =====================================================
// CÁLCULOS DE EMPRÉSTIMOS
// =====================================================

/**
 * Calcula pagamento mensal de empréstimo (Sistema Price)
 */
export function calculateLoanPayment(
  principal: number,
  rate: number,
  periods: number
): number {
  if (!validateFinancialAmount(principal) || !validateInterestRate(rate) || periods <= 0) {
    throw new Error('Parâmetros inválidos para cálculo de pagamento de empréstimo')
  }
  
  if (rate === 0) {
    return principal / periods
  }
  
  const principalDecimal = new Decimal(principal)
  const rateDecimal = new Decimal(rate)
  const periodsDecimal = new Decimal(periods)
  
  // Fórmula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
  const onePlusRate = new Decimal(1).plus(rateDecimal)
  const numerator = rateDecimal.mul(onePlusRate.pow(periodsDecimal.toNumber()))
  const denominator = onePlusRate.pow(periodsDecimal.toNumber()).minus(1)
  
  const payment = principalDecimal.mul(numerator.div(denominator))
  return payment.toNumber()
}

/**
 * Gera tabela de amortização (Sistema Price)
 */
export function generateAmortizationSchedule(
  principal: number,
  rate: number,
  periods: number,
  startDate: Date = new Date()
): AmortizationSchedule {
  const payment = calculateLoanPayment(principal, rate, periods)
  const payments: LoanPayment[] = []
  
  let remainingBalance = new Decimal(principal)
  let totalInterest = new Decimal(0)
  
  for (let i = 1; i <= periods; i++) {
    const interestAmount = remainingBalance.mul(rate)
    const principalAmount = new Decimal(payment).minus(interestAmount)
    
    remainingBalance = remainingBalance.minus(principalAmount)
    totalInterest = totalInterest.plus(interestAmount)
    
    // Ajustar último pagamento para zerar saldo
    if (i === periods && remainingBalance.abs().lessThan(0.01)) {
      remainingBalance = new Decimal(0)
    }
    
    payments.push({
      paymentNumber: i,
      paymentDate: addMonths(startDate, i - 1),
      paymentAmount: payment,
      principalAmount: principalAmount.toNumber(),
      interestAmount: interestAmount.toNumber(),
      remainingBalance: remainingBalance.toNumber(),
    })
  }
  
  return {
    payments,
    totalPayments: periods,
    totalInterest: totalInterest.toNumber(),
    totalAmount: principal + totalInterest.toNumber(),
  }
}

// =====================================================
// ANÁLISE DE INVESTIMENTOS
// =====================================================

/**
 * Calcula Valor Presente Líquido (VPL/NPV)
 */
export function calculateNPV(cashFlows: CashFlowItem[], discountRate: number): number {
  if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
    throw new Error('Fluxos de caixa inválidos')
  }
  
  if (!validateInterestRate(discountRate)) {
    throw new Error('Taxa de desconto inválida')
  }
  
  let npv = new Decimal(0)
  const rateDecimal = new Decimal(discountRate)
  
  // Ordenar fluxos por data
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const baseDate = sortedFlows[0].date
  
  sortedFlows.forEach((flow) => {
    const daysDiff = differenceInDays(flow.date, baseDate)
    const yearsDiff = new Decimal(daysDiff).div(FINANCIAL_CONSTANTS.DAYS_IN_YEAR)
    
    const amount = new Decimal(flow.type === 'outflow' ? -flow.amount : flow.amount)
    const discountFactor = new Decimal(1).plus(rateDecimal).pow(yearsDiff.toNumber())
    const presentValue = amount.div(discountFactor)
    
    npv = npv.plus(presentValue)
  })
  
  return npv.toNumber()
}

/**
 * Calcula Taxa Interna de Retorno (TIR/IRR) usando método de Newton-Raphson
 */
export function calculateIRR(cashFlows: CashFlowItem[], guess: number = 0.1): number | null {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
    throw new Error('Pelo menos 2 fluxos de caixa são necessários para calcular TIR')
  }
  
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const baseDate = sortedFlows[0].date
  
  // Função para calcular NPV com uma taxa específica
  const npvFunction = (rate: number): number => {
    let npv = 0
    sortedFlows.forEach((flow) => {
      const daysDiff = differenceInDays(flow.date, baseDate)
      const yearsDiff = daysDiff / FINANCIAL_CONSTANTS.DAYS_IN_YEAR
      const amount = flow.type === 'outflow' ? -flow.amount : flow.amount
      npv += amount / Math.pow(1 + rate, yearsDiff)
    })
    return npv
  }
  
  // Derivada da função NPV
  const npvDerivative = (rate: number): number => {
    let derivative = 0
    sortedFlows.forEach((flow) => {
      const daysDiff = differenceInDays(flow.date, baseDate)
      const yearsDiff = daysDiff / FINANCIAL_CONSTANTS.DAYS_IN_YEAR
      const amount = flow.type === 'outflow' ? -flow.amount : flow.amount
      derivative -= (yearsDiff * amount) / Math.pow(1 + rate, yearsDiff + 1)
    })
    return derivative
  }
  
  // Método de Newton-Raphson
  let rate = guess
  const maxIterations = 100
  const tolerance = 1e-6
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = npvFunction(rate)
    const derivative = npvDerivative(rate)
    
    if (Math.abs(derivative) < tolerance) {
      break // Evitar divisão por zero
    }
    
    const newRate = rate - npv / derivative
    
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }
    
    rate = newRate
    
    // Verificar se a taxa está em um range razoável
    if (rate < -0.99 || rate > 10) {
      return null // TIR não encontrada
    }
  }
  
  return Math.abs(npvFunction(rate)) < tolerance ? rate : null
}

/**
 * Calcula período de payback
 */
export function calculatePaybackPeriod(cashFlows: CashFlowItem[]): number | null {
  if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
    throw new Error('Fluxos de caixa inválidos')
  }
  
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  let cumulativeFlow = 0
  
  for (let i = 0; i < sortedFlows.length; i++) {
    const flow = sortedFlows[i]
    const amount = flow.type === 'outflow' ? -flow.amount : flow.amount
    cumulativeFlow += amount
    
    if (cumulativeFlow >= 0) {
      const baseDate = sortedFlows[0].date
      return differenceInDays(flow.date, baseDate) / FINANCIAL_CONSTANTS.DAYS_IN_YEAR
    }
  }
  
  return null // Payback não alcançado
}

// =====================================================
// UTILITÁRIOS DE CONVERSÃO
// =====================================================

/**
 * Converte taxa anual para mensal
 */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1/12) - 1
}

/**
 * Converte taxa mensal para anual
 */
export function monthlyToAnnualRate(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1
}

/**
 * Converte taxa anual para diária
 */
export function annualToDailyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1/FINANCIAL_CONSTANTS.DAYS_IN_YEAR) - 1
}

/**
 * Converte taxa diária para anual
 */
export function dailyToAnnualRate(dailyRate: number): number {
  return Math.pow(1 + dailyRate, FINANCIAL_CONSTANTS.DAYS_IN_YEAR) - 1
}

// =====================================================
// UTILITÁRIOS DE DATA
// =====================================================

/**
 * Calcula próxima data útil
 */
export function getNextBusinessDay(date: Date): Date {
  let nextDay = addDays(date, 1)
  
  // Pular fins de semana (sábado = 6, domingo = 0)
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay = addDays(nextDay, 1)
  }
  
  return nextDay
}

/**
 * Calcula número de dias úteis entre duas datas
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    currentDate = addDays(currentDate, 1)
  }
  
  return count
}

/**
 * Gera datas de vencimento mensais
 */
export function generateMonthlyDueDates(
  startDate: Date,
  numberOfPayments: number,
  dayOfMonth?: number
): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(startDate)
  
  if (dayOfMonth) {
    currentDate.setDate(dayOfMonth)
  }
  
  for (let i = 0; i < numberOfPayments; i++) {
    dates.push(new Date(currentDate))
    currentDate = addMonths(currentDate, 1)
  }
  
  return dates
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export default {
  // Constantes
  FINANCIAL_CONSTANTS,
  
  // Formatação
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  
  // Validação
  validateFinancialAmount,
  validateInterestRate,
  validateTimePeriod,
  validateDate,
  
  // Cálculos de juros
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateFutureValue,
  calculatePresentValue,
  
  // Empréstimos
  calculateLoanPayment,
  generateAmortizationSchedule,
  
  // Análise de investimentos
  calculateNPV,
  calculateIRR,
  calculatePaybackPeriod,
  
  // Conversões
  annualToMonthlyRate,
  monthlyToAnnualRate,
  annualToDailyRate,
  dailyToAnnualRate,
  
  // Utilitários de data
  getNextBusinessDay,
  getBusinessDaysBetween,
  generateMonthlyDueDates,
}
