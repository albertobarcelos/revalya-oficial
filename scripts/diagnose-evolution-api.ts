// =====================================================
// SCRIPT DE DIAGNÓSTICO - EVOLUTION API
// Descrição: Verifica configurações e conectividade da Evolution API
// Uso: npm run diagnose:evolution
// =====================================================

import { config } from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
config();

/**
 * AIDEV-NOTE: Script para diagnosticar problemas de configuração da Evolution API
 * Verifica variáveis de ambiente, conectividade e configurações do banco
 */

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

class EvolutionApiDiagnostic {
  private results: DiagnosticResult[] = [];

  /**
   * AIDEV-NOTE: Adiciona resultado do diagnóstico
   */
  private addResult(category: string, status: 'success' | 'warning' | 'error', message: string, details?: any) {
    this.results.push({ category, status, message, details });
  }

  /**
   * AIDEV-NOTE: Verifica variáveis de ambiente do frontend
   */
  private checkFrontendEnvironment() {
    console.log('🔍 Verificando variáveis de ambiente do frontend...');
    
    const frontendVars = {
      VITE_EVOLUTION_API_URL: process.env.VITE_EVOLUTION_API_URL,
      VITE_EVOLUTION_API_KEY: process.env.VITE_EVOLUTION_API_KEY,
    };

    Object.entries(frontendVars).forEach(([key, value]) => {
      if (!value) {
        this.addResult('Frontend Environment', 'error', `${key} não está definida`, { key, value });
      } else if (key === 'VITE_EVOLUTION_API_URL' && !value.startsWith('http')) {
        this.addResult('Frontend Environment', 'error', `${key} deve começar com http/https`, { key, value });
      } else if (key === 'VITE_EVOLUTION_API_KEY' && value.length < 10) {
        this.addResult('Frontend Environment', 'warning', `${key} parece ser muito curta`, { key, length: value.length });
      } else {
        this.addResult('Frontend Environment', 'success', `${key} configurada corretamente`, { key, value: value.substring(0, 20) + '...' });
      }
    });
  }

  /**
   * AIDEV-NOTE: Testa conectividade com a Evolution API
   */
  private async checkApiConnectivity() {
    console.log('🌐 Testando conectividade com Evolution API...');
    
    const apiUrl = process.env.VITE_EVOLUTION_API_URL;
    const apiKey = process.env.VITE_EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      this.addResult('API Connectivity', 'error', 'Variáveis de ambiente não configuradas');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/manager/findInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        signal: AbortSignal.timeout(10000), // 10 segundos timeout
      });

      if (response.ok) {
        const data = await response.json();
        this.addResult('API Connectivity', 'success', 'Conexão com Evolution API estabelecida', { 
          status: response.status,
          instanceCount: Array.isArray(data) ? data.length : 'unknown'
        });
      } else {
        this.addResult('API Connectivity', 'error', `Erro HTTP ${response.status}`, { 
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      this.addResult('API Connectivity', 'error', 'Falha na conexão com Evolution API', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * AIDEV-NOTE: Verifica configurações no banco de dados
   */
  private async checkDatabaseConfig() {
    console.log('🗄️ Verificando configurações no banco de dados...');
    
    try {
      // Simular verificação do banco (seria necessário importar supabase)
      this.addResult('Database Config', 'warning', 'Verificação do banco não implementada neste script', {
        note: 'Execute: SELECT * FROM whatsapp_configurations WHERE active = true'
      });
    } catch (error) {
      this.addResult('Database Config', 'error', 'Erro ao verificar banco de dados', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * AIDEV-NOTE: Executa todos os diagnósticos
   */
  public async runDiagnostics(): Promise<DiagnosticResult[]> {
    console.log('🚀 Iniciando diagnóstico da Evolution API...\n');

    this.checkFrontendEnvironment();
    await this.checkApiConnectivity();
    await this.checkDatabaseConfig();

    return this.results;
  }

  /**
   * AIDEV-NOTE: Exibe relatório formatado
   */
  public printReport() {
    console.log('\n📊 RELATÓRIO DE DIAGNÓSTICO - EVOLUTION API');
    console.log('='.repeat(50));

    const categories = [...new Set(this.results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n📁 ${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      categoryResults.forEach(result => {
        const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`  ${icon} ${result.message}`);
        
        if (result.details) {
          console.log(`     Detalhes:`, result.details);
        }
      });
    });

    // Resumo
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    console.log('\n📈 RESUMO:');
    console.log(`  ✅ Sucessos: ${successCount}`);
    console.log(`  ⚠️ Avisos: ${warningCount}`);
    console.log(`  ❌ Erros: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n🔧 AÇÕES RECOMENDADAS:');
      console.log('  1. Configure as variáveis de ambiente no arquivo .env');
      console.log('  2. Verifique se o Supabase Dashboard tem as variáveis configuradas');
      console.log('  3. Teste a conectividade com a Evolution API');
    }
  }
}

// Executar diagnóstico se chamado diretamente
async function main() {
  const diagnostic = new EvolutionApiDiagnostic();
  
  try {
    await diagnostic.runDiagnostics();
    diagnostic.printReport();
  } catch (error) {
    console.error('❌ Erro ao executar diagnóstico:', error);
  }
}

// Executar diagnóstico
main();

export { EvolutionApiDiagnostic };