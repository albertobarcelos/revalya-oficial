import { supabase } from '@/lib/supabase';
import {
  SimpleTenant,
  TenantBySlugResponse,
  TenantEvent,
  TenantResult,
  UserTenantResponse
} from './types';
import { PostgrestError } from '@supabase/supabase-js';
import { PersistenceManager } from '../storage/persistenceManager';
import { logDebug, logError, logWarn } from '@/lib/logger';
import '@/lib/supabase-rpc.d.ts';
// import { tenantCache, tenantStatusCache } from '../utils/cacheManager'; // Comentado temporariamente

// Cache temporário desabilitado - será reimplementado posteriormente
const tenantCache = new Map();
const tenantStatusCache = new Map();

// Definir tipo para as tabelas do banco de dados
type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          active: boolean;
          branding?: {
            logo_url?: string;
            theme?: any;
          };
          created_at: string;
          updated_at: string;
        };
      };
      tenant_users: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};

/**
 * Gerenciador simplificado de tenants
 * Responsável por:
 * - Carregar tenant atual
 * - Alternar entre tenants
 * - Verificar se tenant está ativo
 * - Obter lista de tenants do usuário
 * - Sincronizar estado entre abas
 */
class SimpleTenantManager {
  private currentTenant: SimpleTenant | null = null;
  private listeners: { [key: string]: Array<(data?: any) => void> } = {};
  private stopSyncListener: (() => void) | null = null;
  private activeTenantCache = new Map<string, boolean>();

  constructor() {
    this.initSyncBetweenTabs();
  }

  /**
   * Configura sincronização entre abas do navegador
   */
  private initSyncBetweenTabs(): void {
    // Registrar listener para sincronização entre abas
    this.stopSyncListener = PersistenceManager.listenForStateChanges((key, data) => {
      if (key === PersistenceManager.storageKeys.tenant) {
        // Atualizar estado local apenas se diferente
        if (JSON.stringify(this.currentTenant) !== JSON.stringify(data)) {
          logDebug('[SimpleTenantManager] Atualizando tenant de outra aba');
          this.currentTenant = data;
          this.notifyListeners(TenantEvent.TENANT_CHANGED, this.currentTenant);
        }
      }
    });

    // Verificar ao voltar para a aba
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        logDebug('[SimpleTenantManager] Aba visível, verificando tenant');
        this.refreshStateFromStorage();
      }
    });
  }

  /**
   * Atualiza estado local a partir do storage
   */
  private refreshStateFromStorage(): void {
    const storedTenant = PersistenceManager.getState<SimpleTenant>(
      PersistenceManager.storageKeys.tenant
    );
    
    if (storedTenant && JSON.stringify(this.currentTenant) !== JSON.stringify(storedTenant)) {
      this.currentTenant = storedTenant;
      this.notifyListeners(TenantEvent.TENANT_CHANGED, this.currentTenant);
    }
  }

  /**
   * Inicializa o gerenciador de tenants seguindo um fluxo lógico com fallbacks:
   * 1. Tenta recuperar contexto do storage local
   * 2. Se falhar, tenta extrair tenant do JWT
   * 3. Se ainda falhar, tenta extrair slug da URL e usar switchTenantBySlug
   */
  async initialize(): Promise<TenantResult> {
    logDebug('[SimpleTenantManager] Inicializando gerenciador de tenants');
    
    try {
      // ETAPA 1: Tenta recuperar do PersistenceManager
      logDebug('[SimpleTenantManager] Tentando recuperar tenant do storage');
      const savedTenant = PersistenceManager.getState<SimpleTenant>(PersistenceManager.storageKeys.tenant);
      
      if (savedTenant) {
        try {
          // O savedTenant já é um objeto, pois o PersistenceManager já fez o parse
          const tenant = savedTenant;
          
          if (tenant && tenant.id) {
            // Verifica se o tenant está ativo antes de usar
            logDebug('[SimpleTenantManager] Verificando se tenant do storage está ativo:', tenant.id);
            const isActive = await this.isTenantActive(tenant.id);
            
            if (isActive) {
              logDebug('[SimpleTenantManager] Tenant ativo recuperado do storage:', tenant.name);
              this.currentTenant = tenant;
              this.notifyListeners(TenantEvent.TENANT_LOADED, tenant);
              this.notifyListeners(TenantEvent.TENANT_RECOVERED, tenant);
              return { success: true, tenant };
            } else {
              logWarn('[SimpleTenantManager] Tenant inativo no storage, removendo:', tenant.name);
              PersistenceManager.saveState(PersistenceManager.storageKeys.tenant, null);
              // Continuamos para próxima etapa
            }
          }
        } catch (error) {
          logError('[SimpleTenantManager] Erro ao processar tenant do storage:', error);
          PersistenceManager.saveState(PersistenceManager.storageKeys.tenant, null);
          // Continuamos para próxima etapa
        }
      }
      
      // ETAPA 2: Tentar verificar JWT para obter tenant (não implementado neste exemplo)
      // Aqui poderia ter lógica para verificar claims no JWT
      console.log('[SimpleTenantManager] Nenhum tenant válido encontrado no localStorage');
      
      // ETAPA 3: Tentar extrair slug da URL (para implementação em aplicações com URL contendo tenant)
      // Implementação omitida, seria específica para o formato de URL da aplicação
      
      // Nenhuma das etapas teve sucesso
      console.log('[SimpleTenantManager] Inicialização sem tenant selecionado');
      return { 
        success: false, 
        error: 'Nenhum tenant encontrado. Por favor, selecione um tenant.' 
      };
    } catch (error) {
      console.error('[SimpleTenantManager] Erro ao inicializar gerenciador de tenants:', error);
      return { success: false, error: 'Erro ao inicializar gerenciador de tenants' };
    }
  }

  /**
   * Verifica se um tenant está ativo
   * Verifica primeiro o cache local e depois faz uma consulta ao banco
   */
  async isTenantActive(tenantId: string): Promise<boolean> {
    try {
      // FASE 1: Verificar cache otimizado primeiro (mais rápido) - TEMPORARIAMENTE DESABILITADO
      // if (tenantStatusCache.has(tenantId)) {
      //   const isActive = tenantStatusCache.get(tenantId);
      //   logDebug(`[SimpleTenantManager] Tenant ${tenantId} encontrado no cache otimizado, status: ${isActive ? 'ativo' : 'inativo'}`);
      //   return isActive || false;
      // }
      
      // FASE 2: Verificar cache de tenant completo - TEMPORARIAMENTE DESABILITADO
      // if (tenantCache.has(tenantId)) {
      //   const cachedTenant = tenantCache.get(tenantId);
      //   if (cachedTenant) {
      //     const isActive = cachedTenant.active || false;
      //     logDebug(`[SimpleTenantManager] Tenant ${tenantId} encontrado no cache de objetos, status: ${isActive ? 'ativo' : 'inativo'}`);
      //     tenantStatusCache.set(tenantId, isActive); // Atualizar cache de status
      //     return isActive;
      //   }
      // }
      
      // FASE 3: Verificar memória local da instância
      if (this.currentTenant && this.currentTenant.id === tenantId) {
        const isActive = this.currentTenant.active || false;
        logDebug(`[SimpleTenantManager] Tenant ${tenantId} é o atual, status: ${isActive ? 'ativo' : 'inativo'}`);
        // tenantStatusCache.set(tenantId, isActive); // Cache temporariamente desabilitado
        return isActive;
      }
      
      // FASE 4: Verificar se temos dados no PersistenceManager
      try {
        const storedTenant = PersistenceManager.getState<SimpleTenant>(PersistenceManager.storageKeys.tenant);
        
        if (storedTenant && typeof storedTenant === 'object' && storedTenant.id === tenantId) {
          const isActive = storedTenant.active || false;
          logDebug(`[SimpleTenantManager] Tenant ${tenantId} encontrado no PersistenceManager, status: ${isActive ? 'ativo' : 'inativo'}`);
          // tenantStatusCache.set(tenantId, isActive); // Cache temporariamente desabilitado
          // tenantCache.set(tenantId, storedTenant); // Cache temporariamente desabilitado
          return isActive;
        }
      } catch (parseError) {
        logWarn('[SimpleTenantManager] Erro ao obter tenant do PersistenceManager:', parseError);
      }
      
      // Etapa 3: Consultar o banco de dados
      console.log('[SimpleTenantManager] Consultando banco para status do tenant:', tenantId);
      const { data, error } = await supabase
        .from('tenants')
        .select('active')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('[SimpleTenantManager] Erro ao verificar status do tenant no banco:', error);
        return false;
      }

      // Cast seguro do resultado
      const tenant = data as unknown as Database['public']['Tables']['tenants']['Row'];
      const isActive = tenant?.active === true;
      
      console.log('[SimpleTenantManager] Status do tenant obtido do banco:', 
        { id: tenantId, active: isActive });
      
      return isActive;
    } catch (error) {
      console.error('[SimpleTenantManager] Exceção ao verificar status do tenant:', error);
      // Em caso de falha, assumimos que o tenant está inativo por segurança
      return false;
    }
  }

  /**
   * Alterna para um tenant específico por ID
   * 
   * Processo:
   * 1. Verifica se o ID é válido
   * 2. Verifica se o tenant está ativo (via método otimizado)
   * 3. Busca dados completos do tenant
   * 4. Verifica novamente se está ativo
   * 5. Atualiza o contexto e storage
   * 6. Emite eventos
   */
  async switchTenant(tenantId: string): Promise<TenantResult> {
    console.log(`[SimpleTenantManager] Iniciando troca para tenant ID: ${tenantId}`);
    
    try {
      // Validação básica do ID
      if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
        console.error('[SimpleTenantManager] ID de tenant inválido:', tenantId);
        return { success: false, error: 'ID de tenant inválido' };
      }
      
      // Verifica se é o tenant atual
      if (this.currentTenant && this.currentTenant.id === tenantId) {
        console.log('[SimpleTenantManager] Tenant já é o atual:', this.currentTenant.name);
        return { success: true, tenant: this.currentTenant };
      }

      // Etapa 1: Verifica se o tenant está ativo (usando método otimizado com cache)
      console.log('[SimpleTenantManager] Verificando status do tenant:', tenantId);
      const isActive = await this.isTenantActive(tenantId);
      
      if (!isActive) {
        console.warn('[SimpleTenantManager] Tentativa de acesso a tenant inativo:', tenantId);
        this.notifyListeners(TenantEvent.TENANT_INACTIVE, { tenantId });
        return { success: false, error: 'Tenant inativo' };
      }

      // Etapa 2: Busca todos os dados do tenant
      console.log('[SimpleTenantManager] Buscando dados completos do tenant:', tenantId);
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, active, branding')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('[SimpleTenantManager] Erro ao buscar dados do tenant:', error);
        
        // Tratar erros específicos de banco de dados
        if (error.code === '42703') { // Coluna não existe
          const columnName = error.message.match(/column ["']([^"']+)["'] does not exist/);
          if (columnName && columnName[1]) {
            console.error(`[SimpleTenantManager] Coluna não existe: ${columnName[1]}. Verifique o esquema do banco de dados.`);
            return { success: false, error: `Erro de esquema de banco: coluna ${columnName[1]} não existe` };
          }
        }
        
        return { success: false, error: 'Erro ao buscar dados do tenant' };
      }
      
      if (!data) {
        console.error('[SimpleTenantManager] Tenant não encontrado com ID:', tenantId);
        return { success: false, error: 'Tenant não encontrado' };
      }

      // Cast seguro
      const tenantData = data as unknown as Database['public']['Tables']['tenants']['Row'];
      
      // Etapa 3: Dupla verificação - confirma que o tenant está ativo (direto dos dados buscados)
      if (!tenantData.active) {
        console.warn('[SimpleTenantManager] Tenant está marcado como inativo:', tenantData.name);
        this.notifyListeners(TenantEvent.TENANT_INACTIVE, { 
          tenantId: tenantData.id, 
          tenantName: tenantData.name 
        });
        return { success: false, error: `O tenant ${tenantData.name} está inativo` };
      }

      // Etapa 4: Cria objeto SimpleTenant
      let logo, theme;
      
      try {
        if (tenantData.branding) {
          // Se branding é uma string JSON, fazer parse
          const brandingObj = typeof tenantData.branding === 'string' 
            ? JSON.parse(tenantData.branding) 
            : tenantData.branding;
            
          logo = brandingObj.logo_url;
          theme = brandingObj.theme;
        }
      } catch (parseError) {
        console.warn('[SimpleTenantManager] Erro ao processar branding do tenant:', parseError);
        logo = undefined;
        theme = undefined;
      }
      
      const tenant: SimpleTenant = {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        active: tenantData.active,
        logo: logo,
        theme: theme
      };

      // Etapa 5: Atualiza tenant atual
      logDebug('[SimpleTenantManager] Alternando para tenant:', tenant.name);
      const previousTenant = this.currentTenant;
      this.currentTenant = tenant;
      
      // Atualizar caches (temporariamente desabilitado)
      // tenantCache.set(tenant.id, tenant);
      // tenantStatusCache.set(tenant.id, tenant.active || false);
      
      try {
        PersistenceManager.saveState(PersistenceManager.storageKeys.tenant, tenant);
      } catch (storageError) {
        logWarn('[SimpleTenantManager] Erro ao salvar tenant no localStorage:', storageError);
        // Continua mesmo com erro no localStorage
      }
      
      // Etapa 6: Emite eventos
      this.notifyListeners(TenantEvent.TENANT_CHANGED, { 
        current: tenant, 
        previous: previousTenant 
      });

      console.log('[SimpleTenantManager] Troca de tenant concluída com sucesso:', tenant.name);
      return { success: true, tenant };
    } catch (error) {
      console.error('[SimpleTenantManager] Erro ao alternar tenant:', error);
      return { success: false, error: 'Erro ao alternar tenant' };
    }
  }

  /**
   * Alterna para um tenant específico por slug
   */
  async switchTenantBySlug(slug: string): Promise<TenantResult> {
    try {
      // Obtém usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Verifica se o slug é válido antes de continuar
      if (!slug || typeof slug !== 'string' || slug.trim() === '') {
        return { success: false, error: 'Slug de tenant inválido' };
      }

      console.log(`[SimpleTenantManager] Buscando tenant com slug: ${slug}`);
      
      // Usa a função RPC get_tenant unificada que verifica tanto a existência do tenant quanto o acesso do usuário
      const { data, error: tenantError } = await supabase.rpc(
        'get_tenant',
        { 
          p_slug: slug.trim(), 
          p_user_id: user.id 
        }
      );

      // Log de debug
      console.log('[SimpleTenantManager] Resposta da RPC get_tenant:', { data, error: tenantError });

      // Verifica erros na consulta
      if (tenantError) {
        console.error('[SimpleTenantManager] Erro ao buscar tenant por slug:', tenantError);
        return { success: false, error: 'Erro ao buscar tenant' };
      }

      // Verifica se retornou dados
      if (!data) {
        console.error('[SimpleTenantManager] Tenant não encontrado:', slug);
        return { success: false, error: 'Tenant não encontrado' };
      }
      
      // A função RPC retorna um array - pegamos o primeiro resultado
      const resultArray = Array.isArray(data) ? data : [data];
      
      if (resultArray.length === 0) {
        console.error('[SimpleTenantManager] Tenant não encontrado:', slug);
        return { success: false, error: 'Tenant não encontrado' };
      }
      
      // Pega o primeiro resultado (deve ser único)
      const tenantData = resultArray[0];
      
      // Verifica se o tenant está ativo
      if (!tenantData.active) {
        console.error('[SimpleTenantManager] Tentativa de acesso a tenant inativo:', tenantData.name);
        return { success: false, error: `O tenant ${tenantData.name} está inativo` };
      }

      // Verifica se o usuário tem acesso
      if (!tenantData.has_access) {
        console.error('[SimpleTenantManager] Usuário sem acesso ao tenant:', tenantData.id);
        return { success: false, error: 'Você não tem acesso a este tenant' };
      }
      
      console.log('[SimpleTenantManager] Acesso ao tenant verificado:', { 
        userId: user.id, 
        tenantId: tenantData.id, 
        role: tenantData.role 
      });

      // Alterna para o tenant
      return await this.switchTenant(tenantData.id);
    } catch (error) {
      console.error('[SimpleTenantManager] Erro ao alternar tenant por slug:', error);
      return { success: false, error: 'Erro ao alternar tenant' };
    }
  }

  /**
   * Obtém os tenants disponíveis para o usuário atual
   */
  async getUserTenants(): Promise<UserTenantResponse[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[SimpleTenantManager] Usuário não autenticado');
        return [];
      }

      console.log('[SimpleTenantManager] Buscando tenants do usuário:', user.id);

      // Usamos a função RPC personalizada para obter tenants do usuário
      const { data, error } = await supabase.rpc(
        'get_user_tenants',
        { p_user_id: user.id }
      );
      
      // Log de debug
      console.log('[SimpleTenantManager] Resposta da RPC get_user_tenants:', { count: data?.length, error });

      if (error) {
        console.error('[SimpleTenantManager] Erro ao obter tenants do usuário:', error);
        return [];
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('[SimpleTenantManager] Nenhum tenant encontrado para o usuário');
        return [];
      }

      console.log('[SimpleTenantManager] Tenants encontrados:', data.length);

      // Mapeamos o resultado para o formato esperado por UserTenantResponse
      return data.map(item => {
        // O formato retornado pela RPC está garantido pela tipagem em supabase-rpc.d.ts
        const response: UserTenantResponse = {
          id: item.tenant_id,
          name: item.tenant_name,
          slug: item.tenant_slug,
          active: item.active !== undefined ? item.active : true,
          logo: null,
          theme: null,
          user_role: item.role || 'TENANT_USER'
        };
        return response;
      });
    } catch (error) {
      console.error('[SimpleTenantManager] Exceção ao obter tenants do usuário:', error);
      return [];
    }
  }

  /**
   * Obtém o tenant atual
   */
  getCurrentTenant(): SimpleTenant | null {
    return this.currentTenant;
  }

  /**
   * Limpa o tenant atual
   */
  clearCurrentTenant(): void {
    this.currentTenant = null;
    PersistenceManager.saveState(PersistenceManager.storageKeys.tenant, null);
    this.notifyListeners(TenantEvent.TENANT_CHANGED, null);
  }

  /**
   * Registra um callback para um evento específico
   * @param event Tipo de evento para escutar
   * @param callback Função que será chamada quando o evento for emitido
   * @returns Função para remover o listener (para uso em cleanup de hooks)
   */
  on(event: TenantEvent, callback: (data?: any) => void): () => void {
    try {
      console.log(`[SimpleTenantManager] Registrando listener para evento: ${event}`);
      
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      
      // Verifica se o callback já está registrado para evitar duplicação
      if (!this.listeners[event].includes(callback)) {
        this.listeners[event].push(callback);
      } else {
        console.warn(`[SimpleTenantManager] Callback já registrado para evento: ${event}`);
      }
      
      // Retorna função para remover o listener
      return () => this.off(event, callback);
    } catch (error) {
      console.error(`[SimpleTenantManager] Erro ao registrar listener para evento ${event}:`, error);
      // Retorna uma função vazia em caso de erro
      return () => {};
    }
  }

  /**
   * Remove um callback de um evento específico
   * @param event Tipo de evento
   * @param callback Função callback a ser removida
   */
  off(event: TenantEvent, callback: (data?: any) => void): void {
    try {
      if (this.listeners[event]) {
        const initialCount = this.listeners[event].length;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        const removedCount = initialCount - this.listeners[event].length;
        
        if (removedCount > 0) {
          console.log(`[SimpleTenantManager] Removido ${removedCount} listener(s) do evento: ${event}`);
        }
      }
    } catch (error) {
      console.error(`[SimpleTenantManager] Erro ao remover listener do evento ${event}:`, error);
    }
  }
  
  /**
   * Remove todos os listeners de um evento específico ou de todos os eventos
   * @param event Evento específico ou undefined para limpar todos
   */
  clearAllListeners(event?: TenantEvent): void {
    try {
      if (event) {
        const count = this.listeners[event]?.length || 0;
        this.listeners[event] = [];
        console.log(`[SimpleTenantManager] Removidos ${count} listeners do evento: ${event}`);
      } else {
        let totalCount = 0;
        Object.values(this.listeners).forEach(listeners => {
          totalCount += listeners.length;
        });
        this.listeners = {};
        console.log(`[SimpleTenantManager] Removidos todos os ${totalCount} listeners de eventos`);
      }
    } catch (error) {
      console.error(`[SimpleTenantManager] Erro ao limpar listeners:`, error);
    }
  }
  
  /**
   * Registra um callback para quando o tenant for alterado
   * @param callback Função chamada quando o tenant mudar
   * @returns Função para remover o listener
   */
  onTenantSwitched(callback: (tenant: SimpleTenant | null) => void): () => void {
    return this.on(TenantEvent.TENANT_CHANGED, callback);
  }
  
  /**
   * Registra um callback para quando o tenant for recuperado do armazenamento
   * @param callback Função chamada quando o tenant for recuperado
   * @returns Função para remover o listener
   */
  onTenantRecovered(callback: (tenant: SimpleTenant) => void): () => void {
    return this.on(TenantEvent.TENANT_RECOVERED, callback);
  }

  /**
   * Notifica todos os ouvintes registrados para um evento específico
   * @param event Tipo de evento a ser emitido
   * @param data Dados a serem enviados com o evento
   */
  private notifyListeners(event: TenantEvent, data?: any): void {
    try {
      const listenersCount = this.listeners[event]?.length || 0;
      logDebug(`[SimpleTenantManager] Emitindo evento ${event} para ${listenersCount} listeners`);
      
      const startTime = performance.now();
      
      if (this.listeners[event]) {
        this.listeners[event].forEach((callback, index) => {
          try {
            callback(data);
          } catch (error) {
            logError(`[SimpleTenantManager] Erro ao executar callback #${index} para evento ${event}:`, error);
          }
        });
      }
      
      const duration = performance.now() - startTime;
      if (duration > 50) { // Registra se demorar mais de 50ms
        logWarn(`[SimpleTenantManager] Evento ${event} demorou ${duration.toFixed(2)}ms para ser processado`);
      }
    } catch (error) {
      console.error(`[SimpleTenantManager] Erro ao emitir evento ${event}:`, error);
    }
  }
}

// Exporta uma instância única do gerenciador
export const simpleTenantManager = new SimpleTenantManager();

/**
 * Hook React para usar o SimpleTenantManager
 * Compatibilidade com o UnifiedTenantProvider
 */
export function useSimpleTenantManager() {
  return simpleTenantManager;
}
