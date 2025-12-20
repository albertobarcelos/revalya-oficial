import dotenv from 'dotenv';
import { AsaasService } from '../src/services/asaas';

dotenv.config();

async function listCustomers() {
  try {
    console.log('Buscando clientes...\n');
    
    const { data: customers, totalCount } = await AsaasService.listCustomers();
    
    console.log(`Total de clientes: ${totalCount}\n`);
    
    customers.forEach(customer => {
      console.log(`Nome: ${customer.name}`);
      console.log(`CPF/CNPJ: ${customer.cpfCnpj}`);
      console.log(`Email: ${customer.email || 'Não informado'}`);
      console.log(`Telefone: ${customer.phone || 'Não informado'}`);
      console.log('----------------------------------------\n');
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error.response?.data || error.message);
  }
}

listCustomers();
