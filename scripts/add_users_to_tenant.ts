/**
 * Script para adicionar usuários ao tenant
 * 
 * Execução:
 * npx tsx scripts/add_users_to_tenant.ts
 * 
 * Ou configure as variáveis de ambiente e execute:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/add_users_to_tenant.ts
 */

import { createClient } from '@supabase/supabase-js';

const TENANT_ID = '5832173a-e3eb-4af0-b22c-863b8b917d28';
const USERS = [
  {
    email: 'alberto.melo@nexsyn.com.br',
    password: null, // Já existe, não precisa criar
    role: 'TENANT_USER' as const,
  },
  {
    email: 'Contato@consysa.com.br',
    password: '123456',
    role: 'TENANT_USER' as const,
  },
];

async function addUsersToTenant() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // AIDEV-NOTE: Usar service role key para operações administrativas
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🚀 Iniciando adição de usuários ao tenant...\n');

  for (const userConfig of USERS) {
    try {
      console.log(`\n📧 Processando: ${userConfig.email}`);

      // 1. Verificar se usuário existe
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        throw new Error(`Erro ao listar usuários: ${listError.message}`);
      }

      let userId = existingUsers?.users?.find(u => u.email === userConfig.email)?.id;

      // 2. Criar usuário se não existir
      if (!userId && userConfig.password) {
        console.log(`  ➕ Criando novo usuário...`);
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userConfig.email,
          password: userConfig.password,
          email_confirm: true, // Confirmar email automaticamente
          user_metadata: {
            name: userConfig.email.split('@')[0],
          },
        });

        if (createError) {
          throw new Error(`Erro ao criar usuário: ${createError.message}`);
        }

        userId = newUser.user?.id;
        console.log(`  ✅ Usuário criado com ID: ${userId}`);

        // AIDEV-NOTE: Sincronizar com public.users
        const { error: syncError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userConfig.email,
            user_role: 'TENANT_USER',
            name: userConfig.email.split('@')[0],
            active: true,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (syncError) {
          console.warn(`  ⚠️  Aviso ao sincronizar com public.users: ${syncError.message}`);
        } else {
          console.log(`  ✅ Usuário sincronizado com public.users`);
        }
      } else if (!userId) {
        throw new Error(`Usuário não encontrado e senha não fornecida para criar`);
      } else {
        console.log(`  ℹ️  Usuário já existe com ID: ${userId}`);
      }

      // 3. Verificar se já está no tenant
      const { data: existingTenantUser, error: checkError } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Erro ao verificar associação: ${checkError.message}`);
      }

      if (existingTenantUser) {
        console.log(`  ℹ️  Usuário já está associado ao tenant`);
      } else {
        // 4. Adicionar ao tenant
        console.log(`  ➕ Adicionando ao tenant...`);
        
        const { data: tenantUser, error: addError } = await supabase
          .from('tenant_users')
          .insert({
            tenant_id: TENANT_ID,
            user_id: userId,
            role: userConfig.role,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (addError) {
          throw new Error(`Erro ao adicionar ao tenant: ${addError.message}`);
        }

        console.log(`  ✅ Usuário adicionado ao tenant com sucesso!`);
      }

      console.log(`  ✨ ${userConfig.email} processado com sucesso!`);
    } catch (error: any) {
      console.error(`  ❌ Erro ao processar ${userConfig.email}:`, error.message);
      console.error(`     Detalhes:`, error);
    }
  }

  console.log(`\n🎉 Processo concluído!`);
}

// Executar script
addUsersToTenant()
  .then(() => {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

