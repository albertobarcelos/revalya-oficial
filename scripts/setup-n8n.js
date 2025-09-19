import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const N8N_URL = process.env.VITE_N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

// Cliente do N8N com autenticação
const n8nApi = axios.create({
  baseURL: `${N8N_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

async function getCredentials() {
  try {
    const response = await n8nApi.get('/credentials');
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar credenciais:', error.message);
    return [];
  }
}

async function createCredential(type, name, data) {
  try {
    const response = await n8nApi.post('/credentials', {
      name,
      type,
      data,
      nodesAccess: []
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao criar credencial ${name}:`, error.message);
    throw error;
  }
}

async function setupCredentials() {
  console.log('Configurando credenciais...');
  
  const credentials = await getCredentials();
  
  // Configurar credencial do Asaas se não existir
  const asaasCredName = 'Asaas API';
  if (!credentials.find(c => c.name === asaasCredName)) {
    await createCredential('httpBasicAuth', asaasCredName, {
      user: '',
      password: process.env.VITE_ASAAS_API_KEY
    });
    console.log('Credencial do Asaas criada');
  }

  // Configurar credencial do Pushover se não existir
  const pushoverCredName = 'Pushover';
  if (!credentials.find(c => c.name === pushoverCredName)) {
    await createCredential('pushoverApi', pushoverCredName, {
      token: process.env.VITE_PUSHOVER_TOKEN,
      user: process.env.VITE_PUSHOVER_USER
    });
    console.log('Credencial do Pushover criada');
  }
}

async function getWorkflows() {
  try {
    const response = await n8nApi.get('/workflows');
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar workflows:', error.message);
    return [];
  }
}

async function deleteWorkflow(id) {
  try {
    await n8nApi.delete(`/workflows/${id}`);
    console.log(`Workflow ${id} removido`);
  } catch (error) {
    console.error(`Erro ao remover workflow ${id}:`, error.message);
  }
}

async function createWorkflow(workflow) {
  try {
    const response = await n8nApi.post('/workflows', workflow);
    console.log(`Workflow ${workflow.name} criado com ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao criar workflow ${workflow.name}:`, error.message);
    throw error;
  }
}

async function activateWorkflow(id) {
  try {
    await n8nApi.post(`/workflows/${id}/activate`);
    console.log(`Workflow ${id} ativado`);
  } catch (error) {
    console.error(`Erro ao ativar workflow ${id}:`, error.message);
  }
}

async function setupWorkflows() {
  try {
    console.log('Configurando workflows...');

    // Importar definições dos workflows
    const workflowDefs = await import('./n8n-setup.js');
    const workflows = [
      workflowDefs.default.mainWorkflow,
      workflowDefs.default.webhookWorkflow
    ];

    // Remover workflows existentes
    const existingWorkflows = await getWorkflows();
    for (const workflow of existingWorkflows) {
      if (workflow.name.startsWith('Asaas')) {
        await deleteWorkflow(workflow.id);
      }
    }

    // Criar e ativar novos workflows
    for (const workflow of workflows) {
      const created = await createWorkflow(workflow);
      await activateWorkflow(created.id);
    }

    console.log('Workflows configurados com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar workflows:', error.message);
    process.exit(1);
  }
}

async function setupWebhooks() {
  try {
    console.log('Configurando webhooks...');
    
    // Obter todos os webhooks ativos
    const response = await n8nApi.get('/workflows/webhooks');
    const webhooks = response.data;
    
    console.log('Webhooks disponíveis:');
    webhooks.forEach(webhook => {
      console.log(`- ${webhook.path}: ${webhook.httpMethod}`);
    });
  } catch (error) {
    console.error('Erro ao configurar webhooks:', error.message);
  }
}

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
