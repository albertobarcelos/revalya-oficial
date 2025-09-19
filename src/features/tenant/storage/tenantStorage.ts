/**
 * AIDEV-NOTE: Utilitário para gerenciar armazenamento local específico por tenant
 * Evita vazamento de dados entre tenants ao usar chaves específicas
 */

import { logService } from '@/services/logService';

const MODULE_NAME = 'TenantStorage';

/**
 * AIDEV-NOTE: Gera chave específica do tenant para localStorage
 * @param tenantId - ID do tenant atual
 * @param key - Chave base para o armazenamento
 * @returns Chave específica do tenant
 */
const getTenantSpecificKey = (tenantId: string, key: string): string => {
  return `${key}-tenant-${tenantId}`;
};

/**
 * AIDEV-NOTE: Salva dados específicos do tenant no localStorage
 * @param tenantId - ID do tenant atual
 * @param key - Chave base para o armazenamento
 * @param data - Dados a serem salvos
 */
export const setTenantData = (tenantId: string, key: string, data: any): void => {
  try {
    if (!tenantId) {
      logService.error(MODULE_NAME, 'Tentativa de salvar dados sem tenant ID', { key });
      return;
    }
    
    const tenantSpecificKey = getTenantSpecificKey(tenantId, key);
    const serializedData = JSON.stringify(data);
    
    localStorage.setItem(tenantSpecificKey, serializedData);
    logService.info(MODULE_NAME, `Dados salvos para tenant: ${tenantId}`, { key });
  } catch (error) {
    logService.error(MODULE_NAME, 'Erro ao salvar dados do tenant', { error, tenantId, key });
  }
};

/**
 * AIDEV-NOTE: Recupera dados específicos do tenant do localStorage
 * @param tenantId - ID do tenant atual
 * @param key - Chave base para o armazenamento
 * @param defaultValue - Valor padrão se não encontrar dados
 * @returns Dados do tenant ou valor padrão
 */
export const getTenantData = <T>(tenantId: string, key: string, defaultValue: T | null = null): T | null => {
  try {
    if (!tenantId) {
      logService.error(MODULE_NAME, 'Tentativa de carregar dados sem tenant ID', { key });
      return defaultValue;
    }
    
    const tenantSpecificKey = getTenantSpecificKey(tenantId, key);
    const serializedData = localStorage.getItem(tenantSpecificKey);
    
    if (!serializedData) {
      logService.info(MODULE_NAME, `Nenhum dado encontrado para tenant: ${tenantId}`, { key });
      return defaultValue;
    }
    
    const data = JSON.parse(serializedData);
    logService.info(MODULE_NAME, `Dados carregados para tenant: ${tenantId}`, { key });
    return data;
  } catch (error) {
    logService.error(MODULE_NAME, 'Erro ao carregar dados do tenant', { error, tenantId, key });
    return defaultValue;
  }
};

/**
 * AIDEV-NOTE: Remove dados específicos do tenant do localStorage
 * @param tenantId - ID do tenant atual
 * @param key - Chave base para o armazenamento
 */
export const removeTenantData = (tenantId: string, key: string): void => {
  try {
    if (!tenantId) {
      logService.error(MODULE_NAME, 'Tentativa de remover dados sem tenant ID', { key });
      return;
    }
    
    const tenantSpecificKey = getTenantSpecificKey(tenantId, key);
    localStorage.removeItem(tenantSpecificKey);
    logService.info(MODULE_NAME, `Dados removidos para tenant: ${tenantId}`, { key });
  } catch (error) {
    logService.error(MODULE_NAME, 'Erro ao remover dados do tenant', { error, tenantId, key });
  }
};

/**
 * AIDEV-NOTE: Limpa todos os dados de um tenant específico
 * @param tenantId - ID do tenant a ser limpo
 */
export const clearTenantData = (tenantId: string): void => {
  try {
    if (!tenantId) {
      logService.error(MODULE_NAME, 'Tentativa de limpar dados sem tenant ID');
      return;
    }
    
    const keysToRemove: string[] = [];
    
    // Encontrar todas as chaves relacionadas ao tenant
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(`-tenant-${tenantId}`)) {
        keysToRemove.push(key);
      }
    }
    
    // Remover todas as chaves encontradas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    logService.info(MODULE_NAME, `Dados limpos para tenant: ${tenantId}`, { 
      removedKeys: keysToRemove.length 
    });
  } catch (error) {
    logService.error(MODULE_NAME, 'Erro ao limpar dados do tenant', { error, tenantId });
  }
};

/**
 * AIDEV-NOTE: Migra dados existentes para o formato específico do tenant
 * @param tenantId - ID do tenant atual
 * @param oldKey - Chave antiga (sem tenant)
 * @param newKey - Nova chave base (será convertida para específica do tenant)
 */
export const migrateTenantData = (tenantId: string, oldKey: string, newKey: string): void => {
  try {
    if (!tenantId) {
      logService.error(MODULE_NAME, 'Tentativa de migrar dados sem tenant ID', { oldKey, newKey });
      return;
    }
    
    const oldData = localStorage.getItem(oldKey);
    if (oldData) {
      const tenantSpecificKey = getTenantSpecificKey(tenantId, newKey);
      localStorage.setItem(tenantSpecificKey, oldData);
      localStorage.removeItem(oldKey);
      
      logService.info(MODULE_NAME, `Dados migrados para tenant: ${tenantId}`, { 
        from: oldKey, 
        to: tenantSpecificKey 
      });
    }
  } catch (error) {
    logService.error(MODULE_NAME, 'Erro ao migrar dados do tenant', { 
      error, 
      tenantId, 
      oldKey, 
      newKey 
    });
  }
};
