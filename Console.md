[vite] connecting... client:495:9
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools chunk-F34GCA6J.js:21609:25
Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key. @supabase_supabase-js.js:5543:15
[SupabaseProviderSingleton] Nova instância singleton criada SupabaseProvider.tsx:37:21
[DEBUG] App.tsx carregado - URL atual: http://localhost:8081/nexsyn/cobrancas App.tsx:29:9
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: false, loading: true, timestamp: "2025-10-18T20:45:56.687Z" }
SupabaseProvider.tsx:211:17
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. react-router-dom.js:4374:13
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. react-router-dom.js:4374:13
[AppInitialization] Lock adquirido: portal-init-1760820356693 AppInitializationContext.tsx:23:13
[PortalContext] Inicializando portal: 
Object { tenantFromManager: "nenhum", localStorage: {…} }
PortalContext.tsx:63:17
[PortalContext] Carregando detalhes do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 PortalContext.tsx:37:17
[PortalContext] Mudança de usuário detectada. ID anterior: null, Novo ID: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 PortalContext.tsx:166:15
[2025-10-18T20:45:56.693Z] [INFO] 
Object { message: "[UnifiedTenantProvider] Inicializando provider unificado", metadata: {…} }
logger.ts:127:25
[SupabaseProvider] Instância singleton validada e inicializada com sucesso SupabaseProvider.tsx:103:17
[SupabaseProvider] Iniciando verificação de sessão inicial SupabaseProvider.tsx:127:25
[SupabaseAuthManager] Inicializando gerenciador de autenticação (sem logout automático)... supabaseAuthManager.ts:123:17
[SupabaseAuthManager] Timer de refresh preventivo DESABILITADO - SDK gerencia automaticamente supabaseAuthManager.ts:132:17
[SupabaseAuthManager] Sincronização de headers configurada supabaseAuthManager.ts:107:17
🛡️ Proteções contra erros de extensões inicializadas errorHandler.ts:88:17
[App] Sistema de limpeza automática de sessões inicializado App.tsx:41:13
[2025-10-18T20:45:56.696Z] [INFO] 
Object { message: "[UnifiedTenantProvider] Core TenantProvider inicializado com sucesso", metadata: {…} }
logger.ts:127:25
[SupabaseAuthManager] Auth state changed: SIGNED_IN supabaseAuthManager.ts:93:21
[SupabaseAuthManager] Headers do Axios atualizados com novo token supabaseAuthManager.ts:97:25
[SupabaseAuthManager] Limpeza de chaves legadas concluída supabaseAuthManager.ts:71:17
[SupabaseProvider] Auth state changed: SIGNED_IN SupabaseProvider.tsx:173:25
[SupabaseProvider] Headers do Axios sincronizados com novo token SupabaseProvider.tsx:179:25
[SupabaseProvider] Usuário logado SupabaseProvider.tsx:191:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-10-18T20:45:56.700Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-10-18T20:45:56.700Z" }
AppRouter.tsx:118:13
[SupabaseAuthManager] Auth state changed: INITIAL_SESSION supabaseAuthManager.ts:93:21
[SupabaseAuthManager] Headers do Axios atualizados com novo token supabaseAuthManager.ts:97:25
[SupabaseAuthManager] Headers iniciais configurados supabaseAuthManager.ts:139:21
[SupabaseAuthManager] Inicialização concluída supabaseAuthManager.ts:141:17
[SupabaseProvider] Sessão inicial carregada e cacheada com sucesso SupabaseProvider.tsx:152:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-10-18T20:45:56.739Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-10-18T20:45:56.739Z" }
AppRouter.tsx:118:13
[SupabaseProvider] Headers do Axios sincronizados com novo token SupabaseProvider.tsx:179:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-10-18T20:45:56.760Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-10-18T20:45:56.761Z" }
AppRouter.tsx:118:13
[AppInitialization] Lock liberado: portal-init-1760820356693 AppInitializationContext.tsx:37:15
🔄 [TenantAutoLoginRouter] Sincronizando tenant com store: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", slug: "nexsyn", name: "nexsyn" }
TenantAutoLoginRouter.tsx:98:21
[PortalContext] Carregando detalhes do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 PortalContext.tsx:37:17
[DEBUG] 🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: null, requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
logThrottle.ts:32:25
[TENANT ACCESS GUARD] 🔍 Acesso liberado para tenant: nexsyn undefined logThrottle.ts:32:25
[DEBUG] Render - Estado atual do profile Sidebar logThrottle.ts:32:25
[DEBUG] Render - Estado atual da session Sidebar logThrottle.ts:32:25
[DEBUG] useSecureTenantQuery - Tenant: nexsyn 
Object { tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "nexsyn", isValidTenant: true, queryKeyLength: 3, enabled: true }
logThrottle.ts:32:25
Loading notifications... useNotifications.ts:10:21
[DEBUG] undefined undefined logThrottle.ts:32:25
🔍 [CHARGES DEBUG] Iniciando busca de cobranças useCharges.ts:19:17
🔍 [CHARGES DEBUG] TenantId recebido: 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:20:17
🔍 [CHARGES DEBUG] CurrentTenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) useCharges.ts:21:17
🔍 [CHARGES DEBUG] Parâmetros da query: 
Object { page: 1, limit: 1000 }
useCharges.ts:22:17
🔍 [CHARGES DEBUG] HasAccess: true useCharges.ts:23:17
🔍 [CHARGES DEBUG] AccessError: null useCharges.ts:24:17
🔍 [CHARGES DEBUG] Executando query no Supabase... useCharges.ts:102:17
🔍 [CHARGES DEBUG] Iniciando busca de cobranças useCharges.ts:19:17
🔍 [CHARGES DEBUG] TenantId recebido: 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:20:17
🔍 [CHARGES DEBUG] CurrentTenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) useCharges.ts:21:17
🔍 [CHARGES DEBUG] Parâmetros da query: 
Object {  }
useCharges.ts:22:17
🔍 [CHARGES DEBUG] HasAccess: true useCharges.ts:23:17
🔍 [CHARGES DEBUG] AccessError: null useCharges.ts:24:17
🔍 [CHARGES DEBUG] Executando query no Supabase... useCharges.ts:102:17
[AUDIT] Buscando contratos para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 undefined logThrottle.ts:32:25
[AUDIT] CurrentTenant na query: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) undefined logThrottle.ts:32:25
🔧 Configurando contexto de tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useReconciliationSecurity.ts:26:21
[AUDIT] security_reconciliation_access_granted: 
Object { user_id: undefined, user_email: "alberto.melo@nexsyn.com.br", timestamp: "2025-10-18T20:45:57.216Z", tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251", tenant_name: "nexsyn", details: {…} }
useAuditLogger.ts:8:21
🏢 [AUDIT] Acessando página de cobranças - Tenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) Charges.tsx:41:21
📊 [AUDIT] Aba ativa: dashboard Charges.tsx:42:21
🧹 [AUDIT] Limpando cache de cobranças para tenant: nexsyn Charges.tsx:51:21
🔍 [CHARGES DEBUG] Iniciando busca de cobranças useCharges.ts:19:17
🔍 [CHARGES DEBUG] TenantId recebido: 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:20:17
🔍 [CHARGES DEBUG] CurrentTenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) useCharges.ts:21:17
🔍 [CHARGES DEBUG] Parâmetros da query: 
Object { page: 1, limit: 1000 }
useCharges.ts:22:17
🔍 [CHARGES DEBUG] HasAccess: true useCharges.ts:23:17
🔍 [CHARGES DEBUG] AccessError: null useCharges.ts:24:17
🔍 [CHARGES DEBUG] Executando query no Supabase... useCharges.ts:102:17
🔍 [CHARGES DEBUG] Iniciando busca de cobranças useCharges.ts:19:17
🔍 [CHARGES DEBUG] TenantId recebido: 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:20:17
🔍 [CHARGES DEBUG] CurrentTenant: nexsyn (8d2888f1-64a5-445f-84f5-2614d5160251) useCharges.ts:21:17
🔍 [CHARGES DEBUG] Parâmetros da query: 
Object {  }
useCharges.ts:22:17
🔍 [CHARGES DEBUG] HasAccess: true useCharges.ts:23:17
🔍 [CHARGES DEBUG] AccessError: null useCharges.ts:24:17
🔍 [CHARGES DEBUG] Executando query no Supabase... useCharges.ts:102:17
[DEBUG] Render - Estado atual da session Sidebar logThrottle.ts:32:25
[DEBUG] Sessão inicial carregada 
Object { userId: "1f98885d-b3dd-4404-bf3a-63dd2937d1f6" }
logThrottle.ts:32:25
🔍 [DEBUG] fetchPortalData iniciado 33 tenantStore.ts:118:21
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
[DEBUG] undefined undefined logThrottle.ts:32:25
[AUTO SELECT] undefined undefined 2 logThrottle.ts:32:25
Loaded notifications: 
Array []
useNotifications.ts:17:21
✅ [INIT] Contexto RPC configurado com sucesso para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useContracts.ts:268:21
[AUDIT] Contratos encontrados: 0 undefined logThrottle.ts:32:25
[AUDIT] Primeiros contratos encontrados 
Array []
logThrottle.ts:32:25
🔍 [CHARGES DEBUG] Resultado da query: 
Object { data: 0, total: 0, error: null, countError: null }
useCharges.ts:139:17
✅ [CHARGES DEBUG] Cobranças encontradas: 0 useCharges.ts:156:17
⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:160:21
[DEBUG] Render - Estado atual do profile Sidebar logThrottle.ts:32:25
✅ Contexto configurado com sucesso: 
Object { message: "Contexto definido com sucesso", success: true, user_id: null, tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251" }
useReconciliationSecurity.ts:54:21
[AUDIT] security_context_validated: 
Object { user_id: "1f98885d-b3dd-4404-bf3a-63dd2937d1f6", user_email: "alberto.melo@nexsyn.com.br", timestamp: "2025-10-18T20:45:57.803Z", tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251", context_result: {…} }
useAuditLogger.ts:8:21
🔍 [CHARGES DEBUG] Resultado da query: 
Object { data: 0, total: 0, error: null, countError: null }
useCharges.ts:139:17
✅ [CHARGES DEBUG] Cobranças encontradas: 0 useCharges.ts:156:17
⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:160:21
O cookie “__cf_bm” foi rejeitado por ter domínio inválido. websocket
🔍 [CHARGES DEBUG] Resultado da query: 
Object { data: 0, total: 0, error: null, countError: null }
useCharges.ts:139:17
✅ [CHARGES DEBUG] Cobranças encontradas: 0 useCharges.ts:156:17
⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:160:21
🔍 [CHARGES DEBUG] Resultado da query: 
Object { data: 0, total: 0, error: null, countError: null }
useCharges.ts:139:17
✅ [CHARGES DEBUG] Cobranças encontradas: 0 useCharges.ts:156:17
⚠️ [CHARGES DEBUG] Nenhuma cobrança encontrada para o tenant 8d2888f1-64a5-445f-84f5-2614d5160251 useCharges.ts:160:21
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
[vite] connected. client:618:15
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔄 [AUDIT] Abrindo modal de conciliação - Tenant: nexsyn Charges.tsx:220:17
🚀 Inicializando fetch de dados de conciliação useReconciliationData.ts:24:21
[TENANT ACCESS GUARD] 🔍 🔍 [TENANT ACCESS GUARD] Verificando acesso 
Object { hasTenant: true, userRole: "ADMIN", requiredRole: undefined }
logThrottle.ts:32:25
🔄 Carregando movimentações de conciliação... useReconciliationData.ts:93:17
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
✅ Movimentações carregadas: 17 useReconciliationData.ts:118:17
[AUDIT] DATA_ACCESS: 
Object { user_id: "1f98885d-b3dd-4404-bf3a-63dd2937d1f6", user_email: "alberto.melo@nexsyn.com.br", timestamp: "2025-10-18T20:45:59.663Z", action: "reconciliation_data_loaded", tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251", records_count: 17 }
useAuditLogger.ts:8:21
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Carregando dados do cache local tenantStore.ts:71:29
✅ [AUDIT] Templates carregados - Tenant: nexsyn, Count: 5 useSecureNotificationTemplates.ts:134:17
