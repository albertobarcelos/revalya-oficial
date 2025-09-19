import { supabase } from "@/config/supabase";
import { syncChargesWorkflow } from '@/n8n/workflows/sync-charges';
import { webhookWorkflow } from '@/n8n/workflows/webhook';
import { mainWorkflow } from '@/n8n/workflows/main';
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

async function getWorkflows() {
  try {
    const response = await n8nApi.get('/workflows');
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar workflows:', error.message);
    return [];
  }
}

async function deleteWorkflow(id: string) {
  try {
    await n8nApi.delete(`/workflows/${id}`);
    console.log(`Workflow ${id} removido`);
  } catch (error) {
    console.error(`Erro ao remover workflow ${id}:`, error.message);
  }
}

async function createWorkflow(workflow: any) {
  try {
    const response = await n8nApi.post('/workflows', workflow);
    console.log(`Workflow ${workflow.name} criado com ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao criar workflow ${workflow.name}:`, error.message);
    throw error;
  }
}

async function activateWorkflow(id: string) {
  try {
    await n8nApi.post(`/workflows/${id}/activate`);
    console.log(`Workflow ${id} ativado`);
  } catch (error) {
    console.error(`Erro ao ativar workflow ${id}:`, error.message);
  }
}

export async function setupWorkflows() {
  try {
    console.log('Configurando workflows...');

    const workflows = [
      mainWorkflow,
      webhookWorkflow,
      syncChargesWorkflow
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