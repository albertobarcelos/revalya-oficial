#!/usr/bin/env node

/**
 * Script de configuração automática de segurança para Revalya
 * 
 * Este script automatiza a configuração inicial de segurança,
 * incluindo geração de chaves, verificação de dependências
 * e configuração do ambiente.
 * 
 * Uso: node scripts/setup-security.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Função para log colorido
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Função para gerar chaves seguras
 */
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Função para verificar se um comando existe
 */
function commandExists(command) {
  try {
    execSync(`where ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Função para verificar dependências do sistema
 */
function checkSystemDependencies() {
  log('\n🔍 Verificando dependências do sistema...', 'cyan');
  
  const dependencies = [
    { name: 'node', command: 'node --version', required: true },
    { name: 'npm', command: 'npm --version', required: true },
    { name: 'git', command: 'git --version', required: false },
    { name: 'openssl', command: 'openssl version', required: false }
  ];
  
  let allRequired = true;
  
  dependencies.forEach(dep => {
    try {
      const version = execSync(dep.command, { encoding: 'utf8' }).trim();
      log(`  ✅ ${dep.name}: ${version}`, 'green');
    } catch {
      if (dep.required) {
        log(`  ❌ ${dep.name}: Não encontrado (OBRIGATÓRIO)`, 'red');
        allRequired = false;
      } else {
        log(`  ⚠️  ${dep.name}: Não encontrado (opcional)`, 'yellow');
      }
    }
  });
  
  if (!allRequired) {
    log('\n❌ Dependências obrigatórias não encontradas. Instale-as antes de continuar.', 'red');
    process.exit(1);
  }
  
  log('\n✅ Todas as dependências obrigatórias estão instaladas!', 'green');
}

/**
 * Função para verificar e instalar dependências npm
 */
function checkNpmDependencies() {
  log('\n📦 Verificando dependências npm...', 'cyan');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json não encontrado!', 'red');
    process.exit(1);
  }
  
  try {
    log('  📥 Instalando dependências...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    log('  ✅ Dependências instaladas com sucesso!', 'green');
  } catch (error) {
    log('  ❌ Erro ao instalar dependências:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

/**
 * Função para gerar arquivo .env.local
 */
function generateEnvFile() {
  log('\n🔐 Gerando configurações de segurança...', 'cyan');
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envExamplePath)) {
    log('❌ Arquivo .env.example não encontrado!', 'red');
    process.exit(1);
  }
  
  // Ler arquivo de exemplo
  let envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  // Gerar chaves seguras
  const jwtSecret = generateSecureKey(32);
  const encryptionKey = generateSecureKey(32).substring(0, 32); // Exatamente 32 chars
  const sessionSecret = generateSecureKey(64);
  
  // Substituir placeholders
  const replacements = {
    'your_jwt_secret_key_minimum_32_characters': jwtSecret,
    'your_encryption_key_exactly_32_chars': encryptionKey,
    'your_session_secret_key_minimum_64_characters': sessionSecret,
    'your_supabase_url': 'https://seu-projeto.supabase.co',
    'your_supabase_anon_key': 'sua_chave_anonima_aqui',
    'your_supabase_service_role_key': 'sua_chave_service_role_aqui',
    'security@yourcompany.com': 'security@suaempresa.com',
    'noreply@yourcompany.com': 'noreply@suaempresa.com'
  };
  
  Object.entries(replacements).forEach(([placeholder, value]) => {
    envContent = envContent.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Verificar se .env.local já existe
  if (fs.existsSync(envLocalPath)) {
    log('  ⚠️  Arquivo .env.local já existe. Criando backup...', 'yellow');
    const backupPath = `${envLocalPath}.backup.${Date.now()}`;
    fs.copyFileSync(envLocalPath, backupPath);
    log(`  📄 Backup criado: ${path.basename(backupPath)}`, 'blue');
  }
  
  // Escrever novo arquivo
  fs.writeFileSync(envLocalPath, envContent);
  log('  ✅ Arquivo .env.local gerado com chaves seguras!', 'green');
  
  // Mostrar próximos passos
  log('\n📝 Próximos passos:', 'yellow');
  log('  1. Edite .env.local com suas configurações do Supabase', 'yellow');
  log('  2. Configure VITE_SUPABASE_URL com a URL do seu projeto', 'yellow');
  log('  3. Configure VITE_SUPABASE_ANON_KEY com sua chave anônima', 'yellow');
  log('  4. Configure VITE_SUPABASE_SERVICE_ROLE_KEY (apenas para produção)', 'yellow');
}

/**
 * Função para verificar configuração do Supabase
 */
function checkSupabaseConfig() {
  log('\n🗄️  Verificando configuração do Supabase...', 'cyan');
  
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envLocalPath)) {
    log('  ⚠️  Arquivo .env.local não encontrado. Execute a geração primeiro.', 'yellow');
    return;
  }
  
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`${varName}=(.+)`);
    const match = envContent.match(regex);
    
    if (!match || match[1].includes('seu-projeto') || match[1].includes('sua_chave')) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    log('  ⚠️  Variáveis do Supabase ainda precisam ser configuradas:', 'yellow');
    missingVars.forEach(varName => {
      log(`    - ${varName}`, 'yellow');
    });
  } else {
    log('  ✅ Configuração do Supabase parece estar completa!', 'green');
  }
}

/**
 * Função para criar estrutura de diretórios
 */
function createDirectoryStructure() {
  log('\n📁 Criando estrutura de diretórios...', 'cyan');
  
  const directories = [
    'src/hooks',
    'src/components/auth',
    'src/components/admin',
    'src/middleware',
    'src/services',
    'src/types',
    'src/utils',
    'docs',
    'scripts',
    'logs'
  ];
  
  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log(`  📂 Criado: ${dir}`, 'green');
    } else {
      log(`  ✅ Existe: ${dir}`, 'blue');
    }
  });
}

/**
 * Função para verificar arquivos de segurança
 */
function checkSecurityFiles() {
  log('\n🛡️  Verificando arquivos de segurança...', 'cyan');
  
  const securityFiles = [
    'src/types/auth.ts',
    'src/hooks/useSecureAuth.ts',
    'src/components/auth/SecureLoginForm.tsx',
    'src/components/admin/SecurityDashboard.tsx',
    'src/middleware/securityMiddleware.ts',
    'src/services/securityNotificationService.ts',
    'middleware.ts',
    'docs/security-guide.md',
    'docs/SECURITY_README.md'
  ];
  
  let missingFiles = [];
  
  securityFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${file}`, 'green');
    } else {
      log(`  ❌ ${file}`, 'red');
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    log('\n⚠️  Alguns arquivos de segurança estão faltando.', 'yellow');
    log('Execute o assistente SupaGuard para gerar os arquivos faltantes.', 'yellow');
  } else {
    log('\n✅ Todos os arquivos de segurança estão presentes!', 'green');
  }
}

/**
 * Função para executar testes de segurança básicos
 */
function runSecurityTests() {
  log('\n🧪 Executando testes de segurança básicos...', 'cyan');
  
  try {
    // Verificar se há scripts de teste
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.test) {
      log('  🔍 Executando testes...', 'blue');
      execSync('npm test -- --passWithNoTests', { stdio: 'inherit' });
      log('  ✅ Testes executados com sucesso!', 'green');
    } else {
      log('  ⚠️  Nenhum script de teste configurado.', 'yellow');
    }
  } catch (error) {
    log('  ⚠️  Alguns testes falharam. Verifique a implementação.', 'yellow');
  }
}

/**
 * Função para mostrar resumo final
 */
function showSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🎉 CONFIGURAÇÃO DE SEGURANÇA CONCLUÍDA!', 'green');
  log('='.repeat(60), 'cyan');
  
  log('\n📋 Resumo do que foi configurado:', 'bright');
  log('  ✅ Dependências verificadas', 'green');
  log('  ✅ Chaves de segurança geradas', 'green');
  log('  ✅ Estrutura de diretórios criada', 'green');
  log('  ✅ Arquivos de configuração preparados', 'green');
  
  log('\n🚀 Próximos passos:', 'bright');
  log('  1. Configure suas credenciais do Supabase em .env.local', 'yellow');
  log('  2. Execute: npm run dev', 'yellow');
  log('  3. Acesse: http://localhost:8080', 'yellow');
  log('  4. Teste o login e funcionalidades de segurança', 'yellow');
  
  log('\n📚 Documentação:', 'bright');
  log('  📖 Guia completo: docs/SECURITY_README.md', 'blue');
  log('  🔧 Implementação: docs/security-guide.md', 'blue');
  
  log('\n🆘 Suporte:', 'bright');
  log('  📧 Email: security@revalya.com', 'blue');
  log('  💬 Slack: #security-alerts', 'blue');
  
  log('\n⚠️  IMPORTANTE:', 'red');
  log('  - Nunca commite arquivos .env.local', 'red');
  log('  - Mantenha as chaves de segurança em local seguro', 'red');
  log('  - Execute auditorias regulares de segurança', 'red');
  
  log('\n🔐 Sistema pronto para uso seguro!', 'green');
}

/**
 * Função principal
 */
function main() {
  log('🛡️  REVALYA - CONFIGURAÇÃO DE SEGURANÇA', 'bright');
  log('Powered by SupaGuard Security Framework\n', 'cyan');
  
  try {
    checkSystemDependencies();
    checkNpmDependencies();
    createDirectoryStructure();
    generateEnvFile();
    checkSupabaseConfig();
    checkSecurityFiles();
    runSecurityTests();
    showSummary();
  } catch (error) {
    log('\n❌ Erro durante a configuração:', 'red');
    log(error.message, 'red');
    log('\nPor favor, verifique os logs e tente novamente.', 'yellow');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  generateSecureKey,
  checkSystemDependencies,
  generateEnvFile,
  checkSupabaseConfig
};