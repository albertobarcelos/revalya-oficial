// AIDEV-NOTE: Script de diagnóstico para Evolution API
// Baseado na documentação de troubleshooting do sistema

const EVOLUTION_API_BASE_URL = "https://evolution.nexsyn.com.br";
const EVOLUTION_API_KEY = "d93ec17f36bc03867215097fe2d9045907a0ad43f91892936656144412d1fa9a";
const EVOLUTION_INSTANCE = "revalya-jaturat";

/**
 * Testa a conectividade básica com a Evolution API
 */
async function testBasicConnectivity() {
  console.log("🔍 Testando conectividade básica com Evolution API...");
  console.log(`URL: ${EVOLUTION_API_BASE_URL}`);
  
  try {
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na API: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log("✅ Conectividade OK");
    console.log("Instâncias encontradas:", data.length || 0);
    
    if (Array.isArray(data)) {
      data.forEach(instance => {
        console.log(`  - ${instance.instanceName}: ${instance.connectionStatus || 'unknown'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Erro de conectividade: ${error.message}`);
    return false;
  }
}

/**
 * Verifica se a instância específica existe
 */
async function checkInstanceExists(instanceName) {
  console.log(`\n🔍 Verificando instância: ${instanceName}`);
  
  try {
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log("❌ Instância não encontrada");
      return false;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao verificar instância: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log("✅ Instância encontrada");
    console.log("Status:", data.instance?.connectionStatus || 'unknown');
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao verificar instância: ${error.message}`);
    return false;
  }
}

/**
 * Testa o envio de uma mensagem de teste
 */
async function testMessageSending(instanceName) {
  console.log(`\n🔍 Testando envio de mensagem via ${instanceName}`);
  
  // Número de teste (formato brasileiro)
  const testNumber = "5565999745637";
  const testMessage = "Teste de conectividade - Evolution API";
  
  try {
    const response = await fetch(`${EVOLUTION_API_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: testNumber,
        text: testMessage
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro no envio: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log("✅ Endpoint de envio respondeu corretamente");
    console.log("Response:", JSON.stringify(data, null, 2));
    
    return true;
  } catch (error) {
    console.error(`❌ Erro no teste de envio: ${error.message}`);
    return false;
  }
}

/**
 * Verifica a configuração das variáveis de ambiente
 */
function checkEnvironmentConfig() {
  console.log("\n🔍 Verificando configuração de ambiente...");
  
  const checks = [
    { name: 'EVOLUTION_API_BASE_URL', value: EVOLUTION_API_BASE_URL },
    { name: 'EVOLUTION_API_KEY', value: EVOLUTION_API_KEY ? '***configurada***' : null },
    { name: 'EVOLUTION_INSTANCE', value: EVOLUTION_INSTANCE }
  ];
  
  let allOk = true;
  
  checks.forEach(check => {
    if (!check.value) {
      console.log(`❌ ${check.name}: não configurada`);
      allOk = false;
    } else {
      console.log(`✅ ${check.name}: ${check.value}`);
    }
  });
  
  return allOk;
}

/**
 * Diagnóstico completo
 */
async function runFullDiagnosis() {
  console.log("🚀 Iniciando diagnóstico completo da Evolution API\n");
  
  const results = {
    environmentConfig: false,
    basicConnectivity: false,
    instanceExists: false,
    messageSending: false
  };
  
  // 1. Verificar configuração
  results.environmentConfig = checkEnvironmentConfig();
  
  if (!results.environmentConfig) {
    console.log("\n❌ Configuração de ambiente inválida. Abortando diagnóstico.");
    return results;
  }
  
  // 2. Testar conectividade básica
  results.basicConnectivity = await testBasicConnectivity();
  
  if (!results.basicConnectivity) {
    console.log("\n❌ Falha na conectividade básica. Verifique URL e API Key.");
    return results;
  }
  
  // 3. Verificar instância
  results.instanceExists = await checkInstanceExists(EVOLUTION_INSTANCE);
  
  // 4. Testar envio (mesmo se instância não existir, para ver o erro)
  results.messageSending = await testMessageSending(EVOLUTION_INSTANCE);
  
  // Resumo final
  console.log("\n📊 RESUMO DO DIAGNÓSTICO:");
  console.log("========================");
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'OK' : 'FALHOU'}`);
  });
  
  // Recomendações
  console.log("\n💡 RECOMENDAÇÕES:");
  if (!results.instanceExists) {
    console.log("- Criar instância 'revalya-default' na Evolution API");
    console.log("- Verificar se o nome da instância está correto");
  }
  
  if (!results.messageSending) {
    console.log("- Verificar se a instância está conectada ao WhatsApp");
    console.log("- Confirmar se o número de teste é válido");
  }
  
  return results;
}

// Executar diagnóstico
runFullDiagnosis().catch(console.error);