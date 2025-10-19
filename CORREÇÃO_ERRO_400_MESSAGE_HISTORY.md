# Correção do Erro 400 - Tabela message_history

## 🚨 Problema Identificado

**Data**: Janeiro 2025  
**Erro**: HTTP 400 ao tentar inserir registros na tabela `message_history`  
**Função Afetada**: `send-bulk-messages` Edge Function  

## 🔍 Análise da Causa Raiz

### Problema Principal
A função `logMessage` na Edge Function `send-bulk-messages` estava tentando inserir um valor inválido no campo `template_id` da tabela `message_history`.

### Detalhes Técnicos
1. **Campo `template_id`**: Configurado como `NOT NULL` com foreign key para `notification_templates.id`
2. **Lógica Problemática**: Quando `payload.templateId` era `null/undefined`, o código usava `payload.chargeId` como fallback
3. **Violação de Constraint**: `chargeId` (UUID da tabela `charges`) não existe na tabela `notification_templates`
4. **Resultado**: Foreign key violation → HTTP 400

### Código Problemático (Antes)
```typescript
// AIDEV-NOTE: Lógica incorreta que causava foreign key violation
const insertData = {
  tenant_id: payload.tenantId,
  charge_id: payload.chargeId,
  template_id: payload.templateId || payload.chargeId, // ❌ ERRO: chargeId não existe em notification_templates
  customer_id: payload.customerId,
  message: payload.message,
  status: payload.success ? 'sent' : 'failed',
  error_details: payload.error || null,
  metadata: {
    phone: payload.phone,
    message_id: payload.messageId,
    request_id: payload.requestId,
    dry_run: payload.dryRun,
    sent_at: new Date().toISOString()
  }
};
```

## ✅ Solução Implementada

### 1. Modificação do Schema (Migration)
```sql
-- Permitir NULL em template_id para casos onde não há template específico
ALTER TABLE message_history 
ALTER COLUMN template_id DROP NOT NULL;
```

### 2. Correção da Lógica (Edge Function)
```typescript
// AIDEV-NOTE: Lógica corrigida para evitar foreign key violation
const insertData = {
  tenant_id: payload.tenantId,
  charge_id: payload.chargeId,
  template_id: payload.templateId || null, // ✅ CORRETO: null quando não há template
  customer_id: payload.customerId,
  message: payload.message,
  status: payload.success ? 'sent' : 'failed',
  error_details: payload.error || null,
  metadata: {
    phone: payload.phone,
    message_id: payload.messageId,
    request_id: payload.requestId,
    dry_run: payload.dryRun,
    sent_at: new Date().toISOString()
  }
};
```

## 🔧 Arquivos Modificados

### 1. Schema Database
- **Migration**: `20250127_allow_null_template_id_message_history`
- **Tabela**: `message_history`
- **Campo**: `template_id` agora permite `NULL`

### 2. Edge Function
- **Arquivo**: `supabase/functions/send-bulk-messages/index.ts`
- **Função**: `logMessage()` (linhas ~340-350)
- **Mudança**: `template_id: payload.templateId || null`

## 🧪 Validação da Correção

### Verificações Realizadas
1. ✅ Schema atualizado: `template_id` permite NULL
2. ✅ Edge Function deployada com nova lógica
3. ✅ Logs mostram status 200 (sucesso) para `send-bulk-messages`
4. ✅ Sem mais erros 400 relacionados a foreign key violation

### Estrutura Final da Tabela
```sql
-- Estrutura atualizada da message_history
CREATE TABLE message_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  charge_id uuid NOT NULL REFERENCES charges(id),
  template_id uuid NULL REFERENCES notification_templates(id), -- ✅ Agora permite NULL
  customer_id uuid NOT NULL REFERENCES customers(id),
  message text NOT NULL,
  status text NOT NULL,
  error_details text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);
```

## 🛡️ Segurança Multi-Tenant

### RLS Policies Mantidas
- Contexto de tenant configurado via `set_tenant_context_simple()`
- Service role com acesso controlado por tenant
- Isolamento de dados preservado

### Validações Adicionais
- Foreign keys mantidas para `charge_id`, `customer_id`, `tenant_id`
- Apenas `template_id` permite NULL quando não há template específico
- Metadata preserva informações de rastreamento

## 📊 Impacto da Correção

### Benefícios
- ✅ Eliminação do erro 400 em inserções na `message_history`
- ✅ Flexibilidade para mensagens sem template específico
- ✅ Manutenção da integridade referencial
- ✅ Preservação do histórico de mensagens

### Casos de Uso Suportados
1. **Com Template**: `template_id` preenchido com UUID válido
2. **Sem Template**: `template_id` como `NULL` (mensagens diretas/personalizadas)
3. **Auditoria**: Histórico completo mantido com metadata

## 🔄 Próximos Passos

### Monitoramento
- Acompanhar logs da Edge Function para confirmar estabilidade
- Verificar inserções na `message_history` em produção
- Monitorar performance das queries com `template_id` NULL

### Melhorias Futuras
- Considerar criação de template padrão para casos sem template específico
- Implementar métricas de sucesso/falha por tipo de template
- Adicionar índices otimizados para queries por `template_id`

---

**Autor**: Lya AI Assistant  
**Data**: Janeiro 2025  
**Status**: ✅ Resolvido e Validado