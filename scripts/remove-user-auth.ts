/**
 * Script para remover usuário do Supabase Auth
 * Email: kleverson.jara@revalya.com.br
 * 
 * Uso:
 *   npx tsx scripts/remove-user-auth.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   Certifique-se de ter VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configuradas');
  process.exit(1);
}

// Criar cliente Supabase com service role key (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USER_EMAIL = 'kleverson.jara@revalya.com.br';

async function removeUserFromAuth() {
  try {
    console.log('🔍 Buscando usuário no Auth...');
    
    // Listar usuários para encontrar o ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    const user = users.find(u => u.email === USER_EMAIL);
    
    if (!user) {
      console.log('✅ Usuário não encontrado no Auth (já foi removido ou nunca existiu)');
      return;
    }
    
    console.log(`✅ Usuário encontrado no Auth:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Criado em: ${user.created_at}`);
    
    console.log('\n🗑️  Removendo usuário do Auth...');
    
    // Remover do Auth usando Admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log('\n========================================');
    console.log('✅ Usuário removido do Auth com sucesso!');
    console.log('========================================');
    console.log(`Email: ${USER_EMAIL}`);
    console.log(`ID: ${user.id}`);
    console.log('========================================\n');
    
  } catch (error: any) {
    console.error('❌ Erro ao remover usuário do Auth:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
removeUserFromAuth();

export { removeUserFromAuth };

