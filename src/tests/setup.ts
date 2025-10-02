import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'

// AIDEV-NOTE: Configuração global para todos os testes
beforeAll(() => {
  // Mock de variáveis de ambiente para testes
  process.env.NODE_ENV = 'test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

afterAll(() => {
  // Limpeza global após todos os testes
  vi.clearAllMocks()
  vi.resetAllMocks()
})

beforeEach(() => {
  // Reset de mocks antes de cada teste
  vi.clearAllMocks()
})

afterEach(() => {
  // Limpeza após cada teste
  vi.clearAllTimers()
})

// AIDEV-NOTE: Mock global do console para evitar logs desnecessários nos testes
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// AIDEV-NOTE: Mock global do fetch para testes de API
global.fetch = vi.fn()

// AIDEV-NOTE: Mock do localStorage para testes de frontend
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// AIDEV-NOTE: Mock do sessionStorage para testes de frontend
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// AIDEV-NOTE: Configuração de timeout para testes assíncronos
vi.setConfig({
  testTimeout: 30000, // 30 segundos
  hookTimeout: 10000, // 10 segundos para hooks
})