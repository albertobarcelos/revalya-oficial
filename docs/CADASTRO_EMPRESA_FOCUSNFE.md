# 🏢 Cadastro de Empresa no Focus NFe

**Data:** 2025-01-29  
**Contexto:** Integração Focus NFe - Padrão Único

---

## 📋 Resumo

Para usar a API Focus NFe, **é necessário cadastrar a empresa emitente no painel do Focus NFe** antes de emitir notas. Existem duas formas de fazer isso:

1. **Cadastro Manual** (via painel web)
2. **Cadastro Automático** (via API de Revenda - se disponível)

---

## 🔄 Fluxo Atual vs. Fluxo Ideal

### ❌ Fluxo Atual (Incompleto)

```
1. Usuário ativa integração Focus NFe no sistema
2. Sistema verifica se integração está ativa
3. ❌ Empresa NÃO está cadastrada no Focus NFe
4. ❌ Tentativa de emitir nota FALHA
```

### ✅ Fluxo Ideal (Completo)

```
1. Usuário salva dados da empresa no sistema
2. Sistema verifica se empresa está cadastrada no Focus NFe
3. Se não estiver:
   a. Cadastra automaticamente via API de Revenda
   b. OU solicita cadastro manual
4. Usuário ativa integração Focus NFe
5. Sistema pode emitir notas normalmente
```

---

## 🎯 Solução: Cadastro Automático via API de Revenda

### O que é a API de Revenda?

A API de Revenda do Focus NFe permite criar, consultar, alterar e excluir empresas emitentes programaticamente. É necessário ter um **token de revenda** específico fornecido pela equipe Focus NFe.

### Endpoint de Criação de Empresa

**URL:** `https://api.focusnfe.com.br/v2/empresas`  
**Método:** `POST`  
**Autenticação:** Bearer Token (token de revenda)

**Body:**
```json
{
  "cnpj": "12345678000123",
  "razao_social": "Empresa Exemplo Ltda",
  "nome_fantasia": "Exemplo",
  "inscricao_estadual": "123456789",
  "inscricao_municipal": "987654",
  "regime_tributario": "1",
  "cnae_principal": "6201-5/00",
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
  "email": "contato@exemplo.com.br"
}
```

**Resposta:**
```json
{
  "id": "uuid-da-empresa",
  "cnpj": "12345678000123",
  "razao_social": "Empresa Exemplo Ltda",
  "status": "ativo",
  "token_producao": "token-gerado",
  "token_homologacao": "token-gerado"
}
```

---

## 🏗️ Implementação Proposta

### 1. Edge Function: `focusnfe-empresas`

Criar uma nova Edge Function para gerenciar empresas no Focus NFe:

```typescript
// supabase/functions/focusnfe-empresas/index.ts

/**
 * Edge Function: Gerenciamento de Empresas Focus NFe
 * 
 * Endpoints:
 * - POST /focusnfe-empresas/create - Criar empresa
 * - GET /focusnfe-empresas/{cnpj} - Consultar empresa
 * - PUT /focusnfe-empresas/{cnpj} - Atualizar empresa
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS'
};

/**
 * AIDEV-NOTE: Buscar token de revenda dos secrets
 */
function getResellerToken(): string {
  const token = Deno.env.get('FOCUSNFE_RESELLER_TOKEN');
  if (!token || !token.trim()) {
    throw new Error('FOCUSNFE_RESELLER_TOKEN não configurado nos secrets. Entre em contato com o suporte.');
  }
  return token.trim();
}

/**
 * AIDEV-NOTE: Verificar se tenant tem integração ativa
 */
async function checkTenantIntegration(tenantId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data } = await supabase
    .from('payment_gateways')
    .select('is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'focusnfe')
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.is_active === true;
}

/**
 * AIDEV-NOTE: Criar empresa no Focus NFe
 */
async function createCompanyInFocusNFe(companyData: any): Promise<any> {
  const token = getResellerToken();
  const url = 'https://api.focusnfe.com.br/v2/empresas';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(companyData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.mensagem || error.codigo || 'Erro ao criar empresa no Focus NFe');
  }
  
  return await response.json();
}

/**
 * AIDEV-NOTE: Consultar empresa no Focus NFe
 */
async function getCompanyFromFocusNFe(cnpj: string): Promise<any> {
  const token = getResellerToken();
  const url = `https://api.focusnfe.com.br/v2/empresas?cnpj=${cnpj}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Empresa não encontrada
    }
    const error = await response.json();
    throw new Error(error.mensagem || error.codigo || 'Erro ao consultar empresa');
  }
  
  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

/**
 * AIDEV-NOTE: Handler para criar empresa
 */
async function handleCreateCompany(req: Request, tenantId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { company_data } = body;
    
    if (!company_data || !company_data.cnpj) {
      throw new Error('Dados da empresa são obrigatórios');
    }
    
    // AIDEV-NOTE: Verificar se empresa já existe
    const existing = await getCompanyFromFocusNFe(company_data.cnpj.replace(/\D/g, ''));
    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Empresa já cadastrada no Focus NFe',
          data: existing
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Preparar dados para Focus NFe
    const focusNFeData = {
      cnpj: company_data.cnpj.replace(/\D/g, ''),
      razao_social: company_data.razao_social,
      nome_fantasia: company_data.nome_fantasia || company_data.razao_social,
      inscricao_estadual: company_data.inscricao_estadual || '',
      inscricao_municipal: company_data.inscricao_municipal || '',
      regime_tributario: company_data.regime_tributario || '1',
      cnae_principal: company_data.cnae_principal || '',
      endereco: {
        logradouro: company_data.logradouro || '',
        numero: company_data.numero || '',
        complemento: company_data.complemento || '',
        bairro: company_data.bairro || '',
        municipio: company_data.cidade || '',
        uf: company_data.uf || '',
        cep: company_data.cep?.replace(/\D/g, '') || '',
        codigo_municipio_ibge: company_data.codigo_municipio_ibge || ''
      },
      telefone: company_data.telefone ? 
        `${company_data.ddd || ''}${company_data.telefone}`.replace(/\D/g, '') : '',
      email: company_data.email || ''
    };
    
    // AIDEV-NOTE: Criar empresa no Focus NFe
    const result = await createCompanyInFocusNFe(focusNFeData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Empresa cadastrada com sucesso no Focus NFe',
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[handleCreateCompany] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar empresa'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * AIDEV-NOTE: Handler principal
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/focusnfe-empresas', '') || '/';
    const method = req.method;
    
    // AIDEV-NOTE: Extrair tenant_id
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório');
    }
    
    // AIDEV-NOTE: Verificar se tenant tem integração ativa
    const isActive = await checkTenantIntegration(tenantId);
    if (!isActive) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Integração Focus NFe não está ativa para este tenant'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // AIDEV-NOTE: Router
    if (path === '/create' && method === 'POST') {
      return await handleCreateCompany(req, tenantId);
    }
    
    return new Response(
      JSON.stringify({ error: 'Rota não encontrada' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[focusnfe-empresas] Erro:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### 2. Integração no Fluxo de Salvar Empresa

Atualizar o hook `useSaveCompanyData` para cadastrar automaticamente no Focus NFe:

```typescript
// src/components/company/hooks/useCompanyData.ts

export function useSaveCompanyData() {
  const { currentTenant } = useTenantAccessGuard();
  
  const saveCompanyData = async (tenantId: string, data: CompanyDataForm) => {
    // ... código existente para salvar no banco ...
    
    // AIDEV-NOTE: Após salvar, verificar se precisa cadastrar no Focus NFe
    if (data.cnpj && data.razao_social) {
      try {
        // Verificar se integração Focus NFe está ativa
        const focusNFeConfig = await getFocusNFeConfig(tenantId);
        
        if (focusNFeConfig?.is_active) {
          // Tentar cadastrar no Focus NFe
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe-empresas/create`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId,
              },
              body: JSON.stringify({
                company_data: data
              })
            }
          );
          
          const result = await response.json();
          
          if (result.success) {
            console.log('[useSaveCompanyData] Empresa cadastrada no Focus NFe:', result.data);
          } else {
            console.warn('[useSaveCompanyData] Aviso ao cadastrar no Focus NFe:', result.error);
            // Não falha o salvamento, apenas loga o aviso
          }
        }
      } catch (error) {
        console.error('[useSaveCompanyData] Erro ao cadastrar no Focus NFe:', error);
        // Não falha o salvamento, apenas loga o erro
      }
    }
  };
  
  return { saveCompanyData };
}
```

---

## ⚠️ Limitações e Considerações

### 1. Token de Revenda

- **Necessário:** Token de revenda fornecido pela equipe Focus NFe
- **Configuração:** Deve ser adicionado nos secrets do Supabase como `FOCUSNFE_RESELLER_TOKEN`
- **Acesso:** Nem todos os clientes têm acesso à API de Revenda

### 2. Certificado Digital

- **Obrigatório:** Para emitir notas, a empresa precisa ter certificado digital A1
- **Upload:** O certificado deve ser enviado manualmente no painel do Focus NFe
- **Automação:** Não é possível fazer upload do certificado via API

### 3. Fallback Manual

Se a API de Revenda não estiver disponível, o sistema deve:
- Mostrar instruções para cadastro manual
- Link direto para o painel do Focus NFe
- Validação antes de tentar emitir notas

---

## 📋 Checklist de Implementação

### Fase 1: Configuração
- [ ] Obter token de revenda da Focus NFe
- [ ] Configurar `FOCUSNFE_RESELLER_TOKEN` nos secrets do Supabase
- [ ] Testar API de Revenda isoladamente

### Fase 2: Edge Function
- [ ] Criar Edge Function `focusnfe-empresas`
- [ ] Implementar endpoint de criação de empresa
- [ ] Implementar endpoint de consulta de empresa
- [ ] Testar Edge Function

### Fase 3: Integração Frontend
- [ ] Atualizar `useSaveCompanyData` para cadastrar automaticamente
- [ ] Adicionar feedback visual (sucesso/erro)
- [ ] Implementar fallback para cadastro manual

### Fase 4: Validação
- [ ] Testar cadastro automático ao salvar empresa
- [ ] Testar consulta de empresa existente
- [ ] Testar tratamento de erros
- [ ] Documentar processo

---

## 🚀 Próximos Passos

1. **Verificar acesso à API de Revenda**
   - Contatar suporte Focus NFe: suporte@focusnfe.com.br
   - Solicitar token de revenda
   - Verificar documentação: https://focusnfe.com.br/doc/#empresas

2. **Implementar Edge Function** (se tiver acesso)
   - Criar `focusnfe-empresas/index.ts`
   - Configurar secret `FOCUSNFE_RESELLER_TOKEN`

3. **Integrar no fluxo de salvar empresa**
   - Atualizar `useSaveCompanyData`
   - Adicionar validações e feedback

4. **Fallback manual** (se não tiver acesso)
   - Criar componente de instruções
   - Link para painel Focus NFe
   - Validação antes de emitir notas

---

## 📚 Referências

- [Documentação Focus NFe - Empresas](https://focusnfe.com.br/doc/#empresas)
- [API de Revenda - Fórum Focus NFe](https://forum.focusnfe.com.br/t/cadastro-de-empresa-api-de-revenda/71)
- [Guia de Criação de Empresa Emitente](https://focusnfe.com.br/guides/criacao-empresa-emitente/)

---

**Autor:** Sistema Revalya  
**Última atualização:** 2025-01-29

