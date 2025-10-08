// =====================================================
// SCRIPT DE TESTE - EDGE FUNCTION SEND-BULK-MESSAGES
// Descrição: Testa a Edge Function send-bulk-messages diretamente
// Uso: npm run test:edge-function
// =====================================================

import { config } from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
config();

/**
 * AIDEV-NOTE: Script para testar a Edge Function send-bulk-messages
 * Simula uma requisição real para identificar problemas de configuração
 */

interface TestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  details?: any;
}

class EdgeFunctionTester {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    this.supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  }

  /**
   * AIDEV-NOTE: Testa a Edge Function send-bulk-messages com dados de exemplo
   */
  async testSendBulkMessages(): Promise<TestResult> {
    console.log('🧪 Testando Edge Function send-bulk-messages...');

    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      return {
        success: false,
        error: 'Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas'
      };
    }

    const testPayload = {
      chargeIds: ['test-charge-1', 'test-charge-2'],
      templateId: 'test-template',
      customMessage: null
    };

    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/send-bulk-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'x-tenant-id': 'test-tenant-id'
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

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          data: responseData
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: responseData
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * AIDEV-NOTE: Executa todos os testes e exibe relatório
   */
  async runTests() {
    console.log('🚀 Iniciando testes da Edge Function...\n');

    const result = await this.testSendBulkMessages();

    console.log('📊 RESULTADO DO TESTE:');
    console.log('='.repeat(40));

    if (result.success) {
      console.log('✅ Teste bem-sucedido!');
      console.log(`📈 Status: ${result.status}`);
      console.log('📄 Resposta:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Teste falhou!');
      if (result.status) {
        console.log(`📉 Status HTTP: ${result.status}`);
      }
      console.log(`🔍 Erro: ${result.error}`);
      if (result.details) {
        console.log('📄 Detalhes:', JSON.stringify(result.details, null, 2));
      }
    }

    // Análise do erro
    if (!result.success && result.status === 500) {
      console.log('\n🔧 ANÁLISE DO ERRO 500:');
      console.log('  • Possível problema de configuração da Evolution API');
      console.log('  • Verifique as variáveis de ambiente no Supabase Dashboard:');
      console.log('    - EVOLUTION_API_BASE_URL');
      console.log('    - EVOLUTION_API_KEY');
      console.log('    - EVOLUTION_INSTANCE');
      console.log('  • Verifique se a Evolution API está acessível');
    }

    return result;
  }
}

// Executar teste diretamente
async function main() {
  const tester = new EdgeFunctionTester();
  
  try {
    const result = await tester.runTests();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro ao executar teste:', error);
    process.exit(1);
  }
}

// Executar função main
main();

export { EdgeFunctionTester };