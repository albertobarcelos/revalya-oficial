/**
 * Script de validação de tenants
 * 
 * Este script verifica a integridade dos tenants no sistema e pode:
 * 1. Listar todos os tenants com seus status
 * 2. Identificar tenants inativos com usuários ainda associados
 * 3. Listar acessos de usuários a tenants inativos
 * 
 * Para executar:
 * npx ts-node scripts/tenant-validation.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

// Criar cliente Supabase a partir de variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  user_count: number;
}

interface UserTenantInfo {
  user_id: string;
  user_email: string;
  tenant_id: string;
  tenant_name: string;
  tenant_active: boolean;
  role: string;
}

/**
 * Lista todos os tenants com informações básicas e contagem de usuários
 */
async function listAllTenants(): Promise<TenantInfo[]> {
  console.log('Listando todos os tenants...');
  
  // Busca todos os tenants com contagem de usuários
  const { data, error } = await supabase.rpc('get_all_tenants_with_user_count');
  
  if (error) {
    console.error('Erro ao listar tenants:', error);
    return [];
  }
  
  // Se a função RPC não existir, cria-a
  if (!data) {
    console.log('Função RPC não encontrada, criando...');
    await createHelperFunctions();
    return listAllTenants();
  }
  
  console.log(`Total de ${data.length} tenants encontrados.`);
  return data as TenantInfo[];
}

/**
 * Identifica tenants inativos que ainda têm usuários associados
 */
async function findInactiveTenantWithUsers(): Promise<TenantInfo[]> {
  const allTenants = await listAllTenants();
  const inactiveWithUsers = allTenants.filter(t => !t.active && t.user_count > 0);
  
  console.log(`\nEncontrados ${inactiveWithUsers.length} tenants inativos com usuários:`);
  inactiveWithUsers.forEach(t => {
    console.log(`- ${t.name} (${t.slug}): ${t.user_count} usuários associados`);
  });
  
  return inactiveWithUsers;
}

/**
 * Lista todos os usuários associados a tenants inativos
 */
async function listUsersInInactiveTenants(): Promise<UserTenantInfo[]> {
  console.log('\nBuscando usuários em tenants inativos...');
  
  const { data, error } = await supabase.rpc('get_users_in_inactive_tenants');
  
  if (error) {
    console.error('Erro ao buscar usuários em tenants inativos:', error);
    return [];
  }
  
  // Se a função RPC não existir, cria-a
  if (!data) {
    console.log('Função RPC não encontrada, criando...');
    await createHelperFunctions();
    return listUsersInInactiveTenants();
  }
  
  console.log(`Total de ${data.length} acessos de usuários a tenants inativos.`);
  return data as UserTenantInfo[];
}

/**
 * Cria as funções RPC auxiliares necessárias
 */
async function createHelperFunctions(): Promise<void> {
  const { error } = await supabase.rpc('admin_create_tenant_validation_functions');
  
  if (error) {
    console.error('Erro ao criar funções auxiliares:', error);
    
    // Se a função admin não existir, cria as funções diretamente
    const sqlFilePath = path.join(__dirname, '../supabase/migrations/tenant_validation_functions.sql');
    
    // Verifica se o diretório existe, se não, cria
    const dir = path.dirname(sqlFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Cria o arquivo SQL com as funções
    fs.writeFileSync(sqlFilePath, createValidationFunctionsSQL());
    console.log(`Arquivo SQL criado em ${sqlFilePath}. Execute-o manualmente no banco de dados.`);
  } else {
    console.log('Funções auxiliares criadas com sucesso!');
  }
}

/**
 * SQL para criar as funções de validação de tenant
 */
function createValidationFunctionsSQL(): string {
  return `-- Funções para validação de tenants

-- Função que retorna todos os tenants com contagem de usuários
CREATE OR REPLACE FUNCTION public.get_all_tenants_with_user_count()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  active boolean,
  created_at timestamptz,
  user_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.active,
    t.created_at,
    COUNT(tu.user_id)::bigint as user_count
  FROM 
    tenants t
    LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
  GROUP BY 
    t.id
  ORDER BY 
    t.active DESC, t.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função que lista usuários em tenants inativos
CREATE OR REPLACE FUNCTION public.get_users_in_inactive_tenants()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  tenant_id uuid,
  tenant_name text,
  tenant_active boolean,
  role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    t.id as tenant_id,
    t.name as tenant_name,
    t.active as tenant_active,
    tu.role
  FROM 
    tenant_users tu
    JOIN auth.users au ON tu.user_id = au.id
    JOIN tenants t ON tu.tenant_id = t.id
  WHERE 
    t.active = false
  ORDER BY 
    au.email, t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função administrativa para criar as funções acima
CREATE OR REPLACE FUNCTION public.admin_create_tenant_validation_functions()
RETURNS boolean AS $$
BEGIN
  -- Esta função é apenas um wrapper para as outras
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_all_tenants_with_user_count() IS 'Retorna todos os tenants com contagem de usuários';
COMMENT ON FUNCTION public.get_users_in_inactive_tenants() IS 'Lista usuários em tenants inativos';
`;
}

/**
 * Gera um relatório completo de validação de tenants
 */
async function generateTenantValidationReport(): Promise<void> {
  console.log('=== RELATÓRIO DE VALIDAÇÃO DE TENANTS ===\n');
  
  // 1. Lista todos os tenants
  const allTenants = await listAllTenants();
  
  // 2. Encontra tenants inativos com usuários
  const inactiveWithUsers = await findInactiveTenantWithUsers();
  
  // 3. Lista usuários em tenants inativos
  const usersInInactiveTenants = await listUsersInInactiveTenants();
  
  // 4. Gera estatísticas
  const activeTenants = allTenants.filter(t => t.active);
  const inactiveTenants = allTenants.filter(t => !t.active);
  
  console.log('\n=== ESTATÍSTICAS ===');
  console.log(`Total de tenants: ${allTenants.length}`);
  console.log(`Tenants ativos: ${activeTenants.length}`);
  console.log(`Tenants inativos: ${inactiveTenants.length}`);
  console.log(`Tenants inativos com usuários: ${inactiveWithUsers.length}`);
  console.log(`Usuários com acesso a tenants inativos: ${usersInInactiveTenants.length}`);
  
  // 5. Salva relatório em arquivo
  const reportData = {
    timestamp: new Date().toISOString(),
    statistics: {
      totalTenants: allTenants.length,
      activeTenants: activeTenants.length,
      inactiveTenants: inactiveTenants.length,
      inactiveTenantsWithUsers: inactiveWithUsers.length,
      usersInInactiveTenants: usersInInactiveTenants.length
    },
    inactiveTenantsWithUsers,
    usersInInactiveTenants
  };
  
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `tenant-validation-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(`\nRelatório salvo em ${reportPath}`);
}

// Execução principal
(async () => {
  try {
    await generateTenantValidationReport();
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    process.exit(1);
  }
})();
