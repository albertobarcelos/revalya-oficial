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

async function createCredential(type: string, name: string, data: any) {
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

export async function setupCredentials() {
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