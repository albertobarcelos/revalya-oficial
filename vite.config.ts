import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: true,
        // Include apenas arquivos JS/TS, excluindo CSS e outros assets
        include: '**/*.{js,jsx,ts,tsx}',
        parserConfig(id) {
          // Excluir arquivos CSS, SCSS e outros assets do processamento SWC
          if (id.endsWith('.css') || id.endsWith('.scss') || id.endsWith('.sass') || id.endsWith('.less')) {
            return false;
          }
          if (id.endsWith('.ts')) return { syntax: 'typescript', tsx: false };
          if (id.endsWith('.tsx')) return { syntax: 'typescript', tsx: true };
          if (id.endsWith('.js')) return { syntax: 'ecmascript', jsx: false };
          if (id.endsWith('.jsx')) return { syntax: 'ecmascript', jsx: true };
          return { syntax: 'ecmascript', jsx: true };
        },
      }),
      {
        name: 'sentry-dev-tunnel',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/api/sentry', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }
            const dsn = env.VITE_SENTRY_DSN || '';
            const match = dsn.match(/^https?:\/\/([^@]+)@([^\/]+)\/(\d+)/);
            const host = match?.[2];
            const projectId = match?.[3];
            if (!host || !projectId) {
              res.statusCode = 500;
              res.end('Sentry DSN inválido');
              return;
            }
            const targetUrl = `https://${host}/api/${projectId}/envelope/`;

            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on('end', async () => {
              const body = Buffer.concat(chunks);
              try {
                const fetchModule = await import('node-fetch');
                const fetch = (fetchModule as any).default || fetchModule;
                const resp = await fetch(targetUrl, {
                  method: 'POST',
                  headers: {
                    'content-type': (req.headers['content-type'] as string) || 'application/x-sentry-envelope',
                  },
                  body,
                });
                res.statusCode = resp.status;
                const text = await resp.text();
                res.end(text);
              } catch (err) {
                res.statusCode = 502;
                res.end('Falha no tunnel da Sentry');
              }
            });
          });
        },
      },
    ],
    
    // Path resolution
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

    // Development server configuration
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true, // Sempre usar 5173 em desenvolvimento
      open: true, // Open browser on server start
      cors: true,
      hmr: {
        protocol: 'ws',
        host: '127.0.0.1',
        port: 5173,
      },
      // AIDEV-NOTE: Proxy removido - usando apenas Supabase
      // Não precisamos mais de proxy para /api pois tudo está no Supabase
    },

    // Preview server configuration (for production builds)
    preview: {
      port: 4173,
      host: true,
      cors: true,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // AIDEV-NOTE: Desabilitar sourcemaps completamente em produção para evitar avisos
      // CORREÇÃO: Usar false explicitamente em vez de condicional para garantir que não sejam gerados
      sourcemap: false,
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2020',
      
      // Rollup options
      rollupOptions: {
        // AIDEV-NOTE: Suprimir avisos de sourcemap durante o build
        onwarn(warning, warn) {
          // Ignorar avisos sobre sourcemaps não resolvidos (são apenas informativos)
          if (warning.message && warning.message.includes('sourcemap')) {
            return;
          }
          // Ignorar aviso sobre importação dinâmica vs estática (é esperado e não afeta funcionalidade)
          if (warning.message && warning.message.includes('dynamically imported') && warning.message.includes('statically imported')) {
            return;
          }
          // Mostrar outros avisos normalmente
          warn(warning);
        },
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-toast',
            ],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'query-vendor': ['@tanstack/react-query'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'chart-vendor': ['recharts', 'apexcharts', 'react-apexcharts'],
            'date-vendor': ['date-fns'],
            // AIDEV-NOTE: Removido 'financial-vendor' - decimal.js será incluído automaticamente onde necessário
            // Isso evita o chunk vazio "financial-vendor"
            'axios-vendor': ['axios'],
          },
        },
      },
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Asset optimization
      assetsInlineLimit: 4096, // 4kb
    },

    // CSS configuration
    css: {
      // AIDEV-NOTE: Desabilitar sourcemaps CSS em produção para evitar avisos
      devSourcemap: mode === 'production' ? false : true,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
      modules: {
        localsConvention: 'camelCase',
      },
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      // Define process.env for frontend compatibility
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.VITE_SUPABASE_SERVICE_ROLE_KEY),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
      'process.env.DOCUSIGN_API_KEY': JSON.stringify(env.DOCUSIGN_API_KEY),
      'process.env.CLICKSIGN_API_KEY': JSON.stringify(env.CLICKSIGN_API_KEY),
      'process.env.VITE_DEV_MODE': JSON.stringify(env.VITE_DEV_MODE),
      'process.env.VITE_APP_URL': JSON.stringify(env.VITE_APP_URL),
      'process.env.PORT': JSON.stringify(env.PORT || '3000'),
      // Define process object for compatibility
      'process.memoryUsage': 'undefined',
      'process.exit': 'undefined',
      'process.on': 'undefined',
      'process.cwd': 'undefined',
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'zod',
        'react-hook-form',
        'date-fns',
        'decimal.js',
        'recharts',
        'apexcharts',
        'react-apexcharts',
        'axios',
      ],
      exclude: [
        // Exclude large dependencies that should be loaded dynamically
      ],
    },

    // ESBuild configuration
    esbuild: {
      target: 'es2020',
      logOverride: {
        'this-is-undefined-in-esm': 'silent',
      },
    },

    // Worker configuration
    worker: {
      format: 'es',
    },

    // JSON configuration
    json: {
      namedExports: true,
      stringify: false,
    },
  };
});
