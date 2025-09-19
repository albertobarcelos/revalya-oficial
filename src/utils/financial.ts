import { format, parseISO, isValid, differenceInDays, addDays, addMonths, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  Currency,
  Locale,
  FinancialCalculationInput,
  FinancialCalculationResult,
  CalculationType,
  ValidationRule,
  ValidationResult
} from '../types/financial';

// Constantes financeiras
export const FINANCIAL_CONSTANTS = {
  DAYS_IN_YEAR: 365,
  MONTHS_IN_YEAR: 12,
  WEEKS_IN_YEAR: 52,
  BUSINESS_DAYS_IN_YEAR: 252,
  DEFAULT_PRECISION: 2,
  MAX_PRECISION: 8,
  MIN_INTEREST_RATE: 0,
  MAX_INTEREST_RATE: 100,
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999999.99
};

// Configurações de moeda
export const CURRENCY_CONFIG: Record<Currency, {
  symbol: string;
  code: string;
  decimals: number;
  locale: string;
}> = {
  BRL: { symbol: 'R$', code: 'BRL', decimals: 2, locale: 'pt-BR' },
  USD: { symbol: '$', code: 'USD', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', decimals: 2, locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', decimals: 2, locale: 'en-GB' },
  JPY: { symbol: '¥', code: 'JPY', decimals: 0, locale: 'ja-JP' }
};

// Funções de formatação
export const formatCurrency = (
  amount: number,
  currency: Currency = 'BRL',
  locale?: Locale
): string => {
  const config = CURRENCY_CONFIG[currency];
  const targetLocale = locale || config.locale;
  
  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    }).format(amount);
  } catch (error) {
    // Fallback para formato brasileiro
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }
};

export const formatNumber = (
  value: number,
  decimals: number = 2,
  locale: Locale = 'pt-BR'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (error) {
    return value.toFixed(decimals);
  }
};

export const formatPercentage = (
  value: number,
  decimals: number = 2,
  locale: Locale = 'pt-BR'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  } catch (error) {
    return `${value.toFixed(decimals)}%`;
  }
};

export const formatDate = (
  date: string | Date,
  formatString: string = 'dd/MM/yyyy',
  locale: Locale = 'pt-BR'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      throw new Error('Data inválida');
    }
    
    const localeObj = locale === 'pt-BR' ? ptBR : undefined;
    return format(dateObj, formatString, { locale: localeObj });
  } catch (error) {
    return 'Data inválida';
  }
};

export const formatDocument = (document: string, type: 'CPF' | 'CNPJ' = 'CPF'): string => {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (type === 'CPF' && cleanDoc.length === 11) {
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  if (type === 'CNPJ' && cleanDoc.length === 14) {
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return document;
};

export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// Funções de parsing
export const parseCurrency = (value: string, currency: Currency = 'BRL'): number => {
  const config = CURRENCY_CONFIG[currency];
  
  // Remove símbolos de moeda e espaços
  let cleanValue = value
    .replace(new RegExp(`\\${config.symbol}`, 'g'), '')
    .replace(/\s/g, '')
    .trim();
  
  // Trata separadores decimais
  if (currency === 'BRL') {
    // Para BRL: 1.234,56 -> 1234.56
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } else {
    // Para outras moedas: 1,234.56 -> 1234.56
    const lastComma = cleanValue.lastIndexOf(',');
    const lastDot = cleanValue.lastIndexOf('.');
    
    if (lastDot > lastComma) {
      // Dot é decimal
      cleanValue = cleanValue.replace(/,/g, '');
    } else if (lastComma > lastDot) {
      // Comma é decimal
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    }
  }
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const parsePercentage = (value: string): number => {
  const cleanValue = value.replace('%', '').replace(',', '.').trim();
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

// Funções de validação
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cleanCPF.charAt(10));
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return digit2 === parseInt(cleanCNPJ.charAt(13));
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

export const validateData = (data: Record<string, any>, rules: ValidationRule[]): ValidationResult => {
  const errors: { field: string; message: string }[] = [];
  
  for (const rule of rules) {
    const value = data[rule.field];
    
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'email':
        if (value && !validateEmail(value)) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'phone':
        if (value && !validatePhone(value)) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'cpf':
        if (value && !validateCPF(value)) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'cnpj':
        if (value && !validateCNPJ(value)) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'min':
        if (value !== undefined && value < rule.value) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'max':
        if (value !== undefined && value > rule.value) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
        
      case 'pattern':
        if (value && !new RegExp(rule.value).test(value)) {
          errors.push({ field: rule.field, message: rule.message });
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Funções de cálculo financeiro
export const calculateSimpleInterest = (
  principal: number,
  rate: number,
  time: number
): FinancialCalculationResult => {
  const interest = principal * (rate / 100) * time;
  const total = principal + interest;
  
  return {
    value: total,
    formula: 'M = P * (1 + i * t)',
    breakdown: {
      principal,
      rate,
      time,
      interest,
      total
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): FinancialCalculationResult => {
  const amount = principal * Math.pow(1 + (rate / 100) / compoundingFrequency, compoundingFrequency * time);
  const interest = amount - principal;
  
  return {
    value: amount,
    formula: 'M = P * (1 + i/n)^(n*t)',
    breakdown: {
      principal,
      rate,
      time,
      compoundingFrequency,
      interest,
      amount
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

export const calculateLoanPayment = (
  principal: number,
  rate: number,
  periods: number
): FinancialCalculationResult => {
  const monthlyRate = rate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / (Math.pow(1 + monthlyRate, periods) - 1);
  const totalPaid = payment * periods;
  const totalInterest = totalPaid - principal;
  
  return {
    value: payment,
    formula: 'PMT = P * [r(1+r)^n] / [(1+r)^n - 1]',
    breakdown: {
      principal,
      rate,
      periods,
      monthlyRate,
      payment,
      totalPaid,
      totalInterest
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

export const calculateNPV = (
  initialInvestment: number,
  cashFlows: number[],
  discountRate: number
): FinancialCalculationResult => {
  let npv = -initialInvestment;
  
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + discountRate / 100, i + 1);
  }
  
  return {
    value: npv,
    formula: 'NPV = -I₀ + Σ(CFₜ / (1+r)ᵗ)',
    breakdown: {
      initialInvestment,
      cashFlows,
      discountRate,
      npv,
      isPositive: npv > 0
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

export const calculateIRR = (
  initialInvestment: number,
  cashFlows: number[],
  maxIterations: number = 100,
  tolerance: number = 0.0001
): FinancialCalculationResult => {
  let rate = 0.1; // Taxa inicial de 10%
  let iteration = 0;
  
  while (iteration < maxIterations) {
    let npv = -initialInvestment;
    let derivative = 0;
    
    for (let i = 0; i < cashFlows.length; i++) {
      const period = i + 1;
      const discountFactor = Math.pow(1 + rate, period);
      npv += cashFlows[i] / discountFactor;
      derivative -= (period * cashFlows[i]) / Math.pow(1 + rate, period + 1);
    }
    
    if (Math.abs(npv) < tolerance) {
      break;
    }
    
    rate = rate - npv / derivative;
    iteration++;
  }
  
  return {
    value: rate * 100,
    formula: 'IRR: NPV = 0 = -I₀ + Σ(CFₜ / (1+IRR)ᵗ)',
    breakdown: {
      initialInvestment,
      cashFlows,
      irr: rate * 100,
      iterations: iteration,
      converged: iteration < maxIterations
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

export const calculatePaybackPeriod = (
  initialInvestment: number,
  cashFlows: number[]
): FinancialCalculationResult => {
  let cumulativeCashFlow = 0;
  let paybackPeriod = 0;
  
  for (let i = 0; i < cashFlows.length; i++) {
    cumulativeCashFlow += cashFlows[i];
    
    if (cumulativeCashFlow >= initialInvestment) {
      // Interpolação para encontrar o período exato
      const previousCumulative = cumulativeCashFlow - cashFlows[i];
      const remainingAmount = initialInvestment - previousCumulative;
      paybackPeriod = i + (remainingAmount / cashFlows[i]);
      break;
    }
  }
  
  if (cumulativeCashFlow < initialInvestment) {
    paybackPeriod = -1; // Não há payback
  }
  
  return {
    value: paybackPeriod,
    formula: 'Payback = Período quando Σ(CFₜ) ≥ I₀',
    breakdown: {
      initialInvestment,
      cashFlows,
      paybackPeriod,
      hasPayback: paybackPeriod > 0,
      cumulativeCashFlow
    },
    metadata: {
      calculatedAt: new Date().toISOString(),
      precision: FINANCIAL_CONSTANTS.DEFAULT_PRECISION,
      currency: 'BRL'
    }
  };
};

// Funções de data
export const addBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result = addDays(result, 1);
    
    // Pula fins de semana (sábado = 6, domingo = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

export const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

export const getNextBusinessDay = (date: Date): Date => {
  let result = addDays(date, 1);
  
  while (result.getDay() === 0 || result.getDay() === 6) {
    result = addDays(result, 1);
  }
  
  return result;
};

export const calculateDueDate = (
  startDate: Date,
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL',
  dueDay?: number
): Date => {
  let dueDate: Date;
  
  switch (billingCycle) {
    case 'MONTHLY':
      dueDate = addMonths(startDate, 1);
      break;
    case 'QUARTERLY':
      dueDate = addMonths(startDate, 3);
      break;
    case 'SEMI_ANNUAL':
      dueDate = addMonths(startDate, 6);
      break;
    case 'ANNUAL':
      dueDate = addYears(startDate, 1);
      break;
    default:
      dueDate = addMonths(startDate, 1);
  }
  
  // Ajusta para o dia específico se fornecido
  if (dueDay && dueDay >= 1 && dueDay <= 31) {
    dueDate.setDate(dueDay);
    
    // Se o dia não existe no mês (ex: 31 de fevereiro), usa o último dia do mês
    if (dueDate.getDate() !== dueDay) {
      dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);
    }
  }
  
  return dueDate;
};

// Funções utilitárias
export const roundToDecimals = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const generateContractNumber = (prefix: string = 'CONT'): string => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${year}${month}-${random}`;
};

export const sanitizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove caracteres especiais
    .trim();
};

export const slugify = (str: string): string => {
  return sanitizeString(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  
  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + visible;
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Funções de conversão
export const convertCurrency = async (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate?: number
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  if (exchangeRate) {
    return amount * exchangeRate;
  }
  
  // Em um cenário real, aqui seria feita uma chamada para uma API de câmbio
  // Por enquanto, retornamos o valor original
  console.warn('Taxa de câmbio não fornecida. Retornando valor original.');
  return amount;
};

export const getExchangeRate = async (
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> => {
  // Em um cenário real, aqui seria feita uma chamada para uma API de câmbio
  // Por enquanto, retornamos 1 (sem conversão)
  console.warn('Função de taxa de câmbio não implementada. Retornando 1.');
  return 1;
};

// Funções de análise
export const calculateGrowthRate = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) {
    return newValue > 0 ? 100 : 0;
  }
  
  return ((newValue - oldValue) / oldValue) * 100;
};

export const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const average = calculateAverage(values);
  const squaredDifferences = values.map(value => Math.pow(value - average, 2));
  const variance = calculateAverage(squaredDifferences);
  
  return Math.sqrt(variance);
};

export const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};

// Exportar todas as funções como um objeto
export const FinancialUtils = {
  // Formatação
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDocument,
  formatPhone,
  
  // Parsing
  parseCurrency,
  parsePercentage,
  
  // Validação
  validateCPF,
  validateCNPJ,
  validateEmail,
  validatePhone,
  validateData,
  
  // Cálculos financeiros
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateLoanPayment,
  calculateNPV,
  calculateIRR,
  calculatePaybackPeriod,
  
  // Datas
  addBusinessDays,
  calculateBusinessDays,
  getNextBusinessDay,
  calculateDueDate,
  
  // Utilitários
  roundToDecimals,
  clamp,
  generateId,
  generateContractNumber,
  sanitizeString,
  slugify,
  maskSensitiveData,
  deepClone,
  debounce,
  throttle,
  
  // Conversão
  convertCurrency,
  getExchangeRate,
  
  // Análise
  calculateGrowthRate,
  calculateAverage,
  calculateMedian,
  calculateStandardDeviation,
  calculateCorrelation
};

export default FinancialUtils;
