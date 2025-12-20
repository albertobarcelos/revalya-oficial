const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

async function checkContracts() {
  const { data, error } = await supabase
    .from('contracts')
    .select('contract_number, id')
    .eq('tenant_id', 'c9ed4c60-0b15-4d21-9c99-1d55e5b3e5f0')
    .order('contract_number', { ascending: true })
    .limit(50);
  
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  console.log('Primeiros 50 contratos no banco:');
  data.forEach(contract => {
    console.log(`Contract Number: ${contract.contract_number}, ID: ${contract.id}`);
  });
  
  console.log(`Total de contratos: ${data.length}`);
}

checkContracts();