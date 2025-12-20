/**
 * Script para Aplicar Correções do Supabase
 * Corrige automaticamente as configurações incorretas identificadas
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurações corretas do projeto REVALYA
const CORRECT_CONFIG = {
  PROJECT_ID: 'wyehpiutzvwplllumgdk',
  URL: 'https://wyehpiutzvwplllumgdk.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY'
};

// URLs incorretas conhecidas (outras que não sejam do Revalya)
const INCORRECT_URLS = [
  'https://nakavvhhfbsfyocdfzsc.supabase.co',
  'nakavvhhfbsfyocdfzsc.supabase.co',
  'nakavvhhfbsfyocdfzsc'
];

class SupabaseFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.backupPath = path.join(this.projectRoot, '.env.backup');
    this.fixesApplied = [];
  }

  /**
   * Executa todas as correções
   */
  async applyAllFixes() {
    console.log('🔧 Iniciando aplicação de correções...');
    console.log('=' .repeat(50));

    try {
      // Fazer backup do .env atual
      await this.backupEnvFile();

      // Corrigir arquivo .env
      await this.fixEnvFile();

      // Gerar script de limpeza de cache
      await this.generateCacheCleanScript();

      // Exibir resumo
      this.displaySummary();

      // Instruções finais
      this.displayFinalInstructions();

    } catch (error) {
      console.error('❌ Erro ao aplicar correções:', error.message);
      await this.restoreBackup();
    }
  }

  /**
   * Faz backup do arquivo .env atual
   */
  async backupEnvFile() {
    if (fs.existsSync(this.envPath)) {
      console.log('💾 Fazendo backup do arquivo .env...');
      fs.copyFileSync(this.envPath, this.backupPath);
      console.log(`✅ Backup criado: ${this.backupPath}`);
    }
  }

  /**
   * Corrige o arquivo .env
   */
  async fixEnvFile() {
    console.log('📝 Corrigindo arquivo .env...');

    let envContent = '';
    let hasChanges = false;

    if (fs.existsSync(this.envPath)) {
      envContent = fs.readFileSync(this.envPath, 'utf8');
    } else {
      console.log('📄 Arquivo .env não existe, criando novo...');
      envContent = this.createDefaultEnvContent();
      hasChanges = true;
    }

    // Corrigir URLs incorretas
    INCORRECT_URLS.forEach(incorrectUrl => {
      if (envContent.includes(incorrectUrl)) {
        console.log(`🔄 Substituindo URL incorreta: ${incorrectUrl}`);
        envContent = envContent.replace(new RegExp(incorrectUrl, 'g'), CORRECT_CONFIG.URL.replace('https://', ''));
        hasChanges = true;
        this.fixesApplied.push(`URL corrigida: ${incorrectUrl} → ${CORRECT_CONFIG.URL}`);
      }
    });

    // Verificar e corrigir VITE_SUPABASE_URL
    const urlRegex = /VITE_SUPABASE_URL\s*=\s*(.+)/;
    const urlMatch = envContent.match(urlRegex);
    
    if (urlMatch) {
      const currentUrl = urlMatch[1].trim();
      if (currentUrl !== CORRECT_CONFIG.URL) {
        console.log(`🔄 Corrigindo VITE_SUPABASE_URL: ${currentUrl} → ${CORRECT_CONFIG.URL}`);
        envContent = envContent.replace(urlRegex, `VITE_SUPABASE_URL=${CORRECT_CONFIG.URL}`);
        hasChanges = true;
        this.fixesApplied.push(`VITE_SUPABASE_URL corrigida`);
      }
    } else {
      console.log('➕ Adicionando VITE_SUPABASE_URL...');
      envContent += `\nVITE_SUPABASE_URL=${CORRECT_CONFIG.URL}`;
      hasChanges = true;
      this.fixesApplied.push('VITE_SUPABASE_URL adicionada');
    }

    // Verificar chave anônima
    const hasAnonKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');

    if (!hasAnonKey) {
      console.log('➕ Adicionando chave anônima Supabase...');
      envContent += `\nVITE_SUPABASE_ANON_KEY=${CORRECT_CONFIG.ANON_KEY}`;
      hasChanges = true;
      this.fixesApplied.push('Chave anônima Supabase adicionada');
    }

    // Salvar arquivo se houve mudanças
    if (hasChanges) {
      fs.writeFileSync(this.envPath, envContent);
      console.log('✅ Arquivo .env corrigido e salvo');
    } else {
      console.log('ℹ️ Nenhuma correção necessária no .env');
    }
  }

  /**
   * Cria conteúdo padrão para .env
   */
  createDefaultEnvContent() {
    return `# =====================================================
# CONFIGURAÇÕES DO SUPABASE
# =====================================================

# URL do projeto Supabase
VITE_SUPABASE_URL=${CORRECT_CONFIG.URL}

# Chave anônima do Supabase
VITE_SUPABASE_ANON_KEY=${CORRECT_CONFIG.ANON_KEY}

# =====================================================
# CONFIGURAÇÕES DE DESENVOLVIMENTO
# =====================================================

# Modo de desenvolvimento
VITE_DEV_MODE=true

# URL base da aplicação
VITE_APP_URL=http://localhost:8080
`;
  }

  /**
   * Gera script de limpeza de cache
   */
  async generateCacheCleanScript() {
    console.log('📄 Gerando script de limpeza de cache...');

    const script = `// Script para limpar cache do Supabase
// Execute no console do navegador (F12 → Console)

console.log('🧹 Limpando cache do Supabase...');

// Limpar localStorage relacionado ao Supabase
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    console.log('Removendo do localStorage:', key);
    localStorage.removeItem(key);
  }
});

// Limpar sessionStorage relacionado ao Supabase
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
    console.log('Removendo do sessionStorage:', key);
    sessionStorage.removeItem(key);
  }
});

// Limpar cookies relacionados
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Cache limpo! Recarregue a página (Ctrl+F5 ou Cmd+Shift+R)');
console.log('🔄 Se o problema persistir, feche e abra o navegador novamente.');
`;

    const scriptPath = path.join(this.projectRoot, 'scripts', 'limpar-cache-navegador.js');
    fs.writeFileSync(scriptPath, script);
    console.log(`✅ Script criado: ${scriptPath}`);
    this.fixesApplied.push('Script de limpeza de cache criado');
  }

  /**
   * Restaura backup em caso de erro
   */
  async restoreBackup() {
    if (fs.existsSync(this.backupPath)) {
      console.log('🔄 Restaurando backup...');
      fs.copyFileSync(this.backupPath, this.envPath);
      console.log('✅ Backup restaurado');
    }
  }

  /**
   * Exibe resumo das correções aplicadas
   */
  displaySummary() {
    console.log('\n📊 Resumo das Correções Aplicadas');
    console.log('=' .repeat(50));

    if (this.fixesApplied.length === 0) {
      console.log('ℹ️ Nenhuma correção foi necessária');
      return;
    }

    this.fixesApplied.forEach((fix, index) => {
      console.log(`  ${index + 1}. ✅ ${fix}`);
    });

    console.log(`\n🎉 Total de correções aplicadas: ${this.fixesApplied.length}`);
  }

  /**
   * Exibe instruções finais
   */
  displayFinalInstructions() {
    console.log('\n🚀 Próximos Passos');
    console.log('=' .repeat(50));
    console.log('1. 🔄 Reinicie o servidor de desenvolvimento:');
    console.log('   npm run dev  ou  yarn dev');
    console.log('');
    console.log('2. 🧹 Limpe o cache do navegador:');
    console.log('   - Abra o console do navegador (F12)');
    console.log('   - Cole e execute o conteúdo do arquivo:');
    console.log('     scripts/limpar-cache-navegador.js');
    console.log('');
    console.log('3. 🔐 Teste o login novamente');
    console.log('');
    console.log('4. 📋 Se o problema persistir:');
    console.log('   - Verifique se as variáveis de ambiente estão carregadas');
    console.log('   - Confirme se o projeto Supabase está ativo');
    console.log('   - Execute: node scripts/diagnostico-supabase.cjs');
    console.log('');
    console.log('💾 Backup do .env original salvo em: .env.backup');
  }
}

// Executar correções se chamado diretamente
if (require.main === module) {
  const fixer = new SupabaseFixer();
  fixer.applyAllFixes().catch(console.error);
}

module.exports = SupabaseFixer;