import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global setup
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Specific thresholds for financial modules
        './src/modules/financial/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './src/modules/contracts/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Specific thresholds for import system
        './src/services/importQueueService.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './src/utils/importErrorHandler.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        './src/utils/batchProcessor.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        './src/security/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    
    // Test patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e',
    ],
    
    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporters
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },
    
    // Watch mode
    watch: false,
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.test.${snapExtension}`);
    },
  },
  
  // Path resolution (same as Vite config)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/financial': path.resolve(__dirname, './src/modules/financial'),
      '@/contracts': path.resolve(__dirname, './src/modules/contracts'),
      '@/investments': path.resolve(__dirname, './src/modules/investments'),
      '@/risk': path.resolve(__dirname, './src/modules/risk'),
      '@/integrations': path.resolve(__dirname, './src/integrations'),
      '@/security': path.resolve(__dirname, './src/security'),
      '@/monitoring': path.resolve(__dirname, './src/monitoring'),
      '@/tests': path.resolve(__dirname, './tests'),
    },
  },
  
  // Define global variables
  define: {
    __TEST__: true,
    __DEV__: true,
  },
});