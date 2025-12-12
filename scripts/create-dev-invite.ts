/**
 * Script para criar convite de desenvolvimento local
 * 
 * Uso:
 *   npx tsx scripts/create-dev-invite.ts
 *   ou
 *   npm run dev:create-invite
 * 
 * Este script cria um convite válido no banco local e exibe o link completo
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
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

interface CreateInviteOptions {
  email?: string;
  tenantId?: string;
  role?: 'TENANT_USER' | 'TENANT_ADMIN';
}

async function createDevInvite(options: CreateInviteOptions = {}) {
  const {
    email = 'dev@teste.com',
    tenantId,
    role = 'TENANT_ADMIN'
  } = options;

  try {
    console.log('🔍 Buscando tenant...');
    
    // Buscar tenant (usar o fornecido ou o primeiro disponível)
    let finalTenantId = tenantId;
    
    if (!finalTenantId) {
      const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .limit(1);
      
      if (tenantError || !tenants || tenants.length === 0) {
        throw new Error('Nenhum tenant encontrado. Crie um tenant primeiro.');
      }
      
      finalTenantId = tenants[0].id;
      console.log(`✅ Tenant encontrado: ${tenants[0].name} (${tenants[0].slug})`);
    }

    // Buscar um usuário para usar como invited_by
    console.log('🔍 Buscando usuário para invited_by...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      // Se não houver usuários, usar um UUID genérico (para dev apenas)
      console.warn('⚠️  Nenhum usuário encontrado. Usando UUID genérico para invited_by.');
      const genericUserId = '00000000-0000-0000-0000-000000000000';
      
      // Deletar convites antigos para este email
      await supabase
        .from('tenant_invites')
        .delete()
        .eq('email', email)
        .eq('status', 'PENDING');
      
      // Gerar token único
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Válido por 30 dias
      
      // Criar convite
      const { data: invite, error: inviteError } = await supabase
        .from('tenant_invites')
        .insert({
          tenant_id: finalTenantId,
          email,
          role,
          status: 'PENDING',
          invited_by: genericUserId,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      
      if (inviteError) {
        throw inviteError;
      }
      
      const localUrl = `http://localhost:5173/register?token=${token}`;
      
      console.log('\n========================================');
      console.log('✅ Convite de desenvolvimento criado!');
      console.log('========================================');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Token: ${token}`);
      console.log(`🔗 URL Local: ${localUrl}`);
      console.log('========================================\n');
      
      return { token, email, url: localUrl };
    }
    
    const invitedBy = users[0].id;
    console.log(`✅ Usuário encontrado: ${users[0].email}`);
    
    // Deletar convites antigos para este email
    console.log('🧹 Limpando convites antigos...');
    await supabase
      .from('tenant_invites')
      .delete()
      .eq('email', email)
      .eq('status', 'PENDING');
    
    // Gerar token único
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Válido por 30 dias
    
    // Criar convite
    console.log('📝 Criando convite...');
    const { data: invite, error: inviteError } = await supabase
      .from('tenant_invites')
      .insert({
        tenant_id: finalTenantId,
        email,
        role,
        status: 'PENDING',
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    
    if (inviteError) {
      throw inviteError;
    }
    
    const localUrl = `http://localhost:5173/register?token=${token}`;
    
    console.log('\n========================================');
    console.log('✅ Convite de desenvolvimento criado!');
    console.log('========================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`🔗 URL Local: ${localUrl}`);
    console.log('========================================\n');
    
    return { token, email, url: localUrl };
    
  } catch (error: any) {
    console.error('❌ Erro ao criar convite:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
  const tenantId = args.find(arg => arg.startsWith('--tenant='))?.split('=')[1];
  const role = args.find(arg => arg.startsWith('--role='))?.split('=')[1] as 'TENANT_USER' | 'TENANT_ADMIN' | undefined;
  
  createDevInvite({
    email,
    tenantId,
    role: role || 'TENANT_ADMIN'
  });
}

export { createDevInvite };

