// =====================================================
// SCRIPT DE VERIFICAÇÃO - VARIÁVEIS DE AMBIENTE EDGE FUNCTION
// Descrição: Verifica se as variáveis de ambiente estão configuradas no Supabase
// Uso: npm run check:edge-env
// =====================================================

import { config } from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
config();

/**
 * AIDEV-NOTE: Script para verificar variáveis de ambiente da Edge Function
 * Testa se as variáveis estão acessíveis via Edge Function
 */

interface EnvCheckResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  details?: any;
}

class EdgeFunctionEnvChecker {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  }

  /**
   * AIDEV-NOTE: Cria uma Edge Function simples para verificar variáveis de ambiente
   */
  async checkEnvironmentVariables(): Promise<EnvCheckResult> {
    console.log('🔍 Verificando variáveis de ambiente da Edge Function...');

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      return {
        success: false,
        error: 'Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas'
      };
    }

    // Payload mínimo para testar apenas as variáveis de ambiente
    const testPayload = {
      action: 'check-env'
    };

    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/send-bulk-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'x-tenant-id': 'env-check-tenant'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        success: response.ok,
        status: response.status,
        data: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        details: responseData
      };

    } catch (error) {
      return {
        success: false,
        error: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        details: error
      };
    }
  }

  /**
   * AIDEV-NOTE: Executa todos os testes de verificação
   */
  async runChecks(): Promise<EnvCheckResult> {
    console.log('🚀 Iniciando verificação de variáveis de ambiente...\n');

    const result = await this.checkEnvironmentVariables();

    console.log('📊 RESULTADO DA VERIFICAÇÃO:');
    console.log('========================================');
    
    if (result.success) {
      console.log('✅ Verificação bem-sucedida!');
      console.log(`📈 Status HTTP: ${result.status}`);
      console.log('📄 Resposta:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Verificação falhou!');
      if (result.status) {
        console.log(`📉 Status HTTP: ${result.status}`);
      }
      console.log(`🔍 Erro: ${result.error}`);
      console.log('📄 Detalhes:', JSON.stringify(result.details, null, 2));

      // Análise específica para erro 500
      if (result.status === 500) {
        console.log('\n🔧 ANÁLISE DO ERRO 500:');
        console.log('  • Possível problema de configuração da Evolution API');
        console.log('  • Verifique as variáveis de ambiente no Supabase Dashboard:');
        console.log('    - EVOLUTION_API_BASE_URL');
        console.log('    - EVOLUTION_API_KEY');
        console.log('    - EVOLUTION_INSTANCE');
        console.log('  • Verifique se a Evolution API está acessível');
      }
    }

    return result;
  }
}

// Executar verificação diretamente
async function main() {
  const checker = new EdgeFunctionEnvChecker();
  
  try {
    const result = await checker.runChecks();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro ao executar verificação:', error);
    process.exit(1);
  }
}

// Executar função main
main();

export { EdgeFunctionEnvChecker };