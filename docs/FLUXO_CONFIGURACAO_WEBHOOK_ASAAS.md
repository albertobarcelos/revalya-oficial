# 🔄 Fluxo Completo: Configuração do Webhook Asaas

## 📋 Visão Geral

Este documento explica **exatamente o que acontece** quando você clica no botão **"Configurar Webhook"** na interface de integrações.

---

## 🎯 Onde Está o Botão?

**Localização:** 
- Página: **Configurações** → **Integrações**
- Seção: **Asaas** (card de integração)
- Componente: `SetupAsaasWebhook` (`src/components/asaas/setup-asaas-webhook.tsx`)

---

## 🔄 Fluxo Passo a Passo

### **1. Clique no Botão "Configurar Webhook"**

**Arquivo:** `src/components/asaas/setup-asaas-webhook.tsx` (linha 59)

```typescript
const handleSetupWebhook = async () => {
  setStatus({ loading: true })
  const result = await setupTenantWebhook(tenantId)
  // ...
}
```

**O que acontece:**
- ✅ Botão fica desabilitado e mostra spinner de loading
- ✅ Chama a função `setupTenantWebhook(tenantId)`

---

### **2. Configuração do Contexto do Tenant**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 271-289)

```typescript
// Configura contexto de segurança multi-tenant
const { data: { session } } = await supabase.auth.getSession()
const { error: contextError } = await supabase.rpc('set_tenant_context_flexible', {
  p_tenant_id: tenantId,
  p_user_id: session?.user?.id
})
```

**O que acontece:**
- ✅ Obtém sessão do usuário autenticado
- ✅ Configura contexto do tenant com ID do usuário
- ✅ Garante segurança multi-tenant (usuário só acessa seu tenant)

---

### **3. Busca Credenciais da Integração Asaas**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 291-306)

```typescript
// Busca integração do Asaas
const { data: integration } = await supabase
  .from('tenant_integrations')
  .select('config, is_active, environment')
  .eq('tenant_id', tenantId)
  .eq('integration_type', 'asaas')
  .eq('is_active', true)
  .maybeSingle()
```

**O que acontece:**
- ✅ Busca configuração da integração Asaas no banco
- ✅ Verifica se está ativa (`is_active = true`)
- ✅ Obtém `environment` (production/sandbox) e `config`

---

### **4. Descriptografa a Chave API**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 308-334)

```typescript
// Descriptografa chave API usando função RPC segura
const { data: decryptedKey } = await supabase.rpc('get_decrypted_api_key', {
  p_tenant_id: tenantId,
  p_integration_type: 'asaas'
})
```

**O que acontece:**
- ✅ Chama função RPC `get_decrypted_api_key` para descriptografar
- ✅ A chave API está criptografada no banco (segurança)
- ✅ Se falhar, tenta usar texto plano do `config` (compatibilidade)

---

### **5. Determina URL da API Asaas**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 344-350)

```typescript
const environment = config.environment || integration.environment || 'sandbox'
const apiUrl = config.api_url || (environment === 'production' 
  ? 'https://api.asaas.com/v3' 
  : 'https://sandbox.asaas.com/v3')
```

**O que acontece:**
- ✅ Determina se é **production** ou **sandbox**
- ✅ Monta URL da API baseada no ambiente
- ✅ Garante que URL termina com `/v3`

---

### **6. Gera Configuração do Webhook**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 352-356)

```typescript
const webhookConfig: WebhookConfig = {
  url: generateWebhookUrl(tenantId),
  token: generateSecureToken(32) // Token de 32 caracteres
}
```

**O que acontece:**
- ✅ Gera URL do webhook: `https://[supabase-url]/functions/v1/asaas-webhook-charges/{tenant_id}`
- ✅ Gera token seguro de 32 caracteres usando Web Crypto API
- ✅ Token será usado para validar requisições do Asaas

**Função `generateWebhookUrl`:**
```typescript
function generateWebhookUrl(tenantId: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return `${supabaseUrl}/functions/v1/asaas-webhook-charges/${tenantId}`
}
```

---

### **7. Verifica Webhook Existente no Asaas**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 73-91)

```typescript
// Lista webhooks existentes
const listPath = '/webhooks?limit=100'
const listResponse = await fetch(PROXY_URL, {
  method: 'POST',
  body: JSON.stringify({
    path: listPath,
    method: 'GET',
    tenant_id: tenantId,
    environment: environment
  })
})

// Verifica se já existe webhook com a mesma URL
const existingWebhook = listData.data.find(
  (wh: { url: string }) => wh.url === webhookConfig.url
)
```

**O que acontece:**
- ✅ Lista todos os webhooks configurados no Asaas
- ✅ Verifica se já existe webhook com a mesma URL
- ✅ Se existir, **atualiza** ao invés de criar novo (evita duplicatas)

---

### **8. Cria ou Atualiza Webhook no Asaas**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 113-173)

**Se webhook existir (UPDATE):**
```typescript
const basePath = `/webhooks/${existingWebhookId}`
const method = 'PUT'
```

**Se webhook não existir (CREATE):**
```typescript
const basePath = '/webhooks'
const method = 'POST'
```

**Body da requisição:**
```typescript
{
  name: `Webhook Revalya - Tenant ${tenantId}`,
  url: webhookConfig.url, // URL do nosso endpoint
  email: userEmail, // Email do usuário autenticado
  enabled: true,
  interrupted: false,
  apiVersion: 3,
  authToken: webhookConfig.token, // Token de segurança
  sendType: 'SEQUENTIALLY',
  events: [
    'PAYMENT_RECEIVED',    // Pagamento recebido
    'PAYMENT_CONFIRMED',    // Pagamento confirmado
    'PAYMENT_OVERDUE',      // Pagamento vencido
    'PAYMENT_REFUNDED',     // Pagamento estornado
    'PAYMENT_DELETED',      // Pagamento deletado
    'PAYMENT_RESTORED',     // Pagamento restaurado
    'PAYMENT_UPDATED',      // Pagamento atualizado
    'PAYMENT_ANTICIPATED'   // Pagamento antecipado
  ]
}
```

**Requisição via Proxy:**
```typescript
const response = await fetch(PROXY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'x-tenant-id': tenantId
  },
  body: JSON.stringify({
    path: basePath,
    method: method,
    data: { /* body acima */ },
    tenant_id: tenantId,
    environment: environment
  })
})
```

**O que acontece:**
- ✅ Requisição vai para **Edge Function `asaas-proxy`** (evita CORS)
- ✅ Proxy busca credenciais do banco e faz requisição ao Asaas
- ✅ Asaas cria/atualiza webhook e retorna dados (incluindo ID)

**Eventos selecionados automaticamente:**
- ✅ **8 eventos de pagamento** são selecionados automaticamente
- ✅ Não há opção manual - sempre os mesmos eventos
- ✅ Todos relacionados a mudanças de status de pagamentos

---

### **9. Salva Configuração no Banco de Dados**

**Arquivo:** `src/services/asaas/webhookService.ts` (linha 213-250)

```typescript
// Reconfigura contexto do tenant (pode ter sido perdido após proxy)
const { data: { session: sessionForContext } } = await supabase.auth.getSession()
await supabase.rpc('set_tenant_context_flexible', {
  p_tenant_id: tenantId,
  p_user_id: sessionForContext?.user?.id
})

// Atualiza tabela tenant_integrations
const { data: updateData } = await supabase
  .from('tenant_integrations')
  .update({
    webhook_url: webhookConfig.url,
    webhook_token: webhookConfig.token,
    updated_at: new Date().toISOString()
  })
  .eq('tenant_id', tenantId)
  .eq('integration_type', 'asaas')
  .eq('is_active', true)
  .select()
```

**O que acontece:**
- ✅ Reconfigura contexto do tenant (segurança)
- ✅ Atualiza `tenant_integrations` com URL e token do webhook
- ✅ Salva timestamp de atualização

---

### **10. Retorna Resultado para Interface**

**Arquivo:** `src/components/asaas/setup-asaas-webhook.tsx` (linha 63-88)

```typescript
if (result.success) {
  setStatus({
    loading: false,
    success: true,
    message: result.message
  })
  await loadWebhookStatus() // Recarrega status
  onSuccess?.() // Callback de sucesso
} else {
  setStatus({
    loading: false,
    success: false,
    error: result.error
  })
  onError?.(result.error)
}
```

**O que acontece:**
- ✅ Mostra mensagem de sucesso ou erro
- ✅ Recarrega status do webhook
- ✅ Atualiza UI (botão muda para "Remover Webhook" se configurado)

---

## 📊 Resumo do Fluxo

```
1. Usuário clica "Configurar Webhook"
   ↓
2. Configura contexto do tenant (segurança)
   ↓
3. Busca credenciais da integração Asaas
   ↓
4. Descriptografa chave API
   ↓
5. Determina URL da API (production/sandbox)
   ↓
6. Gera URL e token do webhook
   ↓
7. Verifica se webhook já existe no Asaas
   ↓
8. Cria ou atualiza webhook no Asaas (via proxy)
   ├─ URL: https://[supabase]/functions/v1/asaas-webhook-charges/{tenant_id}
   ├─ Token: [token gerado]
   └─ Eventos: 8 eventos de pagamento (automático)
   ↓
9. Salva configuração no banco (tenant_integrations)
   ↓
10. Mostra resultado na interface
```

---

## ⚙️ Opções e Configurações

### **Eventos Selecionados (Automático)**

Os seguintes **8 eventos** são sempre selecionados automaticamente:

1. ✅ `PAYMENT_RECEIVED` - Pagamento recebido
2. ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado
3. ✅ `PAYMENT_OVERDUE` - Pagamento vencido
4. ✅ `PAYMENT_REFUNDED` - Pagamento estornado
5. ✅ `PAYMENT_DELETED` - Pagamento deletado
6. ✅ `PAYMENT_RESTORED` - Pagamento restaurado
7. ✅ `PAYMENT_UPDATED` - Pagamento atualizado
8. ✅ `PAYMENT_ANTICIPATED` - Pagamento antecipado

**Não há opção manual** - sempre os mesmos eventos.

### **URL do Webhook (Automático)**

A URL é gerada automaticamente baseada em:
- `VITE_SUPABASE_URL` (variável de ambiente)
- `tenant_id` (ID do tenant atual)

**Formato:**
```
https://[supabase-url]/functions/v1/asaas-webhook-charges/{tenant_id}
```

### **Token (Gerado Automaticamente)**

- ✅ Gerado usando **Web Crypto API**
- ✅ 32 caracteres hexadecimais
- ✅ Armazenado criptografado no banco
- ✅ Usado para validar requisições do Asaas

---

## 🔒 Segurança

1. **Contexto Multi-Tenant:**
   - Sempre configura contexto antes de operações
   - Usuário só acessa seu próprio tenant

2. **Chave API Criptografada:**
   - Armazenada criptografada no banco
   - Descriptografada apenas quando necessário

3. **Proxy para Asaas:**
   - Chave API nunca exposta no cliente
   - Requisições passam por Edge Function segura

4. **Token de Webhook:**
   - Gerado de forma segura
   - Validado em cada requisição do Asaas

---

## ✅ Resultado Esperado

Após clicar em "Configurar Webhook":

1. ✅ Webhook criado/atualizado no Asaas
2. ✅ Configuração salva no banco (`tenant_integrations`)
3. ✅ Interface mostra mensagem de sucesso
4. ✅ Botão muda para "Remover Webhook"
5. ✅ Webhook pronto para receber notificações do Asaas

---

## 🐛 Troubleshooting

### Erro: "Usuário não autenticado"
- **Causa:** Contexto do tenant não configurado corretamente
- **Solução:** Já corrigido - agora usa UPDATE direto em vez de RPC

### Erro: "Integração Asaas não encontrada"
- **Causa:** Integração não configurada ou inativa
- **Solução:** Configure a integração Asaas primeiro

### Erro: "Chave API não encontrada"
- **Causa:** Chave API não configurada ou não descriptografável
- **Solução:** Verifique configuração da integração

---

## 📝 Notas Técnicas

- **Proxy URL:** `${VITE_SUPABASE_URL}/functions/v1/asaas-proxy`
- **Webhook URL:** `${VITE_SUPABASE_URL}/functions/v1/asaas-webhook-charges/{tenant_id}`
- **Tabela:** `tenant_integrations` (campos `webhook_url`, `webhook_token`)
- **Função RPC:** Não usa mais `setup_asaas_webhook` - usa UPDATE direto
