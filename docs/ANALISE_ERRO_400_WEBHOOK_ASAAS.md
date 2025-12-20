# 🔍 Análise do Erro 400 no Webhook ASAAS

## 📊 Situação Atual

**Problema:** Ao tentar ativar o webhook no ASAAS, está retornando erro **400 (Bad Request)**.

**Logs analisados:**
- Múltiplas requisições POST retornando status 400
- URL: `https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251`
- Tempo de execução: ~120-250ms
- Versão da função: 42

## 🔎 Possíveis Causas

### 1. **Validação do Tenant ID**
O código atual valida se o tenant ID é válido, mas pode estar falhando na extração do path.

**Correção aplicada:**
- ✅ Melhorada a extração do tenant ID do path
- ✅ Adicionada validação de UUID
- ✅ Adicionados logs detalhados

### 2. **Parse do Payload JSON**
O ASAAS pode estar enviando um payload vazio ou malformado durante a validação inicial.

**Correção aplicada:**
- ✅ Tratamento de erro no parse do JSON
- ✅ Logs do body recebido antes do parse
- ✅ Mensagem de erro mais descritiva

### 3. **Validação do Token de Webhook**
O ASAAS pode estar fazendo uma requisição de teste sem token durante a configuração.

**Ação necessária:**
- ⚠️ Verificar se o ASAAS envia requisições de teste sem token
- ⚠️ Adicionar tratamento especial para requisições de validação

## 🛠️ Melhorias Implementadas

### 1. Logs Detalhados
```typescript
console.log("📌 URL completa:", req.url);
console.log("📌 Pathname:", url.pathname);
console.log("📌 Path parts:", pathParts);
console.log("📌 Tenant extraído:", tenantId);
console.log("📌 Método HTTP:", req.method);
console.log("📌 Headers recebidos:", Object.fromEntries(req.headers.entries()));
```

### 2. Validação Robusta de Tenant ID
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!tenantId || tenantId === "asaas-webhook-charges" || tenantId === "asaas-webhook" || !uuidRegex.test(tenantId)) {
  // Retorna erro 400 com detalhes
}
```

### 3. Tratamento de Erro no Parse JSON
```typescript
try {
  const bodyText = await req.text();
  payload = JSON.parse(bodyText);
} catch (parseError) {
  // Retorna erro 400 com mensagem descritiva
}
```

## 📋 Próximos Passos

1. **Fazer deploy da função atualizada** com os logs melhorados
2. **Tentar ativar o webhook novamente no ASAAS**
3. **Verificar os logs detalhados** para identificar a causa exata do erro 400
4. **Ajustar conforme necessário** baseado nos logs

## 🔗 URL do Webhook

Formato esperado:
```
https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/{tenant_id}
```

Onde `{tenant_id}` deve ser um UUID válido (ex: `8d2888f1-64a5-445f-84f5-2614d5160251`)

## ⚠️ Observações Importantes

1. **JWT está desabilitado** (`verifyJWT: false`) - necessário para webhooks externos
2. **CORS configurado** para aceitar requisições do ASAAS
3. **Validação de token flexível** - aceita token em múltiplos headers
4. **Idempotência implementada** - eventos duplicados são ignorados

## 🧪 Como Testar

Após o deploy, verificar os logs com:
```bash
# Via Supabase CLI
supabase functions logs asaas-webhook-charges --project-ref wyehpiutzvwplllumgdk
```

Ou via Dashboard do Supabase:
1. Acessar Edge Functions
2. Selecionar `asaas-webhook-charges`
3. Ver logs em tempo real

