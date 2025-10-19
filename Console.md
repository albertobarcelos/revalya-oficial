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
{"pairingCode":null,"code":"2@6m1eAqUqmH+3+T5VERWIXPakf+ygGnRoGxrJ0hRSXMKpGV1B5sRna6gj4kvgqP4t0SCR5OmACz7J6PgJ5nPDJtXjTovBbdOHLDA=,fepUQ7MrWbrGCV9SVCYXBkHKels/P4myM6KjbGDxoX4=,VBiEVuRUby3y+W24Q2a5fjJ5QRhm1VNX/4LfVP3PRGA=,+TVe/R5/inCHs+s0gcLvX/k/Y7Aaaz0XShaFMRS311A=","base64":"data:image/png;base64,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","count":5}
