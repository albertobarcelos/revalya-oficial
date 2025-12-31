# 🔐 Padrão de Integração Única Multi-Tenant

**Data:** 2025-01-29  
**Contexto:** Sistema Revalya - Integrações com chave de API única nos secrets

---

## 📋 Resumo Executivo

Este documento explica como funciona o padrão de **integração única** (chave de API única nos secrets do Supabase) que é compartilhada entre todos os tenants, mas mantém isolamento e controle por tenant.

### Características

- ✅ **Chave de API única** armazenada nos secrets do Supabase (não por tenant)
- ✅ **Isolamento por tenant** através de verificação de integração ativa
- ✅ **Rate limiting por tenant** para distribuir créditos da API
- ✅ **Controle de acesso** verificando se tenant tem integração ativa

---

## 🏗️ Arquitetura do Padrão

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────┐
│              SUPABASE SECRETS (Vault)                    │
│  FOCUSNFE_API_KEY (chave única para todos os tenants)   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: focusnfe                    │
│  1. Extrai tenant_id do header (x-tenant-id)           │
│  2. Verifica se tenant tem integração ativa             │
│  3. Verifica rate limiting por tenant                   │
│  4. Busca chave única dos secrets                       │
│  5. Faz requisição para API externa                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         TABELA: tenant_integrations                     │
│  - Verifica se tenant tem integração ativa              │
│  - Não armazena chave (chave está nos secrets)         │
│  - Apenas flag is_active por tenant                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Comparação: Padrões Atuais

### Padrão 1: Chave por Tenant (Focus NFe Atual)

**Como funciona:**
- Cada tenant tem sua própria chave de API
- Chave armazenada em `payment_gateways.api_key` por tenant
- Edge Function busca chave específica do tenant

**Código atual:**
```typescript
// supabase/functions/focusnfe/index.ts
async function getFocusNFeCredentials(tenantId: string) {
  // Busca chave específica do tenant
  const { data } = await supabase
    .from('payment_gateways')
    .select('api_key, environment, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .maybeSingle();
  
  return {
    token: data.api_key, // Chave específica do tenant
    baseUrl: 'https://api.focusnfe.com.br/v2',
    isActive: data.is_active
  };
}
```

**Vantagens:**
- ✅ Cada tenant pode ter sua própria conta na API
- ✅ Isolamento total de créditos/limites

**Desvantagens:**
- ❌ Cada tenant precisa configurar sua própria chave
- ❌ Mais complexo de gerenciar
- ❌ Custo maior (múltiplas contas)

---

### Padrão 2: Chave Única nos Secrets (Evolution API)

**Como funciona:**
- Uma única chave de API para todos os tenants
- Chave armazenada nos secrets do Supabase (`EVOLUTION_API_KEY`)
- Edge Function verifica apenas se tenant tem integração ativa
- Rate limiting por tenant para distribuir créditos

**Código atual:**
```typescript
// supabase/functions/evolution-proxy/index.ts

// AIDEV-NOTE: Chave única nos secrets (não por tenant)
function getEvolutionApiCredentials() {
  const apiUrl = Deno.env.get('EVOLUTION_API_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY'); // Chave única
  
  if (!apiUrl || !apiKey) {
    throw new Error('Credenciais não configuradas nos secrets');
  }
  
  return { apiUrl, apiKey };
}

// AIDEV-NOTE: Verifica apenas se tenant tem integração ativa
async function checkTenantIntegration(tenantId: string) {
  const { data } = await supabase
    .from('tenant_integrations')
    .select('is_active')
    .eq('tenant_id', tenantId)
    .eq('integration_type', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.is_active === true;
}

// Handler principal
serve(async (req) => {
  const tenantId = req.headers.get('x-tenant-id');
  
  // 1. Verificar se tenant tem integração ativa
  const isActive = await checkTenantIntegration(tenantId);
  if (!isActive) {
    throw new Error('Integração não está ativa para este tenant');
  }
  
  // 2. Buscar chave única dos secrets
  const credentials = getEvolutionApiCredentials();
  
  // 3. Fazer requisição para API externa
  const response = await fetch(credentials.apiUrl + endpoint, {
    headers: { 'apikey': credentials.apiKey }
  });
  
  return response;
});
```

**Vantagens:**
- ✅ Configuração única (uma chave para todos)
- ✅ Mais simples de gerenciar
- ✅ Custo menor (uma conta compartilhada)
- ✅ Rate limiting centralizado

**Desvantagens:**
- ❌ Todos os tenants compartilham os mesmos créditos/limites
- ❌ Se um tenant abusar, pode afetar outros

---

## 🔄 Migração: Focus NFe para Padrão Único

### Passo 1: Atualizar Edge Function

```typescript
// supabase/functions/focusnfe/index.ts

// AIDEV-NOTE: Buscar chave única dos secrets (não por tenant)
function getFocusNFeCredentials(): {
  token: string;
  baseUrl: string;
} {
  const apiKey = Deno.env.get('FOCUSNFE_API_KEY');
  const environment = Deno.env.get('FOCUSNFE_ENVIRONMENT') || 'producao';
  
  if (!apiKey) {
    throw new Error('FOCUSNFE_API_KEY não configurada nos secrets. Configure em Dashboard > Edge Functions > Secrets');
  }
  
  const baseUrl = environment === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';
  
  return {
    token: apiKey,
    baseUrl
  };
}

// AIDEV-NOTE: Verificar se tenant tem integração ativa (não busca chave)
async function checkTenantIntegration(
  tenantId: string,
  environment: 'homologacao' | 'producao' = 'producao'
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // AIDEV-NOTE: Verificar se tenant tem integração FocusNFe ativa
  // Pode verificar em payment_gateways OU tenant_integrations
  const { data } = await supabase
    .from('payment_gateways')
    .select('is_active, environment')
    .eq('tenant_id', tenantId)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .maybeSingle();
  
  // AIDEV-NOTE: Verificar se ambiente corresponde (opcional)
  if (data && data.environment) {
    const configEnvironment = data.environment.toLowerCase();
    if (configEnvironment !== environment) {
      console.warn('[checkTenantIntegration] Ambiente não corresponde:', {
        esperado: environment,
        configurado: configEnvironment
      });
      // Pode retornar false ou permitir (depende da regra de negócio)
    }
  }
  
  return data?.is_active === true;
}

// AIDEV-NOTE: Handler atualizado
async function handleEmitNFe(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { referencia, dados_nfe, finance_entry_id, environment = 'producao' } = body;
    
    // 1. Verificar se tenant tem integração ativa
    const isActive = await checkTenantIntegration(tenantId, environment);
    if (!isActive) {
      throw new Error('FocusNFe não está ativo para este tenant. Ative nas configurações.');
    }
    
    // 2. Buscar chave única dos secrets
    const credentials = getFocusNFeCredentials();
    
    // 3. Verificar rate limiting por tenant
    if (!checkRateLimit(tenantId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Fazer requisição para Focus NFe
    const url = `${credentials.baseUrl}/nfe?ref=${encodeURIComponent(referencia)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.token}` // Chave única
      },
      body: JSON.stringify(dados_nfe)
    });
    
    // ... resto do código
  } catch (error) {
    // ... tratamento de erro
  }
}
```

### Passo 2: Configurar Secrets no Supabase

**No Supabase Dashboard:**
1. Acesse **Edge Functions** > **Secrets**
2. Adicione:
   - `FOCUSNFE_API_KEY`: Token da API Focus NFe
   - `FOCUSNFE_ENVIRONMENT`: `producao` ou `homologacao` (opcional)

### Passo 3: Atualizar Tabela de Configuração

**Opção A: Manter `payment_gateways` (Recomendado)**
- Manter tabela `payment_gateways` para configurações por tenant
- Remover campo `api_key` (não é mais necessário)
- Manter apenas `is_active` e `environment` por tenant
- Manter `settings` para configurações específicas (NFSe, etc.)

**Opção B: Migrar para `tenant_integrations`**
- Criar registro em `tenant_integrations` com `integration_type = 'focusnfe'`
- Manter apenas `is_active` e `environment`
- Remover dependência de `payment_gateways`

### Passo 4: Atualizar Frontend

```typescript
// src/services/focusnfeCityService.ts

// AIDEV-NOTE: Atualizar para não salvar api_key
export async function saveFocusNFeConfig(
  tenantId: string,
  config: {
    // api_key: string; // REMOVIDO - não é mais necessário
    environment: 'homologacao' | 'producao';
    is_active?: boolean;
    settings?: Record<string, any>;
  }
) {
  // AIDEV-NOTE: Configurar contexto de tenant
  await supabase.rpc('set_tenant_context_simple', {
    p_tenant_id: tenantId
  });

  const existing = await getFocusNFeConfig(tenantId);

  if (existing) {
    // Atualizar (sem api_key)
    const { data, error } = await supabase
      .from('payment_gateways')
      .update({
        // api_key: config.api_key, // REMOVIDO
        environment: config.environment,
        is_active: config.is_active !== undefined ? config.is_active : existing.is_active,
        settings: config.settings || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Criar (sem api_key)
    const { data, error } = await supabase
      .from('payment_gateways')
      .insert({
        tenant_id: tenantId,
        provider: 'focusnfe',
        is_active: config.is_active !== undefined ? config.is_active : true,
        // api_key: config.api_key, // REMOVIDO
        environment: config.environment,
        settings: config.settings || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

---

## 📋 Checklist de Migração

### Fase 1: Preparação
- [ ] Obter chave única da Focus NFe
- [ ] Configurar `FOCUSNFE_API_KEY` nos secrets do Supabase
- [ ] Configurar `FOCUSNFE_ENVIRONMENT` nos secrets (opcional)

### Fase 2: Backend
- [ ] Atualizar Edge Function `focusnfe/index.ts`:
  - [ ] Criar função `getFocusNFeCredentials()` (busca dos secrets)
  - [ ] Atualizar `checkTenantIntegration()` (não busca chave)
  - [ ] Atualizar handlers para usar chave única
- [ ] Testar Edge Function isoladamente

### Fase 3: Banco de Dados
- [ ] Decidir: manter `payment_gateways` ou migrar para `tenant_integrations`
- [ ] Criar migration para remover `api_key` de `payment_gateways` (se necessário)
- [ ] Atualizar RLS policies se necessário

### Fase 4: Frontend
- [ ] Atualizar `focusnfeCityService.ts`:
  - [ ] Remover campo `api_key` do formulário
  - [ ] Atualizar `saveFocusNFeConfig()` para não salvar chave
  - [ ] Atualizar `getFocusNFeConfig()` para não retornar chave
- [ ] Atualizar componente `NFeServiceTab.tsx`:
  - [ ] Remover input de token da API
  - [ ] Adicionar mensagem informando que chave é gerenciada pelo sistema

### Fase 5: Testes
- [ ] Testar emissão de NFe com tenant ativo
- [ ] Testar emissão de NFe com tenant inativo (deve falhar)
- [ ] Testar rate limiting por tenant
- [ ] Testar em ambiente de homologação
- [ ] Testar em ambiente de produção

---

## 🔐 Segurança

### Vantagens do Padrão Único

1. **Chave não exposta no banco**
   - Chave fica apenas nos secrets do Supabase
   - Não aparece em logs, backups ou queries

2. **Controle centralizado**
   - Uma única chave para gerenciar
   - Fácil de rotacionar se necessário

3. **Isolamento por tenant**
   - Cada tenant precisa ter integração ativa
   - Rate limiting por tenant previne abuso

### Considerações

1. **Rate Limiting**
   - Implementar rate limiting robusto por tenant
   - Monitorar uso para detectar abusos
   - Considerar Redis para rate limiting distribuído

2. **Logs e Auditoria**
   - Logar todas as requisições com tenant_id
   - Monitorar uso por tenant
   - Alertas para uso anormal

3. **Backup da Chave**
   - Manter backup seguro da chave
   - Documentar processo de rotacionamento

---

## 📚 Referências

- [Evolution API Integration](../supabase/functions/evolution-proxy/index.ts) - Exemplo de integração única
- [Focus NFe Integration](../supabase/functions/focusnfe/index.ts) - Integração atual (chave por tenant)
- [Supabase Secrets Documentation](https://supabase.com/docs/guides/functions/secrets)

---

**Autor:** Sistema Revalya  
**Última atualização:** 2025-01-29

