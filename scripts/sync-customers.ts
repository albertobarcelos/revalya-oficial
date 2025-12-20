import dotenv from 'dotenv';
import { asaasService } from '../src/services/asaas';
import { supabase } from '../src/config/supabase';

dotenv.config();

async function syncCustomers() {
  try {
    console.log('Iniciando sincronização de clientes...\n');
    
    const { data: customers } = await asaasService.listCustomers();
    
    for (const customer of customers) {
      const { error } = await supabase
        .from('customers')
        .upsert({
          asaas_id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || customer.mobilePhone,
          cpf_cnpj: customer.cpfCnpj,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          postal_code: customer.postalCode,
          notes: customer.observations,
          status: customer.deleted ? 'inactive' : 'active',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'asaas_id'
        });

      if (error) {
        console.error(`Erro ao atualizar cliente ${customer.name}:`, error);
      } else {
        console.log(`Cliente ${customer.name} atualizado com sucesso`);
      }
    }

    console.log('\nSincronização concluída!');
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
    process.exit(1);
  }
}

syncCustomers();