[vite] connecting... client:484:9
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools chunk-F34GCA6J.js:21839:41
[SupabaseProviderSingleton] Nova instância singleton criada SupabaseProvider.tsx:37:21
[2025-09-17T02:23:54.284Z] [DEBUG] 
Object { message: "[StateManager] Estado carregado de sessionStorage", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.285Z] [DEBUG] 
Object { message: "[StateManager] Estado carregado de localStorage", metadata: {…} }
logger.ts:111:25
[DEBUG] App.tsx carregado - URL atual: http://localhost:8082/nexsyn/dashboard App.tsx:29:9
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: false, loading: true, timestamp: "2025-09-17T02:23:54.301Z" }
SupabaseProvider.tsx:211:17
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. react-router-dom.js:4285:17
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. react-router-dom.js:4285:17
[AppInitialization] Lock adquirido: portal-init-1758075834310 AppInitializationContext.tsx:23:13
[PortalContext] Inicializando portal: 
Object { tenantFromManager: "nenhum", localStorage: {…} }
PortalContext.tsx:63:17
[PortalContext] Carregando detalhes do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 PortalContext.tsx:37:17
[PortalContext] Mudança de usuário detectada. ID anterior: null, Novo ID: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 PortalContext.tsx:166:15
[2025-09-17T02:23:54.310Z] [INFO] 
Object { message: "[UnifiedTenantProvider] Inicializando provider unificado", metadata: {…} }
logger.ts:108:25
[2025-09-17T02:23:54.310Z] [DEBUG] 
Object { message: "[UnifiedTenantProvider] Inicializando Core TenantProvider", metadata: {…} }
logger.ts:111:25
[SupabaseProvider] Instância singleton validada e inicializada com sucesso SupabaseProvider.tsx:103:17
[SupabaseProvider] Iniciando verificação de sessão inicial SupabaseProvider.tsx:127:25
[SupabaseAuthManager] Inicializando gerenciador de autenticação (sem logout automático)... supabaseAuthManager.ts:123:17
[SupabaseAuthManager] Timer de refresh preventivo DESABILITADO - SDK gerencia automaticamente supabaseAuthManager.ts:132:17
[SupabaseAuthManager] Sincronização de headers configurada supabaseAuthManager.ts:107:17
🛡️ Proteções contra erros de extensões inicializadas errorHandler.ts:88:17
[App] Sistema de limpeza automática de sessões inicializado App.tsx:41:13
[2025-09-17T02:23:54.314Z] [INFO] 
Object { message: "[UnifiedTenantProvider] Core TenantProvider inicializado com sucesso", metadata: {…} }
logger.ts:108:25
[SupabaseAuthManager] Auth state changed: SIGNED_IN supabaseAuthManager.ts:93:21
[SupabaseAuthManager] Headers do Axios atualizados com novo token supabaseAuthManager.ts:97:25
[SupabaseAuthManager] Limpeza de chaves legadas concluída supabaseAuthManager.ts:71:17
[SupabaseProvider] Auth state changed: SIGNED_IN SupabaseProvider.tsx:173:25
[SupabaseProvider] Headers do Axios sincronizados com novo token SupabaseProvider.tsx:179:25
[SupabaseProvider] Usuário logado SupabaseProvider.tsx:191:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-09-17T02:23:54.318Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-09-17T02:23:54.318Z" }
AppRouter.tsx:117:13
[SupabaseAuthManager] Auth state changed: INITIAL_SESSION supabaseAuthManager.ts:93:21
[SupabaseAuthManager] Headers do Axios atualizados com novo token supabaseAuthManager.ts:97:25
[SupabaseAuthManager] Headers iniciais configurados supabaseAuthManager.ts:139:21
[SupabaseAuthManager] Inicialização concluída supabaseAuthManager.ts:141:17
[SupabaseProvider] Sessão inicial carregada e cacheada com sucesso SupabaseProvider.tsx:152:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-09-17T02:23:54.365Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-09-17T02:23:54.365Z" }
AppRouter.tsx:117:13
[SupabaseProvider] Headers do Axios sincronizados com novo token SupabaseProvider.tsx:179:25
[SupabaseProvider] Contexto atualizado: 
Object { hasUser: true, loading: false, timestamp: "2025-09-17T02:23:54.370Z" }
SupabaseProvider.tsx:211:17
[AppRouter] Debug - User data: 
Object { hasUser: true, userEmail: "alberto.melo@nexsyn.com.br", userRole: "ADMIN", userMetadata: {…}, timestamp: "2025-09-17T02:23:54.370Z" }
AppRouter.tsx:117:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.519Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.519Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.542Z] [DEBUG] 
Object { message: "Sem session.user.id para inscrever", metadata: {…} }
logger.ts:111:25
Loading notifications... useNotifications.ts:10:21
[useZustandTenant] Usuário autenticado, carregando dados do portal (com guard otimizado) useZustandTenant.ts:47:17
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array []
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: false useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: false, availableTenants: 0 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array []
useZustandTenant.ts:82:17
🚫 [TENANT AUTO-SELECT] Condições não atendidas: urlSlug=nexsyn, hasLoaded=false, availableTenants=0 useZustandTenant.ts:96:21
[useZustandTenant] Usuário autenticado, carregando dados do portal (com guard otimizado) useZustandTenant.ts:47:17
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array []
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: false useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: false, availableTenants: 0 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array []
useZustandTenant.ts:82:17
🚫 [TENANT AUTO-SELECT] Condições não atendidas: urlSlug=nexsyn, hasLoaded=false, availableTenants=0 useZustandTenant.ts:96:21
[useZustandTenant] Usuário autenticado, carregando dados do portal (com guard otimizado) useZustandTenant.ts:47:17
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array []
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: false useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: false, availableTenants: 0 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array []
useZustandTenant.ts:82:17
🚫 [TENANT AUTO-SELECT] Condições não atendidas: urlSlug=nexsyn, hasLoaded=false, availableTenants=0 useZustandTenant.ts:96:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.544Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.544Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.551Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.551Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[AppInitialization] Lock liberado: portal-init-1758075834310 AppInitializationContext.tsx:37:15
[PortalContext] Carregando detalhes do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 PortalContext.tsx:37:17
🔍 [DEBUG] fetchPortalData iniciado 3 tenantStore.ts:118:21
[2025-09-17T02:23:54.766Z] [DEBUG] 
Object { message: "Sessão encontrada", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.766Z] [DEBUG] 
Object { message: "Estado da autenticação: INITIAL_SESSION", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.767Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.767Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.772Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.773Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.778Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.778Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.785Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.785Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
📦 [CACHE] Cache expirado ou usuário diferente, removendo tenantStore.ts:82:29
🔍 [DEBUG] Buscando tenants do usuário... tenantStore.ts:138:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:54.970Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:54.970Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandTenant] Fetch já em progresso, aguardando... 3 useZustandTenant.ts:44:21
Loaded notifications: 
Array []
useNotifications.ts:17:21
O cookie “__cf_bm” foi rejeitado por ter domínio inválido. websocket
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
🔍 [DEBUG] Buscando tenants do usuário... tenantStore.ts:138:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.119Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.119Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Usuário obtido: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 tenantStore.ts:122:25
🔍 [DEBUG] Buscando tenants do usuário... tenantStore.ts:138:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.267Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.267Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: null, requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.274Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.274Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Resultado tenant_users: 
Object { userTenants: (10) […], tenantsError: null }
tenantStore.ts:152:25
[2025-09-17T02:23:55.672Z] [DEBUG] 
Object { message: "Usuário carregado", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Resultado tenant_users: 
Object { userTenants: (10) […], tenantsError: null }
tenantStore.ts:152:25
🔍 [DEBUG] Resultado tenant_users: 
Object { userTenants: (10) […], tenantsError: null }
tenantStore.ts:152:25
[2025-09-17T02:23:55.672Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.672Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Tenants processados: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
tenantStore.ts:185:25
🔍 [DEBUG] Não definindo currentTenant automaticamente - aguardando auto-seleção por URL tenantStore.ts:189:25
📦 [CACHE] Dados salvos no cache local tenantStore.ts:102:25
✅ [DEBUG] fetchPortalData concluído com sucesso tenantStore.ts:205:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.807Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.807Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:55.811Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.811Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
🧹 [CACHE] Limpando cache dashboard para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:56:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
📊 [AUDIT] Buscando métricas do dashboard para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) 
Object { dateRange: {…}, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0", timestamp: "2025-09-17T02:23:55.817Z" }
Dashboard.tsx:94:17
[AUDIT] getDashboardMetrics - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 dashboardService.ts:24:21
Buscando dados a partir de 2025-03-16 (6 meses atrás) dashboardService.ts:43:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
💰 [AUDIT] Buscando projeção de fluxo de caixa para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) 
Object { days: 90, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0", timestamp: "2025-09-17T02:23:55.818Z" }
Dashboard.tsx:117:17
[AUDIT] getCashFlowProjection - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 dashboardService.ts:416:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:55.818Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.818Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] Tenants processados: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
tenantStore.ts:185:25
🔍 [DEBUG] Não definindo currentTenant automaticamente - aguardando auto-seleção por URL tenantStore.ts:189:25
📦 [CACHE] Dados salvos no cache local tenantStore.ts:102:25
✅ [DEBUG] fetchPortalData concluído com sucesso tenantStore.ts:205:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.829Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.829Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:55.834Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.834Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
🧹 [CACHE] Limpando cache dashboard para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:56:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
💰 [AUDIT] Buscando projeção de fluxo de caixa para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) 
Object { days: 90, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0", timestamp: "2025-09-17T02:23:55.839Z" }
Dashboard.tsx:117:17
[AUDIT] getCashFlowProjection - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 dashboardService.ts:416:21
🔍 [DEBUG] Tenants processados: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
tenantStore.ts:185:25
🔍 [DEBUG] Não definindo currentTenant automaticamente - aguardando auto-seleção por URL tenantStore.ts:189:25
📦 [CACHE] Dados salvos no cache local tenantStore.ts:102:25
✅ [DEBUG] fetchPortalData concluído com sucesso tenantStore.ts:205:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: null, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: false, isTenantActive: undefined, roleMatch: true }
useSecureTenantQuery.ts:103:13
🚨 [ACCESS DENIED] Tenant não definido useSecureTenantQuery.ts:123:21
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: null, isValidTenant: undefined, queryKey: (1) […], enabled: undefined }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: false, accessError: "Tenant não definido", currentTenant: null, tenantId: undefined, tenantName: undefined, tenantSlug: undefined, urlSlug: "nexsyn", slugMatch: false }
Dashboard.tsx:129:13
🚨 [DEBUG] Acesso negado - hasAccess: false, accessError: Tenant não definido Dashboard.tsx:196:17
[2025-09-17T02:23:55.849Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.849Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: null useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: undefined useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
🔄 [TENANT AUTO-SELECT] Tentando trocar para tenant com slug: nexsyn useZustandTenant.ts:101:21
✅ [TENANT AUTO-SELECT] Trocando para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useZustandTenant.ts:104:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:55.856Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:55.856Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
🧹 [CACHE] Limpando cache dashboard para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:56:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/dashboard useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
💰 [AUDIT] Buscando projeção de fluxo de caixa para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) 
Object { days: 90, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0", timestamp: "2025-09-17T02:23:55.862Z" }
Dashboard.tsx:117:17
[AUDIT] getCashFlowProjection - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 dashboardService.ts:416:21
[vite] connected. client:586:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:56.385Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:56.385Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [DEBUG] dashboardService - Total de cobranças carregadas: 0 dashboardService.ts:249:21
🔍 [DEBUG] dashboardService - Data de hoje para comparação: 2025-09-16 dashboardService.ts:250:21
🔍 [DEBUG] dashboardService - Totais finais calculados: 
Object { totalPending: 0, totalOverdue: 0, pendingDebugCount: 0, overdueDebugCount: 0, chargesByStatus: (4) […] }
dashboardService.ts:347:21
🔍 [DEBUG] dashboardService - Cobranças OVERDUE encontradas: 
Array []
dashboardService.ts:358:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (1) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [DEBUG] Dashboard Page - Tenant: 
Object { hasAccess: true, accessError: null, currentTenant: {…}, tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "Nexsyn Soluções Inteligentes", tenantSlug: "nexsyn", urlSlug: "nexsyn", slugMatch: true }
Dashboard.tsx:129:13
 [AUDIT] Página Dashboard renderizada para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) Dashboard.tsx:239:13
[2025-09-17T02:23:56.417Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:56.417Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
RevenueTrendChart - Nenhum dado de pagamento disponível RevenueTrendChart.tsx:37:21
RevenueTrendChart - Valores para calcular escala: 
Array(12) [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, … ]
RevenueTrendChart.tsx:122:17
RevenueTrendChart - Valor máximo encontrado: 0 RevenueTrendChart.tsx:124:17
RevenueTrendChart - Buscando dados do mês atual: set/2025 RevenueTrendChart.tsx:153:17
RevenueTrendChart - Mês atual encontrado nos dados: 
Object { month: "Set/25", monthFull: "set/2025", pagamentos: 0, vencimentos: 0, diferenca: 0 }
RevenueTrendChart.tsx:167:21
RevenueTrendChart - dados recebidos (pagamentos): 
Array []
RevenueTrendChart.tsx:22:17
RevenueTrendChart - dados esperados (vencimentos): 
Array [ {…} ]
RevenueTrendChart.tsx:23:17
RevenueTrendChart - Dados de março (pagamentos): undefined RevenueTrendChart.tsx:27:17
RevenueTrendChart - Dados de março (vencimentos): undefined RevenueTrendChart.tsx:28:17
[2025-09-17T02:23:56.541Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:56.541Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useTenantAccessGuard.ts:50:17
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
✅ [ACCESS GRANTED] Acesso liberado para tenant: Nexsyn Soluções Inteligentes useSecureTenantQuery.ts:134:17
[2025-09-17T02:23:57.312Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.312Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.329Z] [DEBUG] 
Object { message: "Limpando inscrição de atualizações", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.332Z] [DEBUG] 
Object { message: "Sem session.user.id para inscrever", metadata: {…} }
logger.ts:111:25
Loading notifications... useNotifications.ts:10:21
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
🔄 [SYNC] Tenant alterado, sincronizando contexto: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:55:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:33:21
🚨 [INIT] Erro na inicialização do contexto: ReferenceError: supabase is not defined
    initializeTenantContext useServices.ts:88
    useServices useServices.ts:111
    React 13
    workLoop scheduler.development.js:266
    flushWork scheduler.development.js:239
    performWorkUntilDeadline scheduler.development.js:533
errorHandler.ts:58:30
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[AUDIT] Consultando serviços - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251, Filtros: 
Object { searchTerm: undefined, is_active: undefined, withholding_tax: undefined, category: undefined }
useServices.ts:78:17
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
[useZustandTenant] Dados já carregados para este usuário, pulando fetch useZustandTenant.ts:39:21
[DEBUG] useZustandTenant - URL atual: http://localhost:8082/nexsyn/services useZustandTenant.ts:66:17
[DEBUG] useZustandTenant - urlSlug extraído: nexsyn useZustandTenant.ts:67:17
[DEBUG] useZustandTenant - currentTenant: 
Object { id: "8d2888f1-64a5-445f-84f5-2614d5160251", name: "Nexsyn Soluções Inteligentes", slug: "nexsyn", active: true, created_at: "2025-03-31T03:04:04.202353+00:00", updated_at: "2025-04-01T02:02:57.42568+00:00" }
useZustandTenant.ts:68:17
[DEBUG] useZustandTenant - availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:69:17
[DEBUG] useZustandTenant - hasLoaded: true useZustandTenant.ts:70:17
🔍 [TENANT AUTO-SELECT] URL slug: nexsyn, currentTenant: nexsyn useZustandTenant.ts:80:17
🔍 [TENANT AUTO-SELECT] hasLoaded: true, availableTenants: 10 useZustandTenant.ts:81:17
🔍 [TENANT AUTO-SELECT] availableTenants: 
Array(10) [ {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
useZustandTenant.ts:82:17
✅ [TENANT AUTO-SELECT] Tenant já está correto: Nexsyn Soluções Inteligentes (nexsyn) useZustandTenant.ts:117:21
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.335Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.335Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.365Z] [DEBUG] 
Object { message: "Sessão encontrada", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.366Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.366Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.369Z] [DEBUG] 
Object { message: "Estado da autenticação: INITIAL_SESSION", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.377Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.377Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.389Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.389Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.397Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.397Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.415Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.415Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.422Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.422Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
[useZustandAuth] Sessão inicial carregada: 1f98885d-b3dd-4404-bf3a-63dd2937d1f6 useZustandAuth.ts:39:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.430Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.430Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
Loaded notifications: 
Array []
useNotifications.ts:17:21
[2025-09-17T02:23:57.563Z] [DEBUG] 
Object { message: "Usuário carregado", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.563Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.563Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
✅ [AUDIT] Serviços carregados com sucesso - Tenant: 8d2888f1-64a5-445f-84f5-2614d5160251, Total: 8 useServices.ts:129:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:57.581Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:57.581Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:23:59.086Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:23:59.086Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:04.695Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:04.695Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:06.385Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:06.385Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
✏️ [AUDIT] Mutação para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useSecureTenantQuery.ts:65:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:33:21
🚨 [INIT] Erro na inicialização do contexto: ReferenceError: supabase is not defined
    initializeTenantContext useServices.ts:88
    updateServiceMutation useServices.ts:273
    mutationFn useSecureTenantQuery.ts:99
    fn mutation.ts:174
    run retryer.ts:155
    start retryer.ts:221
    execute mutation.ts:213
errorHandler.ts:58:30
    error errorHandler.ts:69
    initializeTenantContext useServices.ts:101
    updateServiceMutation useServices.ts:273
    mutationFn useSecureTenantQuery.ts:99
    fn mutation.ts:174
    run retryer.ts:155
    start retryer.ts:221
    execute mutation.ts:213
✏️ [AUDIT] Atualizando serviço 16e7d726-27b1-4239-b82e-8209a634e2b4 para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 
Object { name: "Sistema Hiper", description: "", code: "850", default_price: 150, tax_rate: 0, tax_code: undefined, lc_code: undefined, municipality_code: undefined, withholding_tax: false, is_active: true }
useServices.ts:204:17
🔍 [DEBUG] Configurando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:206:17
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:13.334Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:13.334Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
✅ [SECURITY] Contexto do tenant configurado: 
Object { message: "Contexto definido com sucesso", success: true, user_id: null, tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251" }
useServices.ts:216:21
🔍 [DEBUG] Atualizando serviço - ID: 16e7d726-27b1-4239-b82e-8209a634e2b4, TenantID: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:221:17
🚨 [SECURITY] Erro ao atualizar serviço: 
Object { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }
errorHandler.ts:58:30
    error errorHandler.ts:69
    updateServiceMutation useServices.ts:334
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:13.635Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:13.635Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
✏️ [AUDIT] Mutação para tenant: Nexsyn Soluções Inteligentes (8d2888f1-64a5-445f-84f5-2614d5160251) useSecureTenantQuery.ts:65:21
🔧 [INIT] Inicializando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:33:21
🚨 [INIT] Erro na inicialização do contexto: ReferenceError: supabase is not defined
    initializeTenantContext useServices.ts:88
    updateServiceMutation useServices.ts:273
    mutationFn useSecureTenantQuery.ts:99
    fn mutation.ts:174
    run retryer.ts:155
    run retryer.ts:201
errorHandler.ts:58:30
    error errorHandler.ts:69
    initializeTenantContext useServices.ts:101
    updateServiceMutation useServices.ts:273
    mutationFn useSecureTenantQuery.ts:99
    fn mutation.ts:174
    run retryer.ts:155
    run retryer.ts:201
✏️ [AUDIT] Atualizando serviço 16e7d726-27b1-4239-b82e-8209a634e2b4 para tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 
Object { name: "Sistema Hiper", description: "", code: "850", default_price: 150, tax_rate: 0, tax_code: undefined, lc_code: undefined, municipality_code: undefined, withholding_tax: false, is_active: true }
useServices.ts:204:17
🔍 [DEBUG] Configurando contexto do tenant: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:206:17
✅ [SECURITY] Contexto do tenant configurado: 
Object { message: "Contexto definido com sucesso", success: true, user_id: null, tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251" }
useServices.ts:216:21
🔍 [DEBUG] Atualizando serviço - ID: 16e7d726-27b1-4239-b82e-8209a634e2b4, TenantID: 8d2888f1-64a5-445f-84f5-2614d5160251 useServices.ts:221:17
🚨 [SECURITY] Erro ao atualizar serviço: 
Object { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }
errorHandler.ts:58:30
🚨 [SECURITY] Erro em mutação multi-tenant: 
Object { error: "Erro ao atualizar serviço: JSON object requested, multiple (or no) rows returned", tenant: "8d2888f1-64a5-445f-84f5-2614d5160251" }
errorHandler.ts:58:30
Erro ao salvar serviço: Error: Erro ao atualizar serviço: JSON object requested, multiple (or no) rows returned
    updateServiceMutation useServices.ts:335
errorHandler.ts:58:30
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:14.884Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:14.884Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isLoading: false, hasLoaded: true }
useTenantAccessGuard.ts:17:13
🔍 [ServicesPage] Estado de acesso: 
Object { hasAccess: true, accessLoading: false, accessError: null, currentTenant: {…} }
index.tsx:49:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [DEBUG] useSecureTenantQuery - Tenant: 
Object { currentTenant: {…}, isValidTenant: true, queryKey: (3) […], enabled: true }
useSecureTenantQuery.ts:19:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
useSecureTenantQuery.ts:103:13
[2025-09-17T02:24:14.895Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:111:25
[2025-09-17T02:24:14.895Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:111:25
