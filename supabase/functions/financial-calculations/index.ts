// =====================================================
// EDGE FUNCTION: Financial Calculations
// Descrição: Processamento de cálculos financeiros avançados
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getAllHeaders, getErrorHeaders, getSuccessHeaders } from '../_shared/cors.ts';
import { validateRequest, ValidationOptions } from '../_shared/validation.ts';

// Types for financial calculations
interface CalculationRequest {
  type: 'simple_interest' | 'compound_interest' | 'loan_payment' | 'npv' | 'irr' | 'payback' | 'amortization' | 'depreciation';
  parameters: Record<string, any>;
  saveResult?: boolean;
  metadata?: Record<string, any>;
}

interface CalculationResult {
  id?: string;
  type: string;
  result: any;
  parameters: Record<string, any>;
  calculatedAt: string;
  metadata?: Record<string, any>;
}

interface AmortizationEntry {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

interface DepreciationEntry {
  year: number;
  depreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

// Financial calculation functions
class FinancialCalculator {
  // Simple Interest: I = P * r * t
  static calculateSimpleInterest(principal: number, rate: number, time: number): number {
    return principal * (rate / 100) * time;
  }

  // Compound Interest: A = P(1 + r/n)^(nt)
  static calculateCompoundInterest(
    principal: number,
    rate: number,
    time: number,
    compoundingFrequency: number = 12
  ): { amount: number; interest: number } {
    const amount = principal * Math.pow(1 + (rate / 100) / compoundingFrequency, compoundingFrequency * time);
    const interest = amount - principal;
    return { amount, interest };
  }

  // Loan Payment: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
  static calculateLoanPayment(principal: number, rate: number, periods: number): number {
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return principal / periods;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / 
           (Math.pow(1 + monthlyRate, periods) - 1);
  }

  // Net Present Value
  static calculateNPV(rate: number, cashFlows: number[]): number {
    const discountRate = rate / 100;
    return cashFlows.reduce((npv, cashFlow, period) => {
      return npv + cashFlow / Math.pow(1 + discountRate, period);
    }, 0);
  }

  // Internal Rate of Return (using Newton-Raphson method)
  static calculateIRR(cashFlows: number[], guess: number = 0.1): number | null {
    const maxIterations = 100;
    const tolerance = 1e-6;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        npv += cashFlows[j] / Math.pow(1 + rate, j);
        dnpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
      }

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Return as percentage
      }

      if (Math.abs(dnpv) < tolerance) {
        return null; // Derivative too small
      }

      rate = rate - npv / dnpv;
    }

    return null; // Did not converge
  }

  // Payback Period
  static calculatePaybackPeriod(initialInvestment: number, cashFlows: number[]): number | null {
    let cumulativeCashFlow = -initialInvestment;
    
    for (let i = 0; i < cashFlows.length; i++) {
      cumulativeCashFlow += cashFlows[i];
      if (cumulativeCashFlow >= 0) {
        // Linear interpolation for fractional period
        const previousCumulative = cumulativeCashFlow - cashFlows[i];
        const fraction = Math.abs(previousCumulative) / cashFlows[i];
        return i + fraction;
      }
    }
    
    return null; // Payback period not reached
  }

  // Amortization Schedule
  static generateAmortizationSchedule(
    principal: number,
    rate: number,
    periods: number
  ): AmortizationEntry[] {
    const monthlyPayment = this.calculateLoanPayment(principal, rate, periods);
    const monthlyRate = rate / 100 / 12;
    let balance = principal;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    
    const schedule: AmortizationEntry[] = [];

    for (let period = 1; period <= periods; period++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPayment;

      schedule.push({
        period,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
        cumulativeInterest,
        cumulativePrincipal,
      });

      if (balance <= 0) break;
    }

    return schedule;
  }

  // Depreciation Calculation
  static calculateDepreciation(
    cost: number,
    salvageValue: number,
    usefulLife: number,
    method: 'straight_line' | 'declining_balance' | 'sum_of_years'
  ): DepreciationEntry[] {
    const schedule: DepreciationEntry[] = [];
    let accumulatedDepreciation = 0;
    let bookValue = cost;

    switch (method) {
      case 'straight_line':
        const annualDepreciation = (cost - salvageValue) / usefulLife;
        for (let year = 1; year <= usefulLife; year++) {
          accumulatedDepreciation += annualDepreciation;
          bookValue = cost - accumulatedDepreciation;
          
          schedule.push({
            year,
            depreciation: annualDepreciation,
            accumulatedDepreciation,
            bookValue: Math.max(salvageValue, bookValue),
          });
        }
        break;

      case 'declining_balance':
        const rate = 2 / usefulLife; // Double declining balance
        bookValue = cost;
        for (let year = 1; year <= usefulLife; year++) {
          const depreciation = Math.min(bookValue * rate, bookValue - salvageValue);
          accumulatedDepreciation += depreciation;
          bookValue -= depreciation;
          
          schedule.push({
            year,
            depreciation,
            accumulatedDepreciation,
            bookValue,
          });

          if (bookValue <= salvageValue) break;
        }
        break;

      case 'sum_of_years':
        const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
        for (let year = 1; year <= usefulLife; year++) {
          const fraction = (usefulLife - year + 1) / sumOfYears;
          const depreciation = (cost - salvageValue) * fraction;
          accumulatedDepreciation += depreciation;
          bookValue = cost - accumulatedDepreciation;
          
          schedule.push({
            year,
            depreciation,
            accumulatedDepreciation,
            bookValue: Math.max(salvageValue, bookValue),
          });
        }
        break;
    }

    return schedule;
  }
}

// Main handler function
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request
    const validationOptions: ValidationOptions = {
      allowedMethods: ['POST'],
      requireAuth: true,
      requireTenant: true,
      allowedRoles: ['ADMIN', 'FINANCIAL_MANAGER', 'FINANCIAL_ANALYST'],
      maxBodySize: 1024 * 1024, // 1MB
    };

    const validation = await validateRequest(req, validationOptions);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: validation.status || 400, 
          headers: getErrorHeaders(validation.status) 
        }
      );
    }

    // Parse request body
    const body: CalculationRequest = await req.json();
    
    if (!body.type || !body.parameters) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and parameters' }),
        { status: 400, headers: getErrorHeaders(400) }
      );
    }

    // Perform calculation based on type
    let result: any;
    const { type, parameters } = body;

    switch (type) {
      case 'simple_interest':
        const { principal, rate, time } = parameters;
        if (!principal || !rate || !time) {
          throw new Error('Missing required parameters: principal, rate, time');
        }
        result = {
          interest: FinancialCalculator.calculateSimpleInterest(principal, rate, time),
          total: principal + FinancialCalculator.calculateSimpleInterest(principal, rate, time),
        };
        break;

      case 'compound_interest':
        const { principal: p, rate: r, time: t, compoundingFrequency = 12 } = parameters;
        if (!p || !r || !t) {
          throw new Error('Missing required parameters: principal, rate, time');
        }
        result = FinancialCalculator.calculateCompoundInterest(p, r, t, compoundingFrequency);
        break;

      case 'loan_payment':
        const { principal: loanAmount, rate: loanRate, periods } = parameters;
        if (!loanAmount || !loanRate || !periods) {
          throw new Error('Missing required parameters: principal, rate, periods');
        }
        result = {
          monthlyPayment: FinancialCalculator.calculateLoanPayment(loanAmount, loanRate, periods),
          totalPayment: FinancialCalculator.calculateLoanPayment(loanAmount, loanRate, periods) * periods,
          totalInterest: (FinancialCalculator.calculateLoanPayment(loanAmount, loanRate, periods) * periods) - loanAmount,
        };
        break;

      case 'npv':
        const { rate: discountRate, cashFlows } = parameters;
        if (!discountRate || !Array.isArray(cashFlows)) {
          throw new Error('Missing required parameters: rate, cashFlows (array)');
        }
        result = {
          npv: FinancialCalculator.calculateNPV(discountRate, cashFlows),
        };
        break;

      case 'irr':
        const { cashFlows: irrCashFlows, guess = 0.1 } = parameters;
        if (!Array.isArray(irrCashFlows)) {
          throw new Error('Missing required parameter: cashFlows (array)');
        }
        const irr = FinancialCalculator.calculateIRR(irrCashFlows, guess);
        result = {
          irr: irr,
          converged: irr !== null,
        };
        break;

      case 'payback':
        const { initialInvestment, cashFlows: paybackCashFlows } = parameters;
        if (!initialInvestment || !Array.isArray(paybackCashFlows)) {
          throw new Error('Missing required parameters: initialInvestment, cashFlows (array)');
        }
        const paybackPeriod = FinancialCalculator.calculatePaybackPeriod(initialInvestment, paybackCashFlows);
        result = {
          paybackPeriod,
          hasPayback: paybackPeriod !== null,
        };
        break;

      case 'amortization':
        const { principal: amortPrincipal, rate: amortRate, periods: amortPeriods } = parameters;
        if (!amortPrincipal || !amortRate || !amortPeriods) {
          throw new Error('Missing required parameters: principal, rate, periods');
        }
        result = {
          schedule: FinancialCalculator.generateAmortizationSchedule(amortPrincipal, amortRate, amortPeriods),
        };
        break;

      case 'depreciation':
        const { cost, salvageValue, usefulLife, method = 'straight_line' } = parameters;
        if (!cost || salvageValue === undefined || !usefulLife) {
          throw new Error('Missing required parameters: cost, salvageValue, usefulLife');
        }
        result = {
          schedule: FinancialCalculator.calculateDepreciation(cost, salvageValue, usefulLife, method),
        };
        break;

      default:
        throw new Error(`Unsupported calculation type: ${type}`);
    }

    // Save result if requested
    let savedCalculation: any = null;
    if (body.saveResult) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const calculationData = {
        tenant_id: validation.tenantId,
        user_id: validation.user?.id,
        calculation_type: type,
        parameters: parameters,
        result: result,
        metadata: body.metadata || {},
      };

      const { data, error } = await supabase
        .from('financial_calculations')
        .insert(calculationData)
        .select()
        .single();

      if (error) {
        console.error('Error saving calculation:', error);
      } else {
        savedCalculation = data;
      }
    }

    // Prepare response
    const response: CalculationResult = {
      id: savedCalculation?.id,
      type,
      result,
      parameters,
      calculatedAt: new Date().toISOString(),
      metadata: body.metadata,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
        saved: !!savedCalculation,
      }),
      { 
        status: 200, 
        headers: getSuccessHeaders() 
      }
    );

  } catch (error) {
    console.error('Financial calculation error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: getErrorHeaders(500) 
      }
    );
  }
});