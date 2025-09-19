/**
 * Script de Diagnóstico do Supabase
 * Verifica e corrige configurações incorretas que podem causar erro 500
 */

const fs = require('fs');
const path = require('path');

// Configurações corretas do projeto REVALYA
const CORRECT_CONFIG = {
  PROJECT_ID: 'wyehpiutzvwplllumgdk',
  URL: 'https://wyehpiutzvwplllumgdk.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY'
};

// URLs incorretas conhecidas (outras que não sejam do Revalya)
const INCORRECT_URLS = [
  'https://nakavvhhfbsfyocdfzsc.supabase.co',
  'nakavvhhfbsfyocdfzsc.supabase.co'
];

class SupabaseDiagnostic {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.issues = [];
    this.fixes = [];
  }

  /**
   * Executa diagnóstico completo
   */
  async runDiagnostic() {
    console.log('🔍 Iniciando diagnóstico do Supabase...');
    console.log('=' .repeat(50));

    // Verificar arquivo .env
    this.checkEnvFile();

    // Verificar arquivos de código
    this.checkCodeFiles();

    // Verificar localStorage (simulado)
    this.checkLocalStorage();

    // Verificar config.toml
    this.checkConfigToml();

    // Exibir resultados
    this.displayResults();

    // Aplicar correções se solicitado
    await this.promptForFixes();
  }

  /**
   * Verifica arquivo .env
   */
  checkEnvFile() {
    console.log('📄 Verificando arquivo .env...');

    if (!fs.existsSync(this.envPath)) {
      this.issues.push({
        type: 'error',
        category: 'env',
        message: 'Arquivo .env não encontrado',
        fix: 'Criar arquivo .env baseado no .env.example'
      });
      return;
    }

    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const envLines = envContent.split('\n');

    // Verificar VITE_SUPABASE_URL
    const urlLine = envLines.find(line => line.startsWith('VITE_SUPABASE_URL='));
    if (urlLine) {
      const currentUrl = urlLine.split('=')[1]?.trim();
      if (INCORRECT_URLS.some(incorrectUrl => currentUrl?.includes(incorrectUrl.replace('https://', '')))) {
        this.issues.push({
          type: 'error',
          category: 'env',
          message: `URL incorreta encontrada: ${currentUrl}`,
          fix: `Alterar para: ${CORRECT_CONFIG.URL}`,
          currentValue: currentUrl,
          correctValue: CORRECT_CONFIG.URL
        });
      } else if (currentUrl === CORRECT_CONFIG.URL) {
        console.log('✅ VITE_SUPABASE_URL está correto');
      }
    } else {
      this.issues.push({
        type: 'error',
        category: 'env',
        message: 'VITE_SUPABASE_URL não encontrado no .env',
        fix: `Adicionar: VITE_SUPABASE_URL=${CORRECT_CONFIG.URL}`
      });
    }

    // Verificar chave anônima
    const anonKeyLine = envLines.find(line => line.startsWith('VITE_SUPABASE_ANON_KEY='));

    if (!anonKeyLine) {
      this.issues.push({
        type: 'error',
        category: 'env',
        message: 'VITE_SUPABASE_ANON_KEY não encontrada',
        fix: `Adicionar: VITE_SUPABASE_ANON_KEY=${CORRECT_CONFIG.ANON_KEY}`
      });
    } else {
      const currentKey = anonKeyLine.split('=')[1]?.trim();
      if (currentKey === CORRECT_CONFIG.ANON_KEY) {
        console.log('✅ VITE_SUPABASE_ANON_KEY está correto');
      }
    }
  }

  /**
   * Verifica arquivos de código
   */
  checkCodeFiles() {
    console.log('🔍 Verificando arquivos de código...');

    const filesToCheck = [
      'src/utils/supabaseAuthBypass.ts',
      'src/lib/supabase.ts',
      'src/pages/auth/Login.tsx'
    ];

    filesToCheck.forEach(filePath => {
      const fullPath = path.join(this.projectRoot, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Verificar URLs incorretas no código
        INCORRECT_URLS.forEach(incorrectUrl => {
          if (content.includes(incorrectUrl)) {
            this.issues.push({
              type: 'warning',
              category: 'code',
              message: `URL incorreta encontrada em ${filePath}`,
              fix: `Substituir ${incorrectUrl} por ${CORRECT_CONFIG.URL}`,
              file: filePath
            });
          }
        });
      }
    });
  }

  /**
   * Verifica configurações de localStorage (simulado)
   */
  checkLocalStorage() {
    console.log('💾 Verificando configurações de armazenamento...');
    
    this.issues.push({
      type: 'info',
      category: 'storage',
      message: 'Recomendado limpar localStorage e sessionStorage',
      fix: 'Executar: localStorage.clear(); sessionStorage.clear();'
    });
  }

  /**
   * Verifica config.toml
   */
  checkConfigToml() {
    console.log('⚙️ Verificando config.toml...');

    const configPath = path.join(this.projectRoot, 'supabase', 'config.toml');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      
      if (content.includes(`project_id = "${CORRECT_CONFIG.PROJECT_ID}"`)) {
        console.log('✅ config.toml está correto');
      } else {
        this.issues.push({
          type: 'error',
          category: 'config',
          message: 'Project ID incorreto no config.toml',
          fix: `Alterar para: project_id = "${CORRECT_CONFIG.PROJECT_ID}"`
        });
      }
    }
  }

  /**
   * Exibe resultados do diagnóstico
   */
  displayResults() {
    console.log('\n📊 Resultados do Diagnóstico');
    console.log('=' .repeat(50));

    if (this.issues.length === 0) {
      console.log('✅ Nenhum problema encontrado!');
      return;
    }

    const errors = this.issues.filter(issue => issue.type === 'error');
    const warnings = this.issues.filter(issue => issue.type === 'warning');
    const infos = this.issues.filter(issue => issue.type === 'info');

    if (errors.length > 0) {
      console.log(`\n❌ Erros encontrados (${errors.length}):`);
      errors.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
        console.log(`     💡 Solução: ${issue.fix}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️ Avisos (${warnings.length}):`);
      warnings.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
        console.log(`     💡 Solução: ${issue.fix}`);
      });
    }

    if (infos.length > 0) {
      console.log(`\nℹ️ Informações (${infos.length}):`);
      infos.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
        console.log(`     💡 Recomendação: ${issue.fix}`);
      });
    }
  }

  /**
   * Pergunta se o usuário quer aplicar correções
   */
  async promptForFixes() {
    const errors = this.issues.filter(issue => issue.type === 'error');
    if (errors.length === 0) return;

    console.log('\n🔧 Correções Automáticas Disponíveis');
    console.log('=' .repeat(50));
    
    // Simular prompt (em ambiente real, usaria readline)
    console.log('Para aplicar correções automáticas, execute:');
    console.log('node scripts/aplicar-correcoes-supabase.js');
  }

  /**
   * Aplica correções automáticas
   */
  applyFixes() {
    console.log('🔧 Aplicando correções...');

    const envIssues = this.issues.filter(issue => issue.category === 'env');
    
    if (envIssues.length > 0) {
      this.fixEnvFile(envIssues);
    }

    console.log('✅ Correções aplicadas com sucesso!');
    console.log('🔄 Reinicie a aplicação para aplicar as mudanças.');
  }

  /**
   * Corrige arquivo .env
   */
  fixEnvFile(envIssues) {
    console.log('📝 Corrigindo arquivo .env...');

    let envContent = '';
    
    if (fs.existsSync(this.envPath)) {
      envContent = fs.readFileSync(this.envPath, 'utf8');
    }

    // Aplicar correções
    envIssues.forEach(issue => {
      if (issue.currentValue && issue.correctValue) {
        envContent = envContent.replace(issue.currentValue, issue.correctValue);
      }
    });

    // Adicionar configurações faltantes
    if (!envContent.includes('VITE_SUPABASE_URL=')) {
      envContent += `\nVITE_SUPABASE_URL=${CORRECT_CONFIG.URL}`;
    }

    if (!envContent.includes('VITE_SUPABASE_ANON_KEY=')) {
      envContent += `\nVITE_SUPABASE_ANON_KEY=${CORRECT_CONFIG.ANON_KEY}`;
    }

    // Salvar arquivo corrigido
    fs.writeFileSync(this.envPath, envContent);
    console.log('✅ Arquivo .env corrigido');
  }

  /**
   * Gera script de limpeza de cache
   */
  generateCacheCleanScript() {
    const script = `
// Script para limpar cache do navegador
// Execute no console do navegador (F12)

console.log('🧹 Limpando cache do Supabase...');

// Limpar localStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

// Limpar sessionStorage
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    sessionStorage.removeItem(key);
    console.log('Removido:', key);
  }
});

console.log('✅ Cache limpo! Recarregue a página.');
`;

    const scriptPath = path.join(this.projectRoot, 'scripts', 'limpar-cache-supabase.js');
    fs.writeFileSync(scriptPath, script);
    console.log(`📄 Script de limpeza criado: ${scriptPath}`);
  }
}

// Executar diagnóstico se chamado diretamente
if (require.main === module) {
  const diagnostic = new SupabaseDiagnostic();
  diagnostic.runDiagnostic().catch(console.error);
}

module.exports = SupabaseDiagnostic;