import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Configuração do Vitest para Testes de Segurança
 * 
 * Esta configuração é específica para executar testes relacionados
 * à segurança da aplicação, incluindo autenticação, autorização,
 * validação de dados e proteção contra vulnerabilidades.
 * 
 * @author SupaGuard Security Team
 */
export default defineConfig({
  plugins: [react()],
  
  test: {
    // Ambiente de teste
    environment: 'jsdom',
    
    // Configuração específica para testes de segurança
    name: 'security-tests',
    
    // Inclui apenas arquivos de teste de segurança
    include: [
      'src/**/*.security.test.{ts,tsx}',
      'src/tests/security/**/*.test.{ts,tsx}',
      'tests/security/**/*.test.{ts,tsx}'
    ],
    
    // Exclui testes regulares
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}'
    ],
    
    // Configurações de timeout para testes de segurança
    testTimeout: 30000, // 30 segundos para testes que podem envolver criptografia
    hookTimeout: 10000,
    
    // Setup files específicos para segurança
    setupFiles: [
      './src/tests/security/setup.ts'
    ],
    
    // Configuração de cobertura específica para segurança
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/security',
      
      // Inclui apenas arquivos relacionados à segurança
      include: [
        'src/lib/security/**',
        'src/services/securityNotificationService.ts',
        'src/hooks/useAuth.ts',
        'src/hooks/useSecurity.ts',
        'middleware.ts'
      ],
      
      // Thresholds específicos para segurança (mais rigorosos)
      thresholds: {
        global: {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    
    // Configuração de globals para testes de segurança
    globals: true,
    
    // Configuração de mock para testes de segurança
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Configuração de retry para testes flaky de segurança
    retry: 2,
    
    // Configuração de reporter
    reporter: [
      'verbose',
      'json',
      ['html', { outputFile: './reports/security-tests.html' }]
    ],
    
    // Configuração de pool para isolamento
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Executa testes de segurança em thread única para evitar race conditions
      }
    }
  },
  
  // Configuração de resolução de módulos
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils')
    }
  },
  
  // Configuração de define para variáveis de ambiente de teste
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.VITE_SUPABASE_URL': '"http://localhost:54321"',
    'process.env.VITE_SUPABASE_ANON_KEY': '"test-anon-key"'
  },
  
  // Configuração de esbuild para otimização
  esbuild: {
    target: 'node14'
  }
});