# 🔍 Análise: Erro na Importação de Cobranças ASAAS

**Data:** 2025-01-13  
**Status:** ✅ CORRIGIDO

---

## 📋 Resumo do Problema

Ao tentar importar cobranças do ASAAS, o sistema retornava o seguinte erro:

```
❌ Erro ao chamar Edge Function: FunctionsHttpError: Edge Function returned a non-2xx status code
```

---

## 🔍 Causa Raiz Identificada

A Edge Function `asaas-import-charges` estava tentando acessar a chave API diretamente do campo `config.api_key`:

```typescript
// ❌ CÓDIGO ANTIGO (INCORRETO)
const { api_key, api_url } = integration.config;
if (!api_key || !api_url) {
  throw new Error('Configuração ASAAS incompleta');
}
```

**Problema:** Após a migration de criptografia (`20251213_add_api_key_encryption.sql`), a chave API pode estar armazenada de duas formas:

1. **Criptografada** na coluna `encrypted_api_key` (novo formato)
2. **Texto plano** no campo `config.api_key` (formato antigo, compatibilidade)

A Edge Function não estava tentando descriptografar a chave, causando falha quando a chave estava criptografada.

---

## ✅ Solução Implementada

A correção segue o mesmo padrão usado em outras Edge Functions (`asaas-proxy`, `asaas-webhook-charges`):

```typescript
// ✅ CÓDIGO CORRIGIDO
// Tentar obter chave descriptografada usando função RPC
let api_key: string | null = null;

try {
  const { data: decryptedKey, error: decryptError } = await supabaseAdmin.rpc('get_decrypted_api_key', {
    p_tenant_id: tenant_id,
    p_integration_type: 'asaas'
  });
  
  if (!decryptError && decryptedKey) {
    api_key = decryptedKey;
    console.log('[importChargesFromAsaas] Chave API descriptografada com sucesso');
  } else {
    // Fallback: usar texto plano do config (compatibilidade)
    const config = integration.config || {};
    api_key = config.api_key || null;
    if (api_key) {
      console.warn('[importChargesFromAsaas] Usando chave em texto plano (compatibilidade)');
    }
  }
} catch (error) {
  // Se função não existir ou falhar, usar texto plano
  const config = integration.config || {};
  api_key = config.api_key || null;
  console.warn('[importChargesFromAsaas] Erro ao descriptografar, usando texto plano:', error);
}

if (!api_key) {
  throw new Error('API key não encontrada (criptografada ou texto plano) para tenant');
}
```

---

## 🔧 Arquivos Modificados

- `supabase/functions/asaas-import-charges/index.ts`
  - Linhas 305-349: Atualizada lógica de obtenção de credenciais
  - Adicionado suporte a descriptografia via RPC `get_decrypted_api_key`
  - Mantida compatibilidade com chaves em texto plano

---

## 🧪 Como Testar

1. **Verificar se a integração ASAAS está configurada:**
   - Acessar Integrações no sistema
   - Verificar se há integração ASAAS ativa para o tenant

2. **Testar importação:**
   - Selecionar período de datas
   - Clicar em "Importar do ASAAS"
   - Verificar se a importação completa com sucesso

3. **Verificar logs:**
   - Edge Function deve logar: `[importChargesFromAsaas] Chave API descriptografada com sucesso`
   - Ou: `[importChargesFromAsaas] Usando chave em texto plano (compatibilidade)`

---

## 📊 Compatibilidade

A solução mantém **100% de compatibilidade** com:

- ✅ Chaves criptografadas (novo formato)
- ✅ Chaves em texto plano (formato antigo)
- ✅ Ambos os formatos durante período de transição

---

## 🔐 Segurança

- ✅ Chaves criptografadas são descriptografadas apenas no servidor (Edge Function)
- ✅ Função RPC `get_decrypted_api_key` usa `SECURITY DEFINER` para acesso seguro
- ✅ Fallback para texto plano apenas para compatibilidade durante migração

---

## 📝 Notas Adicionais

1. **Outras Edge Functions já estavam corretas:**
   - `asaas-proxy/index.ts` ✅
   - `asaas-webhook-charges/index.ts` ✅
   - `_shared/tenant.ts` ✅

2. **Função RPC utilizada:**
   - `get_decrypted_api_key(p_tenant_id, p_integration_type)`
   - Definida em: `supabase/migrations/20251213_add_api_key_encryption.sql`

3. **Próximos passos recomendados:**
   - Migrar todas as chaves para formato criptografado
   - Remover chaves em texto plano após migração completa
   - Adicionar testes automatizados para validação

---

## ✅ Status

- [x] Problema identificado
- [x] Correção implementada
- [x] Compatibilidade mantida
- [ ] Testes em produção
- [ ] Documentação atualizada
