2025-09-24T04:32:35.972Z [INFO ] [CanalIntegration] Ativando verificação automática de status logService.ts:108:13
XHRGET
https://wyehpiutzvwplllumgdk.supabase.co/rest/v1/tenant_integrations?select=config&tenant_id=eq.8d2888f1-64a5-445f-84f5-2614d5160251&integration_type=eq.whatsapp
[HTTP/2 406  74ms]

2025-09-24T04:32:36.921Z [INFO ] [WhatsApp       ] Buscando instâncias existentes para o tenant: nexsyn logService.ts:108:13
2025-09-24T04:32:36.921Z [INFO ] [WhatsApp       ] Buscando instâncias para o tenant com prefixo: nexsyn logService.ts:108:13
2025-09-24T04:32:36.921Z [DEBUG] [WhatsApp       ] Chamando API: GET https://evolution.nexsyn.com.br/instance/fetchInstances
{} logService.ts:115:15
2025-09-24T04:32:37.029Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/fetchInstances):
{
  "0": {
    "id": "168297de-6417-4be6-9afa-eab2f85dfe54",
    "name": "suporte",
    "connectionStatus": "open",
    "ownerJid": "556592298724@s.whatsapp.net",
    "profileName": "Nexsyn Customer Support",
    "profilePicUrl": "https://pps.whatsapp.net/v/t61.24694-24/431671983_535898765542868_1056742137402082891_n.jpg?ccb=11-4&oh=01_Q5Aa2gEhGtlKMWmJPc3RehX5mVE0iVXrfGV5UssADVscAzZa-w&oe=68E00D84&_nc_sid=5e03e0&_nc_cat=101",
    "integration": "WHATSAPP-BAILEYS",
    "number": null,
    "businessId": null,
    "token": "[REDACTED]",
    "clientName": "evolution_exchange",
    "disconnectionReasonCode": 401,
    "disconnectionObject": "{\"error\":{\"data\":{\"tag\":\"stream:error\",\"attrs\":{\"code\":\"401\"},\"content\":[{\"tag\":\"conflict\",\"attrs\":{\"type\":\"device_removed\"}}]},\"isBoom\":true,\"isServer\":false,\"output\":{\"statusCode\":401,\"payload\":{\"statusCode\":401,\"error\"…
logService.ts:115:15
2025-09-24T04:32:37.030Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/fetchInstances):
{
  "0": {
    "id": "168297de-6417-4be6-9afa-eab2f85dfe54",
    "name": "suporte",
    "connectionStatus": "open",
    "ownerJid": "556592298724@s.whatsapp.net",
    "profileName": "Nexsyn Customer Support",
    "profilePicUrl": "https://pps.whatsapp.net/v/t61.24694-24/431671983_535898765542868_1056742137402082891_n.jpg?ccb=11-4&oh=01_Q5Aa2gEhGtlKMWmJPc3RehX5mVE0iVXrfGV5UssADVscAzZa-w&oe=68E00D84&_nc_sid=5e03e0&_nc_cat=101",
    "integration": "WHATSAPP-BAILEYS",
    "number": null,
    "businessId": null,
    "token": "[REDACTED]",
    "clientName": "evolution_exchange",
    "disconnectionReasonCode": 401,
    "disconnectionObject": "{\"error\":{\"data\":{\"tag\":\"stream:error\",\"attrs\":{\"code\":\"401\"},\"content\":[{\"tag\":\"conflict\",\"attrs\":{\"type\":\"device_removed\"}}]},\"isBoom\":true,\"isServer\":false,\"output\":{\"statusCode\":401,\"payload\":{\"statusCode\":401,\"error\"…
logService.ts:115:15
2025-09-24T04:32:37.030Z [DEBUG] [WhatsApp       ] Instâncias encontradas:
{
  "0": {
    "id": "168297de-6417-4be6-9afa-eab2f85dfe54",
    "name": "suporte",
    "connectionStatus": "open",
    "ownerJid": "556592298724@s.whatsapp.net",
    "profileName": "Nexsyn Customer Support",
    "profilePicUrl": "https://pps.whatsapp.net/v/t61.24694-24/431671983_535898765542868_1056742137402082891_n.jpg?ccb=11-4&oh=01_Q5Aa2gEhGtlKMWmJPc3RehX5mVE0iVXrfGV5UssADVscAzZa-w&oe=68E00D84&_nc_sid=5e03e0&_nc_cat=101",
    "integration": "WHATSAPP-BAILEYS",
    "number": null,
    "businessId": null,
    "token": "[REDACTED]",
    "clientName": "evolution_exchange",
    "disconnectionReasonCode": 401,
    "disconnectionObject": "{\"error\":{\"data\":{\"tag\":\"stream:error\",\"attrs\":{\"code\":\"401\"},\"content\":[{\"tag\":\"conflict\",\"attrs\":{\"type\":\"device_removed\"}}]},\"isBoom\":true,\"isServer\":false,\"output\":{\"statusCode\":401,\"payload\":{\"statusCode\":401,\"error\":\"Unauthorized\",\"…
logService.ts:115:15
2025-09-24T04:32:37.031Z [WARN ] [WhatsApp       ] Instância suporte ignorada: erro de autenticação (401) logService.ts:102:13
2025-09-24T04:32:37.031Z [WARN ] [WhatsApp       ] Instância NexsynEvento ignorada: erro de autenticação (401) logService.ts:102:13
2025-09-24T04:32:37.031Z [INFO ] [WhatsApp       ] Encontradas 1 instâncias para o tenant nexsyn: logService.ts:108:13
2025-09-24T04:32:37.031Z [DEBUG] [WhatsApp       ] - revalya-nexsyn (connected) logService.ts:115:15
2025-09-24T04:32:37.031Z [INFO ] [WhatsApp       ] Obtendo informações da instância: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.031Z [DEBUG] [WhatsApp       ] Chamando API: GET https://evolution.nexsyn.com.br/instance/connectionState/revalya-nexsyn
{} logService.ts:115:15
2025-09-24T04:32:37.039Z [INFO ] [WhatsApp       ] Tenant encontrado: nexsyn (ID: 8d2888f1-64a5-445f-84f5-2614d5160251) logService.ts:108:13
2025-09-24T04:32:37.105Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/connectionState/revalya-nexsyn):
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.105Z [DEBUG] [WhatsApp       ] Informações da instância:
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.105Z [INFO ] [WhatsApp       ] Instância conectada válida encontrada: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.106Z [INFO ] [WhatsApp       ] Instância encontrada para o tenant: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.106Z [INFO ] [WhatsApp       ] Verificando status da instância: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.106Z [DEBUG] [WhatsApp       ] Chamando API: GET https://evolution.nexsyn.com.br/instance/connectionState/revalya-nexsyn
{} logService.ts:115:15
XHRGET
https://wyehpiutzvwplllumgdk.supabase.co/rest/v1/tenant_integrations?select=config&tenant_id=eq.8d2888f1-64a5-445f-84f5-2614d5160251&integration_type=eq.whatsapp
[HTTP/2 406  67ms]

2025-09-24T04:32:37.183Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/connectionState/revalya-nexsyn):
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.183Z [DEBUG] [WhatsApp       ] Status detalhado:
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.183Z [INFO ] [CanalIntegration] Status verificado: connected (verificação #1) logService.ts:108:13
2025-09-24T04:32:37.183Z [INFO ] [CanalIntegration] Status mudou de disconnected para connected logService.ts:108:13
2025-09-24T04:32:37.183Z [INFO ] [CanalIntegration] WhatsApp conectado com sucesso! logService.ts:108:13
2025-09-24T04:32:37.183Z [INFO ] [CanalIntegration] Desativando verificação automática de status logService.ts:108:13
[2025-09-24T04:32:37.184Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:188:17
[2025-09-24T04:32:37.185Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:188:17
2025-09-24T04:32:37.199Z [INFO ] [CanalIntegration] Monitoramento de status interrompido logService.ts:108:13
[2025-09-24T04:32:37.200Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:188:17
[2025-09-24T04:32:37.200Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:188:17
2025-09-24T04:32:37.317Z [INFO ] [WhatsApp       ] Ação solicitada: connect para tenant: nexsyn logService.ts:108:13
2025-09-24T04:32:37.317Z [INFO ] [WhatsApp       ] Nome da instância padrão: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.317Z [INFO ] [WhatsApp       ] Nome da instância salva anteriormente: nenhuma logService.ts:108:13
2025-09-24T04:32:37.317Z [DEBUG] [WhatsApp       ] Chamando API: GET https://evolution.nexsyn.com.br/instance/connectionState/revalya-nexsyn
{} logService.ts:115:15
2025-09-24T04:32:37.391Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/connectionState/revalya-nexsyn):
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.392Z [INFO ] [WhatsApp       ] Verificando status da instância: revalya-nexsyn logService.ts:108:13
2025-09-24T04:32:37.392Z [DEBUG] [WhatsApp       ] Chamando API: GET https://evolution.nexsyn.com.br/instance/connectionState/revalya-nexsyn
{} logService.ts:115:15
2025-09-24T04:32:37.466Z [DEBUG] [WhatsApp       ] Resposta da API (/instance/connectionState/revalya-nexsyn):
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.466Z [DEBUG] [WhatsApp       ] Status detalhado:
{
  "instance": {
    "instanceName": "revalya-nexsyn",
    "state": "open"
  }
} logService.ts:115:15
2025-09-24T04:32:37.466Z [INFO ] [WhatsApp       ] Status atual da instância revalya-nexsyn: connected logService.ts:108:13
2025-09-24T04:32:37.466Z [INFO ] [WhatsApp       ] Instância revalya-nexsyn já está conectada (connected) logService.ts:108:13
2025-09-24T04:32:37.466Z [INFO ] [WhatsApp       ] Buscando tenant pelo slug: nexsyn logService.ts:108:13
2025-09-24T04:32:37.846Z [INFO ] [WhatsApp       ] Tenant encontrado: nexsyn (ID: 8d2888f1-64a5-445f-84f5-2614d5160251) logService.ts:108:13
2025-09-24T04:32:38.109Z [INFO ] [WhatsApp       ] Configuração da instância revalya-nexsyn salva para o tenant nexsyn logService.ts:108:13
🔍 [DEBUG] 🔍 [TENANT ACCESS GUARD] Verificando acesso: (repetido 4x) 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
logThrottle.ts:28:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: nexsyn (repetido 3x) 
Object { tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "nexsyn", isValidTenant: true, queryKeyLength: 1, enabled: true }
logThrottle.ts:28:17
[2025-09-24T04:32:38.111Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:188:17
[2025-09-24T04:32:38.111Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:188:17
[TENANT ACCESS GUARD] 🔍 [TENANT ACCESS GUARD] Verificando acesso: (repetido 2x) 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, requireTenant: true, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isGlobalAdminAccess: false }
logThrottle.ts:28:17
🔍 [DEBUG] 🔍 [TENANT ACCESS GUARD] Verificando acesso: (repetido 3x) 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, hasCurrentTenant: true, isTenantActive: true, roleMatch: true }
logThrottle.ts:28:17
🔍 [DEBUG] useSecureTenantQuery - Tenant: nexsyn (repetido 2x) 
Object { tenantId: "8d2888f1-64a5-445f-84f5-2614d5160251", tenantName: "nexsyn", isValidTenant: true, queryKeyLength: 1, enabled: true }
logThrottle.ts:28:17
[2025-09-24T04:32:42.274Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:188:17
[2025-09-24T04:32:42.274Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:188:17
[TENANT ACCESS GUARD] 🔍 [TENANT ACCESS GUARD] Verificando acesso: 
Object { currentTenant: {…}, userRole: "ADMIN", requiredRole: undefined, requireTenant: true, hasCurrentTenant: true, isTenantActive: true, roleMatch: true, isGlobalAdminAccess: false }
logThrottle.ts:30:17
[2025-09-24T04:32:43.128Z] [DEBUG] 
Object { message: "Render - Estado atual do profile", metadata: {…} }
logger.ts:188:17
[2025-09-24T04:32:43.129Z] [DEBUG] 
Object { message: "Render - Estado atual da session", metadata: {…} }
logger.ts:188:17

​

