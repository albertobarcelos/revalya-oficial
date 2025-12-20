// AIDEV-NOTE: Script para testar conectividade com a API Evolution
// Verifica se as credenciais estão funcionando e se a API está acessível

const EVOLUTION_API_URL = 'https://evolution.nexsyn.com.br';
const EVOLUTION_API_KEY = 'd93ec17f36bc03867215097fe2d9045907a0ad43f91892936656144412d1fa9a';

async function testEvolutionAPI() {
  console.log('🔍 Testando conectividade com a Evolution API...');
  console.log(`📡 URL: ${EVOLUTION_API_URL}`);
  console.log(`🔑 API Key: ${EVOLUTION_API_KEY.substring(0, 10)}...`);
  
  try {
    // Teste 1: Verificar se a API está online
    console.log('\n1️⃣ Testando se a API está online...');
    const healthResponse = await fetch(`${EVOLUTION_API_URL}/manager/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    console.log(`Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('✅ API está online!');
      console.log('Resposta:', healthData);
    } else {
      console.log('❌ API não está respondendo corretamente');
      console.log('Resposta:', await healthResponse.text());
    }
    
    // Teste 2: Listar instâncias existentes
    console.log('\n2️⃣ Listando instâncias existentes...');
    const instancesResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    console.log(`Status: ${instancesResponse.status}`);
    if (instancesResponse.ok) {
      const instancesData = await instancesResponse.json();
      console.log('✅ Instâncias listadas com sucesso!');
      console.log('Instâncias encontradas:', instancesData.length || 0);
      if (instancesData.length > 0) {
        console.log('Primeiras 3 instâncias:');
        instancesData.slice(0, 3).forEach((instance, index) => {
          console.log(`  ${index + 1}. ${instance.instance?.instanceName || instance.instanceName || 'Nome não disponível'}`);
        });
      }
    } else {
      console.log('❌ Erro ao listar instâncias');
      console.log('Resposta:', await instancesResponse.text());
    }
    
    // Teste 3: Verificar instância específica do tenant jaturat
    console.log('\n3️⃣ Verificando instância específica para jaturat...');
    const instanceName = 'jaturat-whatsapp';
    const instanceResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    console.log(`Status: ${instanceResponse.status}`);
    if (instanceResponse.ok) {
      const instanceData = await instanceResponse.json();
      console.log('✅ Estado da instância obtido!');
      console.log('Estado:', instanceData);
    } else if (instanceResponse.status === 404) {
      console.log('ℹ️ Instância não existe (esperado para primeiro uso)');
    } else {
      console.log('❌ Erro ao verificar instância');
      console.log('Resposta:', await instanceResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar o teste
testEvolutionAPI().then(() => {
  console.log('\n🏁 Teste concluído!');
}).catch(error => {
  console.error('💥 Erro fatal:', error);
});