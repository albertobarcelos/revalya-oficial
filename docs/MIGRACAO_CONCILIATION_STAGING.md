# Migração: conciliation_staging → charges

## Resumo Executivo

Esta migração unifica o fluxo de cobranças do ASAAS, eliminando a camada intermediária de `conciliation_staging` e criando charges diretamente.

**Data da Migração:** 30 de Janeiro de 2025  
**Status:** ✅ Concluída

---

## Objetivo

Simplificar a arquitetura removendo a etapa intermediária de staging, criando charges diretamente a partir de webhooks e importações do ASAAS.

---

## Mudanças Implementadas

### 1. Migração de Dados

**Arquivo:** `supabase/migrations/20250130_migrate_conciliation_staging_to_charges.sql`

- Migra todos os dados de `conciliation_staging` para `charges`
- Cria customers automaticamente se não existirem
- Mapeia status e tipos de pagamento corretamente
- Mantém `conciliation_staging` intacto para rollback

### 2. Edge Functions

#### `asaas-webhook-charges/index.ts`
- ✅ Cria charges diretamente ao invés de usar `conciliation_staging`
- ✅ Busca ou cria customers automaticamente
- ✅ Tenta vincular contratos por `externalReference`
- ✅ Mantém idempotência usando `asaas_id` como chave única

#### `asaas-import-charges/index.ts`
- ✅ Cria charges diretamente ao invés de usar `conciliation_staging`
- ✅ Processa em lotes para performance
- ✅ Mantém mesma lógica de busca de customer e contrato

#### `sync-charges-from-staging/index.ts`
- ✅ Removido (não é mais necessário)

### 3. Serviços Frontend

#### `chargeAsaasService.ts` (Novo)
- ✅ Centraliza lógica de criação de charges do ASAAS
- ✅ Busca ou cria customers
- ✅ Vincula contratos por externalReference
- ✅ Mapeia status e tipos

#### `reconciliationImportService.ts`
- ✅ Removido (não é mais necessário)

#### `webhookSyncService.ts`
- ✅ Simplificado para apenas atualizar charges existentes
- ✅ Removida lógica de `conciliation_staging`

### 4. Hooks

#### `useReconciliationData.ts`
- ✅ Busca de `charges` ao invés de `conciliation_staging`
- ✅ Filtra apenas charges com `asaas_id IS NOT NULL`
- ✅ Mapeia dados para estrutura esperada pelos componentes

#### `useReconciliationActions.ts`
- ✅ Removida função `handleBulkImportToCharges`
- ✅ Ações adaptadas para atualizar charges diretamente
- ✅ Removida ação `IMPORT_TO_CHARGE`

### 5. Componentes

#### `ReconciliationActionModal.tsx`
- ✅ Removida ação "Importar para Charges"
- ✅ Removida função `renderImportToChargeForm`

#### `ActionButtons.tsx`
- ✅ Removido botão "Importar para Cobranças"

#### `BulkActionsDropdown.tsx`
- ✅ Removida opção de importação em lote

### 6. APIs

#### `staging.ts`
- ✅ Removido

#### `import.ts`
- ✅ Removido

#### `actions.ts`
- ✅ Adaptado para trabalhar com charges diretamente
- ✅ Usa `chargeIds` ao invés de `stagingIds`

### 7. Tipos

#### `reconciliation.ts`
- ✅ Removido `IMPORT_TO_CHARGE` do enum `ReconciliationAction`
- ✅ Interfaces adaptadas para estrutura de charges

---

## Estrutura de Dados

### Antes (conciliation_staging)
```
Webhook ASAAS → conciliation_staging → (importação manual) → charges
```

### Depois (charges direto)
```
Webhook ASAAS → charges
Importação ASAAS → charges
```

---

## Constraint Unique

Foi criada constraint unique para garantir idempotência:
```sql
UNIQUE (tenant_id, asaas_id) WHERE asaas_id IS NOT NULL
```

---

## Rollback

Para fazer rollback:

1. **Dados:** Os dados originais estão preservados em `conciliation_staging`
2. **Código:** Reverter commits relacionados à migração
3. **Edge Functions:** Restaurar versões anteriores das edge functions

**⚠️ IMPORTANTE:** Antes de fazer rollback, verifique se há charges criadas após a migração que precisam ser preservadas.

---

## Validação Pós-Migração

### Checklist

- [ ] Todos os dados migrados com sucesso
- [ ] Webhooks criando charges corretamente
- [ ] Importação batch funcionando
- [ ] Vincular contrato funcionando
- [ ] Filtros e busca funcionando
- [ ] Cache invalidando corretamente
- [ ] RLS funcionando corretamente
- [ ] Não há duplicatas de charges
- [ ] Customers sendo criados corretamente
- [ ] Contratos sendo vinculados corretamente

### Testes Manuais

1. **Webhook do ASAAS:**
   - Enviar webhook de teste
   - Verificar se charge foi criada
   - Verificar se customer foi criado/criado
   - Verificar se contrato foi vinculado (se externalReference presente)

2. **Importação Batch:**
   - Executar importação de período
   - Verificar se charges foram criadas
   - Verificar se não há duplicatas

3. **Vinculação de Contrato:**
   - Selecionar charge sem contrato
   - Vincular a um contrato
   - Verificar se vinculação foi salva

4. **Filtros:**
   - Testar filtros na página de reconciliação
   - Verificar se dados são exibidos corretamente

---

## Próximos Passos

1. **Validação:** Executar checklist completo
2. **Monitoramento:** Monitorar logs por 1-2 semanas
3. **Remoção Futura:** Após validação, criar migration para remover `conciliation_staging`

---

## Notas Técnicas

### Mapeamento de Status

Status ASAAS → Status Charges (MAIÚSCULAS):
- `PENDING` → `PENDING`
- `RECEIVED` → `RECEIVED`
- `CONFIRMED` → `CONFIRMED`
- `OVERDUE` → `OVERDUE`
- `REFUNDED` → `REFUNDED`
- `RECEIVED_IN_CASH` → `RECEIVED`
- `AWAITING_RISK_ANALYSIS` → `PENDING`
- `CREATED` → `PENDING`
- `DELETED` → `PENDING`
- `CHECKOUT_VIEWED` → `PENDING`
- `ANTICIPATED` → `RECEIVED`

### Mapeamento de Tipos

Payment Method → Tipo:
- `PIX` → `PIX`
- `BOLETO` → `BOLETO`
- `BANK_SLIP` → `BOLETO`
- `CREDIT_CARD` → `CREDIT_CARD`
- `CASH` → `CASH`
- `TRANSFER` → `PIX`

---

## Contato

Para dúvidas ou problemas relacionados à migração, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.

