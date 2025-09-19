import { setupCredentials } from './n8n/credentials';
import { setupWorkflows } from './n8n/workflows';
import { setupWebhooks } from './n8n/webhooks';

async function setup() {
  try {
    // 1. Configurar credenciais
    await setupCredentials();
    
    // 2. Configurar workflows
    await setupWorkflows();
    
    // 3. Configurar webhooks
    await setupWebhooks();
    
    console.log('\nConfiguração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a configuração:', error.message);
    process.exit(1);
  }
}

// Executar setup
setup();