# Correção de Dessincronização de order_number - Aplicada

**Data:** 2025-12-06  
**Status:** ✅ Concluída

## 📋 Resumo

Correção aplicada com sucesso para resolver o problema de dessincronização da sequência de `order_number` no tenant "nexsyn", que impedia a criação de novos contratos.

## 🔍 Problema Identificado

- **Sequência desatualizada:** `service_order_sequences.last_number = 9852`
- **Maior número real:** `999` em `contract_billing_periods` e `standalone_billing_periods`
- **Gap:** 8853 números (9852 - 999)
- **Erro:** `duplicate key value violates unique constraint "idx_contract_billing_periods_order_number_tenant"`

## ✅ Correções Aplicadas

### 1. Sincronização Imediata
- Sequência do tenant `8d2888f1-64a5-445f-84f5-2614d5160251` corrigida de `9852` para `999`
- Próximo número gerado será `1000` (4 dígitos)

### 2. Melhoria da Função `generate_service_order_number`
**Melhorias implementadas:**
- ✅ **Retry Logic:** Loop de até 10 tentativas para garantir número único
- ✅ **Validação de Existência:** Verifica se número já existe antes de retornar
- ✅ **Suporte a 4 Dígitos:** Automaticamente usa 4 dígitos quando passa de 999
- ✅ **Proteção contra Race Conditions:** Lock por tenant + verificação de existência

**Código da função:**
```sql
CREATE OR REPLACE FUNCTION public.generate_service_order_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_next integer;
  v_formatted text;
  v_max_attempts integer := 10;
  v_attempt integer := 0;
  v_exists boolean;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Não foi possível gerar número único após % tentativas para tenant %', 
        v_max_attempts, p_tenant_id;
    END IF;

    -- Lock por tenant
    PERFORM pg_advisory_lock(hashtext(p_tenant_id::text));

    -- Incrementar sequência
    WITH up AS (
      INSERT INTO public.service_order_sequences(tenant_id, last_number)
      VALUES (p_tenant_id, 1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET 
        last_number = public.service_order_sequences.last_number + 1,
        updated_at = timezone('America/Sao_Paulo'::text, now())
      RETURNING last_number
    )
    SELECT last_number INTO v_next FROM up;

    PERFORM pg_advisory_unlock(hashtext(p_tenant_id::text));

    -- Formatar (3 ou 4 dígitos)
    IF v_next > 999 THEN
      v_formatted := LPAD(v_next::text, 4, '0');
    ELSE
      v_formatted := LPAD(v_next::text, 3, '0');
    END IF;

    -- Verificar se número já existe
    SELECT EXISTS(
      SELECT 1 FROM public.contract_billing_periods 
      WHERE contract_billing_periods.tenant_id = p_tenant_id 
        AND contract_billing_periods.order_number = v_formatted
      UNION ALL
      SELECT 1 FROM public.standalone_billing_periods 
      WHERE standalone_billing_periods.tenant_id = p_tenant_id 
        AND standalone_billing_periods.order_number = v_formatted
    ) INTO v_exists;

    -- Se não existe, retornar
    IF NOT v_exists THEN
      RETURN v_formatted;
    END IF;

    -- Se existe, tentar próximo número
    RAISE NOTICE 'Número % já existe para tenant %, tentando próximo número...', 
      v_formatted, p_tenant_id;
  END LOOP;
END;
$function$;
```

### 3. Função de Validação e Sincronização
**Nova função:** `validate_and_sync_order_sequence(p_tenant_id uuid)`

**Funcionalidades:**
- ✅ Detecta dessincronizações automaticamente
- ✅ Sincroniza sequência quando necessário
- ✅ Retorna relatório de status

**Uso:**
```sql
-- Validar e sincronizar um tenant específico
SELECT * FROM validate_and_sync_order_sequence('tenant-id-aqui');

-- Resultado:
-- tenant_id | sequence_number | max_real_number | gap | synchronized
-- ----------|-----------------|-----------------|-----|-------------
-- ...       | 999             | 999             | 0   | true
```

## 🧪 Testes Realizados

### Teste 1: Sincronização
```sql
SELECT * FROM validate_and_sync_order_sequence('8d2888f1-64a5-445f-84f5-2614d5160251');
```
**Resultado:** ✅
- `sequence_number`: 999
- `max_real_number`: 999
- `gap`: 0
- `synchronized`: true

### Teste 2: Geração de Número
```sql
SELECT generate_service_order_number('8d2888f1-64a5-445f-84f5-2614d5160251');
```
**Resultado:** ✅ `"1000"` (4 dígitos, como esperado)

### Teste 3: Verificação de Sequência
```sql
SELECT last_number FROM service_order_sequences 
WHERE tenant_id = '8d2888f1-64a5-445f-84f5-2614d5160251';
```
**Resultado:** ✅ `1000` (incrementado corretamente)

## 📊 Status Final

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| Sequência | 9852 | 999 → 1000 | ✅ Corrigido |
| Gap | 8853 | 0 | ✅ Sincronizado |
| Função de Geração | Básica | Com retry + validação | ✅ Melhorada |
| Função de Validação | Não existia | Criada | ✅ Implementada |

## 🎯 Próximos Passos Recomendados

1. **Monitoramento:** Criar job periódico para validar sequências de todos os tenants
2. **Alertas:** Configurar alertas quando gap > 100
3. **Documentação:** Atualizar documentação sobre `order_number` vs `contract_number`

## 🔒 Segurança

- ✅ Funções com `SECURITY DEFINER` para garantir permissões adequadas
- ✅ Validação de tenant_id em todas as operações
- ✅ Lock por tenant para prevenir race conditions
- ✅ Verificação de existência antes de retornar número

## 📝 Notas Técnicas

- **AIDEV-NOTE:** `order_number` é um número interno sequencial (001, 002, ..., 999, 1000, ...)
- **AIDEV-NOTE:** `contract_number` é definido pelo usuário e não tem relação com `order_number`
- **AIDEV-NOTE:** A função agora suporta automaticamente 3 ou 4 dígitos conforme necessário

---

**Migration:** `fix_order_number_sequence_sync_v2`  
**Aplicada em:** 2025-12-06 17:39:09 UTC

