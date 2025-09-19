/**
 * Script para migrar dados entre a arquitetura antiga e a nova
 * 
 * Este script lê dados da arquitetura antiga e transfere para a nova,
 * permitindo uma migração suave sem perda de dados.
 */

import { createClient } from '@supabase/supabase-js';

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Função principal para executar a migração
 */
async function migrateTenantArchitecture() {
  console.log('Iniciando migração da arquitetura de tenants...');
  
  try {
    // 1. Ler dados da storage atual
    console.log('Lendo dados dos storages atuais...');
    const localStorageData = readLocalStorageData();
    const sessionStorageData = readSessionStorageData();
    
    // 2. Migrar dados para o novo formato
    console.log('Migrando dados para o novo formato...');
    const migratedData = transformData(localStorageData, sessionStorageData);
    
    // 3. Salvar dados no novo formato
    console.log('Salvando dados no novo formato...');
    saveNewStorageData(migratedData);
    
    console.log('Migração concluída com sucesso!');
    return {
      success: true,
      message: 'Migração concluída com sucesso!'
    };
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return {
      success: false,
      message: 'Falha na migração',
      error
    };
  }
}

/**
 * Lê dados do localStorage atual
 */
function readLocalStorageData() {
  const data: Record<string, any> = {};
  
  // Ler dados relacionados ao tenant e portal
  const keys = [
    'portalType',
    'tenantId',
    'tenantSlug',
    'tenantName',
    'tenantData',
    'tenantUsers',
    'userRole'
  ];
  
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    } catch (error) {
      console.warn(`Erro ao ler ${key} do localStorage:`, error);
      const rawValue = localStorage.getItem(key);
      data[key] = rawValue; // Salvar como string
    }
  });
  
  return data;
}

/**
 * Lê dados do sessionStorage atual
 */
function readSessionStorageData() {
  const data: Record<string, any> = {};
  
  // Ler dados relacionados ao tenant e portal
  const keys = [
    'portalType',
    'tenantId',
    'tenantSlug',
    'tenantName',
    'tenantContext',
    'authToken'
  ];
  
  keys.forEach(key => {
    try {
      const value = sessionStorage.getItem(key);
      if (value) {
        data[key] = JSON.parse(value);
      }
    } catch (error) {
      console.warn(`Erro ao ler ${key} do sessionStorage:`, error);
      const rawValue = sessionStorage.getItem(key);
      data[key] = rawValue; // Salvar como string
    }
  });
  
  return data;
}

/**
 * Transforma os dados para o novo formato
 */
function transformData(localData: Record<string, any>, sessionData: Record<string, any>) {
  // Estrutura para os dados transformados
  const transformed = {
    tenant: {
      tenant: null as any,
      userRole: null as any,
      isLoading: false,
      error: null
    },
    auth: {
      user: null as any,
      isAuthenticated: false,
      isLoading: false,
      error: null
    }
  };
  
  // Transformar dados do tenant
  if (localData.tenantId || sessionData.tenantId) {
    transformed.tenant.tenant = {
      id: localData.tenantId || sessionData.tenantId,
      name: localData.tenantName || sessionData.tenantName || '',
      slug: localData.tenantSlug || sessionData.tenantSlug || '',
      active: true,
      logo: localData.tenantData?.logo || null
    };
    
    transformed.tenant.userRole = localData.userRole || 'USER';
  }
  
  // Transformar dados de autenticação
  // Isso depende da estrutura específica dos dados de autenticação
  
  return transformed;
}

/**
 * Salva os dados no novo formato de armazenamento
 */
function saveNewStorageData(data: any) {
  // Salvar dados do tenant
  if (data.tenant.tenant) {
    sessionStorage.setItem('app.tenant.context', JSON.stringify(data.tenant));
    localStorage.setItem('app.tenant.id', data.tenant.tenant.id);
    localStorage.setItem('app.tenant.slug', data.tenant.tenant.slug);
  }
  
  // Outros dados seriam salvos conforme a estrutura da nova arquitetura
}

// Exportar função principal
export default migrateTenantArchitecture;

// Executar se for chamado diretamente
if (require.main === module) {
  migrateTenantArchitecture()
    .then(result => {
      if (result.success) {
        console.log(result.message);
        process.exit(0);
      } else {
        console.error(result.message, result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Falha ao executar migração:', error);
      process.exit(1);
    });
}
