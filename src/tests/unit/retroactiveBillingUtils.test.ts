import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  isRetroactiveContract,
  calculateRetroactiveBillingPeriods,
  canApplyRetroactiveLogic,
  calculateRetroactiveStats,
  logRetroactiveLogicApplication,
  type Contract,
  type BillingPeriod
} from '../../utils/retroactiveBillingUtils'

// AIDEV-NOTE: Mock de dados de teste para contratos retroativos
const createMockContract = (overrides: Partial<Contract> = {}): Contract => ({
  id: 'contract-123',
  tenant_id: 'tenant-456',
  client_id: 'client-789',
  status: 'active',
  start_date: '2024-01-15',
  end_date: null,
  billing_cycle: 'monthly',
  auto_billing: true,
  generate_billing: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

describe('Retroactive Billing Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // AIDEV-NOTE: Definir data atual como 15 de março de 2024 para testes consistentes
    vi.setSystemTime(new Date('2024-03-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isRetroactiveContract', () => {
    it('deve identificar contrato retroativo quando data de início é anterior ao mês atual', () => {
      // AIDEV-NOTE: Contrato iniciado em janeiro, estamos em março
      const contract = createMockContract({
        start_date: '2024-01-15'
      })

      const result = isRetroactiveContract(contract)
      expect(result).toBe(true)
    })

    it('deve identificar contrato não retroativo quando data de início é no mês atual', () => {
      // AIDEV-NOTE: Contrato iniciado no mês atual (março)
      const contract = createMockContract({
        start_date: '2024-03-10'
      })

      const result = isRetroactiveContract(contract)
      expect(result).toBe(false)
    })

    it('deve identificar contrato não retroativo quando data de início é futura', () => {
      // AIDEV-NOTE: Contrato com início futuro
      const contract = createMockContract({
        start_date: '2024-04-01'
      })

      const result = isRetroactiveContract(contract)
      expect(result).toBe(false)
    })

    it('deve tratar data inválida como não retroativo', () => {
      const contract = createMockContract({
        start_date: 'invalid-date'
      })

      const result = isRetroactiveContract(contract)
      expect(result).toBe(false)
    })
  })

  describe('canApplyRetroactiveLogic', () => {
    it('deve permitir aplicar lógica quando contrato está ativo e tem faturamento automático', () => {
      const contract = createMockContract({
        status: 'active',
        auto_billing: true,
        generate_billing: true
      })

      const result = canApplyRetroactiveLogic(contract)
      expect(result).toBe(true)
    })

    it('deve impedir aplicar lógica quando contrato está inativo', () => {
      const contract = createMockContract({
        status: 'inactive',
        auto_billing: true,
        generate_billing: true
      })

      const result = canApplyRetroactiveLogic(contract)
      expect(result).toBe(false)
    })

    it('deve impedir aplicar lógica quando faturamento automático está desabilitado', () => {
      const contract = createMockContract({
        status: 'active',
        auto_billing: false,
        generate_billing: true
      })

      const result = canApplyRetroactiveLogic(contract)
      expect(result).toBe(false)
    })

    it('deve impedir aplicar lógica quando geração de faturamento está desabilitada', () => {
      const contract = createMockContract({
        status: 'active',
        auto_billing: true,
        generate_billing: false
      })

      const result = canApplyRetroactiveLogic(contract)
      expect(result).toBe(false)
    })

    it('deve impedir aplicar lógica quando contrato tem data de fim anterior ao período retroativo', () => {
      const contract = createMockContract({
        status: 'active',
        auto_billing: true,
        generate_billing: true,
        start_date: '2024-01-15',
        end_date: '2024-01-31' // Terminou antes do período retroativo
      })

      const result = canApplyRetroactiveLogic(contract)
      expect(result).toBe(false)
    })
  })

  describe('calculateRetroactiveBillingPeriods', () => {
    it('deve calcular períodos retroativos corretamente para contrato mensal', () => {
      // AIDEV-NOTE: Contrato iniciado em 15 de janeiro, estamos em 15 de março
      // Deve gerar períodos para janeiro e fevereiro
      const contract = createMockContract({
        start_date: '2024-01-15',
        billing_cycle: 'monthly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)

      expect(periods).toHaveLength(2)
      
      // Período de janeiro
      expect(periods[0].startDate).toEqual(new Date('2024-01-15'))
      expect(periods[0].endDate).toEqual(endOfMonth(new Date('2024-01-15')))
      expect(periods[0].billingDate).toEqual(new Date('2024-02-15'))
      
      // Período de fevereiro
      expect(periods[1].startDate).toEqual(startOfMonth(new Date('2024-02-01')))
      expect(periods[1].endDate).toEqual(endOfMonth(new Date('2024-02-01')))
      expect(periods[1].billingDate).toEqual(new Date('2024-03-15'))
    })

    it('deve calcular períodos retroativos para contrato trimestral', () => {
      // AIDEV-NOTE: Contrato iniciado em outubro, estamos em março (2 trimestres atrás)
      vi.setSystemTime(new Date('2024-03-15T10:00:00Z'))
      
      const contract = createMockContract({
        start_date: '2023-10-15',
        billing_cycle: 'quarterly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)

      // Deve ter vários períodos trimestrais
      expect(periods.length).toBeGreaterThan(0)
      
      // Verificar que os períodos são trimestrais (3 meses)
      if (periods.length > 1) {
        const firstPeriod = periods[0]
        const secondPeriod = periods[1]
        
        const monthsDiff = (secondPeriod.startDate.getFullYear() - firstPeriod.startDate.getFullYear()) * 12 +
                          (secondPeriod.startDate.getMonth() - firstPeriod.startDate.getMonth())
        
        expect(monthsDiff).toBe(3)
      }
    })

    it('deve calcular períodos retroativos para contrato anual', () => {
      // AIDEV-NOTE: Contrato iniciado há mais de um ano
      vi.setSystemTime(new Date('2025-02-15T10:00:00Z'))
      
      const contract = createMockContract({
        start_date: '2023-01-15',
        billing_cycle: 'yearly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)

      expect(periods.length).toBeGreaterThan(0)
      
      // Verificar que os períodos são anuais
      if (periods.length > 1) {
        const firstPeriod = periods[0]
        const secondPeriod = periods[1]
        
        const yearsDiff = secondPeriod.startDate.getFullYear() - firstPeriod.startDate.getFullYear()
        expect(yearsDiff).toBe(1)
      }
    })

    it('deve retornar array vazio para contrato não retroativo', () => {
      const contract = createMockContract({
        start_date: '2024-03-10' // Mesmo mês atual
      })

      const periods = calculateRetroactiveBillingPeriods(contract)
      expect(periods).toHaveLength(0)
    })

    it('deve respeitar data de fim do contrato', () => {
      const contract = createMockContract({
        start_date: '2024-01-15',
        end_date: '2024-02-10', // Terminou em fevereiro
        billing_cycle: 'monthly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)

      // Deve ter apenas o período de janeiro, pois terminou em fevereiro
      expect(periods).toHaveLength(1)
      expect(periods[0].startDate).toEqual(new Date('2024-01-15'))
    })
  })

  describe('calculateRetroactiveStats', () => {
    it('deve calcular estatísticas corretamente para períodos retroativos', () => {
      const periods: BillingPeriod[] = [
        {
          startDate: new Date('2024-01-15'),
          endDate: endOfMonth(new Date('2024-01-15')),
          billingDate: new Date('2024-02-15')
        },
        {
          startDate: startOfMonth(new Date('2024-02-01')),
          endDate: endOfMonth(new Date('2024-02-01')),
          billingDate: new Date('2024-03-15')
        }
      ]

      const contract = createMockContract({
        start_date: '2024-01-15'
      })

      const stats = calculateRetroactiveStats(periods, contract)

      expect(stats.totalPeriods).toBe(2)
      expect(stats.oldestPeriod).toEqual(new Date('2024-01-15'))
      expect(stats.newestPeriod).toEqual(startOfMonth(new Date('2024-02-01')))
      expect(stats.monthsBack).toBe(2)
      expect(stats.contractStartDate).toEqual(new Date('2024-01-15'))
    })

    it('deve retornar estatísticas vazias para array vazio', () => {
      const periods: BillingPeriod[] = []
      const contract = createMockContract()

      const stats = calculateRetroactiveStats(periods, contract)

      expect(stats.totalPeriods).toBe(0)
      expect(stats.oldestPeriod).toBeNull()
      expect(stats.newestPeriod).toBeNull()
      expect(stats.monthsBack).toBe(0)
    })

    it('deve calcular estatísticas para um único período', () => {
      const periods: BillingPeriod[] = [
        {
          startDate: new Date('2024-02-01'),
          endDate: endOfMonth(new Date('2024-02-01')),
          billingDate: new Date('2024-03-01')
        }
      ]

      const contract = createMockContract({
        start_date: '2024-02-01'
      })

      const stats = calculateRetroactiveStats(periods, contract)

      expect(stats.totalPeriods).toBe(1)
      expect(stats.oldestPeriod).toEqual(new Date('2024-02-01'))
      expect(stats.newestPeriod).toEqual(new Date('2024-02-01'))
      expect(stats.monthsBack).toBe(1)
    })
  })

  describe('logRetroactiveLogicApplication', () => {
    it('deve registrar aplicação da lógica retroativa sem erros', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const contract = createMockContract()
      const periods: BillingPeriod[] = [
        {
          startDate: new Date('2024-01-15'),
          endDate: endOfMonth(new Date('2024-01-15')),
          billingDate: new Date('2024-02-15')
        }
      ]
      const stats = {
        totalPeriods: 1,
        oldestPeriod: new Date('2024-01-15'),
        newestPeriod: new Date('2024-01-15'),
        monthsBack: 2,
        contractStartDate: new Date('2024-01-15')
      }

      expect(() => {
        logRetroactiveLogicApplication(contract, periods, stats)
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Cenários de Integração', () => {
    it('deve processar fluxo completo para contrato retroativo válido', () => {
      const contract = createMockContract({
        start_date: '2024-01-15',
        status: 'active',
        auto_billing: true,
        generate_billing: true,
        billing_cycle: 'monthly'
      })

      // Verificar se é retroativo
      expect(isRetroactiveContract(contract)).toBe(true)

      // Verificar se pode aplicar lógica
      expect(canApplyRetroactiveLogic(contract)).toBe(true)

      // Calcular períodos
      const periods = calculateRetroactiveBillingPeriods(contract)
      expect(periods.length).toBeGreaterThan(0)

      // Calcular estatísticas
      const stats = calculateRetroactiveStats(periods, contract)
      expect(stats.totalPeriods).toBe(periods.length)

      // Registrar aplicação
      expect(() => {
        logRetroactiveLogicApplication(contract, periods, stats)
      }).not.toThrow()
    })

    it('deve rejeitar fluxo para contrato não retroativo', () => {
      const contract = createMockContract({
        start_date: '2024-03-10', // Mês atual
        status: 'active',
        auto_billing: true,
        generate_billing: true
      })

      // Não deve ser retroativo
      expect(isRetroactiveContract(contract)).toBe(false)

      // Períodos devem estar vazios
      const periods = calculateRetroactiveBillingPeriods(contract)
      expect(periods).toHaveLength(0)
    })

    it('deve rejeitar fluxo para contrato inválido', () => {
      const contract = createMockContract({
        start_date: '2024-01-15',
        status: 'inactive', // Status inválido
        auto_billing: false, // Faturamento desabilitado
        generate_billing: false
      })

      // Pode ser retroativo pela data
      expect(isRetroactiveContract(contract)).toBe(true)

      // Mas não pode aplicar lógica
      expect(canApplyRetroactiveLogic(contract)).toBe(false)
    })
  })

  describe('Casos Extremos', () => {
    it('deve lidar com contratos muito antigos', () => {
      vi.setSystemTime(new Date('2024-12-15T10:00:00Z'))
      
      const contract = createMockContract({
        start_date: '2020-01-15',
        billing_cycle: 'monthly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)
      
      // Deve ter muitos períodos, mas não deve quebrar
      expect(periods.length).toBeGreaterThan(12) // Mais de um ano
      expect(periods.length).toBeLessThan(100) // Mas não excessivo
    })

    it('deve lidar com datas de início no último dia do mês', () => {
      const contract = createMockContract({
        start_date: '2024-01-31',
        billing_cycle: 'monthly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)
      
      expect(periods.length).toBeGreaterThan(0)
      expect(periods[0].startDate).toEqual(new Date('2024-01-31'))
    })

    it('deve lidar com anos bissextos', () => {
      vi.setSystemTime(new Date('2024-03-15T10:00:00Z')) // 2024 é bissexto
      
      const contract = createMockContract({
        start_date: '2024-02-29', // 29 de fevereiro
        billing_cycle: 'monthly'
      })

      const periods = calculateRetroactiveBillingPeriods(contract)
      
      expect(periods.length).toBeGreaterThan(0)
      expect(periods[0].startDate).toEqual(new Date('2024-02-29'))
    })
  })
})