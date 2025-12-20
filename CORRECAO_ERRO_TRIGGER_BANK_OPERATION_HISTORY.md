# 🔧 Correção: Erro de Trigger na Migration bank_operation_history

## 🐛 Problema Identificado

### Erro nos Logs da Integração Nativa

```
ERROR: trigger "bank_operation_history_updated_at" for relation "bank_operation_history" already exists (SQLSTATE 42710)
At statement: 5
CREATE TRIGGER bank_operation_history_updated_at
  BEFORE UPDATE ON public.bank_operation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_operation_history_updated_at()
```

### Causa

1. **Migration já aplicada**: A migration `20251127_120000_create_bank_operation_history.sql` já está no histórico e foi aplicada
2. **Integração nativa tentou reaplicar**: Por algum motivo, a integração nativa tentou aplicar novamente
3. **Trigger sem verificação**: O `CREATE TRIGGER` não tinha `IF NOT EXISTS`, causando erro quando o trigger já existia

---

## ✅ Solução Aplicada

### Correção na Migration

A migration foi corrigida para ser **idempotente** (pode ser executada múltiplas vezes sem erro):

**Antes:**
```sql
CREATE TRIGGER bank_operation_history_updated_at
  BEFORE UPDATE ON public.bank_operation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_operation_history_updated_at();
```

**Depois:**
```sql
-- Criar trigger apenas se não existir (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'bank_operation_history_updated_at'
  ) THEN
    CREATE TRIGGER bank_operation_history_updated_at
      BEFORE UPDATE ON public.bank_operation_history
      FOR EACH ROW
      EXECUTE FUNCTION public.update_bank_operation_history_updated_at();
  END IF;
END $$;
```

---

## 🔍 Verificação

### Status Atual

- ✅ Migration está no histórico: `20251127`
- ✅ Tabela existe: `bank_operation_history`
- ✅ Trigger existe: `bank_operation_history_updated_at`
- ✅ Migration corrigida para ser idempotente

---

## 📋 Próximos Passos

### 1. Commit da Correção

```bash
git add supabase/migrations/20251127_120000_create_bank_operation_history.sql
git commit -m "fix: tornar migration bank_operation_history idempotente"
git push origin develop
```

### 2. Fazer Merge para Main

```bash
git checkout main
git merge develop
git push origin main
```

### 3. Verificar Logs

Após o merge, verificar se a integração nativa não tenta mais reaplicar ou se aplica sem erros.

---

## 🎯 Por Que Isso Aconteceu?

### Possíveis Causas

1. **Histórico desincronizado** (já corrigido)
   - A migration estava no banco mas não no histórico
   - Integração nativa tentou aplicar novamente

2. **Migration não idempotente**
   - O `CREATE TRIGGER` sem verificação causava erro
   - Agora está corrigido

3. **Integração nativa configurada antes da sincronização**
   - O erro foi em 2025/12/20, antes da sincronização
   - Agora que está sincronizado, não deve mais acontecer

---

## ✅ Benefícios da Correção

1. **Idempotência**: Migration pode ser executada múltiplas vezes sem erro
2. **Segurança**: Não quebra se tentar reaplicar
3. **Compatibilidade**: Funciona com integração nativa e aplicação manual

---

## 🔍 Verificação Final

Após fazer merge para main, verificar:

1. **Logs da integração nativa** não devem mais mostrar erro
2. **Trigger continua funcionando** normalmente
3. **Migration não tenta reaplicar** (já está no histórico)

---

**Status**: ✅ **CORRIGIDO**

A migration agora é idempotente e não causará mais erros se tentar reaplicar.

