/**
 * Utilitário para migração e padronização de chaves do localStorage relacionadas a tenant
 * AIDEV-NOTE: Este arquivo resolve duplicações de chaves como tenantId vs current-tenant-id
 * e garante consistência no armazenamento de dados de tenant
 */

/**
 * Chaves padronizadas para dados de tenant no localStorage
 * AIDEV-NOTE: Estas são as chaves oficiais que devem ser usadas em todo o sistema
 */
export const TENANT_STORAGE_KEYS = {
  TENANT_ID: 'tenantId',
  TENANT_NAME: 'tenantName', 
  TENANT_SLUG: 'tenantSlug',
  PORTAL_TYPE: 'portalType',
  RESELLER_ID: 'resellerId'
} as const;

/**
 * Chaves legadas que devem ser migradas
 * AIDEV-NOTE: Estas chaves antigas serão removidas após migração
 */
const LEGACY_KEYS = {
  CURRENT_TENANT_ID: 'current-tenant-id',
  CURRENT_TENANT_NAME: 'current-tenant-name',
  CURRENT_TENANT_SLUG: 'current-tenant-slug'
} as const;

/**
 * Migra dados de chaves legadas para chaves padronizadas
 * AIDEV-NOTE: Esta função deve ser executada na inicialização da aplicação
 * para garantir que dados antigos sejam preservados
 */
export function migrateTenantKeys(): void {
  try {
    // Migrar current-tenant-id para tenantId
    const legacyTenantId = localStorage.getItem(LEGACY_KEYS.CURRENT_TENANT_ID);
    if (legacyTenantId && !localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_ID)) {
      localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_ID, legacyTenantId);
      localStorage.removeItem(LEGACY_KEYS.CURRENT_TENANT_ID);
      console.log('[TenantKeyMigration] Migrado current-tenant-id para tenantId');
    }

    // Migrar current-tenant-name para tenantName
    const legacyTenantName = localStorage.getItem(LEGACY_KEYS.CURRENT_TENANT_NAME);
    if (legacyTenantName && !localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_NAME)) {
      localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_NAME, legacyTenantName);
      localStorage.removeItem(LEGACY_KEYS.CURRENT_TENANT_NAME);
      console.log('[TenantKeyMigration] Migrado current-tenant-name para tenantName');
    }

    // Migrar current-tenant-slug para tenantSlug
    const legacyTenantSlug = localStorage.getItem(LEGACY_KEYS.CURRENT_TENANT_SLUG);
    if (legacyTenantSlug && !localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_SLUG)) {
      localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_SLUG, legacyTenantSlug);
      localStorage.removeItem(LEGACY_KEYS.CURRENT_TENANT_SLUG);
      console.log('[TenantKeyMigration] Migrado current-tenant-slug para tenantSlug');
    }

    console.log('[TenantKeyMigration] Migração de chaves concluída');
  } catch (error) {
    console.error('[TenantKeyMigration] Erro durante migração:', error);
  }
}

/**
 * Obtém dados de tenant usando chaves padronizadas
 * AIDEV-NOTE: Esta função deve ser usada em vez de acessar localStorage diretamente
 */
export function getTenantData() {
  return {
    tenantId: localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_ID),
    tenantName: localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_NAME),
    tenantSlug: localStorage.getItem(TENANT_STORAGE_KEYS.TENANT_SLUG),
    portalType: localStorage.getItem(TENANT_STORAGE_KEYS.PORTAL_TYPE),
    resellerId: localStorage.getItem(TENANT_STORAGE_KEYS.RESELLER_ID)
  };
}

/**
 * Define dados de tenant usando chaves padronizadas
 * AIDEV-NOTE: Esta função garante que apenas chaves padronizadas sejam usadas
 */
export function setTenantData(data: {
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  portalType?: string;
  resellerId?: string;
}): void {
  try {
    if (data.tenantId !== undefined) {
      if (data.tenantId) {
        localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_ID, data.tenantId);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEYS.TENANT_ID);
      }
    }

    if (data.tenantName !== undefined) {
      if (data.tenantName) {
        localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_NAME, data.tenantName);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEYS.TENANT_NAME);
      }
    }

    if (data.tenantSlug !== undefined) {
      if (data.tenantSlug) {
        localStorage.setItem(TENANT_STORAGE_KEYS.TENANT_SLUG, data.tenantSlug);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEYS.TENANT_SLUG);
      }
    }

    if (data.portalType !== undefined) {
      if (data.portalType) {
        localStorage.setItem(TENANT_STORAGE_KEYS.PORTAL_TYPE, data.portalType);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEYS.PORTAL_TYPE);
      }
    }

    if (data.resellerId !== undefined) {
      if (data.resellerId) {
        localStorage.setItem(TENANT_STORAGE_KEYS.RESELLER_ID, data.resellerId);
      } else {
        localStorage.removeItem(TENANT_STORAGE_KEYS.RESELLER_ID);
      }
    }

    console.log('[TenantKeyMigration] Dados de tenant atualizados:', data);
  } catch (error) {
    console.error('[TenantKeyMigration] Erro ao definir dados de tenant:', error);
  }
}

/**
 * Limpa todos os dados de tenant do localStorage
 * AIDEV-NOTE: Esta função deve ser usada no logout para garantir limpeza completa
 */
export function clearTenantData(): void {
  try {
    Object.values(TENANT_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Limpar também chaves legadas caso ainda existam
    Object.values(LEGACY_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[TenantKeyMigration] Dados de tenant limpos');
  } catch (error) {
    console.error('[TenantKeyMigration] Erro ao limpar dados de tenant:', error);
  }
}
