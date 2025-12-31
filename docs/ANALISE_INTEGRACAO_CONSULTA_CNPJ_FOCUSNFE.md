# 🔍 Análise: Integração Consulta de CNPJ - Focus NFe

**Data:** 2025-01-29  
**Contexto:** Sistema Multi-Tenant Revalya  
**Módulo:** Fiscal (Plano Avançado)

---

## 📋 Resumo Executivo

A Focus NFe oferece uma API de **consulta de CNPJ** que permite buscar informações completas de empresas diretamente pelo CNPJ. Esta funcionalidade será integrada ao fluxo de **criação de empresa** no sistema Revalya, facilitando o preenchimento automático de dados.

### Características Principais

- ✅ **Chave de API única** nos secrets do Supabase (não por tenant)
- ✅ **Disponível para todos os tenants** (mas apenas quem tem plano Avançado pode usar)
- ✅ **Integração no fluxo de criação de empresa**
- ✅ **Cache de consultas** para otimizar performance e reduzir custos

---

## 🔗 Documentação da API Focus NFe

### Endpoint de Consulta de CNPJ

**URL:** `https://api.focusnfe.com.br/v2/cnpj/{cnpj}`  
**Método:** `GET`  
**Autenticação:** Bearer Token (chave única nos secrets)

**Parâmetros:**
- `cnpj` (path): CNPJ sem formatação (somente números)

**Exemplo de Requisição:**
```http
GET https://api.focusnfe.com.br/v2/cnpj/12345678000123
Authorization: Bearer {FOCUSNFE_API_KEY}
```

### Resposta da API

```json
{
  "cnpj": "12345678000123",
  "razao_social": "Empresa Exemplo Ltda",
  "nome_fantasia": "Exemplo",
  "data_abertura": "2010-01-15",
  "situacao_cadastral": "ATIVA",
  "data_situacao_cadastral": "2010-01-15",
  "motivo_situacao_cadastral": null,
  "natureza_juridica": "2062",
  "natureza_juridica_descricao": "Sociedade Empresária Limitada",
  "endereco": {
    "logradouro": "Rua Exemplo",
    "numero": "123",
    "complemento": "Sala 45",
    "bairro": "Centro",
    "municipio": "São Paulo",
    "uf": "SP",
    "cep": "01234567",
    "codigo_municipio_ibge": "3550308"
  },
  "telefone": "11987654321",
  "email": "contato@exemplo.com.br",
  "capital_social": 100000.00,
  "porte": "DEMAIS",
  "socios": [
    {
      "nome": "João Silva",
      "cpf": "12345678909",
      "qualificacao": "49",
      "qualificacao_descricao": "Administrador"
    }
    // ... mais sócios
  ],
  "atividades_principais": [
    {
      "codigo": "6201-5/00",
      "descricao": "Desenvolvimento e programação de softwares"
    }
  ],
  "atividades_secundarias": [
    {
      "codigo": "6202-3/00",
      "descricao": "Consultoria em tecnologia da informação"
    }
  ],
  "situacao_especial": null,
  "data_situacao_especial": null
}
```

### Limites e Rate Limiting

- **Limite:** 100 créditos/minuto por token
- **Custo:** 1 crédito por consulta
- **Headers de resposta:**
  - `Rate-Limit-Limit`: 100
  - `Rate-Limit-Remaining`: 99
  - `Rate-Limit-Reset`: 60 (segundos)

---

## 🏗️ Arquitetura Proposta

### 1. Estrutura Multi-Tenant

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE SECRETS                      │
│  FOCUSNFE_API_KEY (chave única para todos os tenants)   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: focusnfe-cnpj               │
│  - Valida acesso (plano Avançado)                       │
│  - Implementa rate limiting                             │
│  - Cache de consultas (Redis ou Supabase)               │
│  - Proxy para API Focus NFe                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              FRONTEND: Formulário de Empresa            │
│  - Campo CNPJ com botão "Buscar dados"                  │
│  - Preenchimento automático após consulta               │
│  - Validação de acesso (plano Avançado)                 │
└─────────────────────────────────────────────────────────┘
```

### 2. Fluxo de Consulta

```
1. Usuário digita CNPJ no formulário
   ↓
2. Frontend valida se tenant tem plano Avançado
   ↓
3. Frontend chama Edge Function: /functions/v1/focusnfe-cnpj/{cnpj}
   ↓
4. Edge Function:
   a. Valida tenant_id (header x-tenant-id)
   b. Verifica plano Avançado
   c. Verifica cache (se existe, retorna)
   d. Consulta API Focus NFe
   e. Salva no cache (TTL: 24h)
   f. Retorna dados formatados
   ↓
5. Frontend preenche formulário automaticamente
```

---

## 💾 Estrutura de Dados

### Tabela de Cache (Opcional - pode usar Redis)

```sql
CREATE TABLE IF NOT EXISTS cnpj_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  data_consulta JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- AIDEV-NOTE: Índice único para evitar duplicatas
  UNIQUE(tenant_id, cnpj)
);

-- AIDEV-NOTE: Índice para busca rápida
CREATE INDEX idx_cnpj_cache_lookup ON cnpj_cache(tenant_id, cnpj, expires_at);

-- AIDEV-NOTE: RLS Policy
ALTER TABLE cnpj_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can only access their own cache"
  ON cnpj_cache
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );
```

### Estrutura de Resposta Formatada

```typescript
interface CNPJConsultaResponse {
  success: boolean;
  data?: {
    cnpj: string;
    razao_social: string;
    nome_fantasia?: string;
    data_abertura: string;
    situacao_cadastral: string;
    natureza_juridica: string;
    endereco: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      codigo_municipio_ibge: string;
    };
    telefone?: string;
    email?: string;
    capital_social?: number;
    porte?: string;
    atividades_principais: Array<{
      codigo: string;
      descricao: string;
    }>;
  };
  error?: string;
  cached?: boolean; // Indica se veio do cache
}
```

---

## 🔐 Segurança e Controle de Acesso

### 1. Validação de Plano Avançado

**⚠️ NOTA:** O sistema ainda não possui uma estrutura completa de planos/subscriptions. A implementação abaixo é uma proposta que pode ser adaptada quando o sistema de planos for implementado.

**Opção 1: Usando tabela de subscriptions (quando implementada)**
```typescript
// Edge Function: focusnfe-cnpj/index.ts
async function checkAdvancedPlan(tenantId: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // AIDEV-NOTE: Verificar se tenant tem plano Avançado
  const { data: subscription } = await supabase
    .from('tenant_subscriptions')
    .select('plan_name, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();
  
  // AIDEV-NOTE: Verificar se plano é Avançado
  return subscription?.plan_name === 'AVANCADO';
}
```

**Opção 2: Usando feature flags no tenant (temporário)**
```typescript
// Edge Function: focusnfe-cnpj/index.ts
async function checkAdvancedPlan(tenantId: string): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // AIDEV-NOTE: Verificar feature flag no tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('features')
    .eq('id', tenantId)
    .maybeSingle();
  
  // AIDEV-NOTE: Verificar se tem acesso ao módulo fiscal
  return tenant?.features?.fiscal_module === true || 
         tenant?.features?.advanced_plan === true;
}
```

**Opção 3: Permitir para todos (durante desenvolvimento)**
```typescript
// Edge Function: focusnfe-cnpj/index.ts
async function checkAdvancedPlan(tenantId: string): Promise<boolean> {
  // AIDEV-NOTE: Durante desenvolvimento, permitir para todos
  // TODO: Implementar verificação real quando sistema de planos estiver pronto
  const allowAll = Deno.env.get('ALLOW_ALL_CNPJ_LOOKUP') === 'true';
  if (allowAll) return true;
  
  // Implementar verificação real aqui quando disponível
  return false;
}
```

### 2. Rate Limiting por Tenant

```typescript
// AIDEV-NOTE: Rate limiting simples (em produção usar Redis)
const requestCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `cnpj_${tenantId}`;
  const limit = 50; // 50 consultas/minuto por tenant (reserva 50 para outros usos)
  const windowMs = 60000; // 1 minuto
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}
```

### 3. Chave de API nos Secrets

```bash
# Configurar no Supabase Dashboard > Edge Functions > Secrets
FOCUSNFE_API_KEY=seu-token-aqui
```

```typescript
// Edge Function
const FOCUSNFE_API_KEY = Deno.env.get('FOCUSNFE_API_KEY');
if (!FOCUSNFE_API_KEY) {
  throw new Error('FOCUSNFE_API_KEY não configurada nos secrets');
}
```

---

## 🎨 Implementação Frontend

### Componente de Consulta CNPJ

```typescript
// src/components/company/CNPJLookup.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

interface CNPJLookupProps {
  onDataReceived: (data: CNPJConsultaResponse['data']) => void;
  disabled?: boolean;
}

export function CNPJLookup({ onDataReceived, disabled }: CNPJLookupProps) {
  const { toast } = useToast();
  const { currentTenant, hasAccess } = useTenantAccessGuard();
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // AIDEV-NOTE: Verificar se tenant tem plano Avançado
  const hasAdvancedPlan = useMemo(() => {
    // TODO: Implementar verificação de plano quando sistema estiver pronto
    // Opções:
    // 1. Verificar feature flag: currentTenant?.features?.fiscal_module
    // 2. Verificar subscription: buscar de tenant_subscriptions
    // 3. Durante desenvolvimento: permitir para todos
    
    // Placeholder: verificar feature flag
    return currentTenant?.features?.fiscal_module === true || 
           currentTenant?.features?.advanced_plan === true;
  }, [currentTenant]);

  const handleLookup = async () => {
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      toast({
        title: 'CNPJ inválido',
        description: 'Por favor, informe um CNPJ válido (14 dígitos)',
        variant: 'destructive',
      });
      return;
    }

    if (!hasAdvancedPlan) {
      toast({
        title: 'Plano insuficiente',
        description: 'Esta funcionalidade está disponível apenas no plano Avançado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const cnpjClean = cnpj.replace(/\D/g, '');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe-cnpj/${cnpjClean}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-tenant-id': currentTenant?.id || '',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao consultar CNPJ');
      }

      onDataReceived(result.data);
      toast({
        title: 'Dados encontrados',
        description: result.cached 
          ? 'Dados carregados do cache'
          : 'Dados consultados com sucesso',
      });
    } catch (error: any) {
      console.error('[CNPJLookup] Erro:', error);
      toast({
        title: 'Erro ao consultar',
        description: error.message || 'Não foi possível consultar o CNPJ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={cnpj}
        onChange={(e) => setCnpj(e.target.value)}
        placeholder="00.000.000/0000-00"
        disabled={disabled || isLoading || !hasAdvancedPlan}
        maxLength={18}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleLookup();
          }
        }}
      />
      <Button
        type="button"
        onClick={handleLookup}
        disabled={disabled || isLoading || !hasAdvancedPlan}
        variant="outline"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
```

### Integração no Formulário de Empresa

```typescript
// src/components/company/MyCompanySettings.tsx (exemplo)
import { CNPJLookup } from './CNPJLookup';

// Dentro do componente:
<FormField
  control={form.control}
  name="cnpj"
  render={({ field }) => (
    <FormItem>
      <FormLabel>CNPJ</FormLabel>
      <div className="flex gap-2">
        <FormControl>
          <Input {...field} placeholder="00.000.000/0000-00" />
        </FormControl>
        <CNPJLookup
          onDataReceived={(data) => {
            // AIDEV-NOTE: Preencher formulário automaticamente
            form.setValue('cnpj', data.cnpj);
            form.setValue('razao_social', data.razao_social);
            form.setValue('nome_fantasia', data.nome_fantasia || '');
            form.setValue('logradouro', data.endereco.logradouro);
            form.setValue('numero', data.endereco.numero);
            form.setValue('complemento', data.endereco.complemento || '');
            form.setValue('bairro', data.endereco.bairro);
            form.setValue('cidade', data.endereco.municipio);
            form.setValue('uf', data.endereco.uf);
            form.setValue('cep', data.endereco.cep);
            form.setValue('telefone', data.telefone || '');
            form.setValue('email', data.email || '');
          }}
        />
      </div>
      <FormDescription>
        Digite o CNPJ e clique na lupa para buscar dados automaticamente
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## 🚀 Edge Function: focusnfe-cnpj

### Estrutura do Arquivo

```typescript
// supabase/functions/focusnfe-cnpj/index.ts
/**
 * Edge Function: Consulta de CNPJ via Focus NFe
 * 
 * AIDEV-NOTE: Proxy para consulta de CNPJ com:
 * - Validação de plano Avançado
 * - Rate limiting por tenant
 * - Cache de consultas (24h)
 * - Chave de API única nos secrets
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

// AIDEV-NOTE: Rate limiting simples
const requestCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = `cnpj_${tenantId}`;
  const limit = 50; // 50 consultas/minuto por tenant
  const windowMs = 60000;
  
  const current = requestCache.get(key);
  
  if (!current || now > current.resetTime) {
    requestCache.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

// AIDEV-NOTE: Verificar se tenant tem plano Avançado
// ⚠️ ADAPTAR: Quando sistema de planos estiver implementado
async function checkAdvancedPlan(tenantId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // AIDEV-NOTE: Opção 1 - Usar feature flags (temporário)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('features')
    .eq('id', tenantId)
    .maybeSingle();
  
  if (tenant?.features?.fiscal_module === true) {
    return true;
  }
  
  // AIDEV-NOTE: Opção 2 - Usar subscriptions (quando implementado)
  // const { data: subscription } = await supabase
  //   .from('tenant_subscriptions')
  //   .select('plan_name, status')
  //   .eq('tenant_id', tenantId)
  //   .eq('status', 'active')
  //   .maybeSingle();
  // return subscription?.plan_name === 'AVANCADO';
  
  // AIDEV-NOTE: Durante desenvolvimento, pode permitir para todos
  const allowAll = Deno.env.get('ALLOW_ALL_CNPJ_LOOKUP') === 'true';
  return allowAll;
}

// AIDEV-NOTE: Verificar cache
async function getCachedCNPJ(tenantId: string, cnpj: string): Promise<any | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data } = await supabase
    .from('cnpj_cache')
    .select('data_consulta')
    .eq('tenant_id', tenantId)
    .eq('cnpj', cnpj)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  
  return data?.data_consulta || null;
}

// AIDEV-NOTE: Salvar no cache
async function saveToCache(tenantId: string, cnpj: string, data: any): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // TTL: 24 horas
  
  await supabase
    .from('cnpj_cache')
    .upsert({
      tenant_id: tenantId,
      cnpj,
      data_consulta: data,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'tenant_id,cnpj'
    });
}

// AIDEV-NOTE: Consultar API Focus NFe
async function consultFocusNFe(cnpj: string): Promise<any> {
  const apiKey = Deno.env.get('FOCUSNFE_API_KEY');
  
  if (!apiKey) {
    throw new Error('FOCUSNFE_API_KEY não configurada nos secrets');
  }
  
  const url = `https://api.focusnfe.com.br/v2/cnpj/${cnpj}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.mensagem || error.codigo || 'Erro ao consultar CNPJ');
  }
  
  return await response.json();
}

// AIDEV-NOTE: Handler principal
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/focusnfe-cnpj', '');
    
    // AIDEV-NOTE: Extrair CNPJ do path
    const cnpjMatch = path.match(/^\/(\d{14})$/);
    if (!cnpjMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'CNPJ inválido ou não fornecido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const cnpj = cnpjMatch[1];
    
    // AIDEV-NOTE: Extrair tenant_id do header
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant ID é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Verificar plano Avançado
    const hasAdvancedPlan = await checkAdvancedPlan(tenantId);
    if (!hasAdvancedPlan) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta funcionalidade está disponível apenas no plano Avançado' 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Verificar rate limiting
    if (!checkRateLimit(tenantId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Limite de consultas excedido. Tente novamente em alguns minutos.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Verificar cache primeiro
    const cached = await getCachedCNPJ(tenantId, cnpj);
    if (cached) {
      return new Response(
        JSON.stringify({
          success: true,
          data: cached,
          cached: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Consultar API Focus NFe
    const data = await consultFocusNFe(cnpj);
    
    // AIDEV-NOTE: Salvar no cache
    await saveToCache(tenantId, cnpj, data);
    
    return new Response(
      JSON.stringify({
        success: true,
        data,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[focusnfe-cnpj] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

## 📊 Migration: Tabela de Cache

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_cnpj_cache_table.sql

-- AIDEV-NOTE: Tabela para cache de consultas de CNPJ
CREATE TABLE IF NOT EXISTS cnpj_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  data_consulta JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- AIDEV-NOTE: Índice único para evitar duplicatas
  CONSTRAINT unique_tenant_cnpj UNIQUE(tenant_id, cnpj)
);

-- AIDEV-NOTE: Índice para busca rápida
CREATE INDEX idx_cnpj_cache_lookup ON cnpj_cache(tenant_id, cnpj, expires_at);

-- AIDEV-NOTE: Índice para limpeza automática de expirados
CREATE INDEX idx_cnpj_cache_expires ON cnpj_cache(expires_at);

-- AIDEV-NOTE: RLS Policy
ALTER TABLE cnpj_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can only access their own cache"
  ON cnpj_cache
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- AIDEV-NOTE: Comentários
COMMENT ON TABLE cnpj_cache IS 'Cache de consultas de CNPJ via API Focus NFe. TTL: 24 horas.';
COMMENT ON COLUMN cnpj_cache.data_consulta IS 'Dados completos retornados pela API Focus NFe';
COMMENT ON COLUMN cnpj_cache.expires_at IS 'Data de expiração do cache (24h após criação)';
```

---

## ✅ Checklist de Implementação

### Fase 1: Infraestrutura
- [ ] Criar migration para tabela `cnpj_cache`
- [ ] Criar Edge Function `focusnfe-cnpj`
- [ ] Configurar secret `FOCUSNFE_API_KEY` no Supabase
- [ ] Testar Edge Function isoladamente

### Fase 2: Frontend
- [ ] Criar componente `CNPJLookup.tsx`
- [ ] Integrar no formulário de criação de empresa
- [ ] Adicionar validação de plano Avançado
- [ ] Implementar tratamento de erros
- [ ] Adicionar feedback visual (loading, sucesso, erro)

### Fase 3: Testes
- [ ] Testar consulta de CNPJ válido
- [ ] Testar consulta de CNPJ inválido
- [ ] Testar cache (segunda consulta deve vir do cache)
- [ ] Testar rate limiting
- [ ] Testar validação de plano (sem plano Avançado)
- [ ] Testar preenchimento automático do formulário

### Fase 4: Otimizações
- [ ] Implementar limpeza automática de cache expirado (cron job)
- [ ] Adicionar métricas de uso (quantas consultas por tenant)
- [ ] Implementar Redis para rate limiting (opcional)
- [ ] Adicionar logs de auditoria

---

## 🎯 Próximos Passos

1. **Criar migration** para tabela `cnpj_cache`
2. **Criar Edge Function** `focusnfe-cnpj`
3. **Configurar secret** `FOCUSNFE_API_KEY` no Supabase Dashboard
4. **Criar componente** `CNPJLookup.tsx` no frontend
5. **Integrar** no formulário de criação de empresa
6. **Testar** em ambiente de desenvolvimento

---

## 📚 Referências

- [Documentação Focus NFe - Consulta de CNPJ](https://focusnfe.com.br/doc/#consulta-de-cnpj_resposta-da-api)
- [Documentação Focus NFe - Autenticação](https://focusnfe.com.br/doc/#autenticacao)
- [Documentação Focus NFe - Rate Limiting](https://focusnfe.com.br/doc/#limite-de-requisicoes)

---

**Autor:** Sistema Revalya  
**Última atualização:** 2025-01-29

