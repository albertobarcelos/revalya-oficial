/**
 * Utilitário para cache local de contratos
 * Permite armazenar e recuperar contratos do localStorage
 * com verificação de segurança multi-tenant
 */

import { supabase } from '@/lib/supabase';
import { Contract } from '@/types/models/contract';

const CACHE_PREFIX = 'revalya_contract_cache_';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutos
const MAX_CACHED_CONTRACTS = 10; // Máximo de contratos em cache

// Interface para o item em cache
interface CachedContract {
  data: Contract;
  timestamp: number;
  tenantId: string;
}

// Interface para o registro de contratos acessados
interface ContractAccessRecord {
  id: string;
  timestamp: number;
  accessCount: number;
}

/**
 * Obtém o ID do tenant atual para verificações de segurança
 * AIDEV-NOTE: Função atualizada para não usar RPC antiga - agora obtém do URL diretamente
 */
export const getCurrentTenantId = async (): Promise<string | null> => {
  try {
    // Obter do URL (método direto para cache)
    const pathSegments = window.location.pathname.split('/');
    const slug = pathSegments[1];
    
    if (!slug || slug === 'login' || slug === 'admin' || slug === 'meus-aplicativos') {
      return null;
    }
    
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (tenantError || !tenantData) {
      return null;
    }
    
    return tenantData.id;
  } catch (error) {
    console.error('Erro ao obter tenant atual:', error);
    return null;
  }
};

/**
 * Salva um contrato no cache local
 */
export const cacheContract = async (contract: Contract): Promise<void> => {
  try {
    if (!contract || !contract.id) return;
    
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    
    // Só cacheamos se o contrato pertencer ao tenant atual (segurança)
    if (contract.tenant_id && contract.tenant_id !== tenantId) {
      console.warn('Tentativa de cache de contrato de outro tenant');
      return;
    }
    
    const cacheKey = `${CACHE_PREFIX}${contract.id}`;
    const cachedData: CachedContract = {
      data: contract,
      timestamp: Date.now(),
      tenantId
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    
    // Atualizar registro de acesso para manter só os mais acessados
    updateAccessRecord(contract.id);
    cleanupOldCache();
    
    console.log(`Contrato ${contract.id} armazenado em cache`);
  } catch (error) {
    console.error('Erro ao armazenar contrato em cache:', error);
  }
};

/**
 * Recupera um contrato do cache local
 */
export const getCachedContract = async (contractId: string): Promise<Contract | null> => {
  try {
    if (!contractId) return null;
    
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    
    const cacheKey = `${CACHE_PREFIX}${contractId}`;
    const cachedRaw = localStorage.getItem(cacheKey);
    
    if (!cachedRaw) return null;
    
    const cached: CachedContract = JSON.parse(cachedRaw);
    
    // Verificação de segurança: só retorna se for do mesmo tenant
    if (cached.tenantId !== tenantId) {
      console.warn('Tentativa de acesso a contrato em cache de outro tenant');
      localStorage.removeItem(cacheKey); // Remove para evitar vazamentos
      return null;
    }
    
    // Verificar idade do cache
    if (Date.now() - cached.timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    // Atualizar registro de acesso
    updateAccessRecord(contractId);
    
    console.log(`Contrato ${contractId} recuperado do cache`);
    return cached.data;
  } catch (error) {
    console.error('Erro ao recuperar contrato do cache:', error);
    return null;
  }
};

/**
 * Atualiza o registro de acesso dos contratos
 */
const updateAccessRecord = (contractId: string): void => {
  try {
    const recordKey = 'revalya_contract_access_record';
    const recordRaw = localStorage.getItem(recordKey);
    let records: ContractAccessRecord[] = [];
    
    if (recordRaw) {
      records = JSON.parse(recordRaw);
    }
    
    const existingIndex = records.findIndex(r => r.id === contractId);
    
    if (existingIndex >= 0) {
      // Atualizar contrato existente
      records[existingIndex] = {
        id: contractId,
        timestamp: Date.now(),
        accessCount: records[existingIndex].accessCount + 1
      };
    } else {
      // Adicionar novo registro
      records.push({
        id: contractId,
        timestamp: Date.now(),
        accessCount: 1
      });
    }
    
    localStorage.setItem(recordKey, JSON.stringify(records));
  } catch (error) {
    console.error('Erro ao atualizar registro de acesso:', error);
  }
};

/**
 * Limpa contratos antigos do cache, mantendo apenas os mais acessados
 */
const cleanupOldCache = (): void => {
  try {
    const recordKey = 'revalya_contract_access_record';
    const recordRaw = localStorage.getItem(recordKey);
    
    if (!recordRaw) return;
    
    let records: ContractAccessRecord[] = JSON.parse(recordRaw);
    
    // Ordenar pelo score (combinação de recência e frequência)
    records.sort((a, b) => {
      const recencyA = Math.max(0, 1 - (Date.now() - a.timestamp) / (7 * 24 * 60 * 60 * 1000));
      const recencyB = Math.max(0, 1 - (Date.now() - b.timestamp) / (7 * 24 * 60 * 60 * 1000));
      
      const scoreA = (0.7 * recencyA) + (0.3 * Math.min(1, a.accessCount / 10));
      const scoreB = (0.7 * recencyB) + (0.3 * Math.min(1, b.accessCount / 10));
      
      return scoreB - scoreA;
    });
    
    // Remover os que estão além do limite
    if (records.length > MAX_CACHED_CONTRACTS) {
      const toRemove = records.slice(MAX_CACHED_CONTRACTS);
      toRemove.forEach(record => {
        localStorage.removeItem(`${CACHE_PREFIX}${record.id}`);
      });
      
      records = records.slice(0, MAX_CACHED_CONTRACTS);
      localStorage.setItem(recordKey, JSON.stringify(records));
    }
  } catch (error) {
    console.error('Erro ao limpar cache antigo:', error);
  }
};

/**
 * Pré-carrega contratos frequentemente acessados
 */
export const prefetchFrequentContracts = async (): Promise<void> => {
  try {
    const recordKey = 'revalya_contract_access_record';
    const recordRaw = localStorage.getItem(recordKey);
    
    if (!recordRaw) return;
    
    const records: ContractAccessRecord[] = JSON.parse(recordRaw);
    
    // Ordenar por frequência
    records.sort((a, b) => b.accessCount - a.accessCount);
    
    // Pegar os 3 mais frequentes se acessados nos últimos 3 dias
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const topContracts = records
      .filter(r => r.timestamp > threeDaysAgo)
      .slice(0, 3);
      
    if (topContracts.length === 0) return;
    
    console.log(`Pré-carregando ${topContracts.length} contratos frequentes`);
    
    // Buscar do servidor em paralelo
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    
    // Não bloqueamos a UI, executamos em background
    Promise.all(
      topContracts.map(async (record) => {
        const cachedContract = await getCachedContract(record.id);
        
        // Só busca do servidor se não estiver em cache
        if (!cachedContract) {
          const { data: contract, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', record.id)
            .eq('tenant_id', tenantId)
            .single();
            
          if (!error && contract) {
            cacheContract(contract);
          }
        }
      })
    ).catch(error => {
      console.error('Erro ao pré-carregar contratos:', error);
    });
  } catch (error) {
    console.error('Erro ao prefetch de contratos frequentes:', error);
  }
};
