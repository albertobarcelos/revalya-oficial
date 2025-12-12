/**
 * Script para criar usuário Contato@consysa.com.br usando edge function
 * 
 * Execução:
 * npx tsx scripts/create_user_contato.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wyehpiutzvwplllumgdk.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY não configurada!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createUser() {
  console.log('🚀 Criando usuário Contato@consysa.com.br...\n');

  try {
    const { data, error } = await supabase.functions.invoke('create-user-admin', {
      body: {
        email: 'Contato@consysa.com.br',
        password: '123456',
        tenantId: '5832173a-e3eb-4af0-b22c-863b8b917d28',
        role: 'TENANT_USER',
      },
    });

    if (error) {
      console.error('❌ Erro ao criar usuário:', error);
      process.exit(1);
    }

    if (data?.success) {
      console.log('✅ Usuário criado com sucesso!');
      console.log('   ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('\n✨ O usuário pode fazer login com:');
      console.log('   Email: Contato@consysa.com.br');
      console.log('   Senha: 123456');
    } else {
      console.error('❌ Falha ao criar usuário:', data?.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

createUser();

