import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const N8N_URL = process.env.VITE_N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

const n8nApi = axios.create({
  baseURL: `${N8N_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

export async function setupWebhooks() {
  try {
    console.log('Configurando webhooks...');
    
    // Obter todos os webhooks ativos
    const response = await n8nApi.get('/workflows/webhooks');
    const webhooks = response.data;
    
    console.log('Webhooks disponíveis:');
    webhooks.forEach((webhook: any) => {
      console.log(`- ${webhook.path}: ${webhook.httpMethod}`);
    });
  } catch (error) {
    console.error('Erro ao configurar webhooks:', error);
  }
}