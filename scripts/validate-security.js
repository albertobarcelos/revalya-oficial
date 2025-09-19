#!/usr/bin/env node

/**
 * Script de Validação de Segurança - Revalya
 * 
 * Este script verifica se todas as configurações de segurança estão
 * corretamente implementadas e se não há vulnerabilidades conhecidas.
 * 
 * @author SupaGuard Security Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Função para log colorido
 * @param {string} message - Mensagem a ser exibida
 * @param {string} color - Cor da mensagem
 */
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Verifica se um arquivo existe
 * @param {string} filePath - Caminho do arquivo
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Verifica se uma variável de ambiente está definida
 * @param {string} varName - Nome da variável
 * @returns {boolean}
 */
function envVarExists(varName) {
  return process.env[varName] !== undefined && process.env[varName] !== '';
}

/**
 * Verifica a força de uma chave/senha
 * @param {string} key - Chave a ser verificada
 * @returns {object}
 */
function checkKeyStrength(key) {
  if (!key) return { strong: false, reason: 'Chave não definida' };
  
  if (key.length < 32) {
    return { strong: false, reason: 'Chave muito curta (mínimo 32 caracteres)' };
  }
  
  const hasUpperCase = /[A-Z]/.test(key);
  const hasLowerCase = /[a-z]/.test(key);
  const hasNumbers = /\d/.test(key);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(key);
  
  const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars]
    .filter(Boolean).length;
  
  if (criteriaCount < 3) {
    return { 
      strong: false, 
      reason: 'Chave deve conter pelo menos 3 tipos de caracteres (maiúscula, minúscula, número, especial)' 
    };
  }
  
  return { strong: true, reason: 'Chave forte' };
}

/**
 * Executa auditoria de dependências npm
 * @returns {object}
 */
function runNpmAudit() {
  try {
    log('🔍 Executando auditoria de dependências...', 'blue');
    const result = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(result);
    
    return {
      success: true,
      vulnerabilities: auditData.metadata?.vulnerabilities || {},
      totalVulnerabilities: auditData.metadata?.vulnerabilities?.total || 0
    };
  } catch (error) {
    // npm audit retorna código de saída não-zero quando há vulnerabilidades
    try {
      const auditData = JSON.parse(error.stdout);
      return {
        success: false,
        vulnerabilities: auditData.metadata?.vulnerabilities || {},
        totalVulnerabilities: auditData.metadata?.vulnerabilities?.total || 0
      };
    } catch {
      return {
        success: false,
        error: 'Erro ao executar npm audit',
        totalVulnerabilities: 0
      };
    }
  }
}

/**
 * Verifica configurações de segurança
 * @returns {object}
 */
function validateSecurityConfig() {
  const results = {
    files: [],
    envVars: [],
    keys: [],
    overall: true
  };
  
  // Arquivos obrigatórios de segurança
  const requiredFiles = [
    '.env.example',
    'src/lib/security/authConfig.ts',
    'src/lib/security/jwtUtils.ts',
    'src/lib/security/rateLimiter.ts',
    'src/lib/security/deviceTracker.ts',
    'src/services/securityNotificationService.ts',
    'middleware.ts',
    'docs/SECURITY_README.md'
  ];
  
  log('📁 Verificando arquivos de segurança...', 'blue');
  requiredFiles.forEach(file => {
    const exists = fileExists(file);
    results.files.push({ file, exists });
    
    if (exists) {
      log(`  ✅ ${file}`, 'green');
    } else {
      log(`  ❌ ${file} - AUSENTE`, 'red');
      results.overall = false;
    }
  });
  
  // Variáveis de ambiente críticas
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET_KEY',
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
  ];
  
  log('\n🔐 Verificando variáveis de ambiente...', 'blue');
  
  // Carrega .env.local se existir
  const envLocalPath = '.env.local';
  if (fileExists(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
  }
  
  requiredEnvVars.forEach(envVar => {
    const exists = envVarExists(envVar);
    results.envVars.push({ envVar, exists });
    
    if (exists) {
      log(`  ✅ ${envVar}`, 'green');
      
      // Verifica força das chaves
      if (envVar.includes('SECRET') || envVar.includes('KEY')) {
        const keyStrength = checkKeyStrength(process.env[envVar]);
        results.keys.push({ key: envVar, ...keyStrength });
        
        if (keyStrength.strong) {
          log(`    ✅ Chave forte`, 'green');
        } else {
          log(`    ⚠️  ${keyStrength.reason}`, 'yellow');
        }
      }
    } else {
      log(`  ❌ ${envVar} - NÃO DEFINIDA`, 'red');
      results.overall = false;
    }
  });
  
  return results;
}

/**
 * Verifica configurações do Supabase
 * @returns {object}
 */
function validateSupabaseConfig() {
  log('\n🗄️  Verificando configuração do Supabase...', 'blue');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  const results = {
    urlValid: false,
    keyValid: false,
    overall: true
  };
  
  // Verifica URL do Supabase
  if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
    results.urlValid = true;
    log('  ✅ URL do Supabase válida', 'green');
  } else {
    log('  ❌ URL do Supabase inválida', 'red');
    results.overall = false;
  }
  
  // Verifica chave anônima
  if (supabaseAnonKey && supabaseAnonKey.length > 100) {
    results.keyValid = true;
    log('  ✅ Chave anônima do Supabase válida', 'green');
  } else {
    log('  ❌ Chave anônima do Supabase inválida', 'red');
    results.overall = false;
  }
  
  return results;
}

/**
 * Verifica configurações de TypeScript
 * @returns {object}
 */
function validateTypeScriptConfig() {
  log('\n📝 Verificando configuração do TypeScript...', 'blue');
  
  const results = {
    configExists: false,
    strictMode: false,
    overall: true
  };
  
  if (fileExists('tsconfig.json')) {
    results.configExists = true;
    log('  ✅ tsconfig.json encontrado', 'green');
    
    try {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      
      if (tsConfig.compilerOptions?.strict === true) {
        results.strictMode = true;
        log('  ✅ Modo strict habilitado', 'green');
      } else {
        log('  ⚠️  Modo strict não habilitado', 'yellow');
      }
    } catch (error) {
      log('  ❌ Erro ao ler tsconfig.json', 'red');
      results.overall = false;
    }
  } else {
    log('  ❌ tsconfig.json não encontrado', 'red');
    results.overall = false;
  }
  
  return results;
}

/**
 * Função principal
 */
function main() {
  log('🛡️  VALIDAÇÃO DE SEGURANÇA - REVALYA', 'cyan');
  log('=====================================\n', 'cyan');
  
  const startTime = Date.now();
  
  // Executa todas as validações
  const securityConfig = validateSecurityConfig();
  const supabaseConfig = validateSupabaseConfig();
  const typescriptConfig = validateTypeScriptConfig();
  const npmAudit = runNpmAudit();
  
  // Relatório final
  log('\n📊 RELATÓRIO FINAL', 'magenta');
  log('==================', 'magenta');
  
  const allPassed = securityConfig.overall && 
                   supabaseConfig.overall && 
                   typescriptConfig.overall && 
                   npmAudit.totalVulnerabilities === 0;
  
  if (allPassed) {
    log('\n🎉 TODAS AS VERIFICAÇÕES PASSARAM!', 'green');
    log('✅ Configuração de segurança está correta', 'green');
  } else {
    log('\n⚠️  ALGUMAS VERIFICAÇÕES FALHARAM', 'yellow');
    
    if (!securityConfig.overall) {
      log('❌ Configuração de segurança incompleta', 'red');
    }
    
    if (!supabaseConfig.overall) {
      log('❌ Configuração do Supabase incorreta', 'red');
    }
    
    if (!typescriptConfig.overall) {
      log('❌ Configuração do TypeScript incorreta', 'red');
    }
    
    if (npmAudit.totalVulnerabilities > 0) {
      log(`❌ ${npmAudit.totalVulnerabilities} vulnerabilidades encontradas`, 'red');
    }
  }
  
  // Estatísticas
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  log(`\n⏱️  Validação concluída em ${duration}s`, 'blue');
  
  // Próximos passos
  if (!allPassed) {
    log('\n🔧 PRÓXIMOS PASSOS:', 'yellow');
    log('1. Execute: npm run setup:security', 'yellow');
    log('2. Configure as variáveis de ambiente em .env.local', 'yellow');
    log('3. Execute: npm audit fix', 'yellow');
    log('4. Execute novamente: npm run security:validate', 'yellow');
  }
  
  // Código de saída
  process.exit(allPassed ? 0 : 1);
}

// Executa apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  validateSecurityConfig,
  validateSupabaseConfig,
  validateTypeScriptConfig,
  runNpmAudit,
  checkKeyStrength
};